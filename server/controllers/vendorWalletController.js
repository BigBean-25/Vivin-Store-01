const db = require("../config/db");

const TABLE = "vendor_wallets";
const VENDOR_TABLE = "vendors";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeStatus = (value) => {
  if (value === "inactive" || value === 0 || value === "0") return "inactive";
  if (value === "blocked") return "blocked";
  return "active";
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

    openingBalance: firstColumn(columns, [
      "opening_balance",
      "opening_amount",
      "initial_balance",
    ]),

    walletBalance: firstColumn(columns, [
      "wallet_balance",
      "balance",
      "current_balance",
      "available_balance",
    ]),

    creditLimit: firstColumn(columns, [
      "credit_limit",
      "limit_amount",
      "wallet_limit",
    ]),

    outstandingAmount: firstColumn(columns, [
      "outstanding_amount",
      "outstanding",
      "payable_amount",
      "due_amount",
    ]),

    advanceAmount: firstColumn(columns, [
      "advance_amount",
      "advance_balance",
      "paid_advance",
    ]),

    holdAmount: firstColumn(columns, ["hold_amount"]),

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

const validateMeta = (meta, res) => {
  if (!meta.id || !meta.vendorId) {
    res.status(500).json({
      success: false,
      message: "vendor_wallets table must have id and vendor_id columns",
    });

    return false;
  }

  return true;
};

const getSelectFields = (meta) => [
  selectColumn("vw", meta.id, "id"),
  selectColumn("vw", meta.vendorId, "vendor_id"),
  selectColumn("vw", meta.openingBalance, "opening_balance", "0"),
  selectColumn("vw", meta.walletBalance, "wallet_balance", "0"),
  selectColumn("vw", meta.holdAmount, "hold_amount", "0"),
  selectColumn("vw", meta.creditLimit, "credit_limit", "0"),
  selectColumn("vw", meta.outstandingAmount, "outstanding_amount", "0"),
  selectColumn("vw", meta.advanceAmount, "advance_amount", "0"),
  selectColumn("vw", meta.status, "status", "'active'"),
  selectColumn("vw", meta.notes, "notes"),
  selectColumn("vw", meta.createdAt, "created_at"),
  selectColumn("vw", meta.updatedAt, "updated_at"),
  selectColumn("v", meta.vendorName, "vendor_name"),
  selectColumn("v", meta.vendorCode, "vendor_code"),
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.openingBalance, payload.opening_balance],
    [meta.walletBalance, payload.wallet_balance],
    [meta.holdAmount, payload.hold_amount],
    [meta.creditLimit, payload.credit_limit],
    [meta.outstandingAmount, payload.outstanding_amount],
    [meta.advanceAmount, payload.advance_amount],
    [meta.status, payload.status],
    [meta.notes, payload.notes],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    fields.push(`\`${column}\``);
    placeholders.push("?");
    values.push(value);
  });

  return { fields, placeholders, values };
};

const buildUpdate = (meta, payload) => {
  const sets = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.openingBalance, payload.opening_balance],
    [meta.walletBalance, payload.wallet_balance],
    [meta.holdAmount, payload.hold_amount],
    [meta.creditLimit, payload.credit_limit],
    [meta.outstandingAmount, payload.outstanding_amount],
    [meta.advanceAmount, payload.advance_amount],
    [meta.status, payload.status],
    [meta.notes, payload.notes],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return { sets, values };
};

exports.getVendorWalletSummary = async (req, res) => {
  try {
    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const countFields = [
      `COUNT(\`${meta.id}\`) AS total_wallets`,
      meta.status ? `SUM(CASE WHEN \`${meta.status}\` = 'active'   THEN 1 ELSE 0 END) AS active_wallets`   : `0 AS active_wallets`,
      meta.status ? `SUM(CASE WHEN \`${meta.status}\` = 'inactive' THEN 1 ELSE 0 END) AS inactive_wallets` : `0 AS inactive_wallets`,
      meta.status ? `SUM(CASE WHEN \`${meta.status}\` = 'blocked'  THEN 1 ELSE 0 END) AS blocked_wallets`  : `0 AS blocked_wallets`,
      meta.walletBalance ? `SUM(\`${meta.walletBalance}\`) AS total_balance`     : `0 AS total_balance`,
      meta.holdAmount    ? `SUM(\`${meta.holdAmount}\`)    AS total_hold_amount` : `0 AS total_hold_amount`,
    ].join(",\n      ");

    const [[summary]] = await db.query(`SELECT ${countFields} FROM ${TABLE}`);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor wallet summary", error: error.message });
  }
};

exports.getVendorWallets = async (req, res) => {
  try {
    const { search = "", vendor_id = "", status = "" } = req.query;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push(`vw.\`${meta.vendorId}\` = ?`);
      params.push(vendor_id);
    }

    if (status) {
      if (meta.status) {
        where.push(`vw.\`${meta.status}\` = ?`);
        params.push(normalizeStatus(status));
      } else if (status !== "active") {
        where.push("1 = 0");
      }
    }

    if (search) {
      const searchFields = [
        meta.vendorName && `v.\`${meta.vendorName}\` LIKE ?`,
        meta.vendorCode && `v.\`${meta.vendorCode}\` LIKE ?`,
        meta.notes && `vw.\`${meta.notes}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);

        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [wallets] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vw
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vw.\`${meta.vendorId}\`
      ${whereSql}
      ORDER BY vw.\`${meta.id}\` DESC
      `,
      params
    );

    res.json({
      success: true,
      count: wallets.length,
      wallets,
    });
  } catch (error) {
    console.error("Get vendor wallets error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor wallets",
      error: error.message,
    });
  }
};

exports.getVendorWalletById = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const [[wallet]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vw
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vw.\`${meta.vendorId}\`
      WHERE vw.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Vendor wallet not found",
      });
    }

    res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error("Get vendor wallet by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor wallet",
      error: error.message,
    });
  }
};

exports.createVendorWallet = async (req, res) => {
  try {
    const {
      vendor_id,
      opening_balance = 0,
      wallet_balance = 0,
      hold_amount = 0,
      credit_limit = 0,
      outstanding_amount = 0,
      advance_amount = 0,
      status = "active",
      notes = "",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
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

    const [[existingWallet]] = await db.query(
      `
      SELECT \`${meta.id}\` AS id
      FROM ${TABLE}
      WHERE \`${meta.vendorId}\` = ?
      LIMIT 1
      `,
      [vendor_id]
    );

    if (existingWallet) {
      return res.status(409).json({
        success: false,
        message: "Wallet already exists for this vendor",
      });
    }

    const payload = {
      vendor_id,
      opening_balance: toNumber(opening_balance),
      wallet_balance: toNumber(wallet_balance),
      hold_amount: toNumber(hold_amount),
      credit_limit: toNumber(credit_limit),
      outstanding_amount: toNumber(outstanding_amount),
      advance_amount: toNumber(advance_amount),
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
      message: "Vendor wallet created successfully",
      wallet_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor wallet",
      error: error.message,
    });
  }
};

exports.updateVendorWallet = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      opening_balance = 0,
      wallet_balance = 0,
      hold_amount = 0,
      credit_limit = 0,
      outstanding_amount = 0,
      advance_amount = 0,
      status = "active",
      notes = "",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
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
        message: "Vendor wallet not found",
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

    const [[duplicateWallet]] = await db.query(
      `
      SELECT \`${meta.id}\` AS id
      FROM ${TABLE}
      WHERE \`${meta.vendorId}\` = ?
        AND \`${meta.id}\` != ?
      LIMIT 1
      `,
      [vendor_id, id]
    );

    if (duplicateWallet) {
      return res.status(409).json({
        success: false,
        message: "Another wallet already exists for this vendor",
      });
    }

    const payload = {
      vendor_id,
      opening_balance: toNumber(opening_balance),
      wallet_balance: toNumber(wallet_balance),
      hold_amount: toNumber(hold_amount),
      credit_limit: toNumber(credit_limit),
      outstanding_amount: toNumber(outstanding_amount),
      advance_amount: toNumber(advance_amount),
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
      message: "Vendor wallet updated successfully",
    });
  } catch (error) {
    console.error("Update vendor wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor wallet",
      error: error.message,
    });
  }
};

exports.updateVendorWalletStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "blocked"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active, inactive or blocked" });
    }

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!meta.status) {
      return res.status(400).json({ success: false, message: "Status column not available on vendor_wallets table" });
    }

    const [result] = await db.query(
      `UPDATE ${TABLE} SET \`${meta.status}\` = ? WHERE \`${meta.id}\` = ?`,
      [status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Vendor wallet not found" });
    }

    res.json({ success: true, message: `Vendor wallet ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update vendor wallet status", error: error.message });
  }
};

exports.deleteVendorWallet = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

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
        message: "Vendor wallet not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor wallet deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor wallet",
      error: error.message,
    });
  }
};