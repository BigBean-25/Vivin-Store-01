const db = require("../config/db");

const REQ_TABLE = "procurement_requisitions";
const ITEM_TABLE = "procurement_requisition_items";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const getUserName = (req) => {
  return (
    req.user?.name ||
    req.user?.full_name ||
    req.user?.username ||
    req.user?.email ||
    null
  );
};

const generateRequisitionNumber = async (connection) => {
  const prefix = `REQ-${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const [[row]] = await connection.query(
    `
      SELECT COUNT(*) + 1 AS next_number
      FROM ${REQ_TABLE}
      WHERE requisition_number LIKE ?
    `,
    [`${prefix}%`]
  );

  return `${prefix}-${String(row?.next_number || 1).padStart(4, "0")}`;
};

const normalizeItems = (items = []) => {
  return items
    .filter((item) => item.product_name || item.product_id)
    .map((item) => {
      const qty = safeNumber(item.required_qty);
      const unitPrice = safeNumber(item.estimated_unit_price);
      const estimatedValue = qty * unitPrice;

      return {
        product_id: item.product_id || null,
        product_name: item.product_name || "Unknown Product",
        required_qty: Number(qty.toFixed(3)),
        unit_id: item.unit_id || null,
        unit_name: item.unit_name || null,
        estimated_unit_price: Number(unitPrice.toFixed(2)),
        estimated_value: Number(estimatedValue.toFixed(2)),
        preferred_vendor_id: item.preferred_vendor_id || null,
        preferred_vendor_name: item.preferred_vendor_name || null,
        remarks: item.remarks || null,
      };
    });
};

const insertItems = async (connection, requisitionId, items) => {
  for (const item of items) {
    await connection.query(
      `
        INSERT INTO ${ITEM_TABLE}
          (
            requisition_id,
            product_id,
            product_name,
            required_qty,
            unit_id,
            unit_name,
            estimated_unit_price,
            estimated_value,
            preferred_vendor_id,
            preferred_vendor_name,
            remarks
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        requisitionId,
        item.product_id,
        item.product_name,
        item.required_qty,
        item.unit_id,
        item.unit_name,
        item.estimated_unit_price,
        item.estimated_value,
        item.preferred_vendor_id,
        item.preferred_vendor_name,
        item.remarks,
      ]
    );
  }
};

exports.getProcurementRequisitionSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
        SELECT
          COUNT(*) AS total_requisitions,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) AS urgent_count,
          COALESCE(SUM(estimated_total), 0) AS estimated_total
        FROM ${REQ_TABLE}
      `
    );

    const [latest] = await db.query(
      `
        SELECT *
        FROM ${REQ_TABLE}
        ORDER BY id DESC
        LIMIT 8
      `
    );

    res.json({
      success: true,
      summary: {
        total_requisitions: safeNumber(summary?.total_requisitions),
        draft_count: safeNumber(summary?.draft_count),
        submitted_count: safeNumber(summary?.submitted_count),
        approved_count: safeNumber(summary?.approved_count),
        rejected_count: safeNumber(summary?.rejected_count),
        urgent_count: safeNumber(summary?.urgent_count),
        estimated_total: safeNumber(summary?.estimated_total),
      },
      latest,
    });
  } catch (error) {
    console.error("Procurement requisition summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement requisition summary",
      error: error.message,
    });
  }
};

exports.getProcurementRequisitions = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      approval_status = "",
      priority = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const where = [];
    const values = [];

    if (status) {
      where.push("status = ?");
      values.push(status);
    }

    if (approval_status) {
      where.push("approval_status = ?");
      values.push(approval_status);
    }

    if (priority) {
      where.push("priority = ?");
      values.push(priority);
    }

    if (from_date) {
      where.push("request_date >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("request_date <= ?");
      values.push(to_date);
    }

    if (search.trim()) {
      where.push(
        "(requisition_number LIKE ? OR request_title LIKE ? OR requester_name LIKE ? OR outlet_name LIKE ? OR warehouse_name LIKE ?)"
      );

      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT *
        FROM ${REQ_TABLE}
        ${whereSql}
        ORDER BY id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      requisitions: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get procurement requisitions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement requisitions",
      error: error.message,
    });
  }
};

exports.getProcurementRequisitionById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[requisition]] = await db.query(
      `
        SELECT *
        FROM ${REQ_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: "Procurement requisition not found",
      });
    }

    const [items] = await db.query(
      `
        SELECT *
        FROM ${ITEM_TABLE}
        WHERE requisition_id = ?
        ORDER BY id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      requisition,
      items,
    });
  } catch (error) {
    console.error("Get procurement requisition error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement requisition",
      error: error.message,
    });
  }
};

exports.createProcurementRequisition = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      request_title,
      request_date = todayDate(),
      required_date = "",
      requester_name = "",
      outlet_id = "",
      outlet_name = "",
      warehouse_id = "",
      warehouse_name = "",
      priority = "normal",
      purpose = "",
      remarks = "",
      status = "draft",
      items = [],
    } = req.body;

    if (!request_title) {
      return res.status(400).json({
        success: false,
        message: "Request title is required",
      });
    }

    const finalItems = normalizeItems(items);

    if (!finalItems.length) {
      return res.status(400).json({
        success: false,
        message: "At least one requisition item is required",
      });
    }

    const estimatedTotal = finalItems.reduce(
      (sum, item) => sum + safeNumber(item.estimated_value),
      0
    );

    await connection.beginTransaction();

    const requisitionNumber = await generateRequisitionNumber(connection);

    const [result] = await connection.query(
      `
        INSERT INTO ${REQ_TABLE}
          (
            requisition_number,
            request_title,
            request_date,
            required_date,
            requested_by,
            requester_name,
            outlet_id,
            outlet_name,
            warehouse_id,
            warehouse_name,
            priority,
            purpose,
            total_items,
            estimated_total,
            approval_status,
            status,
            remarks,
            created_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        requisitionNumber,
        request_title,
        request_date,
        required_date || null,
        getUserId(req),
        requester_name || getUserName(req),
        outlet_id || null,
        outlet_name || null,
        warehouse_id || null,
        warehouse_name || null,
        priority || "normal",
        purpose || null,
        finalItems.length,
        Number(estimatedTotal.toFixed(2)),
        status === "submitted" ? "pending" : "draft",
        status || "draft",
        remarks || null,
        getUserId(req),
      ]
    );

    await insertItems(connection, result.insertId, finalItems);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Procurement requisition created successfully",
      requisition_id: result.insertId,
      requisition_number: requisitionNumber,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create procurement requisition error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create procurement requisition",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateProcurementRequisition = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const [[existing]] = await connection.query(
      `
        SELECT *
        FROM ${REQ_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Procurement requisition not found",
      });
    }

    if (existing.status === "approved" || existing.status === "converted") {
      return res.status(400).json({
        success: false,
        message: "Approved or converted requisition cannot be edited",
      });
    }

    const {
      request_title = existing.request_title,
      request_date = existing.request_date,
      required_date = existing.required_date,
      requester_name = existing.requester_name,
      outlet_id = existing.outlet_id,
      outlet_name = existing.outlet_name,
      warehouse_id = existing.warehouse_id,
      warehouse_name = existing.warehouse_name,
      priority = existing.priority,
      purpose = existing.purpose,
      remarks = existing.remarks,
      status = existing.status,
      items = [],
    } = req.body;

    const finalItems = normalizeItems(items);

    if (!finalItems.length) {
      return res.status(400).json({
        success: false,
        message: "At least one requisition item is required",
      });
    }

    const estimatedTotal = finalItems.reduce(
      (sum, item) => sum + safeNumber(item.estimated_value),
      0
    );

    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE ${REQ_TABLE}
        SET
          request_title = ?,
          request_date = ?,
          required_date = ?,
          requester_name = ?,
          outlet_id = ?,
          outlet_name = ?,
          warehouse_id = ?,
          warehouse_name = ?,
          priority = ?,
          purpose = ?,
          total_items = ?,
          estimated_total = ?,
          status = ?,
          approval_status = ?,
          remarks = ?
        WHERE id = ?
      `,
      [
        request_title,
        request_date,
        required_date || null,
        requester_name || null,
        outlet_id || null,
        outlet_name || null,
        warehouse_id || null,
        warehouse_name || null,
        priority || "normal",
        purpose || null,
        finalItems.length,
        Number(estimatedTotal.toFixed(2)),
        status || existing.status,
        status === "submitted" ? "pending" : existing.approval_status,
        remarks || null,
        id,
      ]
    );

    await connection.query(
      `
        DELETE FROM ${ITEM_TABLE}
        WHERE requisition_id = ?
      `,
      [id]
    );

    await insertItems(connection, id, finalItems);

    await connection.commit();

    res.json({
      success: true,
      message: "Procurement requisition updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update procurement requisition error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update procurement requisition",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.submitProcurementRequisition = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        UPDATE ${REQ_TABLE}
        SET status = 'submitted',
            approval_status = 'pending'
        WHERE id = ?
          AND status IN ('draft', 'rejected')
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Requisition not found or cannot be submitted",
      });
    }

    res.json({
      success: true,
      message: "Procurement requisition submitted successfully",
    });
  } catch (error) {
    console.error("Submit procurement requisition error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit procurement requisition",
      error: error.message,
    });
  }
};

exports.approveProcurementRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = "" } = req.body;

    const [result] = await db.query(
      `
        UPDATE ${REQ_TABLE}
        SET status = 'approved',
            approval_status = 'approved',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = NULL,
            remarks = COALESCE(?, remarks)
        WHERE id = ?
          AND approval_status IN ('pending', 'draft')
      `,
      [getUserId(req), remarks || null, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Requisition not found or already processed",
      });
    }

    res.json({
      success: true,
      message: "Procurement requisition approved successfully",
    });
  } catch (error) {
    console.error("Approve procurement requisition error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve procurement requisition",
      error: error.message,
    });
  }
};

exports.rejectProcurementRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason = "" } = req.body;

    const [result] = await db.query(
      `
        UPDATE ${REQ_TABLE}
        SET status = 'rejected',
            approval_status = 'rejected',
            rejection_reason = ?
        WHERE id = ?
          AND approval_status IN ('pending', 'draft')
      `,
      [rejection_reason || "Rejected", id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Requisition not found or already processed",
      });
    }

    res.json({
      success: true,
      message: "Procurement requisition rejected successfully",
    });
  } catch (error) {
    console.error("Reject procurement requisition error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reject procurement requisition",
      error: error.message,
    });
  }
};

exports.deleteProcurementRequisition = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const [[existing]] = await connection.query(
      `
        SELECT *
        FROM ${REQ_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Procurement requisition not found",
      });
    }

    if (existing.status === "approved" || existing.status === "converted") {
      return res.status(400).json({
        success: false,
        message: "Approved or converted requisition cannot be deleted",
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `
        DELETE FROM ${ITEM_TABLE}
        WHERE requisition_id = ?
      `,
      [id]
    );

    await connection.query(
      `
        DELETE FROM ${REQ_TABLE}
        WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Procurement requisition deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete procurement requisition error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete procurement requisition",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
