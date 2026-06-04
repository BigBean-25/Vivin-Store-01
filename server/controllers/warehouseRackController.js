const db = require("../config/db");

const generateRackCode = () => "RK-" + Date.now().toString().slice(-6);

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

exports.getWarehouseRackSummary = async (req, res) => {
  try {
    const { warehouse_id = "", zone_id = "" } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) { where.push("wr.warehouse_id = ?"); params.push(warehouse_id); }
    if (zone_id) { where.push("wr.zone_id = ?"); params.push(zone_id); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(wr.id) AS total_racks,
        SUM(CASE WHEN wr.status = 'active' THEN 1 ELSE 0 END) AS active_racks,
        SUM(CASE WHEN wr.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_racks,
        COUNT(DISTINCT wr.zone_id) AS zones_with_racks
      FROM warehouse_racks wr
      ${whereSql}
      `,
      params
    );

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get warehouse rack summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse rack summary", error: error.message });
  }
};

exports.getWarehouseRacks = async (req, res) => {
  try {
    const { warehouse_id = "", zone_id = "", status = "", search = "" } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) { where.push("wr.warehouse_id = ?"); params.push(warehouse_id); }
    if (zone_id) { where.push("wr.zone_id = ?"); params.push(zone_id); }
    if (status) { where.push("wr.status = ?"); params.push(status); }

    if (search) {
      where.push(
        "(wr.rack_code LIKE ? OR wr.name LIKE ? OR wr.description LIKE ? OR wz.name LIKE ? OR w.name LIKE ?)"
      );
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [racks] = await db.query(
      `
      SELECT
        wr.id,
        wr.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        wr.zone_id,
        wz.name AS zone_name,
        wz.zone_code,
        wr.rack_code,
        wr.name AS rack_name,
        wr.description,
        wr.capacity,
        wr.status,
        wr.created_at
      FROM warehouse_racks wr
      LEFT JOIN warehouses w ON w.id = wr.warehouse_id
      LEFT JOIN warehouse_zones wz ON wz.id = wr.zone_id
      ${whereSql}
      ORDER BY w.name ASC, wz.name ASC, wr.rack_code ASC
      `,
      params
    );

    res.json({ success: true, count: racks.length, racks });
  } catch (error) {
    console.error("Get warehouse racks error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse racks", error: error.message });
  }
};

exports.getWarehouseRackById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[rack]] = await db.query(
      `
      SELECT
        wr.id,
        wr.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        wr.zone_id,
        wz.name AS zone_name,
        wz.zone_code,
        wr.rack_code,
        wr.name AS rack_name,
        wr.description,
        wr.capacity,
        wr.status,
        wr.created_at
      FROM warehouse_racks wr
      LEFT JOIN warehouses w ON w.id = wr.warehouse_id
      LEFT JOIN warehouse_zones wz ON wz.id = wr.zone_id
      WHERE wr.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rack) {
      return res.status(404).json({ success: false, message: "Warehouse rack not found" });
    }

    res.json({ success: true, rack });
  } catch (error) {
    console.error("Get warehouse rack by id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse rack", error: error.message });
  }
};

exports.createWarehouseRack = async (req, res) => {
  try {
    const { warehouse_id, zone_id, rack_code, rack_name, description, capacity, status } = req.body;

    if (!warehouse_id) {
      return res.status(400).json({ success: false, message: "Warehouse is required" });
    }

    if (!rack_name || !rack_name.trim()) {
      return res.status(400).json({ success: false, message: "Rack name is required" });
    }

    const finalCode = rack_code || generateRackCode();

    const [result] = await db.query(
      `INSERT INTO warehouse_racks (warehouse_id, zone_id, rack_code, name, description, capacity, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        warehouse_id,
        cleanValue(zone_id),
        finalCode,
        rack_name.trim(),
        cleanValue(description),
        capacity || 0,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Warehouse rack created successfully",
      rack_id: result.insertId,
      rack_code: finalCode,
    });
  } catch (error) {
    console.error("Create warehouse rack error:", error);
    res.status(500).json({ success: false, message: "Failed to create warehouse rack", error: error.message });
  }
};

exports.updateWarehouseRack = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, zone_id, rack_code, rack_name, description, capacity, status } = req.body;

    if (!rack_name || !rack_name.trim()) {
      return res.status(400).json({ success: false, message: "Rack name is required" });
    }

    const [[existing]] = await db.query(
      `SELECT id, rack_code, warehouse_id, zone_id FROM warehouse_racks WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Warehouse rack not found" });
    }

    const finalCode = rack_code || existing.rack_code || generateRackCode();
    const finalWarehouseId = warehouse_id || existing.warehouse_id;
    const finalZoneId = zone_id !== undefined ? cleanValue(zone_id) : existing.zone_id;

    await db.query(
      `UPDATE warehouse_racks SET warehouse_id = ?, zone_id = ?, rack_code = ?, name = ?, description = ?, capacity = ?, status = ? WHERE id = ?`,
      [
        finalWarehouseId,
        finalZoneId,
        finalCode,
        rack_name.trim(),
        cleanValue(description),
        capacity || 0,
        status || "active",
        id,
      ]
    );

    res.json({ success: true, message: "Warehouse rack updated successfully" });
  } catch (error) {
    console.error("Update warehouse rack error:", error);
    res.status(500).json({ success: false, message: "Failed to update warehouse rack", error: error.message });
  }
};

exports.updateWarehouseRackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(
      `UPDATE warehouse_racks SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse rack not found" });
    }

    res.json({ success: true, message: `Warehouse rack ${status} successfully` });
  } catch (error) {
    console.error("Update warehouse rack status error:", error);
    res.status(500).json({ success: false, message: "Failed to update warehouse rack status", error: error.message });
  }
};

exports.deleteWarehouseRack = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(`DELETE FROM warehouse_racks WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse rack not found" });
    }

    res.json({ success: true, message: "Warehouse rack deleted successfully" });
  } catch (error) {
    console.error("Delete warehouse rack error:", error);
    res.status(500).json({ success: false, message: "Failed to delete warehouse rack", error: error.message });
  }
};
