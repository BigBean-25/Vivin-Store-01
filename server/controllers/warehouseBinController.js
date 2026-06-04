const db = require("../config/db");

const generateBinCode = () => "BN-" + Date.now().toString().slice(-6);

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const VALID_STATUSES = ["empty", "occupied", "reserved", "inactive"];

exports.getWarehouseBinSummary = async (req, res) => {
  try {
    const { warehouse_id = "", zone_id = "", rack_id = "" } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) { where.push("wb.warehouse_id = ?"); params.push(warehouse_id); }
    if (zone_id) { where.push("wb.zone_id = ?"); params.push(zone_id); }
    if (rack_id) { where.push("wb.rack_id = ?"); params.push(rack_id); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(wb.id) AS total_bins,
        SUM(CASE WHEN wb.status = 'empty' THEN 1 ELSE 0 END) AS empty_bins,
        SUM(CASE WHEN wb.status = 'occupied' THEN 1 ELSE 0 END) AS occupied_bins,
        SUM(CASE WHEN wb.status = 'reserved' THEN 1 ELSE 0 END) AS reserved_bins,
        SUM(CASE WHEN wb.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_bins,
        COUNT(DISTINCT wb.rack_id) AS racks_with_bins
      FROM warehouse_bins wb
      ${whereSql}
      `,
      params
    );

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get warehouse bin summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse bin summary", error: error.message });
  }
};

exports.getWarehouseBins = async (req, res) => {
  try {
    const { warehouse_id = "", zone_id = "", rack_id = "", status = "", search = "" } = req.query;
    const where = [];
    const params = [];

    if (warehouse_id) { where.push("wb.warehouse_id = ?"); params.push(warehouse_id); }
    if (zone_id) { where.push("wb.zone_id = ?"); params.push(zone_id); }
    if (rack_id) { where.push("wb.rack_id = ?"); params.push(rack_id); }
    if (status) { where.push("wb.status = ?"); params.push(status); }

    if (search) {
      where.push(
        "(wb.bin_code LIKE ? OR wb.name LIKE ? OR wb.description LIKE ? OR wr.name LIKE ? OR wz.name LIKE ? OR w.name LIKE ?)"
      );
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [bins] = await db.query(
      `
      SELECT
        wb.id,
        wb.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        wb.zone_id,
        wz.name AS zone_name,
        wz.zone_code,
        wb.rack_id,
        wr.name AS rack_name,
        wr.rack_code,
        wb.bin_code,
        wb.name AS bin_name,
        wb.description,
        wb.capacity,
        wb.status,
        wb.created_at
      FROM warehouse_bins wb
      LEFT JOIN warehouses w ON w.id = wb.warehouse_id
      LEFT JOIN warehouse_zones wz ON wz.id = wb.zone_id
      LEFT JOIN warehouse_racks wr ON wr.id = wb.rack_id
      ${whereSql}
      ORDER BY w.name ASC, wz.name ASC, wr.name ASC, wb.bin_code ASC
      `,
      params
    );

    res.json({ success: true, count: bins.length, bins });
  } catch (error) {
    console.error("Get warehouse bins error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse bins", error: error.message });
  }
};

exports.getWarehouseBinById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[bin]] = await db.query(
      `
      SELECT
        wb.id,
        wb.warehouse_id,
        w.name AS warehouse_name,
        w.warehouse_code,
        wb.zone_id,
        wz.name AS zone_name,
        wz.zone_code,
        wb.rack_id,
        wr.name AS rack_name,
        wr.rack_code,
        wb.bin_code,
        wb.name AS bin_name,
        wb.description,
        wb.capacity,
        wb.status,
        wb.created_at
      FROM warehouse_bins wb
      LEFT JOIN warehouses w ON w.id = wb.warehouse_id
      LEFT JOIN warehouse_zones wz ON wz.id = wb.zone_id
      LEFT JOIN warehouse_racks wr ON wr.id = wb.rack_id
      WHERE wb.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!bin) {
      return res.status(404).json({ success: false, message: "Warehouse bin not found" });
    }

    res.json({ success: true, bin });
  } catch (error) {
    console.error("Get warehouse bin by id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse bin", error: error.message });
  }
};

exports.createWarehouseBin = async (req, res) => {
  try {
    const { warehouse_id, zone_id, rack_id, bin_code, bin_name, description, capacity, status } = req.body;

    if (!warehouse_id) {
      return res.status(400).json({ success: false, message: "Warehouse is required" });
    }

    if (!bin_name || !bin_name.trim()) {
      return res.status(400).json({ success: false, message: "Bin name is required" });
    }

    const finalCode = bin_code || generateBinCode();
    const finalStatus = VALID_STATUSES.includes(status) ? status : "empty";

    const [result] = await db.query(
      `INSERT INTO warehouse_bins (warehouse_id, zone_id, rack_id, bin_code, name, description, capacity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        warehouse_id,
        cleanValue(zone_id),
        cleanValue(rack_id),
        finalCode,
        bin_name.trim(),
        cleanValue(description),
        capacity || 0,
        finalStatus,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Warehouse bin created successfully",
      bin_id: result.insertId,
      bin_code: finalCode,
    });
  } catch (error) {
    console.error("Create warehouse bin error:", error);
    res.status(500).json({ success: false, message: "Failed to create warehouse bin", error: error.message });
  }
};

exports.updateWarehouseBin = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, zone_id, rack_id, bin_code, bin_name, description, capacity, status } = req.body;

    if (!bin_name || !bin_name.trim()) {
      return res.status(400).json({ success: false, message: "Bin name is required" });
    }

    const [[existing]] = await db.query(
      `SELECT id, bin_code, warehouse_id, zone_id, rack_id FROM warehouse_bins WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Warehouse bin not found" });
    }

    const finalCode = bin_code || existing.bin_code || generateBinCode();
    const finalWarehouseId = warehouse_id || existing.warehouse_id;
    const finalZoneId = zone_id !== undefined ? cleanValue(zone_id) : existing.zone_id;
    const finalRackId = rack_id !== undefined ? cleanValue(rack_id) : existing.rack_id;
    const finalStatus = VALID_STATUSES.includes(status) ? status : "empty";

    await db.query(
      `UPDATE warehouse_bins SET warehouse_id = ?, zone_id = ?, rack_id = ?, bin_code = ?, name = ?, description = ?, capacity = ?, status = ? WHERE id = ?`,
      [
        finalWarehouseId,
        finalZoneId,
        finalRackId,
        finalCode,
        bin_name.trim(),
        cleanValue(description),
        capacity || 0,
        finalStatus,
        id,
      ]
    );

    res.json({ success: true, message: "Warehouse bin updated successfully" });
  } catch (error) {
    console.error("Update warehouse bin error:", error);
    res.status(500).json({ success: false, message: "Failed to update warehouse bin", error: error.message });
  }
};

exports.updateWarehouseBinStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const [result] = await db.query(
      `UPDATE warehouse_bins SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse bin not found" });
    }

    res.json({ success: true, message: `Warehouse bin status updated to ${status}` });
  } catch (error) {
    console.error("Update warehouse bin status error:", error);
    res.status(500).json({ success: false, message: "Failed to update warehouse bin status", error: error.message });
  }
};

exports.deleteWarehouseBin = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(`DELETE FROM warehouse_bins WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse bin not found" });
    }

    res.json({ success: true, message: "Warehouse bin deleted successfully" });
  } catch (error) {
    console.error("Delete warehouse bin error:", error);
    res.status(500).json({ success: false, message: "Failed to delete warehouse bin", error: error.message });
  }
};
