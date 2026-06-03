const db = require("../config/db");

const safeNumber = (value) => Number(value || 0);

const emptyStats = {
  count: 0,
  amount: 0,
};

const runQuery = async (sql, params = []) => {
  const [rows] = await db.query(sql, params);
  return rows;
};

exports.getProcurementDashboardSummary = async (req, res) => {
  try {
    const [
      rfqRows,
      quotationRows,
      poRows,
      grnRows,
      paymentRows,
      returnRows,
      recentPoRows,
      recentQuotationRows,
      pendingActionRows,
    ] = await Promise.all([
      runQuery(`
        SELECT
          COUNT(*) AS total_rfqs,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_rfqs,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_rfqs,
          SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) AS quoted_rfqs,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_rfqs,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_rfqs
        FROM rfqs
      `),

      runQuery(`
        SELECT
          COUNT(*) AS total_quotations,
          COALESCE(SUM(total_amount), 0) AS total_quotation_value,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0) AS pending_quotation_value,
          COALESCE(SUM(CASE WHEN status = 'accepted' THEN total_amount ELSE 0 END), 0) AS accepted_quotation_value,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_quotations,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_quotations,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_quotations,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_quotations
        FROM quotations
      `),

      runQuery(`
        SELECT
          COUNT(*) AS total_purchase_orders,
          COALESCE(SUM(total_amount), 0) AS total_po_value,
          COALESCE(SUM(CASE WHEN status IN ('draft', 'pending_approval') THEN total_amount ELSE 0 END), 0) AS pending_po_value,
          COALESCE(SUM(CASE WHEN status IN ('approved', 'sent') THEN total_amount ELSE 0 END), 0) AS approved_po_value,
          SUM(CASE WHEN status IN ('draft', 'pending_approval') THEN 1 ELSE 0 END) AS pending_purchase_orders,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_purchase_orders,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_purchase_orders,
          SUM(CASE WHEN status IN ('received', 'partially_received') THEN 1 ELSE 0 END) AS received_purchase_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_purchase_orders
        FROM purchase_orders
      `),

      runQuery(`
        SELECT
          COUNT(DISTINCT gr.id) AS total_grns,
          COALESCE(SUM(gri.accepted_qty * gri.unit_price), 0) AS total_grn_value,
          COUNT(DISTINCT CASE WHEN gr.status = 'draft' THEN gr.id END) AS draft_grns,
          COUNT(DISTINCT CASE WHEN gr.status = 'verified' THEN gr.id END) AS verified_grns,
          COUNT(DISTINCT CASE WHEN gr.status = 'posted' THEN gr.id END) AS posted_grns,
          COUNT(DISTINCT CASE WHEN gr.status = 'cancelled' THEN gr.id END) AS cancelled_grns
        FROM goods_receipts gr
        LEFT JOIN goods_receipt_items gri 
          ON gr.id = gri.goods_receipt_id
      `),

      runQuery(`
        SELECT
          COUNT(*) AS total_payments,
          COALESCE(SUM(amount), 0) AS total_payment_value,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_value,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payment_value,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_payments,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_payments,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_payments
        FROM procurement_payments
      `),

      runQuery(`
        SELECT
          COUNT(DISTINCT pr.id) AS total_returns,
          COALESCE(SUM(pri.quantity), 0) AS total_return_qty,
          COUNT(DISTINCT CASE WHEN pr.status = 'draft' THEN pr.id END) AS draft_returns,
          COUNT(DISTINCT CASE WHEN pr.status = 'approved' THEN pr.id END) AS approved_returns,
          COUNT(DISTINCT CASE WHEN pr.status = 'sent' THEN pr.id END) AS sent_returns,
          COUNT(DISTINCT CASE WHEN pr.status = 'closed' THEN pr.id END) AS closed_returns
        FROM procurement_returns pr
        LEFT JOIN procurement_return_items pri
          ON pr.id = pri.procurement_return_id
      `),

      runQuery(`
        SELECT
          po.id,
          po.po_number,
          po.po_date,
          po.total_amount,
          po.status,
          v.business_name AS vendor_name,
          w.name AS warehouse_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN warehouses w ON po.warehouse_id = w.id
        ORDER BY po.id DESC
        LIMIT 8
      `),

      runQuery(`
        SELECT
          q.id,
          q.quotation_number,
          q.quotation_date,
          q.total_amount,
          q.status,
          v.business_name AS vendor_name,
          r.rfq_number
        FROM quotations q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        LEFT JOIN rfqs r ON q.rfq_id = r.id
        ORDER BY q.id DESC
        LIMIT 8
      `),

      runQuery(`
        SELECT
          'RFQ Pending Quote' AS action_type,
          id,
          rfq_number AS reference_number,
          title AS title,
          required_date AS action_date,
          status
        FROM rfqs
        WHERE status IN ('draft', 'sent')

        UNION ALL

        SELECT
          'Quotation Pending Decision' AS action_type,
          q.id,
          q.quotation_number AS reference_number,
          v.business_name AS title,
          q.valid_until AS action_date,
          q.status
        FROM quotations q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        WHERE q.status = 'pending'

        UNION ALL

        SELECT
          'PO Pending GRN' AS action_type,
          po.id,
          po.po_number AS reference_number,
          v.business_name AS title,
          po.expected_delivery_date AS action_date,
          po.status
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.status IN ('approved', 'sent')

        ORDER BY action_date ASC
        LIMIT 12
      `),
    ]);

    const rfq = rfqRows[0] || {};
    const quotation = quotationRows[0] || {};
    const po = poRows[0] || {};
    const grn = grnRows[0] || {};
    const payment = paymentRows[0] || {};
    const returns = returnRows[0] || {};

    const totalPoValue = safeNumber(po.total_po_value);
    const paidValue = safeNumber(payment.paid_value);
    const outstandingValue = Math.max(totalPoValue - paidValue, 0);

    res.json({
      success: true,
      summary: {
        rfq,
        quotation,
        purchase_order: po,
        goods_receipt: grn,
        payment,
        return: returns,
        finance: {
          total_po_value: totalPoValue,
          paid_value: paidValue,
          outstanding_value: outstandingValue,
          total_grn_value: safeNumber(grn.total_grn_value),
          total_quotation_value: safeNumber(quotation.total_quotation_value),
        },
      },
      cards: {
        rfqs: {
          count: safeNumber(rfq.total_rfqs),
          pending: safeNumber(rfq.draft_rfqs) + safeNumber(rfq.sent_rfqs),
        },
        quotations: {
          count: safeNumber(quotation.total_quotations),
          amount: safeNumber(quotation.total_quotation_value),
          pending: safeNumber(quotation.pending_quotations),
        },
        purchase_orders: {
          count: safeNumber(po.total_purchase_orders),
          amount: totalPoValue,
          pending: safeNumber(po.pending_purchase_orders),
        },
        goods_receipts: {
          count: safeNumber(grn.total_grns),
          amount: safeNumber(grn.total_grn_value),
          posted: safeNumber(grn.posted_grns),
        },
        payments: {
          count: safeNumber(payment.total_payments),
          paid: paidValue,
          pending: safeNumber(payment.pending_payment_value),
        },
        returns: {
          count: safeNumber(returns.total_returns),
          qty: safeNumber(returns.total_return_qty),
        },
      },
      recent: {
        purchase_orders: recentPoRows,
        quotations: recentQuotationRows,
        pending_actions: pendingActionRows,
      },
    });
  } catch (error) {
    console.error("Procurement dashboard summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement dashboard summary",
      error: error.message,
    });
  }
};
