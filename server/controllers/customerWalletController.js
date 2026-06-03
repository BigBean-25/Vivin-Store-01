const db = require("../config/db");

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

exports.deleteCustomerWallet = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE customer_wallets
      SET status = 'inactive'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer wallet not found",
      });
    }

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
