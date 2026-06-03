const db = require("../config/db");

const safeNumber = (value) => Number(value || 0);

const cleanDate = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const getDateFilter = (alias, fromDate, toDate, columnName = "created_at") => {
  const conditions = [];
  const values = [];

  const fullColumn = `${alias}.${columnName}`;

  if (fromDate) {
    conditions.push(`${fullColumn} >= ?`);
    values.push(cleanDate(fromDate));
  }

  if (toDate) {
    conditions.push(`${fullColumn} <= ?`);
    values.push(cleanDate(toDate));
  }

  return {
    sql: conditions.length ? `AND ${conditions.join(" AND ")}` : "",
    values,
  };
};

exports.getProcurementReportSummary = async (req, res) => {
  try {
    const { from_date = "", to_date = "" } = req.query;

    const poFilter = getDateFilter("po", from_date, to_date, "po_date");
    const grnFilter = getDateFilter("gr", from_date, to_date, "receipt_date");
    const paymentFilter = getDateFilter("pp", from_date, to_date, "payment_date");
    const returnFilter = getDateFilter("pr", from_date, to_date, "return_date");

    const [[poSummary], [grnSummary], [paymentSummary], [returnSummary]] =
      await Promise.all([
        db.query(
          `
            SELECT
              COUNT(*) AS total_purchase_orders,
              COALESCE(SUM(total_amount), 0) AS total_po_value,
              COALESCE(SUM(CASE WHEN status IN ('approved', 'sent', 'received', 'partially_received') THEN total_amount ELSE 0 END), 0) AS active_po_value,
              COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END), 0) AS cancelled_po_value
            FROM purchase_orders po
            WHERE 1 = 1
            ${poFilter.sql}
          `,
          poFilter.values
        ),

        db.query(
          `
            SELECT
              COUNT(DISTINCT gr.id) AS total_grns,
              COALESCE(SUM(gri.accepted_qty * gri.unit_price), 0) AS total_grn_value,
              SUM(CASE WHEN gr.status = 'posted' THEN 1 ELSE 0 END) AS posted_grns
            FROM goods_receipts gr
            LEFT JOIN goods_receipt_items gri ON gr.id = gri.goods_receipt_id
            WHERE 1 = 1
            ${grnFilter.sql}
          `,
          grnFilter.values
        ),

        db.query(
          `
            SELECT
              COUNT(*) AS total_payments,
              COALESCE(SUM(amount), 0) AS total_payment_value,
              COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_value,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payment_value
            FROM procurement_payments pp
            WHERE 1 = 1
            ${paymentFilter.sql}
          `,
          paymentFilter.values
        ),

        db.query(
          `
            SELECT
              COUNT(DISTINCT pr.id) AS total_returns,
              COALESCE(SUM(pri.quantity), 0) AS total_return_qty
            FROM procurement_returns pr
            LEFT JOIN procurement_return_items pri 
              ON pr.id = pri.procurement_return_id
            WHERE 1 = 1
            ${returnFilter.sql}
          `,
          returnFilter.values
        ),
      ]);

    const po = poSummary[0] || {};
    const grn = grnSummary[0] || {};
    const payment = paymentSummary[0] || {};
    const returns = returnSummary[0] || {};

    const totalPoValue = safeNumber(po.total_po_value);
    const paidValue = safeNumber(payment.paid_value);
    const outstandingValue = Math.max(totalPoValue - paidValue, 0);

    res.json({
      success: true,
      summary: {
        purchase_orders: po,
        goods_receipts: grn,
        payments: payment,
        returns,
        finance: {
          total_po_value: totalPoValue,
          paid_value: paidValue,
          outstanding_value: outstandingValue,
          total_grn_value: safeNumber(grn.total_grn_value),
          total_return_qty: safeNumber(returns.total_return_qty),
        },
      },
    });
  } catch (error) {
    console.error("Procurement report summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement report summary",
      error: error.message,
    });
  }
};

exports.getMonthlyProcurementReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [rows] = await db.query(
      `
        SELECT
          DATE_FORMAT(po.po_date, '%Y-%m') AS month_key,
          DATE_FORMAT(po.po_date, '%M %Y') AS month_name,
          COUNT(po.id) AS total_purchase_orders,
          COALESCE(SUM(po.total_amount), 0) AS total_po_value,
          COALESCE(SUM(CASE WHEN po.status = 'received' THEN po.total_amount ELSE 0 END), 0) AS received_po_value,
          COALESCE(SUM(CASE WHEN po.status = 'cancelled' THEN po.total_amount ELSE 0 END), 0) AS cancelled_po_value,
          COALESCE(SUM(pp.paid_amount), 0) AS paid_value
        FROM purchase_orders po
        LEFT JOIN (
          SELECT
            purchase_order_id,
            SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid_amount
          FROM procurement_payments
          GROUP BY purchase_order_id
        ) pp ON po.id = pp.purchase_order_id
        WHERE YEAR(po.po_date) = ?
        GROUP BY DATE_FORMAT(po.po_date, '%Y-%m'), DATE_FORMAT(po.po_date, '%M %Y')
        ORDER BY month_key ASC
      `,
      [year]
    );

    const report = rows.map((row) => ({
      ...row,
      outstanding_value: Math.max(
        safeNumber(row.total_po_value) - safeNumber(row.paid_value),
        0
      ),
    }));

    res.json({
      success: true,
      year,
      report,
      data: report,
    });
  } catch (error) {
    console.error("Monthly procurement report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load monthly procurement report",
      error: error.message,
    });
  }
};

exports.getVendorProcurementReport = async (req, res) => {
  try {
    const { from_date = "", to_date = "", vendor_id = "" } = req.query;

    const poFilter = getDateFilter("po", from_date, to_date, "po_date");

    const values = [...poFilter.values];

    let vendorSql = "";

    if (vendor_id) {
      vendorSql = "AND po.vendor_id = ?";
      values.push(vendor_id);
    }

    const [rows] = await db.query(
      `
        SELECT
          v.id AS vendor_id,
          v.business_name AS vendor_name,
          COUNT(DISTINCT po.id) AS total_purchase_orders,
          COALESCE(SUM(po.total_amount), 0) AS total_po_value,
          COALESCE(SUM(CASE WHEN po.status IN ('received', 'partially_received') THEN po.total_amount ELSE 0 END), 0) AS received_value,
          COALESCE(SUM(CASE WHEN po.status = 'cancelled' THEN po.total_amount ELSE 0 END), 0) AS cancelled_value,
          COALESCE(SUM(pp.paid_amount), 0) AS paid_value,
          COALESCE(MAX(pr.return_qty), 0) AS return_qty
        FROM vendors v
        INNER JOIN purchase_orders po ON v.id = po.vendor_id
        LEFT JOIN (
          SELECT
            purchase_order_id,
            SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid_amount
          FROM procurement_payments
          GROUP BY purchase_order_id
        ) pp ON po.id = pp.purchase_order_id
        LEFT JOIN (
          SELECT
            pr.vendor_id,
            SUM(pri.quantity) AS return_qty
          FROM procurement_returns pr
          LEFT JOIN procurement_return_items pri
            ON pr.id = pri.procurement_return_id
          GROUP BY pr.vendor_id
        ) pr ON v.id = pr.vendor_id
        WHERE 1 = 1
        ${poFilter.sql}
        ${vendorSql}
        GROUP BY v.id, v.business_name
        ORDER BY total_po_value DESC
      `,
      values
    );

    const report = rows.map((row) => ({
      ...row,
      outstanding_value: Math.max(
        safeNumber(row.total_po_value) - safeNumber(row.paid_value),
        0
      ),
    }));

    res.json({
      success: true,
      count: report.length,
      report,
      data: report,
    });
  } catch (error) {
    console.error("Vendor procurement report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor procurement report",
      error: error.message,
    });
  }
};

exports.getProductProcurementReport = async (req, res) => {
  try {
    const {
      from_date = "",
      to_date = "",
      product_id = "",
      vendor_id = "",
    } = req.query;

    const poFilter = getDateFilter("po", from_date, to_date, "po_date");

    const values = [...poFilter.values];

    let extraSql = "";

    if (product_id) {
      extraSql += " AND poi.product_id = ?";
      values.push(product_id);
    }

    if (vendor_id) {
      extraSql += " AND po.vendor_id = ?";
      values.push(vendor_id);
    }

    const [rows] = await db.query(
      `
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.product_code,
          p.sku,
          COUNT(DISTINCT po.id) AS total_purchase_orders,
          COALESCE(SUM(poi.quantity), 0) AS total_ordered_qty,
          COALESCE(SUM(poi.received_quantity), 0) AS total_received_qty,
          COALESCE(SUM(poi.total_amount), 0) AS total_purchase_value,
          COALESCE(AVG(poi.unit_price), 0) AS avg_unit_price,
          MIN(poi.unit_price) AS min_unit_price,
          MAX(poi.unit_price) AS max_unit_price
        FROM purchase_order_items poi
        INNER JOIN purchase_orders po ON poi.purchase_order_id = po.id
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE 1 = 1
        ${poFilter.sql}
        ${extraSql}
        GROUP BY p.id, p.name, p.product_code, p.sku
        ORDER BY total_purchase_value DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      report: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Product procurement report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load product procurement report",
      error: error.message,
    });
  }
};

exports.getOutstandingVendorPayments = async (req, res) => {
  try {
    const { vendor_id = "" } = req.query;

    const values = [];
    let vendorSql = "";

    if (vendor_id) {
      vendorSql = "WHERE report.vendor_id = ?";
      values.push(vendor_id);
    }

    const [rows] = await db.query(
      `
        SELECT *
        FROM (
          SELECT
            v.id AS vendor_id,
            v.business_name AS vendor_name,
            COUNT(po.id) AS total_purchase_orders,
            COALESCE(SUM(po.total_amount), 0) AS total_po_value,
            COALESCE(SUM(pp.paid_amount), 0) AS paid_value,
            GREATEST(
              COALESCE(SUM(po.total_amount), 0) - COALESCE(SUM(pp.paid_amount), 0),
              0
            ) AS outstanding_value
          FROM vendors v
          INNER JOIN purchase_orders po ON v.id = po.vendor_id
          LEFT JOIN (
            SELECT
              purchase_order_id,
              SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid_amount
            FROM procurement_payments
            GROUP BY purchase_order_id
          ) pp ON po.id = pp.purchase_order_id
          WHERE po.status != 'cancelled'
          GROUP BY v.id, v.business_name
        ) report
        ${vendorSql}
        HAVING outstanding_value > 0
        ORDER BY outstanding_value DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      report: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Outstanding vendor payments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load outstanding vendor payments",
      error: error.message,
    });
  }
};

exports.getProcurementStatusReport = async (req, res) => {
  try {
    const [
      [rfqRows],
      [quotationRows],
      [poRows],
      [grnRows],
      [paymentRows],
      [returnRows],
    ] = await Promise.all([
      db.query(`
        SELECT 
          status, 
          COUNT(*) AS total
        FROM rfqs
        GROUP BY status
      `),

      db.query(`
        SELECT 
          status, 
          COUNT(*) AS total, 
          COALESCE(SUM(total_amount), 0) AS amount
        FROM quotations
        GROUP BY status
      `),

      db.query(`
        SELECT 
          status, 
          COUNT(*) AS total, 
          COALESCE(SUM(total_amount), 0) AS amount
        FROM purchase_orders
        GROUP BY status
      `),

      db.query(`
        SELECT
          gr.status,
          COUNT(DISTINCT gr.id) AS total,
          COALESCE(SUM(gri.accepted_qty * gri.unit_price), 0) AS amount
        FROM goods_receipts gr
        LEFT JOIN goods_receipt_items gri
          ON gr.id = gri.goods_receipt_id
        GROUP BY gr.status
      `),

      db.query(`
        SELECT 
          status, 
          COUNT(*) AS total, 
          COALESCE(SUM(amount), 0) AS amount
        FROM procurement_payments
        GROUP BY status
      `),

      db.query(`
        SELECT
          pr.status,
          COUNT(DISTINCT pr.id) AS total,
          COALESCE(SUM(pri.quantity), 0) AS quantity
        FROM procurement_returns pr
        LEFT JOIN procurement_return_items pri
          ON pr.id = pri.procurement_return_id
        GROUP BY pr.status
      `),
    ]);

    res.json({
      success: true,
      report: {
        rfqs: rfqRows,
        quotations: quotationRows,
        purchase_orders: poRows,
        goods_receipts: grnRows,
        payments: paymentRows,
        returns: returnRows,
      },
    });
  } catch (error) {
    console.error("Procurement status report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement status report",
      error: error.message,
    });
  }
};
