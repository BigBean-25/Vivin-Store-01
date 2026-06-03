const db = require("../config/db");

const TABLE = "vendor_ledgers";
const VENDOR_TABLE = "vendors";
const TRANSACTION_TABLE = "vendor_transactions";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeEntryType = (value) => {
  const allowed = ["opening", "purchase", "payment", "debit", "credit", "adjustment", "closing"];
  return allowed.includes(value) ? value : "purchase";
};

const normalizeStatus = (value) => {
  if (value === "pending" || value === "cancelled" || value === "inactive") return value;
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

  let transactionColumns = [];
  try {
    transactionColumns = await getColumns(TRANSACTION_TABLE);
  } catch {
    transactionColumns = [];
  }

  return {
    columns,

    id: firstColumn(columns, ["id"]),
    vendorId: firstColumn(columns, ["vendor_id"]),
    transactionId: firstColumn(columns, ["transaction_id", "vendor_transaction_id"]),

    entryType: firstColumn(columns, [
      "entry_type",
      "ledger_type",
      "type",
      "transaction_type",
    ]),

    ledgerDate: firstColumn(columns, [
      "ledger_date",
      "entry_date",
      "transaction_date",
      "date",
    ]),

    openingBalance: firstColumn(columns, [
      "opening_balance",
      "opening_amount",
      "previous_balance",
    ]),

    debitAmount: firstColumn(columns, [
      "debit_amount",
      "debit",
      "payable_amount",
      "purchase_amount",
    ]),

    creditAmount: firstColumn(columns, [
      "credit_amount",
      "credit",
      "paid_amount",
      "payment_amount",
    ]),

    closingBalance: firstColumn(columns, [
      "closing_balance",
      "balance",
      "current_balance",
      "running_balance",
    ]),

    referenceNo: firstColumn(columns, [
      "reference_no",
      "reference_number",
      "bill_no",
      "invoice_no",
      "voucher_no",
      "transaction_reference",
    ]),

    description: firstColumn(columns, [
      "description",
      "notes",
      "remarks",
      "narration",
    ]),

    status: firstColumn(columns, ["status"]),
    createdAt: firstColumn(columns, ["created_at"]),
    updatedAt: firstColumn(columns, ["updated_at"]),

    vendorName: firstColumn(vendorColumns, [
      "business_name",
      "vendor_name",
      "name",
      "company_name",
    ]),
    vendorCode: firstColumn(vendorColumns, ["vendor_code", "code"]),

    transactionAmount: firstColumn(transactionColumns, ["amount"]),
  };
};

const validateMeta = (meta, res) => {
  if (!meta.id || !meta.vendorId) {
    res.status(500).json({
      success: false,
      message: "vendor_ledgers table must have id and vendor_id columns",
    });

    return false;
  }

  return true;
};

const getSelectFields = (meta) => [
  selectColumn("vl", meta.id, "id"),
  selectColumn("vl", meta.vendorId, "vendor_id"),
  selectColumn("vl", meta.transactionId, "transaction_id"),
  selectColumn("vl", meta.entryType, "entry_type", "'purchase'"),
  selectColumn("vl", meta.ledgerDate, "ledger_date"),
  selectColumn("vl", meta.openingBalance, "opening_balance", "0"),
  selectColumn("vl", meta.debitAmount, "debit_amount", "0"),
  selectColumn("vl", meta.creditAmount, "credit_amount", "0"),
  selectColumn("vl", meta.closingBalance, "closing_balance", "0"),
  selectColumn("vl", meta.referenceNo, "reference_no"),
  selectColumn("vl", meta.description, "description"),
  selectColumn("vl", meta.status, "status", "'active'"),
  selectColumn("vl", meta.createdAt, "created_at"),
  selectColumn("vl", meta.updatedAt, "updated_at"),
  selectColumn("v", meta.vendorName, "vendor_name"),
  selectColumn("v", meta.vendorCode, "vendor_code"),
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.transactionId, payload.transaction_id],
    [meta.entryType, payload.entry_type],
    [meta.ledgerDate, payload.ledger_date],
    [meta.openingBalance, payload.opening_balance],
    [meta.debitAmount, payload.debit_amount],
    [meta.creditAmount, payload.credit_amount],
    [meta.closingBalance, payload.closing_balance],
    [meta.referenceNo, payload.reference_no],
    [meta.description, payload.description],
    [meta.status, payload.status],
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
    [meta.transactionId, payload.transaction_id],
    [meta.entryType, payload.entry_type],
    [meta.ledgerDate, payload.ledger_date],
    [meta.openingBalance, payload.opening_balance],
    [meta.debitAmount, payload.debit_amount],
    [meta.creditAmount, payload.credit_amount],
    [meta.closingBalance, payload.closing_balance],
    [meta.referenceNo, payload.reference_no],
    [meta.description, payload.description],
    [meta.status, payload.status],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;
    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return { sets, values };
};

exports.getVendorLedgers = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      entry_type = "",
      status = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push(`vl.\`${meta.vendorId}\` = ?`);
      params.push(vendor_id);
    }

    if (entry_type && meta.entryType) {
      where.push(`vl.\`${meta.entryType}\` = ?`);
      params.push(normalizeEntryType(entry_type));
    }

    if (status && meta.status) {
      where.push(`vl.\`${meta.status}\` = ?`);
      params.push(normalizeStatus(status));
    }

    if (from_date && meta.ledgerDate) {
      where.push(`DATE(vl.\`${meta.ledgerDate}\`) >= ?`);
      params.push(from_date);
    }

    if (to_date && meta.ledgerDate) {
      where.push(`DATE(vl.\`${meta.ledgerDate}\`) <= ?`);
      params.push(to_date);
    }

    if (search) {
      const searchFields = [
        meta.vendorName && `v.\`${meta.vendorName}\` LIKE ?`,
        meta.vendorCode && `v.\`${meta.vendorCode}\` LIKE ?`,
        meta.referenceNo && `vl.\`${meta.referenceNo}\` LIKE ?`,
        meta.description && `vl.\`${meta.description}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);
        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [ledgers] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vl
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vl.\`${meta.vendorId}\`
      ${whereSql}
      ORDER BY ${
        meta.ledgerDate
          ? `vl.\`${meta.ledgerDate}\` DESC, vl.\`${meta.id}\` DESC`
          : `vl.\`${meta.id}\` DESC`
      }
      `,
      params
    );

    res.json({
      success: true,
      count: ledgers.length,
      ledgers,
    });
  } catch (error) {
    console.error("Get vendor ledgers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor ledgers",
      error: error.message,
    });
  }
};

exports.getVendorLedgerById = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const [[ledger]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vl
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vl.\`${meta.vendorId}\`
      WHERE vl.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: "Vendor ledger not found",
      });
    }

    res.json({
      success: true,
      ledger,
    });
  } catch (error) {
    console.error("Get vendor ledger by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor ledger",
      error: error.message,
    });
  }
};

exports.createVendorLedger = async (req, res) => {
  try {
    const {
      vendor_id,
      transaction_id = "",
      entry_type = "purchase",
      ledger_date = "",
      opening_balance = 0,
      debit_amount = 0,
      credit_amount = 0,
      closing_balance = 0,
      reference_no = "",
      description = "",
      status = "active",
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

    const debit = toNumber(debit_amount);
    const credit = toNumber(credit_amount);
    const opening = toNumber(opening_balance);
    const closing = closing_balance === "" || closing_balance === null
      ? opening + debit - credit
      : toNumber(closing_balance);

    const payload = {
      vendor_id,
      transaction_id: cleanValue(transaction_id),
      entry_type: normalizeEntryType(entry_type),
      ledger_date: cleanValue(ledger_date) || new Date(),
      opening_balance: opening,
      debit_amount: debit,
      credit_amount: credit,
      closing_balance: closing,
      reference_no: cleanValue(reference_no),
      description: cleanValue(description),
      status: normalizeStatus(status),
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
      message: "Vendor ledger created successfully",
      ledger_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor ledger error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor ledger",
      error: error.message,
    });
  }
};

exports.updateVendorLedger = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      transaction_id = "",
      entry_type = "purchase",
      ledger_date = "",
      opening_balance = 0,
      debit_amount = 0,
      credit_amount = 0,
      closing_balance = 0,
      reference_no = "",
      description = "",
      status = "active",
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
        message: "Vendor ledger not found",
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

    const debit = toNumber(debit_amount);
    const credit = toNumber(credit_amount);
    const opening = toNumber(opening_balance);
    const closing = closing_balance === "" || closing_balance === null
      ? opening + debit - credit
      : toNumber(closing_balance);

    const payload = {
      vendor_id,
      transaction_id: cleanValue(transaction_id),
      entry_type: normalizeEntryType(entry_type),
      ledger_date: cleanValue(ledger_date) || new Date(),
      opening_balance: opening,
      debit_amount: debit,
      credit_amount: credit,
      closing_balance: closing,
      reference_no: cleanValue(reference_no),
      description: cleanValue(description),
      status: normalizeStatus(status),
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
      message: "Vendor ledger updated successfully",
    });
  } catch (error) {
    console.error("Update vendor ledger error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor ledger",
      error: error.message,
    });
  }
};

exports.deleteVendorLedger = async (req, res) => {
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
        message: "Vendor ledger not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor ledger deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor ledger error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor ledger",
      error: error.message,
    });
  }
};

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const cleanDate = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const getDateCondition = (alias, column, fromDate, toDate) => {
  const conditions = [];
  const values = [];

  if (fromDate) {
    conditions.push(`${alias}.${column} >= ?`);
    values.push(cleanDate(fromDate));
  }

  if (toDate) {
    conditions.push(`${alias}.${column} <= ?`);
    values.push(cleanDate(toDate));
  }

  return {
    sql: conditions.length ? `AND ${conditions.join(" AND ")}` : "",
    values,
  };
};

const getVendorTransactionsForStatement = async ({
  vendorId,
  fromDate = "",
  toDate = "",
}) => {
  const poDate = getDateCondition("po", "po_date", "", toDate);
  const paymentDate = getDateCondition("pp", "payment_date", "", toDate);
  const returnDate = getDateCondition("pr", "return_date", "", toDate);

  const values = [
    vendorId,
    ...poDate.values,

    vendorId,
    ...paymentDate.values,

    vendorId,
    ...returnDate.values,
  ];

  const [rows] = await db.query(
    `
      SELECT
        po.id,
        po.po_date AS transaction_date,
        'purchase_order' AS transaction_type,
        po.po_number AS reference_number,
        po.total_amount AS debit,
        0 AS credit,
        0 AS quantity,
        po.status,
        po.remarks,
        CONCAT('Purchase Order - ', po.po_number) AS description,
        po.created_at,
        1 AS sort_order
      FROM purchase_orders po
      WHERE po.vendor_id = ?
        AND po.status != 'cancelled'
        ${poDate.sql}

      UNION ALL

      SELECT
        pp.id,
        pp.payment_date AS transaction_date,
        'payment' AS transaction_type,
        COALESCE(NULLIF(pp.reference_number, ''), CONCAT('PAY-', pp.id)) AS reference_number,
        0 AS debit,
        pp.amount AS credit,
        0 AS quantity,
        pp.status,
        pp.remarks,
        CONCAT('Payment - ', COALESCE(pp.payment_mode, '')) AS description,
        pp.created_at,
        2 AS sort_order
      FROM procurement_payments pp
      WHERE pp.vendor_id = ?
        AND pp.status = 'paid'
        ${paymentDate.sql}

      UNION ALL

      SELECT
        pr.id,
        pr.return_date AS transaction_date,
        'purchase_return' AS transaction_type,
        pr.return_number AS reference_number,
        0 AS debit,
        COALESCE(SUM(pri.quantity * COALESCE(poi.unit_price, 0)), 0) AS credit,
        COALESCE(SUM(pri.quantity), 0) AS quantity,
        pr.status,
        pr.reason AS remarks,
        CONCAT('Purchase Return - ', pr.return_number) AS description,
        pr.created_at,
        3 AS sort_order
      FROM procurement_returns pr
      LEFT JOIN procurement_return_items pri
        ON pr.id = pri.procurement_return_id
      LEFT JOIN purchase_order_items poi
        ON pr.purchase_order_id = poi.purchase_order_id
        AND pri.product_id = poi.product_id
      WHERE pr.vendor_id = ?
        AND pr.status IN ('approved', 'sent', 'closed')
        ${returnDate.sql}
      GROUP BY
        pr.id,
        pr.return_date,
        pr.return_number,
        pr.status,
        pr.reason,
        pr.created_at

      ORDER BY transaction_date ASC, sort_order ASC, id ASC
    `,
    values
  );

  const from = cleanDate(fromDate);

  let openingBalance = 0;

  const periodRows = rows.filter((row) => {
    const rowDate = normalizeDate(row.transaction_date);

    if (!from) return true;

    if (rowDate && rowDate < from) {
      openingBalance += safeNumber(row.debit) - safeNumber(row.credit);
      return false;
    }

    return true;
  });

  return {
    openingBalance,
    rows: periodRows,
  };
};

exports.getVendorLedgerOverview = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        v.id AS vendor_id,
        v.business_name AS vendor_name,

        COALESCE(po.total_purchase_orders, 0) AS total_purchase_orders,
        COALESCE(po.total_purchase_value, 0) AS total_purchase_value,

        COALESCE(pay.total_payments, 0) AS total_payments,
        COALESCE(pay.paid_value, 0) AS paid_value,

        COALESCE(ret.total_returns, 0) AS total_returns,
        COALESCE(ret.return_qty, 0) AS return_qty,
        COALESCE(ret.return_value, 0) AS return_value,

        GREATEST(
          COALESCE(po.total_purchase_value, 0)
          - COALESCE(pay.paid_value, 0)
          - COALESCE(ret.return_value, 0),
          0
        ) AS outstanding_value

      FROM vendors v

      LEFT JOIN (
        SELECT
          vendor_id,
          COUNT(*) AS total_purchase_orders,
          SUM(total_amount) AS total_purchase_value
        FROM purchase_orders
        WHERE status != 'cancelled'
        GROUP BY vendor_id
      ) po ON v.id = po.vendor_id

      LEFT JOIN (
        SELECT
          vendor_id,
          COUNT(*) AS total_payments,
          SUM(amount) AS paid_value
        FROM procurement_payments
        WHERE status = 'paid'
        GROUP BY vendor_id
      ) pay ON v.id = pay.vendor_id

      LEFT JOIN (
        SELECT
          pr.vendor_id,
          COUNT(DISTINCT pr.id) AS total_returns,
          SUM(pri.quantity) AS return_qty,
          SUM(pri.quantity * COALESCE(poi.unit_price, 0)) AS return_value
        FROM procurement_returns pr
        LEFT JOIN procurement_return_items pri
          ON pr.id = pri.procurement_return_id
        LEFT JOIN purchase_order_items poi
          ON pr.purchase_order_id = poi.purchase_order_id
          AND pri.product_id = poi.product_id
        WHERE pr.status IN ('approved', 'sent', 'closed')
        GROUP BY pr.vendor_id
      ) ret ON v.id = ret.vendor_id

      WHERE COALESCE(po.total_purchase_orders, 0) > 0
         OR COALESCE(pay.total_payments, 0) > 0
         OR COALESCE(ret.total_returns, 0) > 0

      ORDER BY outstanding_value DESC, v.business_name ASC
    `);

    const summary = rows.reduce(
      (acc, row) => {
        acc.total_vendors += 1;
        acc.total_purchase_value += safeNumber(row.total_purchase_value);
        acc.paid_value += safeNumber(row.paid_value);
        acc.return_value += safeNumber(row.return_value);
        acc.outstanding_value += safeNumber(row.outstanding_value);
        return acc;
      },
      {
        total_vendors: 0,
        total_purchase_value: 0,
        paid_value: 0,
        return_value: 0,
        outstanding_value: 0,
      }
    );

    res.json({
      success: true,
      summary,
      count: rows.length,
      vendors: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Vendor ledger overview error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor ledger overview",
      error: error.message,
    });
  }
};

exports.getVendorLedgerSummary = async (req, res) => {
  try {
    const { vendor_id } = req.params;

    const [rows] = await db.query(
      `
        SELECT
          v.id AS vendor_id,
          v.business_name AS vendor_name,

          COALESCE(po.total_purchase_orders, 0) AS total_purchase_orders,
          COALESCE(po.total_purchase_value, 0) AS total_purchase_value,

          COALESCE(pay.total_payments, 0) AS total_payments,
          COALESCE(pay.paid_value, 0) AS paid_value,

          COALESCE(ret.total_returns, 0) AS total_returns,
          COALESCE(ret.return_qty, 0) AS return_qty,
          COALESCE(ret.return_value, 0) AS return_value,

          GREATEST(
            COALESCE(po.total_purchase_value, 0)
            - COALESCE(pay.paid_value, 0)
            - COALESCE(ret.return_value, 0),
            0
          ) AS outstanding_value

        FROM vendors v

        LEFT JOIN (
          SELECT
            vendor_id,
            COUNT(*) AS total_purchase_orders,
            SUM(total_amount) AS total_purchase_value
          FROM purchase_orders
          WHERE status != 'cancelled'
          GROUP BY vendor_id
        ) po ON v.id = po.vendor_id

        LEFT JOIN (
          SELECT
            vendor_id,
            COUNT(*) AS total_payments,
            SUM(amount) AS paid_value
          FROM procurement_payments
          WHERE status = 'paid'
          GROUP BY vendor_id
        ) pay ON v.id = pay.vendor_id

        LEFT JOIN (
          SELECT
            pr.vendor_id,
            COUNT(DISTINCT pr.id) AS total_returns,
            SUM(pri.quantity) AS return_qty,
            SUM(pri.quantity * COALESCE(poi.unit_price, 0)) AS return_value
          FROM procurement_returns pr
          LEFT JOIN procurement_return_items pri
            ON pr.id = pri.procurement_return_id
          LEFT JOIN purchase_order_items poi
            ON pr.purchase_order_id = poi.purchase_order_id
            AND pri.product_id = poi.product_id
          WHERE pr.status IN ('approved', 'sent', 'closed')
          GROUP BY pr.vendor_id
        ) ret ON v.id = ret.vendor_id

        WHERE v.id = ?
        LIMIT 1
      `,
      [vendor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.json({
      success: true,
      summary: rows[0],
    });
  } catch (error) {
    console.error("Vendor ledger summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor ledger summary",
      error: error.message,
    });
  }
};

exports.getVendorStatement = async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const { from_date = "", to_date = "" } = req.query;

    const [vendorRows] = await db.query(
      `
        SELECT
          id,
          business_name,
          phone,
          email,
          gstin,
          address,
          status
        FROM vendors
        WHERE id = ?
        LIMIT 1
      `,
      [vendor_id]
    );

    if (vendorRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const { openingBalance, rows } = await getVendorTransactionsForStatement({
      vendorId: vendor_id,
      fromDate: from_date,
      toDate: to_date,
    });

    let runningBalance = openingBalance;

    const ledger = rows.map((row) => {
      const debit = safeNumber(row.debit);
      const credit = safeNumber(row.credit);

      runningBalance += debit - credit;

      return {
        id: row.id,
        transaction_date: normalizeDate(row.transaction_date),
        transaction_type: row.transaction_type,
        reference_number: row.reference_number,
        description: row.description,
        debit,
        credit,
        quantity: safeNumber(row.quantity),
        balance: runningBalance,
        status: row.status,
        remarks: row.remarks,
      };
    });

    const periodDebit = ledger.reduce(
      (sum, row) => sum + safeNumber(row.debit),
      0
    );

    const periodCredit = ledger.reduce(
      (sum, row) => sum + safeNumber(row.credit),
      0
    );

    const exportRows = ledger.map((row) => ({
      Date: row.transaction_date || "",
      Type: row.transaction_type || "",
      "Reference No": row.reference_number || "",
      Description: row.description || "",
      Debit: row.debit,
      Credit: row.credit,
      Quantity: row.quantity,
      Balance: row.balance,
      Status: row.status || "",
      Remarks: row.remarks || "",
    }));

    res.json({
      success: true,
      vendor: vendorRows[0],
      period: {
        from_date: cleanDate(from_date),
        to_date: cleanDate(to_date),
      },
      summary: {
        opening_balance: openingBalance,
        period_debit: periodDebit,
        period_credit: periodCredit,
        closing_balance: runningBalance,
        outstanding_balance: Math.max(runningBalance, 0),
        advance_balance: runningBalance < 0 ? Math.abs(runningBalance) : 0,
      },
      ledger,
      export_ready: {
        file_name: `vendor-statement-${vendor_id}.xlsx`,
        columns: [
          "Date",
          "Type",
          "Reference No",
          "Description",
          "Debit",
          "Credit",
          "Quantity",
          "Balance",
          "Status",
          "Remarks",
        ],
        rows: exportRows,
      },
    });
  } catch (error) {
    console.error("Vendor statement error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor statement",
      error: error.message,
    });
  }
};

const getAutoLedgerLatestBalance = async (meta, vendorId) => {
  if (!meta.closingBalance) return 0;

  const orderBy = meta.ledgerDate
    ? `\`${meta.ledgerDate}\` DESC, \`${meta.id}\` DESC`
    : `\`${meta.id}\` DESC`;

  const [[row]] = await db.query(
    `
      SELECT \`${meta.closingBalance}\` AS closing_balance
      FROM ${TABLE}
      WHERE \`${meta.vendorId}\` = ?
      ORDER BY ${orderBy}
      LIMIT 1
    `,
    [vendorId]
  );

  return safeNumber(row?.closing_balance);
};

const autoLedgerExists = async (meta, vendorId, entryType, referenceNo) => {
  if (!meta.referenceNo) return false;

  const conditions = [`\`${meta.vendorId}\` = ?`, `\`${meta.referenceNo}\` = ?`];
  const values = [vendorId, referenceNo];

  if (meta.entryType) {
    conditions.push(`\`${meta.entryType}\` = ?`);
    values.push(entryType);
  }

  const [[row]] = await db.query(
    `
      SELECT \`${meta.id}\` AS id
      FROM ${TABLE}
      WHERE ${conditions.join(" AND ")}
      LIMIT 1
    `,
    values
  );

  return !!row;
};

const insertAutoLedger = async (meta, transaction, openingBalance) => {
  const debit = safeNumber(transaction.debit);
  const credit = safeNumber(transaction.credit);
  const closingBalance = openingBalance + debit - credit;

  const payload = {
    vendor_id: transaction.vendor_id,
    transaction_id: null,
    entry_type: transaction.entry_type,
    ledger_date: transaction.ledger_date,
    opening_balance: openingBalance,
    debit_amount: debit,
    credit_amount: credit,
    closing_balance: closingBalance,
    reference_no: transaction.reference_no,
    description: transaction.description,
    status: "active",
  };

  const insert = buildInsert(meta, payload);

  await db.query(
    `
      INSERT INTO ${TABLE}
        (${insert.fields.join(", ")})
      VALUES
        (${insert.placeholders.join(", ")})
    `,
    insert.values
  );

  return closingBalance;
};

const getAutoLedgerTransactions = async (vendorId = "") => {
  const values = [];
  let vendorSqlPo = "";
  let vendorSqlPay = "";
  let vendorSqlReturn = "";

  if (vendorId) {
    vendorSqlPo = "AND po.vendor_id = ?";
    vendorSqlPay = "AND pp.vendor_id = ?";
    vendorSqlReturn = "AND pr.vendor_id = ?";

    values.push(vendorId, vendorId, vendorId);
  }

  const [rows] = await db.query(
    `
      SELECT
        po.vendor_id,
        po.id AS source_id,
        po.po_date AS ledger_date,
        'purchase' AS entry_type,
        po.total_amount AS debit,
        0 AS credit,
        CONCAT('AUTO-PO-', po.po_number) AS reference_no,
        CONCAT('Auto Purchase Order - ', po.po_number) AS description,
        po.created_at,
        1 AS sort_order
      FROM purchase_orders po
      WHERE po.status != 'cancelled'
      ${vendorSqlPo}

      UNION ALL

      SELECT
        pp.vendor_id,
        pp.id AS source_id,
        pp.payment_date AS ledger_date,
        'payment' AS entry_type,
        0 AS debit,
        pp.amount AS credit,
        CONCAT('AUTO-PAY-', pp.id) AS reference_no,
        CONCAT(
          'Auto Vendor Payment - ',
          COALESCE(NULLIF(pp.reference_number, ''), CONCAT('PAY-', pp.id))
        ) AS description,
        pp.created_at,
        2 AS sort_order
      FROM procurement_payments pp
      WHERE pp.status = 'paid'
      ${vendorSqlPay}

      UNION ALL

      SELECT
        pr.vendor_id,
        pr.id AS source_id,
        pr.return_date AS ledger_date,
        'adjustment' AS entry_type,
        0 AS debit,
        COALESCE(SUM(pri.quantity * COALESCE(poi.unit_price, 0)), 0) AS credit,
        CONCAT('AUTO-RET-', pr.return_number) AS reference_no,
        CONCAT('Auto Purchase Return - ', pr.return_number) AS description,
        pr.created_at,
        3 AS sort_order
      FROM procurement_returns pr
      LEFT JOIN procurement_return_items pri
        ON pr.id = pri.procurement_return_id
      LEFT JOIN purchase_order_items poi
        ON pr.purchase_order_id = poi.purchase_order_id
        AND pri.product_id = poi.product_id
      WHERE pr.status IN ('approved', 'sent', 'closed')
      ${vendorSqlReturn}
      GROUP BY
        pr.vendor_id,
        pr.id,
        pr.return_date,
        pr.return_number,
        pr.created_at

      ORDER BY ledger_date ASC, sort_order ASC, source_id ASC
    `,
    values
  );

  return rows;
};

const syncAutoLedgerProcess = async (vendorId = "") => {
  const meta = await getMeta();

  if (!meta.id || !meta.vendorId) {
    throw new Error("vendor_ledgers table must have id and vendor_id columns");
  }

  const transactions = await getAutoLedgerTransactions(vendorId);

  const balanceMap = {};
  let inserted = 0;
  let skipped = 0;

  for (const transaction of transactions) {
    if (!transaction.vendor_id || !transaction.reference_no) {
      skipped += 1;
      continue;
    }

    const exists = await autoLedgerExists(
      meta,
      transaction.vendor_id,
      transaction.entry_type,
      transaction.reference_no
    );

    if (exists) {
      skipped += 1;
      continue;
    }

    if (balanceMap[transaction.vendor_id] === undefined) {
      balanceMap[transaction.vendor_id] = await getAutoLedgerLatestBalance(
        meta,
        transaction.vendor_id
      );
    }

    const closingBalance = await insertAutoLedger(
      meta,
      transaction,
      balanceMap[transaction.vendor_id]
    );

    balanceMap[transaction.vendor_id] = closingBalance;
    inserted += 1;
  }

  return {
    total_transactions: transactions.length,
    inserted,
    skipped,
  };
};

exports.syncAutoVendorLedgers = async (req, res) => {
  try {
    const result = await syncAutoLedgerProcess("");

    res.json({
      success: true,
      message: "Auto vendor ledger sync completed successfully",
      result,
    });
  } catch (error) {
    console.error("Auto vendor ledger sync error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to sync auto vendor ledgers",
      error: error.message,
    });
  }
};

exports.syncAutoVendorLedgerByVendor = async (req, res) => {
  try {
    const { vendor_id } = req.params;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    const result = await syncAutoLedgerProcess(vendor_id);

    res.json({
      success: true,
      message: "Vendor auto ledger sync completed successfully",
      result,
    });
  } catch (error) {
    console.error("Vendor auto ledger sync error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to sync vendor auto ledger",
      error: error.message,
    });
  }
};

const ageingNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const ageingDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

exports.getVendorPaymentAgeingReport = async (req, res) => {
  try {
    const vendorId = req.params.vendor_id || req.query.vendor_id || "";
    const asOnDate = ageingDate(req.query.as_on_date);

    const values = [asOnDate];

    let vendorSql = "";

    if (vendorId) {
      vendorSql = "AND po.vendor_id = ?";
      values.push(vendorId);
    }

    const [rows] = await db.query(
      `
        SELECT
          report.*,

          CASE
            WHEN report.ageing_days <= 0 THEN 'not_due'
            WHEN report.ageing_days BETWEEN 1 AND 30 THEN '0_30'
            WHEN report.ageing_days BETWEEN 31 AND 60 THEN '31_60'
            WHEN report.ageing_days BETWEEN 61 AND 90 THEN '61_90'
            ELSE '90_plus'
          END AS ageing_bucket

        FROM (
          SELECT
            po.id AS purchase_order_id,
            po.po_number,
            po.vendor_id,
            v.business_name AS vendor_name,
            po.po_date,
            po.expected_delivery_date,
            COALESCE(po.total_amount, 0) AS total_amount,

            COALESCE(pay.paid_amount, 0) AS paid_amount,
            COALESCE(ret.return_value, 0) AS return_value,

            GREATEST(
              COALESCE(po.total_amount, 0)
              - COALESCE(pay.paid_amount, 0)
              - COALESCE(ret.return_value, 0),
              0
            ) AS outstanding_amount,

            DATEDIFF(
              ?,
              COALESCE(po.expected_delivery_date, po.po_date)
            ) AS ageing_days,

            po.status,
            po.remarks

          FROM purchase_orders po

          LEFT JOIN vendors v
            ON po.vendor_id = v.id

          LEFT JOIN (
            SELECT
              purchase_order_id,
              SUM(amount) AS paid_amount
            FROM procurement_payments
            WHERE status = 'paid'
            GROUP BY purchase_order_id
          ) pay ON po.id = pay.purchase_order_id

          LEFT JOIN (
            SELECT
              pr.purchase_order_id,
              SUM(pri.quantity * COALESCE(poi.unit_price, 0)) AS return_value
            FROM procurement_returns pr
            LEFT JOIN procurement_return_items pri
              ON pr.id = pri.procurement_return_id
            LEFT JOIN purchase_order_items poi
              ON pr.purchase_order_id = poi.purchase_order_id
              AND pri.product_id = poi.product_id
            WHERE pr.status IN ('approved', 'sent', 'closed')
            GROUP BY pr.purchase_order_id
          ) ret ON po.id = ret.purchase_order_id

          WHERE po.status != 'cancelled'
          ${vendorSql}
        ) report

        WHERE report.outstanding_amount > 0

        ORDER BY
          report.ageing_days DESC,
          report.outstanding_amount DESC
      `,
      values
    );

    const summary = rows.reduce(
      (acc, row) => {
        const outstanding = ageingNumber(row.outstanding_amount);
        const bucket = row.ageing_bucket || "not_due";

        acc.total_purchase_orders += 1;
        acc.total_outstanding += outstanding;

        if (!acc.buckets[bucket]) {
          acc.buckets[bucket] = {
            count: 0,
            amount: 0,
          };
        }

        acc.buckets[bucket].count += 1;
        acc.buckets[bucket].amount += outstanding;

        return acc;
      },
      {
        total_purchase_orders: 0,
        total_outstanding: 0,
        buckets: {
          not_due: { count: 0, amount: 0 },
          "0_30": { count: 0, amount: 0 },
          "31_60": { count: 0, amount: 0 },
          "61_90": { count: 0, amount: 0 },
          "90_plus": { count: 0, amount: 0 },
        },
      }
    );

    res.json({
      success: true,
      as_on_date: asOnDate,
      summary,
      count: rows.length,
      ageing: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Vendor payment ageing report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor payment ageing report",
      error: error.message,
    });
  }
};

const recalculateSingleVendorLedger = async (vendorId) => {
  const meta = await getMeta();

  if (!meta.id || !meta.vendorId || !meta.openingBalance || !meta.closingBalance) {
    throw new Error(
      "vendor_ledgers table must have id, vendor_id, opening_balance and closing_balance columns"
    );
  }

  const orderBy = meta.ledgerDate
    ? `vl.\`${meta.ledgerDate}\` ASC, vl.\`${meta.id}\` ASC`
    : `vl.\`${meta.id}\` ASC`;

  const [rows] = await db.query(
    `
      SELECT
        vl.\`${meta.id}\` AS id,
        ${meta.openingBalance ? `vl.\`${meta.openingBalance}\`` : "0"} AS opening_balance,
        ${meta.debitAmount ? `vl.\`${meta.debitAmount}\`` : "0"} AS debit_amount,
        ${meta.creditAmount ? `vl.\`${meta.creditAmount}\`` : "0"} AS credit_amount
      FROM ${TABLE} vl
      WHERE vl.\`${meta.vendorId}\` = ?
      ORDER BY ${orderBy}
    `,
    [vendorId]
  );

  if (!rows.length) {
    return {
      vendor_id: vendorId,
      total_entries: 0,
      closing_balance: 0,
    };
  }

  let runningBalance = Number(rows[0]?.opening_balance || 0);

  for (const row of rows) {
    const openingBalance = runningBalance;
    const debit = Number(row.debit_amount || 0);
    const credit = Number(row.credit_amount || 0);
    const closingBalance = openingBalance + debit - credit;

    await db.query(
      `
        UPDATE ${TABLE}
        SET
          \`${meta.openingBalance}\` = ?,
          \`${meta.closingBalance}\` = ?
        WHERE \`${meta.id}\` = ?
      `,
      [openingBalance, closingBalance, row.id]
    );

    runningBalance = closingBalance;
  }

  return {
    vendor_id: vendorId,
    total_entries: rows.length,
    closing_balance: runningBalance,
  };
};

exports.recalculateVendorLedgerBalances = async (req, res) => {
  try {
    const vendorId = req.params.vendor_id || req.query.vendor_id || "";

    const meta = await getMeta();

    if (!meta.id || !meta.vendorId) {
      return res.status(500).json({
        success: false,
        message: "vendor_ledgers table must have id and vendor_id columns",
      });
    }

    if (vendorId) {
      const result = await recalculateSingleVendorLedger(vendorId);

      return res.json({
        success: true,
        message: "Vendor ledger balance recalculated successfully",
        result,
      });
    }

    const [vendors] = await db.query(
      `
        SELECT DISTINCT \`${meta.vendorId}\` AS vendor_id
        FROM ${TABLE}
        WHERE \`${meta.vendorId}\` IS NOT NULL
      `
    );

    const results = [];

    for (const vendor of vendors) {
      const result = await recalculateSingleVendorLedger(vendor.vendor_id);
      results.push(result);
    }

    const summary = results.reduce(
      (acc, item) => {
        acc.total_vendors += 1;
        acc.total_entries += Number(item.total_entries || 0);
        return acc;
      },
      {
        total_vendors: 0,
        total_entries: 0,
      }
    );

    res.json({
      success: true,
      message: "All vendor ledger balances recalculated successfully",
      summary,
      results,
    });
  } catch (error) {
    console.error("Recalculate vendor ledger balances error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to recalculate vendor ledger balances",
      error: error.message,
    });
  }
};