const db = require("../config/db");

const generateOutwardNumber = () => {
  return `SOUT-${Date.now().toString().slice(-8)}`;
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

const reduceInventoryStock = async (
  connection,
  item,
  warehouseId,
  stockOutwardId,
  userId
) => {
  const productId = item.product_id;
  const batchId = cleanValue(item.batch_id);
  const qty = toNumber(item.quantity);

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

  if (!inventory) {
    throwError(400, `No inventory stock found for product ID ${productId}`);
  }

  const currentAvailableQty = toNumber(inventory.available_qty);

  if (currentAvailableQty < qty) {
    throwError(
      400,
      `Insufficient stock for product ID ${productId}. Available: ${currentAvailableQty}, Required: ${qty}`
    );
  }

  if (batchId) {
    const [[batch]] = await connection.query(
      `
      SELECT id, quantity, status
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

    if (batch.status !== "active") {
      throwError(400, `Batch is not active for product ID ${productId}`);
    }

    const batchQty = toNumber(batch.quantity);

    if (batchQty < qty) {
      throwError(
        400,
        `Insufficient batch stock for product ID ${productId}. Batch Available: ${batchQty}, Required: ${qty}`
      );
    }

    await connection.query(
      `
      UPDATE inventory_batches
      SET
        quantity = quantity - ?,
        status = CASE
          WHEN quantity - ? <= 0 THEN 'consumed'
          ELSE status
        END
      WHERE id = ?
      `,
      [qty, qty, batchId]
    );
  }

  const balanceAfter = currentAvailableQty - qty;

  await connection.query(
    `
    UPDATE inventories
    SET available_qty = ?
    WHERE id = ?
    `,
    [balanceAfter, inventory.id]
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
    VALUES (?, ?, ?, 'out', ?, 'stock_outward', ?, ?, ?)
    `,
    [
      warehouseId,
      productId,
      batchId,
      qty,
      stockOutwardId,
      balanceAfter,
      userId,
    ]
  );
};

exports.getStockOutwards = async (req, res) => {
  try {
    const { search = "", status = "", warehouse_id = "" } = req.query;

    const where = [];
    const params = [];

    if (status) {
      where.push("so.status = ?");
      params.push(status);
    }

    if (warehouse_id) {
      where.push("so.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (search) {
      where.push(`
        (
          so.outward_number LIKE ?
          OR so.reference_type LIKE ?
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
        so.id,
        so.outward_number,
        so.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        so.reference_type,
        so.reference_id,
        so.outward_date,
        so.status,
        so.created_by,
        so.created_at,

        COALESCE(t.item_count, 0) AS item_count,
        COALESCE(t.total_qty, 0) AS total_qty,
        COALESCE(t.total_value, 0) AS total_value

      FROM stock_outward so
      LEFT JOIN warehouses w ON w.id = so.warehouse_id
      LEFT JOIN (
        SELECT
          stock_outward_id,
          COUNT(id) AS item_count,
          COALESCE(SUM(quantity), 0) AS total_qty,
          COALESCE(SUM(quantity * unit_cost), 0) AS total_value
        FROM stock_outward_items
        GROUP BY stock_outward_id
      ) t ON t.stock_outward_id = so.id
      ${whereSql}
      ORDER BY so.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: rows.length,
      stock_outwards: rows,
    });
  } catch (error) {
    console.error("Get stock outwards error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock outward",
      error: error.message,
    });
  }
};

exports.getStockOutwardById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[stockOutward]] = await db.query(
      `
      SELECT
        so.*,
        w.name AS warehouse_name,
        w.warehouse_code
      FROM stock_outward so
      LEFT JOIN warehouses w ON w.id = so.warehouse_id
      WHERE so.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!stockOutward) {
      return res.status(404).json({
        success: false,
        message: "Stock outward not found",
      });
    }

    const [items] = await db.query(
      `
      SELECT
        soi.id,
        soi.stock_outward_id,
        soi.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        soi.batch_id,
        ib.batch_no,
        ib.expiry_date,
        soi.quantity,
        soi.unit_cost,
        (soi.quantity * soi.unit_cost) AS total_amount,
        soi.created_at
      FROM stock_outward_items soi
      LEFT JOIN products p ON p.id = soi.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventory_batches ib ON ib.id = soi.batch_id
      WHERE soi.stock_outward_id = ?
      ORDER BY soi.id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      stock_outward: stockOutward,
      items,
    });
  } catch (error) {
    console.error("Get stock outward by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock outward",
      error: error.message,
    });
  }
};

exports.createStockOutward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      outward_number,
      warehouse_id,
      reference_type,
      reference_id,
      outward_date,
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
        message: "At least one stock item is required",
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

    for (const item of items) {
      if (!item.product_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Product is required for all items",
        });
      }

      if (toNumber(item.quantity) <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than zero",
        });
      }

      const [[product]] = await connection.query(
        `SELECT id FROM products WHERE id = ? LIMIT 1`,
        [item.product_id]
      );

      if (!product) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product_id}`,
        });
      }
    }

    const finalOutwardNumber =
      outward_number && outward_number.trim()
        ? outward_number.trim()
        : generateOutwardNumber();

    const createdBy = getUserId(req);

    const [outwardResult] = await connection.query(
      `
      INSERT INTO stock_outward
        (
          outward_number,
          warehouse_id,
          reference_type,
          reference_id,
          outward_date,
          status,
          created_by
        )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalOutwardNumber,
        warehouse_id,
        cleanValue(reference_type),
        cleanValue(reference_id),
        outward_date || new Date().toISOString().slice(0, 10),
        status === "posted" ? "posted" : "draft",
        createdBy,
      ]
    );

    const stockOutwardId = outwardResult.insertId;

    for (const item of items) {
      await connection.query(
        `
        INSERT INTO stock_outward_items
          (
            stock_outward_id,
            product_id,
            batch_id,
            quantity,
            unit_cost
          )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          stockOutwardId,
          item.product_id,
          cleanValue(item.batch_id),
          toNumber(item.quantity),
          toNumber(item.unit_cost),
        ]
      );

      if (status === "posted") {
        await reduceInventoryStock(
          connection,
          item,
          warehouse_id,
          stockOutwardId,
          createdBy
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message:
        status === "posted"
          ? "Stock outward created and posted successfully"
          : "Stock outward draft created successfully",
      stock_outward: {
        id: stockOutwardId,
        outward_number: finalOutwardNumber,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create stock outward error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Outward number already exists",
      });
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create stock outward",
    });
  } finally {
    connection.release();
  }
};

exports.updateStockOutward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const {
      outward_number,
      warehouse_id,
      reference_type,
      reference_id,
      outward_date,
      items = [],
    } = req.body;

    const [[existing]] = await connection.query(
      `SELECT * FROM stock_outward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock outward not found",
      });
    }

    if (existing.status !== "draft") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Only draft stock outward can be updated",
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
        message: "At least one stock item is required",
      });
    }

    await connection.query(
      `
      UPDATE stock_outward
      SET
        outward_number = ?,
        warehouse_id = ?,
        reference_type = ?,
        reference_id = ?,
        outward_date = ?
      WHERE id = ?
      `,
      [
        outward_number || existing.outward_number,
        warehouse_id,
        cleanValue(reference_type),
        cleanValue(reference_id),
        outward_date || existing.outward_date,
        id,
      ]
    );

    await connection.query(
      `DELETE FROM stock_outward_items WHERE stock_outward_id = ?`,
      [id]
    );

    for (const item of items) {
      if (!item.product_id || toNumber(item.quantity) <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Each item must have product and valid quantity",
        });
      }

      await connection.query(
        `
        INSERT INTO stock_outward_items
          (
            stock_outward_id,
            product_id,
            batch_id,
            quantity,
            unit_cost
          )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          id,
          item.product_id,
          cleanValue(item.batch_id),
          toNumber(item.quantity),
          toNumber(item.unit_cost),
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Stock outward updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update stock outward error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update stock outward",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.postStockOutward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = getUserId(req);

    const [[stockOutward]] = await connection.query(
      `SELECT * FROM stock_outward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!stockOutward) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock outward not found",
      });
    }

    if (stockOutward.status === "posted") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Stock outward already posted",
      });
    }

    if (stockOutward.status === "cancelled") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cancelled stock outward cannot be posted",
      });
    }

    const [items] = await connection.query(
      `SELECT * FROM stock_outward_items WHERE stock_outward_id = ?`,
      [id]
    );

    if (!items.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No items found in this stock outward",
      });
    }

    for (const item of items) {
      await reduceInventoryStock(
        connection,
        item,
        stockOutward.warehouse_id,
        id,
        userId
      );
    }

    await connection.query(
      `UPDATE stock_outward SET status = 'posted' WHERE id = ?`,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Stock outward posted and inventory reduced successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Post stock outward error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to post stock outward",
    });
  } finally {
    connection.release();
  }
};

exports.cancelStockOutward = async (req, res) => {
  try {
    const { id } = req.params;

    const [[stockOutward]] = await db.query(
      `SELECT id, status FROM stock_outward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!stockOutward) {
      return res.status(404).json({
        success: false,
        message: "Stock outward not found",
      });
    }

    if (stockOutward.status === "posted") {
      return res.status(400).json({
        success: false,
        message: "Posted stock outward cannot be cancelled",
      });
    }

    await db.query(
      `UPDATE stock_outward SET status = 'cancelled' WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Stock outward cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel stock outward error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel stock outward",
      error: error.message,
    });
  }
};

exports.deleteStockOutward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [[stockOutward]] = await connection.query(
      `SELECT id, status FROM stock_outward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!stockOutward) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock outward not found",
      });
    }

    if (stockOutward.status === "posted") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Posted stock outward cannot be deleted",
      });
    }

    await connection.query(
      `DELETE FROM stock_outward_items WHERE stock_outward_id = ?`,
      [id]
    );

    await connection.query(`DELETE FROM stock_outward WHERE id = ?`, [id]);

    await connection.commit();

    res.json({
      success: true,
      message: "Stock outward deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete stock outward error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete stock outward",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};