const db = require("../config/db");

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const getBatchStatusByExpiry = (expiryDate) => {
  if (!expiryDate) return null;

  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "near_expiry";
  return "normal";
};

exports.getInventoryBatches = async (req, res) => {
  try {
    const {
      search = "",
      warehouse_id = "",
      product_id = "",
      status = "",
      expiry_status = "",
    } = req.query;

    const where = [];
    const params = [];

    if (warehouse_id) {
      where.push("ib.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (product_id) {
      where.push("ib.product_id = ?");
      params.push(product_id);
    }

    if (status) {
      where.push("ib.status = ?");
      params.push(status);
    }

    if (expiry_status) {
      where.push("ie.status = ?");
      params.push(expiry_status);
    }

    if (search) {
      where.push(`
        (
          ib.batch_no LIKE ?
          OR p.name LIKE ?
          OR p.product_code LIKE ?
          OR p.sku LIKE ?
          OR w.name LIKE ?
          OR w.warehouse_code LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
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
        ie.status AS expiry_status,
        ie.alert_date,
        ib.created_at,

        CASE
          WHEN ib.expiry_date IS NULL THEN NULL
          ELSE DATEDIFF(ib.expiry_date, CURDATE())
        END AS days_to_expiry

      FROM inventory_batches ib
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      LEFT JOIN products p ON p.id = ib.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventory_expiry ie ON ie.batch_id = ib.id
      ${whereSql}
      ORDER BY
        CASE
          WHEN ib.expiry_date IS NULL THEN 1
          ELSE 0
        END ASC,
        ib.expiry_date ASC,
        ib.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: rows.length,
      batches: rows,
    });
  } catch (error) {
    console.error("Get inventory batches error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory batches",
      error: error.message,
    });
  }
};

exports.getInventoryBatchSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(ib.id) AS total_batches,
        COALESCE(SUM(ib.quantity), 0) AS total_qty,
        COALESCE(SUM(ib.quantity * ib.cost_price), 0) AS total_value,
        SUM(CASE WHEN ib.status = 'active' THEN 1 ELSE 0 END) AS active_batches,
        SUM(CASE WHEN ib.status = 'expired' THEN 1 ELSE 0 END) AS expired_batches,
        SUM(CASE WHEN ib.status = 'blocked' THEN 1 ELSE 0 END) AS blocked_batches,
        SUM(CASE WHEN ib.status = 'consumed' THEN 1 ELSE 0 END) AS consumed_batches
      FROM inventory_batches ib
      `
    );

    const [[expirySummary]] = await db.query(
      `
      SELECT
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) AS normal_count,
        SUM(CASE WHEN status = 'near_expiry' THEN 1 ELSE 0 END) AS near_expiry_count,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_count,
        SUM(CASE WHEN status = 'disposed' THEN 1 ELSE 0 END) AS disposed_count
      FROM inventory_expiry
      `
    );

    res.json({
      success: true,
      summary: {
        ...summary,
        ...expirySummary,
      },
    });
  } catch (error) {
    console.error("Get inventory batch summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory batch summary",
      error: error.message,
    });
  }
};

exports.getNearExpiryBatches = async (req, res) => {
  try {
    const { days = 30, warehouse_id = "" } = req.query;

    const where = [
      "ib.expiry_date IS NOT NULL",
      "ib.quantity > 0",
      "ib.status = 'active'",
      "DATEDIFF(ib.expiry_date, CURDATE()) BETWEEN 0 AND ?",
    ];

    const params = [Number(days)];

    if (warehouse_id) {
      where.push("ib.warehouse_id = ?");
      params.push(warehouse_id);
    }

    const [rows] = await db.query(
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
        ib.expiry_date,
        ib.quantity,
        ib.cost_price,
        DATEDIFF(ib.expiry_date, CURDATE()) AS days_to_expiry,
        ie.status AS expiry_status
      FROM inventory_batches ib
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      LEFT JOIN products p ON p.id = ib.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventory_expiry ie ON ie.batch_id = ib.id
      WHERE ${where.join(" AND ")}
      ORDER BY ib.expiry_date ASC
      `,
      params
    );

    res.json({
      success: true,
      count: rows.length,
      batches: rows,
    });
  } catch (error) {
    console.error("Get near expiry batches error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch near expiry batches",
      error: error.message,
    });
  }
};

exports.getExpiredBatches = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;

    const where = [
      "ib.expiry_date IS NOT NULL",
      "ib.expiry_date < CURDATE()",
      "ib.quantity > 0",
    ];

    const params = [];

    if (warehouse_id) {
      where.push("ib.warehouse_id = ?");
      params.push(warehouse_id);
    }

    const [rows] = await db.query(
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
        ib.expiry_date,
        ib.quantity,
        ib.cost_price,
        DATEDIFF(CURDATE(), ib.expiry_date) AS expired_days,
        ie.status AS expiry_status
      FROM inventory_batches ib
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      LEFT JOIN products p ON p.id = ib.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventory_expiry ie ON ie.batch_id = ib.id
      WHERE ${where.join(" AND ")}
      ORDER BY ib.expiry_date ASC
      `,
      params
    );

    res.json({
      success: true,
      count: rows.length,
      batches: rows,
    });
  } catch (error) {
    console.error("Get expired batches error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch expired batches",
      error: error.message,
    });
  }
};

exports.getInventoryBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[batch]] = await db.query(
      `
      SELECT
        ib.*,
        w.name AS warehouse_name,
        w.warehouse_code,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        ie.alert_date,
        ie.status AS expiry_status
      FROM inventory_batches ib
      LEFT JOIN warehouses w ON w.id = ib.warehouse_id
      LEFT JOIN products p ON p.id = ib.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventory_expiry ie ON ie.batch_id = ib.id
      WHERE ib.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Inventory batch not found",
      });
    }

    const [movements] = await db.query(
      `
      SELECT
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.balance_after,
        sm.created_by,
        sm.created_at
      FROM stock_movements sm
      WHERE sm.batch_id = ?
      ORDER BY sm.id DESC
      LIMIT 100
      `,
      [id]
    );

    res.json({
      success: true,
      batch,
      movements,
    });
  } catch (error) {
    console.error("Get inventory batch by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory batch",
      error: error.message,
    });
  }
};

exports.updateInventoryBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      batch_no,
      manufacture_date,
      expiry_date,
      cost_price,
      status,
    } = req.body;

    const [[batch]] = await db.query(
      `SELECT * FROM inventory_batches WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Inventory batch not found",
      });
    }

    await db.query(
      `
      UPDATE inventory_batches
      SET
        batch_no = ?,
        manufacture_date = ?,
        expiry_date = ?,
        cost_price = ?,
        status = ?
      WHERE id = ?
      `,
      [
        batch_no || batch.batch_no,
        cleanValue(manufacture_date),
        cleanValue(expiry_date),
        cost_price === undefined ? batch.cost_price : Number(cost_price || 0),
        status || batch.status,
        id,
      ]
    );

    if (expiry_date) {
      const expiryStatus = getBatchStatusByExpiry(expiry_date);
      const alertDate = new Date(expiry_date);
      alertDate.setDate(alertDate.getDate() - 30);

      const [[expiryRow]] = await db.query(
        `SELECT id FROM inventory_expiry WHERE batch_id = ? LIMIT 1`,
        [id]
      );

      if (expiryRow) {
        await db.query(
          `
          UPDATE inventory_expiry
          SET
            expiry_date = ?,
            alert_date = ?,
            status = ?
          WHERE batch_id = ?
          `,
          [
            expiry_date,
            alertDate.toISOString().slice(0, 10),
            expiryStatus,
            id,
          ]
        );
      } else {
        await db.query(
          `
          INSERT INTO inventory_expiry
            (batch_id, product_id, warehouse_id, expiry_date, alert_date, status)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            id,
            batch.product_id,
            batch.warehouse_id,
            expiry_date,
            alertDate.toISOString().slice(0, 10),
            expiryStatus,
          ]
        );
      }
    }

    res.json({
      success: true,
      message: "Inventory batch updated successfully",
    });
  } catch (error) {
    console.error("Update inventory batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update inventory batch",
      error: error.message,
    });
  }
};

exports.updateBatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["active", "expired", "blocked", "consumed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch status",
      });
    }

    const [[batch]] = await db.query(
      `SELECT id FROM inventory_batches WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Inventory batch not found",
      });
    }

    await db.query(
      `UPDATE inventory_batches SET status = ? WHERE id = ?`,
      [status, id]
    );

    res.json({
      success: true,
      message: "Batch status updated successfully",
    });
  } catch (error) {
    console.error("Update batch status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update batch status",
      error: error.message,
    });
  }
};

exports.disposeExpiredBatch = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id || req.user?.user_id || null;

    const [[batch]] = await connection.query(
      `
      SELECT *
      FROM inventory_batches
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!batch) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Inventory batch not found",
      });
    }

    if (Number(batch.quantity || 0) <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Batch quantity already zero",
      });
    }

    const [[inventory]] = await connection.query(
      `
      SELECT id, available_qty
      FROM inventories
      WHERE warehouse_id = ?
        AND product_id = ?
        AND variant_id IS NULL
      LIMIT 1
      `,
      [batch.warehouse_id, batch.product_id]
    );

    const batchQty = Number(batch.quantity || 0);
    const currentAvailableQty = Number(inventory?.available_qty || 0);
    const balanceAfter = Math.max(currentAvailableQty - batchQty, 0);

    if (inventory) {
      await connection.query(
        `
        UPDATE inventories
        SET available_qty = ?
        WHERE id = ?
        `,
        [balanceAfter, inventory.id]
      );
    }

    await connection.query(
      `
      UPDATE inventory_batches
      SET quantity = 0, status = 'consumed'
      WHERE id = ?
      `,
      [id]
    );

    await connection.query(
      `
      UPDATE inventory_expiry
      SET status = 'disposed'
      WHERE batch_id = ?
      `,
      [id]
    );

    await connection.query(
      `
      INSERT INTO stock_movements
        (
          warehouse_id,
          product_id,
          batch_id,
          movement_type,
          quantity,
          reference_type,
          reference_id,
          balance_after,
          created_by
        )
      VALUES (?, ?, ?, 'damage', ?, 'expired_disposal', ?, ?, ?)
      `,
      [
        batch.warehouse_id,
        batch.product_id,
        id,
        batchQty,
        id,
        balanceAfter,
        userId,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Expired batch disposed successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Dispose expired batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to dispose expired batch",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};