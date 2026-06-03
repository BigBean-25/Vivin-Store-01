const db = require("../config/db");

exports.getWarehouseStaffSummary = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) { where.push("ws.warehouse_id = ?"); params.push(warehouse_id); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(ws.id) AS total_mappings,
        SUM(CASE WHEN ws.status = 'active' THEN 1 ELSE 0 END) AS active_staff,
        SUM(CASE WHEN ws.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_staff,
        COUNT(DISTINCT ws.warehouse_id) AS warehouses_with_staff
      FROM warehouse_staff ws
      ${whereSql}
      `,
      params
    );

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get warehouse staff summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse staff summary", error: error.message });
  }
};

exports.getWarehouseStaff = async (req, res) => {
  try {
    const { warehouse_id = "", status = "", search = "" } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) { where.push("ws.warehouse_id = ?"); params.push(warehouse_id); }
    if (status) { where.push("ws.status = ?"); params.push(status); }

    if (search) {
      where.push(
        "(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR ws.role_title LIKE ? OR w.name LIKE ?)"
      );
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [staff] = await db.query(
      `
      SELECT
        ws.id,
        ws.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ws.user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.user_type,
        u.status AS user_status,
        ws.role_title,
        ws.status,
        ws.created_at
      FROM warehouse_staff ws
      LEFT JOIN warehouses w ON w.id = ws.warehouse_id
      LEFT JOIN users u ON u.id = ws.user_id
      ${whereSql}
      ORDER BY w.name ASC, u.name ASC
      `,
      params
    );

    res.json({ success: true, count: staff.length, staff });
  } catch (error) {
    console.error("Get warehouse staff error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse staff", error: error.message });
  }
};

exports.getWarehouseStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[record]] = await db.query(
      `
      SELECT
        ws.id,
        ws.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        ws.user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.user_type,
        ws.role_title,
        ws.status,
        ws.created_at
      FROM warehouse_staff ws
      LEFT JOIN warehouses w ON w.id = ws.warehouse_id
      LEFT JOIN users u ON u.id = ws.user_id
      WHERE ws.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Warehouse staff mapping not found" });
    }

    res.json({ success: true, record });
  } catch (error) {
    console.error("Get warehouse staff by id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse staff record", error: error.message });
  }
};

exports.createWarehouseStaff = async (req, res) => {
  try {
    const { warehouse_id, user_id, role_title, status } = req.body;

    if (!warehouse_id) {
      return res.status(400).json({ success: false, message: "Warehouse is required" });
    }

    if (!user_id) {
      return res.status(400).json({ success: false, message: "User is required" });
    }

    const [[existing]] = await db.query(
      `SELECT id FROM warehouse_staff WHERE warehouse_id = ? AND user_id = ? LIMIT 1`,
      [warehouse_id, user_id]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This user is already assigned to this warehouse",
      });
    }

    const [result] = await db.query(
      `INSERT INTO warehouse_staff (warehouse_id, user_id, role_title, status) VALUES (?, ?, ?, ?)`,
      [
        warehouse_id,
        user_id,
        role_title || null,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Staff assigned to warehouse successfully",
      staff_id: result.insertId,
    });
  } catch (error) {
    console.error("Create warehouse staff error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "This user is already assigned to this warehouse" });
    }
    res.status(500).json({ success: false, message: "Failed to assign staff to warehouse", error: error.message });
  }
};

exports.updateWarehouseStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, user_id, role_title, status } = req.body;

    const [[existing]] = await db.query(
      `SELECT id, warehouse_id, user_id FROM warehouse_staff WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Warehouse staff mapping not found" });
    }

    const finalWarehouseId = warehouse_id || existing.warehouse_id;
    const finalUserId = user_id || existing.user_id;

    if (
      (String(finalWarehouseId) !== String(existing.warehouse_id) ||
        String(finalUserId) !== String(existing.user_id))
    ) {
      const [[duplicate]] = await db.query(
        `SELECT id FROM warehouse_staff WHERE warehouse_id = ? AND user_id = ? AND id != ? LIMIT 1`,
        [finalWarehouseId, finalUserId, id]
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "This user is already assigned to this warehouse",
        });
      }
    }

    await db.query(
      `UPDATE warehouse_staff SET warehouse_id = ?, user_id = ?, role_title = ?, status = ? WHERE id = ?`,
      [
        finalWarehouseId,
        finalUserId,
        role_title || null,
        status || "active",
        id,
      ]
    );

    res.json({ success: true, message: "Warehouse staff record updated successfully" });
  } catch (error) {
    console.error("Update warehouse staff error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "This user is already assigned to this warehouse" });
    }
    res.status(500).json({ success: false, message: "Failed to update warehouse staff record", error: error.message });
  }
};

exports.updateWarehouseStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(
      `UPDATE warehouse_staff SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse staff mapping not found" });
    }

    res.json({ success: true, message: `Staff mapping ${status} successfully` });
  } catch (error) {
    console.error("Update warehouse staff status error:", error);
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

exports.deleteWarehouseStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(`DELETE FROM warehouse_staff WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse staff mapping not found" });
    }

    res.json({ success: true, message: "Staff mapping removed successfully" });
  } catch (error) {
    console.error("Delete warehouse staff error:", error);
    res.status(500).json({ success: false, message: "Failed to remove staff mapping", error: error.message });
  }
};

exports.getAssignableUsers = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;

    let excludeIds = [];
    if (warehouse_id) {
      const [assigned] = await db.query(
        `SELECT user_id FROM warehouse_staff WHERE warehouse_id = ? AND status = 'active'`,
        [warehouse_id]
      );
      excludeIds = assigned.map((r) => r.user_id);
    }

    const excludeSql = excludeIds.length
      ? `AND u.id NOT IN (${excludeIds.map(() => "?").join(",")})`
      : "";

    const [users] = await db.query(
      `
      SELECT id, name, email, phone, user_type, status
      FROM users u
      WHERE u.status = 'active'
        AND u.user_type NOT IN ('vendor', 'customer')
        ${excludeSql}
      ORDER BY u.name ASC
      `,
      excludeIds
    );

    res.json({ success: true, users });
  } catch (error) {
    console.error("Get assignable users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users", error: error.message });
  }
};
