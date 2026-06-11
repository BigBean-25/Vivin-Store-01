const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(transaction_type = 'credit') AS total_credit_count,
        SUM(transaction_type = 'debit') AS total_debit_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS total_credit_amount,
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) AS total_debit_amount,
        COALESCE(SUM(amount), 0) AS total_amount,
        COUNT(DISTINCT customer_id) AS customers_with_transactions
      FROM customer_transactions
    `);

    const s = rows[0];

    res.json({
      success: true,
      summary: {
        total: Number(s.total),
        total_credit_count: Number(s.total_credit_count),
        total_debit_count: Number(s.total_debit_count),
        total_credit_amount: Number(s.total_credit_amount),
        total_debit_amount: Number(s.total_debit_amount),
        total_amount: Number(s.total_amount),
        customers_with_transactions: Number(s.customers_with_transactions),
      },
    });
  } catch (error) {
    console.error("Get customer transaction summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer transaction summary",
      error: error.message,
    });
  }
};

exports.getAllCustomerTransactions = async (req, res) => {
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
      LEFT JOIN customers c ON ct.customer_id = c.id
      ORDER BY ct.id DESC
    `);

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get customer transactions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer transactions",
      error: error.message,
    });
  }
};

exports.getTransactionsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [transactions] = await db.query(
      `
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
      LEFT JOIN customers c ON ct.customer_id = c.id
      WHERE ct.customer_id = ?
      ORDER BY ct.id DESC
      `,
      [customerId]
    );

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get transactions by customer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer transactions",
      error: error.message,
    });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const [transactions] = await db.query(
      `
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
      LEFT JOIN customers c ON ct.customer_id = c.id
      WHERE ct.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer transaction not found",
      });
    }

    res.json({
      success: true,
      transaction: transactions[0],
    });
  } catch (error) {
    console.error("Get transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer transaction",
      error: error.message,
    });
  }
};

exports.createCustomerTransaction = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      customer_id,
      transaction_type,
      amount,
      reference_type,
      reference_id,
      description,
    } = req.body;

    if (!customer_id) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!transaction_type || !["credit", "debit"].includes(transaction_type)) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Transaction type must be credit or debit",
      });
    }

    if (!amount || Number(amount) <= 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    let [wallets] = await connection.query(
      `
      SELECT *
      FROM customer_wallets
      WHERE customer_id = ?
      LIMIT 1
      `,
      [customer_id]
    );

    if (wallets.length === 0) {
      await connection.query(
        `
        INSERT INTO customer_wallets (
          customer_id,
          balance,
          credit_balance,
          status
        )
        VALUES (?, 0, 0, 'active')
        `,
        [customer_id]
      );

      [wallets] = await connection.query(
        `
        SELECT *
        FROM customer_wallets
        WHERE customer_id = ?
        LIMIT 1
        `,
        [customer_id]
      );
    }

    const currentBalance = Number(wallets[0].balance || 0);
    const transactionAmount = Number(amount);

    let newBalance = currentBalance;

    if (transaction_type === "credit") {
      newBalance = currentBalance + transactionAmount;
    }

    if (transaction_type === "debit") {
      if (currentBalance < transactionAmount) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }

      newBalance = currentBalance - transactionAmount;
    }

    await connection.query(
      `
      UPDATE customer_wallets
      SET balance = ?
      WHERE customer_id = ?
      `,
      [newBalance, customer_id]
    );

    const [result] = await connection.query(
      `
      INSERT INTO customer_transactions (
        customer_id,
        transaction_type,
        amount,
        reference_type,
        reference_id,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        customer_id,
        transaction_type,
        transactionAmount,
        reference_type || "manual",
        reference_id || null,
        description || null,
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Customer transaction created successfully",
      transaction_id: result.insertId,
      wallet_balance: newBalance,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create customer transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer transaction",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
