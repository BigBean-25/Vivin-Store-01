const db = require("../config/db");

const generateReturnNumber = () => {
  return `PR-${Date.now().toString().slice(-8)}`;
};

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
};

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || null;
};

const buildWhereClause = (filters = {}) => {
  const conditions = [];
  const values = [];

  if (filters.search) {
    conditions.push(`
      (
        pr.return_number LIKE ?
        OR v.business_name LIKE ?
        OR po.po_number LIKE ?
        OR gr.grn_number LIKE ?
        OR pr.reason LIKE ?
      )
    `);

    const search = `%${filters.search}%`;
    values.push(search, search, search, search, search);
  }

  if (filters.vendor_id) {
    conditions.push("pr.vendor_id = ?");
    values.push(filters.vendor_id);
  }

  if (filters.purchase_order_id) {
    conditions.push("pr.purchase_order_id = ?");
    values.push(filters.purchase_order_id);
  }

  if (filters.goods_receipt_id) {
    conditions.push("pr.goods_receipt_id = ?");
    values.push(filters.goods_receipt_id);
  }

  if (filters.status) {
    conditions.push("pr.status = ?");
    values.push(filters.status);
  }

  if (filters.from_date) {
    conditions.push("pr.return_date >= ?");
    values.push(filters.from_date);
  }

  if (filters.to_date) {
    conditions.push("pr.return_date <= ?");
    values.push(filters.to_date);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

const getReturnWarehouseId = async (
  connection,
  { goodsReceiptId, purchaseOrderId }
) => {
  if (goodsReceiptId) {
    const [rows] = await connection.query(
      `
        SELECT warehouse_id
        FROM goods_receipts
        WHERE id = ?
        LIMIT 1
      `,
      [goodsReceiptId]
    );

    if (rows[0]?.warehouse_id) return rows[0].warehouse_id;
  }

  if (purchaseOrderId) {
    const [rows] = await connection.query(
      `
        SELECT warehouse_id
        FROM purchase_orders
        WHERE id = ?
        LIMIT 1
      `,
      [purchaseOrderId]
    );

    if (rows[0]?.warehouse_id) return rows[0].warehouse_id;
  }

  return null;
};

const reduceInventoryBatchQty = async (
  connection,
  { warehouseId, productId, quantity }
) => {
  let remainingQty = toNumber(quantity);

  const [batches] = await connection.query(
    `
      SELECT id, quantity
      FROM inventory_batches
      WHERE warehouse_id = ?
        AND product_id = ?
        AND status = 'active'
        AND quantity > 0
      ORDER BY
        CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
        expiry_date ASC,
        id ASC
    `,
    [warehouseId, productId]
  );

  for (const batch of batches) {
    if (remainingQty <= 0) break;

    const batchQty = toNumber(batch.quantity);
    const deductQty = Math.min(batchQty, remainingQty);
    const newBatchQty = batchQty - deductQty;
    const newStatus = newBatchQty <= 0 ? "consumed" : "active";

    await connection.query(
      `
        UPDATE inventory_batches
        SET quantity = ?, status = ?
        WHERE id = ?
      `,
      [newBatchQty, newStatus, batch.id]
    );

    remainingQty -= deductQty;
  }
};

const reduceInventoryForReturnItem = async (
  connection,
  { warehouseId, productId, quantity, returnId, userId }
) => {
  const qty = toNumber(quantity);

  if (!warehouseId) {
    throw new Error("Warehouse not found for this return");
  }

  if (!productId) {
    throw new Error("Product is required for return item");
  }

  if (qty <= 0) {
    throw new Error("Return quantity must be greater than 0");
  }

  const [inventories] = await connection.query(
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

  if (inventories.length === 0) {
    throw new Error(`Inventory not found for product ID ${productId}`);
  }

  const inventory = inventories[0];
  const availableQty = toNumber(inventory.available_qty);

  if (availableQty < qty) {
    throw new Error(
      `Insufficient stock for product ID ${productId}. Available: ${availableQty}, Return Qty: ${qty}`
    );
  }

  const balanceAfter = availableQty - qty;

  await connection.query(
    `
      UPDATE inventories
      SET available_qty = ?
      WHERE id = ?
    `,
    [balanceAfter, inventory.id]
  );

  await reduceInventoryBatchQty(connection, {
    warehouseId,
    productId,
    quantity: qty,
  });

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
      VALUES (?, ?, NULL, 'out', ?, 'procurement_return', ?, ?, ?)
    `,
    [warehouseId, productId, qty, returnId, balanceAfter, userId]
  );
};

const closeProcurementReturn = async (connection, returnId, userId) => {
  const [returns] = await connection.query(
    `
      SELECT
        id,
        vendor_id,
        purchase_order_id,
        goods_receipt_id,
        status
      FROM procurement_returns
      WHERE id = ?
      LIMIT 1
    `,
    [returnId]
  );

  if (returns.length === 0) {
    throw new Error("Procurement return not found");
  }

  const procurementReturn = returns[0];

  if (procurementReturn.status === "closed") {
    throw new Error("Procurement return already closed");
  }

  const warehouseId = await getReturnWarehouseId(connection, {
    goodsReceiptId: procurementReturn.goods_receipt_id,
    purchaseOrderId: procurementReturn.purchase_order_id,
  });

  if (!warehouseId) {
    throw new Error(
      "Warehouse not found. Select GRN or Purchase Order with warehouse."
    );
  }

  const [items] = await connection.query(
    `
      SELECT
        id,
        product_id,
        quantity
      FROM procurement_return_items
      WHERE procurement_return_id = ?
    `,
    [returnId]
  );

  if (items.length === 0) {
    throw new Error("Return items not found");
  }

  for (const item of items) {
    await reduceInventoryForReturnItem(connection, {
      warehouseId,
      productId: item.product_id,
      quantity: item.quantity,
      returnId,
      userId,
    });
  }

  await connection.query(
    `
      UPDATE procurement_returns
      SET status = 'closed'
      WHERE id = ?
    `,
    [returnId]
  );
};

exports.getProcurementReturns = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      purchase_order_id = "",
      goods_receipt_id = "",
      status = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const { whereSql, values } = buildWhereClause({
      search: search.trim(),
      vendor_id,
      purchase_order_id,
      goods_receipt_id,
      status,
      from_date,
      to_date,
    });

    const [returns] = await db.query(
      `
        SELECT
          pr.id,
          pr.return_number,
          pr.vendor_id,
          v.business_name AS vendor_name,
          pr.purchase_order_id,
          po.po_number,
          pr.goods_receipt_id,
          gr.grn_number,
          pr.return_date,
          pr.reason,
          pr.status,
          pr.created_at,
          COUNT(pri.id) AS item_count,
          COALESCE(SUM(pri.quantity), 0) AS total_return_qty
        FROM procurement_returns pr
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
        LEFT JOIN goods_receipts gr ON pr.goods_receipt_id = gr.id
        LEFT JOIN procurement_return_items pri ON pr.id = pri.procurement_return_id
        ${whereSql}
        GROUP BY pr.id
        ORDER BY pr.id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: returns.length,
      returns,
      procurementReturns: returns,
      procurement_returns: returns,
    });
  } catch (error) {
    console.error("Get procurement returns error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement returns",
      error: error.message,
    });
  }
};

exports.getProcurementReturnSummary = async (req, res) => {
  try {
    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total_returns,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_count
      FROM procurement_returns
    `);

    const [qtyRows] = await db.query(`
      SELECT
        COALESCE(SUM(quantity), 0) AS total_return_qty
      FROM procurement_return_items
    `);

    res.json({
      success: true,
      summary: {
        ...(summaryRows[0] || {}),
        ...(qtyRows[0] || {}),
      },
    });
  } catch (error) {
    console.error("Get procurement return summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement return summary",
      error: error.message,
    });
  }
};

exports.getProcurementReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const [returns] = await db.query(
      `
        SELECT
          pr.id,
          pr.return_number,
          pr.vendor_id,
          v.business_name AS vendor_name,
          pr.purchase_order_id,
          po.po_number,
          pr.goods_receipt_id,
          gr.grn_number,
          pr.return_date,
          pr.reason,
          pr.status,
          pr.created_at
        FROM procurement_returns pr
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
        LEFT JOIN goods_receipts gr ON pr.goods_receipt_id = gr.id
        WHERE pr.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (returns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Procurement return not found",
      });
    }

    const [items] = await db.query(
      `
        SELECT
          pri.id,
          pri.procurement_return_id,
          pri.product_id,
          p.name AS product_name,
          p.product_code,
          p.sku,
          pri.quantity,
          pri.reason,
          pri.created_at
        FROM procurement_return_items pri
        LEFT JOIN products p ON pri.product_id = p.id
        WHERE pri.procurement_return_id = ?
        ORDER BY pri.id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      procurementReturn: {
        ...returns[0],
        items,
      },
      procurement_return: {
        ...returns[0],
        items,
      },
    });
  } catch (error) {
    console.error("Get procurement return by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement return",
      error: error.message,
    });
  }
};

exports.createProcurementReturn = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      vendor_id,
      purchase_order_id,
      goods_receipt_id,
      return_date,
      reason,
      status = "draft",
      items = [],
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one return item is required",
      });
    }

    await connection.beginTransaction();

    const [vendors] = await connection.query(
      `
        SELECT id
        FROM vendors
        WHERE id = ?
        LIMIT 1
      `,
      [vendor_id]
    );

    if (vendors.length === 0) {
      throw new Error("Vendor not found");
    }

    if (purchase_order_id) {
      const [purchaseOrders] = await connection.query(
        `
          SELECT id, vendor_id
          FROM purchase_orders
          WHERE id = ?
          LIMIT 1
        `,
        [purchase_order_id]
      );

      if (purchaseOrders.length === 0) {
        throw new Error("Purchase order not found");
      }

      if (Number(purchaseOrders[0].vendor_id) !== Number(vendor_id)) {
        throw new Error("Selected purchase order does not belong to selected vendor");
      }
    }

    if (goods_receipt_id) {
      const [goodsReceipts] = await connection.query(
        `
          SELECT id, vendor_id
          FROM goods_receipts
          WHERE id = ?
          LIMIT 1
        `,
        [goods_receipt_id]
      );

      if (goodsReceipts.length === 0) {
        throw new Error("Goods receipt not found");
      }

      if (
        goodsReceipts[0].vendor_id &&
        Number(goodsReceipts[0].vendor_id) !== Number(vendor_id)
      ) {
        throw new Error("Selected GRN does not belong to selected vendor");
      }
    }

    const returnNumber = generateReturnNumber();
    const finalReturnDate =
      cleanValue(return_date) || new Date().toISOString().slice(0, 10);

    const initialStatus = status === "closed" ? "draft" : status;

    const [result] = await connection.query(
      `
        INSERT INTO procurement_returns
          (
            return_number,
            vendor_id,
            purchase_order_id,
            goods_receipt_id,
            return_date,
            reason,
            status
          )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        returnNumber,
        vendor_id,
        cleanValue(purchase_order_id),
        cleanValue(goods_receipt_id),
        finalReturnDate,
        cleanValue(reason),
        cleanValue(initialStatus) || "draft",
      ]
    );

    const returnId = result.insertId;

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = toNumber(item.quantity);

      if (!productId) {
        throw new Error("Product is required in return item");
      }

      if (quantity <= 0) {
        throw new Error("Return quantity must be greater than 0");
      }

      await connection.query(
        `
          INSERT INTO procurement_return_items
            (
              procurement_return_id,
              product_id,
              quantity,
              reason
            )
          VALUES (?, ?, ?, ?)
        `,
        [
          returnId,
          productId,
          quantity,
          cleanValue(item.reason),
        ]
      );
    }

    if (status === "closed") {
      await closeProcurementReturn(connection, returnId, getUserId(req));
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message:
        status === "closed"
          ? "Procurement return created and stock deducted successfully"
          : "Procurement return created successfully",
      procurementReturn: {
        id: returnId,
        return_number: returnNumber,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create procurement return error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create procurement return",
    });
  } finally {
    connection.release();
  }
};

exports.updateProcurementReturn = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const {
      vendor_id,
      purchase_order_id,
      goods_receipt_id,
      return_date,
      reason,
      status,
      items = [],
    } = req.body;

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `
        SELECT *
        FROM procurement_returns
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (existingRows.length === 0) {
      throw new Error("Procurement return not found");
    }

    const existing = existingRows[0];

    if (existing.status === "closed") {
      throw new Error("Closed procurement return cannot be edited");
    }

    const finalVendorId = vendor_id || existing.vendor_id;

    await connection.query(
      `
        UPDATE procurement_returns
        SET
          vendor_id = ?,
          purchase_order_id = ?,
          goods_receipt_id = ?,
          return_date = ?,
          reason = ?,
          status = ?
        WHERE id = ?
      `,
      [
        finalVendorId,
        purchase_order_id === undefined
          ? existing.purchase_order_id
          : cleanValue(purchase_order_id),
        goods_receipt_id === undefined
          ? existing.goods_receipt_id
          : cleanValue(goods_receipt_id),
        return_date || existing.return_date,
        reason === undefined ? existing.reason : cleanValue(reason),
        status || existing.status,
        id,
      ]
    );

    if (Array.isArray(items) && items.length > 0) {
      await connection.query(
        `
          DELETE FROM procurement_return_items
          WHERE procurement_return_id = ?
        `,
        [id]
      );

      for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = toNumber(item.quantity);

        if (!productId) {
          throw new Error("Product is required in return item");
        }

        if (quantity <= 0) {
          throw new Error("Return quantity must be greater than 0");
        }

        await connection.query(
          `
            INSERT INTO procurement_return_items
              (
                procurement_return_id,
                product_id,
                quantity,
                reason
              )
            VALUES (?, ?, ?, ?)
          `,
          [
            id,
            productId,
            quantity,
            cleanValue(item.reason),
          ]
        );
      }
    }

    if (status === "closed") {
      await closeProcurementReturn(connection, id, getUserId(req));
    }

    await connection.commit();

    res.json({
      success: true,
      message:
        status === "closed"
          ? "Procurement return updated and stock deducted successfully"
          : "Procurement return updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update procurement return error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update procurement return",
    });
  } finally {
    connection.release();
  }
};

exports.updateProcurementReturnStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["draft", "approved", "sent", "closed"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid procurement return status",
      });
    }

    await connection.beginTransaction();

    const [returns] = await connection.query(
      `
        SELECT *
        FROM procurement_returns
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (returns.length === 0) {
      throw new Error("Procurement return not found");
    }

    const procurementReturn = returns[0];

    if (procurementReturn.status === "closed") {
      throw new Error("Closed procurement return status cannot be changed");
    }

    if (status === "closed") {
      await closeProcurementReturn(connection, id, getUserId(req));
    } else {
      await connection.query(
        `
          UPDATE procurement_returns
          SET status = ?
          WHERE id = ?
        `,
        [status, id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message:
        status === "closed"
          ? "Procurement return closed and stock deducted successfully"
          : "Procurement return status updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update procurement return status error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update procurement return status",
    });
  } finally {
    connection.release();
  }
};

exports.deleteProcurementReturn = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [returns] = await connection.query(
      `
        SELECT id, status
        FROM procurement_returns
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (returns.length === 0) {
      throw new Error("Procurement return not found");
    }

    if (returns[0].status === "closed") {
      throw new Error("Closed procurement return cannot be deleted");
    }

    await connection.query(
      `
        DELETE FROM procurement_return_items
        WHERE procurement_return_id = ?
      `,
      [id]
    );

    await connection.query(
      `
        DELETE FROM procurement_returns
        WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Procurement return deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete procurement return error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete procurement return",
    });
  } finally {
    connection.release();
  }
};
