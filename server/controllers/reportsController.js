const db = require("../config/db");

// ─── Dashboard KPI Summary ────────────────────────────────────────────────────

exports.getSummary = async (req, res) => {
  try {
    const [[orders]]   = await db.query(`SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount),0) AS gross_sales FROM orders WHERE order_status != 'cancelled'`);
    const [[invoices]] = await db.query(`SELECT COALESCE(SUM(balance_amount),0) AS outstanding FROM invoices WHERE invoice_type='sales' AND status NOT IN ('cancelled','paid')`);
    const [[po]]       = await db.query(`SELECT COUNT(*) AS total_po, COALESCE(SUM(total_amount),0) AS total_po_value FROM purchase_orders WHERE status != 'cancelled'`);
    const [[payments]] = await db.query(`SELECT COALESCE(SUM(amount),0) AS total_vendor_paid FROM procurement_payments WHERE status='paid'`);
    const [[vendors]]  = await db.query(`SELECT COUNT(*) AS total_vendors, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_vendors FROM vendors`);
    const [[inv]]      = await db.query(`SELECT COUNT(DISTINCT product_id) AS total_skus, COALESCE(SUM(available_qty),0) AS total_stock, COALESCE(SUM(available_qty*average_cost),0) AS stock_value FROM inventories`);

    res.json({ success: true, summary: { orders, invoices, po, payments, vendors, inventory: inv } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch summary", error: error.message });
  }
};

exports.getKPIs = async (req, res) => {
  try {
    const [[low]] = await db.query(`
      SELECT COUNT(*) AS low_stock_count FROM products p WHERE p.status='active' AND p.reorder_level > 0
        AND (SELECT COALESCE(SUM(i.available_qty),0) FROM inventories i WHERE i.product_id=p.id) < p.reorder_level
    `);
    const [[pendingPO]]  = await db.query(`SELECT COUNT(*) AS pending_po FROM purchase_orders WHERE status IN ('pending_approval','approved','sent')`);
    const [[thisMonth]]  = await db.query(`SELECT COALESCE(SUM(total_amount),0) AS sales_this_month FROM orders WHERE order_status!='cancelled' AND YEAR(order_date)=YEAR(CURDATE()) AND MONTH(order_date)=MONTH(CURDATE())`);
    const [[outstanding]]= await db.query(`SELECT COALESCE(SUM(balance_amount),0) AS customer_outstanding FROM invoices WHERE invoice_type='sales' AND status NOT IN ('cancelled','paid')`);
    const [[pendingPay]] = await db.query(`SELECT COALESCE(SUM(amount),0) AS pending_vendor_payments FROM procurement_payments WHERE status='pending'`);

    res.json({
      success: true,
      kpis: {
        low_stock_count: Number(low.low_stock_count || 0),
        pending_po: Number(pendingPO.pending_po || 0),
        sales_this_month: Number(thisMonth.sales_this_month || 0),
        customer_outstanding: Number(outstanding.customer_outstanding || 0),
        pending_vendor_payments: Number(pendingPay.pending_vendor_payments || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch KPIs", error: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const [[orders]]    = await db.query(`SELECT COUNT(*) AS total, COALESCE(SUM(total_amount),0) AS gross FROM orders WHERE order_status!='cancelled'`);
    const [[purchases]] = await db.query(`SELECT COUNT(*) AS total, COALESCE(SUM(total_amount),0) AS total_value FROM purchase_orders WHERE status!='cancelled'`);
    const [[vendors]]   = await db.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM vendors`);
    const [[inv]]       = await db.query(`SELECT COUNT(DISTINCT product_id) AS skus, COALESCE(SUM(available_qty*average_cost),0) AS value FROM inventories`);
    const [monthly]     = await db.query(`
      SELECT YEAR(order_date) AS year, MONTH(order_date) AS month,
             COUNT(*) AS order_count, COALESCE(SUM(total_amount),0) AS revenue
      FROM orders WHERE order_status!='cancelled' AND order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY YEAR(order_date), MONTH(order_date) ORDER BY year, month
    `);
    res.json({ success: true, dashboard: { orders, purchases, vendors, inventory: inv, monthly_sales: monthly } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch dashboard", error: error.message });
  }
};

// ─── Sales Reports ────────────────────────────────────────────────────────────

exports.getSalesSummary = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const ow = ["o.order_status != 'cancelled'"]; const op = [];
    const iw = ["i.invoice_type='sales'", "i.status != 'cancelled'"]; const ip = [];
    if (from_date) { ow.push("DATE(o.order_date) >= ?"); op.push(from_date); iw.push("i.invoice_date >= ?"); ip.push(from_date); }
    if (to_date)   { ow.push("DATE(o.order_date) <= ?"); op.push(to_date);   iw.push("i.invoice_date <= ?"); ip.push(to_date); }

    const [[orders]]   = await db.query(`SELECT COUNT(*) AS order_count, COALESCE(SUM(o.total_amount),0) AS gross_sales, COALESCE(SUM(o.discount_amount),0) AS total_discount, COALESCE(SUM(o.tax_amount),0) AS total_tax, SUM(CASE WHEN o.payment_status='paid' THEN 1 ELSE 0 END) AS paid_orders, SUM(CASE WHEN o.payment_status='pending' THEN 1 ELSE 0 END) AS pending_orders FROM orders o WHERE ${ow.join(" AND ")}`, op);
    const [[invoices]] = await db.query(`SELECT COUNT(*) AS invoice_count, COALESCE(SUM(i.total_amount),0) AS invoiced_amount, COALESCE(SUM(i.paid_amount),0) AS collected, COALESCE(SUM(i.balance_amount),0) AS outstanding FROM invoices i WHERE ${iw.join(" AND ")}`, ip);

    res.json({ success: true, summary: { orders, invoices } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch sales summary", error: error.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;
    const where = ["1=1"]; const params = [];
    if (from_date) { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }
    if (status)    { where.push("o.order_status = ?");      params.push(status); }

    const [rows] = await db.query(`
      SELECT o.id, o.order_number, o.order_date, o.subtotal, o.discount_amount,
             o.tax_amount, o.total_amount, o.payment_status, o.order_status,
             c.business_name AS customer_name, c.phone AS customer_phone
      FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
      WHERE ${where.join(" AND ")} ORDER BY o.id DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, sales: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch sales", error: error.message });
  }
};

exports.getSalesMonthly = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT YEAR(order_date) AS year, MONTH(order_date) AS month,
             COUNT(*) AS order_count, COALESCE(SUM(total_amount),0) AS revenue,
             COALESCE(SUM(discount_amount),0) AS discounts, COALESCE(SUM(tax_amount),0) AS tax
      FROM orders WHERE order_status != 'cancelled'
      GROUP BY YEAR(order_date), MONTH(order_date)
      ORDER BY year DESC, month DESC LIMIT 24
    `);
    res.json({ success: true, count: rows.length, monthly: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch monthly sales", error: error.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["o.order_status != 'cancelled'"]; const params = [];
    if (from_date) { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }

    const [rows] = await db.query(`
      SELECT oi.product_id, p.name AS product_name, p.sku,
             COUNT(DISTINCT oi.order_id) AS order_count,
             COALESCE(SUM(oi.quantity),0) AS total_qty,
             COALESCE(SUM(oi.total_amount),0) AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE ${where.join(" AND ")}
      GROUP BY oi.product_id, p.name, p.sku
      ORDER BY total_revenue DESC LIMIT 20
    `, params);
    res.json({ success: true, count: rows.length, top_products: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch top products", error: error.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["customer_id IS NOT NULL"]; const params = [];
    if (from_date) { where.push("payment_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("payment_date <= ?"); params.push(to_date); }

    const [[totals]]  = await db.query(`SELECT COUNT(*) AS total_payments, COALESCE(SUM(amount),0) AS total_amount FROM payments WHERE ${where.join(" AND ")}`, params);
    const [byStatus]  = await db.query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount FROM payments WHERE ${where.join(" AND ")} GROUP BY status`, params);
    res.json({ success: true, totals, by_status: byStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch payment methods", error: error.message });
  }
};

// ─── Procurement Reports ──────────────────────────────────────────────────────

exports.getProcurementSummary = async (req, res) => {
  try {
    const [[po]] = await db.query(`
      SELECT COUNT(*) AS total_po,
             SUM(CASE WHEN status='draft'            THEN 1 ELSE 0 END) AS draft,
             SUM(CASE WHEN status='pending_approval' THEN 1 ELSE 0 END) AS pending_approval,
             SUM(CASE WHEN status='approved'         THEN 1 ELSE 0 END) AS approved,
             SUM(CASE WHEN status='received'         THEN 1 ELSE 0 END) AS received,
             SUM(CASE WHEN status='cancelled'        THEN 1 ELSE 0 END) AS cancelled,
             COALESCE(SUM(total_amount),0) AS total_po_value
      FROM purchase_orders
    `);
    const [[pp]] = await db.query(`
      SELECT COUNT(*) AS total_payments,
             COALESCE(SUM(amount),0)                                          AS total_amount,
             COALESCE(SUM(CASE WHEN status='paid'    THEN amount ELSE 0 END),0) AS paid_amount,
             COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) AS pending_amount
      FROM procurement_payments
    `);
    res.json({ success: true, summary: { purchase_orders: po, payments: pp } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch procurement summary", error: error.message });
  }
};

exports.getProcurement = async (req, res) => {
  try {
    const { vendor_id, status, from_date, to_date } = req.query;
    const where = ["1=1"]; const params = [];
    if (vendor_id) { where.push("po.vendor_id = ?"); params.push(vendor_id); }
    if (status)    { where.push("po.status = ?");    params.push(status); }
    if (from_date) { where.push("po.po_date >= ?");  params.push(from_date); }
    if (to_date)   { where.push("po.po_date <= ?");  params.push(to_date); }

    const [rows] = await db.query(`
      SELECT po.id, po.po_number, po.po_date, po.status,
             po.subtotal, po.tax_amount, po.total_amount,
             v.business_name AS vendor_name, v.vendor_code
      FROM purchase_orders po LEFT JOIN vendors v ON v.id = po.vendor_id
      WHERE ${where.join(" AND ")} ORDER BY po.id DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, purchase_orders: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch procurement", error: error.message });
  }
};

exports.getProcurementVendorPerformance = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.id, v.business_name AS vendor_name, v.vendor_code, v.rating,
             COUNT(DISTINCT po.id) AS total_po,
             SUM(CASE WHEN po.status='received' THEN 1 ELSE 0 END) AS completed_po,
             COALESCE(SUM(po.total_amount),0) AS total_po_value,
             COALESCE(SUM(pp.amount),0) AS total_paid
      FROM vendors v
      LEFT JOIN purchase_orders po ON po.vendor_id = v.id AND po.status != 'cancelled'
      LEFT JOIN procurement_payments pp ON pp.vendor_id = v.id AND pp.status = 'paid'
      WHERE v.status = 'active'
      GROUP BY v.id, v.business_name, v.vendor_code, v.rating
      ORDER BY total_po_value DESC LIMIT 50
    `);
    res.json({ success: true, count: rows.length, vendor_performance: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor performance", error: error.message });
  }
};

exports.getProcurementPayments = async (req, res) => {
  try {
    const { vendor_id, status, from_date, to_date } = req.query;
    const where = ["1=1"]; const params = [];
    if (vendor_id) { where.push("pp.vendor_id = ?");    params.push(vendor_id); }
    if (status)    { where.push("pp.status = ?");        params.push(status); }
    if (from_date) { where.push("pp.payment_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("pp.payment_date <= ?"); params.push(to_date); }

    const [rows] = await db.query(`
      SELECT pp.id, pp.payment_date, pp.amount, pp.payment_mode, pp.reference_number, pp.status,
             v.business_name AS vendor_name, v.vendor_code, po.po_number
      FROM procurement_payments pp
      LEFT JOIN vendors v ON v.id = pp.vendor_id
      LEFT JOIN purchase_orders po ON po.id = pp.purchase_order_id
      WHERE ${where.join(" AND ")} ORDER BY pp.id DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, payments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch procurement payments", error: error.message });
  }
};

// ─── Inventory Reports ────────────────────────────────────────────────────────

exports.getInventorySummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT COUNT(DISTINCT product_id) AS total_skus,
             COALESCE(SUM(available_qty),0) AS total_available,
             COALESCE(SUM(reserved_qty),0) AS total_reserved,
             COALESCE(SUM(damaged_qty),0) AS total_damaged,
             COALESCE(SUM(available_qty * average_cost),0) AS stock_value
      FROM inventories
    `);
    const [[lowStock]] = await db.query(`
      SELECT COUNT(*) AS count FROM products p WHERE p.status='active' AND p.reorder_level > 0
        AND (SELECT COALESCE(SUM(i.available_qty),0) FROM inventories i WHERE i.product_id=p.id) < p.reorder_level
    `);
    const [[products]] = await db.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM products`);

    res.json({ success: true, summary: { totals, low_stock: lowStock, products } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch inventory summary", error: error.message });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const { warehouse_id, search } = req.query;
    const where = ["1=1"]; const params = [];
    if (warehouse_id) { where.push("i.warehouse_id = ?"); params.push(warehouse_id); }
    if (search)       { where.push("p.name LIKE ?");      params.push(`%${search}%`); }

    const [rows] = await db.query(`
      SELECT i.warehouse_id, w.name AS warehouse_name,
             i.product_id, p.name AS product_name, p.sku, p.reorder_level,
             i.available_qty, i.reserved_qty, i.damaged_qty, i.average_cost,
             (i.available_qty * i.average_cost) AS stock_value
      FROM inventories i
      LEFT JOIN products p ON p.id = i.product_id
      LEFT JOIN warehouses w ON w.id = i.warehouse_id
      WHERE ${where.join(" AND ")} ORDER BY stock_value DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, inventory: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch inventory", error: error.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.name AS product_name, p.sku, p.reorder_level, p.min_stock_level,
             COALESCE(SUM(i.available_qty),0) AS available_qty
      FROM products p LEFT JOIN inventories i ON i.product_id = p.id
      WHERE p.status = 'active' AND p.reorder_level > 0
      GROUP BY p.id, p.name, p.sku, p.reorder_level, p.min_stock_level
      HAVING available_qty < p.reorder_level ORDER BY available_qty ASC
    `);
    res.json({ success: true, count: rows.length, low_stock: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch low stock", error: error.message });
  }
};

exports.getWarehouseStock = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT w.id AS warehouse_id, w.name AS warehouse_name, w.status,
             COUNT(DISTINCT i.product_id) AS product_count,
             COALESCE(SUM(i.available_qty),0) AS total_available,
             COALESCE(SUM(i.available_qty * i.average_cost),0) AS stock_value
      FROM warehouses w LEFT JOIN inventories i ON i.warehouse_id = w.id
      GROUP BY w.id, w.name, w.status ORDER BY stock_value DESC
    `);
    res.json({ success: true, count: rows.length, warehouse_stock: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch warehouse stock", error: error.message });
  }
};

// ─── Vendor Reports ───────────────────────────────────────────────────────────

exports.getVendorSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total_vendors,
             SUM(CASE WHEN status='active'   THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) AS inactive,
             SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN status='blocked'  THEN 1 ELSE 0 END) AS blocked
      FROM vendors
    `);
    const [[po]]       = await db.query(`SELECT COALESCE(SUM(total_amount),0) AS total_purchase_value, COUNT(DISTINCT vendor_id) AS vendors_with_po FROM purchase_orders WHERE status != 'cancelled'`);
    const [[payments]] = await db.query(`SELECT COALESCE(SUM(amount),0) AS total_paid FROM procurement_payments WHERE status = 'paid'`);

    res.json({ success: true, summary: { vendors: totals, purchase_orders: po, payments } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor summary", error: error.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = ["1=1"]; const params = [];
    if (status) { where.push("v.status = ?");          params.push(status); }
    if (search) { where.push("v.business_name LIKE ?"); params.push(`%${search}%`); }

    const [rows] = await db.query(`
      SELECT v.id, v.vendor_code, v.business_name, v.phone, v.city, v.state, v.status, v.rating,
             COUNT(DISTINCT po.id) AS total_po,
             COALESCE(SUM(po.total_amount),0) AS total_po_value,
             COALESCE(SUM(pp.amount),0) AS total_paid
      FROM vendors v
      LEFT JOIN purchase_orders po ON po.vendor_id = v.id AND po.status != 'cancelled'
      LEFT JOIN procurement_payments pp ON pp.vendor_id = v.id AND pp.status = 'paid'
      WHERE ${where.join(" AND ")}
      GROUP BY v.id, v.vendor_code, v.business_name, v.phone, v.city, v.state, v.status, v.rating
      ORDER BY total_po_value DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, vendors: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendors", error: error.message });
  }
};

exports.getVendorPayments = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["pp.status = 'paid'"]; const params = [];
    if (from_date) { where.push("pp.payment_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("pp.payment_date <= ?"); params.push(to_date); }

    const [rows] = await db.query(`
      SELECT v.id, v.business_name AS vendor_name, v.vendor_code,
             COUNT(pp.id) AS payment_count,
             COALESCE(SUM(pp.amount),0) AS total_paid
      FROM procurement_payments pp
      JOIN vendors v ON v.id = pp.vendor_id
      WHERE ${where.join(" AND ")}
      GROUP BY v.id, v.business_name, v.vendor_code
      ORDER BY total_paid DESC LIMIT 50
    `, params);
    res.json({ success: true, count: rows.length, vendor_payments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor payments", error: error.message });
  }
};

exports.getVendorOutstanding = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.id, v.business_name AS vendor_name, v.vendor_code, v.status,
             COALESCE(SUM(CASE WHEN vl.entry_type='debit'  THEN vl.amount ELSE 0 END),0) AS total_purchase,
             COALESCE(SUM(CASE WHEN vl.entry_type='credit' THEN vl.amount ELSE 0 END),0) AS total_paid,
             COALESCE(SUM(CASE WHEN vl.entry_type='debit'  THEN vl.amount ELSE 0 END),0) -
             COALESCE(SUM(CASE WHEN vl.entry_type='credit' THEN vl.amount ELSE 0 END),0) AS outstanding
      FROM vendors v
      LEFT JOIN vendor_ledgers vl ON vl.vendor_id = v.id
      WHERE v.status = 'active'
      GROUP BY v.id, v.business_name, v.vendor_code, v.status
      HAVING outstanding > 0
      ORDER BY outstanding DESC LIMIT 50
    `);
    res.json({ success: true, count: rows.length, outstanding: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor outstanding", error: error.message });
  }
};

// ─── Customer Reports ─────────────────────────────────────────────────────────

exports.getCustomerSummary = async (req, res) => {
  try {
    const [[cust]]    = await db.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) AS inactive, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status='blocked' THEN 1 ELSE 0 END) AS blocked FROM customers`);
    const [[orders]]  = await db.query(`SELECT COUNT(DISTINCT customer_id) AS customers_with_orders, COUNT(*) AS total_orders, COALESCE(SUM(total_amount),0) AS total_order_value FROM orders WHERE order_status != 'cancelled'`);
    const [[invs]]    = await db.query(`SELECT COALESCE(SUM(balance_amount),0) AS total_outstanding, COALESCE(SUM(paid_amount),0) AS total_collected FROM invoices WHERE invoice_type='sales' AND status != 'cancelled'`);
    res.json({ success: true, summary: { customers: cust, orders, invoices: invs } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch customer summary", error: error.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = ["1=1"]; const params = [];
    if (status) { where.push("c.status = ?");          params.push(status); }
    if (search) { where.push("c.business_name LIKE ?"); params.push(`%${search}%`); }
    const [rows] = await db.query(`
      SELECT c.id, c.customer_code, c.business_name, c.phone, c.city, c.status, c.credit_limit,
             COUNT(DISTINCT o.id) AS total_orders,
             COALESCE(SUM(o.total_amount),0) AS total_order_value,
             COALESCE(SUM(i.balance_amount),0) AS outstanding
      FROM customers c
      LEFT JOIN orders o ON o.customer_id=c.id AND o.order_status!='cancelled'
      LEFT JOIN invoices i ON i.customer_id=c.id AND i.invoice_type='sales' AND i.status!='cancelled'
      WHERE ${where.join(" AND ")}
      GROUP BY c.id,c.customer_code,c.business_name,c.phone,c.city,c.status,c.credit_limit
      ORDER BY total_order_value DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, customers: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch customers", error: error.message });
  }
};

exports.getTopCustomers = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["o.order_status != 'cancelled'"]; const params = [];
    if (from_date) { where.push("DATE(o.order_date) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(o.order_date) <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT c.id, c.business_name AS customer_name, c.customer_code, c.city,
             COUNT(o.id) AS order_count, COALESCE(SUM(o.total_amount),0) AS total_value
      FROM orders o JOIN customers c ON c.id=o.customer_id
      WHERE ${where.join(" AND ")}
      GROUP BY c.id,c.business_name,c.customer_code,c.city
      ORDER BY total_value DESC LIMIT 20
    `, params);
    res.json({ success: true, count: rows.length, top_customers: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch top customers", error: error.message });
  }
};

exports.getCustomerOutstanding = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.business_name AS customer_name, c.customer_code, c.phone,
             COALESCE(SUM(i.total_amount),0) AS total_invoiced,
             COALESCE(SUM(i.paid_amount),0) AS total_paid,
             COALESCE(SUM(i.balance_amount),0) AS outstanding
      FROM customers c
      JOIN invoices i ON i.customer_id=c.id AND i.invoice_type='sales' AND i.status NOT IN ('cancelled','paid')
      GROUP BY c.id,c.business_name,c.customer_code,c.phone
      HAVING outstanding > 0 ORDER BY outstanding DESC LIMIT 100
    `);
    res.json({ success: true, count: rows.length, outstanding: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch customer outstanding", error: error.message });
  }
};

// ─── Warehouse Reports ────────────────────────────────────────────────────────

exports.getWarehouseSummary = async (req, res) => {
  try {
    const [[wh]]    = await db.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM warehouses`);
    const [[stock]] = await db.query(`SELECT COUNT(DISTINCT product_id) AS total_skus, COALESCE(SUM(available_qty),0) AS total_qty, COALESCE(SUM(available_qty*average_cost),0) AS total_value FROM inventories`);
    const [[moves]] = await db.query(`SELECT COUNT(*) AS total_movements, SUM(CASE WHEN movement_type='in' THEN 1 ELSE 0 END) AS inward, SUM(CASE WHEN movement_type='out' THEN 1 ELSE 0 END) AS outward FROM stock_movements`);
    res.json({ success: true, summary: { warehouses: wh, stock, movements: moves } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch warehouse summary", error: error.message });
  }
};

exports.getWarehouseList = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT w.id, w.warehouse_code, w.name AS warehouse_name, w.city, w.status,
             COUNT(DISTINCT i.product_id) AS product_count,
             COALESCE(SUM(i.available_qty),0) AS total_qty,
             COALESCE(SUM(i.available_qty*i.average_cost),0) AS stock_value
      FROM warehouses w LEFT JOIN inventories i ON i.warehouse_id=w.id
      GROUP BY w.id,w.warehouse_code,w.name,w.city,w.status ORDER BY stock_value DESC
    `);
    res.json({ success: true, count: rows.length, warehouses: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch warehouses", error: error.message });
  }
};

exports.getWarehouseMovements = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"]; const params = [];
    if (from_date) { where.push("sm.created_at >= ?"); params.push(from_date); }
    if (to_date)   { where.push("sm.created_at <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT w.name AS warehouse_name, sm.movement_type,
             COUNT(*) AS movement_count, COALESCE(SUM(sm.quantity),0) AS total_qty
      FROM stock_movements sm LEFT JOIN warehouses w ON w.id=sm.warehouse_id
      WHERE ${where.join(" AND ")}
      GROUP BY w.name,sm.movement_type ORDER BY w.name,sm.movement_type
    `, params);
    res.json({ success: true, count: rows.length, movements: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch movements", error: error.message });
  }
};

// ─── Delivery Reports ─────────────────────────────────────────────────────────

exports.getDeliverySummary = async (req, res) => {
  try {
    const [[del]] = await db.query(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN delivery_status='pending'    THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN delivery_status='assigned'   THEN 1 ELSE 0 END) AS assigned,
             SUM(CASE WHEN delivery_status='in_transit' THEN 1 ELSE 0 END) AS in_transit,
             SUM(CASE WHEN delivery_status='delivered'  THEN 1 ELSE 0 END) AS delivered,
             SUM(CASE WHEN delivery_status='failed'     THEN 1 ELSE 0 END) AS failed,
             SUM(CASE WHEN delivery_status='cancelled'  THEN 1 ELSE 0 END) AS cancelled
      FROM deliveries
    `);
    const [[drv]] = await db.query(`SELECT COUNT(*) AS total_drivers, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available, SUM(CASE WHEN status='busy' THEN 1 ELSE 0 END) AS busy FROM delivery_drivers`);
    res.json({ success: true, summary: { deliveries: del, drivers: drv } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch delivery summary", error: error.message });
  }
};

exports.getDeliveryList = async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query;
    const where = ["1=1"]; const params = [];
    if (status)    { where.push("d.delivery_status = ?"); params.push(status); }
    if (from_date) { where.push("d.delivery_date >= ?");  params.push(from_date); }
    if (to_date)   { where.push("d.delivery_date <= ?");  params.push(to_date); }
    const [rows] = await db.query(`
      SELECT d.id, d.delivery_number, d.delivery_date, d.delivery_status,
             dd.name AS driver_name, dd.phone AS driver_phone,
             c.business_name AS customer_name, o.order_number
      FROM deliveries d
      LEFT JOIN delivery_drivers dd ON dd.id=d.driver_id
      LEFT JOIN customers c ON c.id=d.customer_id
      LEFT JOIN orders o ON o.id=d.order_id
      WHERE ${where.join(" AND ")} ORDER BY d.id DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, deliveries: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch deliveries", error: error.message });
  }
};

exports.getDeliveryDrivers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dd.id, dd.driver_code, dd.name AS driver_name, dd.phone, dd.vehicle_type, dd.status,
             COUNT(d.id) AS total_deliveries,
             SUM(CASE WHEN d.delivery_status='delivered' THEN 1 ELSE 0 END) AS delivered,
             SUM(CASE WHEN d.delivery_status='failed'    THEN 1 ELSE 0 END) AS failed
      FROM delivery_drivers dd LEFT JOIN deliveries d ON d.driver_id=dd.id
      GROUP BY dd.id,dd.driver_code,dd.name,dd.phone,dd.vehicle_type,dd.status
      ORDER BY total_deliveries DESC
    `);
    res.json({ success: true, count: rows.length, drivers: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch drivers", error: error.message });
  }
};

// ─── Finance Reports ──────────────────────────────────────────────────────────

exports.getFinanceSummary = async (req, res) => {
  try {
    const [[inv]]     = await db.query(`SELECT COUNT(*) AS total_invoices, COALESCE(SUM(total_amount),0) AS total_invoiced, COALESCE(SUM(paid_amount),0) AS total_collected, COALESCE(SUM(balance_amount),0) AS total_outstanding FROM invoices WHERE invoice_type='sales' AND status!='cancelled'`);
    const [[pay]]     = await db.query(`SELECT COUNT(*) AS total_payments, COALESCE(SUM(amount),0) AS total_received FROM payments WHERE status='success' AND customer_id IS NOT NULL`);
    const [[vp]]      = await db.query(`SELECT COALESCE(SUM(amount),0) AS vendor_paid FROM procurement_payments WHERE status='paid'`);
    const [[income]]  = await db.query(`SELECT COALESCE(SUM(amount),0) AS total_income  FROM transactions WHERE transaction_type='income'`);
    const [[expense]] = await db.query(`SELECT COALESCE(SUM(amount),0) AS total_expense FROM transactions WHERE transaction_type='expense'`);
    const net = Number(income.total_income || 0) - Number(expense.total_expense || 0);
    res.json({ success: true, summary: { invoices: inv, payments: pay, vendor_payments: vp, income, expense, net_profit: net } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch finance summary", error: error.message });
  }
};

exports.getFinancePL = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"]; const params = [];
    if (from_date) { where.push("transaction_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("transaction_date <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT transaction_type, YEAR(transaction_date) AS year, MONTH(transaction_date) AS month,
             COUNT(*) AS count, COALESCE(SUM(amount),0) AS total
      FROM transactions WHERE ${where.join(" AND ")}
      GROUP BY transaction_type,YEAR(transaction_date),MONTH(transaction_date)
      ORDER BY year DESC,month DESC,transaction_type
    `, params);
    res.json({ success: true, count: rows.length, pl: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch P&L", error: error.message });
  }
};

// ─── Tax / GST Reports ────────────────────────────────────────────────────────

exports.getTaxSummary = async (req, res) => {
  try {
    const [[gst]]   = await db.query(`SELECT COUNT(*) AS total_gst_invoices, COALESCE(SUM(taxable_value),0) AS total_taxable, COALESCE(SUM(cgst_amount),0) AS total_cgst, COALESCE(SUM(sgst_amount),0) AS total_sgst, COALESCE(SUM(igst_amount),0) AS total_igst, COALESCE(SUM(cess_amount),0) AS total_cess FROM gst_invoices`);
    const [[r1]]    = await db.query(`SELECT COUNT(*) AS count, SUM(CASE WHEN status='filed' THEN 1 ELSE 0 END) AS filed FROM gstr1_reports`);
    const [[r3b]]   = await db.query(`SELECT COUNT(*) AS count, SUM(CASE WHEN status='filed' THEN 1 ELSE 0 END) AS filed, COALESCE(SUM(tax_payable),0) AS total_tax_payable FROM gstr3b_reports`);
    const [[r2b]]   = await db.query(`SELECT COUNT(*) AS count FROM gstr2b_reports`);
    const output    = Number(gst.total_cgst||0) + Number(gst.total_sgst||0) + Number(gst.total_igst||0);
    res.json({ success: true, summary: { gst, gstr1: r1, gstr3b: r3b, gstr2b: r2b, output_gst: output } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tax summary", error: error.message });
  }
};

exports.getTaxTransactions = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"]; const params = [];
    if (from_date) { where.push("tt.transaction_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("tt.transaction_date <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT tt.id, tt.transaction_date, tt.reference_type, tt.reference_id,
             tt.taxable_value, tt.cgst_amount, tt.sgst_amount, tt.igst_amount, tt.cess_amount,
             (tt.cgst_amount+tt.sgst_amount+tt.igst_amount+tt.cess_amount) AS total_tax
      FROM tax_transactions tt WHERE ${where.join(" AND ")}
      ORDER BY tt.transaction_date DESC LIMIT 200
    `, params);
    res.json({ success: true, count: rows.length, transactions: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tax transactions", error: error.message });
  }
};
