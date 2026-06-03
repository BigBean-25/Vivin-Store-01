const db = require("../config/db");

exports.getUnits = async (req, res) => {
  try {
    const [units] = await db.query(`
      SELECT
        id,
        name,
        short_name,
        type,
        status,
        created_at
      FROM units
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      count: units.length,
      units,
    });
  } catch (error) {
    console.error("Get units error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch units",
      error: error.message,
    });
  }
};

exports.getActiveUnits = async (req, res) => {
  try {
    const [units] = await db.query(`
      SELECT
        id,
        name,
        short_name,
        type
      FROM units
      WHERE status = 'active'
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      count: units.length,
      units,
    });
  } catch (error) {
    console.error("Get active units error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch active units",
      error: error.message,
    });
  }
};

exports.createUnit = async (req, res) => {
  try {
    const { name, short_name, type, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Unit name is required",
      });
    }

    if (!short_name) {
      return res.status(400).json({
        success: false,
        message: "Short name is required",
      });
    }

    const [existing] = await db.query(
      `
      SELECT id
      FROM units
      WHERE LOWER(name) = LOWER(?) OR LOWER(short_name) = LOWER(?)
      LIMIT 1
      `,
      [name, short_name]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Unit already exists",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO units (
        name,
        short_name,
        type,
        status
      )
      VALUES (?, ?, ?, ?)
      `,
      [name, short_name, type || "other", status || "active"]
    );

    res.status(201).json({
      success: true,
      message: "Unit created successfully",
      unit_id: result.insertId,
    });
  } catch (error) {
    console.error("Create unit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create unit",
      error: error.message,
    });
  }
};

exports.getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    const [units] = await db.query(
      `
      SELECT *
      FROM units
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (units.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.json({
      success: true,
      unit: units[0],
    });
  } catch (error) {
    console.error("Get unit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch unit",
      error: error.message,
    });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, short_name, type, status } = req.body;

    if (!name || !short_name) {
      return res.status(400).json({
        success: false,
        message: "Unit name and short name are required",
      });
    }

    const [existing] = await db.query(
      `
      SELECT id
      FROM units
      WHERE (LOWER(name) = LOWER(?) OR LOWER(short_name) = LOWER(?))
      AND id != ?
      LIMIT 1
      `,
      [name, short_name, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Another unit already exists with same name or short name",
      });
    }

    const [result] = await db.query(
      `
      UPDATE units SET
        name = ?,
        short_name = ?,
        type = ?,
        status = ?
      WHERE id = ?
      `,
      [name, short_name, type || "other", status || "active", id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.json({
      success: true,
      message: "Unit updated successfully",
    });
  } catch (error) {
    console.error("Update unit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update unit",
      error: error.message,
    });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE units
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.json({
      success: true,
      message: "Unit deactivated successfully",
    });
  } catch (error) {
    console.error("Delete unit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate unit",
      error: error.message,
    });
  }
};
