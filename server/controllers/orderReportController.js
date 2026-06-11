const db = require("../config/db");

const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

exports.getReportSummary = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = [];
    const params = [];
    if (from_date) { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }
    const w = where.length ? "WHERE " + where.join(" AND ") : "";

    const [[summary]] = await db.query(`
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN o.order_status = 'delivered'  THEN 1 ELSE 0 END) AS delivered_orders,
        SUM(CASE WHEN o.order_status = 'cancelled'  THEN 1 ELSE 0 END) AS cancelled_orders,
        SUM(CASE WHEN o.order_status = 'returned'   THEN 1 ELSE 0 END) AS returned_orders,
        SUM(CASE WHEN o.order_status NOT IN('cancelled','returned') THEN o.total_amount ELSE 0 END) AS active_revenue,
        SUM(CASE WHEN o.payment_status = 'paid'     THEN o.total_amount ELSE 0 END) AS paid_revenue,
        SUM(CASE WHEN o.payment_status = 'pending'  THEN o.total_amount ELSE 0 END) AS unpaid_revenue,
        SUM(CASE WHEN o.payment_status = 'partial'  THEN o.total_amount ELSE 0 END) AS partial_revenue
      FROM orders o ${w}
    `, params);

    const pw = where.map(c => c.replace(/o\.order_date/g, "p.payment_date")).join(" AND ");
    const [[paySummary]] = await db.query(`
      SELECT COALESCE(SUM(p.amount), 0) AS total_collected
      FROM payments p
      ${pw ? "WHERE p.status = 'success' AND " + pw : "WHERE p.status = 'success'"}
    `, params);

    res.json({ success: true, summary: { ...summary, total_collected: toNum(paySummary?.total_collected) } });
  } catch (error) {
    console.error("Report summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch summary", error: error.message });
  }
};

exports.getOrdersReport = async (req, res) => {
  try {
    const { from_date, to_date, order_status, payment_status } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date)      { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date)        { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }
    if (order_status)   { where.push("o.order_status = ?");      params.push(order_status); }
    if (payment_status) { where.push("o.payment_status = ?");    params.push(payment_status); }

    const [orders] = await db.query(`
      SELECT o.id, o.order_number, c.business_name AS customer_name, c.customer_code,
             o.order_date, o.order_status, o.payment_status,
             o.subtotal, o.tax_amount, o.discount_amount, o.shipping_amount, o.total_amount
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE ${where.join(" AND ")}
      ORDER BY o.id DESC
    `, params);

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch orders report", error: error.message });
  }
};

exports.getItemsReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["o.order_status NOT IN('cancelled','returned')"];
    const params = [];
    if (from_date) { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }

    const [items] = await db.query(`
      SELECT p.name AS product_name, p.sku,
             SUM(oi.quantity)     AS total_qty,
             SUM(oi.total_amount) AS total_revenue,
             COUNT(DISTINCT oi.order_id) AS order_count
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN orders o   ON o.id = oi.order_id
      WHERE ${where.join(" AND ")}
      GROUP BY oi.product_id
      ORDER BY total_revenue DESC
    `, params);

    res.json({ success: true, count: items.length, items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch items report", error: error.message });
  }
};

exports.getPaymentsReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["p.status = 'success'"];
    const params = [];
    if (from_date) { where.push("p.payment_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("p.payment_date <= ?"); params.push(to_date); }

    const [payments] = await db.query(`
      SELECT p.id, p.payment_number, p.payment_date, p.amount, p.transaction_reference,
             o.order_number, c.business_name AS customer_name
      FROM payments p
      LEFT JOIN orders o    ON o.id = p.order_id
      LEFT JOIN customers c ON c.id = p.customer_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.id DESC
    `, params);

    const [[totals]] = await db.query(
      `SELECT COALESCE(SUM(p.amount), 0) AS total_collected FROM payments p WHERE ${where.join(" AND ")}`,
      params
    );

    res.json({ success: true, count: payments.length, payments, total_collected: toNum(totals?.total_collected) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch payments report", error: error.message });
  }
};

exports.getInvoicesReport = async (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;
    const where = ["i.invoice_type = 'sales'", "i.order_id IS NOT NULL"];
    const params = [];
    if (from_date) { where.push("i.invoice_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("i.invoice_date <= ?"); params.push(to_date); }
    if (status)    { where.push("i.status = ?");        params.push(status); }

    const [invoices] = await db.query(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.subtotal, i.tax_amount,
             i.total_amount, i.paid_amount, i.balance_amount, i.status,
             o.order_number, c.business_name AS customer_name
      FROM invoices i
      LEFT JOIN orders o    ON o.id = i.order_id
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.id DESC
    `, params);

    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch invoices report", error: error.message });
  }
};

exports.getDeliveryReport = async (req, res) => {
  try {
    const { from_date, to_date, delivery_status } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date)       { where.push("DATE(d.created_at) >= ?"); params.push(from_date); }
    if (to_date)         { where.push("DATE(d.created_at) <= ?"); params.push(to_date); }
    if (delivery_status) { where.push("d.delivery_status = ?");   params.push(delivery_status); }

    const [deliveries] = await db.query(`
      SELECT d.id, d.delivery_number, d.delivery_date, d.delivery_status,
             o.order_number, c.business_name AS customer_name, dd.name AS driver_name
      FROM deliveries d
      LEFT JOIN orders o          ON o.id  = d.order_id
      LEFT JOIN customers c       ON c.id  = d.customer_id
      LEFT JOIN delivery_drivers dd ON dd.id = d.driver_id
      WHERE ${where.join(" AND ")}
      ORDER BY d.id DESC
    `, params);

    res.json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch delivery report", error: error.message });
  }
};

exports.getReturnsReport = async (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("r.return_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("r.return_date <= ?"); params.push(to_date); }
    if (status)    { where.push("r.status = ?");       params.push(status); }

    const [returns] = await db.query(`
      SELECT r.id, r.return_number, r.return_date, r.reason, r.status,
             o.order_number, c.business_name AS customer_name
      FROM returns r
      LEFT JOIN orders o    ON o.id = r.order_id
      LEFT JOIN customers c ON c.id = r.customer_id
      WHERE ${where.join(" AND ")}
      ORDER BY r.id DESC
    `, params);

    res.json({ success: true, count: returns.length, returns });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch returns report", error: error.message });
  }
};

exports.getPerformanceReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }
    const w = "WHERE " + where.join(" AND ");

    const [byStatus] = await db.query(
      `SELECT o.order_status, COUNT(*) AS count, COALESCE(SUM(o.total_amount),0) AS total FROM orders o ${w} GROUP BY o.order_status`,
      params
    );

    const wActive = where.concat(["o.order_status NOT IN('cancelled','returned')"]).join(" AND ");
    const [byDay] = await db.query(
      `SELECT DATE(o.order_date) AS day, COUNT(*) AS orders, COALESCE(SUM(o.total_amount),0) AS revenue FROM orders o WHERE ${wActive} GROUP BY DATE(o.order_date) ORDER BY day ASC`,
      params
    );

    res.json({ success: true, by_status: byStatus, by_day: byDay });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch performance report", error: error.message });
  }
};
