const db = require("../config/db");

const CONVERSION_TABLE = "procurement_requisition_conversions";
const REQ_TABLE = "procurement_requisitions";
const REQ_ITEM_TABLE = "procurement_requisition_items";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const getColumns = async (tableName) => {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
    return rows.map((row) => row.Field);
  } catch {
    return [];
  }
};

const tableExists = async (tableName) => {
  try {
    const [rows] = await db.query(`SHOW TABLES LIKE ?`, [tableName]);
    return rows.length > 0;
  } catch {
    return false;
  }
};

const firstExistingTable = async (names) => {
  for (const name of names) {
    if (await tableExists(name)) return name;
  }

  return null;
};

const firstColumn = (columns, names) => {
  return names.find((name) => columns.includes(name)) || null;
};

const buildInsert = (columns, payload) => {
  const keys = Object.keys(payload).filter(
    (key) => columns.includes(key) && payload[key] !== undefined
  );

  if (!keys.length) {
    throw new Error("No matching columns found for insert");
  }

  return {
    sql: `(${keys.map((key) => `\`${key}\``).join(", ")}) VALUES (${keys
      .map(() => "?")
      .join(", ")})`,
    values: keys.map((key) => payload[key]),
  };
};

const generateNumber = async (connection, tableName, numberColumn, prefix) => {
  const [[row]] = await connection.query(
    `
      SELECT COUNT(*) + 1 AS next_number
      FROM ${tableName}
      WHERE \`${numberColumn}\` LIKE ?
    `,
    [`${prefix}%`]
  );

  return `${prefix}-${String(row?.next_number || 1).padStart(4, "0")}`;
};

const getRequisitionWithItems = async (connection, requisitionId) => {
  const [[requisition]] = await connection.query(
    `
      SELECT *
      FROM ${REQ_TABLE}
      WHERE id = ?
      LIMIT 1
    `,
    [requisitionId]
  );

  if (!requisition) {
    return {
      requisition: null,
      items: [],
    };
  }

  const [items] = await connection.query(
    `
      SELECT *
      FROM ${REQ_ITEM_TABLE}
      WHERE requisition_id = ?
      ORDER BY id ASC
    `,
    [requisitionId]
  );

  return {
    requisition,
    items,
  };
};

const getRfqMeta = async () => {
  const rfqTable = await firstExistingTable([
    "procurement_rfqs",
    "rfqs",
    "vendor_rfqs",
    "purchase_rfqs",
  ]);

  const rfqItemTable = await firstExistingTable([
    "procurement_rfq_items",
    "rfq_items",
    "vendor_rfq_items",
    "purchase_rfq_items",
  ]);

  if (!rfqTable || !rfqItemTable) {
    return null;
  }

  const rfqColumns = await getColumns(rfqTable);
  const itemColumns = await getColumns(rfqItemTable);

  return {
    rfqTable,
    rfqItemTable,
    rfqColumns,
    itemColumns,

    rfq: {
      number: firstColumn(rfqColumns, [
        "rfq_number",
        "reference_number",
        "rfq_no",
        "request_number",
      ]),
      title: firstColumn(rfqColumns, [
        "rfq_title",
        "title",
        "request_title",
        "subject",
      ]),
      date: firstColumn(rfqColumns, ["rfq_date", "request_date", "date"]),
      dueDate: firstColumn(rfqColumns, [
        "due_date",
        "required_date",
        "valid_until",
        "closing_date",
      ]),
      status: firstColumn(rfqColumns, ["status", "rfq_status"]),
      remarks: firstColumn(rfqColumns, ["remarks", "notes", "description"]),
      totalItems: firstColumn(rfqColumns, ["total_items", "items_count"]),
      estimatedTotal: firstColumn(rfqColumns, [
        "estimated_total",
        "total_amount",
        "estimated_value",
      ]),
      requisitionId: firstColumn(rfqColumns, [
        "requisition_id",
        "procurement_requisition_id",
      ]),
      createdBy: firstColumn(rfqColumns, ["created_by", "user_id"]),
    },

    item: {
      rfqId: firstColumn(itemColumns, ["rfq_id", "procurement_rfq_id"]),
      productId: firstColumn(itemColumns, [
        "product_id",
        "item_id",
        "raw_material_id",
      ]),
      productName: firstColumn(itemColumns, [
        "product_name",
        "item_name",
        "raw_material_name",
        "name",
      ]),
      quantity: firstColumn(itemColumns, [
        "quantity",
        "required_qty",
        "requested_qty",
        "qty",
      ]),
      unitName: firstColumn(itemColumns, ["unit_name", "unit"]),
      unitPrice: firstColumn(itemColumns, [
        "estimated_unit_price",
        "unit_price",
        "price",
        "rate",
      ]),
      totalPrice: firstColumn(itemColumns, [
        "estimated_value",
        "total_price",
        "amount",
        "line_total",
      ]),
      remarks: firstColumn(itemColumns, ["remarks", "notes"]),
    },
  };
};

const getPoMeta = async () => {
  const poColumns = await getColumns("purchase_orders");
  const itemColumns = await getColumns("purchase_order_items");

  return {
    poColumns,
    itemColumns,

    po: {
      number: firstColumn(poColumns, [
        "po_number",
        "purchase_order_number",
        "reference_number",
      ]),
      vendorId: firstColumn(poColumns, ["vendor_id"]),
      vendorName: firstColumn(poColumns, ["vendor_name"]),
      date: firstColumn(poColumns, ["po_date", "order_date", "date"]),
      expectedDate: firstColumn(poColumns, [
        "expected_delivery_date",
        "delivery_date",
        "required_date",
      ]),
      totalAmount: firstColumn(poColumns, [
        "total_amount",
        "grand_total",
        "net_amount",
      ]),
      status: firstColumn(poColumns, ["status", "po_status"]),
      remarks: firstColumn(poColumns, ["remarks", "notes"]),
      requisitionId: firstColumn(poColumns, [
        "requisition_id",
        "procurement_requisition_id",
      ]),
      createdBy: firstColumn(poColumns, ["created_by", "user_id"]),
    },

    item: {
      poId: firstColumn(itemColumns, ["purchase_order_id", "po_id"]),
      productId: firstColumn(itemColumns, [
        "product_id",
        "item_id",
        "raw_material_id",
      ]),
      productName: firstColumn(itemColumns, [
        "product_name",
        "item_name",
        "raw_material_name",
      ]),
      quantity: firstColumn(itemColumns, [
        "quantity",
        "ordered_qty",
        "order_qty",
        "qty",
      ]),
      unitName: firstColumn(itemColumns, ["unit_name", "unit"]),
      unitPrice: firstColumn(itemColumns, [
        "unit_price",
        "price",
        "rate",
        "purchase_price",
      ]),
      totalPrice: firstColumn(itemColumns, [
        "total_price",
        "amount",
        "line_total",
      ]),
      remarks: firstColumn(itemColumns, ["remarks", "notes"]),
    },
  };
};

exports.getRequisitionConversionSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
        SELECT
          COUNT(*) AS total_conversions,
          SUM(CASE WHEN conversion_type = 'rfq' THEN 1 ELSE 0 END) AS rfq_count,
          SUM(CASE WHEN conversion_type = 'po' THEN 1 ELSE 0 END) AS po_count
        FROM ${CONVERSION_TABLE}
      `
    );

    const [recent] = await db.query(
      `
        SELECT
          c.*,
          r.requisition_number,
          r.request_title
        FROM ${CONVERSION_TABLE} c
        LEFT JOIN ${REQ_TABLE} r
          ON c.requisition_id = r.id
        ORDER BY c.id DESC
        LIMIT 10
      `
    );

    res.json({
      success: true,
      summary: {
        total_conversions: safeNumber(summary?.total_conversions),
        rfq_count: safeNumber(summary?.rfq_count),
        po_count: safeNumber(summary?.po_count),
      },
      recent,
    });
  } catch (error) {
    console.error("Requisition conversion summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load requisition conversion summary",
      error: error.message,
    });
  }
};

exports.getRequisitionConversionHistory = async (req, res) => {
  try {
    const { requisition_id = "", conversion_type = "" } = req.query;

    const where = [];
    const values = [];

    if (requisition_id) {
      where.push("c.requisition_id = ?");
      values.push(requisition_id);
    }

    if (conversion_type) {
      where.push("c.conversion_type = ?");
      values.push(conversion_type);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT
          c.*,
          r.requisition_number,
          r.request_title,
          r.estimated_total
        FROM ${CONVERSION_TABLE} c
        LEFT JOIN ${REQ_TABLE} r
          ON c.requisition_id = r.id
        ${whereSql}
        ORDER BY c.id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      conversions: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Requisition conversion history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition conversion history",
      error: error.message,
    });
  }
};

exports.previewRequisitionConversion = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { requisition_id } = req.query;

    if (!requisition_id) {
      return res.status(400).json({
        success: false,
        message: "Requisition ID is required",
      });
    }

    const { requisition, items } = await getRequisitionWithItems(
      connection,
      requisition_id
    );

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: "Procurement requisition not found",
      });
    }

    const vendorGroups = items.reduce((acc, item) => {
      const vendorId = item.preferred_vendor_id || "vendor_missing";

      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendor_id: item.preferred_vendor_id,
          vendor_name: item.preferred_vendor_name || "Vendor Missing",
          total_items: 0,
          estimated_total: 0,
          items: [],
          can_create_po: Boolean(item.preferred_vendor_id),
        };
      }

      acc[vendorId].total_items += 1;
      acc[vendorId].estimated_total += safeNumber(item.estimated_value);
      acc[vendorId].items.push(item);

      return acc;
    }, {});

    const vendors = Object.values(vendorGroups).map((vendor) => ({
      ...vendor,
      estimated_total: Number(vendor.estimated_total.toFixed(2)),
    }));

    res.json({
      success: true,
      requisition,
      items,
      summary: {
        total_items: items.length,
        estimated_total: safeNumber(requisition.estimated_total),
        vendor_groups: vendors.length,
        po_ready_vendors: vendors.filter((vendor) => vendor.can_create_po).length,
        vendor_missing_items: items.filter((item) => !item.preferred_vendor_id)
          .length,
      },
      vendors,
    });
  } catch (error) {
    console.error("Preview requisition conversion error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to preview requisition conversion",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.convertRequisitionToRfq = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const {
      rfq_title = "",
      due_date = "",
      status = "draft",
      remarks = "",
    } = req.body;

    const { requisition, items } = await getRequisitionWithItems(connection, id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: "Procurement requisition not found",
      });
    }

    if (requisition.approval_status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved requisition can be converted to RFQ",
      });
    }

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No requisition items found",
      });
    }

    const meta = await getRfqMeta();

    if (!meta || !meta.rfq.number || !meta.item.rfqId || !meta.item.quantity) {
      return res.status(400).json({
        success: false,
        message:
          "RFQ table schema not matched. Check procurement_rfqs / procurement_rfq_items table columns.",
      });
    }

    await connection.beginTransaction();

    const rfqPrefix = `RFQ-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

    const rfqNumber = await generateNumber(
      connection,
      meta.rfqTable,
      meta.rfq.number,
      rfqPrefix
    );

    const rfqPayload = {
      [meta.rfq.number]: rfqNumber,
      [meta.rfq.title]:
        rfq_title || `RFQ from ${requisition.requisition_number}`,
      [meta.rfq.date]: todayDate(),
      [meta.rfq.dueDate]: due_date || requisition.required_date || null,
      [meta.rfq.status]: status || "draft",
      [meta.rfq.remarks]:
        remarks || `Converted from requisition ${requisition.requisition_number}`,
      [meta.rfq.totalItems]: items.length,
      [meta.rfq.estimatedTotal]: safeNumber(requisition.estimated_total),
      [meta.rfq.requisitionId]: id,
      [meta.rfq.createdBy]: getUserId(req),
    };

    const rfqInsert = buildInsert(meta.rfqColumns, rfqPayload);

    const [rfqResult] = await connection.query(
      `
        INSERT INTO ${meta.rfqTable} ${rfqInsert.sql}
      `,
      rfqInsert.values
    );

    const rfqId = rfqResult.insertId;

    for (const item of items) {
      const qty = safeNumber(item.required_qty);
      const rate = safeNumber(item.estimated_unit_price);
      const value = qty * rate;

      const itemPayload = {
        [meta.item.rfqId]: rfqId,
        [meta.item.productId]: item.product_id,
        [meta.item.productName]: item.product_name,
        [meta.item.quantity]: qty,
        [meta.item.unitName]: item.unit_name,
        [meta.item.unitPrice]: rate,
        [meta.item.totalPrice]: Number(value.toFixed(2)),
        [meta.item.remarks]: item.remarks,
      };

      const itemInsert = buildInsert(meta.itemColumns, itemPayload);

      await connection.query(
        `
          INSERT INTO ${meta.rfqItemTable} ${itemInsert.sql}
        `,
        itemInsert.values
      );
    }

    await connection.query(
      `
        INSERT INTO ${CONVERSION_TABLE}
          (
            requisition_id,
            conversion_type,
            rfq_id,
            converted_by,
            remarks
          )
        VALUES (?, 'rfq', ?, ?, ?)
      `,
      [
        id,
        rfqId,
        getUserId(req),
        remarks || `Converted to RFQ ${rfqNumber}`,
      ]
    );

    await connection.query(
      `
        UPDATE ${REQ_TABLE}
        SET status = 'converted'
        WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Requisition converted to RFQ successfully",
      rfq_id: rfqId,
      rfq_number: rfqNumber,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Convert requisition to RFQ error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to convert requisition to RFQ",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.convertRequisitionToPo = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const {
      vendor_id = "",
      vendor_name = "",
      expected_delivery_date = "",
      status = "draft",
      remarks = "",
    } = req.body;

    const { requisition, items } = await getRequisitionWithItems(connection, id);

    if (!requisition) {
      return res.status(404).json({
        success: false,
        message: "Procurement requisition not found",
      });
    }

    if (requisition.approval_status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved requisition can be converted to PO",
      });
    }

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No requisition items found",
      });
    }

    const meta = await getPoMeta();

    if (!meta.po.number || !meta.po.vendorId || !meta.item.poId || !meta.item.quantity) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase Order schema not matched. Check purchase_orders / purchase_order_items table columns.",
      });
    }

    const grouped = items.reduce((acc, item) => {
      const finalVendorId = vendor_id || item.preferred_vendor_id;

      if (!finalVendorId) {
        if (!acc.vendor_missing) {
          acc.vendor_missing = {
            vendor_id: null,
            vendor_name: "Vendor Missing",
            items: [],
            total_amount: 0,
          };
        }

        acc.vendor_missing.items.push(item);
        return acc;
      }

      const key = String(finalVendorId);

      if (!acc[key]) {
        acc[key] = {
          vendor_id: finalVendorId,
          vendor_name: vendor_name || item.preferred_vendor_name || null,
          items: [],
          total_amount: 0,
        };
      }

      acc[key].items.push(item);
      acc[key].total_amount += safeNumber(item.estimated_value);

      return acc;
    }, {});

    const vendorGroups = Object.values(grouped).filter(
      (group) => group.vendor_id
    );

    const skippedItems = Object.values(grouped)
      .filter((group) => !group.vendor_id)
      .flatMap((group) =>
        group.items.map((item) => ({
          item_id: item.id,
          product_name: item.product_name,
          reason: "Vendor missing",
        }))
      );

    if (!vendorGroups.length) {
      return res.status(400).json({
        success: false,
        message: "No vendor found for PO creation",
        skipped_items: skippedItems,
      });
    }

    await connection.beginTransaction();

    const createdOrders = [];

    for (const group of vendorGroups) {
      const poPrefix = `PO-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, "0")}`;

      const poNumber = await generateNumber(
        connection,
        "purchase_orders",
        meta.po.number,
        poPrefix
      );

      const totalAmount = group.items.reduce(
        (sum, item) => sum + safeNumber(item.estimated_value),
        0
      );

      const poPayload = {
        [meta.po.number]: poNumber,
        [meta.po.vendorId]: group.vendor_id,
        [meta.po.vendorName]: group.vendor_name,
        [meta.po.date]: todayDate(),
        [meta.po.expectedDate]:
          expected_delivery_date || requisition.required_date || null,
        [meta.po.totalAmount]: Number(totalAmount.toFixed(2)),
        [meta.po.status]: status || "draft",
        [meta.po.remarks]:
          remarks || `Converted from requisition ${requisition.requisition_number}`,
        [meta.po.requisitionId]: id,
        [meta.po.createdBy]: getUserId(req),
      };

      const poInsert = buildInsert(meta.poColumns, poPayload);

      const [poResult] = await connection.query(
        `
          INSERT INTO purchase_orders ${poInsert.sql}
        `,
        poInsert.values
      );

      const poId = poResult.insertId;

      for (const item of group.items) {
        const qty = safeNumber(item.required_qty);
        const rate = safeNumber(item.estimated_unit_price);
        const value = qty * rate;

        const itemPayload = {
          [meta.item.poId]: poId,
          [meta.item.productId]: item.product_id,
          [meta.item.productName]: item.product_name,
          [meta.item.quantity]: qty,
          [meta.item.unitName]: item.unit_name,
          [meta.item.unitPrice]: rate,
          [meta.item.totalPrice]: Number(value.toFixed(2)),
          [meta.item.remarks]: item.remarks,
        };

        const itemInsert = buildInsert(meta.itemColumns, itemPayload);

        await connection.query(
          `
            INSERT INTO purchase_order_items ${itemInsert.sql}
          `,
          itemInsert.values
        );
      }

      await connection.query(
        `
          INSERT INTO ${CONVERSION_TABLE}
            (
              requisition_id,
              conversion_type,
              purchase_order_id,
              vendor_id,
              vendor_name,
              converted_by,
              remarks
            )
          VALUES (?, 'po', ?, ?, ?, ?, ?)
        `,
        [
          id,
          poId,
          group.vendor_id,
          group.vendor_name,
          getUserId(req),
          remarks || `Converted to PO ${poNumber}`,
        ]
      );

      createdOrders.push({
        purchase_order_id: poId,
        po_number: poNumber,
        vendor_id: group.vendor_id,
        vendor_name: group.vendor_name,
        total_items: group.items.length,
        total_amount: Number(totalAmount.toFixed(2)),
      });
    }

    await connection.query(
      `
        UPDATE ${REQ_TABLE}
        SET status = 'converted'
        WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Requisition converted to purchase order successfully",
      created_count: createdOrders.length,
      skipped_count: skippedItems.length,
      purchase_orders: createdOrders,
      skipped_items: skippedItems,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Convert requisition to PO error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to convert requisition to PO",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
