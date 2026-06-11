const db = require("../config/db");

const TABLE = "vendor_transactions";
const VENDOR_TABLE = "vendors";
const WALLET_TABLE = "vendor_wallets";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeStatus = (value) => {
  if (value === "pending" || value === "cancelled" || value === "failed") return value;
  return "completed";
};

const normalizeTransactionType = (value) => {
  const creditTypes = ["credit", "payment", "advance", "refund"];
  if (creditTypes.includes(value)) return "credit";
  return "debit";
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

  let walletColumns = [];
  try {
    walletColumns = await getColumns(WALLET_TABLE);
  } catch {
    walletColumns = [];
  }

  return {
    columns,
    walletColumns,

    id: firstColumn(columns, ["id"]),
    vendorId: firstColumn(columns, ["vendor_id"]),
    walletId: firstColumn(columns, ["wallet_id", "vendor_wallet_id"]),

    transactionType: firstColumn(columns, [
      "transaction_type",
      "type",
      "txn_type",
    ]),

    amount: firstColumn(columns, ["amount", "transaction_amount", "value"]),

    paymentMode: firstColumn(columns, [
      "payment_mode",
      "payment_method",
      "mode",
    ]),

    referenceNo: firstColumn(columns, [
      "reference_no",
      "reference_number",
      "txn_reference",
      "transaction_reference",
      "utr_number",
      "utr_no",
    ]),

    transactionDate: firstColumn(columns, [
      "transaction_date",
      "txn_date",
      "date",
      "paid_date",
      "created_date",
    ]),

    status: firstColumn(columns, ["status"]),

    description: firstColumn(columns, [
      "description",
      "notes",
      "remarks",
      "narration",
    ]),

    createdAt: firstColumn(columns, ["created_at"]),
    updatedAt: firstColumn(columns, ["updated_at"]),

    referenceType: firstColumn(columns, ["reference_type"]),
    referenceId: firstColumn(columns, ["reference_id"]),

    vendorName: firstColumn(vendorColumns, [
      "business_name",
      "vendor_name",
      "name",
      "company_name",
    ]),

    vendorCode: firstColumn(vendorColumns, ["vendor_code", "code"]),

    walletBalance: firstColumn(walletColumns, [
      "wallet_balance",
      "balance",
      "current_balance",
      "available_balance",
    ]),

    outstandingAmount: firstColumn(walletColumns, [
      "outstanding_amount",
      "outstanding",
      "payable_amount",
      "due_amount",
    ]),

    advanceAmount: firstColumn(walletColumns, [
      "advance_amount",
      "advance_balance",
      "paid_advance",
    ]),
  };
};

const validateMeta = (meta, res) => {
  if (!meta.id || !meta.vendorId || !meta.amount) {
    res.status(500).json({
      success: false,
      message: "vendor_transactions table must have id, vendor_id and amount columns",
    });

    return false;
  }

  return true;
};

const getSelectFields = (meta) => [
  selectColumn("vt", meta.id, "id"),
  selectColumn("vt", meta.vendorId, "vendor_id"),
  selectColumn("vt", meta.walletId, "wallet_id"),
  selectColumn("vt", meta.transactionType, "transaction_type", "'debit'"),
  selectColumn("vt", meta.amount, "amount", "0"),
  selectColumn("vt", meta.paymentMode, "payment_mode"),
  selectColumn("vt", meta.referenceNo, "reference_no"),
  selectColumn("vt", meta.referenceType, "reference_type"),
  selectColumn("vt", meta.referenceId, "reference_id"),
  selectColumn("vt", meta.transactionDate, "transaction_date"),
  selectColumn("vt", meta.status, "status", "'completed'"),
  selectColumn("vt", meta.description, "description"),
  selectColumn("vt", meta.createdAt, "created_at"),
  selectColumn("vt", meta.updatedAt, "updated_at"),
  selectColumn("v", meta.vendorName, "vendor_name"),
  selectColumn("v", meta.vendorCode, "vendor_code"),
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.walletId, payload.wallet_id],
    [meta.transactionType, payload.transaction_type],
    [meta.amount, payload.amount],
    [meta.paymentMode, payload.payment_mode],
    [meta.referenceNo, payload.reference_no],
    [meta.referenceType, payload.reference_type],
    [meta.referenceId, payload.reference_id],
    [meta.transactionDate, payload.transaction_date],
    [meta.status, payload.status],
    [meta.description, payload.description],
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
    [meta.walletId, payload.wallet_id],
    [meta.transactionType, payload.transaction_type],
    [meta.amount, payload.amount],
    [meta.paymentMode, payload.payment_mode],
    [meta.referenceNo, payload.reference_no],
    [meta.referenceType, payload.reference_type],
    [meta.referenceId, payload.reference_id],
    [meta.transactionDate, payload.transaction_date],
    [meta.status, payload.status],
    [meta.description, payload.description],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return { sets, values };
};

exports.getVendorTransactions = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      transaction_type = "",
      status = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push(`vt.\`${meta.vendorId}\` = ?`);
      params.push(vendor_id);
    }

    if (transaction_type && meta.transactionType) {
      where.push(`vt.\`${meta.transactionType}\` = ?`);
      params.push(normalizeTransactionType(transaction_type));
    }

    if (status && meta.status) {
      where.push(`vt.\`${meta.status}\` = ?`);
      params.push(normalizeStatus(status));
    }

    if (from_date && meta.transactionDate) {
      where.push(`DATE(vt.\`${meta.transactionDate}\`) >= ?`);
      params.push(from_date);
    }

    if (to_date && meta.transactionDate) {
      where.push(`DATE(vt.\`${meta.transactionDate}\`) <= ?`);
      params.push(to_date);
    }

    if (search) {
      const searchFields = [
        meta.vendorName && `v.\`${meta.vendorName}\` LIKE ?`,
        meta.vendorCode && `v.\`${meta.vendorCode}\` LIKE ?`,
        meta.referenceNo && `vt.\`${meta.referenceNo}\` LIKE ?`,
        meta.paymentMode && `vt.\`${meta.paymentMode}\` LIKE ?`,
        meta.description && `vt.\`${meta.description}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);

        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [transactions] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vt
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vt.\`${meta.vendorId}\`
      ${whereSql}
      ORDER BY vt.\`${meta.id}\` DESC
      `,
      params
    );

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get vendor transactions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor transactions",
      error: error.message,
    });
  }
};

exports.getVendorTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const [[transaction]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vt
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vt.\`${meta.vendorId}\`
      WHERE vt.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Vendor transaction not found",
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Get vendor transaction by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor transaction",
      error: error.message,
    });
  }
};

exports.createVendorTransaction = async (req, res) => {
  try {
    const {
      vendor_id,
      wallet_id = "",
      transaction_type = "debit",
      amount = 0,
      payment_mode = "",
      reference_no = "",
      reference_type = "",
      reference_id = null,
      transaction_date = "",
      status = "completed",
      description = "",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    const finalAmount = toNumber(amount);

    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
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

    const payload = {
      vendor_id,
      wallet_id: cleanValue(wallet_id),
      transaction_type: normalizeTransactionType(transaction_type),
      amount: finalAmount,
      payment_mode: cleanValue(payment_mode),
      reference_no: cleanValue(reference_no),
      reference_type: cleanValue(reference_type),
      reference_id: cleanValue(reference_id),
      transaction_date: cleanValue(transaction_date) || new Date(),
      status: normalizeStatus(status),
      description: cleanValue(description),
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
      message: "Vendor transaction created successfully",
      transaction_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor transaction",
      error: error.message,
    });
  }
};

exports.updateVendorTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      wallet_id = "",
      transaction_type = "debit",
      amount = 0,
      payment_mode = "",
      reference_no = "",
      reference_type = "",
      reference_id = null,
      transaction_date = "",
      status = "completed",
      description = "",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    const finalAmount = toNumber(amount);

    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
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
        message: "Vendor transaction not found",
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

    const payload = {
      vendor_id,
      wallet_id: cleanValue(wallet_id),
      transaction_type: normalizeTransactionType(transaction_type),
      amount: finalAmount,
      payment_mode: cleanValue(payment_mode),
      reference_no: cleanValue(reference_no),
      reference_type: cleanValue(reference_type),
      reference_id: cleanValue(reference_id),
      transaction_date: cleanValue(transaction_date) || new Date(),
      status: normalizeStatus(status),
      description: cleanValue(description),
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
      message: "Vendor transaction updated successfully",
    });
  } catch (error) {
    console.error("Update vendor transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor transaction",
      error: error.message,
    });
  }
};

exports.deleteVendorTransaction = async (req, res) => {
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
        message: "Vendor transaction not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor transaction",
      error: error.message,
    });
  }
};

exports.getVendorTransactionSummary = async (req, res) => {
  try {
    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const amountExpr = meta.amount ? `vt.\`${meta.amount}\`` : "0";
    const typeExpr = meta.transactionType ? `vt.\`${meta.transactionType}\`` : "NULL";

    const [rows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_transactions,
        SUM(${amountExpr}) AS total_amount,
        SUM(CASE WHEN ${typeExpr} = 'credit' THEN ${amountExpr} ELSE 0 END) AS total_credit,
        SUM(CASE WHEN ${typeExpr} = 'debit' THEN ${amountExpr} ELSE 0 END) AS total_debit
      FROM ${TABLE} vt
      `
    );

    const row = rows[0] || {};
    const totalCredit = Number(row.total_credit || 0);
    const totalDebit = Number(row.total_debit || 0);

    res.json({
      success: true,
      summary: {
        total_transactions: Number(row.total_transactions || 0),
        total_amount: Number(row.total_amount || 0),
        total_credit: totalCredit,
        total_debit: totalDebit,
        net_balance: totalCredit - totalDebit,
      },
    });
  } catch (error) {
    console.error("Get vendor transaction summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor transaction summary",
      error: error.message,
    });
  }
};

exports.updateVendorTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!meta.status) {
      return res.status(400).json({
        success: false,
        message: "Status column does not exist in vendor_transactions. Run the provided ALTER SQL to add it.",
      });
    }

    const [[existing]] = await db.query(
      `SELECT \`${meta.id}\` AS id FROM ${TABLE} WHERE \`${meta.id}\` = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Vendor transaction not found" });
    }

    await db.query(
      `UPDATE ${TABLE} SET \`${meta.status}\` = ? WHERE \`${meta.id}\` = ?`,
      [normalizeStatus(status), id]
    );

    res.json({ success: true, message: "Vendor transaction status updated successfully" });
  } catch (error) {
    console.error("Update vendor transaction status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor transaction status",
      error: error.message,
    });
  }
};