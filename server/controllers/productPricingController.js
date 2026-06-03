const db = require("../config/db");

const TABLE = "product_pricing";
const PRODUCT_TABLE = "products";
const VARIANT_TABLE = "product_variants";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeStatus = (value) => {
  if (value === "inactive" || value === "draft" || value === "expired") {
    return value;
  }

  return "active";
};

const normalizePriceType = (value) => {
  const allowed = [
    "retail",
    "wholesale",
    "bulk",
    "customer_group",
    "special",
    "offer",
  ];

  return allowed.includes(value) ? value : "retail";
};

const tableExists = async (tableName) => {
  const [rows] = await db.query("SHOW TABLES LIKE ?", [tableName]);
  return rows.length > 0;
};

const getColumns = async (tableName) => {
  const exists = await tableExists(tableName);
  if (!exists) return [];

  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return rows.map((row) => row.Field);
};

const firstColumn = (columns, options) => {
  return options.find((column) => columns.includes(column)) || null;
};

const selectColumn = (alias, column, outputName, fallback = "NULL") => {
  if (!column) return `${fallback} AS ${outputName}`;
  return `${alias}.\`${column}\` AS ${outputName}`;
};

const getMeta = async () => {
  const columns = await getColumns(TABLE);
  const productColumns = await getColumns(PRODUCT_TABLE);
  const variantColumns = await getColumns(VARIANT_TABLE);

  const variantId = firstColumn(columns, ["variant_id", "product_variant_id"]);

  return {
    columns,

    id: firstColumn(columns, ["id"]),
    productId: firstColumn(columns, ["product_id"]),
    variantId,

    priceType: firstColumn(columns, [
      "price_type",
      "pricing_type",
      "type",
    ]),

    customerGroupId: firstColumn(columns, [
      "customer_group_id",
      "group_id",
      "customer_type_id",
    ]),

    mrp: firstColumn(columns, ["mrp", "regular_price"]),
    sellingPrice: firstColumn(columns, ["selling_price", "sale_price", "price"]),
    purchasePrice: firstColumn(columns, [
      "purchase_price",
      "cost_price",
      "buying_price",
    ]),

    wholesalePrice: firstColumn(columns, [
      "wholesale_price",
      "bulk_price",
      "b2b_price",
    ]),

    minQty: firstColumn(columns, ["min_qty", "minimum_qty", "from_qty"]),
    maxQty: firstColumn(columns, ["max_qty", "maximum_qty", "to_qty"]),

    discountType: firstColumn(columns, [
      "discount_type",
      "offer_type",
    ]),

    discountValue: firstColumn(columns, [
      "discount_value",
      "discount_amount",
      "discount",
    ]),

    taxPercent: firstColumn(columns, [
      "tax_percent",
      "gst_percent",
      "gst",
      "tax",
    ]),

    effectiveFrom: firstColumn(columns, [
      "effective_from",
      "start_date",
      "valid_from",
    ]),

    effectiveTo: firstColumn(columns, [
      "effective_to",
      "end_date",
      "valid_to",
    ]),

    description: firstColumn(columns, ["description", "notes", "remarks"]),
    status: firstColumn(columns, ["status"]),
    createdAt: firstColumn(columns, ["created_at"]),
    updatedAt: firstColumn(columns, ["updated_at"]),

    productName: firstColumn(productColumns, [
      "product_name",
      "name",
      "title",
      "item_name",
    ]),

    productSku: firstColumn(productColumns, ["sku", "product_sku"]),

    variantName: variantId
      ? firstColumn(variantColumns, [
          "variant_name",
          "name",
          "title",
          "variant_title",
        ])
      : null,

    variantSku: variantId
      ? firstColumn(variantColumns, ["sku", "variant_sku"])
      : null,

    canJoinVariant: Boolean(variantId && variantColumns.length),
  };
};

const validateMeta = (meta, res) => {
  if (!meta.id || !meta.productId) {
    res.status(500).json({
      success: false,
      message: "product_pricing table must have id and product_id columns",
    });

    return false;
  }

  return true;
};

const getSelectFields = (meta) => [
  selectColumn("pp", meta.id, "id"),
  selectColumn("pp", meta.productId, "product_id"),
  selectColumn("pp", meta.variantId, "variant_id"),
  selectColumn("pp", meta.priceType, "price_type", "'retail'"),
  selectColumn("pp", meta.customerGroupId, "customer_group_id"),
  selectColumn("pp", meta.mrp, "mrp", "0"),
  selectColumn("pp", meta.sellingPrice, "selling_price", "0"),
  selectColumn("pp", meta.purchasePrice, "purchase_price", "0"),
  selectColumn("pp", meta.wholesalePrice, "wholesale_price", "0"),
  selectColumn("pp", meta.minQty, "min_qty", "0"),
  selectColumn("pp", meta.maxQty, "max_qty", "0"),
  selectColumn("pp", meta.discountType, "discount_type"),
  selectColumn("pp", meta.discountValue, "discount_value", "0"),
  selectColumn("pp", meta.taxPercent, "tax_percent", "0"),
  selectColumn("pp", meta.effectiveFrom, "effective_from"),
  selectColumn("pp", meta.effectiveTo, "effective_to"),
  selectColumn("pp", meta.description, "description"),
  selectColumn("pp", meta.status, "status", "'active'"),
  selectColumn("pp", meta.createdAt, "created_at"),
  selectColumn("pp", meta.updatedAt, "updated_at"),
  selectColumn("p", meta.productName, "product_name"),
  selectColumn("p", meta.productSku, "product_sku"),
  meta.canJoinVariant
    ? selectColumn("pv", meta.variantName, "variant_name")
    : "NULL AS variant_name",
  meta.canJoinVariant
    ? selectColumn("pv", meta.variantSku, "variant_sku")
    : "NULL AS variant_sku",
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.productId, payload.product_id],
    [meta.variantId, payload.variant_id],
    [meta.priceType, payload.price_type],
    [meta.customerGroupId, payload.customer_group_id],
    [meta.mrp, payload.mrp],
    [meta.sellingPrice, payload.selling_price],
    [meta.purchasePrice, payload.purchase_price],
    [meta.wholesalePrice, payload.wholesale_price],
    [meta.minQty, payload.min_qty],
    [meta.maxQty, payload.max_qty],
    [meta.discountType, payload.discount_type],
    [meta.discountValue, payload.discount_value],
    [meta.taxPercent, payload.tax_percent],
    [meta.effectiveFrom, payload.effective_from],
    [meta.effectiveTo, payload.effective_to],
    [meta.description, payload.description],
    [meta.status, payload.status],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    fields.push(`\`${column}\``);
    placeholders.push("?");
    values.push(value);
  });

  return { fields, placeholders, values };
};

const buildUpdate = (meta, payload) => {
  const sets = [];
  const values = [];

  const map = [
    [meta.productId, payload.product_id],
    [meta.variantId, payload.variant_id],
    [meta.priceType, payload.price_type],
    [meta.customerGroupId, payload.customer_group_id],
    [meta.mrp, payload.mrp],
    [meta.sellingPrice, payload.selling_price],
    [meta.purchasePrice, payload.purchase_price],
    [meta.wholesalePrice, payload.wholesale_price],
    [meta.minQty, payload.min_qty],
    [meta.maxQty, payload.max_qty],
    [meta.discountType, payload.discount_type],
    [meta.discountValue, payload.discount_value],
    [meta.taxPercent, payload.tax_percent],
    [meta.effectiveFrom, payload.effective_from],
    [meta.effectiveTo, payload.effective_to],
    [meta.description, payload.description],
    [meta.status, payload.status],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return { sets, values };
};

exports.getProductPricing = async (req, res) => {
  try {
    const {
      search = "",
      product_id = "",
      variant_id = "",
      price_type = "",
      status = "",
    } = req.query;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const where = [];
    const params = [];

    if (product_id) {
      where.push(`pp.\`${meta.productId}\` = ?`);
      params.push(product_id);
    }

    if (variant_id && meta.variantId) {
      where.push(`pp.\`${meta.variantId}\` = ?`);
      params.push(variant_id);
    }

    if (price_type && meta.priceType) {
      where.push(`pp.\`${meta.priceType}\` = ?`);
      params.push(normalizePriceType(price_type));
    }

    if (status && meta.status) {
      where.push(`pp.\`${meta.status}\` = ?`);
      params.push(normalizeStatus(status));
    }

    if (search) {
      const searchFields = [
        meta.productName && `p.\`${meta.productName}\` LIKE ?`,
        meta.productSku && `p.\`${meta.productSku}\` LIKE ?`,
        meta.canJoinVariant && meta.variantName && `pv.\`${meta.variantName}\` LIKE ?`,
        meta.canJoinVariant && meta.variantSku && `pv.\`${meta.variantSku}\` LIKE ?`,
        meta.description && `pp.\`${meta.description}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);

        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const joinVariantSql = meta.canJoinVariant
      ? `LEFT JOIN ${VARIANT_TABLE} pv ON pv.id = pp.\`${meta.variantId}\``
      : "";

    const [pricing] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} pp
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pp.\`${meta.productId}\`
      ${joinVariantSql}
      ${whereSql}
      ORDER BY pp.\`${meta.id}\` DESC
      `,
      params
    );

    res.json({
      success: true,
      count: pricing.length,
      pricing,
    });
  } catch (error) {
    console.error("Get product pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product pricing",
      error: error.message,
    });
  }
};

exports.getProductPricingById = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const joinVariantSql = meta.canJoinVariant
      ? `LEFT JOIN ${VARIANT_TABLE} pv ON pv.id = pp.\`${meta.variantId}\``
      : "";

    const [[pricing]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} pp
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pp.\`${meta.productId}\`
      ${joinVariantSql}
      WHERE pp.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Product pricing not found",
      });
    }

    res.json({
      success: true,
      pricing,
    });
  } catch (error) {
    console.error("Get product pricing by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product pricing",
      error: error.message,
    });
  }
};

exports.createProductPricing = async (req, res) => {
  try {
    const {
      product_id,
      variant_id = "",
      price_type = "retail",
      customer_group_id = "",
      mrp = 0,
      selling_price = 0,
      purchase_price = 0,
      wholesale_price = 0,
      min_qty = 0,
      max_qty = 0,
      discount_type = "",
      discount_value = 0,
      tax_percent = 0,
      effective_from = "",
      effective_to = "",
      description = "",
      status = "active",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    const [[product]] = await db.query(
      `
      SELECT id
      FROM ${PRODUCT_TABLE}
      WHERE id = ?
      LIMIT 1
      `,
      [product_id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (variant_id && meta.canJoinVariant) {
      const [[variant]] = await db.query(
        `
        SELECT id
        FROM ${VARIANT_TABLE}
        WHERE id = ?
        LIMIT 1
        `,
        [variant_id]
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Product variant not found",
        });
      }
    }

    const payload = {
      product_id,
      variant_id: cleanValue(variant_id),
      price_type: normalizePriceType(price_type),
      customer_group_id: cleanValue(customer_group_id),
      mrp: toNumber(mrp),
      selling_price: toNumber(selling_price),
      purchase_price: toNumber(purchase_price),
      wholesale_price: toNumber(wholesale_price),
      min_qty: toNumber(min_qty),
      max_qty: toNumber(max_qty),
      discount_type: cleanValue(discount_type),
      discount_value: toNumber(discount_value),
      tax_percent: toNumber(tax_percent),
      effective_from: cleanValue(effective_from),
      effective_to: cleanValue(effective_to),
      description: cleanValue(description),
      status: normalizeStatus(status),
    };

    const insert = buildInsert(meta, payload);

    const [result] = await db.query(
      `
      INSERT INTO ${TABLE}
        (${insert.fields.join(", ")})
      VALUES
        (${insert.placeholders.join(", ")})
      `,
      insert.values
    );

    res.status(201).json({
      success: true,
      message: "Product pricing created successfully",
      pricing_id: result.insertId,
    });
  } catch (error) {
    console.error("Create product pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product pricing",
      error: error.message,
    });
  }
};

exports.updateProductPricing = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      product_id,
      variant_id = "",
      price_type = "retail",
      customer_group_id = "",
      mrp = 0,
      selling_price = 0,
      purchase_price = 0,
      wholesale_price = 0,
      min_qty = 0,
      max_qty = 0,
      discount_type = "",
      discount_value = 0,
      tax_percent = 0,
      effective_from = "",
      effective_to = "",
      description = "",
      status = "active",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    const [[existing]] = await db.query(
      `
      SELECT \`${meta.id}\` AS id
      FROM ${TABLE}
      WHERE \`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product pricing not found",
      });
    }

    const [[product]] = await db.query(
      `
      SELECT id
      FROM ${PRODUCT_TABLE}
      WHERE id = ?
      LIMIT 1
      `,
      [product_id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (variant_id && meta.canJoinVariant) {
      const [[variant]] = await db.query(
        `
        SELECT id
        FROM ${VARIANT_TABLE}
        WHERE id = ?
        LIMIT 1
        `,
        [variant_id]
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Product variant not found",
        });
      }
    }

    const payload = {
      product_id,
      variant_id: cleanValue(variant_id),
      price_type: normalizePriceType(price_type),
      customer_group_id: cleanValue(customer_group_id),
      mrp: toNumber(mrp),
      selling_price: toNumber(selling_price),
      purchase_price: toNumber(purchase_price),
      wholesale_price: toNumber(wholesale_price),
      min_qty: toNumber(min_qty),
      max_qty: toNumber(max_qty),
      discount_type: cleanValue(discount_type),
      discount_value: toNumber(discount_value),
      tax_percent: toNumber(tax_percent),
      effective_from: cleanValue(effective_from),
      effective_to: cleanValue(effective_to),
      description: cleanValue(description),
      status: normalizeStatus(status),
    };

    const update = buildUpdate(meta, payload);

    await db.query(
      `
      UPDATE ${TABLE}
      SET ${update.sets.join(", ")}
      WHERE \`${meta.id}\` = ?
      `,
      [...update.values, id]
    );

    res.json({
      success: true,
      message: "Product pricing updated successfully",
    });
  } catch (error) {
    console.error("Update product pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update product pricing",
      error: error.message,
    });
  }
};

exports.deleteProductPricing = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const [result] = await db.query(
      `
      DELETE FROM ${TABLE}
      WHERE \`${meta.id}\` = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Product pricing not found",
      });
    }

    res.json({
      success: true,
      message: "Product pricing deleted successfully",
    });
  } catch (error) {
    console.error("Delete product pricing error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete product pricing",
      error: error.message,
    });
  }
};