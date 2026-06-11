const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(address_type = 'billing') AS billing,
        SUM(address_type = 'shipping') AS shipping,
        SUM(address_type = 'office') AS office,
        SUM(is_default = 1) AS default_count,
        COUNT(DISTINCT customer_id) AS customers_with_addresses
      FROM customer_addresses
    `);

    const s = rows[0];

    res.json({
      success: true,
      summary: {
        total: Number(s.total),
        billing: Number(s.billing),
        shipping: Number(s.shipping),
        office: Number(s.office),
        default_count: Number(s.default_count),
        customers_with_addresses: Number(s.customers_with_addresses),
      },
    });
  } catch (error) {
    console.error("Get customer address summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer address summary",
      error: error.message,
    });
  }
};

exports.getAllAddresses = async (req, res) => {
  try {
    const [addresses] = await db.query(`
      SELECT
        ca.*,
        c.business_name
      FROM customer_addresses ca
      LEFT JOIN customers c ON c.id = ca.customer_id
      ORDER BY ca.id DESC
    `);

    res.json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    console.error("Get all customer addresses error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer addresses",
      error: error.message,
    });
  }
};

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
  const conn = await db.getConnection();

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
      conn.release();
      return res.status(400).json({
        success: false,
        message: "Address line 1 is required",
      });
    }

    await conn.beginTransaction();

    if (is_default) {
      await conn.query(
        `UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?`,
        [customerId]
      );
    }

    const [result] = await conn.query(
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

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Customer address created successfully",
      address_id: result.insertId,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Create customer address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer address",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

exports.updateCustomerAddress = async (req, res) => {
  const conn = await db.getConnection();

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
      conn.release();
      return res.status(400).json({
        success: false,
        message: "Address line 1 is required",
      });
    }

    const [[address]] = await conn.query(
      `SELECT customer_id FROM customer_addresses WHERE id = ? LIMIT 1`,
      [addressId]
    );

    if (!address) {
      conn.release();
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await conn.beginTransaction();

    if (is_default) {
      await conn.query(
        `UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?`,
        [address.customer_id]
      );
    }

    await conn.query(
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

    await conn.commit();

    res.json({
      success: true,
      message: "Customer address updated successfully",
    });
  } catch (error) {
    await conn.rollback();
    console.error("Update customer address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer address",
      error: error.message,
    });
  } finally {
    conn.release();
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
