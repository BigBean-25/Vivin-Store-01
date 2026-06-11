const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active') AS active,
        SUM(status = 'inactive') AS inactive,
        COALESCE(ROUND(AVG(discount_percentage), 2), 0) AS avg_discount,
        COALESCE(SUM(discount_percentage), 0) AS total_discount
      FROM customer_groups
    `);

    const s = rows[0];

    res.json({
      success: true,
      summary: {
        total: Number(s.total),
        active: Number(s.active),
        inactive: Number(s.inactive),
        avg_discount: Number(s.avg_discount),
        total_discount: Number(s.total_discount),
      },
    });
  } catch (error) {
    console.error("Get customer group summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer group summary",
      error: error.message,
    });
  }
};

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

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "A customer group with this name already exists",
      });
    }

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

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "inactive"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status required: active, inactive",
      });
    }

    const [result] = await db.query(
      "UPDATE customer_groups SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer group not found",
      });
    }

    res.json({
      success: true,
      message: "Customer group status updated successfully",
    });
  } catch (error) {
    console.error("Update customer group status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer group status",
      error: error.message,
    });
  }
};

exports.deleteCustomerGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const [usage] = await db.query(
      "SELECT COUNT(*) AS cnt FROM customers WHERE group_id = ?",
      [id]
    );

    if (usage[0].cnt > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate: ${usage[0].cnt} customer(s) are assigned to this group. Reassign them first.`,
      });
    }

    const [result] = await db.query(
      "UPDATE customer_groups SET status = 'inactive' WHERE id = ?",
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
