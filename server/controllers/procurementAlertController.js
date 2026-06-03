const db = require("../config/db");

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

exports.getProcurementAlertSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
        SELECT
          COUNT(*) AS total_alerts,
          SUM(CASE WHEN alert_status = 'open' THEN 1 ELSE 0 END) AS open_count,
          SUM(CASE WHEN alert_status = 'closed' THEN 1 ELSE 0 END) AS closed_count,
          SUM(CASE WHEN alert_status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) AS urgent_count,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high_count,
          SUM(
            CASE
              WHEN due_date IS NOT NULL
                AND due_date < CURDATE()
                AND alert_status = 'open'
              THEN 1 ELSE 0
            END
          ) AS overdue_count
        FROM procurement_alerts
      `
    );

    res.json({
      success: true,
      summary: {
        total_alerts: safeNumber(summary?.total_alerts),
        open_count: safeNumber(summary?.open_count),
        closed_count: safeNumber(summary?.closed_count),
        resolved_count: safeNumber(summary?.resolved_count),
        urgent_count: safeNumber(summary?.urgent_count),
        high_count: safeNumber(summary?.high_count),
        overdue_count: safeNumber(summary?.overdue_count),
      },
    });
  } catch (error) {
    console.error("Procurement alert summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement alert summary",
      error: error.message,
    });
  }
};

exports.getProcurementAlerts = async (req, res) => {
  try {
    const {
      search = "",
      alert_type = "",
      priority = "",
      alert_status = "",
      module_name = "",
    } = req.query;

    const where = [];
    const values = [];

    if (alert_type) {
      where.push("alert_type = ?");
      values.push(alert_type);
    }

    if (priority) {
      where.push("priority = ?");
      values.push(priority);
    }

    if (alert_status) {
      where.push("alert_status = ?");
      values.push(alert_status);
    }

    if (module_name) {
      where.push("module_name = ?");
      values.push(module_name);
    }

    if (search && search.trim()) {
      where.push(
        `(alert_title LIKE ? OR alert_message LIKE ? OR reference_number LIKE ?)` 
      );

      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [alerts] = await db.query(
      `
        SELECT
          id,
          alert_type,
          alert_title,
          alert_message,
          module_name,
          record_id,
          reference_number,
          priority,
          alert_status,
          due_date,
          assigned_to,
          assigned_to_name,
          resolved_by,
          resolved_at,
          resolution_remarks,
          created_at,
          updated_at
        FROM procurement_alerts
        ${whereSql}
        ORDER BY
          CASE
            WHEN priority = 'urgent' THEN 1
            WHEN priority = 'high' THEN 2
            WHEN priority = 'normal' THEN 3
            WHEN priority = 'low' THEN 4
            ELSE 5
          END,
          id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: alerts.length,
      alerts,
      data: alerts,
    });
  } catch (error) {
    console.error("Get procurement alerts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement alerts",
      error: error.message,
    });
  }
};

exports.createProcurementAlert = async (req, res) => {
  try {
    const {
      alert_type = "manual",
      alert_title,
      alert_message = "",
      module_name = "",
      record_id = null,
      reference_number = "",
      priority = "normal",
      due_date = null,
      assigned_to = null,
      assigned_to_name = "",
    } = req.body;

    if (!alert_title) {
      return res.status(400).json({
        success: false,
        message: "Alert title is required",
      });
    }

    const [result] = await db.query(
      `
        INSERT INTO procurement_alerts
          (
            alert_type,
            alert_title,
            alert_message,
            module_name,
            record_id,
            reference_number,
            priority,
            alert_status,
            due_date,
            assigned_to,
            assigned_to_name
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
      `,
      [
        alert_type,
        alert_title,
        alert_message || null,
        module_name || null,
        record_id || null,
        reference_number || null,
        priority || "normal",
        due_date || null,
        assigned_to || null,
        assigned_to_name || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Procurement alert created successfully",
      alert_id: result.insertId,
    });
  } catch (error) {
    console.error("Create procurement alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create procurement alert",
      error: error.message,
    });
  }
};

exports.resolveProcurementAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_remarks = "" } = req.body;

    const [result] = await db.query(
      `
        UPDATE procurement_alerts
        SET
          alert_status = 'resolved',
          resolved_by = ?,
          resolved_at = CURRENT_TIMESTAMP,
          resolution_remarks = ?
        WHERE id = ?
      `,
      [getUserId(req), resolution_remarks || null, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Procurement alert not found",
      });
    }

    res.json({
      success: true,
      message: "Procurement alert resolved successfully",
    });
  } catch (error) {
    console.error("Resolve procurement alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to resolve procurement alert",
      error: error.message,
    });
  }
};

exports.deleteProcurementAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        DELETE FROM procurement_alerts
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Procurement alert not found",
      });
    }

    res.json({
      success: true,
      message: "Procurement alert deleted successfully",
    });
  } catch (error) {
    console.error("Delete procurement alert error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete procurement alert",
      error: error.message,
    });
  }
};

exports.generateProcurementAlerts = async (req, res) => {
  try {
    let inserted = 0;

    const [contracts] = await db.query(
      `
        SELECT id, contract_number, contract_title, contract_end_date
        FROM vendor_rate_contracts
        WHERE status = 'active'
          AND contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        LIMIT 100
      `
    ).catch(() => [[]]);

    for (const contract of contracts) {
      const [[existing]] = await db.query(
        `
          SELECT id
          FROM procurement_alerts
          WHERE alert_type = 'contract_expiry'
            AND module_name = 'vendor_rate_contracts'
            AND record_id = ?
            AND alert_status = 'open'
          LIMIT 1
        `,
        [contract.id]
      );

      if (existing) continue;

      await db.query(
        `
          INSERT INTO procurement_alerts
            (
              alert_type,
              alert_title,
              alert_message,
              module_name,
              record_id,
              reference_number,
              priority,
              alert_status,
              due_date
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
        `,
        [
          "contract_expiry",
          `Rate contract expiring: ${contract.contract_title}`,
          `Contract ${contract.contract_number || ""} is expiring soon.`,
          "vendor_rate_contracts",
          contract.id,
          contract.contract_number || null,
          "high",
          contract.contract_end_date,
        ]
      );

      inserted += 1;
    }

    res.json({
      success: true,
      message: "Procurement alerts generated successfully",
      inserted,
    });
  } catch (error) {
    console.error("Generate procurement alerts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate procurement alerts",
      error: error.message,
    });
  }
};
