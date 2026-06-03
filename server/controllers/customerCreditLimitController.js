const db = require("../config/db");

exports.getAllCreditLimits = async (req, res) => {
  try {
    const [creditLimits] = await db.query(`
      SELECT 
        ccl.id,
        ccl.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        ccl.limit_amount,
        ccl.used_amount,
        ccl.effective_from,
        ccl.effective_to,
        ccl.approved_by,
        u.name AS approved_by_name,
        ccl.status,
        ccl.created_at
      FROM customer_credit_limits ccl
      LEFT JOIN customers c ON ccl.customer_id = c.id
      LEFT JOIN users u ON ccl.approved_by = u.id
      ORDER BY ccl.id DESC
    `);

    res.json({
      success: true,
      count: creditLimits.length,
      creditLimits,
    });
  } catch (error) {
    console.error("Get credit limits error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer credit limits",
      error: error.message,
    });
  }
};

exports.getCreditLimitsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [creditLimits] = await db.query(
      `
      SELECT 
        ccl.id,
        ccl.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        ccl.limit_amount,
        ccl.used_amount,
        ccl.effective_from,
        ccl.effective_to,
        ccl.approved_by,
        u.name AS approved_by_name,
        ccl.status,
        ccl.created_at
      FROM customer_credit_limits ccl
      LEFT JOIN customers c ON ccl.customer_id = c.id
      LEFT JOIN users u ON ccl.approved_by = u.id
      WHERE ccl.customer_id = ?
      ORDER BY ccl.id DESC
      `,
      [customerId]
    );

    res.json({
      success: true,
      count: creditLimits.length,
      creditLimits,
    });
  } catch (error) {
    console.error("Get customer credit limits error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer credit limits",
      error: error.message,
    });
  }
};

exports.createCreditLimit = async (req, res) => {
  try {
    const {
      customer_id,
      limit_amount,
      used_amount,
      effective_from,
      effective_to,
      status,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!limit_amount) {
      return res.status(400).json({
        success: false,
        message: "Credit limit amount is required",
      });
    }

    const approvedBy = req.user?.id || null;

    const [result] = await db.query(
      `
      INSERT INTO customer_credit_limits (
        customer_id,
        limit_amount,
        used_amount,
        effective_from,
        effective_to,
        approved_by,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customer_id,
        limit_amount,
        used_amount || 0,
        effective_from || null,
        effective_to || null,
        approvedBy,
        status || "active",
      ]
    );

    if ((status || "active") === "active") {
      await db.query(
        `
        UPDATE customers
        SET credit_limit = ?
        WHERE id = ?
        `,
        [limit_amount, customer_id]
      );
    }

    res.status(201).json({
      success: true,
      message: "Customer credit limit created successfully",
      credit_limit_id: result.insertId,
    });
  } catch (error) {
    console.error("Create credit limit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer credit limit",
      error: error.message,
    });
  }
};

exports.updateCreditLimit = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      customer_id,
      limit_amount,
      used_amount,
      effective_from,
      effective_to,
      status,
    } = req.body;

    if (!customer_id || !limit_amount) {
      return res.status(400).json({
        success: false,
        message: "Customer ID and credit limit amount are required",
      });
    }

    const approvedBy = req.user?.id || null;

    const [result] = await db.query(
      `
      UPDATE customer_credit_limits SET
        customer_id = ?,
        limit_amount = ?,
        used_amount = ?,
        effective_from = ?,
        effective_to = ?,
        approved_by = ?,
        status = ?
      WHERE id = ?
      `,
      [
        customer_id,
        limit_amount,
        used_amount || 0,
        effective_from || null,
        effective_to || null,
        approvedBy,
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer credit limit not found",
      });
    }

    if ((status || "active") === "active") {
      await db.query(
        `
        UPDATE customers
        SET credit_limit = ?
        WHERE id = ?
        `,
        [limit_amount, customer_id]
      );
    }

    res.json({
      success: true,
      message: "Customer credit limit updated successfully",
    });
  } catch (error) {
    console.error("Update credit limit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer credit limit",
      error: error.message,
    });
  }
};

exports.deleteCreditLimit = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE customer_credit_limits
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer credit limit not found",
      });
    }

    res.json({
      success: true,
      message: "Customer credit limit deactivated successfully",
    });
  } catch (error) {
    console.error("Delete credit limit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate customer credit limit",
      error: error.message,
    });
  }
};
