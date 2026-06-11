const db = require("../config/db");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const generateOrderNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  return `ORD-${date}-${time}`;
};

const calcItems = (items = []) => {
  let subtotal = 0;
  let taxAmount = 0;

  const rows = items.map((item) => {
    const qty = toNum(item.quantity);
    const price = toNum(item.unit_price);
    const rate = toNum(item.tax_rate);
    const lineSub = qty * price;
    const lineTax = (lineSub * rate) / 100;
    subtotal += lineSub;
    taxAmount += lineTax;
    return {
      ...item,
      quantity: qty,
      unit_price: price,
      tax_rate: rate,
      total_amount: Number((lineSub + lineTax).toFixed(2)),
    };
  });

  return {
    rows,
    subtotal: Number(subtotal.toFixed(2)),
    tax_amount: Number(taxAmount.toFixed(2)),
  };
};

exports.getSummary = async (req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT
        COUNT(*) AS total_orders,
        SUM(order_status = 'pending')    AS pending,
        SUM(order_status = 'confirmed')  AS confirmed,
        SUM(order_status = 'processing') AS processing,
        SUM(order_status = 'packed')     AS packed,
        SUM(order_status = 'dispatched') AS dispatched,
        SUM(order_status = 'delivered')  AS delivered,
        SUM(order_status = 'cancelled')  AS cancelled,
        SUM(order_status = 'returned')   AS returned,
        SUM(payment_status = 'paid')     AS paid_orders,
        SUM(payment_status = 'pending')  AS unpaid_orders,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN order_status NOT IN ('cancelled','returned') THEN total_amount ELSE 0 END), 0) AS active_revenue
      FROM orders
    `);

    res.json({
      success: true,
      summary: {
        total_orders: Number(row.total_orders),
        pending: Number(row.pending),
        confirmed: Number(row.confirmed),
        processing: Number(row.processing),
        packed: Number(row.packed),
        dispatched: Number(row.dispatched),
        delivered: Number(row.delivered),
        cancelled: Number(row.cancelled),
        returned: Number(row.returned),
        paid_orders: Number(row.paid_orders),
        unpaid_orders: Number(row.unpaid_orders),
        total_revenue: Number(row.total_revenue),
        active_revenue: Number(row.active_revenue),
      },
    });
  } catch (error) {
    console.error("Get order summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order summary", error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const {
      order_status = "",
      payment_status = "",
      from_date = "",
      to_date = "",
      search = "",
    } = req.query;

    const where = [];
    const params = [];

    if (order_status) { where.push("o.order_status = ?"); params.push(order_status); }
    if (payment_status) { where.push("o.payment_status = ?"); params.push(payment_status); }
    if (from_date) { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date) { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }
    if (search) {
      where.push("(o.order_number LIKE ? OR c.business_name LIKE ? OR c.customer_code LIKE ?)");
      const kw = `%${search}%`;
      params.push(kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [orders] = await db.query(
      `
      SELECT
        o.id,
        o.order_number,
        o.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        c.phone AS customer_phone,
        o.source_type,
        o.order_date,
        o.delivery_date,
        o.subtotal,
        o.discount_amount,
        o.tax_amount,
        o.shipping_amount,
        o.total_amount,
        o.payment_status,
        o.order_status,
        o.remarks,
        o.created_at,
        o.updated_at,
        COALESCE(oi_agg.item_count, 0) AS item_count
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN (
        SELECT order_id, COUNT(*) AS item_count
        FROM order_items
        GROUP BY order_id
      ) oi_agg ON oi_agg.order_id = o.id
      ${whereSql}
      ORDER BY o.id DESC
      `,
      params
    );

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await db.query(
      `
      SELECT
        o.*,
        c.business_name AS customer_name,
        c.customer_code,
        c.phone AS customer_phone,
        c.email AS customer_email
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
      `,
      [id]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const [items] = await db.query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.variant_id,
        oi.source_type,
        oi.source_id,
        oi.quantity,
        oi.unit_price,
        oi.tax_rate,
        oi.total_amount,
        oi.fulfillment_status,
        oi.created_at,
        p.name AS product_name,
        p.sku
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [id]
    );

    const [history] = await db.query(
      `
      SELECT
        osh.id,
        osh.order_id,
        osh.old_status,
        osh.new_status,
        osh.remarks,
        osh.changed_at,
        u.name AS changed_by_name
      FROM order_status_history osh
      LEFT JOIN users u ON u.id = osh.changed_by
      WHERE osh.order_id = ?
      ORDER BY osh.changed_at DESC
      `,
      [id]
    );

    res.json({ success: true, order: { ...order, items, history } });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order", error: error.message });
  }
};

exports.createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      customer_id,
      source_type,
      order_date,
      delivery_date,
      discount_amount,
      shipping_amount,
      billing_address,
      shipping_address,
      remarks,
      items = [],
    } = req.body;

    if (!customer_id) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "Customer is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "At least one order item is required" });
    }

    for (const item of items) {
      if (!item.product_id) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Product is required for all items" });
      }
      if (toNum(item.quantity) <= 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Quantity must be greater than 0 for all items" });
      }
      if (toNum(item.unit_price) < 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: "Unit price cannot be negative" });
      }
    }

    const { rows: calcRows, subtotal, tax_amount } = calcItems(items);
    const discount = toNum(discount_amount);
    const shipping = toNum(shipping_amount);
    const total_amount = Number((subtotal + tax_amount - discount + shipping).toFixed(2));

    const order_number = generateOrderNumber();

    const [result] = await conn.query(
      `
      INSERT INTO orders (
        order_number, customer_id, source_type, order_date, delivery_date,
        subtotal, discount_amount, tax_amount, shipping_amount, total_amount,
        payment_status, order_status, billing_address, shipping_address, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)
      `,
      [
        order_number,
        customer_id,
        source_type || "warehouse",
        order_date || new Date(),
        delivery_date || null,
        subtotal,
        discount,
        tax_amount,
        shipping,
        total_amount,
        billing_address || null,
        shipping_address || null,
        remarks || null,
      ]
    );

    const orderId = result.insertId;

    for (const item of calcRows) {
      await conn.query(
        `
        INSERT INTO order_items (
          order_id, product_id, variant_id, source_type, source_id,
          quantity, unit_price, tax_rate, total_amount, fulfillment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `,
        [
          orderId,
          item.product_id,
          item.variant_id || null,
          item.source_type || "warehouse",
          item.source_id || null,
          item.quantity,
          item.unit_price,
          item.tax_rate,
          item.total_amount,
        ]
      );
    }

    await conn.query(
      `
      INSERT INTO order_status_history (order_id, old_status, new_status, remarks, changed_by)
      VALUES (?, NULL, 'pending', 'Order created', ?)
      `,
      [orderId, req.user?.id || null]
    );

    await conn.commit();
    conn.release();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order_id: orderId,
      order_number,
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delivery_date,
      discount_amount,
      shipping_amount,
      billing_address,
      shipping_address,
      remarks,
    } = req.body;

    const [[existing]] = await db.query(
      "SELECT order_status, subtotal, tax_amount FROM orders WHERE id = ?",
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!["pending", "confirmed"].includes(existing.order_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit order with status '${existing.order_status}'. Only pending or confirmed orders can be edited.`,
      });
    }

    const discount = toNum(discount_amount);
    const shipping = toNum(shipping_amount);
    const total_amount = Number(
      (toNum(existing.subtotal) + toNum(existing.tax_amount) - discount + shipping).toFixed(2)
    );

    await db.query(
      `
      UPDATE orders
      SET delivery_date = ?, discount_amount = ?, shipping_amount = ?, total_amount = ?,
          billing_address = ?, shipping_address = ?, remarks = ?
      WHERE id = ?
      `,
      [
        delivery_date || null,
        discount,
        shipping,
        total_amount,
        billing_address || null,
        shipping_address || null,
        remarks || null,
        id,
      ]
    );

    res.json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ success: false, message: "Failed to update order", error: error.message });
  }
};

const VALID_TRANSITIONS = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed:     ["dispatched", "cancelled"],
  dispatched: ["delivered"],
  delivered:  [],
  cancelled:  [],
  returned:   [],
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, remarks } = req.body;

    const validStatuses = Object.keys(VALID_TRANSITIONS);

    if (!order_status || !validStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: `Valid order_status required. One of: ${validStatuses.join(", ")}`,
      });
    }

    const [[existing]] = await db.query(
      "SELECT order_status FROM orders WHERE id = ?",
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const allowed = VALID_TRANSITIONS[existing.order_status] || [];
    if (!allowed.includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from '${existing.order_status}' to '${order_status}'. Allowed: ${allowed.join(", ") || "none"}`,
      });
    }

    await db.query("UPDATE orders SET order_status = ? WHERE id = ?", [order_status, id]);

    await db.query(
      `
      INSERT INTO order_status_history (order_id, old_status, new_status, remarks, changed_by)
      VALUES (?, ?, ?, ?, ?)
      `,
      [id, existing.order_status, order_status, remarks || null, req.user?.id || null]
    );

    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ success: false, message: "Failed to update order status", error: error.message });
  }
};

const generatePaymentNumber = () => {
  const now = new Date();
  return `PAY-${now.toISOString().slice(0, 10).replace(/-/g, "")}${String(now.getTime()).slice(-5)}`;
};

exports.getOrderPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const [[order]] = await db.query("SELECT id, total_amount, payment_status FROM orders WHERE id = ?", [id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const [payments] = await db.query(
      `SELECT id, payment_number, payment_date, amount, transaction_reference, status, remarks, created_at
       FROM payments WHERE order_id = ? ORDER BY id DESC`,
      [id]
    );

    const [[paidRow]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM payments WHERE order_id = ? AND status = 'success'`,
      [id]
    );
    const paid_amount = toNum(paidRow.paid_amount);
    const total_amount = toNum(order.total_amount);

    res.json({
      success: true,
      payments,
      paid_amount,
      balance_amount: Math.max(0, total_amount - paid_amount),
      total_amount,
      payment_status: order.payment_status,
    });
  } catch (error) {
    console.error("Get order payments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payments", error: error.message });
  }
};

exports.createOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, transaction_reference, remarks } = req.body;

    const [[order]] = await db.query("SELECT id, total_amount, customer_id FROM orders WHERE id = ?", [id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const amt = toNum(amount);
    if (amt <= 0) return res.status(400).json({ success: false, message: "Payment amount must be greater than 0" });

    const [[paidRow]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE order_id = ? AND status = 'success'`,
      [id]
    );
    const paidSoFar = toNum(paidRow.paid);
    const balance = toNum(order.total_amount) - paidSoFar;

    if (amt > balance + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment ₹${amt.toFixed(2)} exceeds balance ₹${balance.toFixed(2)}`,
      });
    }

    const payment_number = generatePaymentNumber();
    await db.query(
      `INSERT INTO payments (payment_number, order_id, customer_id, payment_date, amount, transaction_reference, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, 'success', ?)`,
      [payment_number, id, order.customer_id, payment_date || new Date().toISOString().slice(0, 10), amt, transaction_reference || null, remarks || null]
    );

    const [[newPaidRow]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE order_id = ? AND status = 'success'`,
      [id]
    );
    const newPaid = toNum(newPaidRow.paid);
    const total = toNum(order.total_amount);
    const newPaymentStatus = newPaid >= total - 0.01 ? "paid" : newPaid > 0 ? "partial" : "pending";
    await db.query("UPDATE orders SET payment_status = ? WHERE id = ?", [newPaymentStatus, id]);

    res.status(201).json({
      success: true,
      message: "Payment recorded",
      payment_number,
      new_payment_status: newPaymentStatus,
    });
  } catch (error) {
    console.error("Add order payment error:", error);
    res.status(500).json({ success: false, message: "Failed to record payment", error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [[existing]] = await db.query(
      "SELECT order_status FROM orders WHERE id = ?",
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!["pending", "cancelled"].includes(existing.order_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete order with status '${existing.order_status}'. Only pending or cancelled orders can be deleted.`,
      });
    }

    const [[inv]] = await db.query(
      "SELECT id FROM invoices WHERE order_id = ? LIMIT 1",
      [id]
    );

    if (inv) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete order: an invoice is linked to this order.",
      });
    }

    await db.query("DELETE FROM order_items WHERE order_id = ?", [id]);
    await db.query("DELETE FROM order_status_history WHERE order_id = ?", [id]);
    await db.query("DELETE FROM orders WHERE id = ?", [id]);

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ success: false, message: "Failed to delete order", error: error.message });
  }
};

// ─── Invoice helpers ──────────────────────────────────────────────────────────
const generateInvoiceNumber = () => {
  const now = new Date();
  return `INV-${now.toISOString().slice(0, 10).replace(/-/g, "")}${String(now.getTime()).slice(-5)}`;
};

exports.getOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const [[invoice]] = await db.query(
      `SELECT i.*, c.business_name AS customer_name
       FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.order_id = ? AND i.invoice_type = 'sales' ORDER BY i.id DESC LIMIT 1`,
      [id]
    );
    if (!invoice) return res.json({ success: true, invoice: null });
    const [items] = await db.query(
      `SELECT ii.*, p.name AS product_name FROM invoice_items ii
       LEFT JOIN products p ON p.id = ii.product_id WHERE ii.invoice_id = ?`,
      [invoice.id]
    );
    res.json({ success: true, invoice: { ...invoice, items } });
  } catch (error) {
    console.error("Get order invoice error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoice", error: error.message });
  }
};

exports.generateOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query(
      "SELECT id, invoice_number FROM invoices WHERE order_id = ? AND invoice_type = 'sales' LIMIT 1",
      [id]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: `Invoice ${existing.invoice_number} already exists for this order.` });
    }
    const [[order]] = await db.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (["cancelled", "returned"].includes(order.order_status)) {
      return res.status(400).json({ success: false, message: `Cannot generate invoice for ${order.order_status} order.` });
    }
    const [items] = await db.query(
      `SELECT oi.*, p.name AS product_name, p.hsn_code FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
      [id]
    );
    const invoice_number = generateInvoiceNumber();
    const invoice_date = new Date().toISOString().slice(0, 10);
    const [result] = await db.query(
      `INSERT INTO invoices (invoice_number, invoice_type, order_id, customer_id, invoice_date,
         subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, status)
       VALUES (?, 'sales', ?, ?, ?, ?, ?, ?, ?, 0, ?, 'draft')`,
      [invoice_number, id, order.customer_id, invoice_date,
        order.subtotal, order.discount_amount, order.tax_amount, order.total_amount, order.total_amount]
    );
    const invoiceId = result.insertId;
    for (const item of items) {
      const taxable = toNum(item.quantity) * toNum(item.unit_price);
      const taxAmt = (taxable * toNum(item.tax_rate)) / 100;
      await db.query(
        `INSERT INTO invoice_items (invoice_id, product_id, description, hsn_code, quantity, unit_price,
           taxable_amount, tax_rate, tax_amount, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.product_id, item.product_name, item.hsn_code || null,
          item.quantity, item.unit_price,
          Number(taxable.toFixed(2)), item.tax_rate,
          Number(taxAmt.toFixed(2)), Number((taxable + taxAmt).toFixed(2))]
      );
    }
    res.status(201).json({ success: true, message: "Invoice generated", invoice_number, invoice_id: invoiceId });
  } catch (error) {
    console.error("Generate invoice error:", error);
    res.status(500).json({ success: false, message: "Failed to generate invoice", error: error.message });
  }
};

// ─── Delivery ─────────────────────────────────────────────────────────────────
const generateDeliveryNumber = () => {
  const now = new Date();
  return `DEL-${now.toISOString().slice(0, 10).replace(/-/g, "")}${String(now.getTime()).slice(-5)}`;
};

exports.getOrderDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const [[delivery]] = await db.query(
      `SELECT d.*, dd.name AS driver_name, dd.phone AS driver_phone
       FROM deliveries d LEFT JOIN delivery_drivers dd ON dd.id = d.driver_id
       WHERE d.order_id = ? ORDER BY d.id DESC LIMIT 1`,
      [id]
    );
    res.json({ success: true, delivery: delivery || null });
  } catch (error) {
    console.error("Get delivery error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch delivery", error: error.message });
  }
};

exports.dispatchOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_address, delivery_date, driver_id, pickup_address } = req.body;
    const [[order]] = await db.query(
      "SELECT id, order_status, customer_id, shipping_address FROM orders WHERE id = ?", [id]
    );
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.order_status !== "packed") {
      return res.status(400).json({ success: false, message: `Order must be 'packed' to dispatch. Current: '${order.order_status}'` });
    }
    const [[existing]] = await db.query("SELECT id FROM deliveries WHERE order_id = ? LIMIT 1", [id]);
    if (existing) return res.status(400).json({ success: false, message: "Delivery already created for this order." });
    const delivery_number = generateDeliveryNumber();
    const [result] = await db.query(
      `INSERT INTO deliveries (delivery_number, order_id, customer_id, driver_id, pickup_address, delivery_address, delivery_date, delivery_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [delivery_number, id, order.customer_id, driver_id || null, pickup_address || null,
        delivery_address || order.shipping_address || null, delivery_date || null]
    );
    await db.query("UPDATE orders SET order_status = 'dispatched' WHERE id = ?", [id]);
    await db.query(
      "INSERT INTO order_status_history (order_id, old_status, new_status, remarks, changed_by) VALUES (?, 'packed', 'dispatched', 'Dispatched via delivery creation', ?)",
      [id, req.user?.id || null]
    );
    res.status(201).json({ success: true, message: "Order dispatched", delivery_number, delivery_id: result.insertId });
  } catch (error) {
    console.error("Dispatch order error:", error);
    res.status(500).json({ success: false, message: "Failed to dispatch order", error: error.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_status, remarks } = req.body;
    const validStatuses = ["pending", "assigned", "picked", "in_transit", "delivered", "failed", "cancelled"];
    if (!delivery_status || !validStatuses.includes(delivery_status)) {
      return res.status(400).json({ success: false, message: `Valid delivery_status required: ${validStatuses.join(", ")}` });
    }
    const [[delivery]] = await db.query(
      "SELECT id, delivery_status FROM deliveries WHERE order_id = ? ORDER BY id DESC LIMIT 1", [id]
    );
    if (!delivery) return res.status(404).json({ success: false, message: "No delivery found for this order." });
    await db.query("UPDATE deliveries SET delivery_status = ? WHERE id = ?", [delivery_status, delivery.id]);
    await db.query(
      "INSERT INTO delivery_status_logs (delivery_id, old_status, new_status, remarks, changed_by) VALUES (?, ?, ?, ?, ?)",
      [delivery.id, delivery.delivery_status, delivery_status, remarks || null, req.user?.id || null]
    );
    if (delivery_status === "delivered") {
      const [[order]] = await db.query("SELECT order_status FROM orders WHERE id = ?", [id]);
      if (order && order.order_status === "dispatched") {
        await db.query("UPDATE orders SET order_status = 'delivered' WHERE id = ?", [id]);
        await db.query(
          "INSERT INTO order_status_history (order_id, old_status, new_status, remarks, changed_by) VALUES (?, 'dispatched', 'delivered', 'Auto: Marked delivered via delivery', ?)",
          [id, req.user?.id || null]
        );
      }
    }
    res.json({ success: true, message: "Delivery status updated" });
  } catch (error) {
    console.error("Update delivery status error:", error);
    res.status(500).json({ success: false, message: "Failed to update delivery status", error: error.message });
  }
};

// ─── Returns ──────────────────────────────────────────────────────────────────
const generateReturnNumber = () => {
  const now = new Date();
  return `RET-${now.toISOString().slice(0, 10).replace(/-/g, "")}${String(now.getTime()).slice(-5)}`;
};

exports.getOrderReturns = async (req, res) => {
  try {
    const { id } = req.params;
    const [returns] = await db.query(
      "SELECT * FROM returns WHERE order_id = ? ORDER BY id DESC", [id]
    );
    res.json({ success: true, returns });
  } catch (error) {
    console.error("Get returns error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch returns", error: error.message });
  }
};

exports.createOrderReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, items } = req.body;
    const [[order]] = await db.query("SELECT id, order_status, customer_id FROM orders WHERE id = ?", [id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.order_status !== "delivered") {
      return res.status(400).json({ success: false, message: `Return only allowed for delivered orders. Current: '${order.order_status}'` });
    }
    const return_number = generateReturnNumber();
    const [result] = await db.query(
      "INSERT INTO returns (return_number, order_id, customer_id, return_date, reason, status) VALUES (?, ?, ?, ?, ?, 'requested')",
      [return_number, id, order.customer_id, new Date().toISOString().slice(0, 10), reason || null]
    );
    const returnId = result.insertId;
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.order_item_id && item.product_id && item.quantity) {
          await db.query(
            "INSERT INTO return_items (return_id, order_item_id, product_id, quantity, reason) VALUES (?, ?, ?, ?, ?)",
            [returnId, item.order_item_id, item.product_id, item.quantity, item.reason || null]
          );
        }
      }
    }
    await db.query("UPDATE orders SET order_status = 'returned' WHERE id = ?", [id]);
    await db.query(
      "INSERT INTO order_status_history (order_id, old_status, new_status, remarks, changed_by) VALUES (?, 'delivered', 'returned', ?, ?)",
      [id, reason || "Return requested", req.user?.id || null]
    );
    res.status(201).json({ success: true, message: "Return created", return_number, return_id: returnId });
  } catch (error) {
    console.error("Create return error:", error);
    res.status(500).json({ success: false, message: "Failed to create return", error: error.message });
  }
};
