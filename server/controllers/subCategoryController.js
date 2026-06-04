const db = require("../config/db");
const fs = require("fs");
const path = require("path");

const createSlug = (text) => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getImagePath = (file) => {
  if (!file) return null;
  return `/uploads/sub-categories/${file.filename}`;
};

const deleteImageFile = (imagePath) => {
  if (!imagePath) return;

  const cleanPath = imagePath.replace(/^\/+/, "");
  const fullPath = path.join(__dirname, "..", cleanPath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

exports.getSubCategorySummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(sc.id) AS total_sub_categories,
        SUM(CASE WHEN sc.status = 'active' THEN 1 ELSE 0 END) AS active_sub_categories,
        SUM(CASE WHEN sc.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_sub_categories,
        COUNT(DISTINCT sc.category_id) AS categories_used
      FROM sub_categories sc
    `);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch sub category summary", error: error.message });
  }
};

exports.getSubCategories = async (req, res) => {
  try {
    const [subCategories] = await db.query(`
      SELECT 
        sc.id,
        sc.category_id,
        c.name AS category_name,
        sc.name,
        sc.slug,
        sc.image,
        sc.description,
        sc.sort_order,
        sc.status,
        sc.created_at
      FROM sub_categories sc
      LEFT JOIN categories c ON sc.category_id = c.id
      ORDER BY sc.sort_order ASC, sc.id DESC
    `);

    res.json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub categories",
      error: error.message,
    });
  }
};

exports.getActiveSubCategories = async (req, res) => {
  try {
    const [subCategories] = await db.query(`
      SELECT 
        sc.id,
        sc.category_id,
        c.name AS category_name,
        sc.name,
        sc.slug,
        sc.image
      FROM sub_categories sc
      LEFT JOIN categories c ON sc.category_id = c.id
      WHERE sc.status = 'active'
      ORDER BY sc.name ASC
    `);

    res.json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch active sub categories",
      error: error.message,
    });
  }
};

exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const [subCategories] = await db.query(
      `
      SELECT 
        id,
        category_id,
        name,
        slug,
        image,
        description,
        sort_order,
        status,
        created_at
      FROM sub_categories
      WHERE category_id = ?
      ORDER BY sort_order ASC, id DESC
      `,
      [categoryId]
    );

    res.json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub categories by category",
      error: error.message,
    });
  }
};

exports.createSubCategory = async (req, res) => {
  try {
    const { category_id, name, slug, description, sort_order, status } = req.body;

    if (!category_id) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!name) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Sub category name is required",
      });
    }

    const [category] = await db.query(
      `
      SELECT id
      FROM categories
      WHERE id = ?
      LIMIT 1
      `,
      [category_id]
    );

    if (category.length === 0) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const finalSlug = slug || createSlug(name);
    const imagePath = req.file ? getImagePath(req.file) : null;

    const [result] = await db.query(
      `
      INSERT INTO sub_categories (
        category_id,
        name,
        slug,
        image,
        description,
        sort_order,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        category_id,
        name,
        finalSlug,
        imagePath,
        description || null,
        sort_order || 0,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Sub category created successfully",
      sub_category_id: result.insertId,
      image: imagePath,
    });
  } catch (error) {
    if (req.file) deleteImageFile(getImagePath(req.file));

    res.status(500).json({
      success: false,
      message: "Failed to create sub category",
      error: error.message,
    });
  }
};

exports.getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [subCategories] = await db.query(
      `
      SELECT 
        sc.*,
        c.name AS category_name
      FROM sub_categories sc
      LEFT JOIN categories c ON sc.category_id = c.id
      WHERE sc.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (subCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    res.json({
      success: true,
      subCategory: subCategories[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub category",
      error: error.message,
    });
  }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, slug, description, sort_order, status } = req.body;

    if (!category_id || !name) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Category and sub category name are required",
      });
    }

    const [oldSubCategories] = await db.query(
      `
      SELECT image
      FROM sub_categories
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (oldSubCategories.length === 0) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    const oldImage = oldSubCategories[0].image;
    const newImage = req.file ? getImagePath(req.file) : oldImage;
    const finalSlug = slug || createSlug(name);

    const [result] = await db.query(
      `
      UPDATE sub_categories SET
        category_id = ?,
        name = ?,
        slug = ?,
        image = ?,
        description = ?,
        sort_order = ?,
        status = ?
      WHERE id = ?
      `,
      [
        category_id,
        name,
        finalSlug,
        newImage,
        description || null,
        sort_order || 0,
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    if (req.file && oldImage) {
      deleteImageFile(oldImage);
    }

    res.json({
      success: true,
      message: "Sub category updated successfully",
      image: newImage,
    });
  } catch (error) {
    if (req.file) deleteImageFile(getImagePath(req.file));

    res.status(500).json({
      success: false,
      message: "Failed to update sub category",
      error: error.message,
    });
  }
};

exports.updateSubCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(`UPDATE sub_categories SET status = ? WHERE id = ?`, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Sub category not found" });
    }

    res.json({ success: true, message: `Sub category ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update sub category status", error: error.message });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [[productUsage]] = await db.query(
      `SELECT COUNT(id) AS cnt FROM products WHERE sub_category_id = ? LIMIT 1`, [id]
    );
    if (productUsage.cnt > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — sub category is used by ${productUsage.cnt} product(s). Deactivate it instead.`,
      });
    }

    const [[sc]] = await db.query(`SELECT image FROM sub_categories WHERE id = ? LIMIT 1`, [id]);
    if (!sc) {
      return res.status(404).json({ success: false, message: "Sub category not found" });
    }

    await db.query(`DELETE FROM sub_categories WHERE id = ?`, [id]);
    if (sc.image) deleteImageFile(sc.image);

    res.json({ success: true, message: "Sub category deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete sub category", error: error.message });
  }
};
