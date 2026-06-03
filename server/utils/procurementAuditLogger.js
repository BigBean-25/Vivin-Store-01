const db = require("../config/db");

const AUDIT_TABLE = "procurement_audit_logs";

const safeJson = (value) => {
  if (value === undefined || value === null || value === "") return null;

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const getUserId = (req) => {
  return req?.user?.id || req?.user?.user_id || req?.user?.admin_id || null;
};

const getUserName = (req) => {
  return (
    req?.user?.name ||
    req?.user?.full_name ||
    req?.user?.username ||
    req?.user?.email ||
    null
  );
};

const getIpAddress = (req) => {
  return (
    req?.headers?.["x-forwarded-for"] ||
    req?.connection?.remoteAddress ||
    req?.socket?.remoteAddress ||
    null
  );
};

const logProcurementAudit = async ({
  req,
  moduleName,
  recordId = null,
  referenceNumber = null,
  actionType,
  actionLabel = "",
  oldValues = null,
  newValues = null,
  remarks = "",
  performedBy = null,
  performedByName = null,
}) => {
  try {
    if (!moduleName || !actionType) return null;

    const [result] = await db.query(
      `
        INSERT INTO ${AUDIT_TABLE}
          (
            module_name,
            record_id,
            reference_number,
            action_type,
            action_label,
            old_values,
            new_values,
            remarks,
            performed_by,
            performed_by_name,
            ip_address,
            user_agent
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        moduleName,
        recordId || null,
        referenceNumber || null,
        actionType,
        actionLabel || null,
        safeJson(oldValues),
        safeJson(newValues),
        remarks || null,
        performedBy || getUserId(req),
        performedByName || getUserName(req),
        getIpAddress(req),
        req?.headers?.["user-agent"] || null,
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error("Procurement audit log skipped:", error.message);
    return null;
  }
};

module.exports = {
  logProcurementAudit,
};
