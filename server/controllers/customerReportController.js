const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [[customers]] = await db.query(`
      SELECT
        COUNT(*) AS total_customers,
        SUM(status = 'active') AS active_customers,
        SUM(status = 'inactive') AS inactive_customers,
        SUM(status = 'blocked') AS blocked_customers
      FROM customers
    `);

    const [[wallets]] = await db.query(`
      SELECT
        COUNT(*) AS total_wallets,
        COALESCE(SUM(balance), 0) AS total_wallet_balance,
        COALESCE(SUM(credit_balance), 0) AS total_credit_balance
      FROM customer_wallets
    `);

    const [[transactions]] = await db.query(`
      SELECT
        COUNT(*) AS total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS total_credited,
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) AS total_debited
      FROM customer_transactions
    `);

    const [[creditLimits]] = await db.query(`
      SELECT
        COALESCE(SUM(limit_amount), 0) AS total_credit_limit,
        COALESCE(SUM(used_amount), 0) AS total_used_credit
      FROM customer_credit_limits
      WHERE status = 'active'
    `);

    res.json({
      success: true,
      summary: {
        customers: {
          total: Number(customers.total_customers),
          active: Number(customers.active_customers),
          inactive: Number(customers.inactive_customers),
          blocked: Number(customers.blocked_customers),
        },
        wallets: {
          total: Number(wallets.total_wallets),
          total_wallet_balance: Number(wallets.total_wallet_balance),
          total_credit_balance: Number(wallets.total_credit_balance),
        },
        transactions: {
          total: Number(transactions.total_transactions),
          total_credited: Number(transactions.total_credited),
          total_debited: Number(transactions.total_debited),
        },
        credit_limits: {
          total_credit_limit: Number(creditLimits.total_credit_limit),
          total_used_credit: Number(creditLimits.total_used_credit),
          total_available: Number(creditLimits.total_credit_limit) - Number(creditLimits.total_used_credit),
        },
      },
    });
  } catch (error) {
    console.error("Get customer report summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer report summary",
      error: error.message,
    });
  }
};

exports.getCustomersReport = async (req, res) => {
  try {
    const [customers] = await db.query(`
      SELECT
        c.id,
        c.customer_code,
        c.business_name,
        c.contact_person,
        c.email,
        c.phone,
        c.credit_limit,
        c.credit_days,
        c.status,
        cg.name AS group_name,
        COALESCE(cw.balance, 0) AS wallet_balance,
        COALESCE(cw.credit_balance, 0) AS wallet_credit_balance,
        c.created_at
      FROM customers c
      LEFT JOIN customer_groups cg ON cg.id = c.group_id
      LEFT JOIN customer_wallets cw ON cw.customer_id = c.id
      ORDER BY c.id DESC
    `);

    res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    console.error("Get customers report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customers report",
      error: error.message,
    });
  }
};

exports.getWalletsReport = async (req, res) => {
  try {
    const [wallets] = await db.query(`
      SELECT
        cw.id,
        cw.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        cw.balance,
        cw.credit_balance,
        cw.status,
        cw.created_at,
        cw.updated_at
      FROM customer_wallets cw
      LEFT JOIN customers c ON c.id = cw.customer_id
      ORDER BY cw.balance DESC
    `);

    res.json({ success: true, count: wallets.length, wallets });
  } catch (error) {
    console.error("Get wallets report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch wallets report",
      error: error.message,
    });
  }
};

exports.getTransactionsReport = async (req, res) => {
  try {
    const [transactions] = await db.query(`
      SELECT
        ct.id,
        ct.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        ct.transaction_type,
        ct.amount,
        ct.reference_type,
        ct.reference_id,
        ct.description,
        ct.created_at
      FROM customer_transactions ct
      LEFT JOIN customers c ON c.id = ct.customer_id
      ORDER BY ct.id DESC
    `);

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    console.error("Get transactions report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions report",
      error: error.message,
    });
  }
};

exports.getLedgersReport = async (req, res) => {
  try {
    const [ledgers] = await db.query(`
      SELECT
        cl.id,
        cl.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        cl.entry_date,
        cl.entry_type,
        cl.reference_type,
        cl.reference_id,
        cl.amount,
        cl.balance_after,
        cl.description,
        cl.created_at
      FROM customer_ledgers cl
      LEFT JOIN customers c ON c.id = cl.customer_id
      ORDER BY cl.id DESC
    `);

    res.json({ success: true, count: ledgers.length, ledgers });
  } catch (error) {
    console.error("Get ledgers report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch ledgers report",
      error: error.message,
    });
  }
};

exports.getCreditLimitsReport = async (req, res) => {
  try {
    const [creditLimits] = await db.query(`
      SELECT
        ccl.id,
        ccl.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        ccl.limit_amount,
        ccl.used_amount,
        (ccl.limit_amount - ccl.used_amount) AS available_amount,
        ccl.effective_from,
        ccl.effective_to,
        ccl.status,
        ccl.created_at
      FROM customer_credit_limits ccl
      LEFT JOIN customers c ON c.id = ccl.customer_id
      ORDER BY ccl.id DESC
    `);

    res.json({ success: true, count: creditLimits.length, creditLimits });
  } catch (error) {
    console.error("Get credit limits report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch credit limits report",
      error: error.message,
    });
  }
};

exports.getPricingReport = async (req, res) => {
  try {
    const [pricing] = await db.query(`
      SELECT
        cp.id,
        cp.customer_id,
        c.business_name AS customer_name,
        c.customer_code,
        cp.product_id,
        p.name AS product_name,
        p.sku,
        cp.price,
        cp.min_order_qty,
        cp.effective_from,
        cp.effective_to,
        cp.status,
        cp.created_at
      FROM customer_pricing cp
      LEFT JOIN customers c ON c.id = cp.customer_id
      LEFT JOIN products p ON p.id = cp.product_id
      ORDER BY cp.id DESC
    `);

    res.json({ success: true, count: pricing.length, pricing });
  } catch (error) {
    console.error("Get pricing report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch pricing report",
      error: error.message,
    });
  }
};

exports.getPerformanceReport = async (req, res) => {
  try {
    const [performance] = await db.query(`
      SELECT
        c.id,
        c.customer_code,
        c.business_name,
        c.status,
        c.credit_limit,
        c.credit_days,
        COALESCE(cw.balance, 0) AS wallet_balance,
        COALESCE(ccl.limit_amount, 0) AS credit_limit_approved,
        COALESCE(ccl.used_amount, 0) AS credit_used,
        COALESCE(tx.transaction_count, 0) AS transaction_count,
        COALESCE(tx.total_credited, 0) AS total_credited,
        COALESCE(tx.total_debited, 0) AS total_debited
      FROM customers c
      LEFT JOIN customer_wallets cw ON cw.customer_id = c.id
      LEFT JOIN customer_credit_limits ccl
        ON ccl.customer_id = c.id AND ccl.status = 'active'
      LEFT JOIN (
        SELECT
          customer_id,
          COUNT(*) AS transaction_count,
          SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) AS total_credited,
          SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) AS total_debited
        FROM customer_transactions
        GROUP BY customer_id
      ) tx ON tx.customer_id = c.id
      ORDER BY tx.total_credited DESC
    `);

    res.json({ success: true, count: performance.length, performance });
  } catch (error) {
    console.error("Get performance report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch performance report",
      error: error.message,
    });
  }
};
