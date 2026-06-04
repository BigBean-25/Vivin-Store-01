const db = require("../config/db");

exports.getWarehouseStockSummary = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;
    const where = warehouse_id ? "WHERE ib.warehouse_id = ?" : "";
    const params = warehouse_id ? [warehouse_id] : [];

    const [[stockSummary]] = await db.query(
      `
      SELECT
        COUNT(DISTINCT ib.warehouse_id) AS total_warehouses,
        COUNT(DISTINCT ib.product_id) AS total_products,
        COALESCE(SUM(ib.quantity), 0) AS total_qty,
        COALESCE(SUM(ib.quantity * ib.cost_price), 0) AS total_value
      FROM inventory_batches ib
      WHERE ib.status NOT IN ('consumed')
      ${warehouse_id ? "AND ib.warehouse_id = ?" : ""}
      `,
      warehouse_id ? [warehouse_id] : []
    );

    const [[lowStock]] = await db.query(
      `
      SELECT COUNT(*) AS low_stock_count
      FROM (
        SELECT ib.product_id, ib.warehouse_id, SUM(ib.quantity) AS total_qty, p.reorder_level, p.min_stock_level
        FROM inventory_batches ib
        JOIN products p ON p.id = ib.product_id
        WHERE ib.status NOT IN ('consumed')
        ${warehouse_id ? "AND ib.warehouse_id = ?" : ""}
        GROUP BY ib.product_id, ib.warehouse_id
        HAVING total_qty <= p.reorder_level OR total_qty <= p.min_stock_level
      ) low
      `,
      warehouse_id ? [warehouse_id] : []
    );

    const [[expiredBatches]] = await db.query(
      `
      SELECT
        SUM(CASE WHEN expiry_date < CURDATE() AND expiry_date IS NOT NULL THEN 1 ELSE 0 END) AS expired_count,
        SUM(CASE WHEN expiry_date >= CURDATE() AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS near_expiry_count
      FROM inventory_batches ib
      WHERE ib.status NOT IN ('consumed')
      ${warehouse_id ? "AND ib.warehouse_id = ?" : ""}
      `,
      warehouse_id ? [warehouse_id] : []
    );

    res.json({
      success: true,
      summary: {
        total_warehouses: stockSummary.total_warehouses || 0,
        total_products: stockSummary.total_products || 0,
        total_qty: stockSummary.total_qty || 0,
        total_value: stockSummary.total_value || 0,
        low_stock_count: lowStock.low_stock_count || 0,
        expired_count: expiredBatches.expired_count || 0,
        near_expiry_count: expiredBatches.near_expiry_count || 0,
      },
    });
  } catch (error) {
    console.error("Warehouse stock summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stock summary", error: error.message });
  }
};

exports.getWarehouseStock = async (req, res) => {
  try {
    const { warehouse_id = "", product_id = "", search = "", stock_status = "" } = req.query;
    const where = ["ib.status NOT IN ('consumed')"];
    const params = [];

    if (warehouse_id) { where.push("ib.warehouse_id = ?"); params.push(warehouse_id); }
    if (product_id) { where.push("ib.product_id = ?"); params.push(product_id); }

    if (search) {
      where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.product_code LIKE ? OR w.name LIKE ?)");
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [rows] = await db.query(
      `
      SELECT
        ib.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ib.product_id,
        p.name AS product_name,
        p.sku,
        p.product_code,
        p.purchase_price,
        p.min_stock_level,
        p.reorder_level,
        SUM(ib.quantity) AS total_qty,
        SUM(ib.quantity * ib.cost_price) AS stock_value,
        COUNT(ib.id) AS batch_count,
        MIN(ib.expiry_date) AS earliest_expiry
      FROM inventory_batches ib
      JOIN warehouses w ON w.id = ib.warehouse_id
      JOIN products p ON p.id = ib.product_id
      ${whereSql}
      GROUP BY ib.warehouse_id, ib.product_id
      ORDER BY w.name ASC, p.name ASC
      `,
      params
    );

    let result = rows.map((row) => ({
      ...row,
      stock_status:
        row.total_qty <= 0
          ? "out_of_stock"
          : row.total_qty <= row.min_stock_level
          ? "low_stock"
          : row.total_qty <= row.reorder_level
          ? "reorder"
          : "normal",
    }));

    if (stock_status) {
      result = result.filter((r) => r.stock_status === stock_status);
    }

    res.json({ success: true, count: result.length, stock: result });
  } catch (error) {
    console.error("Get warehouse stock error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse stock", error: error.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;
    const extraWhere = warehouse_id ? "AND ib.warehouse_id = ?" : "";
    const params = warehouse_id ? [warehouse_id] : [];

    const [rows] = await db.query(
      `
      SELECT
        ib.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ib.product_id,
        p.name AS product_name,
        p.sku,
        p.product_code,
        p.min_stock_level,
        p.reorder_level,
        SUM(ib.quantity) AS total_qty,
        SUM(ib.quantity * ib.cost_price) AS stock_value
      FROM inventory_batches ib
      JOIN warehouses w ON w.id = ib.warehouse_id
      JOIN products p ON p.id = ib.product_id
      WHERE ib.status NOT IN ('consumed')
        ${extraWhere}
      GROUP BY ib.warehouse_id, ib.product_id
      HAVING total_qty <= p.reorder_level OR total_qty <= p.min_stock_level
      ORDER BY total_qty ASC
      `,
      params
    );

    res.json({ success: true, count: rows.length, low_stock: rows });
  } catch (error) {
    console.error("Get low stock error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch low stock", error: error.message });
  }
};

exports.getStockBatches = async (req, res) => {
  try {
    const { warehouse_id = "", product_id = "", expiry_status = "", search = "" } = req.query;
    const where = ["ib.status NOT IN ('consumed')"];
    const params = [];

    if (warehouse_id) { where.push("ib.warehouse_id = ?"); params.push(warehouse_id); }
    if (product_id) { where.push("ib.product_id = ?"); params.push(product_id); }

    if (expiry_status === "expired") {
      where.push("ib.expiry_date < CURDATE() AND ib.expiry_date IS NOT NULL");
    } else if (expiry_status === "near_expiry") {
      where.push("ib.expiry_date >= CURDATE() AND ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    } else if (expiry_status === "normal") {
      where.push("(ib.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY) OR ib.expiry_date IS NULL)");
    }

    if (search) {
      where.push("(p.name LIKE ? OR p.sku LIKE ? OR ib.batch_no LIKE ? OR w.name LIKE ?)");
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [batches] = await db.query(
      `
      SELECT
        ib.id,
        ib.batch_no,
        ib.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ib.product_id,
        p.name AS product_name,
        p.sku,
        p.product_code,
        ib.quantity,
        ib.cost_price,
        ib.quantity * ib.cost_price AS batch_value,
        ib.manufacture_date,
        ib.expiry_date,
        ib.status,
        ib.created_at,
        CASE
          WHEN ib.expiry_date IS NULL THEN 'no_expiry'
          WHEN ib.expiry_date < CURDATE() THEN 'expired'
          WHEN ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'near_expiry'
          ELSE 'normal'
        END AS expiry_status,
        DATEDIFF(ib.expiry_date, CURDATE()) AS days_to_expiry
      FROM inventory_batches ib
      JOIN warehouses w ON w.id = ib.warehouse_id
      JOIN products p ON p.id = ib.product_id
      ${whereSql}
      ORDER BY ib.expiry_date ASC, w.name ASC
      `,
      params
    );

    res.json({ success: true, count: batches.length, batches });
  } catch (error) {
    console.error("Get stock batches error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stock batches", error: error.message });
  }
};

exports.getStockMovements = async (req, res) => {
  try {
    const { warehouse_id = "", product_id = "", movement_type = "", search = "", limit = 100 } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) { where.push("sm.warehouse_id = ?"); params.push(warehouse_id); }
    if (product_id) { where.push("sm.product_id = ?"); params.push(product_id); }
    if (movement_type) { where.push("sm.movement_type = ?"); params.push(movement_type); }

    if (search) {
      where.push("(p.name LIKE ? OR p.sku LIKE ? OR w.name LIKE ? OR sm.reference_type LIKE ?)");
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    params.push(parseInt(limit, 10) || 100);

    const [movements] = await db.query(
      `
      SELECT
        sm.id,
        sm.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        sm.product_id,
        p.name AS product_name,
        p.sku,
        sm.batch_id,
        ib.batch_no,
        sm.movement_type,
        sm.quantity,
        sm.balance_after,
        sm.reference_type,
        sm.reference_id,
        sm.created_by,
        u.name AS created_by_name,
        sm.created_at
      FROM stock_movements sm
      JOIN warehouses w ON w.id = sm.warehouse_id
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN inventory_batches ib ON ib.id = sm.batch_id
      LEFT JOIN users u ON u.id = sm.created_by
      ${whereSql}
      ORDER BY sm.created_at DESC
      LIMIT ?
      `,
      params
    );

    res.json({ success: true, count: movements.length, movements });
  } catch (error) {
    console.error("Get stock movements error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stock movements", error: error.message });
  }
};

exports.getStockValuation = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;
    const extraWhere = warehouse_id ? "AND ib.warehouse_id = ?" : "";
    const params = warehouse_id ? [warehouse_id] : [];

    const [valuation] = await db.query(
      `
      SELECT
        ib.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        COUNT(DISTINCT ib.product_id) AS product_count,
        SUM(ib.quantity) AS total_qty,
        SUM(ib.quantity * ib.cost_price) AS total_value,
        SUM(CASE WHEN ib.expiry_date < CURDATE() AND ib.expiry_date IS NOT NULL THEN ib.quantity * ib.cost_price ELSE 0 END) AS expired_value
      FROM inventory_batches ib
      JOIN warehouses w ON w.id = ib.warehouse_id
      WHERE ib.status NOT IN ('consumed')
        ${extraWhere}
      GROUP BY ib.warehouse_id
      ORDER BY total_value DESC
      `,
      params
    );

    const [[totals]] = await db.query(
      `
      SELECT
        COALESCE(SUM(ib.quantity * ib.cost_price), 0) AS grand_total_value,
        COALESCE(SUM(ib.quantity), 0) AS grand_total_qty
      FROM inventory_batches ib
      WHERE ib.status NOT IN ('consumed')
        ${extraWhere}
      `,
      params
    );

    res.json({
      success: true,
      valuation,
      totals: {
        grand_total_value: totals.grand_total_value || 0,
        grand_total_qty: totals.grand_total_qty || 0,
      },
    });
  } catch (error) {
    console.error("Get stock valuation error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stock valuation", error: error.message });
  }
};
