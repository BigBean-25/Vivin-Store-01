const db = require("../config/db");

const allowedAddressTypes = ["billing", "shipping", "warehouse", "office"];

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const normalizeBoolean = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }

  return 0;
};

const normalizeAddressType = (value) => {
  if (allowedAddressTypes.includes(value)) return value;
  return "office";
};

exports.getVendorAddresses = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      address_type = "",
      is_default = "",
    } = req.query;

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push("va.vendor_id = ?");
      params.push(vendor_id);
    }

    if (address_type) {
      where.push("va.address_type = ?");
      params.push(normalizeAddressType(address_type));
    }

    if (is_default !== "") {
      where.push("va.is_default = ?");
      params.push(normalizeBoolean(is_default));
    }

    if (search) {
      where.push(`
        (
          va.address_line1 LIKE ?
          OR va.address_line2 LIKE ?
          OR va.city LIKE ?
          OR va.state LIKE ?
          OR va.country LIKE ?
          OR va.pincode LIKE ?
          OR v.business_name LIKE ?
          OR v.vendor_code LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [addresses] = await db.query(
      `
      SELECT
        va.id,
        va.vendor_id,
        va.address_type,
        va.address_line1,
        va.address_line2,
        va.city,
        va.state,
        va.country,
        va.pincode,
        va.is_default,
        va.created_at,
        v.business_name AS vendor_name,
        v.vendor_code
      FROM vendor_addresses va
      LEFT JOIN vendors v ON v.id = va.vendor_id
      ${whereSql}
      ORDER BY va.is_default DESC, va.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    console.error("Get vendor addresses error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor addresses",
      error: error.message,
    });
  }
};

exports.getVendorAddressById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[address]] = await db.query(
      `
      SELECT
        va.id,
        va.vendor_id,
        va.address_type,
        va.address_line1,
        va.address_line2,
        va.city,
        va.state,
        va.country,
        va.pincode,
        va.is_default,
        va.created_at,
        v.business_name AS vendor_name,
        v.vendor_code
      FROM vendor_addresses va
      LEFT JOIN vendors v ON v.id = va.vendor_id
      WHERE va.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Vendor address not found",
      });
    }

    res.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error("Get vendor address by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor address",
      error: error.message,
    });
  }
};

exports.createVendorAddress = async (req, res) => {
  try {
    const {
      vendor_id,
      address_type = "office",
      address_line1 = "",
      address_line2 = "",
      city = "",
      state = "",
      country = "India",
      pincode = "",
      is_default = 0,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!address_line1 || !address_line1.trim()) {
      return res.status(400).json({
        success: false,
        message: "Address line 1 is required",
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

    const finalDefault = normalizeBoolean(is_default);

    if (finalDefault) {
      await db.query(
        `
        UPDATE vendor_addresses
        SET is_default = 0
        WHERE vendor_id = ?
        `,
        [vendor_id]
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO vendor_addresses
        (
          vendor_id,
          address_type,
          address_line1,
          address_line2,
          city,
          state,
          country,
          pincode,
          is_default
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        vendor_id,
        normalizeAddressType(address_type),
        address_line1.trim(),
        cleanValue(address_line2),
        cleanValue(city),
        cleanValue(state),
        cleanValue(country) || "India",
        cleanValue(pincode),
        finalDefault,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vendor address created successfully",
      address_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor address",
      error: error.message,
    });
  }
};

exports.updateVendorAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      address_type = "office",
      address_line1 = "",
      address_line2 = "",
      city = "",
      state = "",
      country = "India",
      pincode = "",
      is_default = 0,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!address_line1 || !address_line1.trim()) {
      return res.status(400).json({
        success: false,
        message: "Address line 1 is required",
      });
    }

    const [[existing]] = await db.query(
      `
      SELECT id
      FROM vendor_addresses
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor address not found",
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

    const finalDefault = normalizeBoolean(is_default);

    if (finalDefault) {
      await db.query(
        `
        UPDATE vendor_addresses
        SET is_default = 0
        WHERE vendor_id = ?
          AND id != ?
        `,
        [vendor_id, id]
      );
    }

    await db.query(
      `
      UPDATE vendor_addresses
      SET
        vendor_id = ?,
        address_type = ?,
        address_line1 = ?,
        address_line2 = ?,
        city = ?,
        state = ?,
        country = ?,
        pincode = ?,
        is_default = ?
      WHERE id = ?
      `,
      [
        vendor_id,
        normalizeAddressType(address_type),
        address_line1.trim(),
        cleanValue(address_line2),
        cleanValue(city),
        cleanValue(state),
        cleanValue(country) || "India",
        cleanValue(pincode),
        finalDefault,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Vendor address updated successfully",
    });
  } catch (error) {
    console.error("Update vendor address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor address",
      error: error.message,
    });
  }
};

exports.deleteVendorAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      DELETE FROM vendor_addresses
      WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Vendor address not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor address deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor address",
      error: error.message,
    });
  }
};