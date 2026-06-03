const db = require("../config/db");

const generateAdjustmentNumber = () => {
  return `ADJ-${Date.now().toString().slice(-8)}`;
};

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return Number(value);
};

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || null;
};

const throwError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const getSystemQty = async (connection, warehouseId, productId) => {
  const [[inventory]] = await connection.query(
    `
    SELECT id, available_qty
    FROM inventories
    WHERE warehouse_id = ?
      AND product_id = ?
      AND variant_id IS NULL
    LIMIT 1
    `,
    [warehouseId, productId]
  );

  return inventory ? toNumber(inventory.available_qty) : 0;
};

const applyAdjustmentStock = async (
  connection,
  item,
  warehouseId,
  stockAdjustmentId,
  userId
) => {
  const productId = item.product_id;
  const batchId = cleanValue(item.batch_id);
  const differenceQty = toNumber(item.difference_qty);

  if (differenceQty === 0) return;

  const [[inventory]] = await connection.query(
    `
    SELECT id, available_qty
    FROM inventories
    WHERE warehouse_id = ?
      AND product_id = ?
      AND variant_id IS NULL
    LIMIT 1
    `,
    [warehouseId, productId]
  );

  let inventoryId = inventory?.id || null;
  let currentQty = inventory ? toNumber(inventory.available_qty) : 0;

  const newQty = currentQty + differenceQty;

  if (newQty < 0) {
    throwError(
      400,
      `Insufficient stock for product ID ${productId}. Current: ${currentQty}, Adjustment: ${differenceQty}`
    );
  }

  if (inventoryId) {
    await connection.query(
      `
      UPDATE inventories
      SET available_qty = ?
      WHERE id = ?
      `,
      [newQty, inventoryId]
    );
  } else {
    if (differenceQty < 0) {
      throwError(400, `No inventory found for product ID ${productId}`);
    }

    const [inventoryResult] = await connection.query(
      `
      INSERT INTO inventories
        (warehouse_id, product_id, variant_id, available_qty, reserved_qty, damaged_qty, average_cost)
      VALUES (?, ?, NULL, ?, 0, 0, 0)
      `,
      [warehouseId, productId, newQty]
    );

    inventoryId = inventoryResult.insertId;
  }

  if (batchId) {
    const [[batch]] = await connection.query(
      `
      SELECT id, quantity
      FROM inventory_batches
      WHERE id = ?
        AND warehouse_id = ?
        AND product_id = ?
      LIMIT 1
      `,
      [batchId, warehouseId, productId]
    );

    if (!batch) {
      throwError(400, `Batch not found for product ID ${productId}`);
    }

    const newBatchQty = toNumber(batch.quantity) + differenceQty;

    if (newBatchQty < 0) {
      throwError(
        400,
        `Insufficient batch stock for product ID ${productId}. Current batch qty: ${batch.quantity}, Adjustment: ${differenceQty}`
      );
    }

    await connection.query(
      `
      UPDATE inventory_batches
      SET
        quantity = ?,
        status = CASE
          WHEN ? <= 0 THEN 'consumed'
          ELSE 'active'
        END
      WHERE id = ?
      `,
      [newBatchQty, newBatchQty, batchId]
    );
  }

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
    VALUES (?, ?, ?, 'adjustment', ?, 'stock_adjustment', ?, ?, ?)
    `,
    [
      warehouseId,
      productId,
      batchId,
      differenceQty,
      stockAdjustmentId,
      newQty,
      userId,
    ]
  );
};

exports.getStockAdjustments = async (req, res) => {
  try {
    const { search = "", status = "", warehouse_id = "" } = req.query;

    const where = [];
    const params = [];

    if (status) {
      where.push("sa.status = ?");
      params.push(status);
    }

    if (warehouse_id) {
      where.push("sa.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (search) {
      where.push(`
        (
          sa.adjustment_number LIKE ?
          OR sa.reason LIKE ?
          OR w.name LIKE ?
          OR w.warehouse_code LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        sa.id,
        sa.adjustment_number,
        sa.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        sa.adjustment_date,
        sa.reason,
        sa.status,
        sa.created_by,
        sa.approved_by,
        sa.created_at,

        COALESCE(t.item_count, 0) AS item_count,
        COALESCE(t.total_system_qty, 0) AS total_system_qty,
        COALESCE(t.total_physical_qty, 0) AS total_physical_qty,
        COALESCE(t.total_difference_qty, 0) AS total_difference_qty

      FROM stock_adjustments sa
      LEFT JOIN warehouses w ON w.id = sa.warehouse_id
      LEFT JOIN (
        SELECT
          stock_adjustment_id,
          COUNT(id) AS item_count,
          COALESCE(SUM(system_qty), 0) AS total_system_qty,
          COALESCE(SUM(physical_qty), 0) AS total_physical_qty,
          COALESCE(SUM(difference_qty), 0) AS total_difference_qty
        FROM stock_adjustment_items
        GROUP BY stock_adjustment_id
      ) t ON t.stock_adjustment_id = sa.id
      ${whereSql}
      ORDER BY sa.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: rows.length,
      stock_adjustments: rows,
    });
  } catch (error) {
    console.error("Get stock adjustments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock adjustments",
      error: error.message,
    });
  }
};

exports.getStockAdjustmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[adjustment]] = await db.query(
      `
      SELECT
        sa.*,
        w.name AS warehouse_name,
        w.warehouse_code
      FROM stock_adjustments sa
      LEFT JOIN warehouses w ON w.id = sa.warehouse_id
      WHERE sa.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: "Stock adjustment not found",
      });
    }

    const [items] = await db.query(
      `
      SELECT
        sai.id,
        sai.stock_adjustment_id,
        sai.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        sai.batch_id,
        ib.batch_no,
        ib.expiry_date,
        sai.system_qty,
        sai.physical_qty,
        sai.difference_qty,
        sai.created_at
      FROM stock_adjustment_items sai
      LEFT JOIN products p ON p.id = sai.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventory_batches ib ON ib.id = sai.batch_id
      WHERE sai.stock_adjustment_id = ?
      ORDER BY sai.id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      stock_adjustment: adjustment,
      items,
    });
  } catch (error) {
    console.error("Get stock adjustment by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock adjustment",
      error: error.message,
    });
  }
};

exports.createStockAdjustment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      adjustment_number,
      warehouse_id,
      adjustment_date,
      reason,
      status = "draft",
      items = [],
    } = req.body;

    if (!warehouse_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Warehouse is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "At least one adjustment item is required",
      });
    }

    const [[warehouse]] = await connection.query(
      `SELECT id FROM warehouses WHERE id = ? LIMIT 1`,
      [warehouse_id]
    );

    if (!warehouse) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const finalAdjustmentNumber =
      adjustment_number && adjustment_number.trim()
        ? adjustment_number.trim()
        : generateAdjustmentNumber();

    const createdBy = getUserId(req);
    const finalStatus = status === "posted" ? "posted" : status === "approved" ? "approved" : "draft";

    const [adjustmentResult] = await connection.query(
      `
      INSERT INTO stock_adjustments
        (
          adjustment_number,
          warehouse_id,
          adjustment_date,
          reason,
          status,
          created_by,
          approved_by
        )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalAdjustmentNumber,
        warehouse_id,
        adjustment_date || new Date().toISOString().slice(0, 10),
        cleanValue(reason),
        finalStatus,
        createdBy,
        finalStatus === "approved" || finalStatus === "posted" ? createdBy : null,
      ]
    );

    const stockAdjustmentId = adjustmentResult.insertId;

    for (const item of items) {
      if (!item.product_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Product is required for all items",
        });
      }

      const systemQty =
        item.system_qty === undefined || item.system_qty === null || item.system_qty === ""
          ? await getSystemQty(connection, warehouse_id, item.product_id)
          : toNumber(item.system_qty);

      const physicalQty = toNumber(item.physical_qty);
      const differenceQty = physicalQty - systemQty;

      await connection.query(
        `
        INSERT INTO stock_adjustment_items
          (
            stock_adjustment_id,
            product_id,
            batch_id,
            system_qty,
            physical_qty,
            difference_qty
          )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          stockAdjustmentId,
          item.product_id,
          cleanValue(item.batch_id),
          systemQty,
          physicalQty,
          differenceQty,
        ]
      );

      if (finalStatus === "posted") {
        await applyAdjustmentStock(
          connection,
          {
            ...item,
            difference_qty: differenceQty,
          },
          warehouse_id,
          stockAdjustmentId,
          createdBy
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message:
        finalStatus === "posted"
          ? "Stock adjustment created and posted successfully"
          : "Stock adjustment created successfully",
      stock_adjustment: {
        id: stockAdjustmentId,
        adjustment_number: finalAdjustmentNumber,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create stock adjustment error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Adjustment number already exists",
      });
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create stock adjustment",
    });
  } finally {
    connection.release();
  }
};

exports.updateStockAdjustment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const {
      adjustment_number,
      warehouse_id,
      adjustment_date,
      reason,
      items = [],
    } = req.body;

    const [[existing]] = await connection.query(
      `SELECT * FROM stock_adjustments WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock adjustment not found",
      });
    }

    if (existing.status !== "draft") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Only draft stock adjustment can be updated",
      });
    }

    if (!warehouse_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Warehouse is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "At least one adjustment item is required",
      });
    }

    await connection.query(
      `
      UPDATE stock_adjustments
      SET
        adjustment_number = ?,
        warehouse_id = ?,
        adjustment_date = ?,
        reason = ?
      WHERE id = ?
      `,
      [
        adjustment_number || existing.adjustment_number,
        warehouse_id,
        adjustment_date || existing.adjustment_date,
        cleanValue(reason),
        id,
      ]
    );

    await connection.query(
      `DELETE FROM stock_adjustment_items WHERE stock_adjustment_id = ?`,
      [id]
    );

    for (const item of items) {
      if (!item.product_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Product is required for all items",
        });
      }

      const systemQty =
        item.system_qty === undefined || item.system_qty === null || item.system_qty === ""
          ? await getSystemQty(connection, warehouse_id, item.product_id)
          : toNumber(item.system_qty);

      const physicalQty = toNumber(item.physical_qty);
      const differenceQty = physicalQty - systemQty;

      await connection.query(
        `
        INSERT INTO stock_adjustment_items
          (
            stock_adjustment_id,
            product_id,
            batch_id,
            system_qty,
            physical_qty,
            difference_qty
          )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          item.product_id,
          cleanValue(item.batch_id),
          systemQty,
          physicalQty,
          differenceQty,
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Stock adjustment updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update stock adjustment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update stock adjustment",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.approveStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const [[existing]] = await db.query(
      `SELECT id, status FROM stock_adjustments WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Stock adjustment not found",
      });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft stock adjustment can be approved",
      });
    }

    await db.query(
      `
      UPDATE stock_adjustments
      SET status = 'approved', approved_by = ?
      WHERE id = ?
      `,
      [userId, id]
    );

    res.json({
      success: true,
      message: "Stock adjustment approved successfully",
    });
  } catch (error) {
    console.error("Approve stock adjustment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve stock adjustment",
      error: error.message,
    });
  }
};

exports.postStockAdjustment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = getUserId(req);

    const [[adjustment]] = await connection.query(
      `SELECT * FROM stock_adjustments WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!adjustment) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock adjustment not found",
      });
    }

    if (adjustment.status === "posted") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Stock adjustment already posted",
      });
    }

    if (adjustment.status === "cancelled") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cancelled stock adjustment cannot be posted",
      });
    }

    const [items] = await connection.query(
      `SELECT * FROM stock_adjustment_items WHERE stock_adjustment_id = ?`,
      [id]
    );

    if (!items.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No items found in this stock adjustment",
      });
    }

    for (const item of items) {
      await applyAdjustmentStock(
        connection,
        item,
        adjustment.warehouse_id,
        id,
        userId
      );
    }

    await connection.query(
      `
      UPDATE stock_adjustments
      SET status = 'posted', approved_by = COALESCE(approved_by, ?)
      WHERE id = ?
      `,
      [userId, id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Stock adjustment posted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Post stock adjustment error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to post stock adjustment",
    });
  } finally {
    connection.release();
  }
};

exports.cancelStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;

    const [[adjustment]] = await db.query(
      `SELECT id, status FROM stock_adjustments WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: "Stock adjustment not found",
      });
    }

    if (adjustment.status === "posted") {
      return res.status(400).json({
        success: false,
        message: "Posted stock adjustment cannot be cancelled",
      });
    }

    await db.query(
      `UPDATE stock_adjustments SET status = 'cancelled' WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Stock adjustment cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel stock adjustment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel stock adjustment",
      error: error.message,
    });
  }
};

exports.deleteStockAdjustment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [[adjustment]] = await connection.query(
      `SELECT id, status FROM stock_adjustments WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!adjustment) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock adjustment not found",
      });
    }

    if (adjustment.status === "posted") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Posted stock adjustment cannot be deleted",
      });
    }

    await connection.query(
      `DELETE FROM stock_adjustment_items WHERE stock_adjustment_id = ?`,
      [id]
    );

    await connection.query(`DELETE FROM stock_adjustments WHERE id = ?`, [id]);

    await connection.commit();

    res.json({
      success: true,
      message: "Stock adjustment deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete stock adjustment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete stock adjustment",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};