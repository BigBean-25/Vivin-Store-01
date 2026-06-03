const db = require("../config/db");

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
};

const buildWhereClause = (filters = {}) => {
  const conditions = [];
  const values = [];

  if (filters.search) {
    conditions.push(`
      (
        v.business_name LIKE ?
        OR po.po_number LIKE ?
        OR pp.reference_number LIKE ?
        OR pp.payment_mode LIKE ?
      )
    `);

    const search = `%${filters.search}%`;
    values.push(search, search, search, search);
  }

  if (filters.vendor_id) {
    conditions.push("pp.vendor_id = ?");
    values.push(filters.vendor_id);
  }

  if (filters.purchase_order_id) {
    conditions.push("pp.purchase_order_id = ?");
    values.push(filters.purchase_order_id);
  }

  if (filters.status) {
    conditions.push("pp.status = ?");
    values.push(filters.status);
  }

  if (filters.from_date) {
    conditions.push("pp.payment_date >= ?");
    values.push(filters.from_date);
  }

  if (filters.to_date) {
    conditions.push("pp.payment_date <= ?");
    values.push(filters.to_date);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

const getVendorLastBalance = async (connection, vendorId) => {
  const [rows] = await connection.query(
    `
      SELECT balance_after
      FROM vendor_ledgers
      WHERE vendor_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [vendorId]
  );

  return toNumber(rows[0]?.balance_after);
};

const removePaymentLedger = async (connection, paymentId) => {
  await connection.query(
    `
      DELETE FROM vendor_ledgers
      WHERE reference_type = 'procurement_payment'
        AND reference_id = ?
    `,
    [paymentId]
  );
};

const postPaymentLedger = async (
  connection,
  {
    paymentId,
    vendorId,
    paymentDate,
    amount,
    referenceNumber,
  }
) => {
  await removePaymentLedger(connection, paymentId);

  const lastBalance = await getVendorLastBalance(connection, vendorId);
  const paidAmount = toNumber(amount);
  const balanceAfter = lastBalance - paidAmount;

  await connection.query(
    `
      INSERT INTO vendor_ledgers
        (
          vendor_id,
          entry_date,
          entry_type,
          reference_type,
          reference_id,
          amount,
          balance_after,
          description
        )
      VALUES (?, ?, 'debit', 'procurement_payment', ?, ?, ?, ?)
    `,
    [
      vendorId,
      paymentDate || new Date().toISOString().slice(0, 10),
      paymentId,
      paidAmount,
      balanceAfter,
      referenceNumber
        ? `Vendor payment made - Ref: ${referenceNumber}`
        : "Vendor payment made",
    ]
  );
};

exports.getProcurementPayments = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      purchase_order_id = "",
      status = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const { whereSql, values } = buildWhereClause({
      search: search.trim(),
      vendor_id,
      purchase_order_id,
      status,
      from_date,
      to_date,
    });

    const [payments] = await db.query(
      `
        SELECT
          pp.id,
          pp.vendor_id,
          v.business_name AS vendor_name,
          pp.purchase_order_id,
          po.po_number,
          po.total_amount AS po_total_amount,
          pp.payment_date,
          pp.amount,
          pp.payment_mode,
          pp.reference_number,
          pp.status,
          pp.remarks,
          pp.created_at
        FROM procurement_payments pp
        LEFT JOIN vendors v ON pp.vendor_id = v.id
        LEFT JOIN purchase_orders po ON pp.purchase_order_id = po.id
        ${whereSql}
        ORDER BY pp.id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: payments.length,
      payments,
      procurementPayments: payments,
      procurement_payments: payments,
    });
  } catch (error) {
    console.error("Get procurement payments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement payments",
      error: error.message,
    });
  }
};

exports.getProcurementPaymentSummary = async (req, res) => {
  try {
    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total_payments,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) AS failed_amount,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) AS cancelled_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
      FROM procurement_payments
    `);

    const [poRows] = await db.query(`
      SELECT
        COALESCE(SUM(po.total_amount), 0) AS total_po_amount,
        COALESCE(SUM(paid_table.paid_amount), 0) AS total_po_paid_amount,
        COALESCE(SUM(po.total_amount - COALESCE(paid_table.paid_amount, 0)), 0) AS total_po_balance_amount
      FROM purchase_orders po
      LEFT JOIN (
        SELECT
          purchase_order_id,
          SUM(amount) AS paid_amount
        FROM procurement_payments
        WHERE status = 'paid'
          AND purchase_order_id IS NOT NULL
        GROUP BY purchase_order_id
      ) paid_table ON paid_table.purchase_order_id = po.id
      WHERE po.status != 'cancelled'
    `);

    res.json({
      success: true,
      summary: {
        ...(summaryRows[0] || {}),
        ...(poRows[0] || {}),
      },
    });
  } catch (error) {
    console.error("Get procurement payment summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement payment summary",
      error: error.message,
    });
  }
};

exports.getProcurementPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [payments] = await db.query(
      `
        SELECT
          pp.id,
          pp.vendor_id,
          v.business_name AS vendor_name,
          pp.purchase_order_id,
          po.po_number,
          po.total_amount AS po_total_amount,
          pp.payment_date,
          pp.amount,
          pp.payment_mode,
          pp.reference_number,
          pp.status,
          pp.remarks,
          pp.created_at
        FROM procurement_payments pp
        LEFT JOIN vendors v ON pp.vendor_id = v.id
        LEFT JOIN purchase_orders po ON pp.purchase_order_id = po.id
        WHERE pp.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Procurement payment not found",
      });
    }

    res.json({
      success: true,
      payment: payments[0],
      procurementPayment: payments[0],
      procurement_payment: payments[0],
    });
  } catch (error) {
    console.error("Get procurement payment by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement payment",
      error: error.message,
    });
  }
};

exports.getPurchaseOrderPaymentBalance = async (req, res) => {
  try {
    const { purchase_order_id } = req.params;

    const [rows] = await db.query(
      `
        SELECT
          po.id AS purchase_order_id,
          po.po_number,
          po.vendor_id,
          v.business_name AS vendor_name,
          po.total_amount,
          COALESCE(SUM(CASE WHEN pp.status = 'paid' THEN pp.amount ELSE 0 END), 0) AS paid_amount,
          po.total_amount - COALESCE(SUM(CASE WHEN pp.status = 'paid' THEN pp.amount ELSE 0 END), 0) AS balance_amount
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN procurement_payments pp ON pp.purchase_order_id = po.id
        WHERE po.id = ?
        GROUP BY po.id
        LIMIT 1
      `,
      [purchase_order_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      balance: rows[0],
    });
  } catch (error) {
    console.error("Get PO payment balance error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase order balance",
      error: error.message,
    });
  }
};

exports.createProcurementPayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      vendor_id,
      purchase_order_id,
      payment_date,
      amount,
      payment_mode,
      reference_number,
      status = "pending",
      remarks,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!amount || toNumber(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0",
      });
    }

    await connection.beginTransaction();

    const [vendors] = await connection.query(
      `
        SELECT id
        FROM vendors
        WHERE id = ?
        LIMIT 1
      `,
      [vendor_id]
    );

    if (vendors.length === 0) {
      throw new Error("Vendor not found");
    }

    if (purchase_order_id) {
      const [purchaseOrders] = await connection.query(
        `
          SELECT id, vendor_id
          FROM purchase_orders
          WHERE id = ?
          LIMIT 1
        `,
        [purchase_order_id]
      );

      if (purchaseOrders.length === 0) {
        throw new Error("Purchase order not found");
      }

      if (Number(purchaseOrders[0].vendor_id) !== Number(vendor_id)) {
        throw new Error("Selected purchase order does not belong to selected vendor");
      }
    }

    const finalPaymentDate =
      cleanValue(payment_date) || new Date().toISOString().slice(0, 10);

    const [result] = await connection.query(
      `
        INSERT INTO procurement_payments
          (
            vendor_id,
            purchase_order_id,
            payment_date,
            amount,
            payment_mode,
            reference_number,
            status,
            remarks
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        vendor_id,
        cleanValue(purchase_order_id),
        finalPaymentDate,
        toNumber(amount),
        cleanValue(payment_mode),
        cleanValue(reference_number),
        cleanValue(status) || "pending",
        cleanValue(remarks),
      ]
    );

    const paymentId = result.insertId;

    if (status === "paid") {
      await postPaymentLedger(connection, {
        paymentId,
        vendorId: vendor_id,
        paymentDate: finalPaymentDate,
        amount,
        referenceNumber: reference_number,
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message:
        status === "paid"
          ? "Procurement payment created and posted to vendor ledger"
          : "Procurement payment created successfully",
      payment: {
        id: paymentId,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create procurement payment error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create procurement payment",
    });
  } finally {
    connection.release();
  }
};

exports.updateProcurementPayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const {
      vendor_id,
      purchase_order_id,
      payment_date,
      amount,
      payment_mode,
      reference_number,
      status,
      remarks,
    } = req.body;

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `
        SELECT *
        FROM procurement_payments
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (existingRows.length === 0) {
      throw new Error("Procurement payment not found");
    }

    const existing = existingRows[0];

    const finalVendorId = vendor_id || existing.vendor_id;
    const finalPurchaseOrderId =
      purchase_order_id === undefined
        ? existing.purchase_order_id
        : cleanValue(purchase_order_id);
    const finalPaymentDate = payment_date || existing.payment_date;
    const finalAmount = amount === undefined ? existing.amount : toNumber(amount);
    const finalStatus = status || existing.status;
    const finalReferenceNumber =
      reference_number === undefined ? existing.reference_number : reference_number;

    if (finalAmount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    await connection.query(
      `
        UPDATE procurement_payments
        SET
          vendor_id = ?,
          purchase_order_id = ?,
          payment_date = ?,
          amount = ?,
          payment_mode = ?,
          reference_number = ?,
          status = ?,
          remarks = ?
        WHERE id = ?
      `,
      [
        finalVendorId,
        finalPurchaseOrderId,
        finalPaymentDate,
        finalAmount,
        payment_mode === undefined ? existing.payment_mode : cleanValue(payment_mode),
        cleanValue(finalReferenceNumber),
        finalStatus,
        remarks === undefined ? existing.remarks : cleanValue(remarks),
        id,
      ]
    );

    if (finalStatus === "paid") {
      await postPaymentLedger(connection, {
        paymentId: id,
        vendorId: finalVendorId,
        paymentDate: finalPaymentDate,
        amount: finalAmount,
        referenceNumber: finalReferenceNumber,
      });
    } else {
      await removePaymentLedger(connection, id);
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Procurement payment updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update procurement payment error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update procurement payment",
    });
  } finally {
    connection.release();
  }
};

exports.updateProcurementPaymentStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "paid", "failed", "cancelled"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    await connection.beginTransaction();

    const [payments] = await connection.query(
      `
        SELECT *
        FROM procurement_payments
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (payments.length === 0) {
      throw new Error("Procurement payment not found");
    }

    const payment = payments[0];

    await connection.query(
      `
        UPDATE procurement_payments
        SET status = ?
        WHERE id = ?
      `,
      [status, id]
    );

    if (status === "paid") {
      await postPaymentLedger(connection, {
        paymentId: payment.id,
        vendorId: payment.vendor_id,
        paymentDate: payment.payment_date,
        amount: payment.amount,
        referenceNumber: payment.reference_number,
      });
    } else {
      await removePaymentLedger(connection, id);
    }

    await connection.commit();

    res.json({
      success: true,
      message:
        status === "paid"
          ? "Payment marked as paid and posted to vendor ledger"
          : "Payment status updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update procurement payment status error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update procurement payment status",
    });
  } finally {
    connection.release();
  }
};

exports.deleteProcurementPayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [payments] = await connection.query(
      `
        SELECT id
        FROM procurement_payments
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (payments.length === 0) {
      throw new Error("Procurement payment not found");
    }

    await removePaymentLedger(connection, id);

    await connection.query(
      `
        DELETE FROM procurement_payments
        WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Procurement payment deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete procurement payment error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete procurement payment",
    });
  } finally {
    connection.release();
  }
};
