const db = require("../config/db");

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const currentYear = () => new Date().getFullYear();
const currentMonth = () => new Date().getMonth() + 1;

const safeQuery = async (sql, values = [], fallback = []) => {
  try {
    const [rows] = await db.query(sql, values);
    return rows;
  } catch (error) {
    console.error("KPI optional query skipped:", error.message);
    return fallback;
  }
};

const getPeriodLabel = (year, month) => {
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

const getLastMonths = (count = 6) => {
  const result = [];
  const date = new Date();

  for (let i = count - 1; i >= 0; i -= 1) {
    const current = new Date(date.getFullYear(), date.getMonth() - i, 1);

    result.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      label: getPeriodLabel(current.getFullYear(), current.getMonth() + 1),
    });
  }

  return result;
};

const getPurchaseSummary = async (year, month) => {
  const [[row]] = await db.query(
    `
      SELECT
        COUNT(*) AS total_purchase_orders,
        COALESCE(SUM(total_amount), 0) AS total_purchase_value,

        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_orders,
        SUM(CASE WHEN status = 'ordered' THEN 1 ELSE 0 END) AS ordered_orders,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) AS received_orders,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_orders,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending_po_orders,

        COUNT(DISTINCT vendor_id) AS active_vendors
      FROM purchase_orders
      WHERE status != 'cancelled'
        AND YEAR(po_date) = ?
        AND MONTH(po_date) = ?
    `,
    [year, month]
  );

  return row || {};
};

const getPaymentSummary = async (year, month) => {
  const [[row]] = await db.query(
    `
      SELECT
        COUNT(*) AS total_payments,
        COALESCE(SUM(amount), 0) AS total_paid_value
      FROM procurement_payments
      WHERE status = 'paid'
        AND YEAR(payment_date) = ?
        AND MONTH(payment_date) = ?
    `,
    [year, month]
  );

  return row || {};
};

const getReturnSummary = async (year, month) => {
  const [[row]] = await db.query(
    `
      SELECT
        COUNT(DISTINCT pr.id) AS total_returns,
        COALESCE(SUM(pri.quantity * COALESCE(poi.unit_price, 0)), 0) AS total_return_value
      FROM procurement_returns pr
      LEFT JOIN procurement_return_items pri
        ON pr.id = pri.procurement_return_id
      LEFT JOIN purchase_order_items poi
        ON pr.purchase_order_id = poi.purchase_order_id
        AND pri.product_id = poi.product_id
      WHERE pr.status IN ('approved', 'sent', 'closed')
        AND YEAR(pr.return_date) = ?
        AND MONTH(pr.return_date) = ?
    `,
    [year, month]
  );

  return row || {};
};

const getDeliverySummary = async (year, month) => {
  const [[row]] = await db.query(
    `
      SELECT
        COUNT(DISTINCT gr.id) AS total_receipts,

        SUM(
          CASE
            WHEN po.expected_delivery_date IS NOT NULL
             AND gr.receipt_date IS NOT NULL
             AND DATE(gr.receipt_date) <= DATE(po.expected_delivery_date)
            THEN 1 ELSE 0
          END
        ) AS on_time_receipts,

        SUM(
          CASE
            WHEN po.expected_delivery_date IS NOT NULL
             AND gr.receipt_date IS NOT NULL
             AND DATE(gr.receipt_date) > DATE(po.expected_delivery_date)
            THEN 1 ELSE 0
          END
        ) AS delayed_receipts
      FROM goods_receipts gr
      LEFT JOIN purchase_orders po
        ON gr.purchase_order_id = po.id
      WHERE YEAR(gr.receipt_date) = ?
        AND MONTH(gr.receipt_date) = ?
    `,
    [year, month]
  );

  return row || {};
};

const getApprovalSummary = async (year, month) => {
  const rows = await safeQuery(
    `
      SELECT
        COUNT(*) AS total_approvals,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved_approvals,
        SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_approvals,
        COALESCE(SUM(CASE WHEN approval_status = 'pending' THEN amount ELSE 0 END), 0) AS pending_approval_amount
      FROM procurement_approvals
      WHERE YEAR(requested_at) = ?
        AND MONTH(requested_at) = ?
    `,
    [year, month],
    [{}]
  );

  return rows[0] || {};
};

const getBudgetSummary = async (year, month) => {
  const rows = await safeQuery(
    `
      SELECT
        COUNT(*) AS total_budgets,
        COALESCE(SUM(budget_amount), 0) AS total_budget_amount
      FROM procurement_budgets
      WHERE status = 'active'
        AND budget_year = ?
        AND budget_month = ?
    `,
    [year, month],
    [{}]
  );

  return rows[0] || {};
};

exports.getProcurementKpiSummary = async (req, res) => {
  try {
    const {
      year = currentYear(),
      month = currentMonth(),
    } = req.query;

    const selectedYear = Number(year);
    const selectedMonth = Number(month);

    const [
      purchase,
      payment,
      returns,
      delivery,
      approvals,
      budget,
    ] = await Promise.all([
      getPurchaseSummary(selectedYear, selectedMonth),
      getPaymentSummary(selectedYear, selectedMonth),
      getReturnSummary(selectedYear, selectedMonth),
      getDeliverySummary(selectedYear, selectedMonth),
      getApprovalSummary(selectedYear, selectedMonth),
      getBudgetSummary(selectedYear, selectedMonth),
    ]);

    const totalPurchaseValue = safeNumber(purchase.total_purchase_value);
    const totalPaidValue = safeNumber(payment.total_paid_value);
    const totalReturnValue = safeNumber(returns.total_return_value);
    const totalBudgetAmount = safeNumber(budget.total_budget_amount);

    const outstandingValue = Math.max(
      totalPurchaseValue - totalPaidValue - totalReturnValue,
      0
    );

    const paymentCompletionPercent =
      totalPurchaseValue > 0
        ? Number(((totalPaidValue / totalPurchaseValue) * 100).toFixed(2))
        : 0;

    const returnRatePercent =
      totalPurchaseValue > 0
        ? Number(((totalReturnValue / totalPurchaseValue) * 100).toFixed(2))
        : 0;

    const onTimeDeliveryPercent =
      safeNumber(delivery.total_receipts) > 0
        ? Number(
            (
              (safeNumber(delivery.on_time_receipts) /
                safeNumber(delivery.total_receipts)) *
              100
            ).toFixed(2)
          )
        : 0;

    const budgetUsagePercent =
      totalBudgetAmount > 0
        ? Number(((totalPurchaseValue / totalBudgetAmount) * 100).toFixed(2))
        : 0;

    const summary = {
      period_label: getPeriodLabel(selectedYear, selectedMonth),

      total_purchase_orders: safeNumber(purchase.total_purchase_orders),
      total_purchase_value: totalPurchaseValue,

      total_paid_value: totalPaidValue,
      outstanding_value: outstandingValue,

      total_return_value: totalReturnValue,
      total_returns: safeNumber(returns.total_returns),

      active_vendors: safeNumber(purchase.active_vendors),

      total_receipts: safeNumber(delivery.total_receipts),
      on_time_receipts: safeNumber(delivery.on_time_receipts),
      delayed_receipts: safeNumber(delivery.delayed_receipts),
      on_time_delivery_percent: onTimeDeliveryPercent,

      pending_approvals: safeNumber(approvals.pending_approvals),
      pending_approval_amount: safeNumber(approvals.pending_approval_amount),

      total_budget_amount: totalBudgetAmount,
      budget_usage_percent: budgetUsagePercent,

      payment_completion_percent: paymentCompletionPercent,
      return_rate_percent: returnRatePercent,

      pending_po_orders: safeNumber(purchase.pending_po_orders),
      approved_orders: safeNumber(purchase.approved_orders),
      ordered_orders: safeNumber(purchase.ordered_orders),
      received_orders: safeNumber(purchase.received_orders),
      closed_orders: safeNumber(purchase.closed_orders),
    };

    const alerts = [];

    if (budgetUsagePercent >= 100) {
      alerts.push({
        type: "danger",
        title: "Budget exceeded",
        message: `Procurement budget usage reached ${budgetUsagePercent}%`,
      });
    } else if (budgetUsagePercent >= 80) {
      alerts.push({
        type: "warning",
        title: "Budget warning",
        message: `Procurement budget usage reached ${budgetUsagePercent}%`,
      });
    }

    if (returnRatePercent >= 10) {
      alerts.push({
        type: "danger",
        title: "High return rate",
        message: `Return rate is ${returnRatePercent}% for this month`,
      });
    }

    if (onTimeDeliveryPercent > 0 && onTimeDeliveryPercent < 70) {
      alerts.push({
        type: "warning",
        title: "Low delivery performance",
        message: `On-time delivery is only ${onTimeDeliveryPercent}%`,
      });
    }

    if (safeNumber(approvals.pending_approvals) > 0) {
      alerts.push({
        type: "info",
        title: "Pending approvals",
        message: `${safeNumber(approvals.pending_approvals)} approval requests are pending`,
      });
    }

    res.json({
      success: true,
      period: {
        year: selectedYear,
        month: selectedMonth,
      },
      summary,
      alerts,
    });
  } catch (error) {
    console.error("Procurement KPI summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement KPI summary",
      error: error.message,
    });
  }
};

exports.getProcurementKpiTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const periods = getLastMonths(Number(months || 6));
    const trends = [];

    for (const period of periods) {
      const [purchase, payment, returns] = await Promise.all([
        getPurchaseSummary(period.year, period.month),
        getPaymentSummary(period.year, period.month),
        getReturnSummary(period.year, period.month),
      ]);

      trends.push({
        year: period.year,
        month: period.month,
        label: period.label,
        purchase_value: safeNumber(purchase.total_purchase_value),
        paid_value: safeNumber(payment.total_paid_value),
        return_value: safeNumber(returns.total_return_value),
        purchase_orders: safeNumber(purchase.total_purchase_orders),
      });
    }

    res.json({
      success: true,
      trends,
      data: trends,
    });
  } catch (error) {
    console.error("Procurement KPI trends error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement KPI trends",
      error: error.message,
    });
  }
};

exports.getProcurementVendorKpis = async (req, res) => {
  try {
    const {
      year = currentYear(),
      month = currentMonth(),
      search = "",
    } = req.query;

    const selectedYear = Number(year);
    const selectedMonth = Number(month);

    const where = [];
    const values = [
      selectedYear,
      selectedMonth,
      selectedYear,
      selectedMonth,
      selectedYear,
      selectedMonth,
    ];

    if (search.trim()) {
      where.push("(v.business_name LIKE ? OR v.contact_person LIKE ? OR v.phone LIKE ?)");
      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT
          v.id AS vendor_id,
          v.business_name AS vendor_name,
          v.contact_person,
          v.phone,
          v.email,

          COALESCE(po.total_purchase_orders, 0) AS total_purchase_orders,
          COALESCE(po.total_purchase_value, 0) AS total_purchase_value,

          COALESCE(pay.total_paid_value, 0) AS total_paid_value,

          COALESCE(ret.total_return_value, 0) AS total_return_value,

          GREATEST(
            COALESCE(po.total_purchase_value, 0)
            - COALESCE(pay.total_paid_value, 0)
            - COALESCE(ret.total_return_value, 0),
            0
          ) AS outstanding_value

        FROM vendors v

        LEFT JOIN (
          SELECT
            vendor_id,
            COUNT(*) AS total_purchase_orders,
            COALESCE(SUM(total_amount), 0) AS total_purchase_value
          FROM purchase_orders
          WHERE status != 'cancelled'
            AND YEAR(po_date) = ?
            AND MONTH(po_date) = ?
          GROUP BY vendor_id
        ) po ON v.id = po.vendor_id

        LEFT JOIN (
          SELECT
            vendor_id,
            COALESCE(SUM(amount), 0) AS total_paid_value
          FROM procurement_payments
          WHERE status = 'paid'
            AND YEAR(payment_date) = ?
            AND MONTH(payment_date) = ?
          GROUP BY vendor_id
        ) pay ON v.id = pay.vendor_id

        LEFT JOIN (
          SELECT
            pr.vendor_id,
            COALESCE(SUM(pri.quantity * COALESCE(poi.unit_price, 0)), 0) AS total_return_value
          FROM procurement_returns pr
          LEFT JOIN procurement_return_items pri
            ON pr.id = pri.procurement_return_id
          LEFT JOIN purchase_order_items poi
            ON pr.purchase_order_id = poi.purchase_order_id
            AND pri.product_id = poi.product_id
          WHERE pr.status IN ('approved', 'sent', 'closed')
            AND YEAR(pr.return_date) = ?
            AND MONTH(pr.return_date) = ?
          GROUP BY pr.vendor_id
        ) ret ON v.id = ret.vendor_id

        ${whereSql}

        HAVING total_purchase_orders > 0
            OR total_paid_value > 0
            OR total_return_value > 0

        ORDER BY total_purchase_value DESC, outstanding_value DESC
      `,
      values
    );

    const vendors = rows.map((row) => {
      const purchaseValue = safeNumber(row.total_purchase_value);
      const paidValue = safeNumber(row.total_paid_value);
      const returnValue = safeNumber(row.total_return_value);

      return {
        ...row,
        payment_percent:
          purchaseValue > 0
            ? Number(((paidValue / purchaseValue) * 100).toFixed(2))
            : 0,
        return_percent:
          purchaseValue > 0
            ? Number(((returnValue / purchaseValue) * 100).toFixed(2))
            : 0,
      };
    });

    res.json({
      success: true,
      count: vendors.length,
      vendors,
      data: vendors,
    });
  } catch (error) {
    console.error("Procurement vendor KPI error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor KPI report",
      error: error.message,
    });
  }
};
