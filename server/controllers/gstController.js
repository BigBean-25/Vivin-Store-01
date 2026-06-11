const db = require("../config/db");

// ─── GST Summary ──────────────────────────────────────────────────────────────
// Primary source: invoices (always populated).
// Secondary: gst_invoices (CGST/SGST/IGST breakdown, may be empty).

exports.getGSTSummary = async (req, res) => {
  try {
    // Aggregate from invoices table (uses tax_amount which always exists)
    const [[sales]] = await db.query(`
      SELECT
        COUNT(*)                          AS total_invoices,
        COALESCE(SUM(subtotal),    0)     AS total_taxable,
        COALESCE(SUM(tax_amount),  0)     AS total_tax,
        COALESCE(SUM(total_amount),0)     AS total_billed
      FROM invoices
      WHERE invoice_type = 'sales' AND status != 'cancelled'
    `);

    const [[purchases]] = await db.query(`
      SELECT
        COUNT(*)                          AS total_invoices,
        COALESCE(SUM(subtotal),    0)     AS total_taxable,
        COALESCE(SUM(tax_amount),  0)     AS total_tax,
        COALESCE(SUM(total_amount),0)     AS total_billed
      FROM invoices
      WHERE invoice_type = 'purchase' AND status != 'cancelled'
    `);

    // CGST/SGST/IGST breakdown from gst_invoices (may return 0 if table is empty)
    const [[gst_breakdown]] = await db.query(`
      SELECT
        COUNT(*)                                                                AS linked_invoices,
        COALESCE(SUM(cgst_amount),  0)                                          AS total_cgst,
        COALESCE(SUM(sgst_amount),  0)                                          AS total_sgst,
        COALESCE(SUM(igst_amount),  0)                                          AS total_igst,
        COALESCE(SUM(cess_amount),  0)                                          AS total_cess,
        COALESCE(SUM(cgst_amount + sgst_amount + igst_amount + cess_amount), 0) AS total_tax
      FROM gst_invoices
    `);

    const [[itc]] = await db.query(`
      SELECT
        COUNT(*)                           AS total_claims,
        COALESCE(SUM(eligible_amount), 0)  AS eligible,
        COALESCE(SUM(claimed_amount),  0)  AS claimed
      FROM itc_claims
    `);

    res.json({ success: true, summary: { sales, purchases, gst_breakdown, itc } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch GST summary", error: error.message });
  }
};

// ─── Combined GST Report (monthly breakdown) ──────────────────────────────────

exports.getGSTReports = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["i.status != 'cancelled'"];
    const params = [];
    if (from_date) { where.push("i.invoice_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("i.invoice_date <= ?"); params.push(to_date); }

    const [monthly] = await db.query(`
      SELECT
        YEAR(i.invoice_date)  AS year,
        MONTH(i.invoice_date) AS month,
        SUM(CASE WHEN i.invoice_type='sales'    THEN 1 ELSE 0 END) AS sales_count,
        SUM(CASE WHEN i.invoice_type='purchase' THEN 1 ELSE 0 END) AS purchase_count,
        COALESCE(SUM(CASE WHEN i.invoice_type='sales'    THEN i.subtotal    ELSE 0 END), 0) AS sales_taxable,
        COALESCE(SUM(CASE WHEN i.invoice_type='sales'    THEN i.tax_amount  ELSE 0 END), 0) AS sales_tax,
        COALESCE(SUM(CASE WHEN i.invoice_type='purchase' THEN i.subtotal    ELSE 0 END), 0) AS purchase_taxable,
        COALESCE(SUM(CASE WHEN i.invoice_type='purchase' THEN i.tax_amount  ELSE 0 END), 0) AS purchase_tax,
        COALESCE(SUM(CASE WHEN i.invoice_type='sales'    THEN COALESCE(gi.cgst_amount, 0) ELSE 0 END), 0) AS sales_cgst,
        COALESCE(SUM(CASE WHEN i.invoice_type='sales'    THEN COALESCE(gi.sgst_amount, 0) ELSE 0 END), 0) AS sales_sgst,
        COALESCE(SUM(CASE WHEN i.invoice_type='sales'    THEN COALESCE(gi.igst_amount, 0) ELSE 0 END), 0) AS sales_igst,
        COALESCE(SUM(CASE WHEN i.invoice_type='purchase' THEN COALESCE(gi.cgst_amount, 0) ELSE 0 END), 0) AS purchase_cgst,
        COALESCE(SUM(CASE WHEN i.invoice_type='purchase' THEN COALESCE(gi.sgst_amount, 0) ELSE 0 END), 0) AS purchase_sgst,
        COALESCE(SUM(CASE WHEN i.invoice_type='purchase' THEN COALESCE(gi.igst_amount, 0) ELSE 0 END), 0) AS purchase_igst
      FROM invoices i
      LEFT JOIN gst_invoices gi ON gi.invoice_id = i.id
      WHERE ${where.join(" AND ")}
      GROUP BY YEAR(i.invoice_date), MONTH(i.invoice_date)
      ORDER BY YEAR(i.invoice_date) DESC, MONTH(i.invoice_date) DESC
    `, params);

    res.json({ success: true, count: monthly.length, reports: monthly });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch GST reports", error: error.message });
  }
};

// ─── Sales GST (Output Tax) ───────────────────────────────────────────────────
// Primary: invoices WHERE invoice_type='sales'
// LEFT JOIN gst_invoices for CGST/SGST/IGST breakdown (shows 0 if not linked)

exports.getSalesGST = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["i.invoice_type = 'sales'", "i.status != 'cancelled'"];
    const params = [];
    if (from_date) { where.push("i.invoice_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("i.invoice_date <= ?"); params.push(to_date); }

    const [rows] = await db.query(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.subtotal,
             i.tax_amount, i.total_amount, i.status,
             c.business_name AS customer_name, c.gst_number AS customer_gstin,
             gi.gst_invoice_number, gi.gstin, gi.place_of_supply, gi.reverse_charge,
             COALESCE(gi.taxable_value,  i.subtotal)   AS taxable_value,
             COALESCE(gi.cgst_amount,    0)             AS cgst_amount,
             COALESCE(gi.sgst_amount,    0)             AS sgst_amount,
             COALESCE(gi.igst_amount,    0)             AS igst_amount,
             COALESCE(gi.cess_amount,    0)             AS cess_amount
      FROM invoices i
      LEFT JOIN gst_invoices gi ON gi.invoice_id = i.id
      LEFT JOIN customers    c  ON c.id = i.customer_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.id DESC
    `, params);

    res.json({ success: true, count: rows.length, sales: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch sales GST", error: error.message });
  }
};

// ─── Purchase GST (Input Tax / ITC) ──────────────────────────────────────────
// Primary: invoices WHERE invoice_type='purchase'
// LEFT JOIN gst_invoices for breakdown

exports.getPurchasesGST = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["i.invoice_type = 'purchase'", "i.status != 'cancelled'"];
    const params = [];
    if (from_date) { where.push("i.invoice_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("i.invoice_date <= ?"); params.push(to_date); }

    const [rows] = await db.query(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.subtotal,
             i.tax_amount, i.total_amount, i.status,
             v.business_name AS vendor_name, v.gst_number AS vendor_gstin,
             gi.gst_invoice_number, gi.gstin, gi.place_of_supply, gi.reverse_charge,
             COALESCE(gi.taxable_value,  i.subtotal)   AS taxable_value,
             COALESCE(gi.cgst_amount,    0)             AS cgst_amount,
             COALESCE(gi.sgst_amount,    0)             AS sgst_amount,
             COALESCE(gi.igst_amount,    0)             AS igst_amount,
             COALESCE(gi.cess_amount,    0)             AS cess_amount
      FROM invoices i
      LEFT JOIN gst_invoices gi ON gi.invoice_id = i.id
      LEFT JOIN vendors      v  ON v.id = i.vendor_id
      WHERE ${where.join(" AND ")}
      ORDER BY i.id DESC
    `, params);

    res.json({ success: true, count: rows.length, purchases: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch purchase GST", error: error.message });
  }
};

// ─── Input vs Output (Tax Liability) ─────────────────────────────────────────
// Uses invoices as primary; CGST/SGST/IGST from gst_invoices via LEFT JOIN

exports.getInputOutput = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const dateWhere = from_date && to_date ? "AND i.invoice_date BETWEEN ? AND ?" : "";
    const dateParams = from_date && to_date ? [from_date, to_date] : [];

    const [[output]] = await db.query(`
      SELECT
        COALESCE(SUM(i.subtotal),                        0) AS taxable_value,
        COALESCE(SUM(COALESCE(gi.cgst_amount, 0)),       0) AS cgst,
        COALESCE(SUM(COALESCE(gi.sgst_amount, 0)),       0) AS sgst,
        COALESCE(SUM(COALESCE(gi.igst_amount, 0)),       0) AS igst,
        COALESCE(SUM(COALESCE(gi.cess_amount, 0)),       0) AS cess,
        COALESCE(SUM(i.tax_amount),                      0) AS total_tax
      FROM invoices i
      LEFT JOIN gst_invoices gi ON gi.invoice_id = i.id
      WHERE i.invoice_type = 'sales' AND i.status != 'cancelled' ${dateWhere}
    `, dateParams);

    const [[input]] = await db.query(`
      SELECT
        COALESCE(SUM(i.subtotal),                        0) AS taxable_value,
        COALESCE(SUM(COALESCE(gi.cgst_amount, 0)),       0) AS cgst,
        COALESCE(SUM(COALESCE(gi.sgst_amount, 0)),       0) AS sgst,
        COALESCE(SUM(COALESCE(gi.igst_amount, 0)),       0) AS igst,
        COALESCE(SUM(COALESCE(gi.cess_amount, 0)),       0) AS cess,
        COALESCE(SUM(i.tax_amount),                      0) AS total_tax
      FROM invoices i
      LEFT JOIN gst_invoices gi ON gi.invoice_id = i.id
      WHERE i.invoice_type = 'purchase' AND i.status != 'cancelled' ${dateWhere}
    `, dateParams);

    const net = {
      cgst:  Math.max(0, parseFloat(output.cgst)      - parseFloat(input.cgst)).toFixed(2),
      sgst:  Math.max(0, parseFloat(output.sgst)      - parseFloat(input.sgst)).toFixed(2),
      igst:  Math.max(0, parseFloat(output.igst)      - parseFloat(input.igst)).toFixed(2),
      cess:  Math.max(0, parseFloat(output.cess)      - parseFloat(input.cess)).toFixed(2),
      total: Math.max(0, parseFloat(output.total_tax) - parseFloat(input.total_tax)).toFixed(2),
    };

    res.json({ success: true, output_tax: output, input_tax: input, net_payable: net });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch input/output GST", error: error.message });
  }
};

// ─── GST Rates ────────────────────────────────────────────────────────────────

exports.getGSTRates = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, hsn_code, description, cgst_rate, sgst_rate, igst_rate, cess_rate, status, created_at FROM gst_rates ORDER BY id ASC"
    );
    res.json({ success: true, count: rows.length, rates: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch GST rates", error: error.message });
  }
};

// ─── GSTR1 Reports ───────────────────────────────────────────────────────────

exports.getGSTR1Reports = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, period_month, period_year, status, generated_by, created_at FROM gstr1_reports ORDER BY id DESC"
    );
    res.json({ success: true, count: rows.length, reports: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch GSTR1 reports", error: error.message });
  }
};

// ─── GSTR3B Reports ──────────────────────────────────────────────────────────

exports.getGSTR3BReports = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, period_month, period_year, tax_payable, status, generated_by, created_at FROM gstr3b_reports ORDER BY id DESC"
    );
    res.json({ success: true, count: rows.length, reports: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch GSTR3B reports", error: error.message });
  }
};

// ─── Tax Transactions ─────────────────────────────────────────────────────────

exports.getTaxTransactions = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("transaction_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("transaction_date <= ?"); params.push(to_date); }

    const [rows] = await db.query(
      `SELECT id, transaction_date, reference_type, reference_id,
              taxable_value, cgst_amount, sgst_amount, igst_amount, cess_amount, created_at
       FROM tax_transactions
       WHERE ${where.join(" AND ")}
       ORDER BY id DESC`,
      params
    );
    res.json({ success: true, count: rows.length, transactions: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tax transactions", error: error.message });
  }
};
