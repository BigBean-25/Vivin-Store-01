const db = require("../config/db");

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const todayDate = () => {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
};

const generatePoNumber = () => {
  const now = new Date();
  const date = todayDate();
  const time = `${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `PO-${date}-${time}`;
};

const calculateItemsAndTotals = (items = []) => {
  let subtotal = 0;
  let taxAmount = 0;
  let totalAmount = 0;

  const calculatedItems = items.map((item) => {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price);
    const taxRate = toNumber(item.tax_rate);

    const lineSubtotal = quantity * unitPrice;
    const lineTax = (lineSubtotal * taxRate) / 100;
    const lineTotal = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    taxAmount += lineTax;
    totalAmount += lineTotal;

    return {
      product_id: item.product_id,
      quantity,
      received_quantity: toNumber(item.received_quantity),
      unit_price: unitPrice,
      tax_rate: taxRate,
      total_amount: Number(lineTotal.toFixed(2)),
    };
  });

  return {
    calculatedItems,
    subtotal: Number(subtotal.toFixed(2)),
    tax_amount: Number(taxAmount.toFixed(2)),
    total_amount: Number(totalAmount.toFixed(2)),
  };
};

const validatePoItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "At least one purchase order item is required";
  }

  for (const item of items) {
    if (!item.product_id) return "Product is required for all items";
    if (toNumber(item.quantity) <= 0) return "Quantity must be greater than 0";
    if (toNumber(item.unit_price) < 0) return "Unit price cannot be negative";
  }

  return null;
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      warehouse_id = "",
      status = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const where = [];
    const params = [];

    if (search) {
      where.push(`
        (
          po.po_number LIKE ?
          OR v.business_name LIKE ?
          OR v.contact_person LIKE ?
          OR w.name LIKE ?
          OR q.quotation_number LIKE ?
        )
      `);
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    if (vendor_id) {
      where.push("po.vendor_id = ?");
      params.push(vendor_id);
    }

    if (warehouse_id) {
      where.push("po.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (status) {
      where.push("po.status = ?");
      params.push(status);
    }

    if (from_date) {
      where.push("po.po_date >= ?");
      params.push(from_date);
    }

    if (to_date) {
      where.push("po.po_date <= ?");
      params.push(to_date);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [orders] = await db.query(
      `
      SELECT
        po.id,
        po.po_number,
        po.vendor_id,
        po.quotation_id,
        po.warehouse_id,
        po.po_date,
        po.expected_delivery_date,
        po.subtotal,
        po.tax_amount,
        po.total_amount,
        po.status,
        po.remarks,
        po.created_by,
        po.approved_by,
        po.created_at,
        po.updated_at,

        v.business_name AS vendor_name,
        v.contact_person AS vendor_contact_person,
        v.phone AS vendor_phone,
        v.email AS vendor_email,

        w.name AS warehouse_name,
        q.quotation_number,

        COALESCE(item_summary.item_count, 0) AS item_count,
        COALESCE(item_summary.total_quantity, 0) AS total_quantity,
        COALESCE(item_summary.total_received_quantity, 0) AS total_received_quantity
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN warehouses w ON w.id = po.warehouse_id
      LEFT JOIN quotations q ON q.id = po.quotation_id
      LEFT JOIN (
        SELECT
          purchase_order_id,
          COUNT(*) AS item_count,
          SUM(quantity) AS total_quantity,
          SUM(received_quantity) AS total_received_quantity
        FROM purchase_order_items
        GROUP BY purchase_order_id
      ) item_summary ON item_summary.purchase_order_id = po.id
      ${whereSql}
      ORDER BY po.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get purchase orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase orders",
      error: error.message,
    });
  }
};

exports.getPurchaseOrderSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_orders,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending_approval_orders,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_orders,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_orders,
        SUM(CASE WHEN status = 'partially_received' THEN 1 ELSE 0 END) AS partially_received_orders,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) AS received_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
        COALESCE(SUM(total_amount), 0) AS total_purchase_value,
        COALESCE(SUM(tax_amount), 0) AS total_tax_value
      FROM purchase_orders
    `);

    res.json({
      success: true,
      summary: rows[0],
    });
  } catch (error) {
    console.error("Get purchase order summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase order summary",
      error: error.message,
    });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await db.query(
      `
      SELECT
        po.*,
        v.business_name AS vendor_name,
        v.contact_person AS vendor_contact_person,
        v.phone AS vendor_phone,
        v.email AS vendor_email,
        w.name AS warehouse_name,
        q.quotation_number
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN warehouses w ON w.id = po.warehouse_id
      LEFT JOIN quotations q ON q.id = po.quotation_id
      WHERE po.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    const [items] = await db.query(
      `
      SELECT
        poi.id,
        poi.purchase_order_id,
        poi.product_id,
        poi.quantity,
        poi.received_quantity,
        poi.unit_price,
        poi.tax_rate,
        poi.total_amount,
        poi.created_at,
        p.name AS product_name,
        p.sku,
        p.hsn_code,
        p.barcode,
        u.name AS unit_name,
        u.short_name AS unit_short_name
      FROM purchase_order_items poi
      LEFT JOIN products p ON p.id = poi.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      order: {
        ...orders[0],
        items,
      },
    });
  } catch (error) {
    console.error("Get purchase order by id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase order",
      error: error.message,
    });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      po_number,
      vendor_id,
      quotation_id = null,
      warehouse_id = null,
      po_date = null,
      expected_delivery_date = null,
      status = "draft",
      remarks = "",
      items = [],
    } = req.body;

    if (!vendor_id) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    const itemError = validatePoItems(items);
    if (itemError) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: itemError,
      });
    }

    const totals = calculateItemsAndTotals(items);
    const finalPoNumber = po_number || generatePoNumber();
    const createdBy = req.user?.id || null;

    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      `
      INSERT INTO purchase_orders
      (
        po_number,
        vendor_id,
        quotation_id,
        warehouse_id,
        po_date,
        expected_delivery_date,
        subtotal,
        tax_amount,
        total_amount,
        status,
        remarks,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalPoNumber,
        vendor_id,
        quotation_id || null,
        warehouse_id || null,
        po_date || new Date().toISOString().slice(0, 10),
        expected_delivery_date || null,
        totals.subtotal,
        totals.tax_amount,
        totals.total_amount,
        status,
        remarks || null,
        createdBy,
      ]
    );

    const purchaseOrderId = orderResult.insertId;

    for (const item of totals.calculatedItems) {
      await connection.query(
        `
        INSERT INTO purchase_order_items
        (
          purchase_order_id,
          product_id,
          quantity,
          received_quantity,
          unit_price,
          tax_rate,
          total_amount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          purchaseOrderId,
          item.product_id,
          item.quantity,
          item.received_quantity,
          item.unit_price,
          item.tax_rate,
          item.total_amount,
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      order_id: purchaseOrderId,
      po_number: finalPoNumber,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create purchase order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create purchase order",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const {
      vendor_id,
      quotation_id,
      warehouse_id,
      po_date,
      expected_delivery_date,
      status,
      remarks,
      items,
    } = req.body;

    const [existing] = await connection.query(
      "SELECT id FROM purchase_orders WHERE id = ? LIMIT 1",
      [id]
    );

    if (!existing.length) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    let totals = null;

    if (Array.isArray(items)) {
      const itemError = validatePoItems(items);
      if (itemError) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: itemError,
        });
      }

      totals = calculateItemsAndTotals(items);
    }

    await connection.beginTransaction();

    const updateFields = [];
    const updateParams = [];

    if (vendor_id !== undefined) {
      updateFields.push("vendor_id = ?");
      updateParams.push(vendor_id);
    }

    if (quotation_id !== undefined) {
      updateFields.push("quotation_id = ?");
      updateParams.push(quotation_id || null);
    }

    if (warehouse_id !== undefined) {
      updateFields.push("warehouse_id = ?");
      updateParams.push(warehouse_id || null);
    }

    if (po_date !== undefined) {
      updateFields.push("po_date = ?");
      updateParams.push(po_date || null);
    }

    if (expected_delivery_date !== undefined) {
      updateFields.push("expected_delivery_date = ?");
      updateParams.push(expected_delivery_date || null);
    }

    if (status !== undefined) {
      updateFields.push("status = ?");
      updateParams.push(status);
    }

    if (remarks !== undefined) {
      updateFields.push("remarks = ?");
      updateParams.push(remarks || null);
    }

    if (totals) {
      updateFields.push("subtotal = ?");
      updateFields.push("tax_amount = ?");
      updateFields.push("total_amount = ?");
      updateParams.push(totals.subtotal, totals.tax_amount, totals.total_amount);
    }

    if (updateFields.length) {
      updateParams.push(id);

      await connection.query(
        `
        UPDATE purchase_orders
        SET ${updateFields.join(", ")}
        WHERE id = ?
        `,
        updateParams
      );
    }

    if (totals) {
      await connection.query(
        "DELETE FROM purchase_order_items WHERE purchase_order_id = ?",
        [id]
      );

      for (const item of totals.calculatedItems) {
        await connection.query(
          `
          INSERT INTO purchase_order_items
          (
            purchase_order_id,
            product_id,
            quantity,
            received_quantity,
            unit_price,
            tax_rate,
            total_amount
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            id,
            item.product_id,
            item.quantity,
            item.received_quantity,
            item.unit_price,
            item.tax_rate,
            item.total_amount,
          ]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Purchase order updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update purchase order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update purchase order",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by = null } = req.body;

    const allowedStatus = [
      "draft",
      "pending_approval",
      "approved",
      "sent",
      "partially_received",
      "received",
      "cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase order status",
      });
    }

    const approvedBy = approved_by || req.user?.id || null;

    const [result] = await db.query(
      `
      UPDATE purchase_orders
      SET status = ?,
          approved_by = CASE WHEN ? = 'approved' THEN ? ELSE approved_by END
      WHERE id = ?
      `,
      [status, status, approvedBy, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order status updated successfully",
    });
  } catch (error) {
    console.error("Update purchase order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update purchase order status",
      error: error.message,
    });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE purchase_orders
      SET status = 'cancelled'
      WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order cancelled successfully",
    });
  } catch (error) {
    console.error("Delete purchase order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel purchase order",
      error: error.message,
    });
  }
};