const db = require("../config/db");

const generateGRNNumber = () => {
  return `GRN-${Date.now().toString().slice(-8)}`;
};

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
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

const buildWhereClause = (filters = {}) => {
  const conditions = [];
  const values = [];

  if (filters.search) {
    conditions.push(`
      (
        gr.grn_number LIKE ?
        OR po.po_number LIKE ?
        OR gr.invoice_number LIKE ?
        OR v.business_name LIKE ?
        OR w.name LIKE ?
      )
    `);

    const search = `%${filters.search}%`;
    values.push(search, search, search, search, search);
  }

  if (filters.status) {
    conditions.push("gr.status = ?");
    values.push(filters.status);
  }

  if (filters.vendor_id) {
    conditions.push("gr.vendor_id = ?");
    values.push(filters.vendor_id);
  }

  if (filters.warehouse_id) {
    conditions.push("gr.warehouse_id = ?");
    values.push(filters.warehouse_id);
  }

  if (filters.purchase_order_id) {
    conditions.push("gr.purchase_order_id = ?");
    values.push(filters.purchase_order_id);
  }

  if (filters.from_date) {
    conditions.push("gr.receipt_date >= ?");
    values.push(filters.from_date);
  }

  if (filters.to_date) {
    conditions.push("gr.receipt_date <= ?");
    values.push(filters.to_date);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

const updateInventoryForReceiptItem = async (
  connection,
  {
    warehouseId,
    productId,
    quantity,
    unitPrice,
    batchNo,
    expiryDate,
    receiptId,
    userId,
  }
) => {
  const qty = toNumber(quantity);
  const costPrice = toNumber(unitPrice);

  if (!warehouseId) {
    throw new Error("Warehouse is required for stock update");
  }

  if (!productId) {
    throw new Error("Product is required for stock update");
  }

  if (qty <= 0) {
    return;
  }

  const [existingInventories] = await connection.query(
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

  let newAvailableQty = qty;
  let newAverageCost = costPrice;

  if (existingInventories.length > 0) {
    const inventory = existingInventories[0];

    const oldQty = toNumber(inventory.available_qty);
    const oldAverageCost = toNumber(inventory.average_cost);

    newAvailableQty = oldQty + qty;

    if (newAvailableQty > 0) {
      newAverageCost = ((oldQty * oldAverageCost) + (qty * costPrice)) / newAvailableQty;
    }

    await connection.query(
      `
        UPDATE inventories
        SET
          available_qty = ?,
          average_cost = ?
        WHERE id = ?
      `,
      [newAvailableQty, newAverageCost, inventory.id]
    );
  } else {
    await connection.query(
      `
        INSERT INTO inventories
          (warehouse_id, product_id, variant_id, available_qty, reserved_qty, damaged_qty, average_cost)
        VALUES (?, ?, NULL, ?, 0, 0, ?)
      `,
      [warehouseId, productId, newAvailableQty, newAverageCost]
    );
  }

  let batchId = null;

  if (batchNo || expiryDate) {
    const finalBatchNo = batchNo || `BATCH-${Date.now().toString().slice(-8)}`;

    const [batchResult] = await connection.query(
      `
        INSERT INTO inventory_batches
          (warehouse_id, product_id, batch_no, manufacture_date, expiry_date, quantity, cost_price, status)
        VALUES (?, ?, ?, NULL, ?, ?, ?, 'active')
      `,
      [
        warehouseId,
        productId,
        finalBatchNo,
        cleanValue(expiryDate),
        qty,
        costPrice,
      ]
    );

    batchId = batchResult.insertId;

    if (expiryDate) {
      await connection.query(
        `
          INSERT INTO inventory_expiry
            (batch_id, product_id, warehouse_id, expiry_date, alert_date, status)
          VALUES (?, ?, ?, ?, ?, 'normal')
        `,
        [
          batchId,
          productId,
          warehouseId,
          expiryDate,
          getExpiryAlertDate(expiryDate),
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
      VALUES (?, ?, ?, 'in', ?, 'goods_receipt', ?, ?, ?)
    `,
    [
      warehouseId,
      productId,
      batchId,
      qty,
      receiptId,
      newAvailableQty,
      userId,
    ]
  );
};

const updatePurchaseOrderReceivedQty = async (
  connection,
  purchaseOrderId,
  productId,
  acceptedQty
) => {
  if (!purchaseOrderId || !productId || acceptedQty <= 0) return;

  const [poItems] = await connection.query(
    `
      SELECT id, quantity, received_quantity
      FROM purchase_order_items
      WHERE purchase_order_id = ?
        AND product_id = ?
      ORDER BY id ASC
    `,
    [purchaseOrderId, productId]
  );

  let remainingQty = toNumber(acceptedQty);

  for (const item of poItems) {
    if (remainingQty <= 0) break;

    const orderedQty = toNumber(item.quantity);
    const alreadyReceived = toNumber(item.received_quantity);
    const pendingQty = Math.max(orderedQty - alreadyReceived, 0);

    if (pendingQty <= 0) continue;

    const qtyToAdd = Math.min(pendingQty, remainingQty);
    const newReceivedQty = alreadyReceived + qtyToAdd;

    await connection.query(
      `
        UPDATE purchase_order_items
        SET received_quantity = ?
        WHERE id = ?
      `,
      [newReceivedQty, item.id]
    );

    remainingQty -= qtyToAdd;
  }
};

const updatePurchaseOrderStatus = async (connection, purchaseOrderId) => {
  if (!purchaseOrderId) return;

  const [rows] = await connection.query(
    `
      SELECT
        COALESCE(SUM(quantity), 0) AS ordered_qty,
        COALESCE(SUM(received_quantity), 0) AS received_qty
      FROM purchase_order_items
      WHERE purchase_order_id = ?
    `,
    [purchaseOrderId]
  );

  const orderedQty = toNumber(rows[0]?.ordered_qty);
  const receivedQty = toNumber(rows[0]?.received_qty);

  let status = "sent";

  if (receivedQty > 0 && receivedQty < orderedQty) {
    status = "partially_received";
  }

  if (orderedQty > 0 && receivedQty >= orderedQty) {
    status = "received";
  }

  if (receivedQty > 0) {
    await connection.query(
      `
        UPDATE purchase_orders
        SET status = ?
        WHERE id = ?
          AND status != 'cancelled'
      `,
      [status, purchaseOrderId]
    );
  }
};

const postGoodsReceiptToInventory = async (connection, receiptId, userId) => {
  const [receipts] = await connection.query(
    `
      SELECT
        id,
        purchase_order_id,
        vendor_id,
        warehouse_id,
        status
      FROM goods_receipts
      WHERE id = ?
      LIMIT 1
    `,
    [receiptId]
  );

  if (receipts.length === 0) {
    throw new Error("Goods receipt not found");
  }

  const receipt = receipts[0];

  if (receipt.status === "posted") {
    throw new Error("Goods receipt already posted");
  }

  if (receipt.status === "cancelled") {
    throw new Error("Cancelled goods receipt cannot be posted");
  }

  const [items] = await connection.query(
    `
      SELECT
        id,
        goods_receipt_id,
        product_id,
        batch_no,
        expiry_date,
        received_qty,
        accepted_qty,
        rejected_qty,
        unit_price
      FROM goods_receipt_items
      WHERE goods_receipt_id = ?
    `,
    [receiptId]
  );

  if (items.length === 0) {
    throw new Error("Goods receipt items not found");
  }

  for (const item of items) {
    const acceptedQty = toNumber(item.accepted_qty);

    await updateInventoryForReceiptItem(connection, {
      warehouseId: receipt.warehouse_id,
      productId: item.product_id,
      quantity: acceptedQty,
      unitPrice: item.unit_price,
      batchNo: item.batch_no,
      expiryDate: item.expiry_date,
      receiptId,
      userId,
    });

    await updatePurchaseOrderReceivedQty(
      connection,
      receipt.purchase_order_id,
      item.product_id,
      acceptedQty
    );
  }

  await updatePurchaseOrderStatus(connection, receipt.purchase_order_id);

  await connection.query(
    `
      UPDATE goods_receipts
      SET status = 'posted'
      WHERE id = ?
    `,
    [receiptId]
  );
};

exports.getGoodsReceipts = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      vendor_id = "",
      warehouse_id = "",
      purchase_order_id = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const { whereSql, values } = buildWhereClause({
      search: search.trim(),
      status,
      vendor_id,
      warehouse_id,
      purchase_order_id,
      from_date,
      to_date,
    });

    const [receipts] = await db.query(
      `
        SELECT
          gr.id,
          gr.grn_number,
          gr.purchase_order_id,
          po.po_number,
          gr.vendor_id,
          v.business_name AS vendor_name,
          gr.warehouse_id,
          w.name AS warehouse_name,
          gr.receipt_date,
          gr.invoice_number,
          gr.status,
          gr.remarks,
          gr.received_by,
          u.name AS received_by_name,
          gr.created_at,
          COUNT(gri.id) AS item_count,
          COALESCE(SUM(gri.received_qty), 0) AS total_received_qty,
          COALESCE(SUM(gri.accepted_qty), 0) AS total_accepted_qty,
          COALESCE(SUM(gri.rejected_qty), 0) AS total_rejected_qty
        FROM goods_receipts gr
        LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
        LEFT JOIN vendors v ON gr.vendor_id = v.id
        LEFT JOIN warehouses w ON gr.warehouse_id = w.id
        LEFT JOIN users u ON gr.received_by = u.id
        LEFT JOIN goods_receipt_items gri ON gr.id = gri.goods_receipt_id
        ${whereSql}
        GROUP BY gr.id
        ORDER BY gr.id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: receipts.length,
      goodsReceipts: receipts,
      goods_receipts: receipts,
    });
  } catch (error) {
    console.error("Get goods receipts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch goods receipts",
      error: error.message,
    });
  }
};

exports.getGoodsReceiptSummary = async (req, res) => {
  try {
    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total_goods_receipts,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified_count,
        SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) AS posted_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
      FROM goods_receipts
    `);

    const [qtyRows] = await db.query(`
      SELECT
        COALESCE(SUM(received_qty), 0) AS total_received_qty,
        COALESCE(SUM(accepted_qty), 0) AS total_accepted_qty,
        COALESCE(SUM(rejected_qty), 0) AS total_rejected_qty
      FROM goods_receipt_items
    `);

    res.json({
      success: true,
      summary: {
        ...(summaryRows[0] || {}),
        ...(qtyRows[0] || {}),
      },
    });
  } catch (error) {
    console.error("Get goods receipt summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch goods receipt summary",
      error: error.message,
    });
  }
};

exports.getGoodsReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const [receipts] = await db.query(
      `
        SELECT
          gr.id,
          gr.grn_number,
          gr.purchase_order_id,
          po.po_number,
          gr.vendor_id,
          v.business_name AS vendor_name,
          gr.warehouse_id,
          w.name AS warehouse_name,
          gr.receipt_date,
          gr.invoice_number,
          gr.status,
          gr.remarks,
          gr.received_by,
          u.name AS received_by_name,
          gr.created_at
        FROM goods_receipts gr
        LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
        LEFT JOIN vendors v ON gr.vendor_id = v.id
        LEFT JOIN warehouses w ON gr.warehouse_id = w.id
        LEFT JOIN users u ON gr.received_by = u.id
        WHERE gr.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (receipts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Goods receipt not found",
      });
    }

    const [items] = await db.query(
      `
        SELECT
          gri.id,
          gri.goods_receipt_id,
          gri.product_id,
          p.name AS product_name,
          p.product_code,
          p.sku,
          gri.batch_no,
          gri.expiry_date,
          gri.received_qty,
          gri.accepted_qty,
          gri.rejected_qty,
          gri.unit_price,
          (gri.accepted_qty * gri.unit_price) AS total_amount,
          gri.created_at
        FROM goods_receipt_items gri
        LEFT JOIN products p ON gri.product_id = p.id
        WHERE gri.goods_receipt_id = ?
        ORDER BY gri.id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      goodsReceipt: {
        ...receipts[0],
        items,
      },
      goods_receipt: {
        ...receipts[0],
        items,
      },
    });
  } catch (error) {
    console.error("Get goods receipt by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch goods receipt",
      error: error.message,
    });
  }
};

exports.createGoodsReceipt = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      purchase_order_id,
      vendor_id,
      warehouse_id,
      receipt_date,
      invoice_number,
      status = "posted",
      remarks,
      items = [],
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one receipt item is required",
      });
    }

    await connection.beginTransaction();

    let finalVendorId = cleanValue(vendor_id);
    let finalWarehouseId = cleanValue(warehouse_id);

    if (purchase_order_id) {
      const [purchaseOrders] = await connection.query(
        `
          SELECT id, vendor_id, warehouse_id, status
          FROM purchase_orders
          WHERE id = ?
          LIMIT 1
        `,
        [purchase_order_id]
      );

      if (purchaseOrders.length === 0) {
        throw new Error("Purchase order not found");
      }

      const po = purchaseOrders[0];

      if (po.status === "cancelled") {
        throw new Error("Cancelled purchase order cannot be received");
      }

      finalVendorId = finalVendorId || po.vendor_id;
      finalWarehouseId = finalWarehouseId || po.warehouse_id;
    }

    if (!finalVendorId) {
      throw new Error("Vendor is required");
    }

    if (!finalWarehouseId) {
      throw new Error("Warehouse is required");
    }

    const grnNumber = generateGRNNumber();
    const userId = getUserId(req);

    const [receiptResult] = await connection.query(
      `
        INSERT INTO goods_receipts
          (
            grn_number,
            purchase_order_id,
            vendor_id,
            warehouse_id,
            receipt_date,
            invoice_number,
            status,
            remarks,
            received_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        grnNumber,
        cleanValue(purchase_order_id),
        finalVendorId,
        finalWarehouseId,
        cleanValue(receipt_date) || new Date().toISOString().slice(0, 10),
        cleanValue(invoice_number),
        status === "posted" ? "draft" : cleanValue(status) || "draft",
        cleanValue(remarks),
        userId,
      ]
    );

    const receiptId = receiptResult.insertId;

    for (const item of items) {
      const productId = Number(item.product_id);
      const receivedQty = toNumber(item.received_qty ?? item.quantity);
      const rejectedQty = toNumber(item.rejected_qty);
      const acceptedQty = toNumber(
        item.accepted_qty,
        Math.max(receivedQty - rejectedQty, 0)
      );
      const unitPrice = toNumber(item.unit_price);

      if (!productId) {
        throw new Error("Product is required in receipt item");
      }

      if (receivedQty <= 0) {
        throw new Error("Received quantity must be greater than 0");
      }

      if (acceptedQty < 0 || rejectedQty < 0) {
        throw new Error("Accepted/rejected quantity cannot be negative");
      }

      if (acceptedQty + rejectedQty > receivedQty) {
        throw new Error("Accepted + rejected quantity cannot exceed received quantity");
      }

      await connection.query(
        `
          INSERT INTO goods_receipt_items
            (
              goods_receipt_id,
              product_id,
              batch_no,
              expiry_date,
              received_qty,
              accepted_qty,
              rejected_qty,
              unit_price
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          receiptId,
          productId,
          cleanValue(item.batch_no),
          cleanValue(item.expiry_date),
          receivedQty,
          acceptedQty,
          rejectedQty,
          unitPrice,
        ]
      );
    }

    if (status === "posted") {
      await postGoodsReceiptToInventory(connection, receiptId, userId);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message:
        status === "posted"
          ? "Goods receipt created and stock updated successfully"
          : "Goods receipt created successfully",
      goodsReceipt: {
        id: receiptId,
        grn_number: grnNumber,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create goods receipt error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create goods receipt",
    });
  } finally {
    connection.release();
  }
};

exports.verifyGoodsReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        UPDATE goods_receipts
        SET status = 'verified'
        WHERE id = ?
          AND status = 'draft'
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Only draft goods receipt can be verified",
      });
    }

    res.json({
      success: true,
      message: "Goods receipt verified successfully",
    });
  } catch (error) {
    console.error("Verify goods receipt error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to verify goods receipt",
      error: error.message,
    });
  }
};

exports.postGoodsReceipt = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const userId = getUserId(req);

    await connection.beginTransaction();

    await postGoodsReceiptToInventory(connection, id, userId);

    await connection.commit();

    res.json({
      success: true,
      message: "Goods receipt posted and stock updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Post goods receipt error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to post goods receipt",
    });
  } finally {
    connection.release();
  }
};

exports.cancelGoodsReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const [receipts] = await db.query(
      `
        SELECT id, status
        FROM goods_receipts
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (receipts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Goods receipt not found",
      });
    }

    if (receipts[0].status === "posted") {
      return res.status(400).json({
        success: false,
        message: "Posted goods receipt cannot be cancelled. Create stock adjustment instead.",
      });
    }

    await db.query(
      `
        UPDATE goods_receipts
        SET status = 'cancelled'
        WHERE id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Goods receipt cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel goods receipt error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel goods receipt",
      error: error.message,
    });
  }
};