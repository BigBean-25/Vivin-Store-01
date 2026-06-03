const db = require("../config/db");

const createSlug = (text) => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const toBool = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue ? 1 : 0;
  }

  return value === true || value === "true" || value === 1 || value === "1"
    ? 1
    : 0;
};

exports.getProducts = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.id,
        p.product_code,
        p.sku,
        p.name,
        p.slug,
        p.category_id,
        c.name AS category_name,
        p.sub_category_id,
        sc.name AS sub_category_name,
        p.brand_id,
        b.name AS brand_name,
        p.unit_id,
        u.name AS unit_name,
        u.short_name AS unit_short_name,
        p.hsn_code,
        p.barcode,
        p.description,
        p.base_price,
        p.purchase_price,
        p.tax_rate,
        p.min_stock_level,
        p.reorder_level,
        p.shelf_life_days,
        p.is_batch_tracking,
        p.is_expiry_tracking,
        p.status,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN units u ON p.unit_id = u.id
      ORDER BY p.id DESC
    `);

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

exports.getActiveProducts = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.id,
        p.product_code,
        p.sku,
        p.name,
        p.base_price,
        p.purchase_price,
        p.category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
      ORDER BY p.name ASC
    `);

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get active products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch active products",
      error: error.message,
    });
  }
};

exports.getPendingProducts = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.id,
        p.product_code,
        p.sku,
        p.name,
        p.slug,
        p.category_id,
        c.name AS category_name,
        p.sub_category_id,
        sc.name AS sub_category_name,
        p.brand_id,
        b.name AS brand_name,
        p.unit_id,
        u.name AS unit_name,
        u.short_name AS unit_short_name,
        p.hsn_code,
        p.barcode,
        p.description,
        p.base_price,
        p.purchase_price,
        p.tax_rate,
        p.min_stock_level,
        p.reorder_level,
        p.shelf_life_days,
        p.is_batch_tracking,
        p.is_expiry_tracking,
        p.status,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.status IN ('pending', 'draft')
      ORDER BY p.id DESC
    `);

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get pending products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch pending products",
      error: error.message,
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      product_code,
      sku,
      name,
      slug,
      category_id,
      sub_category_id,
      brand_id,
      unit_id,
      hsn_code,
      barcode,
      description,
      base_price,
      purchase_price,
      tax_rate,
      min_stock_level,
      reorder_level,
      shelf_life_days,
      is_batch_tracking,
      is_expiry_tracking,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    const timeCode = Date.now();

    const finalProductCode = product_code || `PROD-${timeCode}`;
    const finalSku = sku || `SKU-${timeCode}`;
    const finalSlug = slug || createSlug(`${name}-${timeCode}`);

    const [result] = await db.query(
      `
      INSERT INTO products (
        product_code,
        sku,
        name,
        slug,
        category_id,
        sub_category_id,
        brand_id,
        unit_id,
        hsn_code,
        barcode,
        description,
        base_price,
        purchase_price,
        tax_rate,
        min_stock_level,
        reorder_level,
        shelf_life_days,
        is_batch_tracking,
        is_expiry_tracking,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalProductCode,
        finalSku,
        name,
        finalSlug,
        category_id || null,
        sub_category_id || null,
        brand_id || null,
        unit_id || null,
        hsn_code || null,
        barcode || null,
        description || null,
        base_price || 0,
        purchase_price || 0,
        tax_rate || 0,
        min_stock_level || 0,
        reorder_level || 0,
        shelf_life_days || 0,
        toBool(is_batch_tracking, true),
        toBool(is_expiry_tracking, true),
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product_id: result.insertId,
    });
  } catch (error) {
    console.error("Create product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await db.query(
      `
      SELECT 
        p.*,
        c.name AS category_name,
        sc.name AS sub_category_name,
        b.name AS brand_name,
        u.name AS unit_name,
        u.short_name AS unit_short_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product: products[0],
    });
  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      product_code,
      sku,
      name,
      slug,
      category_id,
      sub_category_id,
      brand_id,
      unit_id,
      hsn_code,
      barcode,
      description,
      base_price,
      purchase_price,
      tax_rate,
      min_stock_level,
      reorder_level,
      shelf_life_days,
      is_batch_tracking,
      is_expiry_tracking,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    const finalSlug = slug || createSlug(name);

    const [result] = await db.query(
      `
      UPDATE products SET
        product_code = ?,
        sku = ?,
        name = ?,
        slug = ?,
        category_id = ?,
        sub_category_id = ?,
        brand_id = ?,
        unit_id = ?,
        hsn_code = ?,
        barcode = ?,
        description = ?,
        base_price = ?,
        purchase_price = ?,
        tax_rate = ?,
        min_stock_level = ?,
        reorder_level = ?,
        shelf_life_days = ?,
        is_batch_tracking = ?,
        is_expiry_tracking = ?,
        status = ?
      WHERE id = ?
      `,
      [
        product_code || null,
        sku || null,
        name,
        finalSlug,
        category_id || null,
        sub_category_id || null,
        brand_id || null,
        unit_id || null,
        hsn_code || null,
        barcode || null,
        description || null,
        base_price || 0,
        purchase_price || 0,
        tax_rate || 0,
        min_stock_level || 0,
        reorder_level || 0,
        shelf_life_days || 0,
        toBool(is_batch_tracking, true),
        toBool(is_expiry_tracking, true),
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Update product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE products
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deactivated successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate product",
      error: error.message,
    });
  }
};
