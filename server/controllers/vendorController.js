const db = require("../config/db");

exports.getVendors = async (req, res) => {
  try {
    const [vendors] = await db.query(`
      SELECT 
        id,
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
        created_at,
        updated_at
      FROM vendors
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    console.error("Get vendors error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message,
    });
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

    if (!business_name) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    const finalVendorCode = vendor_code || `VEN-${Date.now()}`;

    const [result] = await db.query(
      `
      INSERT INTO vendors (
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
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id || null,
        finalVendorCode,
        business_name,
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
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor",
      error: error.message,
    });
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

    if (!business_name) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    const [result] = await db.query(
      `
      UPDATE vendors SET
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
      WHERE id = ?
      `,
      [
        vendor_code || null,
        business_name,
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
        status || "active",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor updated successfully",
    });
  } catch (error) {
    console.error("Update vendor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor",
      error: error.message,
    });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE vendors
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor deactivated successfully",
    });
  } catch (error) {
    console.error("Delete vendor error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor",
      error: error.message,
    });
  }
};
