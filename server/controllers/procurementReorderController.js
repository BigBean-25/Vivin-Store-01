const db = require("../config/db");

const PLAN_TABLE = "procurement_reorder_plans";
const ITEM_TABLE = "procurement_reorder_plan_items";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const currentYear = () => new Date().getFullYear();
const currentMonth = () => new Date().getMonth() + 1;

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const getMonthName = (month) => {
  const date = new Date(2026, Number(month) - 1, 1);

  return date.toLocaleDateString("en-IN", {
    month: "long",
  });
};

const getColumns = async (tableName) => {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    return rows.map((row) => row.Field);
  } catch {
    return [];
  }
};

const firstColumn = (columns, names) => {
  return names.find((name) => columns.includes(name)) || null;
};

const getProductStockMeta = async () => {
  const productColumns = await getColumns("products");

  return {
    id: firstColumn(productColumns, ["id"]),
    stock: firstColumn(productColumns, [
      "current_stock",
      "stock_qty",
      "available_qty",
      "quantity",
      "qty",
      "closing_stock",
    ]),
  };
};

const getLatestForecast = async (forecastYear, forecastMonth) => {
  const values = [];
  const where = [];

  if (forecastYear) {
    where.push("forecast_year = ?");
    values.push(forecastYear);
  }

  if (forecastMonth) {
    where.push("forecast_month = ?");
    values.push(forecastMonth);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [[forecast]] = await db.query(
    `
      SELECT *
      FROM procurement_forecasts
      ${whereSql}
      ORDER BY id DESC
      LIMIT 1
    `,
    values
  );

  return forecast;
};

const buildReorderItems = async ({ forecastId }) => {
  const productMeta = await getProductStockMeta();

  const stockJoin =
    productMeta.id && productMeta.stock
      ? `LEFT JOIN products p ON p.\`${productMeta.id}\` = fi.product_id` 
      : "";

  const stockSelect =
    productMeta.stock && productMeta.id
      ? `COALESCE(p.\`${productMeta.stock}\`, 0)` 
      : "0";

  const [rows] = await db.query(
    `
      SELECT
        fi.id AS forecast_item_id,
        fi.product_id,
        fi.product_name,
        fi.vendor_id,
        fi.vendor_name,
        fi.forecast_qty,
        fi.average_unit_price,
        ${stockSelect} AS current_stock_qty
      FROM procurement_forecast_items fi
      ${stockJoin}
      WHERE fi.forecast_id = ?
      ORDER BY fi.forecast_value DESC
    `,
    [forecastId]
  );

  return rows
    .map((row) => {
      const forecastQty = safeNumber(row.forecast_qty);
      const currentStockQty = safeNumber(row.current_stock_qty);
      const requiredQty = Math.max(forecastQty - currentStockQty, 0);
      const averageUnitPrice = safeNumber(row.average_unit_price);
      const estimatedValue = requiredQty * averageUnitPrice;

      let priority = "normal";

      if (currentStockQty <= 0 && requiredQty > 0) {
        priority = "urgent";
      } else if (requiredQty >= forecastQty * 0.75) {
        priority = "high";
      } else if (requiredQty <= forecastQty * 0.25) {
        priority = "low";
      }

      return {
        forecast_item_id: row.forecast_item_id,
        product_id: row.product_id,
        product_name: row.product_name,
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,

        forecast_qty: Number(forecastQty.toFixed(3)),
        current_stock_qty: Number(currentStockQty.toFixed(3)),
        required_qty: Number(requiredQty.toFixed(3)),

        average_unit_price: Number(averageUnitPrice.toFixed(2)),
        estimated_value: Number(estimatedValue.toFixed(2)),

        priority,
      };
    })
    .filter((item) => item.required_qty > 0);
};

exports.generateProcurementReorderPlan = async (req, res) => {
  try {
    const {
      forecast_id = "",
      plan_year = currentYear(),
      plan_month = currentMonth(),
    } = req.query;

    let forecast = null;

    if (forecast_id) {
      const [[row]] = await db.query(
        `
          SELECT *
          FROM procurement_forecasts
          WHERE id = ?
          LIMIT 1
        `,
        [forecast_id]
      );

      forecast = row;
    } else {
      forecast = await getLatestForecast(Number(plan_year), Number(plan_month));
    }

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: "No saved procurement forecast found for reorder planning",
      });
    }

    const items = await buildReorderItems({
      forecastId: forecast.id,
    });

    const summary = items.reduce(
      (acc, item) => {
        acc.total_items += 1;
        acc.total_required_qty += safeNumber(item.required_qty);
        acc.total_estimated_value += safeNumber(item.estimated_value);

        if (item.priority === "urgent") acc.urgent_items += 1;
        if (item.priority === "high") acc.high_priority_items += 1;

        return acc;
      },
      {
        total_items: 0,
        total_required_qty: 0,
        total_estimated_value: 0,
        urgent_items: 0,
        high_priority_items: 0,
      }
    );

    summary.total_required_qty = Number(summary.total_required_qty.toFixed(3));
    summary.total_estimated_value = Number(
      summary.total_estimated_value.toFixed(2)
    );

    res.json({
      success: true,
      forecast,
      summary,
      items,
      data: items,
    });
  } catch (error) {
    console.error("Generate procurement reorder plan error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate procurement reorder plan",
      error: error.message,
    });
  }
};

exports.saveProcurementReorderPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      plan_name = "",
      forecast_id,
      plan_year = currentYear(),
      plan_month = currentMonth(),
      remarks = "",
      status = "draft",
    } = req.body;

    if (!forecast_id) {
      return res.status(400).json({
        success: false,
        message: "Forecast ID is required",
      });
    }

    const [[forecast]] = await connection.query(
      `
        SELECT *
        FROM procurement_forecasts
        WHERE id = ?
        LIMIT 1
      `,
      [forecast_id]
    );

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: "Procurement forecast not found",
      });
    }

    const items = await buildReorderItems({
      forecastId: forecast_id,
    });

    const summary = items.reduce(
      (acc, item) => {
        acc.total_required_qty += safeNumber(item.required_qty);
        acc.total_estimated_value += safeNumber(item.estimated_value);
        return acc;
      },
      {
        total_required_qty: 0,
        total_estimated_value: 0,
      }
    );

    const finalPlanName =
      plan_name ||
      `Reorder Plan - ${getMonthName(plan_month)} ${plan_year}`;

    await connection.beginTransaction();

    const [planResult] = await connection.query(
      `
        INSERT INTO ${PLAN_TABLE}
          (
            plan_name,
            forecast_id,
            plan_year,
            plan_month,
            total_items,
            total_required_qty,
            total_estimated_value,
            remarks,
            status,
            created_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalPlanName,
        forecast_id,
        Number(plan_year),
        Number(plan_month),
        items.length,
        Number(summary.total_required_qty.toFixed(3)),
        Number(summary.total_estimated_value.toFixed(2)),
        remarks || null,
        status || "draft",
        getUserId(req),
      ]
    );

    const planId = planResult.insertId;

    for (const item of items) {
      await connection.query(
        `
          INSERT INTO ${ITEM_TABLE}
            (
              plan_id,
              forecast_item_id,
              product_id,
              product_name,
              vendor_id,
              vendor_name,
              forecast_qty,
              current_stock_qty,
              required_qty,
              average_unit_price,
              estimated_value,
              priority
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          planId,
          item.forecast_item_id,
          item.product_id,
          item.product_name,
          item.vendor_id,
          item.vendor_name,
          item.forecast_qty,
          item.current_stock_qty,
          item.required_qty,
          item.average_unit_price,
          item.estimated_value,
          item.priority,
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Procurement reorder plan saved successfully",
      plan_id: planId,
      total_items: items.length,
      total_required_qty: Number(summary.total_required_qty.toFixed(3)),
      total_estimated_value: Number(summary.total_estimated_value.toFixed(2)),
    });
  } catch (error) {
    await connection.rollback();

    console.error("Save procurement reorder plan error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save procurement reorder plan",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getProcurementReorderPlans = async (req, res) => {
  try {
    const {
      search = "",
      plan_year = "",
      plan_month = "",
      status = "",
    } = req.query;

    const where = [];
    const values = [];

    if (search.trim()) {
      where.push("(rp.plan_name LIKE ? OR rp.remarks LIKE ?)");
      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword);
    }

    if (plan_year) {
      where.push("rp.plan_year = ?");
      values.push(plan_year);
    }

    if (plan_month) {
      where.push("rp.plan_month = ?");
      values.push(plan_month);
    }

    if (status) {
      where.push("rp.status = ?");
      values.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT
          rp.*,
          pf.forecast_name
        FROM ${PLAN_TABLE} rp
        LEFT JOIN procurement_forecasts pf
          ON rp.forecast_id = pf.id
        ${whereSql}
        ORDER BY rp.id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      plans: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get procurement reorder plans error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement reorder plans",
      error: error.message,
    });
  }
};

exports.getProcurementReorderPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[plan]] = await db.query(
      `
        SELECT
          rp.*,
          pf.forecast_name
        FROM ${PLAN_TABLE} rp
        LEFT JOIN procurement_forecasts pf
          ON rp.forecast_id = pf.id
        WHERE rp.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Procurement reorder plan not found",
      });
    }

    const [items] = await db.query(
      `
        SELECT *
        FROM ${ITEM_TABLE}
        WHERE plan_id = ?
        ORDER BY
          CASE
            WHEN priority = 'urgent' THEN 1
            WHEN priority = 'high' THEN 2
            WHEN priority = 'normal' THEN 3
            ELSE 4
          END,
          estimated_value DESC
      `,
      [id]
    );

    res.json({
      success: true,
      plan,
      items,
    });
  } catch (error) {
    console.error("Get procurement reorder plan error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement reorder plan",
      error: error.message,
    });
  }
};

exports.deleteProcurementReorderPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    await connection.query(
      `
        DELETE FROM ${ITEM_TABLE}
        WHERE plan_id = ?
      `,
      [id]
    );

    const [result] = await connection.query(
      `
        DELETE FROM ${PLAN_TABLE}
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Procurement reorder plan not found",
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Procurement reorder plan deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete procurement reorder plan error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete procurement reorder plan",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
