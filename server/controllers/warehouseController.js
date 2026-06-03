const db = require("../config/db");

const generateWarehouseCode = () => {
  return "WH-" + Date.now();
};

exports.getWarehouseSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(id) AS total_warehouses,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_warehouses,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_warehouses,
        COUNT(DISTINCT NULLIF(city, '')) AS total_cities
      FROM warehouses
    `);

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get warehouse summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch warehouse summary", error: error.message });
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    const [warehouses] = await db.query(`
      SELECT 
        id,
        warehouse_code,
        name,
        phone,
        email,
        address,
        city,
        state,
        pincode,
        status,
        created_at,
        updated_at
      FROM warehouses
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      count: warehouses.length,
      warehouses,
    });
  } catch (error) {
    console.error("Get warehouses error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouses",
      error: error.message,
    });
  }
};

exports.getActiveWarehouses = async (req, res) => {
  try {
    const [warehouses] = await db.query(`
      SELECT 
        id,
        warehouse_code,
        name,
        city,
        state
      FROM warehouses
      WHERE status = 'active'
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      count: warehouses.length,
      warehouses,
    });
  } catch (error) {
    console.error("Get active warehouses error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch active warehouses",
      error: error.message,
    });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const {
      warehouse_code,
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name is required",
      });
    }

    const finalWarehouseCode = warehouse_code || generateWarehouseCode();

    const [result] = await db.query(
      `
      INSERT INTO warehouses (
        warehouse_code,
        name,
        phone,
        email,
        address,
        city,
        state,
        pincode,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalWarehouseCode,
        name,
        phone || null,
        email || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      warehouse_id: result.insertId,
      warehouse_code: finalWarehouseCode,
    });
  } catch (error) {
    console.error("Create warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create warehouse",
      error: error.message,
    });
  }
};

exports.getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [warehouses] = await db.query(
      `
      SELECT *
      FROM warehouses
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (warehouses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.json({
      success: true,
      warehouse: warehouses[0],
    });
  } catch (error) {
    console.error("Get warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse",
      error: error.message,
    });
  }
};

exports.updateWarehouseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(
      `UPDATE warehouses SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Warehouse not found" });
    }

    res.json({ success: true, message: `Warehouse ${status} successfully` });
  } catch (error) {
    console.error("Update warehouse status error:", error);
    res.status(500).json({ success: false, message: "Failed to update warehouse status", error: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      warehouse_code,
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name is required",
      });
    }

    const [[existing]] = await db.query(
      `SELECT warehouse_code FROM warehouses WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Warehouse not found" });
    }

    const finalCode = warehouse_code || existing.warehouse_code || generateWarehouseCode();

    const [result] = await db.query(
      `
      UPDATE warehouses SET
        warehouse_code = ?,
        name = ?,
        phone = ?,
        email = ?,
        address = ?,
        city = ?,
        state = ?,
        pincode = ?,
        status = ?
      WHERE id = ?
      `,
      [
        finalCode,
        name,
        phone || null,
        email || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.json({
      success: true,
      message: "Warehouse updated successfully",
    });
  } catch (error) {
    console.error("Update warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update warehouse",
      error: error.message,
    });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE warehouses
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.json({
      success: true,
      message: "Warehouse deactivated successfully",
    });
  } catch (error) {
    console.error("Delete warehouse error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate warehouse",
      error: error.message,
    });
  }
};
