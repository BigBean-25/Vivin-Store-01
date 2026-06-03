const db = require("../config/db");

exports.getCustomerGroups = async (req, res) => {
  try {
    const [groups] = await db.query(`
      SELECT 
        id,
        name,
        description,
        discount_percentage,
        status,
        created_at
      FROM customer_groups
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    console.error("Get customer groups error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer groups",
      error: error.message,
    });
  }
};

exports.createCustomerGroup = async (req, res) => {
  try {
    const { name, description, discount_percentage, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO customer_groups (
        name,
        description,
        discount_percentage,
        status
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        name,
        description || null,
        discount_percentage || 0,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer group created successfully",
      group_id: result.insertId,
    });
  } catch (error) {
    console.error("Create customer group error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer group",
      error: error.message,
    });
  }
};

exports.getCustomerGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const [groups] = await db.query(
      `
      SELECT *
      FROM customer_groups
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer group not found",
      });
    }

    res.json({
      success: true,
      group: groups[0],
    });
  } catch (error) {
    console.error("Get customer group error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer group",
      error: error.message,
    });
  }
};

exports.updateCustomerGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, discount_percentage, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const [result] = await db.query(
      `
      UPDATE customer_groups SET
        name = ?,
        description = ?,
        discount_percentage = ?,
        status = ?
      WHERE id = ?
      `,
      [
        name,
        description || null,
        discount_percentage || 0,
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer group not found",
      });
    }

    res.json({
      success: true,
      message: "Customer group updated successfully",
    });
  } catch (error) {
    console.error("Update customer group error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer group",
      error: error.message,
    });
  }
};

exports.deleteCustomerGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE customer_groups
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer group not found",
      });
    }

    res.json({
      success: true,
      message: "Customer group deactivated successfully",
    });
  } catch (error) {
    console.error("Delete customer group error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate customer group",
      error: error.message,
    });
  }
};
