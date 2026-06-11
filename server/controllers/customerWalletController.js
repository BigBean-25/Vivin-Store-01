const db = require("../config/db");

exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active') AS active,
        SUM(status = 'inactive') AS inactive,
        SUM(status = 'blocked') AS blocked,
        COALESCE(SUM(balance), 0) AS total_balance,
        COALESCE(SUM(credit_balance), 0) AS total_credit_balance,
        SUM(balance > 0) AS wallets_with_balance
      FROM customer_wallets
    `);

    const s = rows[0];

    res.json({
      success: true,
      summary: {
        total: Number(s.total),
        active: Number(s.active),
        inactive: Number(s.inactive),
        blocked: Number(s.blocked),
        total_balance: Number(s.total_balance),
        total_credit_balance: Number(s.total_credit_balance),
        wallets_with_balance: Number(s.wallets_with_balance),
      },
    });
  } catch (error) {
    console.error("Get customer wallet summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer wallet summary",
      error: error.message,
    });
  }
};

exports.getAllCustomerWallets = async (req, res) => {
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
      LEFT JOIN customers c ON cw.customer_id = c.id
      ORDER BY cw.id DESC
    `);

    res.json({
      success: true,
      count: wallets.length,
      wallets,
    });
  } catch (error) {
    console.error("Get customer wallets error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer wallets",
      error: error.message,
    });
  }
};

exports.getWalletByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    let [wallets] = await db.query(
      `
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
      LEFT JOIN customers c ON cw.customer_id = c.id
      WHERE cw.customer_id = ?
      LIMIT 1
      `,
      [customerId]
    );

    if (wallets.length === 0) {
      await db.query(
        `
        INSERT INTO customer_wallets (
          customer_id,
          balance,
          credit_balance,
          status
        )
        VALUES (?, 0, 0, 'active')
        `,
        [customerId]
      );

      [wallets] = await db.query(
        `
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
        LEFT JOIN customers c ON cw.customer_id = c.id
        WHERE cw.customer_id = ?
        LIMIT 1
        `,
        [customerId]
      );
    }

    res.json({
      success: true,
      wallet: wallets[0],
    });
  } catch (error) {
    console.error("Get customer wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer wallet",
      error: error.message,
    });
  }
};

exports.getWalletById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[wallet]] = await db.query(
      `
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
      LEFT JOIN customers c ON cw.customer_id = c.id
      WHERE cw.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Customer wallet not found",
      });
    }

    res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error("Get customer wallet by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer wallet",
      error: error.message,
    });
  }
};

exports.createCustomerWallet = async (req, res) => {
  try {
    const { customer_id, balance, credit_balance, status } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const [existingWallet] = await db.query(
      `
      SELECT id
      FROM customer_wallets
      WHERE customer_id = ?
      LIMIT 1
      `,
      [customer_id]
    );

    if (existingWallet.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Wallet already exists for this customer",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO customer_wallets (
        customer_id,
        balance,
        credit_balance,
        status
      )
      VALUES (?, ?, ?, ?)
      `,
      [customer_id, balance || 0, credit_balance || 0, status || "active"]
    );

    res.status(201).json({
      success: true,
      message: "Customer wallet created successfully",
      wallet_id: result.insertId,
    });
  } catch (error) {
    console.error("Create customer wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer wallet",
      error: error.message,
    });
  }
};

exports.updateCustomerWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, credit_balance, status } = req.body;

    const [result] = await db.query(
      `
      UPDATE customer_wallets SET
        balance = ?,
        credit_balance = ?,
        status = ?
      WHERE id = ?
      `,
      [balance || 0, credit_balance || 0, status || "active", id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer wallet not found",
      });
    }

    res.json({
      success: true,
      message: "Customer wallet updated successfully",
    });
  } catch (error) {
    console.error("Update customer wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer wallet",
      error: error.message,
    });
  }
};

exports.addWalletTransaction = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { customerId } = req.params;

    const {
      transaction_type,
      amount,
      reference_type,
      reference_id,
      description,
    } = req.body;

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
      [customerId]
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
        [customerId]
      );

      [wallets] = await connection.query(
        `
        SELECT *
        FROM customer_wallets
        WHERE customer_id = ?
        LIMIT 1
        `,
        [customerId]
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
      [newBalance, customerId]
    );

    const [transactionResult] = await connection.query(
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
        customerId,
        transaction_type,
        transactionAmount,
        reference_type || "wallet",
        reference_id || null,
        description || null,
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Wallet transaction added successfully",
      transaction_id: transactionResult.insertId,
      balance: newBalance,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Add wallet transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add wallet transaction",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "inactive", "blocked"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status required: active, inactive, blocked",
      });
    }

    const [result] = await db.query(
      "UPDATE customer_wallets SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer wallet not found",
      });
    }

    res.json({
      success: true,
      message: "Customer wallet status updated successfully",
    });
  } catch (error) {
    console.error("Update customer wallet status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer wallet status",
      error: error.message,
    });
  }
};

exports.deleteCustomerWallet = async (req, res) => {
  try {
    const { id } = req.params;

    const [[wallet]] = await db.query(
      `SELECT balance, credit_balance FROM customer_wallets WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Customer wallet not found",
      });
    }

    if (Number(wallet.balance) > 0 || Number(wallet.credit_balance) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate: wallet has a balance of \u20b9${wallet.balance} and credit balance of \u20b9${wallet.credit_balance}. Clear the balance first.`,
      });
    }

    await db.query(
      "UPDATE customer_wallets SET status = 'inactive' WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Customer wallet deactivated successfully",
    });
  } catch (error) {
    console.error("Delete customer wallet error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate customer wallet",
      error: error.message,
    });
  }
};
