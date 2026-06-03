const db = require("../config/db");

const LINK_TABLE = "procurement_reorder_po_links";

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

const generatePoNumber = async (connection) => {
  const prefix = `PO-${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const [[row]] = await connection.query(
    `
      SELECT COUNT(*) + 1 AS next_number
      FROM purchase_orders
      WHERE po_number LIKE ?
    `,
    [`${prefix}%`]
  );

  return `${prefix}-${String(row?.next_number || 1).padStart(4, "0")}`;
};

const getPurchaseOrderMeta = async () => {
  const poColumns = await getColumns("purchase_orders");
  const itemColumns = await getColumns("purchase_order_items");

  return {
    poColumns,
    itemColumns,

    po: {
      poNumber: firstColumn(poColumns, ["po_number", "purchase_order_number", "reference_number"]),
      vendorId: firstColumn(poColumns, ["vendor_id"]),
      poDate: firstColumn(poColumns, ["po_date", "order_date", "date"]),
      expectedDate: firstColumn(poColumns, ["expected_delivery_date", "delivery_date"]),
      totalAmount: firstColumn(poColumns, ["total_amount", "grand_total", "net_amount"]),
      status: firstColumn(poColumns, ["status"]),
      remarks: firstColumn(poColumns, ["remarks", "notes"]),
      createdBy: firstColumn(poColumns, ["created_by", "user_id"]),
    },

    item: {
      purchaseOrderId: firstColumn(itemColumns, ["purchase_order_id", "po_id"]),
      productId: firstColumn(itemColumns, ["product_id", "item_id", "raw_material_id"]),
      quantity: firstColumn(itemColumns, ["quantity", "ordered_qty", "order_qty", "qty"]),
      unitPrice: firstColumn(itemColumns, ["unit_price", "price", "rate", "purchase_price"]),
      totalPrice: firstColumn(itemColumns, ["total_price", "amount", "line_total"]),
      remarks: firstColumn(itemColumns, ["remarks", "notes"]),
    },
  };
};

const getReorderPlanWithItems = async (planId) => {
  const [[plan]] = await db.query(
    `
      SELECT *
      FROM procurement_reorder_plans
      WHERE id = ?
      LIMIT 1
    `,
    [planId]
  );

  if (!plan) return { plan: null, items: [] };

  const [items] = await db.query(
    `
      SELECT *
      FROM procurement_reorder_plan_items
      WHERE plan_id = ?
        AND required_qty > 0
      ORDER BY vendor_id ASC, estimated_value DESC
    `,
    [planId]
  );

  return { plan, items };
};

const groupItemsByVendor = (items) => {
  return items.reduce((acc, item) => {
    const vendorId = item.vendor_id || "no_vendor";

    if (!acc[vendorId]) {
      acc[vendorId] = {
        vendor_id: item.vendor_id,
        vendor_name: item.vendor_name || "-",
        items: [],
        total_amount: 0,
      };
    }

    acc[vendorId].items.push(item);
    acc[vendorId].total_amount += safeNumber(item.estimated_value);

    return acc;
  }, {});
};

exports.previewAutoPurchaseOrders = async (req, res) => {
  try {
    const { reorder_plan_id } = req.query;

    if (!reorder_plan_id) {
      return res.status(400).json({
        success: false,
        message: "Reorder plan ID is required",
      });
    }

    const { plan, items } = await getReorderPlanWithItems(reorder_plan_id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Reorder plan not found",
      });
    }

    const grouped = groupItemsByVendor(items);

    const vendors = Object.values(grouped).map((vendor) => ({
      vendor_id: vendor.vendor_id,
      vendor_name: vendor.vendor_name,
      total_items: vendor.items.length,
      total_amount: Number(vendor.total_amount.toFixed(2)),
      items: vendor.items,
      can_create_po: Boolean(vendor.vendor_id),
    }));

    res.json({
      success: true,
      plan,
      summary: {
        total_vendors: vendors.length,
        total_items: items.length,
        total_po_value: Number(
          vendors.reduce((sum, vendor) => sum + safeNumber(vendor.total_amount), 0).toFixed(2)
        ),
        vendor_missing_items: items.filter((item) => !item.vendor_id).length,
      },
      vendors,
      data: vendors,
    });
  } catch (error) {
    console.error("Preview auto PO error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to preview auto purchase orders",
      error: error.message,
    });
  }
};

exports.createPurchaseOrdersFromReorderPlan = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      reorder_plan_id,
      expected_delivery_date = "",
      status = "draft",
      remarks = "",
    } = req.body;

    if (!reorder_plan_id) {
      return res.status(400).json({
        success: false,
        message: "Reorder plan ID is required",
      });
    }

    const [[plan]] = await connection.query(
      `
        SELECT *
        FROM procurement_reorder_plans
        WHERE id = ?
        LIMIT 1
      `,
      [reorder_plan_id]
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Reorder plan not found",
      });
    }

    const [items] = await connection.query(
      `
        SELECT *
        FROM procurement_reorder_plan_items
        WHERE plan_id = ?
          AND required_qty > 0
        ORDER BY vendor_id ASC, estimated_value DESC
      `,
      [reorder_plan_id]
    );

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No reorder items found to create purchase order",
      });
    }

    const meta = await getPurchaseOrderMeta();

    if (!meta.po.vendorId || !meta.item.purchaseOrderId || !meta.item.quantity) {
      return res.status(400).json({
        success: false,
        message:
          "purchase_orders / purchase_order_items schema not matched for auto PO creation",
      });
    }

    const grouped = groupItemsByVendor(items);
    const createdOrders = [];
    const skippedItems = [];

    await connection.beginTransaction();

    for (const vendorGroup of Object.values(grouped)) {
      if (!vendorGroup.vendor_id) {
        skippedItems.push(
          ...vendorGroup.items.map((item) => ({
            reorder_plan_item_id: item.id,
            product_name: item.product_name,
            reason: "Vendor missing",
          }))
        );
        continue;
      }

      const poNumber = await generatePoNumber(connection);
      const totalAmount = Number(vendorGroup.total_amount.toFixed(2));

      const poPayload = {
        [meta.po.poNumber]: poNumber,
        [meta.po.vendorId]: vendorGroup.vendor_id,
        [meta.po.poDate]: todayDate(),
        [meta.po.expectedDate]: expected_delivery_date || null,
        [meta.po.totalAmount]: totalAmount,
        [meta.po.status]: status || "draft",
        [meta.po.remarks]:
          remarks ||
          `Auto PO created from reorder plan: ${plan.plan_name || `#${plan.id}`}`,
        [meta.po.createdBy]: getUserId(req),
      };

      const poInsert = buildInsert(meta.poColumns, poPayload);

      const [poResult] = await connection.query(
        `
          INSERT INTO purchase_orders ${poInsert.sql}
        `,
        poInsert.values
      );

      const purchaseOrderId = poResult.insertId;

      for (const item of vendorGroup.items) {
        const qty = safeNumber(item.required_qty);
        const unitPrice = safeNumber(item.average_unit_price);
        const lineTotal = qty * unitPrice;

        const itemPayload = {
          [meta.item.purchaseOrderId]: purchaseOrderId,
          [meta.item.productId]: item.product_id,
          [meta.item.quantity]: qty,
          [meta.item.unitPrice]: unitPrice,
          [meta.item.totalPrice]: Number(lineTotal.toFixed(2)),
          [meta.item.remarks]: `Auto item from reorder plan item #${item.id}`,
        };

        const itemInsert = buildInsert(meta.itemColumns, itemPayload);

        await connection.query(
          `
            INSERT INTO purchase_order_items ${itemInsert.sql}
          `,
          itemInsert.values
        );

        await connection.query(
          `
            INSERT INTO ${LINK_TABLE}
              (
                reorder_plan_id,
                reorder_plan_item_id,
                purchase_order_id,
                vendor_id,
                product_id,
                required_qty,
                po_qty,
                estimated_value
              )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            reorder_plan_id,
            item.id,
            purchaseOrderId,
            item.vendor_id,
            item.product_id,
            qty,
            qty,
            Number(lineTotal.toFixed(2)),
          ]
        );
      }

      createdOrders.push({
        purchase_order_id: purchaseOrderId,
        po_number: poNumber,
        vendor_id: vendorGroup.vendor_id,
        vendor_name: vendorGroup.vendor_name,
        total_items: vendorGroup.items.length,
        total_amount: totalAmount,
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Purchase orders created successfully from reorder plan",
      created_count: createdOrders.length,
      skipped_count: skippedItems.length,
      purchase_orders: createdOrders,
      skipped_items: skippedItems,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create auto PO error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create purchase orders from reorder plan",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getAutoPoHistory = async (req, res) => {
  try {
    const { reorder_plan_id = "" } = req.query;

    const values = [];
    let whereSql = "";

    if (reorder_plan_id) {
      whereSql = "WHERE l.reorder_plan_id = ?";
      values.push(reorder_plan_id);
    }

    const [rows] = await db.query(
      `
        SELECT
          l.*,
          rp.plan_name,
          rpi.product_name,
          rpi.vendor_name,
          po.po_number,
          po.status AS po_status,
          po.total_amount
        FROM ${LINK_TABLE} l
        LEFT JOIN procurement_reorder_plans rp
          ON l.reorder_plan_id = rp.id
        LEFT JOIN procurement_reorder_plan_items rpi
          ON l.reorder_plan_item_id = rpi.id
        LEFT JOIN purchase_orders po
          ON l.purchase_order_id = po.id
        ${whereSql}
        ORDER BY l.id DESC
        LIMIT 500
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      history: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Auto PO history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load auto PO history",
      error: error.message,
    });
  }
};
