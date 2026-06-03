const db = require("../config/db");

const CONTRACT_TABLE = "vendor_rate_contracts";
const ITEM_TABLE = "vendor_rate_contract_items";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const generateContractNumber = async (connection) => {
  const prefix = `VRC-${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const [[row]] = await connection.query(
    `
      SELECT COUNT(*) + 1 AS next_number
      FROM ${CONTRACT_TABLE}
      WHERE contract_number LIKE ?
    `,
    [`${prefix}%`]
  );

  return `${prefix}-${String(row?.next_number || 1).padStart(4, "0")}`;
};

const normalizeItems = (items = [], startDate, endDate) => {
  return items
    .filter((item) => item.product_name || item.product_id)
    .map((item) => ({
      product_id: item.product_id || null,
      product_name: item.product_name || "Unknown Product",
      unit_id: item.unit_id || null,
      unit_name: item.unit_name || null,
      contract_rate: Number(safeNumber(item.contract_rate).toFixed(2)),
      old_rate: Number(safeNumber(item.old_rate).toFixed(2)),
      min_order_qty: Number(safeNumber(item.min_order_qty).toFixed(3)),
      max_order_qty: Number(safeNumber(item.max_order_qty).toFixed(3)),
      tax_percent: Number(safeNumber(item.tax_percent).toFixed(2)),
      valid_from: item.valid_from || startDate,
      valid_to: item.valid_to || endDate,
      remarks: item.remarks || null,
    }));
};

const insertItems = async (connection, contractId, items) => {
  for (const item of items) {
    await connection.query(
      `
        INSERT INTO ${ITEM_TABLE}
          (
            contract_id,
            product_id,
            product_name,
            unit_id,
            unit_name,
            contract_rate,
            old_rate,
            min_order_qty,
            max_order_qty,
            tax_percent,
            valid_from,
            valid_to,
            remarks
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        contractId,
        item.product_id,
        item.product_name,
        item.unit_id,
        item.unit_name,
        item.contract_rate,
        item.old_rate,
        item.min_order_qty,
        item.max_order_qty,
        item.tax_percent,
        item.valid_from,
        item.valid_to,
        item.remarks,
      ]
    );
  }
};

exports.getVendorRateContractSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
        SELECT
          COUNT(*) AS total_contracts,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_count,
          SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_approval_count,
          COALESCE(SUM(estimated_contract_value), 0) AS total_contract_value
        FROM ${CONTRACT_TABLE}
      `
    );

    const [expiringSoon] = await db.query(
      `
        SELECT *
        FROM ${CONTRACT_TABLE}
        WHERE status = 'active'
          AND contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY contract_end_date ASC
        LIMIT 10
      `
    );

    res.json({
      success: true,
      summary: {
        total_contracts: safeNumber(summary?.total_contracts),
        active_count: safeNumber(summary?.active_count),
        draft_count: safeNumber(summary?.draft_count),
        expired_count: safeNumber(summary?.expired_count),
        pending_approval_count: safeNumber(summary?.pending_approval_count),
        total_contract_value: safeNumber(summary?.total_contract_value),
      },
      expiring_soon: expiringSoon,
    });
  } catch (error) {
    console.error("Vendor rate contract summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor rate contract summary",
      error: error.message,
    });
  }
};

exports.getVendorRateContracts = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      status = "",
      approval_status = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const where = [];
    const values = [];

    if (vendor_id) {
      where.push("vendor_id = ?");
      values.push(vendor_id);
    }

    if (status) {
      where.push("status = ?");
      values.push(status);
    }

    if (approval_status) {
      where.push("approval_status = ?");
      values.push(approval_status);
    }

    if (from_date) {
      where.push("contract_start_date >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("contract_end_date <= ?");
      values.push(to_date);
    }

    if (search.trim()) {
      where.push(
        "(contract_number LIKE ? OR contract_title LIKE ? OR vendor_name LIKE ? OR remarks LIKE ?)"
      );

      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT *
        FROM ${CONTRACT_TABLE}
        ${whereSql}
        ORDER BY id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      contracts: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get vendor rate contracts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor rate contracts",
      error: error.message,
    });
  }
};

exports.getVendorRateContractById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[contract]] = await db.query(
      `
        SELECT *
        FROM ${CONTRACT_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Vendor rate contract not found",
      });
    }

    const [items] = await db.query(
      `
        SELECT *
        FROM ${ITEM_TABLE}
        WHERE contract_id = ?
        ORDER BY id ASC
      `,
      [id]
    );

    res.json({
      success: true,
      contract,
      items,
    });
  } catch (error) {
    console.error("Get vendor rate contract error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor rate contract",
      error: error.message,
    });
  }
};

exports.createVendorRateContract = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      contract_title,
      vendor_id,
      vendor_name = "",
      contract_start_date = todayDate(),
      contract_end_date,
      payment_terms = "",
      delivery_terms = "",
      remarks = "",
      status = "draft",
      items = [],
    } = req.body;

    if (!contract_title) {
      return res.status(400).json({
        success: false,
        message: "Contract title is required",
      });
    }

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!contract_end_date) {
      return res.status(400).json({
        success: false,
        message: "Contract end date is required",
      });
    }

    const finalItems = normalizeItems(
      items,
      contract_start_date,
      contract_end_date
    );

    if (!finalItems.length) {
      return res.status(400).json({
        success: false,
        message: "At least one contract item is required",
      });
    }

    const estimatedContractValue = finalItems.reduce((sum, item) => {
      const qty = safeNumber(item.max_order_qty || item.min_order_qty || 1);
      return sum + qty * safeNumber(item.contract_rate);
    }, 0);

    await connection.beginTransaction();

    const contractNumber = await generateContractNumber(connection);

    const [result] = await connection.query(
      `
        INSERT INTO ${CONTRACT_TABLE}
          (
            contract_number,
            contract_title,
            vendor_id,
            vendor_name,
            contract_start_date,
            contract_end_date,
            payment_terms,
            delivery_terms,
            total_items,
            estimated_contract_value,
            approval_status,
            status,
            remarks,
            created_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        contractNumber,
        contract_title,
        vendor_id,
        vendor_name || null,
        contract_start_date,
        contract_end_date,
        payment_terms || null,
        delivery_terms || null,
        finalItems.length,
        Number(estimatedContractValue.toFixed(2)),
        status === "active" ? "approved" : "pending",
        status || "draft",
        remarks || null,
        getUserId(req),
      ]
    );

    await insertItems(connection, result.insertId, finalItems);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Vendor rate contract created successfully",
      contract_id: result.insertId,
      contract_number: contractNumber,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create vendor rate contract error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor rate contract",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateVendorRateContract = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const [[existing]] = await connection.query(
      `
        SELECT *
        FROM ${CONTRACT_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor rate contract not found",
      });
    }

    if (existing.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Closed contract cannot be edited",
      });
    }

    const {
      contract_title = existing.contract_title,
      vendor_id = existing.vendor_id,
      vendor_name = existing.vendor_name,
      contract_start_date = existing.contract_start_date,
      contract_end_date = existing.contract_end_date,
      payment_terms = existing.payment_terms,
      delivery_terms = existing.delivery_terms,
      remarks = existing.remarks,
      status = existing.status,
      items = [],
    } = req.body;

    const finalStartDate = String(contract_start_date).slice(0, 10);
    const finalEndDate = String(contract_end_date).slice(0, 10);

    const finalItems = normalizeItems(items, finalStartDate, finalEndDate);

    if (!finalItems.length) {
      return res.status(400).json({
        success: false,
        message: "At least one contract item is required",
      });
    }

    const estimatedContractValue = finalItems.reduce((sum, item) => {
      const qty = safeNumber(item.max_order_qty || item.min_order_qty || 1);
      return sum + qty * safeNumber(item.contract_rate);
    }, 0);

    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE ${CONTRACT_TABLE}
        SET
          contract_title = ?,
          vendor_id = ?,
          vendor_name = ?,
          contract_start_date = ?,
          contract_end_date = ?,
          payment_terms = ?,
          delivery_terms = ?,
          total_items = ?,
          estimated_contract_value = ?,
          status = ?,
          remarks = ?
        WHERE id = ?
      `,
      [
        contract_title,
        vendor_id,
        vendor_name || null,
        finalStartDate,
        finalEndDate,
        payment_terms || null,
        delivery_terms || null,
        finalItems.length,
        Number(estimatedContractValue.toFixed(2)),
        status || existing.status,
        remarks || null,
        id,
      ]
    );

    await connection.query(
      `
        DELETE FROM ${ITEM_TABLE}
        WHERE contract_id = ?
      `,
      [id]
    );

    await insertItems(connection, id, finalItems);

    await connection.commit();

    res.json({
      success: true,
      message: "Vendor rate contract updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update vendor rate contract error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor rate contract",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.approveVendorRateContract = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        UPDATE ${CONTRACT_TABLE}
        SET status = 'active',
            approval_status = 'approved',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status IN ('draft', 'pending', 'active')
      `,
      [getUserId(req), id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Contract not found or cannot be approved",
      });
    }

    res.json({
      success: true,
      message: "Vendor rate contract approved and activated successfully",
    });
  } catch (error) {
    console.error("Approve vendor rate contract error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve vendor rate contract",
      error: error.message,
    });
  }
};

exports.closeVendorRateContract = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        UPDATE ${CONTRACT_TABLE}
        SET status = 'closed'
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Vendor rate contract not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor rate contract closed successfully",
    });
  } catch (error) {
    console.error("Close vendor rate contract error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to close vendor rate contract",
      error: error.message,
    });
  }
};

exports.deleteVendorRateContract = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const [[existing]] = await connection.query(
      `
        SELECT *
        FROM ${CONTRACT_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor rate contract not found",
      });
    }

    if (existing.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Active contract cannot be deleted. Close it first.",
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `
        DELETE FROM ${ITEM_TABLE}
        WHERE contract_id = ?
      `,
      [id]
    );

    await connection.query(
      `
        DELETE FROM ${CONTRACT_TABLE}
        WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Vendor rate contract deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete vendor rate contract error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor rate contract",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getActiveVendorRate = async (req, res) => {
  try {
    const {
      vendor_id = "",
      product_id = "",
      product_name = "",
      date = todayDate(),
    } = req.query;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    if (!product_id && !product_name) {
      return res.status(400).json({
        success: false,
        message: "Product ID or product name is required",
      });
    }

    const values = [vendor_id, date, date, date, date];
    let productSql = "";

    if (product_id) {
      productSql = "AND i.product_id = ?";
      values.push(product_id);
    } else {
      productSql = "AND i.product_name LIKE ?";
      values.push(`%${product_name}%`);
    }

    const [[rate]] = await db.query(
      `
        SELECT
          c.id AS contract_id,
          c.contract_number,
          c.contract_title,
          c.vendor_id,
          c.vendor_name,
          i.id AS item_id,
          i.product_id,
          i.product_name,
          i.unit_name,
          i.contract_rate,
          i.old_rate,
          i.min_order_qty,
          i.max_order_qty,
          i.tax_percent,
          i.valid_from,
          i.valid_to
        FROM ${CONTRACT_TABLE} c
        INNER JOIN ${ITEM_TABLE} i
          ON c.id = i.contract_id
        WHERE c.vendor_id = ?
          AND c.status = 'active'
          AND c.approval_status = 'approved'
          AND c.contract_start_date <= ?
          AND c.contract_end_date >= ?
          AND COALESCE(i.valid_from, c.contract_start_date) <= ?
          AND COALESCE(i.valid_to, c.contract_end_date) >= ?
          ${productSql}
        ORDER BY c.id DESC, i.id DESC
        LIMIT 1
      `,
      values
    );

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: "No active vendor rate contract found for this product",
      });
    }

    res.json({
      success: true,
      rate,
    });
  } catch (error) {
    console.error("Get active vendor rate error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch active vendor rate",
      error: error.message,
    });
  }
};
