const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active') AS active,
        SUM(status = 'inactive') AS inactive,
        COALESCE(ROUND(AVG(price), 2), 0) AS avg_price,
        COUNT(DISTINCT customer_id) AS customers_with_pricing,
        COUNT(DISTINCT product_id) AS products_with_pricing
      FROM customer_pricing
    `);

    const s = rows[0];

    res.json({
      success: true,
      summary: {
        total: Number(s.total),
        active: Number(s.active),
        inactive: Number(s.inactive),
        avg_price: Number(s.avg_price),
        customers_with_pricing: Number(s.customers_with_pricing),
        products_with_pricing: Number(s.products_with_pricing),
      },
    });
  } catch (error) {
    console.error("Get customer pricing summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer pricing summary",
      error: error.message,
    });
  }
};

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

exports.getCustomerPricingById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[pricing]] = await db.query(
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
      WHERE cp.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Customer pricing not found",
      });
    }

    res.json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.error("Get customer pricing by id error:", error);

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

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "A pricing rule for this customer, product and effective date already exists",
      });
    }

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
      "UPDATE customer_pricing SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer pricing not found",
      });
    }

    res.json({
      success: true,
      message: "Customer pricing status updated successfully",
    });
  } catch (error) {
    console.error("Update customer pricing status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer pricing status",
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
