const db = require("../config/db");

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getInventoryCondition = (variantId) => {
  if (variantId) {
    return {
      hasVariant: true,
      sql: "warehouse_id = ? AND product_id = ? AND variant_id = ?",
    };
  }

  return {
    hasVariant: false,
    sql: "warehouse_id = ? AND product_id = ? AND variant_id IS NULL",
  };
};

exports.getOutletStock = async (req, res) => {
  try {
    const { warehouse_id = "", search = "" } = req.query;

    const where = [];
    const params = [];

    if (warehouse_id) {
      where.push("os.outlet_id = ?");
      params.push(warehouse_id);
    }

    if (search) {
      where.push("(p.name LIKE ? OR p.product_code LIKE ? OR p.sku LIKE ? OR w.name LIKE ?)");
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `SELECT
        os.id,
        os.outlet_id AS warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        os.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        p.purchase_price AS average_cost,
        p.min_stock_level,
        p.reorder_level,
        os.available_qty,
        0 AS reserved_qty,
        0 AS damaged_qty,
        (os.available_qty * COALESCE(p.purchase_price, 0)) AS stock_value,
        CASE
          WHEN os.available_qty <= COALESCE(p.min_stock_level, 0) THEN 'critical'
          WHEN os.available_qty <= COALESCE(p.reorder_level, 0) THEN 'low_stock'
          ELSE 'normal'
        END AS stock_status,
        os.updated_at
       FROM outlet_stock os
       LEFT JOIN warehouses w ON w.id = os.outlet_id
       LEFT JOIN products p ON p.id = os.product_id
       ${whereSql}
       ORDER BY p.name ASC`,
      params
    );

    res.json({ success: true, count: rows.length, inventory: rows });
  } catch (error) {
    console.error("Get outlet stock error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch outlet stock", error: error.message });
  }
};

exports.createOrUpdateOutletStock = async (req, res) => {
  try {
    const { warehouse_id, product_id, available_qty } = req.body;

    if (!warehouse_id || !product_id) {
      return res.status(400).json({ success: false, message: "Warehouse and product are required" });
    }

    const [[existing]] = await db.query(
      `SELECT id FROM outlet_stock WHERE outlet_id = ? AND product_id = ? LIMIT 1`,
      [warehouse_id, product_id]
    );

    if (existing) {
      await db.query(
        `UPDATE outlet_stock SET available_qty = ?, updated_at = NOW() WHERE id = ?`,
        [toNumber(available_qty), existing.id]
      );
      return res.json({ success: true, message: "Outlet stock updated successfully", id: existing.id });
    }

    const [result] = await db.query(
      `INSERT INTO outlet_stock (outlet_id, product_id, available_qty, updated_at) VALUES (?, ?, ?, NOW())`,
      [warehouse_id, product_id, toNumber(available_qty)]
    );

    res.status(201).json({ success: true, message: "Outlet stock created successfully", id: result.insertId });
  } catch (error) {
    console.error("Create/update outlet stock error:", error);
    res.status(500).json({ success: false, message: "Failed to save outlet stock", error: error.message });
  }
};

exports.updateOutletStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { available_qty } = req.body;

    const [[existing]] = await db.query(
      `SELECT id FROM outlet_stock WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Outlet stock record not found" });
    }

    await db.query(
      `UPDATE outlet_stock SET available_qty = ?, updated_at = NOW() WHERE id = ?`,
      [toNumber(available_qty), id]
    );

    res.json({ success: true, message: "Outlet stock updated successfully" });
  } catch (error) {
    console.error("Update outlet stock error:", error);
    res.status(500).json({ success: false, message: "Failed to update outlet stock", error: error.message });
  }
};

exports.deleteOutletStock = async (req, res) => {
  try {
    const { id } = req.params;

    const [[existing]] = await db.query(
      `SELECT id FROM outlet_stock WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Outlet stock record not found" });
    }

    await db.query(`DELETE FROM outlet_stock WHERE id = ?`, [id]);

    res.json({ success: true, message: "Outlet stock record deleted successfully" });
  } catch (error) {
    console.error("Delete outlet stock error:", error);
    res.status(500).json({ success: false, message: "Failed to delete outlet stock", error: error.message });
  }
};

exports.getInventories = async (req, res) => {
  try {
    const [inventories] = await db.query(`
      SELECT 
        i.id,
        i.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        i.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        p.min_stock_level,
        p.reorder_level,
        u.short_name AS unit_short_name,
        i.variant_id,
        pv.variant_name,
        i.available_qty,
        i.reserved_qty,
        i.damaged_qty,
        i.average_cost,
        ((i.available_qty + i.reserved_qty + i.damaged_qty) * i.average_cost) AS stock_value,
        CASE
          WHEN i.available_qty <= p.min_stock_level THEN 'critical'
          WHEN i.available_qty <= p.reorder_level THEN 'low'
          ELSE 'normal'
        END AS stock_status,
        i.updated_at
      FROM inventories i
      LEFT JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN product_variants pv ON i.variant_id = pv.id
      ORDER BY i.id DESC
    `);

    res.json({
      success: true,
      count: inventories.length,
      inventories,
    });
  } catch (error) {
    console.error("Get inventories error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventories",
      error: error.message,
    });
  }
};

exports.getLowStockInventories = async (req, res) => {
  try {
    const [inventories] = await db.query(`
      SELECT 
        i.id,
        i.warehouse_id,
        w.name AS warehouse_name,
        i.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_short_name,
        i.available_qty,
        p.min_stock_level,
        p.reorder_level,
        CASE
          WHEN i.available_qty <= p.min_stock_level THEN 'critical'
          WHEN i.available_qty <= p.reorder_level THEN 'low'
          ELSE 'normal'
        END AS stock_status
      FROM inventories i
      LEFT JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE i.available_qty <= p.reorder_level
      ORDER BY i.available_qty ASC
    `);

    res.json({
      success: true,
      count: inventories.length,
      inventories,
    });
  } catch (error) {
    console.error("Get low stock error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock inventories",
      error: error.message,
    });
  }
};

exports.getInventorySummary = async (req, res) => {
  try {
    const [[summaryRow]] = await db.query(`
      SELECT
        COUNT(*) AS total_stock_items,
        COALESCE(SUM(os.available_qty), 0) AS total_available_qty,
        0 AS total_reserved_qty,
        0 AS total_damaged_qty,
        COALESCE(SUM(os.available_qty * COALESCE(p.purchase_price, 0)), 0) AS total_stock_value
      FROM outlet_stock os
      LEFT JOIN products p ON p.id = os.product_id
    `);

    const [[lowRow]] = await db.query(`
      SELECT COUNT(*) AS low_stock_count
      FROM outlet_stock os
      LEFT JOIN products p ON p.id = os.product_id
      WHERE os.available_qty <= COALESCE(p.reorder_level, 0)
    `);

    res.json({
      success: true,
      summary: {
        ...summaryRow,
        low_stock_count: lowRow?.low_stock_count || 0,
      },
    });
  } catch (error) {
    console.error("Get inventory summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory summary",
      error: error.message,
    });
  }
};

exports.getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [inventories] = await db.query(
      `
      SELECT 
        i.*,
        w.name AS warehouse_name,
        p.name AS product_name,
        p.product_code,
        p.sku
      FROM inventories i
      LEFT JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE i.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (inventories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    res.json({
      success: true,
      inventory: inventories[0],
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
      error: error.message,
    });
  }
};

exports.createOrUpdateInventory = async (req, res) => {
  try {
    const {
      warehouse_id,
      product_id,
      variant_id,
      available_qty,
      reserved_qty,
      damaged_qty,
      average_cost,
    } = req.body;

    if (!warehouse_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "Warehouse and product are required",
      });
    }

    const [warehouseRows] = await db.query(
      `SELECT id FROM warehouses WHERE id = ? LIMIT 1`,
      [warehouse_id]
    );

    if (warehouseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const [productRows] = await db.query(
      `SELECT id FROM products WHERE id = ? LIMIT 1`,
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const condition = getInventoryCondition(variant_id);
    const params = condition.hasVariant
      ? [warehouse_id, product_id, variant_id]
      : [warehouse_id, product_id];

    const [existingRows] = await db.query(
      `
      SELECT *
      FROM inventories
      WHERE ${condition.sql}
      LIMIT 1
      `,
      params
    );

    if (existingRows.length > 0) {
      const inventoryId = existingRows[0].id;

      await db.query(
        `
        UPDATE inventories SET
          available_qty = ?,
          reserved_qty = ?,
          damaged_qty = ?,
          average_cost = ?
        WHERE id = ?
        `,
        [
          available_qty || 0,
          reserved_qty || 0,
          damaged_qty || 0,
          average_cost || 0,
          inventoryId,
        ]
      );

      await db.query(
        `
        INSERT INTO stock_movements (
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
        VALUES (?, ?, NULL, 'adjustment', ?, 'manual_inventory_update', ?, ?, ?)
        `,
        [
          warehouse_id,
          product_id,
          available_qty || 0,
          inventoryId,
          available_qty || 0,
          req.user?.id || null,
        ]
      );

      return res.json({
        success: true,
        message: "Inventory updated successfully",
        inventory_id: inventoryId,
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO inventories (
        warehouse_id,
        product_id,
        variant_id,
        available_qty,
        reserved_qty,
        damaged_qty,
        average_cost
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        warehouse_id,
        product_id,
        variant_id || null,
        available_qty || 0,
        reserved_qty || 0,
        damaged_qty || 0,
        average_cost || 0,
      ]
    );

    await db.query(
      `
      INSERT INTO stock_movements (
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
      VALUES (?, ?, NULL, 'in', ?, 'opening_stock', ?, ?, ?)
      `,
      [
        warehouse_id,
        product_id,
        available_qty || 0,
        result.insertId,
        available_qty || 0,
        req.user?.id || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      inventory_id: result.insertId,
    });
  } catch (error) {
    console.error("Create/update inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save inventory",
      error: error.message,
    });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const {
      warehouse_id,
      product_id,
      variant_id,
      batch_id,
      movement_type,
      quantity,
      average_cost,
      reference_type,
      reference_id,
    } = req.body;

    if (!warehouse_id || !product_id || !movement_type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Warehouse, product, movement type and quantity are required",
      });
    }

    const qty = toNumber(quantity);

    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity should be greater than 0",
      });
    }

    const allowedMovements = [
      "in",
      "out",
      "transfer",
      "adjustment",
      "damage",
      "reservation",
      "release",
    ];

    if (!allowedMovements.includes(movement_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movement type",
      });
    }

    const condition = getInventoryCondition(variant_id);
    const params = condition.hasVariant
      ? [warehouse_id, product_id, variant_id]
      : [warehouse_id, product_id];

    const [existingRows] = await db.query(
      `
      SELECT *
      FROM inventories
      WHERE ${condition.sql}
      LIMIT 1
      `,
      params
    );

    let inventory = existingRows[0];

    if (!inventory) {
      const [result] = await db.query(
        `
        INSERT INTO inventories (
          warehouse_id,
          product_id,
          variant_id,
          available_qty,
          reserved_qty,
          damaged_qty,
          average_cost
        )
        VALUES (?, ?, ?, 0, 0, 0, ?)
        `,
        [warehouse_id, product_id, variant_id || null, average_cost || 0]
      );

      const [newRows] = await db.query(
        `SELECT * FROM inventories WHERE id = ? LIMIT 1`,
        [result.insertId]
      );

      inventory = newRows[0];
    }

    let availableQty = toNumber(inventory.available_qty);
    let reservedQty = toNumber(inventory.reserved_qty);
    let damagedQty = toNumber(inventory.damaged_qty);
    let avgCost = toNumber(inventory.average_cost);

    if (movement_type === "in") {
      const currentValue = availableQty * avgCost;
      const incomingValue = qty * toNumber(average_cost || avgCost);

      availableQty += qty;

      if (availableQty > 0 && average_cost) {
        avgCost = (currentValue + incomingValue) / availableQty;
      }
    }

    if (movement_type === "out" || movement_type === "transfer") {
      if (availableQty < qty) {
        return res.status(400).json({
          success: false,
          message: "Insufficient available stock",
        });
      }

      availableQty -= qty;
    }

    if (movement_type === "damage") {
      if (availableQty < qty) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock to mark as damaged",
        });
      }

      availableQty -= qty;
      damagedQty += qty;
    }

    if (movement_type === "reservation") {
      if (availableQty < qty) {
        return res.status(400).json({
          success: false,
          message: "Insufficient available stock for reservation",
        });
      }

      availableQty -= qty;
      reservedQty += qty;
    }

    if (movement_type === "release") {
      if (reservedQty < qty) {
        return res.status(400).json({
          success: false,
          message: "Insufficient reserved stock to release",
        });
      }

      reservedQty -= qty;
      availableQty += qty;
    }

    if (movement_type === "adjustment") {
      availableQty = qty;
    }

    await db.query(
      `
      UPDATE inventories SET
        available_qty = ?,
        reserved_qty = ?,
        damaged_qty = ?,
        average_cost = ?
      WHERE id = ?
      `,
      [
        availableQty,
        reservedQty,
        damagedQty,
        avgCost,
        inventory.id,
      ]
    );

    await db.query(
      `
      INSERT INTO stock_movements (
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        warehouse_id,
        product_id,
        batch_id || null,
        movement_type,
        qty,
        reference_type || "manual_stock_adjustment",
        reference_id || inventory.id,
        availableQty,
        req.user?.id || null,
      ]
    );

    res.json({
      success: true,
      message: "Stock adjusted successfully",
      inventory_id: inventory.id,
      available_qty: availableQty,
      reserved_qty: reservedQty,
      damaged_qty: damagedQty,
      average_cost: avgCost,
    });
  } catch (error) {
    console.error("Adjust stock error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to adjust stock",
      error: error.message,
    });
  }
};

exports.getStockMovements = async (req, res) => {
  try {
    const [movements] = await db.query(`
      SELECT 
        sm.id,
        sm.warehouse_id,
        w.name AS warehouse_name,
        sm.product_id,
        p.name AS product_name,
        p.product_code,
        sm.batch_id,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.balance_after,
        sm.created_by,
        sm.created_at
      FROM stock_movements sm
      LEFT JOIN warehouses w ON sm.warehouse_id = w.id
      LEFT JOIN products p ON sm.product_id = p.id
      ORDER BY sm.id DESC
      LIMIT 500
    `);

    res.json({
      success: true,
      count: movements.length,
      movements,
    });
  } catch (error) {
    console.error("Get stock movements error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movements",
      error: error.message,
    });
  }
};
