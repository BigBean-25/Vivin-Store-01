const db = require("../config/db");

const allowedAlertTypes = ["low_stock", "expiry", "dead_stock", "overstock"];
const allowedStatuses = ["open", "closed"];

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return Number(value);
};

const createAlertIfNotExists = async (
  connection,
  { warehouse_id, product_id, alert_type, message }
) => {
  const [[existingAlert]] = await connection.query(
    `
    SELECT id
    FROM inventory_alerts
    WHERE warehouse_id <=> ?
      AND product_id = ?
      AND alert_type = ?
      AND status = 'open'
    LIMIT 1
    `,
    [cleanValue(warehouse_id), product_id, alert_type]
  );

  if (existingAlert) {
    await connection.query(
      `
      UPDATE inventory_alerts
      SET message = ?
      WHERE id = ?
      `,
      [message, existingAlert.id]
    );

    return {
      created: false,
      updated: true,
      id: existingAlert.id,
    };
  }

  const [result] = await connection.query(
    `
    INSERT INTO inventory_alerts
      (warehouse_id, product_id, alert_type, message, status)
    VALUES (?, ?, ?, ?, 'open')
    `,
    [cleanValue(warehouse_id), product_id, alert_type, message]
  );

  return {
    created: true,
    updated: false,
    id: result.insertId,
  };
};

exports.getInventoryAlerts = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      alert_type = "",
      warehouse_id = "",
      product_id = "",
    } = req.query;

    const where = [];
    const params = [];

    if (status) {
      where.push("ia.status = ?");
      params.push(status);
    }

    if (alert_type) {
      where.push("ia.alert_type = ?");
      params.push(alert_type);
    }

    if (warehouse_id) {
      where.push("ia.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (product_id) {
      where.push("ia.product_id = ?");
      params.push(product_id);
    }

    if (search) {
      where.push(`
        (
          ia.message LIKE ?
          OR ia.alert_type LIKE ?
          OR ia.status LIKE ?
          OR p.name LIKE ?
          OR p.product_code LIKE ?
          OR p.sku LIKE ?
          OR w.name LIKE ?
          OR w.warehouse_code LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [alerts] = await db.query(
      `
      SELECT
        ia.id,
        ia.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ia.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        ia.alert_type,
        ia.message,
        ia.status,
        ia.created_at,
        os.available_qty,
        p.min_stock_level,
        p.reorder_level
      FROM inventory_alerts ia
      LEFT JOIN warehouses w ON w.id = ia.warehouse_id
      LEFT JOIN products p ON p.id = ia.product_id
      LEFT JOIN outlet_stock os
        ON os.product_id = ia.product_id
        AND os.outlet_id = ia.warehouse_id
      ${whereSql}
      ORDER BY
        CASE WHEN ia.status = 'open' THEN 0 ELSE 1 END,
        ia.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error("Get inventory alerts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory alerts",
      error: error.message,
    });
  }
};

exports.getInventoryAlertSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(id) AS total_alerts,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_alerts,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_alerts,
        SUM(CASE WHEN alert_type = 'low_stock' THEN 1 ELSE 0 END) AS low_stock_alerts,
        SUM(CASE WHEN alert_type = 'expiry' THEN 1 ELSE 0 END) AS expiry_alerts,
        SUM(CASE WHEN alert_type = 'dead_stock' THEN 1 ELSE 0 END) AS dead_stock_alerts,
        SUM(CASE WHEN alert_type = 'overstock' THEN 1 ELSE 0 END) AS overstock_alerts
      FROM inventory_alerts
      `
    );

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Get inventory alert summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory alert summary",
      error: error.message,
    });
  }
};

exports.getInventoryAlertById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[alert]] = await db.query(
      `
      SELECT
        ia.id,
        ia.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ia.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        ia.alert_type,
        ia.message,
        ia.status,
        ia.created_at,
        os.available_qty,
        p.min_stock_level,
        p.reorder_level
      FROM inventory_alerts ia
      LEFT JOIN warehouses w ON w.id = ia.warehouse_id
      LEFT JOIN products p ON p.id = ia.product_id
      LEFT JOIN outlet_stock os
        ON os.product_id = ia.product_id
        AND os.outlet_id = ia.warehouse_id
      WHERE ia.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Inventory alert not found",
      });
    }

    res.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error("Get inventory alert by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory alert",
      error: error.message,
    });
  }
};

exports.createInventoryAlert = async (req, res) => {
  try {
    const {
      warehouse_id,
      product_id,
      alert_type,
      message,
      status = "open",
    } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    if (!allowedAlertTypes.includes(alert_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert type",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert status",
      });
    }

    const [[product]] = await db.query(
      `SELECT id, name FROM products WHERE id = ? LIMIT 1`,
      [product_id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (warehouse_id) {
      const [[warehouse]] = await db.query(
        `SELECT id FROM warehouses WHERE id = ? LIMIT 1`,
        [warehouse_id]
      );

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        });
      }
    }

    const [result] = await db.query(
      `
      INSERT INTO inventory_alerts
        (warehouse_id, product_id, alert_type, message, status)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        cleanValue(warehouse_id),
        product_id,
        alert_type,
        message || `${alert_type} alert for ${product.name}`,
        status,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Inventory alert created successfully",
      alert_id: result.insertId,
    });
  } catch (error) {
    console.error("Create inventory alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create inventory alert",
      error: error.message,
    });
  }
};

exports.updateInventoryAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      warehouse_id,
      product_id,
      alert_type,
      message,
      status,
    } = req.body;

    const [[alert]] = await db.query(
      `SELECT * FROM inventory_alerts WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Inventory alert not found",
      });
    }

    const finalAlertType = alert_type || alert.alert_type;
    const finalStatus = status || alert.status;

    if (!allowedAlertTypes.includes(finalAlertType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert type",
      });
    }

    if (!allowedStatuses.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert status",
      });
    }

    await db.query(
      `
      UPDATE inventory_alerts
      SET
        warehouse_id = ?,
        product_id = ?,
        alert_type = ?,
        message = ?,
        status = ?
      WHERE id = ?
      `,
      [
        warehouse_id === undefined ? alert.warehouse_id : cleanValue(warehouse_id),
        product_id || alert.product_id,
        finalAlertType,
        message === undefined ? alert.message : message,
        finalStatus,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Inventory alert updated successfully",
    });
  } catch (error) {
    console.error("Update inventory alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update inventory alert",
      error: error.message,
    });
  }
};

exports.closeInventoryAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE inventory_alerts
      SET status = 'closed'
      WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Inventory alert not found",
      });
    }

    res.json({
      success: true,
      message: "Inventory alert closed successfully",
    });
  } catch (error) {
    console.error("Close inventory alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to close inventory alert",
      error: error.message,
    });
  }
};

exports.reopenInventoryAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE inventory_alerts
      SET status = 'open'
      WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Inventory alert not found",
      });
    }

    res.json({
      success: true,
      message: "Inventory alert reopened successfully",
    });
  } catch (error) {
    console.error("Reopen inventory alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reopen inventory alert",
      error: error.message,
    });
  }
};

exports.deleteInventoryAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM inventory_alerts WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Inventory alert not found",
      });
    }

    res.json({
      success: true,
      message: "Inventory alert deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete inventory alert",
      error: error.message,
    });
  }
};

exports.generateInventoryAlerts = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let createdCount = 0;
    let updatedCount = 0;

    const [lowStockRows] = await connection.query(
      `
      SELECT
        os.outlet_id AS warehouse_id,
        w.name AS warehouse_name,
        os.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        os.available_qty,
        p.min_stock_level,
        p.reorder_level,
        COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0) AS alert_level
      FROM outlet_stock os
      INNER JOIN products p ON p.id = os.product_id
      LEFT JOIN warehouses w ON w.id = os.outlet_id
      WHERE p.status = 'active'
        AND COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0) > 0
        AND os.available_qty <= COALESCE(NULLIF(p.reorder_level, 0), NULLIF(p.min_stock_level, 0), 0)
      `
    );

    for (const item of lowStockRows) {
      const result = await createAlertIfNotExists(connection, {
        warehouse_id: item.warehouse_id,
        product_id: item.product_id,
        alert_type: "low_stock",
        message: `Low stock alert: ${item.product_name} has ${toNumber(
          item.available_qty
        ).toFixed(3)} qty in ${item.warehouse_name || "warehouse"}. Alert level: ${toNumber(
          item.alert_level
        ).toFixed(3)}.`,
      });

      if (result.created) createdCount += 1;
      if (result.updated) updatedCount += 1;
    }

    const [expiryRows] = await connection.query(
      `
      SELECT
        ib.id AS batch_id,
        ib.warehouse_id,
        w.name AS warehouse_name,
        ib.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        ib.batch_no,
        ib.quantity,
        ib.expiry_date,
        DATEDIFF(ib.expiry_date, CURDATE()) AS days_to_expiry
      FROM inventory_batches ib
      INNER JOIN products p ON p.id = ib.product_id
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      WHERE ib.expiry_date IS NOT NULL
        AND ib.quantity > 0
        AND ib.status IN ('active', 'expired')
        AND DATEDIFF(ib.expiry_date, CURDATE()) <= 30
      `
    );

    for (const item of expiryRows) {
      const days = Number(item.days_to_expiry || 0);

      const expiryMessage =
        days < 0
          ? `Expired stock alert: ${item.product_name} batch ${item.batch_no} expired ${Math.abs(
              days
            )} days ago in ${item.warehouse_name || "warehouse"}. Qty: ${toNumber(
              item.quantity
            ).toFixed(3)}.`
          : `Near expiry alert: ${item.product_name} batch ${item.batch_no} will expire in ${days} days in ${
              item.warehouse_name || "warehouse"
            }. Qty: ${toNumber(item.quantity).toFixed(3)}.`;

      const result = await createAlertIfNotExists(connection, {
        warehouse_id: item.warehouse_id,
        product_id: item.product_id,
        alert_type: "expiry",
        message: expiryMessage,
      });

      if (result.created) createdCount += 1;
      if (result.updated) updatedCount += 1;
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Inventory alerts generated successfully",
      created_count: createdCount,
      updated_count: updatedCount,
      low_stock_checked: lowStockRows.length,
      expiry_checked: expiryRows.length,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Generate inventory alerts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate inventory alerts",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};