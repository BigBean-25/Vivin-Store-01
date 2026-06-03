const db = require("../config/db");

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const tableExists = async (tableName) => {
  try {
    const [rows] = await db.query(`SHOW TABLES LIKE ?`, [tableName]);
    return rows.length > 0;
  } catch {
    return false;
  }
};

const getColumns = async (tableName) => {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    return rows.map((row) => row.Field);
  } catch {
    return [];
  }
};

const firstColumn = (columns, names) => {
  return names.find((name) => columns.includes(name)) || null;
};

const buildDateWhere = ({ alias = "", column, fromDate, toDate }) => {
  const where = [];
  const values = [];
  const prefix = alias ? `${alias}.` : "";

  if (!column) {
    return {
      sql: "",
      values: [],
    };
  }

  if (fromDate) {
    where.push(`DATE(${prefix}\`${column}\`) >= ?`);
    values.push(fromDate);
  }

  if (toDate) {
    where.push(`DATE(${prefix}\`${column}\`) <= ?`);
    values.push(toDate);
  }

  return {
    sql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
};

const singleValue = async (query, values = [], key = "value") => {
  try {
    const [[row]] = await db.query(query, values);
    return safeNumber(row?.[key]);
  } catch {
    return 0;
  }
};

const getPurchaseOrderSummary = async ({ fromDate, toDate }) => {
  if (!(await tableExists("purchase_orders"))) {
    return {
      count: 0,
      value: 0,
      pending_count: 0,
      approved_count: 0,
      completed_count: 0,
    };
  }

  const columns = await getColumns("purchase_orders");

  const amountCol = firstColumn(columns, [
    "total_amount",
    "grand_total",
    "net_amount",
    "amount",
  ]);

  const dateCol = firstColumn(columns, [
    "po_date",
    "order_date",
    "date",
    "created_at",
  ]);

  const statusCol = firstColumn(columns, ["status", "po_status"]);

  const dateWhere = buildDateWhere({
    column: dateCol,
    fromDate,
    toDate,
  });

  const [[summary]] = await db.query(
    `
      SELECT
        COUNT(*) AS count,
        ${
          amountCol
            ? `COALESCE(SUM(\`${amountCol}\`), 0)`
            : "0"
        } AS value,
        ${
          statusCol
            ? `SUM(CASE WHEN LOWER(COALESCE(\`${statusCol}\`, '')) IN ('draft', 'pending', 'pending_approval') THEN 1 ELSE 0 END)`
            : "0"
        } AS pending_count,
        ${
          statusCol
            ? `SUM(CASE WHEN LOWER(COALESCE(\`${statusCol}\`, '')) IN ('approved', 'ordered') THEN 1 ELSE 0 END)`
            : "0"
        } AS approved_count,
        ${
          statusCol
            ? `SUM(CASE WHEN LOWER(COALESCE(\`${statusCol}\`, '')) IN ('received', 'completed', 'closed') THEN 1 ELSE 0 END)`
            : "0"
        } AS completed_count
      FROM purchase_orders
      ${dateWhere.sql}
    `,
    dateWhere.values
  );

  return {
    count: safeNumber(summary?.count),
    value: safeNumber(summary?.value),
    pending_count: safeNumber(summary?.pending_count),
    approved_count: safeNumber(summary?.approved_count),
    completed_count: safeNumber(summary?.completed_count),
  };
};

const getPaymentSummary = async ({ fromDate, toDate }) => {
  if (!(await tableExists("procurement_payments"))) {
    return {
      count: 0,
      value: 0,
    };
  }

  const columns = await getColumns("procurement_payments");

  const amountCol = firstColumn(columns, ["amount", "payment_amount", "paid_amount"]);
  const dateCol = firstColumn(columns, ["payment_date", "paid_date", "date", "created_at"]);

  const dateWhere = buildDateWhere({
    column: dateCol,
    fromDate,
    toDate,
  });

  const [[summary]] = await db.query(
    `
      SELECT
        COUNT(*) AS count,
        ${amountCol ? `COALESCE(SUM(\`${amountCol}\`), 0)` : "0"} AS value
      FROM procurement_payments
      ${dateWhere.sql}
    `,
    dateWhere.values
  );

  return {
    count: safeNumber(summary?.count),
    value: safeNumber(summary?.value),
  };
};

const getGoodsReceiptSummary = async ({ fromDate, toDate }) => {
  if (!(await tableExists("goods_receipts"))) {
    return {
      count: 0,
    };
  }

  const columns = await getColumns("goods_receipts");

  const dateCol = firstColumn(columns, [
    "receipt_date",
    "grn_date",
    "received_date",
    "date",
    "created_at",
  ]);

  const dateWhere = buildDateWhere({
    column: dateCol,
    fromDate,
    toDate,
  });

  const count = await singleValue(
    `
      SELECT COUNT(*) AS value
      FROM goods_receipts
      ${dateWhere.sql}
    `,
    dateWhere.values
  );

  return {
    count,
  };
};

const getReturnSummary = async ({ fromDate, toDate }) => {
  if (!(await tableExists("procurement_returns"))) {
    return {
      count: 0,
      value: 0,
    };
  }

  const columns = await getColumns("procurement_returns");

  const amountCol = firstColumn(columns, [
    "total_amount",
    "return_value",
    "total_return_value",
    "amount",
  ]);

  const dateCol = firstColumn(columns, [
    "return_date",
    "date",
    "created_at",
  ]);

  const dateWhere = buildDateWhere({
    column: dateCol,
    fromDate,
    toDate,
  });

  const [[summary]] = await db.query(
    `
      SELECT
        COUNT(*) AS count,
        ${amountCol ? `COALESCE(SUM(\`${amountCol}\`), 0)` : "0"} AS value
      FROM procurement_returns
      ${dateWhere.sql}
    `,
    dateWhere.values
  );

  return {
    count: safeNumber(summary?.count),
    value: safeNumber(summary?.value),
  };
};

const getSimpleModuleCount = async (tableName, statusColumn = "status") => {
  if (!(await tableExists(tableName))) {
    return {
      total: 0,
      active: 0,
      pending: 0,
      closed: 0,
    };
  }

  const columns = await getColumns(tableName);
  const finalStatusCol = firstColumn(columns, [
    statusColumn,
    "status",
    "approval_status",
    "alert_status",
  ]);

  const [[summary]] = await db.query(
    `
      SELECT
        COUNT(*) AS total,
        ${
          finalStatusCol
            ? `SUM(CASE WHEN LOWER(COALESCE(\`${finalStatusCol}\`, '')) IN ('active', 'approved', 'open') THEN 1 ELSE 0 END)`
            : "0"
        } AS active,
        ${
          finalStatusCol
            ? `SUM(CASE WHEN LOWER(COALESCE(\`${finalStatusCol}\`, '')) IN ('pending', 'draft', 'pending_approval') THEN 1 ELSE 0 END)`
            : "0"
        } AS pending,
        ${
          finalStatusCol
            ? `SUM(CASE WHEN LOWER(COALESCE(\`${finalStatusCol}\`, '')) IN ('closed', 'completed', 'resolved', 'converted') THEN 1 ELSE 0 END)`
            : "0"
        } AS closed
      FROM ${tableName}
    `
  );

  return {
    total: safeNumber(summary?.total),
    active: safeNumber(summary?.active),
    pending: safeNumber(summary?.pending),
    closed: safeNumber(summary?.closed),
  };
};

const getVendorOutstanding = async () => {
  if (!(await tableExists("vendor_ledgers"))) return 0;

  const columns = await getColumns("vendor_ledgers");

  const balanceCol = firstColumn(columns, [
    "closing_balance",
    "balance",
    "running_balance",
    "outstanding_amount",
  ]);

  const vendorCol = firstColumn(columns, ["vendor_id"]);

  if (!balanceCol || !vendorCol) return 0;

  try {
    const [[row]] = await db.query(
      `
        SELECT COALESCE(SUM(latest_balance), 0) AS value
        FROM (
          SELECT vl.\`${vendorCol}\`, vl.\`${balanceCol}\` AS latest_balance
          FROM vendor_ledgers vl
          INNER JOIN (
            SELECT \`${vendorCol}\`, MAX(id) AS max_id
            FROM vendor_ledgers
            GROUP BY \`${vendorCol}\`
          ) latest
            ON latest.max_id = vl.id
        ) x
      `
    );

    return safeNumber(row?.value);
  } catch {
    return 0;
  }
};

const getRecentActivity = async () => {
  const activity = [];

  if (await tableExists("purchase_orders")) {
    const columns = await getColumns("purchase_orders");
    const numberCol = firstColumn(columns, [
      "po_number",
      "purchase_order_number",
      "reference_number",
    ]);
    const amountCol = firstColumn(columns, ["total_amount", "grand_total", "net_amount"]);
    const dateCol = firstColumn(columns, ["created_at", "po_date", "order_date", "date"]);

    const [rows] = await db.query(
      `
        SELECT
          id,
          ${numberCol ? `\`${numberCol}\`` : "NULL"} AS reference_number,
          ${amountCol ? `\`${amountCol}\`` : "0"} AS amount,
          ${dateCol ? `\`${dateCol}\`` : "NULL"} AS activity_date
        FROM purchase_orders
        ORDER BY id DESC
        LIMIT 6
      `
    );

    rows.forEach((row) => {
      activity.push({
        module: "Purchase Order",
        title: row.reference_number || `PO #${row.id}`,
        amount: safeNumber(row.amount),
        date: row.activity_date,
      });
    });
  }

  if (await tableExists("procurement_requisitions")) {
    const [rows] = await db.query(
      `
        SELECT
          id,
          requisition_number,
          request_title,
          estimated_total,
          created_at
        FROM procurement_requisitions
        ORDER BY id DESC
        LIMIT 6
      `
    );

    rows.forEach((row) => {
      activity.push({
        module: "Requisition",
        title: row.requisition_number || row.request_title || `REQ #${row.id}`,
        amount: safeNumber(row.estimated_total),
        date: row.created_at,
      });
    });
  }

  if (await tableExists("procurement_alerts")) {
    const [rows] = await db.query(
      `
        SELECT
          id,
          alert_title,
          priority,
          created_at
        FROM procurement_alerts
        ORDER BY id DESC
        LIMIT 6
      `
    );

    rows.forEach((row) => {
      activity.push({
        module: "Alert",
        title: row.alert_title || `Alert #${row.id}`,
        priority: row.priority,
        amount: 0,
        date: row.created_at,
      });
    });
  }

  return activity
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);
};

exports.getProcurementMasterDashboard = async (req, res) => {
  try {
    const {
      from_date = "",
      to_date = "",
    } = req.query;

    const [
      purchaseOrders,
      payments,
      goodsReceipts,
      returns,
      approvals,
      alerts,
      requisitions,
      documents,
      contracts,
      forecasts,
      reorderPlans,
      rateChecks,
      vendorPerformance,
    ] = await Promise.all([
      getPurchaseOrderSummary({ fromDate: from_date, toDate: to_date }),
      getPaymentSummary({ fromDate: from_date, toDate: to_date }),
      getGoodsReceiptSummary({ fromDate: from_date, toDate: to_date }),
      getReturnSummary({ fromDate: from_date, toDate: to_date }),
      getSimpleModuleCount("procurement_approvals", "approval_status"),
      getSimpleModuleCount("procurement_alerts", "alert_status"),
      getSimpleModuleCount("procurement_requisitions", "status"),
      getSimpleModuleCount("procurement_documents"),
      getSimpleModuleCount("vendor_rate_contracts", "status"),
      getSimpleModuleCount("procurement_forecasts", "status"),
      getSimpleModuleCount("procurement_reorder_plans", "status"),
      getSimpleModuleCount("procurement_rate_contract_checks", "check_status"),
      getSimpleModuleCount("vendor_scorecards"),
    ]);

    const vendorOutstanding = await getVendorOutstanding();
    const recentActivity = await getRecentActivity();

    const procurementValue = safeNumber(purchaseOrders.value);
    const paidValue = safeNumber(payments.value);
    const returnValue = safeNumber(returns.value);
    const outstandingValue = Math.max(procurementValue - paidValue - returnValue, 0);

    const paymentPercent = procurementValue
      ? Number(((paidValue / procurementValue) * 100).toFixed(2))
      : 0;

    const returnPercent = procurementValue
      ? Number(((returnValue / procurementValue) * 100).toFixed(2))
      : 0;

    const healthScoreParts = [
      alerts.active > 0 ? 70 : 100,
      approvals.pending > 0 ? 75 : 100,
      paymentPercent >= 80 ? 100 : 80,
      returnPercent <= 5 ? 100 : 80,
      contracts.active > 0 ? 100 : 75,
    ];

    const healthScore = Math.round(
      healthScoreParts.reduce((sum, score) => sum + score, 0) /
        healthScoreParts.length
    );

    res.json({
      success: true,

      period: {
        from_date: from_date || null,
        to_date: to_date || null,
      },

      summary: {
        procurement_value: procurementValue,
        paid_value: paidValue,
        return_value: returnValue,
        outstanding_value: outstandingValue,
        vendor_outstanding: vendorOutstanding,

        purchase_orders_count: purchaseOrders.count,
        goods_receipts_count: goodsReceipts.count,
        payments_count: payments.count,
        returns_count: returns.count,

        open_alerts: alerts.active,
        pending_approvals: approvals.pending,
        pending_requisitions: requisitions.pending,
        active_contracts: contracts.active,
        documents_count: documents.total,

        payment_percent: paymentPercent,
        return_percent: returnPercent,
        health_score: healthScore,
      },

      modules: {
        purchase_orders: purchaseOrders,
        payments,
        goods_receipts: goodsReceipts,
        returns,
        approvals,
        alerts,
        requisitions,
        documents,
        rate_contracts: contracts,
        forecasts,
        reorder_plans: reorderPlans,
        rate_checks: rateChecks,
        vendor_performance: vendorPerformance,
      },

      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error("Procurement master dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement master dashboard",
      error: error.message,
    });
  }
};

exports.getProcurementMasterHealth = async (req, res) => {
  try {
    const alerts = await getSimpleModuleCount("procurement_alerts", "alert_status");
    const approvals = await getSimpleModuleCount("procurement_approvals", "approval_status");
    const contracts = await getSimpleModuleCount("vendor_rate_contracts", "status");
    const documents = await getSimpleModuleCount("procurement_documents");

    const checks = [];

    checks.push({
      title: "Open Alerts",
      status: alerts.active > 0 ? "warning" : "good",
      value: alerts.active,
      message:
        alerts.active > 0
          ? "Open procurement alerts need action"
          : "No open procurement alerts",
    });

    checks.push({
      title: "Pending Approvals",
      status: approvals.pending > 0 ? "warning" : "good",
      value: approvals.pending,
      message:
        approvals.pending > 0
          ? "Approval items are pending"
          : "No pending procurement approvals",
    });

    checks.push({
      title: "Active Rate Contracts",
      status: contracts.active > 0 ? "good" : "warning",
      value: contracts.active,
      message:
        contracts.active > 0
          ? "Vendor rate contracts are active"
          : "No active vendor rate contract found",
    });

    checks.push({
      title: "Document Control",
      status: documents.total > 0 ? "good" : "warning",
      value: documents.total,
      message:
        documents.total > 0
          ? "Procurement documents are available"
          : "No procurement documents uploaded",
    });

    const score = Math.round(
      checks.reduce((sum, item) => {
        if (item.status === "good") return sum + 100;
        if (item.status === "warning") return sum + 75;
        return sum + 50;
      }, 0) / checks.length
    );

    res.json({
      success: true,
      health_score: score,
      checks,
    });
  } catch (error) {
    console.error("Procurement master health error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement master health",
      error: error.message,
    });
  }
};
