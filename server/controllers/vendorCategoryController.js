const db = require("../config/db");

const allowedStatuses = ["active", "inactive"];

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const normalizeStatus = (status, fallback = "active") => {
  if (allowedStatuses.includes(status)) return status;

  if (status === 1 || status === "1" || status === true) return "active";
  if (status === 0 || status === "0" || status === false) return "inactive";

  return fallback;
};

exports.getVendorCategorySummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(id)                                                  AS total_categories,
        SUM(CASE WHEN status = 'active'   THEN 1 ELSE 0 END)       AS active_categories,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END)       AS inactive_categories,
        (SELECT COUNT(id) FROM vendors WHERE category_id IS NOT NULL) AS linked_vendors
      FROM vendor_categories
    `);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor category summary", error: error.message });
  }
};

exports.getVendorCategories = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const where = [];
    const params = [];

    if (search) {
      where.push(`
        (
          vc.name LIKE ?
          OR vc.description LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(keyword, keyword);
    }

    if (status !== "") {
      where.push("vc.status = ?");
      params.push(normalizeStatus(status));
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [categories] = await db.query(
      `
      SELECT
        vc.id,
        vc.name,
        vc.description,
        vc.status,
        vc.created_at,
        COUNT(v.id) AS vendor_count
      FROM vendor_categories vc
      LEFT JOIN vendors v ON v.category_id = vc.id
      ${whereSql}
      GROUP BY
        vc.id,
        vc.name,
        vc.description,
        vc.status,
        vc.created_at
      ORDER BY vc.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get vendor categories error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor categories",
      error: error.message,
    });
  }
};

exports.getVendorCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[category]] = await db.query(
      `
      SELECT
        id,
        name,
        description,
        status,
        created_at
      FROM vendor_categories
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get vendor category by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor category",
      error: error.message,
    });
  }
};

exports.createVendorCategory = async (req, res) => {
  try {
    const { name, description = "", status = "active" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const finalStatus = normalizeStatus(status);

    const [[existing]] = await db.query(
      `
      SELECT id
      FROM vendor_categories
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
      `,
      [name.trim()]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Vendor category already exists",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO vendor_categories
        (
          name,
          description,
          status
        )
      VALUES (?, ?, ?)
      `,
      [name.trim(), cleanValue(description), finalStatus]
    );

    res.status(201).json({
      success: true,
      message: "Vendor category created successfully",
      category_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor category",
      error: error.message,
    });
  }
};

exports.updateVendorCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description = "", status = "active" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const finalStatus = normalizeStatus(status);

    const [[category]] = await db.query(
      `
      SELECT id
      FROM vendor_categories
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
    }

    const [[duplicate]] = await db.query(
      `
      SELECT id
      FROM vendor_categories
      WHERE LOWER(name) = LOWER(?)
        AND id != ?
      LIMIT 1
      `,
      [name.trim(), id]
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another vendor category already uses this name",
      });
    }

    await db.query(
      `
      UPDATE vendor_categories
      SET
        name = ?,
        description = ?,
        status = ?
      WHERE id = ?
      `,
      [name.trim(), cleanValue(description), finalStatus, id]
    );

    res.json({
      success: true,
      message: "Vendor category updated successfully",
    });
  } catch (error) {
    console.error("Update vendor category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor category",
      error: error.message,
    });
  }
};

exports.updateVendorCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(`UPDATE vendor_categories SET status = ? WHERE id = ?`, [status, id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Vendor category not found" });
    }

    res.json({ success: true, message: `Vendor category ${status === "active" ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update vendor category status", error: error.message });
  }
};

exports.deleteVendorCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [[linkedVendor]] = await db.query(
      `
      SELECT id
      FROM vendors
      WHERE category_id = ?
      LIMIT 1
      `,
      [id]
    );

    if (linkedVendor) {
      return res.status(400).json({
        success: false,
        message: "This category is linked with vendors. Cannot delete.",
      });
    }

    const [result] = await db.query(
      `
      DELETE FROM vendor_categories
      WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor category deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor category",
      error: error.message,
    });
  }
};