const db = require("../config/db");

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

    const finalCustomerCode = customer_code || `CUS-${Date.now()}`;

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
        customer_code = ?,
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
        customer_code || null,
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
