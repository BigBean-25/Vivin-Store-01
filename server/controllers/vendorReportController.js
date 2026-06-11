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
    const ledgerAmount = firstColumn(ledgerColumns, ["amount"]);
    const ledgerEntryType = firstColumn(ledgerColumns, ["entry_type"]);
    const ledgerBalanceAfter = firstColumn(ledgerColumns, [
      "balance_after",
      "closing_balance",
      "balance",
      "current_balance",
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

      const amountExpr = ledgerAmount ? `vl.\`${ledgerAmount}\`` : "0";
      const entryTypeExpr = ledgerEntryType ? `vl.\`${ledgerEntryType}\`` : "NULL";
      const balanceExpr = ledgerBalanceAfter ? `vl.\`${ledgerBalanceAfter}\`` : "0";

      const [ledgerRows] = await db.query(
        `
        SELECT
          vl.\`${ledgerVendorId}\` AS vendor_id,
          SUM(CASE WHEN ${entryTypeExpr} = 'debit' THEN ${amountExpr} ELSE 0 END) AS total_debit,
          SUM(CASE WHEN ${entryTypeExpr} = 'credit' THEN ${amountExpr} ELSE 0 END) AS total_credit,
          MAX(${balanceExpr}) AS closing_balance
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

exports.getVendorReportSummary = async (req, res) => {
  req.query._summary_only = "1";
  const { from_date = "", to_date = "", vendor_id = "" } = req.query;

  try {
    const vendorColumns = await getColumns(TABLES.vendors);
    const transactionColumns = await getColumns(TABLES.transactions);
    const ledgerColumns = await getColumns(TABLES.ledgers);
    const ratingColumns = await getColumns(TABLES.ratings);
    const walletColumns = await getColumns(TABLES.wallets);

    const vendorStatus = firstColumn(vendorColumns, ["status"]);
    const transactionVendorId = firstColumn(transactionColumns, ["vendor_id"]);
    const transactionAmount = firstColumn(transactionColumns, ["amount"]);
    const transactionType = firstColumn(transactionColumns, ["transaction_type", "type"]);
    const ledgerVendorId = firstColumn(ledgerColumns, ["vendor_id"]);
    const ledgerAmount = firstColumn(ledgerColumns, ["amount"]);
    const ledgerEntryType = firstColumn(ledgerColumns, ["entry_type"]);
    const ledgerBalanceAfter = firstColumn(ledgerColumns, ["balance_after", "closing_balance", "balance"]);
    const ratingVendorId = firstColumn(ratingColumns, ["vendor_id"]);
    const ratingValue = firstColumn(ratingColumns, ["rating", "overall_rating", "score"]);
    const walletVendorId = firstColumn(walletColumns, ["vendor_id"]);
    const walletBalance = firstColumn(walletColumns, ["balance", "wallet_balance", "current_balance"]);

    const summary = {
      total_vendors: 0, active_vendors: 0,
      total_transactions: 0, total_transaction_value: 0,
      total_credit: 0, total_debit: 0, closing_balance: 0,
      wallet_balance: 0, average_rating: 0,
    };

    const vendorWhere = vendor_id ? ["v.id = ?"] : [];
    const vendorParams = vendor_id ? [vendor_id] : [];
    const vendorWhereSql = vendorWhere.length ? `WHERE ${vendorWhere.join(" AND ")}` : "";

    const [[vs]] = await db.query(
      `SELECT COUNT(*) AS total_vendors, SUM(CASE WHEN ${vendorStatus ? `v.\`${vendorStatus}\` = 'active'` : "1=1"} THEN 1 ELSE 0 END) AS active_vendors FROM ${TABLES.vendors} v ${vendorWhereSql}`,
      vendorParams
    );
    summary.total_vendors = safeNumber(vs?.total_vendors);
    summary.active_vendors = safeNumber(vs?.active_vendors);

    if (transactionVendorId && transactionAmount) {
      const tWhere = vendor_id ? [`vt.\`${transactionVendorId}\` = ?`] : [];
      const tParams = vendor_id ? [vendor_id] : [];
      const tSql = tWhere.length ? `WHERE ${tWhere.join(" AND ")}` : "";
      const amtExpr = `vt.\`${transactionAmount}\``;
      const typeExpr = transactionType ? `vt.\`${transactionType}\`` : "NULL";
      const [[tr]] = await db.query(
        `SELECT COUNT(*) AS cnt, SUM(${amtExpr}) AS total_amount, SUM(CASE WHEN ${typeExpr} IN ('credit','payment','advance','refund') THEN ${amtExpr} ELSE 0 END) AS credit_amount, SUM(CASE WHEN ${typeExpr} IN ('debit','purchase','adjustment') THEN ${amtExpr} ELSE 0 END) AS debit_amount FROM ${TABLES.transactions} vt ${tSql}`,
        tParams
      );
      summary.total_transactions = safeNumber(tr?.cnt);
      summary.total_transaction_value = safeNumber(tr?.total_amount);
    }

    if (ledgerVendorId && ledgerAmount && ledgerEntryType) {
      const lWhere = vendor_id ? [`vl.\`${ledgerVendorId}\` = ?`] : [];
      const lParams = vendor_id ? [vendor_id] : [];
      const lSql = lWhere.length ? `WHERE ${lWhere.join(" AND ")}` : "";
      const amtExpr = `vl.\`${ledgerAmount}\``;
      const etExpr = `vl.\`${ledgerEntryType}\``;
      const balExpr = ledgerBalanceAfter ? `vl.\`${ledgerBalanceAfter}\`` : "0";
      const [[lr]] = await db.query(
        `SELECT SUM(CASE WHEN ${etExpr} = 'debit' THEN ${amtExpr} ELSE 0 END) AS total_debit, SUM(CASE WHEN ${etExpr} = 'credit' THEN ${amtExpr} ELSE 0 END) AS total_credit, MAX(${balExpr}) AS closing_balance FROM ${TABLES.ledgers} vl ${lSql}`,
        lParams
      );
      summary.total_debit = safeNumber(lr?.total_debit);
      summary.total_credit = safeNumber(lr?.total_credit);
      summary.closing_balance = safeNumber(lr?.closing_balance);
    }

    if (ratingVendorId && ratingValue) {
      const rWhere = vendor_id ? [`vr.\`${ratingVendorId}\` = ?`] : [];
      const rParams = vendor_id ? [vendor_id] : [];
      const rSql = rWhere.length ? `WHERE ${rWhere.join(" AND ")}` : "";
      const [[rr]] = await db.query(
        `SELECT AVG(vr.\`${ratingValue}\`) AS avg_rating FROM ${TABLES.ratings} vr ${rSql}`,
        rParams
      );
      summary.average_rating = rr?.avg_rating ? Number(Number(rr.avg_rating).toFixed(2)) : 0;
    }

    if (walletVendorId && walletBalance) {
      const wWhere = vendor_id ? [`vw.\`${walletVendorId}\` = ?`] : [];
      const wParams = vendor_id ? [vendor_id] : [];
      const wSql = wWhere.length ? `WHERE ${wWhere.join(" AND ")}` : "";
      const [[wr]] = await db.query(
        `SELECT SUM(vw.\`${walletBalance}\`) AS wallet_balance FROM ${TABLES.wallets} vw ${wSql}`,
        wParams
      );
      summary.wallet_balance = safeNumber(wr?.wallet_balance);
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get vendor report summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor report summary", error: error.message });
  }
};

exports.getVendorReportVendors = async (req, res) => {
  try {
    const { vendor_id = "", from_date = "", to_date = "" } = req.query;
    const vendorColumns = await getColumns(TABLES.vendors);
    const vendorName = firstColumn(vendorColumns, ["business_name", "vendor_name", "name"]);
    const vendorCode = firstColumn(vendorColumns, ["vendor_code", "code"]);
    const vendorStatus = firstColumn(vendorColumns, ["status"]);
    const vendorCreatedAt = firstColumn(vendorColumns, ["created_at"]);

    const where = [];
    const params = [];
    if (vendor_id) { where.push("v.id = ?"); params.push(vendor_id); }
    if (from_date && vendorCreatedAt) { where.push(`DATE(v.\`${vendorCreatedAt}\`) >= ?`); params.push(from_date); }
    if (to_date && vendorCreatedAt) { where.push(`DATE(v.\`${vendorCreatedAt}\`) <= ?`); params.push(to_date); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [vendors] = await db.query(
      `SELECT v.id, ${vendorName ? `v.\`${vendorName}\`` : "NULL"} AS vendor_name, ${vendorCode ? `v.\`${vendorCode}\`` : "NULL"} AS vendor_code, ${vendorStatus ? `v.\`${vendorStatus}\`` : "'active'"}  AS status, ${vendorCreatedAt ? `v.\`${vendorCreatedAt}\`` : "NULL"} AS created_at FROM ${TABLES.vendors} v ${whereSql} ORDER BY v.id DESC`,
      params
    );
    res.json({ success: true, count: vendors.length, vendors });
  } catch (error) {
    console.error("Get vendor report vendors error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor report vendors", error: error.message });
  }
};

exports.getVendorReportWallets = async (req, res) => {
  try {
    const { vendor_id = "" } = req.query;
    const walletColumns = await getColumns(TABLES.wallets);
    const vendorColumns = await getColumns(TABLES.vendors);
    if (!walletColumns.length) return res.json({ success: true, count: 0, wallets: [] });

    const walletVendorId = firstColumn(walletColumns, ["vendor_id"]);
    const walletBalance = firstColumn(walletColumns, ["balance", "wallet_balance", "current_balance"]);
    const vendorName = firstColumn(vendorColumns, ["business_name", "vendor_name", "name"]);

    const where = walletVendorId && vendor_id ? [`vw.\`${walletVendorId}\` = ?`] : [];
    const params = vendor_id ? [vendor_id] : [];
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [wallets] = await db.query(
      `SELECT vw.*, ${vendorName ? `v.\`${vendorName}\`` : "NULL"} AS vendor_name FROM ${TABLES.wallets} vw LEFT JOIN ${TABLES.vendors} v ON v.id = vw.\`${walletVendorId || "vendor_id"}\` ${whereSql} ORDER BY vw.id DESC`,
      params
    );
    res.json({ success: true, count: wallets.length, wallets });
  } catch (error) {
    console.error("Get vendor report wallets error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor report wallets", error: error.message });
  }
};

exports.getVendorReportTransactions = async (req, res) => {
  try {
    const { vendor_id = "", from_date = "", to_date = "" } = req.query;
    const transactionColumns = await getColumns(TABLES.transactions);
    const vendorColumns = await getColumns(TABLES.vendors);
    if (!transactionColumns.length) return res.json({ success: true, count: 0, transactions: [] });

    const txVendorId = firstColumn(transactionColumns, ["vendor_id"]);
    const txAmount = firstColumn(transactionColumns, ["amount"]);
    const txType = firstColumn(transactionColumns, ["transaction_type", "type"]);
    const txDate = firstColumn(transactionColumns, ["transaction_date", "created_at"]);
    const vendorName = firstColumn(vendorColumns, ["business_name", "vendor_name", "name"]);

    const where = [];
    const params = [];
    if (vendor_id && txVendorId) { where.push(`vt.\`${txVendorId}\` = ?`); params.push(vendor_id); }
    if (from_date && txDate) { where.push(`DATE(vt.\`${txDate}\`) >= ?`); params.push(from_date); }
    if (to_date && txDate) { where.push(`DATE(vt.\`${txDate}\`) <= ?`); params.push(to_date); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const amtExpr = txAmount ? `vt.\`${txAmount}\`` : "0";
    const typeExpr = txType ? `vt.\`${txType}\`` : "NULL";
    const [transactions] = await db.query(
      `SELECT vt.*, ${vendorName ? `v.\`${vendorName}\`` : "NULL"} AS vendor_name, CASE WHEN ${typeExpr} = 'credit' THEN ${amtExpr} ELSE 0 END AS credit_amount, CASE WHEN ${typeExpr} = 'debit' THEN ${amtExpr} ELSE 0 END AS debit_amount FROM ${TABLES.transactions} vt LEFT JOIN ${TABLES.vendors} v ON v.id = vt.\`${txVendorId || "vendor_id"}\` ${whereSql} ORDER BY vt.id DESC`,
      params
    );
    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    console.error("Get vendor report transactions error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor report transactions", error: error.message });
  }
};

exports.getVendorReportLedgers = async (req, res) => {
  try {
    const { vendor_id = "", from_date = "", to_date = "" } = req.query;
    const ledgerColumns = await getColumns(TABLES.ledgers);
    const vendorColumns = await getColumns(TABLES.vendors);
    if (!ledgerColumns.length) return res.json({ success: true, count: 0, ledgers: [] });

    const lVendorId = firstColumn(ledgerColumns, ["vendor_id"]);
    const lAmount = firstColumn(ledgerColumns, ["amount"]);
    const lEntryType = firstColumn(ledgerColumns, ["entry_type"]);
    const lDate = firstColumn(ledgerColumns, ["entry_date", "ledger_date", "created_at"]);
    const vendorName = firstColumn(vendorColumns, ["business_name", "vendor_name", "name"]);

    const where = [];
    const params = [];
    if (vendor_id && lVendorId) { where.push(`vl.\`${lVendorId}\` = ?`); params.push(vendor_id); }
    if (from_date && lDate) { where.push(`DATE(vl.\`${lDate}\`) >= ?`); params.push(from_date); }
    if (to_date && lDate) { where.push(`DATE(vl.\`${lDate}\`) <= ?`); params.push(to_date); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const amtExpr = lAmount ? `vl.\`${lAmount}\`` : "0";
    const etExpr = lEntryType ? `vl.\`${lEntryType}\`` : "NULL";
    const [ledgers] = await db.query(
      `SELECT vl.*, ${vendorName ? `v.\`${vendorName}\`` : "NULL"} AS vendor_name, CASE WHEN ${etExpr} = 'debit' THEN ${amtExpr} ELSE 0 END AS debit_amount, CASE WHEN ${etExpr} = 'credit' THEN ${amtExpr} ELSE 0 END AS credit_amount FROM ${TABLES.ledgers} vl LEFT JOIN ${TABLES.vendors} v ON v.id = vl.\`${lVendorId || "vendor_id"}\` ${whereSql} ORDER BY vl.id DESC`,
      params
    );
    res.json({ success: true, count: ledgers.length, ledgers });
  } catch (error) {
    console.error("Get vendor report ledgers error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor report ledgers", error: error.message });
  }
};

exports.getVendorReportRatings = async (req, res) => {
  try {
    const { vendor_id = "" } = req.query;
    const ratingColumns = await getColumns(TABLES.ratings);
    const vendorColumns = await getColumns(TABLES.vendors);
    if (!ratingColumns.length) return res.json({ success: true, count: 0, ratings: [] });

    const rVendorId = firstColumn(ratingColumns, ["vendor_id"]);
    const rValue = firstColumn(ratingColumns, ["rating", "overall_rating", "score"]);
    const vendorName = firstColumn(vendorColumns, ["business_name", "vendor_name", "name"]);

    const where = rVendorId && vendor_id ? [`vr.\`${rVendorId}\` = ?`] : [];
    const params = vendor_id ? [vendor_id] : [];
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [ratings] = await db.query(
      `SELECT vr.*, ${vendorName ? `v.\`${vendorName}\`` : "NULL"} AS vendor_name FROM ${TABLES.ratings} vr LEFT JOIN ${TABLES.vendors} v ON v.id = vr.\`${rVendorId || "vendor_id"}\` ${whereSql} ORDER BY vr.id DESC`,
      params
    );
    res.json({ success: true, count: ratings.length, ratings });
  } catch (error) {
    console.error("Get vendor report ratings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor report ratings", error: error.message });
  }
};

exports.getVendorReportPerformance = async (req, res) => {
  try {
    const { vendor_id = "", from_date = "", to_date = "" } = req.query;
    const vendorColumns = await getColumns(TABLES.vendors);
    const transactionColumns = await getColumns(TABLES.transactions);
    const ratingColumns = await getColumns(TABLES.ratings);

    const vendorName = firstColumn(vendorColumns, ["business_name", "vendor_name", "name"]);
    const vendorStatus = firstColumn(vendorColumns, ["status"]);
    const txVendorId = firstColumn(transactionColumns, ["vendor_id"]);
    const txAmount = firstColumn(transactionColumns, ["amount"]);
    const rVendorId = firstColumn(ratingColumns, ["vendor_id"]);
    const rValue = firstColumn(ratingColumns, ["rating", "overall_rating", "score"]);

    const vendorWhere = vendor_id ? ["v.id = ?"] : [];
    const vendorParams = vendor_id ? [vendor_id] : [];
    const vendorWhereSql = vendorWhere.length ? `WHERE ${vendorWhere.join(" AND ")}` : "";

    const [vendorRows] = await db.query(
      `SELECT v.id, ${vendorName ? `v.\`${vendorName}\`` : "NULL"} AS vendor_name, ${vendorStatus ? `v.\`${vendorStatus}\`` : "'active'"} AS status FROM ${TABLES.vendors} v ${vendorWhereSql} ORDER BY v.id DESC`,
      vendorParams
    );

    let txMap = {};
    if (txVendorId && txAmount && transactionColumns.length) {
      const tWhere = vendor_id ? [`vt.\`${txVendorId}\` = ?`] : [];
      const tParams = vendor_id ? [vendor_id] : [];
      const [txRows] = await db.query(
        `SELECT vt.\`${txVendorId}\` AS vendor_id, COUNT(*) AS total_transactions, SUM(vt.\`${txAmount}\`) AS total_value FROM ${TABLES.transactions} vt ${tWhere.length ? "WHERE " + tWhere.join(" AND ") : ""} GROUP BY vt.\`${txVendorId}\``,
        tParams
      );
      txMap = Object.fromEntries(txRows.map((r) => [String(r.vendor_id), r]));
    }

    let ratingMap = {};
    if (rVendorId && rValue && ratingColumns.length) {
      const rWhere = vendor_id ? [`vr.\`${rVendorId}\` = ?`] : [];
      const rParams = vendor_id ? [vendor_id] : [];
      const [rRows] = await db.query(
        `SELECT vr.\`${rVendorId}\` AS vendor_id, AVG(vr.\`${rValue}\`) AS average_rating, COUNT(*) AS total_ratings FROM ${TABLES.ratings} vr ${rWhere.length ? "WHERE " + rWhere.join(" AND ") : ""} GROUP BY vr.\`${rVendorId}\``,
        rParams
      );
      ratingMap = Object.fromEntries(rRows.map((r) => [String(r.vendor_id), r]));
    }

    const performance = vendorRows.map((v) => {
      const tx = txMap[String(v.id)] || {};
      const rt = ratingMap[String(v.id)] || {};
      return {
        vendor_id: v.id,
        vendor_name: v.vendor_name,
        status: v.status,
        total_transactions: safeNumber(tx.total_transactions),
        total_transaction_value: safeNumber(tx.total_value),
        average_rating: rt.average_rating ? Number(Number(rt.average_rating).toFixed(2)) : 0,
        total_ratings: safeNumber(rt.total_ratings),
      };
    });

    res.json({ success: true, count: performance.length, performance });
  } catch (error) {
    console.error("Get vendor report performance error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor report performance", error: error.message });
  }
};