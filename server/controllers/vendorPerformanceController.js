const db = require("../config/db");

const SCORECARD_TABLE = "vendor_scorecards";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const currentYear = () => new Date().getFullYear();
const currentMonth = () => new Date().getMonth() + 1;

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const getGrade = (score) => {
  const value = safeNumber(score);

  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B";
  if (value >= 60) return "C";
  return "D";
};

const getPerformanceStatus = (score) => {
  const value = safeNumber(score);

  if (value >= 90) return "excellent";
  if (value >= 80) return "good";
  if (value >= 70) return "average";
  if (value >= 60) return "needs_improvement";
  return "poor";
};

const calculateVendorScores = (row) => {
  const poCount = safeNumber(row.purchase_orders_count);
  const totalPurchaseValue = safeNumber(row.total_purchase_value);
  const onTimeOrders = safeNumber(row.on_time_orders);
  const delayedOrders = safeNumber(row.delayed_orders);
  const returnValue = safeNumber(row.return_value);
  const paidValue = safeNumber(row.paid_value);
  const quotationCount = safeNumber(row.quotation_count);
  const acceptedQuotationCount = safeNumber(row.accepted_quotation_count);

  const deliveryScore =
    poCount > 0 ? Number(((onTimeOrders / poCount) * 100).toFixed(2)) : 0;

  const returnPercent =
    totalPurchaseValue > 0 ? (returnValue / totalPurchaseValue) * 100 : 0;

  const qualityScore = Number(Math.max(0, 100 - returnPercent).toFixed(2));

  const paymentScore =
    totalPurchaseValue > 0
      ? Number(Math.min((paidValue / totalPurchaseValue) * 100, 100).toFixed(2))
      : 0;

  const quotationScore =
    quotationCount > 0
      ? Number(((acceptedQuotationCount / quotationCount) * 100).toFixed(2))
      : 0;

  const overallScore = Number(
    (
      deliveryScore * 0.35 +
      qualityScore * 0.3 +
      paymentScore * 0.2 +
      quotationScore * 0.15
    ).toFixed(2)
  );

  return {
    ...row,

    purchase_orders_count: poCount,
    total_purchase_value: totalPurchaseValue,

    on_time_orders: onTimeOrders,
    delayed_orders: delayedOrders,
    delivery_score: deliveryScore,

    return_value: returnValue,
    quality_score: qualityScore,

    paid_value: paidValue,
    payment_score: paymentScore,

    quotation_count: quotationCount,
    accepted_quotation_count: acceptedQuotationCount,
    quotation_score: quotationScore,

    overall_score: overallScore,
    performance_grade: getGrade(overallScore),
    performance_status: getPerformanceStatus(overallScore),
  };
};

const getVendorPerformanceRows = async ({
  scoreYear = currentYear(),
  scoreMonth = currentMonth(),
  vendorId = "",
  search = "",
}) => {
  const where = [];
  const values = [];

  if (vendorId) {
    where.push("v.id = ?");
    values.push(vendorId);
  }

  if (search.trim()) {
    where.push("(v.business_name LIKE ? OR v.contact_person LIKE ? OR v.phone LIKE ?)");
    const keyword = `%${search.trim()}%`;
    values.push(keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const queryValues = [
    scoreYear,
    scoreMonth,
    scoreYear,
    scoreMonth,
    scoreYear,
    scoreMonth,
    scoreYear,
    scoreMonth,
    ...values,
  ];

  const [rows] = await db.query(
    `
      SELECT
        v.id AS vendor_id,
        v.business_name AS vendor_name,
        v.contact_person,
        v.phone,
        v.email,

        COALESCE(po.purchase_orders_count, 0) AS purchase_orders_count,
        COALESCE(po.total_purchase_value, 0) AS total_purchase_value,
        COALESCE(po.on_time_orders, 0) AS on_time_orders,
        COALESCE(po.delayed_orders, 0) AS delayed_orders,

        COALESCE(ret.return_value, 0) AS return_value,

        COALESCE(pay.paid_value, 0) AS paid_value,

        COALESCE(q.quotation_count, 0) AS quotation_count,
        COALESCE(q.accepted_quotation_count, 0) AS accepted_quotation_count

      FROM vendors v

      LEFT JOIN (
        SELECT
          po.vendor_id,
          COUNT(*) AS purchase_orders_count,
          COALESCE(SUM(po.total_amount), 0) AS total_purchase_value,

          SUM(
            CASE
              WHEN gr.receipt_date IS NOT NULL
               AND po.expected_delivery_date IS NOT NULL
               AND DATE(gr.receipt_date) <= DATE(po.expected_delivery_date)
              THEN 1 ELSE 0
            END
          ) AS on_time_orders,

          SUM(
            CASE
              WHEN gr.receipt_date IS NOT NULL
               AND po.expected_delivery_date IS NOT NULL
               AND DATE(gr.receipt_date) > DATE(po.expected_delivery_date)
              THEN 1 ELSE 0
            END
          ) AS delayed_orders

        FROM purchase_orders po
        LEFT JOIN goods_receipts gr
          ON po.id = gr.purchase_order_id
        WHERE po.status != 'cancelled'
          AND YEAR(po.po_date) = ?
          AND MONTH(po.po_date) = ?
        GROUP BY po.vendor_id
      ) po ON v.id = po.vendor_id

      LEFT JOIN (
        SELECT
          pr.vendor_id,
          COALESCE(SUM(pri.quantity * COALESCE(poi.unit_price, 0)), 0) AS return_value
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

      LEFT JOIN (
        SELECT
          vendor_id,
          COALESCE(SUM(amount), 0) AS paid_value
        FROM procurement_payments
        WHERE status = 'paid'
          AND YEAR(payment_date) = ?
          AND MONTH(payment_date) = ?
        GROUP BY vendor_id
      ) pay ON v.id = pay.vendor_id

      LEFT JOIN (
        SELECT
          vendor_id,
          COUNT(*) AS quotation_count,
          SUM(CASE WHEN status IN ('accepted', 'approved') THEN 1 ELSE 0 END) AS accepted_quotation_count
        FROM quotations
        WHERE YEAR(created_at) = ?
          AND MONTH(created_at) = ?
        GROUP BY vendor_id
      ) q ON v.id = q.vendor_id

      ${whereSql}

      HAVING purchase_orders_count > 0
          OR quotation_count > 0
          OR paid_value > 0
          OR return_value > 0

      ORDER BY total_purchase_value DESC, vendor_name ASC
    `,
    queryValues
  );

  return rows.map(calculateVendorScores);
};

exports.getVendorPerformanceScorecards = async (req, res) => {
  try {
    const {
      score_year = currentYear(),
      score_month = currentMonth(),
      vendor_id = "",
      search = "",
      grade = "",
    } = req.query;

    let scorecards = await getVendorPerformanceRows({
      scoreYear: Number(score_year),
      scoreMonth: Number(score_month),
      vendorId: vendor_id,
      search,
    });

    if (grade) {
      scorecards = scorecards.filter(
        (item) => item.performance_grade === grade
      );
    }

    res.json({
      success: true,
      period: {
        score_year: Number(score_year),
        score_month: Number(score_month),
      },
      count: scorecards.length,
      scorecards,
      data: scorecards,
    });
  } catch (error) {
    console.error("Vendor performance scorecards error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor performance scorecards",
      error: error.message,
    });
  }
};

exports.getVendorPerformanceSummary = async (req, res) => {
  try {
    const {
      score_year = currentYear(),
      score_month = currentMonth(),
    } = req.query;

    const scorecards = await getVendorPerformanceRows({
      scoreYear: Number(score_year),
      scoreMonth: Number(score_month),
    });

    const summary = scorecards.reduce(
      (acc, item) => {
        acc.total_vendors += 1;
        acc.total_purchase_value += safeNumber(item.total_purchase_value);
        acc.total_return_value += safeNumber(item.return_value);
        acc.total_paid_value += safeNumber(item.paid_value);

        acc.average_score += safeNumber(item.overall_score);

        if (item.performance_grade === "A+") acc.grade_a_plus += 1;
        if (item.performance_grade === "A") acc.grade_a += 1;
        if (item.performance_grade === "B") acc.grade_b += 1;
        if (item.performance_grade === "C") acc.grade_c += 1;
        if (item.performance_grade === "D") acc.grade_d += 1;

        if (item.performance_status === "poor") acc.risk_vendors += 1;
        if (item.performance_status === "needs_improvement") acc.risk_vendors += 1;

        return acc;
      },
      {
        total_vendors: 0,
        total_purchase_value: 0,
        total_return_value: 0,
        total_paid_value: 0,
        average_score: 0,
        grade_a_plus: 0,
        grade_a: 0,
        grade_b: 0,
        grade_c: 0,
        grade_d: 0,
        risk_vendors: 0,
      }
    );

    if (summary.total_vendors > 0) {
      summary.average_score = Number(
        (summary.average_score / summary.total_vendors).toFixed(2)
      );
    }

    res.json({
      success: true,
      period: {
        score_year: Number(score_year),
        score_month: Number(score_month),
      },
      summary,
      top_vendors: scorecards
        .slice()
        .sort((a, b) => b.overall_score - a.overall_score)
        .slice(0, 5),
      risk_vendors: scorecards
        .filter((item) =>
          ["poor", "needs_improvement"].includes(item.performance_status)
        )
        .slice(0, 5),
    });
  } catch (error) {
    console.error("Vendor performance summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor performance summary",
      error: error.message,
    });
  }
};

exports.getVendorPerformanceByVendor = async (req, res) => {
  try {
    const { vendor_id } = req.params;

    const {
      score_year = currentYear(),
      score_month = currentMonth(),
    } = req.query;

    const scorecards = await getVendorPerformanceRows({
      scoreYear: Number(score_year),
      scoreMonth: Number(score_month),
      vendorId: vendor_id,
    });

    if (!scorecards.length) {
      return res.status(404).json({
        success: false,
        message: "Vendor performance not found",
      });
    }

    res.json({
      success: true,
      scorecard: scorecards[0],
    });
  } catch (error) {
    console.error("Vendor performance by vendor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor performance",
      error: error.message,
    });
  }
};

exports.saveVendorPerformanceSnapshot = async (req, res) => {
  try {
    const {
      score_year = currentYear(),
      score_month = currentMonth(),
    } = req.body;

    const scorecards = await getVendorPerformanceRows({
      scoreYear: Number(score_year),
      scoreMonth: Number(score_month),
    });

    const createdBy = getUserId(req);

    for (const item of scorecards) {
      await db.query(
        `
          INSERT INTO ${SCORECARD_TABLE}
            (
              vendor_id,
              score_year,
              score_month,
              purchase_orders_count,
              total_purchase_value,
              on_time_orders,
              delayed_orders,
              delivery_score,
              return_value,
              quality_score,
              paid_value,
              payment_score,
              quotation_count,
              accepted_quotation_count,
              quotation_score,
              overall_score,
              performance_grade,
              created_by
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

          ON DUPLICATE KEY UPDATE
            purchase_orders_count = VALUES(purchase_orders_count),
            total_purchase_value = VALUES(total_purchase_value),
            on_time_orders = VALUES(on_time_orders),
            delayed_orders = VALUES(delayed_orders),
            delivery_score = VALUES(delivery_score),
            return_value = VALUES(return_value),
            quality_score = VALUES(quality_score),
            paid_value = VALUES(paid_value),
            payment_score = VALUES(payment_score),
            quotation_count = VALUES(quotation_count),
            accepted_quotation_count = VALUES(accepted_quotation_count),
            quotation_score = VALUES(quotation_score),
            overall_score = VALUES(overall_score),
            performance_grade = VALUES(performance_grade),
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          item.vendor_id,
          Number(score_year),
          Number(score_month),
          item.purchase_orders_count,
          item.total_purchase_value,
          item.on_time_orders,
          item.delayed_orders,
          item.delivery_score,
          item.return_value,
          item.quality_score,
          item.paid_value,
          item.payment_score,
          item.quotation_count,
          item.accepted_quotation_count,
          item.quotation_score,
          item.overall_score,
          item.performance_grade,
          createdBy,
        ]
      );
    }

    res.json({
      success: true,
      message: "Vendor performance snapshot saved successfully",
      saved_count: scorecards.length,
    });
  } catch (error) {
    console.error("Save vendor performance snapshot error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save vendor performance snapshot",
      error: error.message,
    });
  }
};
