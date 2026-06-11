const db = require("../config/db");

const TABLE = "vendor_bank_accounts";
const VENDOR_TABLE = "vendors";

const accountTypes = ["current", "savings", "cash_credit", "overdraft"];

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

const normalizeStatus = (value) => {
  if (value === "inactive" || value === 0 || value === "0") return "inactive";
  return "active";
};

const normalizeAccountType = (value) => {
  if (accountTypes.includes(value)) return value;
  return "current";
};

const getColumns = async (tableName) => {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return rows.map((row) => row.Field);
};

const firstColumn = (columns, options) => {
  return options.find((column) => columns.includes(column)) || null;
};

const selectColumn = (alias, column, outputName, fallback = "NULL") => {
  if (!column) return `${fallback} AS ${outputName}`;
  return `${alias}.\`${column}\` AS ${outputName}`;
};

const getMeta = async () => {
  const columns = await getColumns(TABLE);
  const vendorColumns = await getColumns(VENDOR_TABLE);

  return {
    columns,

    id: firstColumn(columns, ["id"]),
    vendorId: firstColumn(columns, ["vendor_id"]),

    accountHolderName: firstColumn(columns, [
      "account_holder_name",
      "account_name",
      "holder_name",
      "beneficiary_name",
      "name",
    ]),

    bankName: firstColumn(columns, ["bank_name"]),
    branchName: firstColumn(columns, ["branch_name", "branch"]),
    accountNumber: firstColumn(columns, ["account_number", "account_no"]),
    ifscCode: firstColumn(columns, ["ifsc_code", "ifsc"]),
    accountType: firstColumn(columns, ["account_type", "type"]),
    upiId: firstColumn(columns, ["upi_id", "upi"]),
    isDefault: firstColumn(columns, ["is_default", "is_primary", "primary_account"]),
    status: firstColumn(columns, ["status"]),
    notes: firstColumn(columns, ["notes", "remarks"]),
    createdAt: firstColumn(columns, ["created_at"]),
    updatedAt: firstColumn(columns, ["updated_at"]),

    vendorName: firstColumn(vendorColumns, [
      "business_name",
      "vendor_name",
      "name",
      "company_name",
    ]),
    vendorCode: firstColumn(vendorColumns, ["vendor_code", "code"]),
  };
};

const getSelectFields = (meta) => [
  selectColumn("ba", meta.id, "id"),
  selectColumn("ba", meta.vendorId, "vendor_id"),
  selectColumn("ba", meta.accountHolderName, "account_holder_name"),
  selectColumn("ba", meta.bankName, "bank_name"),
  selectColumn("ba", meta.branchName, "branch_name"),
  selectColumn("ba", meta.accountNumber, "account_number"),
  selectColumn("ba", meta.ifscCode, "ifsc_code"),
  selectColumn("ba", meta.accountType, "account_type", "'current'"),
  selectColumn("ba", meta.upiId, "upi_id"),
  selectColumn("ba", meta.isDefault, "is_default", "0"),
  selectColumn("ba", meta.status, "status", "'active'"),
  selectColumn("ba", meta.notes, "notes"),
  selectColumn("ba", meta.createdAt, "created_at"),
  selectColumn("ba", meta.updatedAt, "updated_at"),
  selectColumn("v", meta.vendorName, "vendor_name"),
  selectColumn("v", meta.vendorCode, "vendor_code"),
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.accountHolderName, payload.account_holder_name],
    [meta.bankName, payload.bank_name],
    [meta.branchName, payload.branch_name],
    [meta.accountNumber, payload.account_number],
    [meta.ifscCode, payload.ifsc_code],
    [meta.accountType, payload.account_type],
    [meta.upiId, payload.upi_id],
    [meta.isDefault, payload.is_default],
    [meta.status, payload.status],
    [meta.notes, payload.notes],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    fields.push(`\`${column}\``);
    placeholders.push("?");
    values.push(value);
  });

  return {
    fields,
    placeholders,
    values,
  };
};

const buildUpdate = (meta, payload) => {
  const sets = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.accountHolderName, payload.account_holder_name],
    [meta.bankName, payload.bank_name],
    [meta.branchName, payload.branch_name],
    [meta.accountNumber, payload.account_number],
    [meta.ifscCode, payload.ifsc_code],
    [meta.accountType, payload.account_type],
    [meta.upiId, payload.upi_id],
    [meta.isDefault, payload.is_default],
    [meta.status, payload.status],
    [meta.notes, payload.notes],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return {
    sets,
    values,
  };
};

exports.getVendorBankAccountSummary = async (req, res) => {
  try {
    const meta = await getMeta();

    const countFields = [
      `COUNT(\`${meta.id}\`)                                              AS total_accounts`,
      meta.isDefault ? `SUM(CASE WHEN \`${meta.isDefault}\` = 1 THEN 1 ELSE 0 END) AS default_accounts` : `0 AS default_accounts`,
      meta.status    ? `SUM(CASE WHEN \`${meta.status}\` = 'active'   THEN 1 ELSE 0 END) AS active_accounts`   : `COUNT(\`${meta.id}\`) AS active_accounts`,
      meta.status    ? `SUM(CASE WHEN \`${meta.status}\` = 'inactive' THEN 1 ELSE 0 END) AS inactive_accounts` : `0 AS inactive_accounts`,
      meta.accountType ? `SUM(CASE WHEN \`${meta.accountType}\` = 'current'     THEN 1 ELSE 0 END) AS current_count`     : `0 AS current_count`,
      meta.accountType ? `SUM(CASE WHEN \`${meta.accountType}\` = 'savings'     THEN 1 ELSE 0 END) AS savings_count`     : `0 AS savings_count`,
      meta.accountType ? `SUM(CASE WHEN \`${meta.accountType}\` = 'cash_credit' THEN 1 ELSE 0 END) AS cash_credit_count` : `0 AS cash_credit_count`,
      meta.accountType ? `SUM(CASE WHEN \`${meta.accountType}\` = 'overdraft'   THEN 1 ELSE 0 END) AS overdraft_count`   : `0 AS overdraft_count`,
    ].join(",\n      ");

    const [[summary]] = await db.query(`SELECT ${countFields} FROM ${TABLE}`);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor bank account summary", error: error.message });
  }
};

exports.getVendorBankAccounts = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      account_type = "",
      status = "",
      is_default = "",
    } = req.query;

    const meta = await getMeta();

    if (!meta.id || !meta.vendorId) {
      return res.status(500).json({
        success: false,
        message: "vendor_bank_accounts table must have id and vendor_id columns",
      });
    }

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push(`ba.\`${meta.vendorId}\` = ?`);
      params.push(vendor_id);
    }

    if (account_type && meta.accountType) {
      where.push(`ba.\`${meta.accountType}\` = ?`);
      params.push(normalizeAccountType(account_type));
    }

    if (is_default !== "" && meta.isDefault) {
      where.push(`ba.\`${meta.isDefault}\` = ?`);
      params.push(normalizeBoolean(is_default));
    }

    if (status) {
      if (meta.status) {
        where.push(`ba.\`${meta.status}\` = ?`);
        params.push(normalizeStatus(status));
      } else if (status !== "active") {
        where.push("1 = 0");
      }
    }

    if (search) {
      const searchFields = [
        meta.accountHolderName && `ba.\`${meta.accountHolderName}\` LIKE ?`,
        meta.bankName && `ba.\`${meta.bankName}\` LIKE ?`,
        meta.branchName && `ba.\`${meta.branchName}\` LIKE ?`,
        meta.accountNumber && `ba.\`${meta.accountNumber}\` LIKE ?`,
        meta.ifscCode && `ba.\`${meta.ifscCode}\` LIKE ?`,
        meta.upiId && `ba.\`${meta.upiId}\` LIKE ?`,
        meta.vendorName && `v.\`${meta.vendorName}\` LIKE ?`,
        meta.vendorCode && `v.\`${meta.vendorCode}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);
        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderSql = meta.isDefault
      ? `ORDER BY ba.\`${meta.isDefault}\` DESC, ba.\`${meta.id}\` DESC`
      : `ORDER BY ba.\`${meta.id}\` DESC`;

    const [accounts] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} ba
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = ba.\`${meta.vendorId}\`
      ${whereSql}
      ${orderSql}
      `,
      params
    );

    res.json({
      success: true,
      count: accounts.length,
      accounts,
    });
  } catch (error) {
    console.error("Get vendor bank accounts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor bank accounts",
      error: error.message,
    });
  }
};

exports.getVendorBankAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await getMeta();

    const [[account]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} ba
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = ba.\`${meta.vendorId}\`
      WHERE ba.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Vendor bank account not found",
      });
    }

    res.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error("Get vendor bank account by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor bank account",
      error: error.message,
    });
  }
};

exports.createVendorBankAccount = async (req, res) => {
  try {
    const {
      vendor_id,
      account_holder_name = "",
      bank_name = "",
      branch_name = "",
      account_number = "",
      ifsc_code = "",
      account_type = "current",
      upi_id = "",
      is_default = 0,
      status = "active",
      notes = "",
    } = req.body;

    const meta = await getMeta();

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!account_holder_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account holder name is required",
      });
    }

    if (!bank_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required",
      });
    }

    if (!account_number.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account number is required",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
      FROM ${VENDOR_TABLE}
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

    if (finalDefault && meta.isDefault) {
      await db.query(
        `
        UPDATE ${TABLE}
        SET \`${meta.isDefault}\` = 0
        WHERE \`${meta.vendorId}\` = ?
        `,
        [vendor_id]
      );
    }

    const payload = {
      vendor_id,
      account_holder_name: account_holder_name.trim(),
      bank_name: bank_name.trim(),
      branch_name: cleanValue(branch_name),
      account_number: account_number.trim(),
      ifsc_code: cleanValue(ifsc_code ? ifsc_code.toUpperCase() : ""),
      account_type: normalizeAccountType(account_type),
      upi_id: cleanValue(upi_id),
      is_default: finalDefault,
      status: normalizeStatus(status),
      notes: cleanValue(notes),
    };

    const insert = buildInsert(meta, payload);

    const [result] = await db.query(
      `
      INSERT INTO ${TABLE}
        (${insert.fields.join(", ")})
      VALUES
        (${insert.placeholders.join(", ")})
      `,
      insert.values
    );

    res.status(201).json({
      success: true,
      message: "Vendor bank account created successfully",
      account_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor bank account error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor bank account",
      error: error.message,
    });
  }
};

exports.updateVendorBankAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      account_holder_name = "",
      bank_name = "",
      branch_name = "",
      account_number = "",
      ifsc_code = "",
      account_type = "current",
      upi_id = "",
      is_default = 0,
      status = "active",
      notes = "",
    } = req.body;

    const meta = await getMeta();

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!account_holder_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account holder name is required",
      });
    }

    if (!bank_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required",
      });
    }

    if (!account_number.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account number is required",
      });
    }

    const [[existing]] = await db.query(
      `
      SELECT \`${meta.id}\` AS id
      FROM ${TABLE}
      WHERE \`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor bank account not found",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
      FROM ${VENDOR_TABLE}
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

    if (finalDefault && meta.isDefault) {
      await db.query(
        `
        UPDATE ${TABLE}
        SET \`${meta.isDefault}\` = 0
        WHERE \`${meta.vendorId}\` = ?
          AND \`${meta.id}\` != ?
        `,
        [vendor_id, id]
      );
    }

    const payload = {
      vendor_id,
      account_holder_name: account_holder_name.trim(),
      bank_name: bank_name.trim(),
      branch_name: cleanValue(branch_name),
      account_number: account_number.trim(),
      ifsc_code: cleanValue(ifsc_code ? ifsc_code.toUpperCase() : ""),
      account_type: normalizeAccountType(account_type),
      upi_id: cleanValue(upi_id),
      is_default: finalDefault,
      status: normalizeStatus(status),
      notes: cleanValue(notes),
    };

    const update = buildUpdate(meta, payload);

    await db.query(
      `
      UPDATE ${TABLE}
      SET ${update.sets.join(", ")}
      WHERE \`${meta.id}\` = ?
      `,
      [...update.values, id]
    );

    res.json({
      success: true,
      message: "Vendor bank account updated successfully",
    });
  } catch (error) {
    console.error("Update vendor bank account error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor bank account",
      error: error.message,
    });
  }
};

exports.updateVendorBankAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const meta = await getMeta();

    if (!meta.status) {
      return res.status(400).json({ success: false, message: "Status column not available on vendor_bank_accounts table" });
    }

    const [result] = await db.query(
      `UPDATE ${TABLE} SET \`${meta.status}\` = ? WHERE \`${meta.id}\` = ?`,
      [status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Vendor bank account not found" });
    }

    res.json({ success: true, message: `Vendor bank account ${status === "active" ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update vendor bank account status", error: error.message });
  }
};

exports.deleteVendorBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await getMeta();

    const [result] = await db.query(
      `
      DELETE FROM ${TABLE}
      WHERE \`${meta.id}\` = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Vendor bank account not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor bank account deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor bank account error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor bank account",
      error: error.message,
    });
  }
};