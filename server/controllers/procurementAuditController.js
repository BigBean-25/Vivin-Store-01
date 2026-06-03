const db = require("../config/db");
const { logProcurementAudit } = require("../utils/procurementAuditLogger");

const AUDIT_TABLE = "procurement_audit_logs";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const parseJson = (value) => {
  if (!value) return null;

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

exports.getProcurementAuditLogs = async (req, res) => {
  try {
    const {
      search = "",
      module_name = "",
      action_type = "",
      performed_by = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const where = [];
    const values = [];

    if (module_name) {
      where.push("module_name = ?");
      values.push(module_name);
    }

    if (action_type) {
      where.push("action_type = ?");
      values.push(action_type);
    }

    if (performed_by) {
      where.push("performed_by = ?");
      values.push(performed_by);
    }

    if (from_date) {
      where.push("DATE(created_at) >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("DATE(created_at) <= ?");
      values.push(to_date);
    }

    if (search.trim()) {
      where.push(
        "(reference_number LIKE ? OR action_label LIKE ? OR remarks LIKE ? OR performed_by_name LIKE ?)"
      );

      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT *
        FROM ${AUDIT_TABLE}
        ${whereSql}
        ORDER BY id DESC
        LIMIT 500
      `,
      values
    );

    const logs = rows.map((row) => ({
      ...row,
      old_values: parseJson(row.old_values),
      new_values: parseJson(row.new_values),
    }));

    res.json({
      success: true,
      count: logs.length,
      logs,
      data: logs,
    });
  } catch (error) {
    console.error("Get procurement audit logs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement audit logs",
      error: error.message,
    });
  }
};

exports.getProcurementAuditSummary = async (req, res) => {
  try {
    const { from_date = "", to_date = "" } = req.query;

    const where = [];
    const values = [];

    if (from_date) {
      where.push("DATE(created_at) >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("DATE(created_at) <= ?");
      values.push(to_date);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[overall]] = await db.query(
      `
        SELECT
          COUNT(*) AS total_logs,
          SUM(CASE WHEN action_type = 'create' THEN 1 ELSE 0 END) AS created_count,
          SUM(CASE WHEN action_type = 'update' THEN 1 ELSE 0 END) AS updated_count,
          SUM(CASE WHEN action_type = 'delete' THEN 1 ELSE 0 END) AS deleted_count,
          SUM(CASE WHEN action_type = 'approve' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN action_type = 'reject' THEN 1 ELSE 0 END) AS rejected_count
        FROM ${AUDIT_TABLE}
        ${whereSql}
      `,
      values
    );

    const [moduleRows] = await db.query(
      `
        SELECT
          module_name,
          COUNT(*) AS total_logs,
          MAX(created_at) AS last_activity
        FROM ${AUDIT_TABLE}
        ${whereSql}
        GROUP BY module_name
        ORDER BY total_logs DESC
      `,
      values
    );

    const [actionRows] = await db.query(
      `
        SELECT
          action_type,
          COUNT(*) AS total_logs
        FROM ${AUDIT_TABLE}
        ${whereSql}
        GROUP BY action_type
        ORDER BY total_logs DESC
      `,
      values
    );

    const [latestRows] = await db.query(
      `
        SELECT *
        FROM ${AUDIT_TABLE}
        ${whereSql}
        ORDER BY id DESC
        LIMIT 10
      `,
      values
    );

    res.json({
      success: true,
      summary: {
        total_logs: safeNumber(overall?.total_logs),
        created_count: safeNumber(overall?.created_count),
        updated_count: safeNumber(overall?.updated_count),
        deleted_count: safeNumber(overall?.deleted_count),
        approved_count: safeNumber(overall?.approved_count),
        rejected_count: safeNumber(overall?.rejected_count),
      },
      modules: moduleRows,
      actions: actionRows,
      latest_logs: latestRows,
    });
  } catch (error) {
    console.error("Procurement audit summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement audit summary",
      error: error.message,
    });
  }
};

exports.getProcurementAuditById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[log]] = await db.query(
      `
        SELECT *
        FROM ${AUDIT_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.json({
      success: true,
      log: {
        ...log,
        old_values: parseJson(log.old_values),
        new_values: parseJson(log.new_values),
      },
    });
  } catch (error) {
    console.error("Get procurement audit log error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement audit log",
      error: error.message,
    });
  }
};

exports.createManualProcurementAuditLog = async (req, res) => {
  try {
    const {
      module_name,
      record_id = "",
      reference_number = "",
      action_type,
      action_label = "",
      old_values = null,
      new_values = null,
      remarks = "",
    } = req.body;

    if (!module_name) {
      return res.status(400).json({
        success: false,
        message: "Module name is required",
      });
    }

    if (!action_type) {
      return res.status(400).json({
        success: false,
        message: "Action type is required",
      });
    }

    const auditId = await logProcurementAudit({
      req,
      moduleName: module_name,
      recordId: record_id || null,
      referenceNumber: reference_number || null,
      actionType: action_type,
      actionLabel: action_label,
      oldValues: old_values,
      newValues: newValues,
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Audit log created successfully",
      audit_id: auditId,
    });
  } catch (error) {
    console.error("Create procurement audit log error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create procurement audit log",
      error: error.message,
    });
  }
};
