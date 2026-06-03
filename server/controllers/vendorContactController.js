const db = require("../config/db");

const normalizeBoolean = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }

  return 0;
};

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

exports.getVendorContacts = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      status = "",
      is_primary = "",
    } = req.query;

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push("vc.vendor_id = ?");
      params.push(vendor_id);
    }

    if (is_primary !== "") {
      where.push("vc.is_primary = ?");
      params.push(normalizeBoolean(is_primary));
    }

    // Current DB table has no status column.
    // So active = all records, inactive = no records.
    if (status && status !== "active") {
      where.push("1 = 0");
    }

    if (search) {
      where.push(`
        (
          vc.name LIKE ?
          OR vc.phone LIKE ?
          OR vc.email LIKE ?
          OR vc.designation LIKE ?
          OR v.business_name LIKE ?
          OR v.vendor_code LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [contacts] = await db.query(
      `
      SELECT
        vc.id,
        vc.vendor_id,
        vc.name AS contact_name,
        vc.designation,
        NULL AS department,
        vc.phone,
        NULL AS alternate_phone,
        vc.email,
        NULL AS whatsapp_number,
        vc.is_primary,
        'active' AS status,
        NULL AS notes,
        vc.created_at,
        NULL AS updated_at,
        v.business_name AS vendor_name,
        v.vendor_code
      FROM vendor_contacts vc
      LEFT JOIN vendors v ON v.id = vc.vendor_id
      ${whereSql}
      ORDER BY vc.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error("Get vendor contacts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor contacts",
      error: error.message,
    });
  }
};

exports.getVendorContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[contact]] = await db.query(
      `
      SELECT
        vc.id,
        vc.vendor_id,
        vc.name AS contact_name,
        vc.designation,
        NULL AS department,
        vc.phone,
        NULL AS alternate_phone,
        vc.email,
        NULL AS whatsapp_number,
        vc.is_primary,
        'active' AS status,
        NULL AS notes,
        vc.created_at,
        NULL AS updated_at,
        v.business_name AS vendor_name,
        v.vendor_code
      FROM vendor_contacts vc
      LEFT JOIN vendors v ON v.id = vc.vendor_id
      WHERE vc.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Vendor contact not found",
      });
    }

    res.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error("Get vendor contact by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor contact",
      error: error.message,
    });
  }
};

exports.createVendorContact = async (req, res) => {
  try {
    const {
      vendor_id,
      contact_name,
      designation = "",
      phone = "",
      email = "",
      is_primary = 0,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!contact_name || !contact_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact name is required",
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: "Phone or email is required",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
      FROM vendors
      WHERE id = ?
      LIMIT 1
      `,
      [vendor_id]
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const finalPrimary = normalizeBoolean(is_primary);

    if (finalPrimary) {
      await db.query(
        `
        UPDATE vendor_contacts
        SET is_primary = 0
        WHERE vendor_id = ?
        `,
        [vendor_id]
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO vendor_contacts
        (
          vendor_id,
          name,
          designation,
          email,
          phone,
          is_primary
        )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        vendor_id,
        contact_name.trim(),
        cleanValue(designation),
        cleanValue(email),
        cleanValue(phone),
        finalPrimary,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vendor contact created successfully",
      contact_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor contact error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor contact",
      error: error.message,
    });
  }
};

exports.updateVendorContact = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      contact_name,
      designation = "",
      phone = "",
      email = "",
      is_primary = 0,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!contact_name || !contact_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact name is required",
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: "Phone or email is required",
      });
    }

    const [[existing]] = await db.query(
      `
      SELECT id
      FROM vendor_contacts
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor contact not found",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
      FROM vendors
      WHERE id = ?
      LIMIT 1
      `,
      [vendor_id]
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const finalPrimary = normalizeBoolean(is_primary);

    if (finalPrimary) {
      await db.query(
        `
        UPDATE vendor_contacts
        SET is_primary = 0
        WHERE vendor_id = ?
          AND id != ?
        `,
        [vendor_id, id]
      );
    }

    await db.query(
      `
      UPDATE vendor_contacts
      SET
        vendor_id = ?,
        name = ?,
        designation = ?,
        email = ?,
        phone = ?,
        is_primary = ?
      WHERE id = ?
      `,
      [
        vendor_id,
        contact_name.trim(),
        cleanValue(designation),
        cleanValue(email),
        cleanValue(phone),
        finalPrimary,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Vendor contact updated successfully",
    });
  } catch (error) {
    console.error("Update vendor contact error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor contact",
      error: error.message,
    });
  }
};

exports.deleteVendorContact = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      DELETE FROM vendor_contacts
      WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Vendor contact not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor contact deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor contact error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor contact",
      error: error.message,
    });
  }
};