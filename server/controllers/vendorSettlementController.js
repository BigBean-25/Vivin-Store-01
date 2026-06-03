const db = require("../config/db");
const { logProcurementAudit } = require("../utils/procurementAuditLogger");

const SETTLEMENT_TABLE = "vendor_settlements";
const VENDOR_TABLE = "vendors";
const PAYMENT_TABLE = "procurement_payments";
const LEDGER_TABLE = "vendor_ledgers";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const today = () => new Date().toISOString().slice(0, 10);

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const generateReferenceNo = () => {
  return `SETT-${Date.now().toString().slice(-8)}`;
};

const getColumns = async (connection, tableName) => {
  const [rows] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
  return rows.map((row) => row.Field);
};

const firstColumn = (columns, options) => {
  return options.find((column) => columns.includes(column)) || null;
};

const buildDynamicInsert = (columns, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  Object.entries(payload).forEach(([column, value]) => {
    if (!columns.includes(column)) return;

    fields.push(`\`${column}\``);
    placeholders.push("?");
    values.push(value);
  });

  return {
    fields,
    placeholders,
    values,
  };
};

const getVendorLatestLedgerBalance = async (connection, vendorId) => {
  try {
    const columns = await getColumns(connection, LEDGER_TABLE);

    const vendorIdCol = firstColumn(columns, ["vendor_id"]);
    const idCol = firstColumn(columns, ["id"]);
    const ledgerDateCol = firstColumn(columns, [
      "ledger_date",
      "entry_date",
      "transaction_date",
      "date",
    ]);
    const closingCol = firstColumn(columns, [
      "closing_balance",
      "balance",
      "current_balance",
      "running_balance",
    ]);

    if (!vendorIdCol || !idCol || !closingCol) return 0;

    const orderBy = ledgerDateCol
      ? `\`${ledgerDateCol}\` DESC, \`${idCol}\` DESC`
      : `\`${idCol}\` DESC`;

    const [[row]] = await connection.query(
      `
        SELECT \`${closingCol}\` AS closing_balance
        FROM ${LEDGER_TABLE}
        WHERE \`${vendorIdCol}\` = ?
        ORDER BY ${orderBy}
        LIMIT 1
      `,
      [vendorId]
    );

    return safeNumber(row?.closing_balance);
  } catch {
    return 0;
  }
};

const insertVendorLedgerCredit = async ({
  connection,
  vendorId,
  amount,
  settlementDate,
  referenceNo,
  remarks,
}) => {
  try {
    const columns = await getColumns(connection, LEDGER_TABLE);

    const latestBalance = await getVendorLatestLedgerBalance(connection, vendorId);
    const closingBalance = latestBalance - safeNumber(amount);

    const payload = {
      vendor_id: vendorId,
      entry_type: "payment",
      ledger_date: settlementDate,
      opening_balance: latestBalance,
      debit_amount: 0,
      credit_amount: safeNumber(amount),
      closing_balance: closingBalance,
      reference_no: referenceNo,
      description: remarks || `Vendor settlement payment - ${referenceNo}`,
      status: "active",
    };

    const insert = buildDynamicInsert(columns, payload);

    if (!insert.fields.length) return null;

    const [result] = await connection.query(
      `
        INSERT INTO ${LEDGER_TABLE}
          (${insert.fields.join(", ")})
        VALUES
          (${insert.placeholders.join(", ")})
      `,
      insert.values
    );

    return result.insertId;
  } catch (error) {
    console.error("Settlement ledger insert skipped:", error.message);
    return null;
  }
};

const insertProcurementPayment = async ({
  connection,
  vendorId,
  purchaseOrderId,
  settlementDate,
  amount,
  paymentMode,
  referenceNo,
  remarks,
  createdBy,
}) => {
  const columns = await getColumns(connection, PAYMENT_TABLE);

  const referenceColumn = columns.includes("reference_number")
    ? "reference_number"
    : columns.includes("reference_no")
    ? "reference_no"
    : null;

  const payload = {
    vendor_id: vendorId,
    purchase_order_id: cleanValue(purchaseOrderId),
    payment_date: settlementDate,
    amount: safeNumber(amount),
    payment_mode: cleanValue(paymentMode),
    status: "paid",
    remarks: cleanValue(remarks),
    created_by: cleanValue(createdBy),
  };

  if (referenceColumn) {
    payload[referenceColumn] = referenceNo;
  }

  const insert = buildDynamicInsert(columns, payload);

  if (!insert.fields.length) {
    throw new Error("procurement_payments table columns not matched");
  }

  const [result] = await connection.query(
    `
      INSERT INTO ${PAYMENT_TABLE}
        (${insert.fields.join(", ")})
      VALUES
        (${insert.placeholders.join(", ")})
    `,
    insert.values
  );

  return result.insertId;
};

const getVendorOutstandingQuery = () => `
  SELECT
    v.id AS vendor_id,
    v.business_name AS vendor_name,

    COALESCE(po.total_purchase_orders, 0) AS total_purchase_orders,
    COALESCE(po.total_purchase_value, 0) AS total_purchase_value,

    COALESCE(pay.paid_value, 0) AS paid_value,

    COALESCE(ret.return_value, 0) AS return_value,

    GREATEST(
      COALESCE(po.total_purchase_value, 0)
      - COALESCE(pay.paid_value, 0)
      - COALESCE(ret.return_value, 0),
      0
    ) AS outstanding_value,

    COALESCE(pay.last_payment_date, NULL) AS last_payment_date,
    COALESCE(po.next_due_date, NULL) AS next_due_date

  FROM vendors v

  LEFT JOIN (
    SELECT
      vendor_id,
      COUNT(*) AS total_purchase_orders,
      SUM(total_amount) AS total_purchase_value,
      MIN(expected_delivery_date) AS next_due_date
    FROM purchase_orders
    WHERE status != 'cancelled'
    GROUP BY vendor_id
  ) po ON v.id = po.vendor_id

  LEFT JOIN (
    SELECT
      vendor_id,
      SUM(amount) AS paid_value,
      MAX(payment_date) AS last_payment_date
    FROM procurement_payments
    WHERE status = 'paid'
    GROUP BY vendor_id
  ) pay ON v.id = pay.vendor_id

  LEFT JOIN (
    SELECT
      pr.vendor_id,
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
`;

exports.getVendorSettlementSummary = async (req, res) => {
  try {
    const [vendorRows] = await db.query(`
      ${getVendorOutstandingQuery()}
      WHERE COALESCE(po.total_purchase_orders, 0) > 0
         OR COALESCE(pay.paid_value, 0) > 0
         OR COALESCE(ret.return_value, 0) > 0
      ORDER BY outstanding_value DESC, v.business_name ASC
    `);

    const [monthRows] = await db.query(`
      SELECT
        COALESCE(SUM(amount), 0) AS paid_this_month,
        COUNT(*) AS settlements_this_month
      FROM ${SETTLEMENT_TABLE}
      WHERE status = 'completed'
        AND MONTH(settlement_date) = MONTH(CURDATE())
        AND YEAR(settlement_date) = YEAR(CURDATE())
    `);

    const summary = vendorRows.reduce(
      (acc, row) => {
        const outstanding = safeNumber(row.outstanding_value);

        acc.total_vendors += 1;
        acc.total_purchase_value += safeNumber(row.total_purchase_value);
        acc.paid_value += safeNumber(row.paid_value);
        acc.return_value += safeNumber(row.return_value);
        acc.total_outstanding += outstanding;

        if (outstanding > 0) acc.outstanding_vendors += 1;

        return acc;
      },
      {
        total_vendors: 0,
        outstanding_vendors: 0,
        total_purchase_value: 0,
        paid_value: 0,
        return_value: 0,
        total_outstanding: 0,
        paid_this_month: safeNumber(monthRows[0]?.paid_this_month),
        settlements_this_month: safeNumber(monthRows[0]?.settlements_this_month),
      }
    );

    res.json({
      success: true,
      summary,
      vendors: vendorRows,
      data: vendorRows,
    });
  } catch (error) {
    console.error("Vendor settlement summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load vendor settlement summary",
      error: error.message,
    });
  }
};

exports.getVendorSettlements = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      status = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const where = [];
    const values = [];

    if (vendor_id) {
      where.push("vs.vendor_id = ?");
      values.push(vendor_id);
    }

    if (status) {
      where.push("vs.status = ?");
      values.push(status);
    }

    if (from_date) {
      where.push("vs.settlement_date >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("vs.settlement_date <= ?");
      values.push(to_date);
    }

    if (search.trim()) {
      where.push(
        "(v.business_name LIKE ? OR vs.reference_no LIKE ? OR vs.remarks LIKE ?)"
      );
      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT
          vs.*,
          v.business_name AS vendor_name,
          po.po_number,
          pp.amount AS payment_amount,
          pp.status AS payment_status
        FROM ${SETTLEMENT_TABLE} vs
        LEFT JOIN ${VENDOR_TABLE} v ON vs.vendor_id = v.id
        LEFT JOIN purchase_orders po ON vs.purchase_order_id = po.id
        LEFT JOIN ${PAYMENT_TABLE} pp ON vs.payment_id = pp.id
        ${whereSql}
        ORDER BY vs.id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      settlements: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get vendor settlements error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor settlements",
      error: error.message,
    });
  }
};

exports.getVendorSettlementById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[settlement]] = await db.query(
      `
        SELECT
          vs.*,
          v.business_name AS vendor_name,
          po.po_number,
          pp.amount AS payment_amount,
          pp.status AS payment_status
        FROM ${SETTLEMENT_TABLE} vs
        LEFT JOIN ${VENDOR_TABLE} v ON vs.vendor_id = v.id
        LEFT JOIN purchase_orders po ON vs.purchase_order_id = po.id
        LEFT JOIN ${PAYMENT_TABLE} pp ON vs.payment_id = pp.id
        WHERE vs.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: "Vendor settlement not found",
      });
    }

    res.json({
      success: true,
      settlement,
    });
  } catch (error) {
    console.error("Get vendor settlement error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor settlement",
      error: error.message,
    });
  }
};

exports.createVendorSettlement = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      vendor_id,
      purchase_order_id = "",
      settlement_date = today(),
      amount,
      payment_mode = "bank_transfer",
      reference_no = "",
      remarks = "",
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (safeNumber(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Settlement amount must be greater than 0",
      });
    }

    const [[vendor]] = await connection.query(
      `
        SELECT id, business_name
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

    await connection.beginTransaction();

    const finalReferenceNo = reference_no || generateReferenceNo();
    const createdBy = req.user?.id || req.user?.user_id || null;

    const paymentId = await insertProcurementPayment({
      connection,
      vendorId: vendor_id,
      purchaseOrderId: purchase_order_id,
      settlementDate: settlement_date || today(),
      amount,
      paymentMode: payment_mode,
      referenceNo: finalReferenceNo,
      remarks: remarks || `Vendor settlement - ${vendor.business_name}`,
      createdBy,
    });

    const [settlementResult] = await connection.query(
      `
        INSERT INTO ${SETTLEMENT_TABLE}
          (
            vendor_id,
            purchase_order_id,
            payment_id,
            settlement_date,
            amount,
            payment_mode,
            reference_no,
            remarks,
            status,
            created_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `,
      [
        vendor_id,
        cleanValue(purchase_order_id),
        paymentId,
        settlement_date || today(),
        safeNumber(amount),
        cleanValue(payment_mode),
        finalReferenceNo,
        cleanValue(remarks),
        createdBy,
      ]
    );

    const ledgerId = await insertVendorLedgerCredit({
      connection,
      vendorId: vendor_id,
      amount,
      settlementDate: settlement_date || today(),
      referenceNo: finalReferenceNo,
      remarks: remarks || `Vendor settlement - ${vendor.business_name}`,
    });

    await connection.commit();

    await logProcurementAudit({
      req,
      moduleName: "vendor_settlement",
      recordId: settlementResult.insertId,
      referenceNumber: finalReferenceNo,
      actionType: "create",
      actionLabel: "Vendor settlement created",
      newValues: {
        vendor_id,
        vendor_name: vendor.business_name,
        payment_id: paymentId,
        ledger_id: ledgerId,
        amount: safeNumber(amount),
        payment_mode,
        settlement_date,
      },
      remarks: remarks || `Vendor settlement - ${vendor.business_name}`,
    });

    res.status(201).json({
      success: true,
      message: "Vendor settlement completed successfully",
      settlement: {
        id: settlementResult.insertId,
        vendor_id,
        vendor_name: vendor.business_name,
        payment_id: paymentId,
        ledger_id: ledgerId,
        amount: safeNumber(amount),
        reference_no: finalReferenceNo,
        status: "completed",
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create vendor settlement error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor settlement",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateVendorSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      settlement_date,
      amount,
      payment_mode,
      reference_no,
      remarks,
      status = "completed",
    } = req.body;

    const [[existing]] = await db.query(
      `
        SELECT *
        FROM ${SETTLEMENT_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor settlement not found",
      });
    }

    await db.query(
      `
        UPDATE ${SETTLEMENT_TABLE}
        SET
          settlement_date = ?,
          amount = ?,
          payment_mode = ?,
          reference_no = ?,
          remarks = ?,
          status = ?
        WHERE id = ?
      `,
      [
        settlement_date || existing.settlement_date,
        safeNumber(amount || existing.amount),
        cleanValue(payment_mode),
        cleanValue(reference_no),
        cleanValue(remarks),
        status,
        id,
      ]
    );

    await logProcurementAudit({
      req,
      moduleName: "vendor_settlement",
      recordId: id,
      referenceNumber: reference_no || existing.reference_no,
      actionType: "update",
      actionLabel: "Vendor settlement updated",
      oldValues: existing,
      newValues: req.body,
      remarks,
    });

    res.json({
      success: true,
      message: "Vendor settlement updated successfully",
    });
  } catch (error) {
    console.error("Update vendor settlement error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor settlement",
      error: error.message,
    });
  }
};

exports.deleteVendorSettlement = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [[settlement]] = await connection.query(
      `
        SELECT *
        FROM ${SETTLEMENT_TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!settlement) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Vendor settlement not found",
      });
    }

    await connection.query(
      `
        DELETE FROM ${SETTLEMENT_TABLE}
        WHERE id = ?
      `,
      [id]
    );

    if (settlement.payment_id) {
      await connection.query(
        `
          DELETE FROM ${PAYMENT_TABLE}
          WHERE id = ?
        `,
        [settlement.payment_id]
      );
    }

    try {
      const ledgerColumns = await getColumns(connection, LEDGER_TABLE);
      const vendorIdCol = firstColumn(ledgerColumns, ["vendor_id"]);
      const referenceCol = firstColumn(ledgerColumns, [
        "reference_no",
        "reference_number",
        "voucher_no",
      ]);

      if (vendorIdCol && referenceCol && settlement.reference_no) {
        await connection.query(
          `
            DELETE FROM ${LEDGER_TABLE}
            WHERE \`${vendorIdCol}\` = ?
              AND \`${referenceCol}\` = ?
          `,
          [settlement.vendor_id, settlement.reference_no]
        );
      }
    } catch (ledgerDeleteError) {
      console.error("Settlement ledger delete skipped:", ledgerDeleteError.message);
    }

    await connection.commit();

    await logProcurementAudit({
      req,
      moduleName: "vendor_settlement",
      recordId: id,
      referenceNumber: settlement.reference_no,
      actionType: "delete",
      actionLabel: "Vendor settlement deleted",
      oldValues: settlement,
      remarks: "Settlement deleted",
    });

    res.json({
      success: true,
      message: "Vendor settlement deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete vendor settlement error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor settlement",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
