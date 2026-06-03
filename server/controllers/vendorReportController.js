const db = require("../config/db");

const TABLES = {
  vendors: "vendors",
  transactions: "vendor_transactions",
  ledgers: "vendor_ledgers",
  ratings: "vendor_ratings",
  wallets: "vendor_wallets",
};

const tableExists = async (tableName) => {
  const [rows] = await db.query(`SHOW TABLES LIKE ?`, [tableName]);
  return rows.length > 0;
};

const getColumns = async (tableName) => {
  const exists = await tableExists(tableName);
  if (!exists) return [];

  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return rows.map((row) => row.Field);
};

const firstColumn = (columns, options) => {
  return options.find((column) => columns.includes(column)) || null;
};

const dateWhere = (column, alias, fromDate, toDate, params) => {
  const where = [];

  if (fromDate && column) {
    where.push(`DATE(${alias}.\`${column}\`) >= ?`);
    params.push(fromDate);
  }

  if (toDate && column) {
    where.push(`DATE(${alias}.\`${column}\`) <= ?`);
    params.push(toDate);
  }

  return where;
};

const safeNumber = (value) => Number(value || 0);

exports.getVendorReports = async (req, res) => {
  try {
    const { from_date = "", to_date = "", vendor_id = "" } = req.query;

    const vendorColumns = await getColumns(TABLES.vendors);
    const transactionColumns = await getColumns(TABLES.transactions);
    const ledgerColumns = await getColumns(TABLES.ledgers);
    const ratingColumns = await getColumns(TABLES.ratings);
    const walletColumns = await getColumns(TABLES.wallets);

    const vendorName = firstColumn(vendorColumns, [
      "business_name",
      "vendor_name",
      "name",
      "company_name",
    ]);

    const vendorCode = firstColumn(vendorColumns, ["vendor_code", "code"]);
    const vendorStatus = firstColumn(vendorColumns, ["status"]);
    const vendorCreatedAt = firstColumn(vendorColumns, ["created_at"]);

    const transactionVendorId = firstColumn(transactionColumns, ["vendor_id"]);
    const transactionAmount = firstColumn(transactionColumns, ["amount"]);
    const transactionType = firstColumn(transactionColumns, [
      "transaction_type",
      "type",
    ]);
    const transactionStatus = firstColumn(transactionColumns, ["status"]);
    const transactionDate = firstColumn(transactionColumns, [
      "transaction_date",
      "payment_date",
      "date",
      "created_at",
    ]);

    const ledgerVendorId = firstColumn(ledgerColumns, ["vendor_id"]);
    const ledgerDebit = firstColumn(ledgerColumns, [
      "debit_amount",
      "debit",
      "payable_amount",
      "purchase_amount",
    ]);
    const ledgerCredit = firstColumn(ledgerColumns, [
      "credit_amount",
      "credit",
      "paid_amount",
      "payment_amount",
    ]);
    const ledgerClosing = firstColumn(ledgerColumns, [
      "closing_balance",
      "balance",
      "current_balance",
      "running_balance",
    ]);
    const ledgerDate = firstColumn(ledgerColumns, [
      "ledger_date",
      "entry_date",
      "transaction_date",
      "date",
      "created_at",
    ]);

    const ratingVendorId = firstColumn(ratingColumns, ["vendor_id"]);
    const ratingValue = firstColumn(ratingColumns, [
      "rating",
      "overall_rating",
      "score",
      "rating_value",
    ]);

    const walletVendorId = firstColumn(walletColumns, ["vendor_id"]);
    const walletBalance = firstColumn(walletColumns, [
      "balance",
      "wallet_balance",
      "current_balance",
      "available_balance",
    ]);

    const summary = {
      total_vendors: 0,
      active_vendors: 0,
      total_transactions: 0,
      total_transaction_value: 0,
      total_debit: 0,
      total_credit: 0,
      closing_balance: 0,
      wallet_balance: 0,
      average_rating: 0,
    };

    const vendorWhere = [];
    const vendorParams = [];

    if (vendor_id) {
      vendorWhere.push("v.id = ?");
      vendorParams.push(vendor_id);
    }

    if (from_date && vendorCreatedAt) {
      vendorWhere.push(`DATE(v.\`${vendorCreatedAt}\`) >= ?`);
      vendorParams.push(from_date);
    }

    if (to_date && vendorCreatedAt) {
      vendorWhere.push(`DATE(v.\`${vendorCreatedAt}\`) <= ?`);
      vendorParams.push(to_date);
    }

    const vendorWhereSql = vendorWhere.length
      ? `WHERE ${vendorWhere.join(" AND ")}`
      : "";

    const [[vendorSummary]] = await db.query(
      `
      SELECT
        COUNT(*) AS total_vendors,
        SUM(CASE WHEN ${
          vendorStatus ? `v.\`${vendorStatus}\` = 'active'` : "1 = 1"
        } THEN 1 ELSE 0 END) AS active_vendors
      FROM ${TABLES.vendors} v
      ${vendorWhereSql}
      `,
      vendorParams
    );

    summary.total_vendors = safeNumber(vendorSummary?.total_vendors);
    summary.active_vendors = safeNumber(vendorSummary?.active_vendors);

    let transactions = [];
    if (
      transactionColumns.length &&
      transactionVendorId &&
      transactionAmount
    ) {
      const params = [];
      const where = [];

      if (vendor_id) {
        where.push(`vt.\`${transactionVendorId}\` = ?`);
        params.push(vendor_id);
      }

      where.push(...dateWhere(transactionDate, "vt", from_date, to_date, params));

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [transactionRows] = await db.query(
        `
        SELECT
          vt.\`${transactionVendorId}\` AS vendor_id,
          COUNT(*) AS total_transactions,
          SUM(vt.\`${transactionAmount}\`) AS total_amount,
          SUM(CASE WHEN ${
            transactionType
              ? `vt.\`${transactionType}\` IN ('credit','payment','advance','refund')`
              : "1 = 0"
          } THEN vt.\`${transactionAmount}\` ELSE 0 END) AS credit_amount,
          SUM(CASE WHEN ${
            transactionType
              ? `vt.\`${transactionType}\` IN ('debit','purchase','adjustment')`
              : "1 = 0"
          } THEN vt.\`${transactionAmount}\` ELSE 0 END) AS debit_amount
        FROM ${TABLES.transactions} vt
        ${whereSql}
        GROUP BY vt.\`${transactionVendorId}\`
        `,
        params
      );

      transactions = transactionRows;

      summary.total_transactions = transactionRows.reduce(
        (sum, item) => sum + safeNumber(item.total_transactions),
        0
      );

      summary.total_transaction_value = transactionRows.reduce(
        (sum, item) => sum + safeNumber(item.total_amount),
        0
      );
    }

    let ledgers = [];
    if (ledgerColumns.length && ledgerVendorId) {
      const params = [];
      const where = [];

      if (vendor_id) {
        where.push(`vl.\`${ledgerVendorId}\` = ?`);
        params.push(vendor_id);
      }

      where.push(...dateWhere(ledgerDate, "vl", from_date, to_date, params));

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [ledgerRows] = await db.query(
        `
        SELECT
          vl.\`${ledgerVendorId}\` AS vendor_id,
          SUM(${ledgerDebit ? `vl.\`${ledgerDebit}\`` : "0"}) AS total_debit,
          SUM(${ledgerCredit ? `vl.\`${ledgerCredit}\`` : "0"}) AS total_credit,
          MAX(${ledgerClosing ? `vl.\`${ledgerClosing}\`` : "0"}) AS closing_balance
        FROM ${TABLES.ledgers} vl
        ${whereSql}
        GROUP BY vl.\`${ledgerVendorId}\`
        `,
        params
      );

      ledgers = ledgerRows;

      summary.total_debit = ledgerRows.reduce(
        (sum, item) => sum + safeNumber(item.total_debit),
        0
      );

      summary.total_credit = ledgerRows.reduce(
        (sum, item) => sum + safeNumber(item.total_credit),
        0
      );

      summary.closing_balance = ledgerRows.reduce(
        (sum, item) => sum + safeNumber(item.closing_balance),
        0
      );
    }

    let ratings = [];
    if (ratingColumns.length && ratingVendorId && ratingValue) {
      const params = [];
      const where = [];

      if (vendor_id) {
        where.push(`vr.\`${ratingVendorId}\` = ?`);
        params.push(vendor_id);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [ratingRows] = await db.query(
        `
        SELECT
          vr.\`${ratingVendorId}\` AS vendor_id,
          AVG(vr.\`${ratingValue}\`) AS average_rating
        FROM ${TABLES.ratings} vr
        ${whereSql}
        GROUP BY vr.\`${ratingVendorId}\`
        `,
        params
      );

      ratings = ratingRows;

      summary.average_rating =
        ratingRows.length > 0
          ? Number(
              (
                ratingRows.reduce(
                  (sum, item) => sum + safeNumber(item.average_rating),
                  0
                ) / ratingRows.length
              ).toFixed(2)
            )
          : 0;
    }

    let wallets = [];
    if (walletColumns.length && walletVendorId && walletBalance) {
      const params = [];
      const where = [];

      if (vendor_id) {
        where.push(`vw.\`${walletVendorId}\` = ?`);
        params.push(vendor_id);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [walletRows] = await db.query(
        `
        SELECT
          vw.\`${walletVendorId}\` AS vendor_id,
          SUM(vw.\`${walletBalance}\`) AS wallet_balance
        FROM ${TABLES.wallets} vw
        ${whereSql}
        GROUP BY vw.\`${walletVendorId}\`
        `,
        params
      );

      wallets = walletRows;

      summary.wallet_balance = walletRows.reduce(
        (sum, item) => sum + safeNumber(item.wallet_balance),
        0
      );
    }

    const [vendorRows] = await db.query(
      `
      SELECT
        v.id,
        ${vendorName ? `v.\`${vendorName}\`` : "NULL"} AS vendor_name,
        ${vendorCode ? `v.\`${vendorCode}\`` : "NULL"} AS vendor_code,
        ${vendorStatus ? `v.\`${vendorStatus}\`` : "'active'"} AS status,
        ${vendorCreatedAt ? `v.\`${vendorCreatedAt}\`` : "NULL"} AS created_at
      FROM ${TABLES.vendors} v
      ${vendorWhereSql}
      ORDER BY v.id DESC
      `,
      vendorParams
    );

    const vendor_reports = vendorRows.map((vendor) => {
      const transaction = transactions.find(
        (item) => String(item.vendor_id) === String(vendor.id)
      );

      const ledger = ledgers.find(
        (item) => String(item.vendor_id) === String(vendor.id)
      );

      const rating = ratings.find(
        (item) => String(item.vendor_id) === String(vendor.id)
      );

      const wallet = wallets.find(
        (item) => String(item.vendor_id) === String(vendor.id)
      );

      return {
        ...vendor,
        total_transactions: safeNumber(transaction?.total_transactions),
        transaction_value: safeNumber(transaction?.total_amount),
        debit_amount: safeNumber(ledger?.total_debit || transaction?.debit_amount),
        credit_amount: safeNumber(ledger?.total_credit || transaction?.credit_amount),
        closing_balance: safeNumber(ledger?.closing_balance),
        wallet_balance: safeNumber(wallet?.wallet_balance),
        average_rating: safeNumber(rating?.average_rating),
      };
    });

    res.json({
      success: true,
      summary,
      reports: vendor_reports,
    });
  } catch (error) {
    console.error("Get vendor reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor reports",
      error: error.message,
    });
  }
};