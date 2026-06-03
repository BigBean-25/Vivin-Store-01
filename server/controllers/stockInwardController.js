const db = require("../config/db");

const generateInwardNumber = () => {
  return `SIN-${Date.now().toString().slice(-8)}`;
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

const getExpiryAlertDate = (expiryDate) => {
  if (!expiryDate) return null;

  const date = new Date(expiryDate);
  if (Number.isNaN(date.getTime())) return null;

  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
};

const updateInventoryStock = async (
  connection,
  item,
  warehouseId,
  stockInwardId,
  userId
) => {
  const productId = item.product_id;
  const qty = toNumber(item.quantity);
  const unitCost = toNumber(item.unit_cost);

  const [[existingInventory]] = await connection.query(
    `
    SELECT id, available_qty, average_cost
    FROM inventories
    WHERE warehouse_id = ?
      AND product_id = ?
      AND variant_id IS NULL
    LIMIT 1
    `,
    [warehouseId, productId]
  );

  let balanceAfter = qty;
  let newAverageCost = unitCost;

  if (existingInventory) {
    const currentQty = toNumber(existingInventory.available_qty);
    const currentAvgCost = toNumber(existingInventory.average_cost);
    const totalQty = currentQty + qty;

    if (totalQty > 0) {
      newAverageCost =
        (currentQty * currentAvgCost + qty * unitCost) / totalQty;
    }

    balanceAfter = totalQty;

    await connection.query(
      `
      UPDATE inventories
      SET
        available_qty = ?,
        average_cost = ?
      WHERE id = ?
      `,
      [balanceAfter, newAverageCost, existingInventory.id]
    );
  } else {
    await connection.query(
      `
      INSERT INTO inventories
        (
          warehouse_id,
          product_id,
          variant_id,
          available_qty,
          reserved_qty,
          damaged_qty,
          average_cost
        )
      VALUES (?, ?, NULL, ?, 0, 0, ?)
      `,
      [warehouseId, productId, qty, unitCost]
    );
  }

  let batchId = null;

  if (item.batch_no || item.expiry_date) {
    const [batchResult] = await connection.query(
      `
      INSERT INTO inventory_batches
        (
          warehouse_id,
          product_id,
          batch_no,
          manufacture_date,
          expiry_date,
          quantity,
          cost_price,
          status
        )
      VALUES (?, ?, ?, NULL, ?, ?, ?, 'active')
      `,
      [
        warehouseId,
        productId,
        item.batch_no || `BATCH-${Date.now()}`,
        cleanValue(item.expiry_date),
        qty,
        unitCost,
      ]
    );

    batchId = batchResult.insertId;

    if (item.expiry_date) {
      await connection.query(
        `
        INSERT INTO inventory_expiry
          (
            batch_id,
            product_id,
            warehouse_id,
            expiry_date,
            alert_date,
            status
          )
        VALUES (?, ?, ?, ?, ?, 'normal')
        `,
        [
          batchId,
          productId,
          warehouseId,
          item.expiry_date,
          getExpiryAlertDate(item.expiry_date),
        ]
      );
    }
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
    VALUES (?, ?, ?, 'in', ?, 'stock_inward', ?, ?, ?)
    `,
    [warehouseId, productId, batchId, qty, stockInwardId, balanceAfter, userId]
  );
};

exports.getStockInwards = async (req, res) => {
  try {
    const { search = "", status = "", warehouse_id = "" } = req.query;

    const where = [];
    const params = [];

    if (status) {
      where.push("si.status = ?");
      params.push(status);
    }

    if (warehouse_id) {
      where.push("si.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (search) {
      where.push(`
        (
          si.inward_number LIKE ?
          OR si.reference_type LIKE ?
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
        si.id,
        si.inward_number,
        si.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        si.reference_type,
        si.reference_id,
        si.inward_date,
        si.status,
        si.created_by,
        si.created_at,

        COALESCE(t.item_count, 0) AS item_count,
        COALESCE(t.total_qty, 0) AS total_qty,
        COALESCE(t.total_value, 0) AS total_value

      FROM stock_inward si
      LEFT JOIN warehouses w ON w.id = si.warehouse_id
      LEFT JOIN (
        SELECT
          stock_inward_id,
          COUNT(id) AS item_count,
          COALESCE(SUM(quantity), 0) AS total_qty,
          COALESCE(SUM(quantity * unit_cost), 0) AS total_value
        FROM stock_inward_items
        GROUP BY stock_inward_id
      ) t ON t.stock_inward_id = si.id
      ${whereSql}
      ORDER BY si.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: rows.length,
      stock_inwards: rows,
    });
  } catch (error) {
    console.error("Get stock inwards error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock inward",
      error: error.message,
    });
  }
};

exports.getStockInwardById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[stockInward]] = await db.query(
      `
      SELECT
        si.*,
        w.name AS warehouse_name,
        w.warehouse_code
      FROM stock_inward si
      LEFT JOIN warehouses w ON w.id = si.warehouse_id
      WHERE si.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!stockInward) {
      return res.status(404).json({
        success: false,
        message: "Stock inward not found",
      });
    }

    const [items] = await db.query(
      `
      SELECT
        sii.id,
        sii.stock_inward_id,
        sii.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        sii.batch_no,
        sii.expiry_date,
        sii.quantity,
        sii.unit_cost,
        (sii.quantity * sii.unit_cost) AS total_amount,
        sii.created_at
      FROM stock_inward_items sii
      LEFT JOIN products p ON p.id = sii.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE sii.stock_inward_id = ?
      ORDER BY sii.id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      stock_inward: stockInward,
      items,
    });
  } catch (error) {
    console.error("Get stock inward by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock inward",
      error: error.message,
    });
  }
};

exports.createStockInward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      inward_number,
      warehouse_id,
      reference_type,
      reference_id,
      inward_date,
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

    const finalInwardNumber =
      inward_number && inward_number.trim()
        ? inward_number.trim()
        : generateInwardNumber();

    const createdBy = getUserId(req);

    const [inwardResult] = await connection.query(
      `
      INSERT INTO stock_inward
        (
          inward_number,
          warehouse_id,
          reference_type,
          reference_id,
          inward_date,
          status,
          created_by
        )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalInwardNumber,
        warehouse_id,
        cleanValue(reference_type),
        cleanValue(reference_id),
        inward_date || new Date().toISOString().slice(0, 10),
        status === "posted" ? "posted" : "draft",
        createdBy,
      ]
    );

    const stockInwardId = inwardResult.insertId;

    for (const item of items) {
      await connection.query(
        `
        INSERT INTO stock_inward_items
          (
            stock_inward_id,
            product_id,
            batch_no,
            expiry_date,
            quantity,
            unit_cost
          )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          stockInwardId,
          item.product_id,
          cleanValue(item.batch_no),
          cleanValue(item.expiry_date),
          toNumber(item.quantity),
          toNumber(item.unit_cost),
        ]
      );

      if (status === "posted") {
        await updateInventoryStock(
          connection,
          item,
          warehouse_id,
          stockInwardId,
          createdBy
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message:
        status === "posted"
          ? "Stock inward created and posted successfully"
          : "Stock inward draft created successfully",
      stock_inward: {
        id: stockInwardId,
        inward_number: finalInwardNumber,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create stock inward error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Inward number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create stock inward",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateStockInward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const {
      inward_number,
      warehouse_id,
      reference_type,
      reference_id,
      inward_date,
      items = [],
    } = req.body;

    const [[existing]] = await connection.query(
      `SELECT * FROM stock_inward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock inward not found",
      });
    }

    if (existing.status !== "draft") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Only draft stock inward can be updated",
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
      UPDATE stock_inward
      SET
        inward_number = ?,
        warehouse_id = ?,
        reference_type = ?,
        reference_id = ?,
        inward_date = ?
      WHERE id = ?
      `,
      [
        inward_number || existing.inward_number,
        warehouse_id,
        cleanValue(reference_type),
        cleanValue(reference_id),
        inward_date || existing.inward_date,
        id,
      ]
    );

    await connection.query(
      `DELETE FROM stock_inward_items WHERE stock_inward_id = ?`,
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
        INSERT INTO stock_inward_items
          (
            stock_inward_id,
            product_id,
            batch_no,
            expiry_date,
            quantity,
            unit_cost
          )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          item.product_id,
          cleanValue(item.batch_no),
          cleanValue(item.expiry_date),
          toNumber(item.quantity),
          toNumber(item.unit_cost),
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Stock inward updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update stock inward error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update stock inward",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.postStockInward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = getUserId(req);

    const [[stockInward]] = await connection.query(
      `SELECT * FROM stock_inward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!stockInward) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock inward not found",
      });
    }

    if (stockInward.status === "posted") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Stock inward already posted",
      });
    }

    if (stockInward.status === "cancelled") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cancelled stock inward cannot be posted",
      });
    }

    const [items] = await connection.query(
      `SELECT * FROM stock_inward_items WHERE stock_inward_id = ?`,
      [id]
    );

    if (!items.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No items found in this stock inward",
      });
    }

    for (const item of items) {
      await updateInventoryStock(
        connection,
        item,
        stockInward.warehouse_id,
        id,
        userId
      );
    }

    await connection.query(
      `UPDATE stock_inward SET status = 'posted' WHERE id = ?`,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Stock inward posted and inventory updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Post stock inward error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to post stock inward",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.cancelStockInward = async (req, res) => {
  try {
    const { id } = req.params;

    const [[stockInward]] = await db.query(
      `SELECT id, status FROM stock_inward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!stockInward) {
      return res.status(404).json({
        success: false,
        message: "Stock inward not found",
      });
    }

    if (stockInward.status === "posted") {
      return res.status(400).json({
        success: false,
        message: "Posted stock inward cannot be cancelled",
      });
    }

    await db.query(
      `UPDATE stock_inward SET status = 'cancelled' WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Stock inward cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel stock inward error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel stock inward",
      error: error.message,
    });
  }
};

exports.deleteStockInward = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [[stockInward]] = await connection.query(
      `SELECT id, status FROM stock_inward WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!stockInward) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Stock inward not found",
      });
    }

    if (stockInward.status === "posted") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Posted stock inward cannot be deleted",
      });
    }

    await connection.query(
      `DELETE FROM stock_inward_items WHERE stock_inward_id = ?`,
      [id]
    );

    await connection.query(`DELETE FROM stock_inward WHERE id = ?`, [id]);

    await connection.commit();

    res.json({
      success: true,
      message: "Stock inward deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete stock inward error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete stock inward",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};