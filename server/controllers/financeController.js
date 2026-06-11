const db = require("../config/db");

const genPayNum = () => `PAY-${Date.now().toString().slice(-8)}`;
const genTxnNum = () => `TXN-${Date.now().toString().slice(-8)}`;

// ─── Summary / Dashboard ──────────────────────────────────────────────────────

exports.getSummary = async (req, res) => {
  try {
    const [[inv]] = await db.query(`
      SELECT
        COUNT(*)                                                         AS total_invoices,
        COALESCE(SUM(total_amount),   0)                                 AS total_invoice_amount,
        COALESCE(SUM(paid_amount),    0)                                 AS total_paid,
        COALESCE(SUM(balance_amount), 0)                                 AS total_outstanding,
        SUM(CASE WHEN status='draft'     THEN 1 ELSE 0 END)             AS draft,
        SUM(CASE WHEN status='sent'      THEN 1 ELSE 0 END)             AS sent,
        SUM(CASE WHEN status='partial'   THEN 1 ELSE 0 END)             AS partial,
        SUM(CASE WHEN status='paid'      THEN 1 ELSE 0 END)             AS paid,
        SUM(CASE WHEN status='overdue'   THEN 1 ELSE 0 END)             AS overdue,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END)             AS cancelled,
        SUM(CASE WHEN status='paid'      THEN 1 ELSE 0 END)             AS paid_count,
        SUM(CASE WHEN status='overdue'   THEN 1 ELSE 0 END)             AS overdue_count
      FROM invoices
    `);

    const [[pay]] = await db.query(`
      SELECT
        COUNT(*)                                                                           AS total_payments,
        COALESCE(SUM(amount), 0)                                                           AS total_payment_amount,
        SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END)                                AS pending_count,
        SUM(CASE WHEN status='success'   THEN 1 ELSE 0 END)                                AS success_count,
        SUM(CASE WHEN status='failed'    THEN 1 ELSE 0 END)                                AS failed_count,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END)                                AS cancelled_count,
        SUM(CASE WHEN status='refunded'  THEN 1 ELSE 0 END)                                AS refunded_count,
        COALESCE(SUM(CASE WHEN customer_id IS NOT NULL AND status='success' THEN amount ELSE 0 END), 0) AS total_receipts
      FROM payments
    `);

    const [[exp]] = await db.query(`
      SELECT
        COUNT(*)                   AS total_expenses,
        COALESCE(SUM(amount), 0)   AS total_expense_amount
      FROM transactions
      WHERE transaction_type = 'expense'
    `);

    const [[inc]] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_income
      FROM transactions
      WHERE transaction_type = 'income'
    `);

    res.json({ success: true, summary: { invoices: inv, payments: pay, expenses: exp, income: inc } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch finance summary", error: error.message });
  }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

exports.getAllPayments = async (req, res) => {
  try {
    const { status, from_date, to_date, customer_id, vendor_id } = req.query;
    const where = ["1=1"];
    const params = [];
    if (status)      { where.push("p.status = ?");          params.push(status); }
    if (from_date)   { where.push("p.payment_date >= ?");   params.push(from_date); }
    if (to_date)     { where.push("p.payment_date <= ?");   params.push(to_date); }
    if (customer_id) { where.push("p.customer_id = ?");     params.push(customer_id); }
    if (vendor_id)   { where.push("p.vendor_id = ?");       params.push(vendor_id); }

    const [rows] = await db.query(`
      SELECT p.id, p.payment_number, p.payment_date, p.amount, p.status,
             p.transaction_reference, p.remarks,
             p.invoice_id, p.order_id, p.customer_id, p.vendor_id, p.payment_method_id,
             c.business_name AS customer_name,
             v.business_name  AS vendor_name,
             pm.name          AS payment_method_name,
             i.invoice_number
      FROM payments p
      LEFT JOIN customers       c  ON c.id  = p.customer_id
      LEFT JOIN vendors         v  ON v.id  = p.vendor_id
      LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
      LEFT JOIN invoices        i  ON i.id  = p.invoice_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.id DESC
    `, params);

    res.json({ success: true, count: rows.length, payments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch payments", error: error.message });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await db.query(`
      SELECT p.*,
             c.business_name AS customer_name,
             v.business_name  AS vendor_name,
             pm.name          AS payment_method_name,
             i.invoice_number
      FROM payments p
      LEFT JOIN customers       c  ON c.id  = p.customer_id
      LEFT JOIN vendors         v  ON v.id  = p.vendor_id
      LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
      LEFT JOIN invoices        i  ON i.id  = p.invoice_id
      WHERE p.id = ?
    `, [id]);
    if (!row) return res.status(404).json({ success: false, message: "Payment not found" });
    res.json({ success: true, payment: row });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch payment", error: error.message });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const { invoice_id, order_id, customer_id, vendor_id, payment_method_id,
            payment_date, amount, transaction_reference, remarks } = req.body;
    if (!amount || !payment_date) {
      return res.status(400).json({ success: false, message: "amount and payment_date are required" });
    }
    const payment_number = genPayNum();
    const [result] = await db.query(
      `INSERT INTO payments (payment_number, invoice_id, order_id, customer_id, vendor_id,
        payment_method_id, payment_date, amount, transaction_reference, remarks, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [payment_number, invoice_id || null, order_id || null, customer_id || null,
       vendor_id || null, payment_method_id || null, payment_date, amount,
       transaction_reference || null, remarks || null]
    );
    res.status(201).json({ success: true, message: "Payment created", payment_number, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create payment", error: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_id, order_id, customer_id, vendor_id, payment_method_id,
            payment_date, amount, transaction_reference, remarks } = req.body;
    const [[existing]] = await db.query("SELECT id FROM payments WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Payment not found" });
    await db.query(
      `UPDATE payments SET invoice_id=?, order_id=?, customer_id=?, vendor_id=?,
        payment_method_id=?, payment_date=?, amount=?, transaction_reference=?, remarks=?
       WHERE id = ?`,
      [invoice_id || null, order_id || null, customer_id || null, vendor_id || null,
       payment_method_id || null, payment_date, amount, transaction_reference || null,
       remarks || null, id]
    );
    res.json({ success: true, message: "Payment updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update payment", error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ["pending", "success", "failed", "cancelled", "refunded"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: `Valid statuses: ${valid.join(", ")}` });
    }
    const [[existing]] = await db.query("SELECT id FROM payments WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Payment not found" });
    await db.query("UPDATE payments SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true, message: "Payment status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update payment status", error: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query("SELECT id FROM payments WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Payment not found" });
    await db.query("DELETE FROM payments WHERE id = ?", [id]);
    res.json({ success: true, message: "Payment deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete payment", error: error.message });
  }
};

// ─── Receipts (payments received from customers) ──────────────────────────────

exports.getReceipts = async (req, res) => {
  try {
    const { from_date, to_date, customer_id, status } = req.query;
    const where = ["p.customer_id IS NOT NULL"];
    const params = [];
    if (status)      { where.push("p.status = ?");          params.push(status); }
    if (from_date)   { where.push("p.payment_date >= ?");   params.push(from_date); }
    if (to_date)     { where.push("p.payment_date <= ?");   params.push(to_date); }
    if (customer_id) { where.push("p.customer_id = ?");     params.push(customer_id); }

    const [rows] = await db.query(`
      SELECT p.id, p.payment_number, p.payment_date, p.amount, p.status,
             p.transaction_reference, p.remarks,
             c.business_name AS customer_name,
             pm.name         AS payment_method_name,
             i.invoice_number
      FROM payments p
      LEFT JOIN customers       c  ON c.id  = p.customer_id
      LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
      LEFT JOIN invoices        i  ON i.id  = p.invoice_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.id DESC
    `, params);

    res.json({ success: true, count: rows.length, receipts: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch receipts", error: error.message });
  }
};

// ─── Expenses (transactions WHERE transaction_type = 'expense') ───────────────

exports.getExpenses = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["transaction_type = 'expense'"];
    const params = [];
    if (from_date) { where.push("transaction_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("transaction_date <= ?"); params.push(to_date); }

    const [rows] = await db.query(
      `SELECT id, transaction_number, transaction_date, amount, description,
              reference_type, reference_id, created_at
       FROM transactions
       WHERE ${where.join(" AND ")}
       ORDER BY id DESC`,
      params
    );
    res.json({ success: true, count: rows.length, expenses: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch expenses", error: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { transaction_date, amount, description, reference_type, reference_id } = req.body;
    if (!amount || !transaction_date) {
      return res.status(400).json({ success: false, message: "amount and transaction_date are required" });
    }
    const transaction_number = genTxnNum();
    const [result] = await db.query(
      `INSERT INTO transactions
         (transaction_number, transaction_type, transaction_date, amount, description, reference_type, reference_id)
       VALUES (?, 'expense', ?, ?, ?, ?, ?)`,
      [transaction_number, transaction_date, amount,
       description || null, reference_type || null, reference_id || null]
    );
    res.status(201).json({ success: true, message: "Expense created", transaction_number, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create expense", error: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query(
      "SELECT id, transaction_type FROM transactions WHERE id = ?", [id]
    );
    if (!existing) return res.status(404).json({ success: false, message: "Expense not found" });
    if (existing.transaction_type !== "expense") {
      return res.status(400).json({ success: false, message: "Record is not an expense transaction" });
    }
    await db.query("DELETE FROM transactions WHERE id = ?", [id]);
    res.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete expense", error: error.message });
  }
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

exports.getInvoiceSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*)                                                     AS total,
        SUM(CASE WHEN status='draft'     THEN 1 ELSE 0 END)         AS draft,
        SUM(CASE WHEN status='sent'      THEN 1 ELSE 0 END)         AS sent,
        SUM(CASE WHEN status='partial'   THEN 1 ELSE 0 END)         AS partial,
        SUM(CASE WHEN status='paid'      THEN 1 ELSE 0 END)         AS paid,
        SUM(CASE WHEN status='overdue'   THEN 1 ELSE 0 END)         AS overdue,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END)         AS cancelled,
        COALESCE(SUM(total_amount),   0)                             AS total_amount,
        COALESCE(SUM(paid_amount),    0)                             AS paid_amount,
        COALESCE(SUM(balance_amount), 0)                             AS outstanding
      FROM invoices
    `);
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch invoice summary", error: error.message });
  }
};

exports.getAllInvoices = async (req, res) => {
  try {
    const { status, from_date, to_date, invoice_type, customer_id } = req.query;
    const where = ["1=1"];
    const params = [];
    if (status)       { where.push("i.status = ?");        params.push(status); }
    if (invoice_type) { where.push("i.invoice_type = ?");  params.push(invoice_type); }
    if (from_date)    { where.push("i.invoice_date >= ?"); params.push(from_date); }
    if (to_date)      { where.push("i.invoice_date <= ?"); params.push(to_date); }
    if (customer_id)  { where.push("i.customer_id = ?");   params.push(customer_id); }

    const [rows] = await db.query(`
      SELECT i.id, i.invoice_number, i.invoice_type, i.invoice_date, i.due_date,
             i.subtotal, i.discount_amount, i.tax_amount,
             i.total_amount, i.paid_amount, i.balance_amount, i.status,
             c.business_name AS customer_name,
             v.business_name  AS vendor_name
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      LEFT JOIN vendors   v ON v.id = i.vendor_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.id DESC
    `, params);

    res.json({ success: true, count: rows.length, invoices: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch invoices", error: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[invoice]] = await db.query(`
      SELECT i.*,
             c.business_name AS customer_name, c.phone AS customer_phone,
             v.business_name  AS vendor_name
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      LEFT JOIN vendors   v ON v.id = i.vendor_id
      WHERE i.id = ?
    `, [id]);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    const [items] = await db.query(`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      LEFT JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
      ORDER BY ii.id ASC
    `, [id]);

    res.json({ success: true, invoice: { ...invoice, items } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch invoice", error: error.message });
  }
};

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ["draft", "sent", "partial", "paid", "overdue", "cancelled"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: `Valid statuses: ${valid.join(", ")}` });
    }
    const [[existing]] = await db.query("SELECT id FROM invoices WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Invoice not found" });
    await db.query("UPDATE invoices SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true, message: "Invoice status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update invoice status", error: error.message });
  }
};

// ─── Vendor Payments (procurement_payments) ───────────────────────────────────

exports.getVendorPaymentsSummary = async (req, res) => {
  try {
    const [[pp]] = await db.query(`
      SELECT
        COUNT(*)                                                              AS total_payments,
        COALESCE(SUM(amount), 0)                                              AS total_amount,
        SUM(CASE WHEN status='paid'      THEN 1 ELSE 0 END)                  AS paid_count,
        SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END)                  AS pending_count,
        SUM(CASE WHEN status='failed'    THEN 1 ELSE 0 END)                  AS failed_count,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END)                  AS cancelled_count,
        COALESCE(SUM(CASE WHEN status='paid'    THEN amount ELSE 0 END), 0)  AS paid_amount,
        COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END), 0)  AS pending_amount
      FROM procurement_payments
    `);
    res.json({ success: true, summary: pp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor payments summary", error: error.message });
  }
};

exports.getVendorPayments = async (req, res) => {
  try {
    const { vendor_id, status, from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (vendor_id) { where.push("pp.vendor_id = ?");      params.push(vendor_id); }
    if (status)    { where.push("pp.status = ?");          params.push(status); }
    if (from_date) { where.push("pp.payment_date >= ?");   params.push(from_date); }
    if (to_date)   { where.push("pp.payment_date <= ?");   params.push(to_date); }

    const [rows] = await db.query(`
      SELECT pp.id, pp.payment_date, pp.amount, pp.payment_mode, pp.reference_number,
             pp.status, pp.remarks,
             v.business_name AS vendor_name, v.vendor_code,
             po.po_number
      FROM procurement_payments pp
      LEFT JOIN vendors         v  ON v.id  = pp.vendor_id
      LEFT JOIN purchase_orders po ON po.id = pp.purchase_order_id
      WHERE ${where.join(" AND ")}
      ORDER BY pp.id DESC
    `, params);

    res.json({ success: true, count: rows.length, vendor_payments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor payments", error: error.message });
  }
};

// ─── Customer Outstanding ─────────────────────────────────────────────────────

exports.getCustomerOutstandingSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(DISTINCT i.customer_id)                                                          AS customers_count,
        COUNT(*)                                                                                AS invoice_count,
        COALESCE(SUM(i.balance_amount), 0)                                                     AS total_outstanding,
        COALESCE(SUM(CASE WHEN i.status='overdue' THEN i.balance_amount ELSE 0 END), 0)        AS overdue_amount,
        SUM(CASE WHEN i.status='overdue' THEN 1 ELSE 0 END)                                    AS overdue_count
      FROM invoices i
      WHERE i.balance_amount > 0 AND i.status NOT IN ('cancelled')
    `);

    const [topCustomers] = await db.query(`
      SELECT c.id, c.business_name AS customer_name, c.phone,
             COUNT(i.id) AS invoice_count,
             COALESCE(SUM(i.balance_amount), 0) AS outstanding_amount,
             MAX(i.due_date) AS latest_due_date
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.balance_amount > 0 AND i.status NOT IN ('cancelled')
      GROUP BY c.id, c.business_name, c.phone
      ORDER BY outstanding_amount DESC
      LIMIT 10
    `);

    res.json({ success: true, summary: totals, top_customers: topCustomers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch outstanding summary", error: error.message });
  }
};

exports.getCustomerOutstanding = async (req, res) => {
  try {
    const { customer_id, status } = req.query;
    const where = ["i.balance_amount > 0", "i.status NOT IN ('cancelled')"];
    const params = [];
    if (customer_id) { where.push("i.customer_id = ?"); params.push(customer_id); }
    if (status)      { where.push("i.status = ?");      params.push(status); }

    const [rows] = await db.query(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.status,
             i.total_amount, i.paid_amount, i.balance_amount,
             c.id AS customer_id, c.business_name AS customer_name, c.phone AS customer_phone
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.balance_amount DESC
    `, params);

    res.json({ success: true, count: rows.length, outstanding: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch customer outstanding", error: error.message });
  }
};

// ─── Finance Report (P&L Overview) ───────────────────────────────────────────

exports.getFinanceReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const startOfYear = `${new Date().getFullYear()}-01-01`;
    const start = from_date || startOfYear;
    const end   = to_date   || today;

    const [[revenue]] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0)   AS total_invoiced,
             COALESCE(SUM(paid_amount),  0)   AS total_collected,
             COALESCE(SUM(balance_amount), 0) AS total_outstanding
      FROM invoices
      WHERE invoice_type = 'sales' AND invoice_date BETWEEN ? AND ?
    `, [start, end]);

    const [[receipts]] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_received
      FROM payments
      WHERE customer_id IS NOT NULL AND status = 'success' AND payment_date BETWEEN ? AND ?
    `, [start, end]);

    const [[vendorPaid]] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_vendor_paid
      FROM procurement_payments
      WHERE status = 'paid' AND payment_date BETWEEN ? AND ?
    `, [start, end]);

    const [[expenses]] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM transactions
      WHERE transaction_type = 'expense' AND transaction_date BETWEEN ? AND ?
    `, [start, end]);

    const [[gstOutput]] = await db.query(`
      SELECT COALESCE(SUM(gi.cgst_amount + gi.sgst_amount + gi.igst_amount + gi.cess_amount), 0) AS total_gst_output
      FROM gst_invoices gi
      JOIN invoices i ON i.id = gi.invoice_id
      WHERE i.invoice_type = 'sales' AND i.invoice_date BETWEEN ? AND ?
    `, [start, end]);

    const [[gstInput]] = await db.query(`
      SELECT COALESCE(SUM(gi.cgst_amount + gi.sgst_amount + gi.igst_amount + gi.cess_amount), 0) AS total_gst_input
      FROM gst_invoices gi
      JOIN invoices i ON i.id = gi.invoice_id
      WHERE i.invoice_type = 'purchase' AND i.invoice_date BETWEEN ? AND ?
    `, [start, end]);

    const netProfit = (
      parseFloat(revenue.total_collected) -
      parseFloat(vendorPaid.total_vendor_paid) -
      parseFloat(expenses.total_expenses)
    ).toFixed(2);

    res.json({
      success: true,
      period: { from: start, to: end },
      report: {
        revenue,
        receipts,
        vendor_payments: vendorPaid,
        expenses,
        gst_output: gstOutput,
        gst_input:  gstInput,
        net_gst_payable: Math.max(0, parseFloat(gstOutput.total_gst_output) - parseFloat(gstInput.total_gst_input)).toFixed(2),
        net_profit: netProfit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate finance report", error: error.message });
  }
};
