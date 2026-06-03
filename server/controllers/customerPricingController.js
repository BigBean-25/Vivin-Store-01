const db = require("../config/db");

exports.getAllCustomerPricing = async (req, res) => {
  try {
    const [pricing] = await db.query(`
      SELECT 
        cp.id,
        cp.customer_id,
        c.business_name AS customer_name,
        cp.product_id,
        p.name AS product_name,
        p.sku,
        cp.price,
        cp.min_order_qty,
        cp.effective_from,
        cp.effective_to,
        cp.status,
        cp.created_at
      FROM customer_pricing cp
      LEFT JOIN customers c ON cp.customer_id = c.id
      LEFT JOIN products p ON cp.product_id = p.id
      ORDER BY cp.id DESC
    `);

    res.json({
      success: true,
      count: pricing.length,
      pricing,
    });
  } catch (error) {
    console.error("Get customer pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer pricing",
      error: error.message,
    });
  }
};

exports.getPricingByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [pricing] = await db.query(
      `
      SELECT 
        cp.id,
        cp.customer_id,
        c.business_name AS customer_name,
        cp.product_id,
        p.name AS product_name,
        p.sku,
        cp.price,
        cp.min_order_qty,
        cp.effective_from,
        cp.effective_to,
        cp.status,
        cp.created_at
      FROM customer_pricing cp
      LEFT JOIN customers c ON cp.customer_id = c.id
      LEFT JOIN products p ON cp.product_id = p.id
      WHERE cp.customer_id = ?
      ORDER BY cp.id DESC
      `,
      [customerId]
    );

    res.json({
      success: true,
      count: pricing.length,
      pricing,
    });
  } catch (error) {
    console.error("Get customer pricing by customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer pricing",
      error: error.message,
    });
  }
};

exports.createCustomerPricing = async (req, res) => {
  try {
    const {
      customer_id,
      product_id,
      price,
      min_order_qty,
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

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!price) {
      return res.status(400).json({
        success: false,
        message: "Price is required",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO customer_pricing (
        customer_id,
        product_id,
        price,
        min_order_qty,
        effective_from,
        effective_to,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customer_id,
        product_id,
        price,
        min_order_qty || 1,
        effective_from || null,
        effective_to || null,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer pricing created successfully",
      pricing_id: result.insertId,
    });
  } catch (error) {
    console.error("Create customer pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer pricing",
      error: error.message,
    });
  }
};

exports.updateCustomerPricing = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      customer_id,
      product_id,
      price,
      min_order_qty,
      effective_from,
      effective_to,
      status,
    } = req.body;

    if (!customer_id || !product_id || !price) {
      return res.status(400).json({
        success: false,
        message: "Customer ID, Product ID and Price are required",
      });
    }

    const [result] = await db.query(
      `
      UPDATE customer_pricing SET
        customer_id = ?,
        product_id = ?,
        price = ?,
        min_order_qty = ?,
        effective_from = ?,
        effective_to = ?,
        status = ?
      WHERE id = ?
      `,
      [
        customer_id,
        product_id,
        price,
        min_order_qty || 1,
        effective_from || null,
        effective_to || null,
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer pricing not found",
      });
    }

    res.json({
      success: true,
      message: "Customer pricing updated successfully",
    });
  } catch (error) {
    console.error("Update customer pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer pricing",
      error: error.message,
    });
  }
};

exports.deleteCustomerPricing = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE customer_pricing
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer pricing not found",
      });
    }

    res.json({
      success: true,
      message: "Customer pricing deactivated successfully",
    });
  } catch (error) {
    console.error("Delete customer pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate customer pricing",
      error: error.message,
    });
  }
};
