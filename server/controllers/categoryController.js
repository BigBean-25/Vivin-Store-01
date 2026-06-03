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
  return `/uploads/categories/${file.filename}`;
};

const deleteImageFile = (imagePath) => {
  if (!imagePath) return;

  const cleanPath = imagePath.replace(/^\/+/, "");
  const fullPath = path.join(__dirname, "..", cleanPath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT 
        id,
        name,
        slug,
        image,
        description,
        sort_order,
        status,
        created_at,
        updated_at
      FROM categories
      ORDER BY sort_order ASC, id DESC
    `);

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

exports.getActiveCategories = async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT 
        id,
        name,
        slug,
        image
      FROM categories
      WHERE status = 'active'
      ORDER BY sort_order ASC, name ASC
    `);

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get active categories error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch active categories",
      error: error.message,
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, sort_order, status } = req.body;

    if (!name) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const finalSlug = slug || createSlug(name);
    const imagePath = req.file ? getImagePath(req.file) : null;

    const [result] = await db.query(
      `
      INSERT INTO categories (
        name,
        slug,
        image,
        description,
        sort_order,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
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
      message: "Category created successfully",
      category_id: result.insertId,
      image: imagePath,
    });
  } catch (error) {
    console.error("Create category error:", error);

    if (req.file) deleteImageFile(getImagePath(req.file));

    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await db.query(
      `
      SELECT *
      FROM categories
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      category: categories[0],
    });
  } catch (error) {
    console.error("Get category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, sort_order, status } = req.body;

    if (!name) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const [oldCategories] = await db.query(
      `
      SELECT image
      FROM categories
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (oldCategories.length === 0) {
      if (req.file) deleteImageFile(getImagePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const oldImage = oldCategories[0].image;
    const newImage = req.file ? getImagePath(req.file) : oldImage;
    const finalSlug = slug || createSlug(name);

    const [result] = await db.query(
      `
      UPDATE categories SET
        name = ?,
        slug = ?,
        image = ?,
        description = ?,
        sort_order = ?,
        status = ?
      WHERE id = ?
      `,
      [
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
        message: "Category not found",
      });
    }

    if (req.file && oldImage) {
      deleteImageFile(oldImage);
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      image: newImage,
    });
  } catch (error) {
    console.error("Update category error:", error);

    if (req.file) deleteImageFile(getImagePath(req.file));

    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE categories
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      message: "Category deactivated successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate category",
      error: error.message,
    });
  }
};
