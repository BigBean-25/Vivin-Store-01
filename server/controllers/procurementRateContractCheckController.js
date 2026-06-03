const db = require("../config/db");

const CHECK_TABLE = "procurement_rate_contract_checks";
const CONTRACT_TABLE = "vendor_rate_contracts";
const CONTRACT_ITEM_TABLE = "vendor_rate_contract_items";

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

const selectColumn = (alias, column, fallbackAlias) => {
  if (!column) return `NULL AS ${fallbackAlias}`;
  return `${alias}.\`${column}\` AS ${fallbackAlias}`;
};

const getPoMeta = async () => {
  const poColumns = await getColumns("purchase_orders");
  const itemColumns = await getColumns("purchase_order_items");

  return {
    po: {
      id: firstColumn(poColumns, ["id"]),
      number: firstColumn(poColumns, [
        "po_number",
        "purchase_order_number",
        "reference_number",
      ]),
      vendorId: firstColumn(poColumns, ["vendor_id"]),
      vendorName: firstColumn(poColumns, ["vendor_name"]),
      date: firstColumn(poColumns, ["po_date", "order_date", "date", "created_at"]),
      status: firstColumn(poColumns, ["status", "po_status"]),
    },

    item: {
      id: firstColumn(itemColumns, ["id"]),
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
    },
  };
};

const getPurchaseOrderWithItems = async (purchaseOrderId) => {
  const meta = await getPoMeta();

  if (!meta.po.id || !meta.po.vendorId || !meta.item.poId || !meta.item.unitPrice) {
    throw new Error(
      "Purchase Order schema not matched. Check purchase_orders / purchase_order_items columns."
    );
  }

  const [[po]] = await db.query(
    `
      SELECT
        ${selectColumn("po", meta.po.id, "id")},
        ${selectColumn("po", meta.po.number, "po_number")},
        ${selectColumn("po", meta.po.vendorId, "vendor_id")},
        ${selectColumn("po", meta.po.vendorName, "vendor_name")},
        ${selectColumn("po", meta.po.date, "po_date")},
        ${selectColumn("po", meta.po.status, "status")}
      FROM purchase_orders po
      WHERE po.\`${meta.po.id}\` = ?
      LIMIT 1
    `,
    [purchaseOrderId]
  );

  if (!po) {
    return {
      po: null,
      items: [],
    };
  }

  const [items] = await db.query(
    `
      SELECT
        ${selectColumn("poi", meta.item.id, "id")},
        ${selectColumn("poi", meta.item.poId, "purchase_order_id")},
        ${selectColumn("poi", meta.item.productId, "product_id")},
        ${selectColumn("poi", meta.item.productName, "product_name")},
        ${selectColumn("poi", meta.item.quantity, "quantity")},
        ${selectColumn("poi", meta.item.unitPrice, "unit_price")},
        ${selectColumn("poi", meta.item.totalPrice, "total_price")}
      FROM purchase_order_items poi
      WHERE poi.\`${meta.item.poId}\` = ?
      ORDER BY poi.\`${meta.item.id || meta.item.poId}\` ASC
    `,
    [purchaseOrderId]
  );

  return {
    po,
    items,
  };
};

const findActiveContractRate = async ({
  vendorId,
  productId,
  productName,
  checkDate,
}) => {
  const values = [vendorId, checkDate, checkDate, checkDate, checkDate];
  let productSql = "";

  if (productId) {
    productSql = "AND i.product_id = ?";
    values.push(productId);
  } else if (productName) {
    productSql = "AND i.product_name LIKE ?";
    values.push(`%${productName}%`);
  } else {
    return null;
  }

  const [[rate]] = await db.query(
    `
      SELECT
        c.id AS contract_id,
        c.contract_number,
        c.contract_title,
        c.vendor_id,
        c.vendor_name,
        i.id AS contract_item_id,
        i.product_id,
        i.product_name,
        i.contract_rate,
        i.valid_from,
        i.valid_to
      FROM ${CONTRACT_TABLE} c
      INNER JOIN ${CONTRACT_ITEM_TABLE} i
        ON c.id = i.contract_id
      WHERE c.vendor_id = ?
        AND c.status = 'active'
        AND c.approval_status = 'approved'
        AND c.contract_start_date <= ?
        AND c.contract_end_date >= ?
        AND COALESCE(i.valid_from, c.contract_start_date) <= ?
        AND COALESCE(i.valid_to, c.contract_end_date) >= ?
        ${productSql}
      ORDER BY c.id DESC, i.id DESC
      LIMIT 1
    `,
    values
  );

  return rate || null;
};

const getCheckStatus = (poRate, contractRate) => {
  if (!contractRate) return "no_contract";

  const difference = safeNumber(poRate) - safeNumber(contractRate);

  if (Math.abs(difference) <= 0.01) return "matched";
  if (difference > 0) return "above_contract";
  return "below_contract";
};

exports.getRateContractCheckSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
        SELECT
          COUNT(*) AS total_checks,
          SUM(CASE WHEN check_status = 'matched' THEN 1 ELSE 0 END) AS matched_count,
          SUM(CASE WHEN check_status = 'above_contract' THEN 1 ELSE 0 END) AS above_contract_count,
          SUM(CASE WHEN check_status = 'below_contract' THEN 1 ELSE 0 END) AS below_contract_count,
          SUM(CASE WHEN check_status = 'no_contract' THEN 1 ELSE 0 END) AS no_contract_count,
          COALESCE(SUM(difference_amount), 0) AS total_difference
        FROM ${CHECK_TABLE}
      `
    );

    const [recent] = await db.query(
      `
        SELECT *
        FROM ${CHECK_TABLE}
        ORDER BY id DESC
        LIMIT 10
      `
    );

    res.json({
      success: true,
      summary: {
        total_checks: safeNumber(summary?.total_checks),
        matched_count: safeNumber(summary?.matched_count),
        above_contract_count: safeNumber(summary?.above_contract_count),
        below_contract_count: safeNumber(summary?.below_contract_count),
        no_contract_count: safeNumber(summary?.no_contract_count),
        total_difference: safeNumber(summary?.total_difference),
      },
      recent,
    });
  } catch (error) {
    console.error("Rate contract check summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load rate contract check summary",
      error: error.message,
    });
  }
};

exports.getRateContractChecks = async (req, res) => {
  try {
    const {
      purchase_order_id = "",
      vendor_id = "",
      product_id = "",
      check_status = "",
      from_date = "",
      to_date = "",
      search = "",
    } = req.query;

    const where = [];
    const values = [];

    if (purchase_order_id) {
      where.push("purchase_order_id = ?");
      values.push(purchase_order_id);
    }

    if (vendor_id) {
      where.push("vendor_id = ?");
      values.push(vendor_id);
    }

    if (product_id) {
      where.push("product_id = ?");
      values.push(product_id);
    }

    if (check_status) {
      where.push("check_status = ?");
      values.push(check_status);
    }

    if (from_date) {
      where.push("DATE(checked_at) >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("DATE(checked_at) <= ?");
      values.push(to_date);
    }

    if (search.trim()) {
      where.push(
        "(product_name LIKE ? OR contract_number LIKE ? OR remarks LIKE ?)"
      );

      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT *
        FROM ${CHECK_TABLE}
        ${whereSql}
        ORDER BY id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      checks: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get rate contract checks error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch rate contract checks",
      error: error.message,
    });
  }
};

exports.getRateContractChecksByPo = async (req, res) => {
  try {
    const { purchase_order_id } = req.params;

    const [rows] = await db.query(
      `
        SELECT *
        FROM ${CHECK_TABLE}
        WHERE purchase_order_id = ?
        ORDER BY id ASC
      `,
      [purchase_order_id]
    );

    res.json({
      success: true,
      count: rows.length,
      checks: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get PO rate checks error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch PO rate contract checks",
      error: error.message,
    });
  }
};

exports.checkPurchaseOrderRateContract = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { purchase_order_id } = req.params;
    const { replace_existing = true } = req.body;

    const { po, items } = await getPurchaseOrderWithItems(purchase_order_id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No purchase order items found",
      });
    }

    const checkDate = po.po_date ? String(po.po_date).slice(0, 10) : todayDate();

    await connection.beginTransaction();

    if (replace_existing) {
      await connection.query(
        `
          DELETE FROM ${CHECK_TABLE}
          WHERE purchase_order_id = ?
        `,
        [purchase_order_id]
      );
    }

    const results = [];

    for (const item of items) {
      const poRate = safeNumber(item.unit_price);

      const activeRate = await findActiveContractRate({
        vendorId: po.vendor_id,
        productId: item.product_id,
        productName: item.product_name,
        checkDate,
      });

      const contractRate = safeNumber(activeRate?.contract_rate);
      const differenceAmount = poRate - contractRate;
      const differencePercent = contractRate
        ? (differenceAmount / contractRate) * 100
        : 0;

      const checkStatus = getCheckStatus(poRate, contractRate);

      const remarks =
        checkStatus === "matched"
          ? "PO rate matched with active contract rate"
          : checkStatus === "above_contract"
          ? "PO rate is higher than active contract rate"
          : checkStatus === "below_contract"
          ? "PO rate is lower than active contract rate"
          : "No active rate contract found for this vendor/product";

      const [insertResult] = await connection.query(
        `
          INSERT INTO ${CHECK_TABLE}
            (
              purchase_order_id,
              purchase_order_item_id,
              vendor_id,
              product_id,
              product_name,
              po_rate,
              contract_rate,
              difference_amount,
              difference_percent,
              contract_id,
              contract_number,
              check_status,
              remarks,
              checked_by
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          purchase_order_id,
          item.id || null,
          po.vendor_id || null,
          item.product_id || null,
          item.product_name || null,
          poRate,
          contractRate,
          Number(differenceAmount.toFixed(2)),
          Number(differencePercent.toFixed(2)),
          activeRate?.contract_id || null,
          activeRate?.contract_number || null,
          checkStatus,
          remarks,
          getUserId(req),
        ]
      );

      results.push({
        id: insertResult.insertId,
        purchase_order_id,
        purchase_order_item_id: item.id || null,
        vendor_id: po.vendor_id || null,
        product_id: item.product_id || null,
        product_name: item.product_name || null,
        po_rate: poRate,
        contract_rate: contractRate,
        difference_amount: Number(differenceAmount.toFixed(2)),
        difference_percent: Number(differencePercent.toFixed(2)),
        contract_id: activeRate?.contract_id || null,
        contract_number: activeRate?.contract_number || null,
        check_status: checkStatus,
        remarks,
      });
    }

    await connection.commit();

    const summary = results.reduce(
      (acc, item) => {
        acc.total_checks += 1;
        acc[item.check_status] = (acc[item.check_status] || 0) + 1;
        acc.total_difference += safeNumber(item.difference_amount);
        return acc;
      },
      {
        total_checks: 0,
        matched: 0,
        above_contract: 0,
        below_contract: 0,
        no_contract: 0,
        total_difference: 0,
      }
    );

    summary.total_difference = Number(summary.total_difference.toFixed(2));

    res.status(201).json({
      success: true,
      message: "Purchase order rate contract check completed",
      purchase_order: po,
      summary,
      checks: results,
      data: results,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Check PO rate contract error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check PO rate contract",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.deleteRateContractCheck = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
        DELETE FROM ${CHECK_TABLE}
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Rate contract check not found",
      });
    }

    res.json({
      success: true,
      message: "Rate contract check deleted successfully",
    });
  } catch (error) {
    console.error("Delete rate contract check error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete rate contract check",
      error: error.message,
    });
  }
};
