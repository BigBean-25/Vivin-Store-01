const db = require("../config/db");

const FORECAST_TABLE = "procurement_forecasts";
const FORECAST_ITEM_TABLE = "procurement_forecast_items";

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

const getForecastBaseMeta = async () => {
  const poColumns = await getColumns("purchase_orders");
  const poiColumns = await getColumns("purchase_order_items");
  const productColumns = await getColumns("products");
  const vendorColumns = await getColumns("vendors");

  return {
    po: {
      id: firstColumn(poColumns, ["id"]),
      poDate: firstColumn(poColumns, ["po_date", "order_date", "date", "created_at"]),
      vendorId: firstColumn(poColumns, ["vendor_id"]),
      status: firstColumn(poColumns, ["status"]),
    },
    poi: {
      purchaseOrderId: firstColumn(poiColumns, ["purchase_order_id", "po_id"]),
      productId: firstColumn(poiColumns, ["product_id", "item_id", "raw_material_id"]),
      quantity: firstColumn(poiColumns, [
        "quantity",
        "ordered_qty",
        "order_qty",
        "qty",
        "requested_qty",
      ]),
      unitPrice: firstColumn(poiColumns, [
        "unit_price",
        "price",
        "rate",
        "purchase_price",
      ]),
    },
    product: {
      id: firstColumn(productColumns, ["id"]),
      name: firstColumn(productColumns, [
        "name",
        "product_name",
        "item_name",
        "raw_material_name",
        "title",
      ]),
    },
    vendor: {
      id: firstColumn(vendorColumns, ["id"]),
      name: firstColumn(vendorColumns, [
        "business_name",
        "vendor_name",
        "name",
        "company_name",
      ]),
    },
  };
};

const generateForecastItems = async ({
  forecastYear,
  forecastMonth,
  lookbackMonths,
  growthPercent,
  safetyStockPercent,
  vendorId = "",
}) => {
  const meta = await getForecastBaseMeta();

  if (
    !meta.po.id ||
    !meta.po.poDate ||
    !meta.poi.purchaseOrderId ||
    !meta.poi.quantity
  ) {
    throw new Error(
      "purchase_orders / purchase_order_items columns not matched for forecasting"
    );
  }

  const productJoin =
    meta.poi.productId && meta.product.id
      ? `LEFT JOIN products p ON poi.\`${meta.poi.productId}\` = p.\`${meta.product.id}\``
      : "";

  const vendorJoin =
    meta.po.vendorId && meta.vendor.id
      ? `LEFT JOIN vendors v ON po.\`${meta.po.vendorId}\` = v.\`${meta.vendor.id}\``
      : "";

  const productIdSelect = meta.poi.productId
    ? `poi.\`${meta.poi.productId}\``
    : "NULL";

  const productNameSelect =
    meta.product.name && meta.poi.productId && meta.product.id
      ? `p.\`${meta.product.name}\``
      : "NULL";

  const vendorIdSelect = meta.po.vendorId ? `po.\`${meta.po.vendorId}\`` : "NULL";

  const vendorNameSelect =
    meta.vendor.name && meta.po.vendorId && meta.vendor.id
      ? `v.\`${meta.vendor.name}\``
      : "NULL";

  const unitPriceSelect = meta.poi.unitPrice
    ? `COALESCE(poi.\`${meta.poi.unitPrice}\`, 0)` 
    : "0";

  const forecastStartDate = `${forecastYear}-${String(forecastMonth).padStart(
    2,
    "0"
  )}-01`;

  const where = [
    `po.\`${meta.po.poDate}\` >= DATE_SUB(?, INTERVAL ? MONTH)`,
    `po.\`${meta.po.poDate}\` < ?`,
  ];

  const values = [forecastStartDate, Number(lookbackMonths || 3), forecastStartDate];

  if (meta.po.status) {
    where.push(`po.\`${meta.po.status}\` != 'cancelled'`);
  }

  if (vendorId && meta.po.vendorId) {
    where.push(`po.\`${meta.po.vendorId}\` = ?`);
    values.push(vendorId);
  }

  const [rows] = await db.query(
    `
      SELECT
        ${productIdSelect} AS product_id,
        ${productNameSelect} AS product_name,

        ${vendorIdSelect} AS vendor_id,
        ${vendorNameSelect} AS vendor_name,

        COALESCE(SUM(poi.\`${meta.poi.quantity}\`), 0) AS historical_qty,
        COALESCE(AVG(${unitPriceSelect}), 0) AS average_unit_price

      FROM purchase_order_items poi
      LEFT JOIN purchase_orders po
        ON poi.\`${meta.poi.purchaseOrderId}\` = po.\`${meta.po.id}\` 

      ${productJoin}
      ${vendorJoin}

      WHERE ${where.join(" AND ")}

      GROUP BY
        ${productIdSelect},
        ${productNameSelect},
        ${vendorIdSelect},
        ${vendorNameSelect}

      HAVING historical_qty > 0

      ORDER BY historical_qty DESC
    `,
    values
  );

  return rows.map((row) => {
    const historicalQty = safeNumber(row.historical_qty);
    const avgMonthlyQty = historicalQty / Number(lookbackMonths || 3);

    const growthQty = avgMonthlyQty * (safeNumber(growthPercent) / 100);
    const safetyQty = avgMonthlyQty * (safeNumber(safetyStockPercent) / 100);

    const forecastQty = avgMonthlyQty + growthQty + safetyQty;
    const averageUnitPrice = safeNumber(row.average_unit_price);
    const forecastValue = forecastQty * averageUnitPrice;

    return {
      product_id: row.product_id || null,
      product_name: row.product_name || "Unknown Product",

      vendor_id: row.vendor_id || null,
      vendor_name: row.vendor_name || "-",

      historical_qty: Number(historicalQty.toFixed(3)),
      average_monthly_qty: Number(avgMonthlyQty.toFixed(3)),
      forecast_qty: Number(forecastQty.toFixed(3)),

      average_unit_price: Number(averageUnitPrice.toFixed(2)),
      forecast_value: Number(forecastValue.toFixed(2)),
    };
  });
};

exports.generateProcurementForecast = async (req, res) => {
  try {
    const {
      forecast_year = currentYear(),
      forecast_month = currentMonth(),
      lookback_months = 3,
      growth_percent = 0,
      safety_stock_percent = 10,
      vendor_id = "",
    } = req.query;

    const items = await generateForecastItems({
      forecastYear: Number(forecast_year),
      forecastMonth: Number(forecast_month),
      lookbackMonths: Number(lookback_months),
      growthPercent: Number(growth_percent),
      safetyStockPercent: Number(safety_stock_percent),
      vendorId: vendor_id,
    });

    const summary = items.reduce(
      (acc, item) => {
        acc.total_items += 1;
        acc.total_forecast_qty += safeNumber(item.forecast_qty);
        acc.total_forecast_value += safeNumber(item.forecast_value);
        acc.total_historical_qty += safeNumber(item.historical_qty);

        return acc;
      },
      {
        total_items: 0,
        total_forecast_qty: 0,
        total_forecast_value: 0,
        total_historical_qty: 0,
      }
    );

    summary.total_forecast_qty = Number(summary.total_forecast_qty.toFixed(3));
    summary.total_forecast_value = Number(summary.total_forecast_value.toFixed(2));
    summary.total_historical_qty = Number(summary.total_historical_qty.toFixed(3));

    res.json({
      success: true,
      period: {
        forecast_year: Number(forecast_year),
        forecast_month: Number(forecast_month),
        forecast_month_name: getMonthName(forecast_month),
        lookback_months: Number(lookback_months),
        growth_percent: Number(growth_percent),
        safety_stock_percent: Number(safety_stock_percent),
      },
      summary,
      items,
      data: items,
    });
  } catch (error) {
    console.error("Generate procurement forecast error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate procurement forecast",
      error: error.message,
    });
  }
};

exports.saveProcurementForecast = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      forecast_name = "",
      forecast_year = currentYear(),
      forecast_month = currentMonth(),
      lookback_months = 3,
      growth_percent = 0,
      safety_stock_percent = 10,
      vendor_id = "",
      remarks = "",
      status = "draft",
    } = req.body;

    const finalForecastName =
      forecast_name ||
      `Procurement Forecast - ${getMonthName(forecast_month)} ${forecast_year}`;

    const items = await generateForecastItems({
      forecastYear: Number(forecast_year),
      forecastMonth: Number(forecast_month),
      lookbackMonths: Number(lookback_months),
      growthPercent: Number(growth_percent),
      safetyStockPercent: Number(safety_stock_percent),
      vendorId: vendor_id,
    });

    const summary = items.reduce(
      (acc, item) => {
        acc.total_forecast_qty += safeNumber(item.forecast_qty);
        acc.total_forecast_value += safeNumber(item.forecast_value);
        return acc;
      },
      {
        total_forecast_qty: 0,
        total_forecast_value: 0,
      }
    );

    await connection.beginTransaction();

    const [forecastResult] = await connection.query(
      `
        INSERT INTO ${FORECAST_TABLE}
          (
            forecast_name,
            forecast_year,
            forecast_month,
            lookback_months,
            growth_percent,
            safety_stock_percent,
            total_forecast_qty,
            total_forecast_value,
            remarks,
            status,
            created_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalForecastName,
        Number(forecast_year),
        Number(forecast_month),
        Number(lookback_months),
        safeNumber(growth_percent),
        safeNumber(safety_stock_percent),
        Number(summary.total_forecast_qty.toFixed(3)),
        Number(summary.total_forecast_value.toFixed(2)),
        remarks || null,
        status || "draft",
        getUserId(req),
      ]
    );

    const forecastId = forecastResult.insertId;

    for (const item of items) {
      await connection.query(
        `
          INSERT INTO ${FORECAST_ITEM_TABLE}
            (
              forecast_id,
              product_id,
              product_name,
              historical_qty,
              average_monthly_qty,
              forecast_qty,
              average_unit_price,
              forecast_value,
              vendor_id,
              vendor_name
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          forecastId,
          item.product_id,
          item.product_name,
          item.historical_qty,
          item.average_monthly_qty,
          item.forecast_qty,
          item.average_unit_price,
          item.forecast_value,
          item.vendor_id,
          item.vendor_name,
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Procurement forecast saved successfully",
      forecast_id: forecastId,
      total_items: items.length,
      total_forecast_qty: Number(summary.total_forecast_qty.toFixed(3)),
      total_forecast_value: Number(summary.total_forecast_value.toFixed(2)),
    });
  } catch (error) {
    await connection.rollback();

    console.error("Save procurement forecast error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save procurement forecast",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getProcurementForecasts = async (req, res) => {
  try {
    const {
      search = "",
      forecast_year = "",
      forecast_month = "",
      status = "",
    } = req.query;

    const where = [];
    const values = [];

    if (search.trim()) {
      where.push("(forecast_name LIKE ? OR remarks LIKE ?)");
      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword);
    }

    if (forecast_year) {
      where.push("forecast_year = ?");
      values.push(forecast_year);
    }

    if (forecast_month) {
      where.push("forecast_month = ?");
      values.push(forecast_month);
    }

    if (status) {
      where.push("status = ?");
      values.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT *
        FROM ${FORECAST_TABLE}
        ${whereSql}
        ORDER BY id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      forecasts: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get procurement forecasts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement forecasts",
      error: error.message,
    });
  }
};

exports.getProcurementForecastById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[forecast]] = await db.query(
      `
        SELECT *
        FROM ${FORECAST_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: "Procurement forecast not found",
      });
    }

    const [items] = await db.query(
      `
        SELECT *
        FROM ${FORECAST_ITEM_TABLE}
        WHERE forecast_id = ?
        ORDER BY forecast_value DESC
      `,
      [id]
    );

    res.json({
      success: true,
      forecast,
      items,
    });
  } catch (error) {
    console.error("Get procurement forecast error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement forecast",
      error: error.message,
    });
  }
};

exports.deleteProcurementForecast = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    await connection.query(
      `
        DELETE FROM ${FORECAST_ITEM_TABLE}
        WHERE forecast_id = ?
      `,
      [id]
    );

    const [result] = await connection.query(
      `
        DELETE FROM ${FORECAST_TABLE}
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Procurement forecast not found",
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Procurement forecast deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete procurement forecast error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete procurement forecast",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
