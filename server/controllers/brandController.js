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

const getLogoPath = (file) => {
  if (!file) return null;
  return `/uploads/brands/${file.filename}`;
};

const deleteImageFile = (imagePath) => {
  if (!imagePath) return;

  const cleanPath = imagePath.replace(/^\/+/, "");
  const fullPath = path.join(__dirname, "..", cleanPath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

exports.getBrandSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(id) AS total_brands,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_brands,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_brands
      FROM brands
    `);

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch brand summary", error: error.message });
  }
};

exports.getBrands = async (req, res) => {
  try {
    const [brands] = await db.query(`
      SELECT 
        id,
        name,
        slug,
        logo,
        description,
        status,
        created_at
      FROM brands
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      count: brands.length,
      brands,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
      error: error.message,
    });
  }
};

exports.getActiveBrands = async (req, res) => {
  try {
    const [brands] = await db.query(`
      SELECT 
        id,
        name,
        slug,
        logo
      FROM brands
      WHERE status = 'active'
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      count: brands.length,
      brands,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch active brands",
      error: error.message,
    });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, slug, description, status } = req.body;

    if (!name) {
      if (req.file) deleteImageFile(getLogoPath(req.file));

      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const finalSlug = slug || createSlug(name);
    const logoPath = req.file ? getLogoPath(req.file) : null;

    const [result] = await db.query(
      `
      INSERT INTO brands (
        name,
        slug,
        logo,
        description,
        status
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [name, finalSlug, logoPath, description || null, status || "active"]
    );

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand_id: result.insertId,
      logo: logoPath,
    });
  } catch (error) {
    if (req.file) deleteImageFile(getLogoPath(req.file));

    res.status(500).json({
      success: false,
      message: "Failed to create brand",
      error: error.message,
    });
  }
};

exports.getBrandById = async (req, res) => {
  try {
    const { id } = req.params;

    const [brands] = await db.query(
      `
      SELECT *
      FROM brands
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (brands.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    res.json({
      success: true,
      brand: brands[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch brand",
      error: error.message,
    });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, status } = req.body;

    if (!name) {
      if (req.file) deleteImageFile(getLogoPath(req.file));

      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const [oldBrands] = await db.query(
      `
      SELECT logo
      FROM brands
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (oldBrands.length === 0) {
      if (req.file) deleteImageFile(getLogoPath(req.file));

      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const oldLogo = oldBrands[0].logo;
    const newLogo = req.file ? getLogoPath(req.file) : oldLogo;
    const finalSlug = slug || createSlug(name);

    const [result] = await db.query(
      `
      UPDATE brands SET
        name = ?,
        slug = ?,
        logo = ?,
        description = ?,
        status = ?
      WHERE id = ?
      `,
      [
        name,
        finalSlug,
        newLogo,
        description || null,
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      if (req.file) deleteImageFile(getLogoPath(req.file));

      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (req.file && oldLogo) {
      deleteImageFile(oldLogo);
    }

    res.json({
      success: true,
      message: "Brand updated successfully",
      logo: newLogo,
    });
  } catch (error) {
    if (req.file) deleteImageFile(getLogoPath(req.file));

    res.status(500).json({
      success: false,
      message: "Failed to update brand",
      error: error.message,
    });
  }
};

exports.updateBrandStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(
      `UPDATE brands SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }

    res.json({ success: true, message: `Brand ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update brand status", error: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const [[usage]] = await db.query(
      `SELECT COUNT(id) AS cnt FROM products WHERE brand_id = ? LIMIT 1`,
      [id]
    );

    if (usage.cnt > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — brand is used by ${usage.cnt} product(s). Deactivate it instead.`,
      });
    }

    const [[brand]] = await db.query(`SELECT logo FROM brands WHERE id = ? LIMIT 1`, [id]);

    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }

    await db.query(`DELETE FROM brands WHERE id = ?`, [id]);

    if (brand.logo) deleteImageFile(brand.logo);

    res.json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete brand", error: error.message });
  }
};
