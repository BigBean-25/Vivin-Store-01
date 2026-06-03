const db = require("../config/db");
const { logProcurementAudit } = require("../utils/procurementAuditLogger");

const APPROVAL_TABLE = "procurement_approvals";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const normalizeModuleName = (value) => {
  const allowed = [
    "rfq",
    "quotation",
    "purchase_order",
    "procurement_payment",
    "vendor_settlement",
  ];

  return allowed.includes(value) ? value : "";
};

const getApprovalLevel = (moduleName, amount) => {
  const value = safeNumber(amount);

  if (moduleName === "procurement_payment") {
    return {
      level: 4,
      role: "Finance Manager",
    };
  }

  if (moduleName === "vendor_settlement") {
    return {
      level: 4,
      role: "Finance Manager",
    };
  }

  if (value <= 50000) {
    return {
      level: 2,
      role: "Procurement Manager",
    };
  }

  if (value <= 200000) {
    return {
      level: 3,
      role: "Operations Manager",
    };
  }

  return {
    level: 5,
    role: "Super Admin",
  };
};

const getRecordInfo = async (moduleName, recordId) => {
  if (moduleName === "rfq") {
    const [[record]] = await db.query(
      `
        SELECT
          id,
          rfq_number AS reference_number,
          NULL AS vendor_id,
          NULL AS vendor_name,
          0 AS amount,
          status
        FROM rfqs
        WHERE id = ?
        LIMIT 1
      `,
      [recordId]
    );

    return record;
  }

  if (moduleName === "quotation") {
    const [[record]] = await db.query(
      `
        SELECT
          q.id,
          q.quotation_number AS reference_number,
          q.vendor_id,
          v.business_name AS vendor_name,
          q.total_amount AS amount,
          q.status
        FROM quotations q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        WHERE q.id = ?
        LIMIT 1
      `,
      [recordId]
    );

    return record;
  }

  if (moduleName === "purchase_order") {
    const [[record]] = await db.query(
      `
        SELECT
          po.id,
          po.po_number AS reference_number,
          po.vendor_id,
          v.business_name AS vendor_name,
          po.total_amount AS amount,
          po.status
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = ?
        LIMIT 1
      `,
      [recordId]
    );

    return record;
  }

  if (moduleName === "procurement_payment") {
    const [[record]] = await db.query(
      `
        SELECT
          pp.id,
          COALESCE(NULLIF(pp.reference_number, ''), CONCAT('PAY-', pp.id)) AS reference_number,
          pp.vendor_id,
          v.business_name AS vendor_name,
          pp.amount AS amount,
          pp.status
        FROM procurement_payments pp
        LEFT JOIN vendors v ON pp.vendor_id = v.id
        WHERE pp.id = ?
        LIMIT 1
      `,
      [recordId]
    );

    return record;
  }

  if (moduleName === "vendor_settlement") {
    const [[record]] = await db.query(
      `
        SELECT
          vs.id,
          COALESCE(NULLIF(vs.reference_no, ''), CONCAT('SETT-', vs.id)) AS reference_number,
          vs.vendor_id,
          v.business_name AS vendor_name,
          vs.amount AS amount,
          vs.status
        FROM vendor_settlements vs
        LEFT JOIN vendors v ON vs.vendor_id = v.id
        WHERE vs.id = ?
        LIMIT 1
      `,
      [recordId]
    );

    return record;
  }

  return null;
};

const updateModuleStatusOnRequest = async (moduleName, recordId) => {
  if (moduleName === "purchase_order") {
    await db.query(
      `
        UPDATE purchase_orders
        SET status = 'pending_approval'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "vendor_settlement") {
    await db.query(
      `
        UPDATE vendor_settlements
        SET status = 'pending_approval'
        WHERE id = ?
      `,
      [recordId]
    );
  }
};

const updateModuleStatusOnApproval = async (moduleName, recordId) => {
  if (moduleName === "rfq") {
    await db.query(
      `
        UPDATE rfqs
        SET status = 'sent'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "quotation") {
    await db.query(
      `
        UPDATE quotations
        SET status = 'accepted'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "purchase_order") {
    await db.query(
      `
        UPDATE purchase_orders
        SET status = 'approved'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "procurement_payment") {
    await db.query(
      `
        UPDATE procurement_payments
        SET status = 'paid'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "vendor_settlement") {
    await db.query(
      `
        UPDATE vendor_settlements
        SET status = 'completed'
        WHERE id = ?
      `,
      [recordId]
    );
  }
};

const updateModuleStatusOnReject = async (moduleName, recordId) => {
  if (moduleName === "rfq") {
    await db.query(
      `
        UPDATE rfqs
        SET status = 'cancelled'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "quotation") {
    await db.query(
      `
        UPDATE quotations
        SET status = 'rejected'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "purchase_order") {
    await db.query(
      `
        UPDATE purchase_orders
        SET status = 'cancelled'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "procurement_payment") {
    await db.query(
      `
        UPDATE procurement_payments
        SET status = 'cancelled'
        WHERE id = ?
      `,
      [recordId]
    );
  }

  if (moduleName === "vendor_settlement") {
    await db.query(
      `
        UPDATE vendor_settlements
        SET status = 'rejected'
        WHERE id = ?
      `,
      [recordId]
    );
  }
};

exports.getProcurementApprovals = async (req, res) => {
  try {
    const {
      module_name = "",
      approval_status = "",
      vendor_id = "",
      from_date = "",
      to_date = "",
      search = "",
    } = req.query;

    const where = [];
    const values = [];

    if (module_name) {
      where.push("pa.module_name = ?");
      values.push(module_name);
    }

    if (approval_status) {
      where.push("pa.approval_status = ?");
      values.push(approval_status);
    }

    if (vendor_id) {
      where.push("pa.vendor_id = ?");
      values.push(vendor_id);
    }

    if (from_date) {
      where.push("DATE(pa.requested_at) >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("DATE(pa.requested_at) <= ?");
      values.push(to_date);
    }

    if (search.trim()) {
      where.push(
        "(pa.reference_number LIKE ? OR pa.vendor_name LIKE ? OR pa.request_remarks LIKE ?)"
      );
      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT
          pa.*
        FROM ${APPROVAL_TABLE} pa
        ${whereSql}
        ORDER BY
          FIELD(pa.approval_status, 'pending', 'rejected', 'approved'),
          pa.id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      approvals: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get procurement approvals error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement approvals",
      error: error.message,
    });
  }
};

exports.getProcurementApprovalSummary = async (req, res) => {
  try {
    const [[overall]] = await db.query(`
      SELECT
        COUNT(*) AS total_requests,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved_requests,
        SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_requests,
        COALESCE(SUM(CASE WHEN approval_status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount
      FROM ${APPROVAL_TABLE}
    `);

    const [moduleRows] = await db.query(`
      SELECT
        module_name,
        COUNT(*) AS total,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        COALESCE(SUM(CASE WHEN approval_status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount
      FROM ${APPROVAL_TABLE}
      GROUP BY module_name
      ORDER BY module_name ASC
    `);

    res.json({
      success: true,
      summary: overall || {},
      modules: moduleRows,
    });
  } catch (error) {
    console.error("Procurement approval summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement approval summary",
      error: error.message,
    });
  }
};

exports.createProcurementApprovalRequest = async (req, res) => {
  try {
    const { module_name, record_id, remarks = "" } = req.body;

    const moduleName = normalizeModuleName(module_name);

    if (!moduleName) {
      return res.status(400).json({
        success: false,
        message: "Valid module name is required",
      });
    }

    if (!record_id) {
      return res.status(400).json({
        success: false,
        message: "Record ID is required",
      });
    }

    const record = await getRecordInfo(moduleName, recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found for approval",
      });
    }

    const [[existing]] = await db.query(
      `
        SELECT id
        FROM ${APPROVAL_TABLE}
        WHERE module_name = ?
          AND record_id = ?
          AND approval_status = 'pending'
        LIMIT 1
      `,
      [moduleName, record_id]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Approval request already pending for this record",
      });
    }

    const approvalRule = getApprovalLevel(moduleName, record.amount);
    const requestedBy = getUserId(req);

    const [result] = await db.query(
      `
        INSERT INTO ${APPROVAL_TABLE}
          (
            module_name,
            record_id,
            reference_number,
            vendor_id,
            vendor_name,
            amount,
            approval_level,
            approval_role,
            requested_by,
            approval_status,
            request_remarks
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `,
      [
        moduleName,
        record_id,
        record.reference_number || null,
        record.vendor_id || null,
        record.vendor_name || null,
        safeNumber(record.amount),
        approvalRule.level,
        approvalRule.role,
        requestedBy,
        remarks || null,
      ]
    );

    await updateModuleStatusOnRequest(moduleName, record_id);

    await logProcurementAudit({
      req,
      moduleName,
      recordId: record_id,
      referenceNumber: record.reference_number,
      actionType: "approval_request",
      actionLabel: "Approval request created",
      newValues: {
        approval_id: result.insertId,
        module_name: moduleName,
        record_id,
        approval_level: approvalRule.level,
        approval_role: approvalRule.role,
        amount: safeNumber(record.amount),
      },
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Approval request created successfully",
      approval: {
        id: result.insertId,
        module_name: moduleName,
        record_id,
        reference_number: record.reference_number,
        approval_level: approvalRule.level,
        approval_role: approvalRule.role,
        approval_status: "pending",
      },
    });
  } catch (error) {
    console.error("Create procurement approval request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create procurement approval request",
      error: error.message,
    });
  }
};

exports.approveProcurementApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = "" } = req.body;

    const [[approval]] = await db.query(
      `
        SELECT *
        FROM ${APPROVAL_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Approval request not found",
      });
    }

    if (approval.approval_status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be approved",
      });
    }

    await db.query(
      `
        UPDATE ${APPROVAL_TABLE}
        SET
          approval_status = 'approved',
          approved_by = ?,
          approval_remarks = ?,
          approved_at = NOW()
        WHERE id = ?
      `,
      [getUserId(req), remarks || null, id]
    );

    await updateModuleStatusOnApproval(approval.module_name, approval.record_id);

    await logProcurementAudit({
      req,
      moduleName: approval.module_name,
      recordId: approval.record_id,
      referenceNumber: approval.reference_number,
      actionType: "approve",
      actionLabel: "Procurement request approved",
      oldValues: {
        approval_status: "pending",
      },
      newValues: {
        approval_status: "approved",
      },
      remarks,
    });

    res.json({
      success: true,
      message: "Approval request approved successfully",
    });
  } catch (error) {
    console.error("Approve procurement approval error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve procurement request",
      error: error.message,
    });
  }
};

exports.rejectProcurementApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = "" } = req.body;

    const [[approval]] = await db.query(
      `
        SELECT *
        FROM ${APPROVAL_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Approval request not found",
      });
    }

    if (approval.approval_status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be rejected",
      });
    }

    await db.query(
      `
        UPDATE ${APPROVAL_TABLE}
        SET
          approval_status = 'rejected',
          approved_by = ?,
          approval_remarks = ?,
          approved_at = NOW()
        WHERE id = ?
      `,
      [getUserId(req), remarks || null, id]
    );

    await updateModuleStatusOnReject(approval.module_name, approval.record_id);

    await logProcurementAudit({
      req,
      moduleName: approval.module_name,
      recordId: approval.record_id,
      referenceNumber: approval.reference_number,
      actionType: "reject",
      actionLabel: "Procurement request rejected",
      oldValues: {
        approval_status: "pending",
      },
      newValues: {
        approval_status: "rejected",
      },
      remarks,
    });

    res.json({
      success: true,
      message: "Approval request rejected successfully",
    });
  } catch (error) {
    console.error("Reject procurement approval error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reject procurement request",
      error: error.message,
    });
  }
};
