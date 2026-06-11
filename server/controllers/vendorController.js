const db = require("../config/db");

const VALID_STATUSES = ["pending", "active", "inactive", "blocked"];

const normalizeStatus = (value, defaultVal = "pending") => {
  if (VALID_STATUSES.includes(value)) return value;
  return defaultVal;
};

const tableExists = async (tableName) => {
  const [rows] = await db.query("SHOW TABLES LIKE ?", [tableName]);
  return rows.length > 0;
};

exports.getVendorSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(id) AS total_vendors,
        SUM(CASE WHEN status = 'active'   THEN 1 ELSE 0 END) AS active_vendors,
        SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending_vendors,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_vendors,
        SUM(CASE WHEN status = 'blocked'  THEN 1 ELSE 0 END) AS blocked_vendors,
        ROUND(AVG(NULLIF(rating, 0)), 2) AS average_rating
      FROM vendors
    `);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor summary", error: error.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const where = [];
    const params = [];

    if (status && VALID_STATUSES.includes(status)) {
      where.push(`status = ?`);
      params.push(status);
    }

    if (search.trim()) {
      where.push(`(business_name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ? OR gst_number LIKE ? OR vendor_code LIKE ?)`);
      const kw = `%${search.trim()}%`;
      params.push(kw, kw, kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [vendors] = await db.query(
      `SELECT id, user_id, vendor_code, business_name, contact_person, email, phone,
              gst_number, pan_number, category_id, address, city, state, pincode,
              credit_days, rating, status, created_at, updated_at
       FROM vendors ${whereSql} ORDER BY id DESC`,
      params
    );

    res.json({ success: true, count: vendors.length, vendors });
  } catch (error) {
    console.error("Get vendors error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendors", error: error.message });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const {
      user_id,
      vendor_code,
      business_name,
      contact_person,
      email,
      phone,
      gst_number,
      pan_number,
      category_id,
      address,
      city,
      state,
      pincode,
      credit_days,
      rating,
      status,
    } = req.body;

    if (!business_name || !String(business_name).trim()) {
      return res.status(400).json({ success: false, message: "Business name is required" });
    }

    const finalVendorCode = vendor_code ? String(vendor_code).trim() : `VEN-${Date.now()}`;

    const [[dupCheck]] = await db.query(
      `SELECT id FROM vendors WHERE vendor_code = ? LIMIT 1`,
      [finalVendorCode]
    );
    if (dupCheck) {
      return res.status(409).json({ success: false, message: `Vendor code "${finalVendorCode}" already exists` });
    }

    const [result] = await db.query(
      `INSERT INTO vendors (user_id, vendor_code, business_name, contact_person, email, phone,
        gst_number, pan_number, category_id, address, city, state, pincode, credit_days, rating, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        finalVendorCode,
        String(business_name).trim(),
        contact_person || null,
        email || null,
        phone || null,
        gst_number || null,
        pan_number || null,
        category_id || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        credit_days || 0,
        rating || 0,
        normalizeStatus(status, "pending"),
      ]
    );

    res.status(201).json({ success: true, message: "Vendor created successfully", vendor_id: result.insertId });
  } catch (error) {
    console.error("Create vendor error:", error);
    res.status(500).json({ success: false, message: "Failed to create vendor", error: error.message });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const [vendors] = await db.query(
      `
      SELECT *
      FROM vendors
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (vendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.json({
      success: true,
      vendor: vendors[0],
    });
  } catch (error) {
    console.error("Get vendor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor",
      error: error.message,
    });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_code,
      business_name,
      contact_person,
      email,
      phone,
      gst_number,
      pan_number,
      category_id,
      address,
      city,
      state,
      pincode,
      credit_days,
      rating,
      status,
    } = req.body;

    if (!business_name || !String(business_name).trim()) {
      return res.status(400).json({ success: false, message: "Business name is required" });
    }

    const [[existing]] = await db.query(`SELECT id, vendor_code FROM vendors WHERE id = ? LIMIT 1`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const newCode = vendor_code ? String(vendor_code).trim() : existing.vendor_code;

    if (newCode && newCode !== existing.vendor_code) {
      const [[dupCheck]] = await db.query(
        `SELECT id FROM vendors WHERE vendor_code = ? AND id != ? LIMIT 1`,
        [newCode, id]
      );
      if (dupCheck) {
        return res.status(409).json({ success: false, message: `Vendor code "${newCode}" already exists` });
      }
    }

    const [result] = await db.query(
      `UPDATE vendors SET
        vendor_code = ?,
        business_name = ?,
        contact_person = ?,
        email = ?,
        phone = ?,
        gst_number = ?,
        pan_number = ?,
        category_id = ?,
        address = ?,
        city = ?,
        state = ?,
        pincode = ?,
        credit_days = ?,
        rating = ?,
        status = ?
       WHERE id = ?`,
      [
        newCode || null,
        String(business_name).trim(),
        contact_person || null,
        email || null,
        phone || null,
        gst_number || null,
        pan_number || null,
        category_id || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        credit_days || 0,
        rating || 0,
        normalizeStatus(status, existing.status || "pending"),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    res.json({ success: true, message: "Vendor updated successfully" });
  } catch (error) {
    console.error("Update vendor error:", error);
    res.status(500).json({ success: false, message: "Failed to update vendor", error: error.message });
  }
};

exports.updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const [result] = await db.query(`UPDATE vendors SET status = ? WHERE id = ?`, [status, id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    res.json({ success: true, message: `Vendor status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update vendor status", error: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const [[vendor]] = await db.query(`SELECT id, business_name FROM vendors WHERE id = ? LIMIT 1`, [id]);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const usageChecks = [
      { table: "vendor_contacts",     label: "vendor contacts" },
      { table: "vendor_addresses",    label: "vendor addresses" },
      { table: "vendor_bank_accounts",label: "vendor bank accounts" },
      { table: "vendor_documents",    label: "vendor documents" },
      { table: "vendor_wallets",      label: "vendor wallets" },
      { table: "vendor_transactions", label: "vendor transactions" },
      { table: "vendor_ledgers",      label: "vendor ledgers" },
      { table: "vendor_ratings",      label: "vendor ratings" },
      { table: "purchase_orders",     label: "purchase orders" },
      { table: "quotations",          label: "quotations" },
      { table: "procurement_payments",label: "procurement payments" },
      { table: "procurement_returns", label: "procurement returns" },
    ];

    for (const check of usageChecks) {
      const exists = await tableExists(check.table);
      if (!exists) continue;
      const [[row]] = await db.query(
        `SELECT COUNT(id) AS cnt FROM \`${check.table}\` WHERE vendor_id = ? LIMIT 1`,
        [id]
      );
      if (row && Number(row.cnt) > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete vendor "${vendor.business_name}" — it is referenced in ${check.label}. Deactivate instead.`,
        });
      }
    }

    await db.query(`DELETE FROM vendors WHERE id = ?`, [id]);

    res.json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ success: false, message: "Failed to delete vendor", error: error.message });
  }
};
