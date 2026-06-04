const db = require("../config/db");

const generateZoneCode = () => "ZN-" + Date.now().toString().slice(-6);

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

exports.getWarehouseZoneSummary = async (req, res) => {
  try {
    const { warehouse_id = "" } = req.query;
    const where = warehouse_id ? "WHERE wz.warehouse_id = ?" : "";
    const params = warehouse_id ? [warehouse_id] : [];

    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(wz.id) AS total_zones,
        SUM(CASE WHEN wz.status = 'active' THEN 1 ELSE 0 END) AS active_zones,
        SUM(CASE WHEN wz.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_zones,
        COUNT(DISTINCT wz.warehouse_id) AS warehouses_with_zones
      FROM warehouse_zones wz
      ${where}
      `,
      params
    );

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get warehouse zone summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse zone summary",
      error: error.message,
    });
  }
};

exports.getWarehouseZones = async (req, res) => {
  try {
    const { warehouse_id = "", status = "", search = "" } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) {
      where.push("wz.warehouse_id = ?");
      params.push(warehouse_id);
    }

    if (status) {
      where.push("wz.status = ?");
      params.push(status);
    }

    if (search) {
      where.push(
        "(wz.zone_code LIKE ? OR wz.name LIKE ? OR wz.description LIKE ? OR w.name LIKE ? OR w.warehouse_code LIKE ?)"
      );
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [zones] = await db.query(
      `
      SELECT
        wz.id,
        wz.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        wz.zone_code,
        wz.name AS zone_name,
        wz.description,
        wz.status,
        wz.created_at
      FROM warehouse_zones wz
      LEFT JOIN warehouses w ON w.id = wz.warehouse_id
      ${whereSql}
      ORDER BY w.name ASC, wz.zone_code ASC
      `,
      params
    );

    res.json({ success: true, count: zones.length, zones });
  } catch (error) {
    console.error("Get warehouse zones error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse zones",
      error: error.message,
    });
  }
};

exports.getWarehouseZoneById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[zone]] = await db.query(
      `
      SELECT
        wz.id,
        wz.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        wz.zone_code,
        wz.name AS zone_name,
        wz.description,
        wz.status,
        wz.created_at
      FROM warehouse_zones wz
      LEFT JOIN warehouses w ON w.id = wz.warehouse_id
      WHERE wz.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!zone) {
      return res.status(404).json({ success: false, message: "Warehouse zone not found" });
    }

    res.json({ success: true, zone });
  } catch (error) {
    console.error("Get warehouse zone by id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse zone",
      error: error.message,
    });
  }
};

exports.createWarehouseZone = async (req, res) => {
  try {
    const { warehouse_id, zone_code, zone_name, description, status } = req.body;

    if (!warehouse_id) {
      return res.status(400).json({ success: false, message: "Warehouse is required" });
    }

    if (!zone_name || !zone_name.trim()) {
      return res.status(400).json({ success: false, message: "Zone name is required" });
    }

    const finalCode = zone_code || generateZoneCode();

    const [result] = await db.query(
      `INSERT INTO warehouse_zones (warehouse_id, zone_code, name, description, status) VALUES (?, ?, ?, ?, ?)`,
      [warehouse_id, finalCode, zone_name.trim(), cleanValue(description), status || "active"]
    );

    res.status(201).json({
      success: true,
      message: "Warehouse zone created successfully",
      zone_id: result.insertId,
      zone_code: finalCode,
    });
  } catch (error) {
    console.error("Create warehouse zone error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create warehouse zone",
      error: error.message,
    });
  }
};

exports.updateWarehouseZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, zone_code, zone_name, description, status } = req.body;

    if (!zone_name || !zone_name.trim()) {
      return res.status(400).json({ success: false, message: "Zone name is required" });
    }

    const [[existing]] = await db.query(
      `SELECT id, zone_code, warehouse_id FROM warehouse_zones WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Warehouse zone not found" });
    }

    const finalCode = zone_code || existing.zone_code || generateZoneCode();
    const finalWarehouseId = warehouse_id || existing.warehouse_id;

    const [result] = await db.query(
      `UPDATE warehouse_zones SET warehouse_id = ?, zone_code = ?, name = ?, description = ?, status = ? WHERE id = ?`,
      [finalWarehouseId, finalCode, zone_name.trim(), cleanValue(description), status || "active", id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse zone not found" });
    }

    res.json({ success: true, message: "Warehouse zone updated successfully" });
  } catch (error) {
    console.error("Update warehouse zone error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update warehouse zone",
      error: error.message,
    });
  }
};

exports.updateWarehouseZoneStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(
      `UPDATE warehouse_zones SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse zone not found" });
    }

    res.json({ success: true, message: `Warehouse zone ${status} successfully` });
  } catch (error) {
    console.error("Update warehouse zone status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update warehouse zone status",
      error: error.message,
    });
  }
};

exports.deleteWarehouseZone = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(`DELETE FROM warehouse_zones WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse zone not found" });
    }

    res.json({ success: true, message: "Warehouse zone deleted successfully" });
  } catch (error) {
    console.error("Delete warehouse zone error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete warehouse zone",
      error: error.message,
    });
  }
};
