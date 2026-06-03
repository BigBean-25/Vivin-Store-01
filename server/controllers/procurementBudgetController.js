const db = require("../config/db");

const TABLE = "procurement_budgets";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const currentYear = () => new Date().getFullYear();
const currentMonth = () => new Date().getMonth() + 1;

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const getBudgetUsage = async (budget) => {
  const where = [
    "po.status != 'cancelled'",
    "YEAR(po.po_date) = ?",
    "MONTH(po.po_date) = ?",
  ];

  const values = [budget.budget_year, budget.budget_month];

  if (budget.vendor_id) {
    where.push("po.vendor_id = ?");
    values.push(budget.vendor_id);
  }

  if (budget.warehouse_id) {
    where.push("po.warehouse_id = ?");
    values.push(budget.warehouse_id);
  }

  const [[row]] = await db.query(
    `
      SELECT
        COUNT(*) AS total_purchase_orders,
        COALESCE(SUM(po.total_amount), 0) AS used_amount
      FROM purchase_orders po
      WHERE ${where.join(" AND ")}
    `,
    values
  );

  const usedAmount = safeNumber(row?.used_amount);
  const budgetAmount = safeNumber(budget.budget_amount);
  const usagePercent = budgetAmount > 0 ? (usedAmount / budgetAmount) * 100 : 0;
  const remainingAmount = budgetAmount - usedAmount;

  let budgetStatus = "safe";

  if (usagePercent >= safeNumber(budget.block_limit_percent)) {
    budgetStatus = "over_budget";
  } else if (usagePercent >= safeNumber(budget.warning_limit_percent)) {
    budgetStatus = "warning";
  }

  return {
    total_purchase_orders: safeNumber(row?.total_purchase_orders),
    used_amount: usedAmount,
    remaining_amount: remainingAmount,
    usage_percent: Number(usagePercent.toFixed(2)),
    budget_status: budgetStatus,
  };
};

const attachUsage = async (budgets) => {
  const result = [];

  for (const budget of budgets) {
    const usage = await getBudgetUsage(budget);

    result.push({
      ...budget,
      ...usage,
    });
  }

  return result;
};

exports.getProcurementBudgets = async (req, res) => {
  try {
    const {
      search = "",
      budget_scope = "",
      budget_year = "",
      budget_month = "",
      vendor_id = "",
      warehouse_id = "",
      status = "",
    } = req.query;

    const where = [];
    const values = [];

    if (search.trim()) {
      where.push("(pb.budget_name LIKE ? OR pb.remarks LIKE ?)");
      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword);
    }

    if (budget_scope) {
      where.push("pb.budget_scope = ?");
      values.push(budget_scope);
    }

    if (budget_year) {
      where.push("pb.budget_year = ?");
      values.push(budget_year);
    }

    if (budget_month) {
      where.push("pb.budget_month = ?");
      values.push(budget_month);
    }

    if (vendor_id) {
      where.push("pb.vendor_id = ?");
      values.push(vendor_id);
    }

    if (warehouse_id) {
      where.push("pb.warehouse_id = ?");
      values.push(warehouse_id);
    }

    if (status) {
      where.push("pb.status = ?");
      values.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT
          pb.*,
          v.business_name AS vendor_name,
          w.name AS warehouse_name
        FROM ${TABLE} pb
        LEFT JOIN vendors v ON pb.vendor_id = v.id
        LEFT JOIN warehouses w ON pb.warehouse_id = w.id
        ${whereSql}
        ORDER BY pb.budget_year DESC, pb.budget_month DESC, pb.id DESC
      `,
      values
    );

    const budgets = await attachUsage(rows);

    res.json({
      success: true,
      count: budgets.length,
      budgets,
      data: budgets,
    });
  } catch (error) {
    console.error("Get procurement budgets error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement budgets",
      error: error.message,
    });
  }
};

exports.getProcurementBudgetSummary = async (req, res) => {
  try {
    const { budget_year = currentYear(), budget_month = currentMonth() } =
      req.query;

    const [budgets] = await db.query(
      `
        SELECT
          pb.*,
          v.business_name AS vendor_name,
          w.name AS warehouse_name
        FROM ${TABLE} pb
        LEFT JOIN vendors v ON pb.vendor_id = v.id
        LEFT JOIN warehouses w ON pb.warehouse_id = w.id
        WHERE pb.budget_year = ?
          AND pb.budget_month = ?
          AND pb.status = 'active'
        ORDER BY pb.id DESC
      `,
      [budget_year, budget_month]
    );

    const budgetsWithUsage = await attachUsage(budgets);

    const summary = budgetsWithUsage.reduce(
      (acc, item) => {
        acc.total_budgets += 1;
        acc.total_budget_amount += safeNumber(item.budget_amount);
        acc.total_used_amount += safeNumber(item.used_amount);
        acc.total_remaining_amount += safeNumber(item.remaining_amount);

        if (item.budget_status === "warning") acc.warning_budgets += 1;
        if (item.budget_status === "over_budget") acc.over_budgets += 1;

        return acc;
      },
      {
        total_budgets: 0,
        total_budget_amount: 0,
        total_used_amount: 0,
        total_remaining_amount: 0,
        warning_budgets: 0,
        over_budgets: 0,
      }
    );

    res.json({
      success: true,
      period: {
        budget_year: Number(budget_year),
        budget_month: Number(budget_month),
      },
      summary,
      budgets: budgetsWithUsage,
    });
  } catch (error) {
    console.error("Procurement budget summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement budget summary",
      error: error.message,
    });
  }
};

exports.getProcurementBudgetById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[budget]] = await db.query(
      `
        SELECT
          pb.*,
          v.business_name AS vendor_name,
          w.name AS warehouse_name
        FROM ${TABLE} pb
        LEFT JOIN vendors v ON pb.vendor_id = v.id
        LEFT JOIN warehouses w ON pb.warehouse_id = w.id
        WHERE pb.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Procurement budget not found",
      });
    }

    const usage = await getBudgetUsage(budget);

    res.json({
      success: true,
      budget: {
        ...budget,
        ...usage,
      },
    });
  } catch (error) {
    console.error("Get procurement budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement budget",
      error: error.message,
    });
  }
};

exports.createProcurementBudget = async (req, res) => {
  try {
    const {
      budget_name,
      budget_scope = "overall",
      budget_year = currentYear(),
      budget_month = currentMonth(),
      vendor_id = "",
      warehouse_id = "",
      budget_amount,
      warning_limit_percent = 80,
      block_limit_percent = 100,
      remarks = "",
      status = "active",
    } = req.body;

    if (!budget_name) {
      return res.status(400).json({
        success: false,
        message: "Budget name is required",
      });
    }

    if (safeNumber(budget_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Budget amount must be greater than 0",
      });
    }

    const [result] = await db.query(
      `
        INSERT INTO ${TABLE}
          (
            budget_name,
            budget_scope,
            budget_year,
            budget_month,
            vendor_id,
            warehouse_id,
            budget_amount,
            warning_limit_percent,
            block_limit_percent,
            remarks,
            status,
            created_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        budget_name,
        budget_scope,
        budget_year,
        budget_month,
        vendor_id || null,
        warehouse_id || null,
        safeNumber(budget_amount),
        safeNumber(warning_limit_percent),
        safeNumber(block_limit_percent),
        remarks || null,
        status || "active",
        getUserId(req),
      ]
    );

    res.status(201).json({
      success: true,
      message: "Procurement budget created successfully",
      budget_id: result.insertId,
    });
  } catch (error) {
    console.error("Create procurement budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create procurement budget",
      error: error.message,
    });
  }
};

exports.updateProcurementBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      budget_name,
      budget_scope = "overall",
      budget_year,
      budget_month,
      vendor_id = "",
      warehouse_id = "",
      budget_amount,
      warning_limit_percent = 80,
      block_limit_percent = 100,
      remarks = "",
      status = "active",
    } = req.body;

    const [[existing]] = await db.query(
      `
        SELECT id
        FROM ${TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Procurement budget not found",
      });
    }

    await db.query(
      `
        UPDATE ${TABLE}
        SET
          budget_name = ?,
          budget_scope = ?,
          budget_year = ?,
          budget_month = ?,
          vendor_id = ?,
          warehouse_id = ?,
          budget_amount = ?,
          warning_limit_percent = ?,
          block_limit_percent = ?,
          remarks = ?,
          status = ?
        WHERE id = ?
      `,
      [
        budget_name,
        budget_scope,
        budget_year,
        budget_month,
        vendor_id || null,
        warehouse_id || null,
        safeNumber(budget_amount),
        safeNumber(warning_limit_percent),
        safeNumber(block_limit_percent),
        remarks || null,
        status || "active",
        id,
      ]
    );

    res.json({
      success: true,
      message: "Procurement budget updated successfully",
    });
  } catch (error) {
    console.error("Update procurement budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update procurement budget",
      error: error.message,
    });
  }
};

exports.deleteProcurementBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        DELETE FROM ${TABLE}
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Procurement budget not found",
      });
    }

    res.json({
      success: true,
      message: "Procurement budget deleted successfully",
    });
  } catch (error) {
    console.error("Delete procurement budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete procurement budget",
      error: error.message,
    });
  }
};
