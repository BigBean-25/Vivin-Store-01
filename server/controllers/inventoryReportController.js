const db = require("../config/db");

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const today = () => new Date().toISOString().slice(0, 10);

const parseJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

exports.getInventoryReports = async (req, res) => {
  try {
    const {
      warehouse_id = "",
      from_date = "",
      to_date = "",
      search = "",
    } = req.query;

    const where = [];
    const params = [];

    if (warehouse_id) {
      where.push("ir.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (from_date) {
      where.push("ir.report_date >= ?");
      params.push(from_date);
    }

    if (to_date) {
      where.push("ir.report_date <= ?");
      params.push(to_date);
    }

    if (search) {
      where.push(`
        (
          w.name LIKE ?
          OR w.warehouse_code LIKE ?
          OR ir.report_date LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [reports] = await db.query(
      `
      SELECT
        ir.id,
        ir.report_date,
        ir.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ir.total_stock_value,
        ir.low_stock_count,
        ir.expiry_count,
        ir.created_at
      FROM inventory_reports ir
      LEFT JOIN warehouses w ON w.id = ir.warehouse_id
      ${whereSql}
      ORDER BY ir.report_date DESC, ir.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get inventory reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory reports",
      error: error.message,
    });
  }
};

exports.getInventoryReportSummary = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;

    const inventoryWhere = warehouse_id ? "WHERE i.warehouse_id = ?" : "";
    const inventoryParams = warehouse_id ? [warehouse_id] : [];

    const expiryWhere = warehouse_id
      ? "WHERE ib.warehouse_id = ? AND ib.expiry_date IS NOT NULL AND ib.quantity > 0"
      : "WHERE ib.expiry_date IS NOT NULL AND ib.quantity > 0";

    const expiryParams = warehouse_id ? [warehouse_id] : [];

    const [[stockSummary]] = await db.query(
      `
      SELECT
        COUNT(DISTINCT i.product_id) AS total_products,
        COUNT(DISTINCT i.warehouse_id) AS total_warehouses,
        COALESCE(SUM(i.available_qty), 0) AS total_available_qty,
        COALESCE(SUM(i.reserved_qty), 0) AS total_reserved_qty,
        COALESCE(SUM(i.damaged_qty), 0) AS total_damaged_qty,
        COALESCE(SUM(i.available_qty * i.average_cost), 0) AS total_stock_value,
        SUM(
          CASE
            WHEN COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0) > 0
             AND i.available_qty <= COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0)
            THEN 1
            ELSE 0
          END
        ) AS low_stock_count
      FROM inventories i
      LEFT JOIN products p ON p.id = i.product_id
      ${inventoryWhere}
      `,
      inventoryParams
    );

    const [[expirySummary]] = await db.query(
      `
      SELECT
        SUM(
          CASE
            WHEN ib.expiry_date < CURDATE()
            THEN 1 ELSE 0
          END
        ) AS expired_count,
        SUM(
          CASE
            WHEN ib.expiry_date >= CURDATE()
             AND ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            THEN 1 ELSE 0
          END
        ) AS near_expiry_count
      FROM inventory_batches ib
      ${expiryWhere}
      `,
      expiryParams
    );

    res.json({
      success: true,
      summary: {
        total_products: stockSummary.total_products || 0,
        total_warehouses: stockSummary.total_warehouses || 0,
        total_available_qty: stockSummary.total_available_qty || 0,
        total_reserved_qty: stockSummary.total_reserved_qty || 0,
        total_damaged_qty: stockSummary.total_damaged_qty || 0,
        total_stock_value: stockSummary.total_stock_value || 0,
        low_stock_count: stockSummary.low_stock_count || 0,
        expired_count: expirySummary.expired_count || 0,
        near_expiry_count: expirySummary.near_expiry_count || 0,
      },
    });
  } catch (error) {
    console.error("Get inventory report summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory report summary",
      error: error.message,
    });
  }
};

exports.getLiveStockReport = async (req, res) => {
  try {
    const { warehouse_id = "", search = "" } = req.query;

    const where = [];
    const params = [];

    if (warehouse_id) {
      where.push("i.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (search) {
      where.push(`
        (
          p.name LIKE ?
          OR p.product_code LIKE ?
          OR p.sku LIKE ?
          OR w.name LIKE ?
          OR w.warehouse_code LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [stock] = await db.query(
      `
      SELECT
        i.id,
        i.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        i.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        i.available_qty,
        i.reserved_qty,
        i.damaged_qty,
        i.average_cost,
        (i.available_qty * i.average_cost) AS stock_value,
        p.min_stock_level,
        p.reorder_level,
        CASE
          WHEN COALESCE(NULLIF(p.min_stock_level, 0), 0) > 0
           AND i.available_qty <= p.min_stock_level
          THEN 'critical'
          WHEN COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0) > 0
           AND i.available_qty <= COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0)
          THEN 'low'
          ELSE 'normal'
        END AS stock_status,
        i.updated_at
      FROM inventories i
      LEFT JOIN warehouses w ON w.id = i.warehouse_id
      LEFT JOIN products p ON p.id = i.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      ${whereSql}
      ORDER BY w.name ASC, p.name ASC
      `,
      params
    );

    res.json({
      success: true,
      count: stock.length,
      stock,
    });
  } catch (error) {
    console.error("Get live stock report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch live stock report",
      error: error.message,
    });
  }
};

exports.getLowStockReport = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;

    const where = [
      "COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0) > 0",
      "i.available_qty <= COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0)",
    ];

    const params = [];

    if (warehouse_id) {
      where.push("i.warehouse_id = ?");
      params.push(warehouse_id);
    }

    const [items] = await db.query(
      `
      SELECT
        i.id,
        i.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        i.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        i.available_qty,
        i.reserved_qty,
        i.damaged_qty,
        i.average_cost,
        (i.available_qty * i.average_cost) AS stock_value,
        p.min_stock_level,
        p.reorder_level,
        COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0) AS alert_level
      FROM inventories i
      LEFT JOIN warehouses w ON w.id = i.warehouse_id
      LEFT JOIN products p ON p.id = i.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.available_qty ASC, p.name ASC
      `,
      params
    );

    res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Get low stock report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock report",
      error: error.message,
    });
  }
};

exports.getExpiryReport = async (req, res) => {
  try {
    const {
      warehouse_id = "",
      expiry_status = "",
      days = 30,
    } = req.query;

    const where = ["ib.expiry_date IS NOT NULL", "ib.quantity > 0"];
    const params = [];

    if (warehouse_id) {
      where.push("ib.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (expiry_status === "expired") {
      where.push("ib.expiry_date < CURDATE()");
    }

    if (expiry_status === "near_expiry") {
      where.push("ib.expiry_date >= CURDATE()");
      where.push("ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)");
      params.push(Number(days) || 30);
    }

    if (expiry_status === "normal") {
      where.push("ib.expiry_date > DATE_ADD(CURDATE(), INTERVAL ? DAY)");
      params.push(Number(days) || 30);
    }

    const [items] = await db.query(
      `
      SELECT
        ib.id,
        ib.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ib.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        ib.batch_no,
        ib.manufacture_date,
        ib.expiry_date,
        ib.quantity,
        ib.cost_price,
        (ib.quantity * ib.cost_price) AS stock_value,
        ib.status AS batch_status,
        DATEDIFF(ib.expiry_date, CURDATE()) AS days_to_expiry,
        CASE
          WHEN ib.expiry_date < CURDATE() THEN 'expired'
          WHEN ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 'near_expiry'
          ELSE 'normal'
        END AS expiry_status
      FROM inventory_batches ib
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      LEFT JOIN products p ON p.id = ib.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE ${where.join(" AND ")}
      ORDER BY ib.expiry_date ASC
      `,
      [Number(days) || 30, ...params]
    );

    res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Get expiry report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch expiry report",
      error: error.message,
    });
  }
};

exports.getStockMovementReport = async (req, res) => {
  try {
    const {
      warehouse_id = "",
      product_id = "",
      movement_type = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const where = [];
    const params = [];

    if (warehouse_id) {
      where.push("sm.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (product_id) {
      where.push("sm.product_id = ?");
      params.push(product_id);
    }

    if (movement_type) {
      where.push("sm.movement_type = ?");
      params.push(movement_type);
    }

    if (from_date) {
      where.push("DATE(sm.created_at) >= ?");
      params.push(from_date);
    }

    if (to_date) {
      where.push("DATE(sm.created_at) <= ?");
      params.push(to_date);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [movements] = await db.query(
      `
      SELECT
        sm.id,
        sm.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        sm.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        sm.batch_id,
        ib.batch_no,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.balance_after,
        sm.created_by,
        sm.created_at
      FROM stock_movements sm
      LEFT JOIN warehouses w ON w.id = sm.warehouse_id
      LEFT JOIN products p ON p.id = sm.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventory_batches ib ON ib.id = sm.batch_id
      ${whereSql}
      ORDER BY sm.id DESC
      LIMIT 500
      `,
      params
    );

    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(sm.id) AS total_movements,
        SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END) AS total_in_qty,
        SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END) AS total_out_qty,
        SUM(CASE WHEN sm.movement_type = 'adjustment' THEN sm.quantity ELSE 0 END) AS total_adjustment_qty,
        SUM(CASE WHEN sm.movement_type = 'damage' THEN sm.quantity ELSE 0 END) AS total_damage_qty,
        SUM(CASE WHEN sm.movement_type = 'transfer' THEN sm.quantity ELSE 0 END) AS total_transfer_qty
      FROM stock_movements sm
      ${whereSql}
      `,
      params
    );

    res.json({
      success: true,
      count: movements.length,
      summary,
      movements,
    });
  } catch (error) {
    console.error("Get stock movement report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movement report",
      error: error.message,
    });
  }
};

exports.generateInventoryReport = async (req, res) => {
  try {
    const reportDate = req.body.report_date || today();
    const warehouseId = cleanValue(req.body.warehouse_id);

    const warehouseFilter = warehouseId ? "WHERE i.warehouse_id = ?" : "";
    const warehouseParams = warehouseId ? [warehouseId] : [];

    const batchFilter = warehouseId ? "AND ib.warehouse_id = ?" : "";
    const batchParams = warehouseId ? [warehouseId] : [];

    const [stockItems] = await db.query(
      `
      SELECT
        i.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        i.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        i.available_qty,
        i.reserved_qty,
        i.damaged_qty,
        i.average_cost,
        (i.available_qty * i.average_cost) AS stock_value,
        p.min_stock_level,
        p.reorder_level
      FROM inventories i
      LEFT JOIN warehouses w ON w.id = i.warehouse_id
      LEFT JOIN products p ON p.id = i.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      ${warehouseFilter}
      ORDER BY w.name ASC, p.name ASC
      `,
      warehouseParams
    );

    const lowStockItems = stockItems.filter((item) => {
      const alertLevel = Number(item.reorder_level || item.min_stock_level || 0);
      return alertLevel > 0 && Number(item.available_qty || 0) <= alertLevel;
    });

    const [expiryItems] = await db.query(
      `
      SELECT
        ib.id,
        ib.warehouse_id,
        w.name AS warehouse_name,
        ib.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        ib.batch_no,
        ib.expiry_date,
        ib.quantity,
        ib.cost_price,
        (ib.quantity * ib.cost_price) AS stock_value,
        DATEDIFF(ib.expiry_date, CURDATE()) AS days_to_expiry
      FROM inventory_batches ib
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      LEFT JOIN products p ON p.id = ib.product_id
      WHERE ib.expiry_date IS NOT NULL
        AND ib.quantity > 0
        AND ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ${batchFilter}
      ORDER BY ib.expiry_date ASC
      `,
      batchParams
    );

    const totalStockValue = stockItems.reduce(
      (sum, item) => sum + Number(item.stock_value || 0),
      0
    );

    const totalAvailableQty = stockItems.reduce(
      (sum, item) => sum + Number(item.available_qty || 0),
      0
    );

    const data = {
      generated_at: new Date().toISOString(),
      summary: {
        report_date: reportDate,
        warehouse_id: warehouseId,
        total_products: stockItems.length,
        total_available_qty: totalAvailableQty,
        total_stock_value: totalStockValue,
        low_stock_count: lowStockItems.length,
        expiry_count: expiryItems.length,
      },
      stock_items: stockItems,
      low_stock_items: lowStockItems,
      expiry_items: expiryItems,
    };

    const [result] = await db.query(
      `
      INSERT INTO inventory_reports
        (
          report_date,
          warehouse_id,
          total_stock_value,
          low_stock_count,
          expiry_count,
          data
        )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        reportDate,
        warehouseId,
        totalStockValue,
        lowStockItems.length,
        expiryItems.length,
        JSON.stringify(data),
      ]
    );

    res.status(201).json({
      success: true,
      message: "Inventory report generated successfully",
      report_id: result.insertId,
      data,
    });
  } catch (error) {
    console.error("Generate inventory report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate inventory report",
      error: error.message,
    });
  }
};

exports.getInventoryReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[report]] = await db.query(
      `
      SELECT
        ir.id,
        ir.report_date,
        ir.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ir.total_stock_value,
        ir.low_stock_count,
        ir.expiry_count,
        ir.data,
        ir.created_at
      FROM inventory_reports ir
      LEFT JOIN warehouses w ON w.id = ir.warehouse_id
      WHERE ir.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Inventory report not found",
      });
    }

    report.data = parseJson(report.data);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Get inventory report by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory report",
      error: error.message,
    });
  }
};

exports.deleteInventoryReport = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM inventory_reports WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Inventory report not found",
      });
    }

    res.json({
      success: true,
      message: "Inventory report deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete inventory report",
      error: error.message,
    });
  }
};