const db = require("../config/db");

exports.getCustomerAddresses = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [addresses] = await db.query(
      `
      SELECT *
      FROM customer_addresses
      WHERE customer_id = ?
      ORDER BY is_default DESC, id DESC
      `,
      [customerId]
    );

    res.json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    console.error("Get customer addresses error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer addresses",
      error: error.message,
    });
  }
};

exports.createCustomerAddress = async (req, res) => {
  try {
    const { customerId } = req.params;

    const {
      address_type,
      address_line1,
      address_line2,
      city,
      state,
      country,
      pincode,
      latitude,
      longitude,
      is_default,
    } = req.body;

    if (!address_line1) {
      return res.status(400).json({
        success: false,
        message: "Address line 1 is required",
      });
    }

    if (is_default) {
      await db.query(
        `UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?`,
        [customerId]
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO customer_addresses (
        customer_id,
        address_type,
        address_line1,
        address_line2,
        city,
        state,
        country,
        pincode,
        latitude,
        longitude,
        is_default
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customerId,
        address_type || "shipping",
        address_line1,
        address_line2 || null,
        city || null,
        state || null,
        country || "India",
        pincode || null,
        latitude || null,
        longitude || null,
        is_default ? 1 : 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer address created successfully",
      address_id: result.insertId,
    });
  } catch (error) {
    console.error("Create customer address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer address",
      error: error.message,
    });
  }
};

exports.updateCustomerAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const {
      address_type,
      address_line1,
      address_line2,
      city,
      state,
      country,
      pincode,
      latitude,
      longitude,
      is_default,
    } = req.body;

    if (!address_line1) {
      return res.status(400).json({
        success: false,
        message: "Address line 1 is required",
      });
    }

    const [[address]] = await db.query(
      `SELECT customer_id FROM customer_addresses WHERE id = ? LIMIT 1`,
      [addressId]
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    if (is_default) {
      await db.query(
        `UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?`,
        [address.customer_id]
      );
    }

    await db.query(
      `
      UPDATE customer_addresses SET
        address_type = ?,
        address_line1 = ?,
        address_line2 = ?,
        city = ?,
        state = ?,
        country = ?,
        pincode = ?,
        latitude = ?,
        longitude = ?,
        is_default = ?
      WHERE id = ?
      `,
      [
        address_type || "shipping",
        address_line1,
        address_line2 || null,
        city || null,
        state || null,
        country || "India",
        pincode || null,
        latitude || null,
        longitude || null,
        is_default ? 1 : 0,
        addressId,
      ]
    );

    res.json({
      success: true,
      message: "Customer address updated successfully",
    });
  } catch (error) {
    console.error("Update customer address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer address",
      error: error.message,
    });
  }
};

exports.deleteCustomerAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const [result] = await db.query(
      `DELETE FROM customer_addresses WHERE id = ?`,
      [addressId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({
      success: true,
      message: "Customer address deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete customer address",
      error: error.message,
    });
  }
};
