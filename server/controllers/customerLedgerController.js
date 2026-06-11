const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(entry_type = 'debit') AS total_debit_entries,
        SUM(entry_type = 'credit') AS total_credit_entries,
        COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) AS total_debit_amount,
        COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) AS total_credit_amount,
        COALESCE(SUM(amount), 0) AS total_amount,
        COUNT(DISTINCT customer_id) AS customers_with_ledger
      FROM customer_ledgers
    `);

    const s = rows[0];

    res.json({
      success: true,
      summary: {
        total: Number(s.total),
        total_debit_entries: Number(s.total_debit_entries),
        total_credit_entries: Number(s.total_credit_entries),
        total_debit_amount: Number(s.total_debit_amount),
        total_credit_amount: Number(s.total_credit_amount),
        total_amount: Number(s.total_amount),
        customers_with_ledger: Number(s.customers_with_ledger),
      },
    });
  } catch (error) {
    console.error("Get customer ledger summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger summary",
      error: error.message,
    });
  }
};

exports.getAllCustomerLedgers = async (req, res) => {
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
      LEFT JOIN customers c ON cl.customer_id = c.id
      ORDER BY cl.id DESC
    `);

    res.json({
      success: true,
      count: ledgers.length,
      ledgers,
    });
  } catch (error) {
    console.error("Get customer ledgers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledgers",
      error: error.message,
    });
  }
};

exports.getCustomerLedgerByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [ledgers] = await db.query(
      `
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
      LEFT JOIN customers c ON cl.customer_id = c.id
      WHERE cl.customer_id = ?
      ORDER BY cl.id DESC
      `,
      [customerId]
    );

    res.json({
      success: true,
      count: ledgers.length,
      ledgers,
    });
  } catch (error) {
    console.error("Get customer ledger error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger",
      error: error.message,
    });
  }
};

exports.getCustomerLedgerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [ledgers] = await db.query(
      `
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
      LEFT JOIN customers c ON cl.customer_id = c.id
      WHERE cl.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (ledgers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer ledger entry not found",
      });
    }

    res.json({
      success: true,
      ledger: ledgers[0],
    });
  } catch (error) {
    console.error("Get customer ledger entry error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger entry",
      error: error.message,
    });
  }
};

exports.getCustomerLedgerSummary = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [summaryRows] = await db.query(
      `
      SELECT 
        customer_id,
        SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) AS total_debit,
        SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) AS total_credit,
        COALESCE(
          (
            SELECT balance_after
            FROM customer_ledgers
            WHERE customer_id = ?
            ORDER BY id DESC
            LIMIT 1
          ),
          0
        ) AS current_balance
      FROM customer_ledgers
      WHERE customer_id = ?
      GROUP BY customer_id
      `,
      [customerId, customerId]
    );

    const [customerRows] = await db.query(
      `
      SELECT id, customer_code, business_name, contact_person, phone
      FROM customers
      WHERE id = ?
      LIMIT 1
      `,
      [customerId]
    );

    res.json({
      success: true,
      customer: customerRows[0] || null,
      summary:
        summaryRows[0] || {
          customer_id: Number(customerId),
          total_debit: 0,
          total_credit: 0,
          current_balance: 0,
        },
    });
  } catch (error) {
    console.error("Get customer ledger summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger summary",
      error: error.message,
    });
  }
};

exports.createCustomerLedger = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      customer_id,
      entry_date,
      entry_type,
      reference_type,
      reference_id,
      amount,
      description,
    } = req.body;

    if (!customer_id) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!entry_type || !["debit", "credit"].includes(entry_type)) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Entry type must be debit or credit",
      });
    }

    if (!amount || Number(amount) <= 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const [customers] = await connection.query(
      `
      SELECT id
      FROM customers
      WHERE id = ?
      LIMIT 1
      `,
      [customer_id]
    );

    if (customers.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const [lastLedger] = await connection.query(
      `
      SELECT balance_after
      FROM customer_ledgers
      WHERE customer_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [customer_id]
    );

    const previousBalance =
      lastLedger.length > 0 ? Number(lastLedger[0].balance_after || 0) : 0;

    const entryAmount = Number(amount);

    let newBalance = previousBalance;

    if (entry_type === "debit") {
      newBalance = previousBalance + entryAmount;
    }

    if (entry_type === "credit") {
      newBalance = previousBalance - entryAmount;
    }

    const [result] = await connection.query(
      `
      INSERT INTO customer_ledgers (
        customer_id,
        entry_date,
        entry_type,
        reference_type,
        reference_id,
        amount,
        balance_after,
        description
      )
      VALUES (?, COALESCE(?, CURDATE()), ?, ?, ?, ?, ?, ?)
      `,
      [
        customer_id,
        entry_date || null,
        entry_type,
        reference_type || "manual",
        reference_id || null,
        entryAmount,
        newBalance,
        description || null,
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Customer ledger entry created successfully",
      ledger_id: result.insertId,
      previous_balance: previousBalance,
      balance_after: newBalance,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create customer ledger error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer ledger entry",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
