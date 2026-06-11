const db = require("../config/db");

const generateCustomerCode = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `CUS-${ts}-${rand}`;
};

exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active') AS active,
        SUM(status = 'pending') AS pending,
        SUM(status IN ('inactive', 'blocked')) AS blocked_inactive,
        COALESCE(SUM(credit_limit), 0) AS total_credit_limit
      FROM customers
    `);

    const s = rows[0];

    res.json({
      success: true,
      summary: {
        total: Number(s.total),
        active: Number(s.active),
        pending: Number(s.pending),
        blocked_inactive: Number(s.blocked_inactive),
        total_credit_limit: Number(s.total_credit_limit),
      },
    });
  } catch (error) {
    console.error("Get customer summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer summary",
      error: error.message,
    });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const [customers] = await db.query(`
      SELECT 
        id,
        user_id,
        customer_code,
        business_name,
        contact_person,
        email,
        phone,
        gst_number,
        pan_number,
        group_id,
        credit_limit,
        credit_days,
        status,
        created_at,
        updated_at
      FROM customers
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const {
      customer_code,
      business_name,
      contact_person,
      email,
      phone,
      gst_number,
      pan_number,
      group_id,
      credit_limit,
      credit_days,
      status,
    } = req.body;

    if (!business_name) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    const finalCustomerCode = (customer_code && customer_code.trim()) || generateCustomerCode();

    const [result] = await db.query(
      `
      INSERT INTO customers (
        user_id,
        customer_code,
        business_name,
        contact_person,
        email,
        phone,
        gst_number,
        pan_number,
        group_id,
        credit_limit,
        credit_days,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        null,
        finalCustomerCode,
        business_name,
        contact_person || null,
        email || null,
        phone || null,
        gst_number || null,
        pan_number || null,
        group_id || null,
        credit_limit || 0,
        credit_days || 0,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer_id: result.insertId,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [customers] = await db.query(
      `
      SELECT *
      FROM customers
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      customer: customers[0],
    });
  } catch (error) {
    console.error("Get customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      customer_code,
      business_name,
      contact_person,
      email,
      phone,
      gst_number,
      pan_number,
      group_id,
      credit_limit,
      credit_days,
      status,
    } = req.body;

    if (!business_name) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    const [result] = await db.query(
      `
      UPDATE customers SET
        business_name = ?,
        contact_person = ?,
        email = ?,
        phone = ?,
        gst_number = ?,
        pan_number = ?,
        group_id = ?,
        credit_limit = ?,
        credit_days = ?,
        status = ?
      WHERE id = ?
      `,
      [
        business_name,
        contact_person || null,
        email || null,
        phone || null,
        gst_number || null,
        pan_number || null,
        group_id || null,
        credit_limit || 0,
        credit_days || 0,
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Update customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message,
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "inactive", "pending", "blocked"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status required: active, inactive, pending, blocked",
      });
    }

    const [result] = await db.query(
      "UPDATE customers SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer status updated successfully",
    });
  } catch (error) {
    console.error("Update customer status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer status",
      error: error.message,
    });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE customers
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer deactivated successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};
