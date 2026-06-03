const db = require("../config/db");

const generateQuotationNumber = () => `QT-${Date.now().toString().slice(-8)}`;
const generatePoNumber = () => `PO-${Date.now().toString().slice(-8)}`;

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
};

const calculateItems = (items = []) => {
  let subtotal = 0;
  let taxAmount = 0;

  const calculatedItems = items.map((item) => {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price);
    const taxRate = toNumber(item.tax_rate);
    const lineSubtotal = quantity * unitPrice;
    const lineTax = (lineSubtotal * taxRate) / 100;
    const totalAmount = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    taxAmount += lineTax;

    return {
      product_id: Number(item.product_id),
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      total_amount: totalAmount,
    };
  });

  return {
    items: calculatedItems,
    subtotal,
    tax_amount: taxAmount,
    total_amount: subtotal + taxAmount,
  };
};

const buildWhereClause = (filters = {}) => {
  const conditions = [];
  const values = [];

  if (filters.search) {
    conditions.push("(q.quotation_number LIKE ? OR q.remarks LIKE ? OR v.business_name LIKE ? OR r.rfq_number LIKE ?)");
    const search = `%${filters.search}%`;
    values.push(search, search, search, search);
  }

  if (filters.status) {
    conditions.push("q.status = ?");
    values.push(filters.status);
  }

  if (filters.vendor_id) {
    conditions.push("q.vendor_id = ?");
    values.push(filters.vendor_id);
  }

  if (filters.rfq_id) {
    conditions.push("q.rfq_id = ?");
    values.push(filters.rfq_id);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

exports.getQuotations = async (req, res) => {
  try {
    const { search = "", status = "", vendor_id = "", rfq_id = "" } = req.query;
    const { whereSql, values } = buildWhereClause({ search: search.trim(), status, vendor_id, rfq_id });

    const [quotations] = await db.query(
      `
        SELECT
          q.id,
          q.quotation_number,
          q.rfq_id,
          r.rfq_number,
          q.vendor_id,
          v.business_name AS vendor_name,
          q.quotation_date,
          q.valid_until,
          q.subtotal,
          q.tax_amount,
          q.total_amount,
          q.status,
          q.remarks,
          q.created_at,
          po.id AS purchase_order_id,
          po.po_number,
          COUNT(qi.id) AS item_count
        FROM quotations q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        LEFT JOIN rfqs r ON q.rfq_id = r.id
        LEFT JOIN purchase_orders po ON q.id = po.quotation_id
        LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
        ${whereSql}
        GROUP BY q.id
        ORDER BY q.id DESC
      `,
      values
    );

    res.json({ success: true, count: quotations.length, quotations, data: quotations });
  } catch (error) {
    console.error("Get quotations error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch quotations", error: error.message });
  }
};

exports.getQuotationSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_quotations,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_count
      FROM quotations
    `);

    res.json({ success: true, summary: rows[0] || {} });
  } catch (error) {
    console.error("Get quotation summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch quotation summary", error: error.message });
  }
};

exports.getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;

    const [quotations] = await db.query(
      `
        SELECT q.*, v.business_name AS vendor_name, r.rfq_number
        FROM quotations q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        LEFT JOIN rfqs r ON q.rfq_id = r.id
        WHERE q.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (quotations.length === 0) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    const [items] = await db.query(
      `
        SELECT qi.*, p.name AS product_name, p.product_code, p.sku
        FROM quotation_items qi
        LEFT JOIN products p ON qi.product_id = p.id
        WHERE qi.quotation_id = ?
        ORDER BY qi.id ASC
      `,
      [id]
    );

    res.json({ success: true, quotation: { ...quotations[0], items }, data: { ...quotations[0], items } });
  } catch (error) {
    console.error("Get quotation by id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch quotation", error: error.message });
  }
};

exports.createQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { rfq_id, vendor_id, quotation_date, valid_until, status = "pending", remarks, items = [] } = req.body;

    if (!vendor_id) return res.status(400).json({ success: false, message: "Vendor is required" });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: "At least one quotation item is required" });

    const calculated = calculateItems(items);

    for (const item of calculated.items) {
      if (!item.product_id) throw new Error("Product is required in quotation item");
      if (item.quantity <= 0) throw new Error("Quantity must be greater than 0 in quotation item");
      if (item.unit_price < 0) throw new Error("Unit price cannot be negative");
    }

    await connection.beginTransaction();

    const quotationNumber = generateQuotationNumber();

    const [result] = await connection.query(
      `
        INSERT INTO quotations (quotation_number, rfq_id, vendor_id, quotation_date, valid_until, subtotal, tax_amount, total_amount, status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        quotationNumber,
        cleanValue(rfq_id),
        vendor_id,
        cleanValue(quotation_date),
        cleanValue(valid_until),
        calculated.subtotal,
        calculated.tax_amount,
        calculated.total_amount,
        cleanValue(status) || "pending",
        cleanValue(remarks),
      ]
    );

    for (const item of calculated.items) {
      await connection.query(
        `
          INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, tax_rate, total_amount)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [result.insertId, item.product_id, item.quantity, item.unit_price, item.tax_rate, item.total_amount]
      );
    }

    if (rfq_id) {
      await connection.query("UPDATE rfqs SET status = 'quoted' WHERE id = ?", [rfq_id]);
    }

    await connection.commit();

    res.status(201).json({ success: true, message: "Quotation created successfully", quotation: { id: result.insertId, quotation_number: quotationNumber } });
  } catch (error) {
    await connection.rollback();
    console.error("Create quotation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create quotation" });
  } finally {
    connection.release();
  }
};

exports.updateQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { rfq_id, vendor_id, quotation_date, valid_until, status, remarks, items = [] } = req.body;

    await connection.beginTransaction();

    const [existingRows] = await connection.query("SELECT * FROM quotations WHERE id = ? LIMIT 1", [id]);
    if (existingRows.length === 0) throw new Error("Quotation not found");
    if (["accepted", "rejected", "expired"].includes(existingRows[0].status)) throw new Error("Finalized quotation cannot be edited");

    const calculated = Array.isArray(items) && items.length > 0 ? calculateItems(items) : null;

    await connection.query(
      `
        UPDATE quotations
        SET rfq_id = ?, vendor_id = ?, quotation_date = ?, valid_until = ?, subtotal = ?, tax_amount = ?, total_amount = ?, status = ?, remarks = ?
        WHERE id = ?
      `,
      [
        rfq_id === undefined ? existingRows[0].rfq_id : cleanValue(rfq_id),
        vendor_id || existingRows[0].vendor_id,
        quotation_date === undefined ? existingRows[0].quotation_date : cleanValue(quotation_date),
        valid_until === undefined ? existingRows[0].valid_until : cleanValue(valid_until),
        calculated ? calculated.subtotal : existingRows[0].subtotal,
        calculated ? calculated.tax_amount : existingRows[0].tax_amount,
        calculated ? calculated.total_amount : existingRows[0].total_amount,
        status || existingRows[0].status,
        remarks === undefined ? existingRows[0].remarks : cleanValue(remarks),
        id,
      ]
    );

    if (calculated) {
      await connection.query("DELETE FROM quotation_items WHERE quotation_id = ?", [id]);
      for (const item of calculated.items) {
        if (!item.product_id) throw new Error("Product is required in quotation item");
        if (item.quantity <= 0) throw new Error("Quantity must be greater than 0 in quotation item");

        await connection.query(
          `
            INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, tax_rate, total_amount)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [id, item.product_id, item.quantity, item.unit_price, item.tax_rate, item.total_amount]
        );
      }
    }

    await connection.commit();

    res.json({ success: true, message: "Quotation updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Update quotation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update quotation" });
  } finally {
    connection.release();
  }
};

exports.updateQuotationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["pending", "accepted", "rejected", "expired"];

    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid quotation status" });

    const [result] = await db.query("UPDATE quotations SET status = ? WHERE id = ?", [status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Quotation not found" });

    res.json({ success: true, message: "Quotation status updated successfully" });
  } catch (error) {
    console.error("Update quotation status error:", error);
    res.status(500).json({ success: false, message: "Failed to update quotation status", error: error.message });
  }
};

exports.deleteQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [rows] = await connection.query("SELECT status FROM quotations WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) throw new Error("Quotation not found");
    if (rows[0].status === "accepted") throw new Error("Accepted quotation cannot be deleted");

    await connection.query("DELETE FROM quotation_items WHERE quotation_id = ?", [id]);
    await connection.query("DELETE FROM quotations WHERE id = ?", [id]);

    await connection.commit();

    res.json({ success: true, message: "Quotation deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Delete quotation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete quotation" });
  } finally {
    connection.release();
  }
};

exports.createPurchaseOrderFromQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const {
      warehouse_id,
      po_date,
      expected_delivery_date,
      status = "approved",
      remarks,
    } = req.body;

    await connection.beginTransaction();

    const [existingPO] = await connection.query(
      `
        SELECT id, po_number
        FROM purchase_orders
        WHERE quotation_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (existingPO.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Purchase order already created for this quotation",
        purchaseOrder: existingPO[0],
      });
    }

    const [quotations] = await connection.query(
      `
        SELECT
          q.id,
          q.quotation_number,
          q.rfq_id,
          q.vendor_id,
          q.subtotal,
          q.tax_amount,
          q.total_amount,
          q.status,
          q.remarks,
          v.business_name AS vendor_name
        FROM quotations q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        WHERE q.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (quotations.length === 0) {
      throw new Error("Quotation not found");
    }

    const quotation = quotations[0];

    if (quotation.status === "rejected" || quotation.status === "expired") {
      throw new Error("Rejected or expired quotation cannot be converted to PO");
    }

    const [quotationItems] = await connection.query(
      `
        SELECT quotation_id, product_id, quantity, unit_price, tax_rate, total_amount
        FROM quotation_items
        WHERE quotation_id = ?
        ORDER BY id ASC
      `,
      [id]
    );

    if (quotationItems.length === 0) {
      throw new Error("Quotation items not found");
    }

    const poNumber = generatePoNumber();
    const finalPoDate = po_date || new Date().toISOString().slice(0, 10);
    const createdBy = req.user?.id || req.user?.user_id || null;
    const approvedBy = status === "approved" || status === "sent" ? createdBy : null;

    const [poResult] = await connection.query(
      `
        INSERT INTO purchase_orders
          (po_number, vendor_id, quotation_id, warehouse_id, po_date, expected_delivery_date, subtotal, tax_amount, total_amount, status, remarks, created_by, approved_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        poNumber,
        quotation.vendor_id,
        quotation.id,
        warehouse_id || null,
        finalPoDate,
        expected_delivery_date || null,
        quotation.subtotal || 0,
        quotation.tax_amount || 0,
        quotation.total_amount || 0,
        status || "approved",
        remarks || `PO created from quotation ${quotation.quotation_number || quotation.id}`,
        createdBy,
        approvedBy,
      ]
    );

    const purchaseOrderId = poResult.insertId;

    for (const item of quotationItems) {
      await connection.query(
        `
          INSERT INTO purchase_order_items
            (purchase_order_id, product_id, quantity, received_quantity, unit_price, tax_rate, total_amount)
          VALUES (?, ?, ?, 0, ?, ?, ?)
        `,
        [
          purchaseOrderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.tax_rate || 0,
          item.total_amount || 0,
        ]
      );
    }

    await connection.query("UPDATE quotations SET status = 'accepted' WHERE id = ?", [id]);

    if (quotation.rfq_id) {
      await connection.query(
        `
          UPDATE quotations
          SET status = 'rejected'
          WHERE rfq_id = ?
            AND id != ?
            AND status = 'pending'
        `,
        [quotation.rfq_id, id]
      );

      await connection.query("UPDATE rfqs SET status = 'closed' WHERE id = ?", [quotation.rfq_id]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Purchase order created from quotation successfully",
      purchaseOrder: {
        id: purchaseOrderId,
        po_number: poNumber,
        quotation_id: quotation.id,
        vendor_id: quotation.vendor_id,
        vendor_name: quotation.vendor_name,
        total_amount: quotation.total_amount,
        status: status || "approved",
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create PO from quotation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create purchase order from quotation",
    });
  } finally {
    connection.release();
  }
};

exports.getRfqQuotationComparison = async (req, res) => {
  try {
    const { rfq_id } = req.params;

    const [rfqRows] = await db.query(
      `
        SELECT
          id,
          rfq_number,
          title,
          required_date,
          status,
          remarks
        FROM rfqs
        WHERE id = ?
        LIMIT 1
      `,
      [rfq_id]
    );

    if (rfqRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    const [quotationRows] = await db.query(
      `
        SELECT
          q.id,
          q.quotation_number,
          q.vendor_id,
          v.business_name AS vendor_name,
          q.quotation_date,
          q.valid_until,
          q.subtotal,
          q.tax_amount,
          q.total_amount,
          q.status,
          q.remarks,
          MAX(po.id) AS purchase_order_id,
          MAX(po.po_number) AS po_number
        FROM quotations q
        LEFT JOIN vendors v ON q.vendor_id = v.id
        LEFT JOIN purchase_orders po ON q.id = po.quotation_id
        WHERE q.rfq_id = ?
        GROUP BY q.id
        ORDER BY q.total_amount ASC
      `,
      [rfq_id]
    );

    const [rfqItems] = await db.query(
      `
        SELECT
          ri.id AS rfq_item_id,
          ri.product_id,
          p.name AS product_name,
          p.product_code,
          p.sku,
          ri.quantity AS requested_quantity,
          ri.unit_id,
          u.name AS unit_name,
          u.short_name AS unit_short_name,
          ri.remarks
        FROM rfq_items ri
        LEFT JOIN products p ON ri.product_id = p.id
        LEFT JOIN units u ON ri.unit_id = u.id
        WHERE ri.rfq_id = ?
        ORDER BY ri.id ASC
      `,
      [rfq_id]
    );

    const [quotationItems] = await db.query(
      `
        SELECT
          qi.id,
          qi.quotation_id,
          q.quotation_number,
          q.vendor_id,
          v.business_name AS vendor_name,
          qi.product_id,
          qi.quantity,
          qi.unit_price,
          qi.tax_rate,
          qi.total_amount,
          q.status AS quotation_status
        FROM quotation_items qi
        INNER JOIN quotations q ON qi.quotation_id = q.id
        LEFT JOIN vendors v ON q.vendor_id = v.id
        WHERE q.rfq_id = ?
        ORDER BY qi.product_id ASC, qi.unit_price ASC
      `,
      [rfq_id]
    );

    const comparisonItems = rfqItems.map((rfqItem) => {
      const vendorQuotes = quotationItems
        .filter(
          (quotationItem) =>
            String(quotationItem.product_id) === String(rfqItem.product_id)
        )
        .map((quotationItem) => ({
          quotation_id: quotationItem.quotation_id,
          quotation_number: quotationItem.quotation_number,
          vendor_id: quotationItem.vendor_id,
          vendor_name: quotationItem.vendor_name,
          quantity: quotationItem.quantity,
          unit_price: quotationItem.unit_price,
          tax_rate: quotationItem.tax_rate,
          total_amount: quotationItem.total_amount,
          quotation_status: quotationItem.quotation_status,
        }));

      const bestQuote =
        vendorQuotes.length > 0
          ? vendorQuotes.reduce((best, current) => {
              return Number(current.total_amount || 0) <
                Number(best.total_amount || 0)
                ? current
                : best;
            })
          : null;

      return {
        product_id: rfqItem.product_id,
        product_name: rfqItem.product_name,
        product_code: rfqItem.product_code,
        sku: rfqItem.sku,
        requested_quantity: rfqItem.requested_quantity,
        unit_id: rfqItem.unit_id,
        unit_name: rfqItem.unit_name,
        unit_short_name: rfqItem.unit_short_name,
        remarks: rfqItem.remarks,
        best_quote: bestQuote,
        vendor_quotes: vendorQuotes,
      };
    });

    const bestOverallQuotation =
      quotationRows.length > 0
        ? quotationRows.reduce((best, current) => {
            return Number(current.total_amount || 0) <
              Number(best.total_amount || 0)
              ? current
              : best;
          })
        : null;

    res.json({
      success: true,
      rfq: rfqRows[0],
      quotations: quotationRows,
      comparison_items: comparisonItems,
      best_overall_quotation: bestOverallQuotation,
      summary: {
        total_quotations: quotationRows.length,
        total_items: rfqItems.length,
        lowest_quotation_value: bestOverallQuotation?.total_amount || 0,
        lowest_vendor_name: bestOverallQuotation?.vendor_name || null,
      },
    });
  } catch (error) {
    console.error("RFQ quotation comparison error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RFQ quotation comparison",
      error: error.message,
    });
  }
};
