const db = require("../config/db");

const TABLE = "product_variants";
const PRODUCT_TABLE = "products";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeStatus = (value) => {
  if (value === "inactive") return "inactive";
  return "active";
};

const normalizeBoolean = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") return 1;
  return 0;
};

const getColumns = async (tableName) => {
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

  return {
    columns,

    id: firstColumn(columns, ["id"]),
    productId: firstColumn(columns, ["product_id"]),

    variantName: firstColumn(columns, [
      "variant_name",
      "name",
      "title",
      "variant_title",
    ]),

    sku: firstColumn(columns, ["sku", "variant_sku"]),
    barcode: firstColumn(columns, ["barcode", "bar_code"]),
    variantType: firstColumn(columns, ["variant_type", "type"]),
    size: firstColumn(columns, ["size"]),
    color: firstColumn(columns, ["color", "colour"]),
    weight: firstColumn(columns, ["weight", "net_weight"]),

    mrp: firstColumn(columns, ["mrp", "regular_price"]),
    sellingPrice: firstColumn(columns, ["selling_price", "sale_price", "price"]),
    purchasePrice: firstColumn(columns, ["purchase_price", "cost_price", "buying_price"]),

    stockQty: firstColumn(columns, ["stock_qty", "quantity", "current_stock", "stock"]),
    minStockQty: firstColumn(columns, ["min_stock_qty", "low_stock_qty", "min_stock"]),

    isDefault: firstColumn(columns, ["is_default", "default_variant"]),
    description: firstColumn(columns, ["description", "notes", "remarks"]),
    status: firstColumn(columns, ["status"]),
    createdAt: firstColumn(columns, ["created_at"]),
    updatedAt: firstColumn(columns, ["updated_at"]),

    productName: firstColumn(productColumns, [
      "product_name",
      "name",
      "title",
    ]),

    productSku: firstColumn(productColumns, ["sku", "product_sku"]),
  };
};

const validateMeta = (meta, res) => {
  if (!meta.id || !meta.productId) {
    res.status(500).json({
      success: false,
      message: "product_variants table must have id and product_id columns",
    });

    return false;
  }

  return true;
};

const getSelectFields = (meta) => [
  selectColumn("pv", meta.id, "id"),
  selectColumn("pv", meta.productId, "product_id"),
  selectColumn("pv", meta.variantName, "variant_name"),
  selectColumn("pv", meta.sku, "sku"),
  selectColumn("pv", meta.barcode, "barcode"),
  selectColumn("pv", meta.variantType, "variant_type"),
  selectColumn("pv", meta.size, "size"),
  selectColumn("pv", meta.color, "color"),
  selectColumn("pv", meta.weight, "weight"),
  selectColumn("pv", meta.mrp, "mrp", "0"),
  selectColumn("pv", meta.sellingPrice, "selling_price", "0"),
  selectColumn("pv", meta.purchasePrice, "purchase_price", "0"),
  selectColumn("pv", meta.stockQty, "stock_qty", "0"),
  selectColumn("pv", meta.minStockQty, "min_stock_qty", "0"),
  selectColumn("pv", meta.isDefault, "is_default", "0"),
  selectColumn("pv", meta.description, "description"),
  selectColumn("pv", meta.status, "status", "'active'"),
  selectColumn("pv", meta.createdAt, "created_at"),
  selectColumn("pv", meta.updatedAt, "updated_at"),
  selectColumn("p", meta.productName, "product_name"),
  selectColumn("p", meta.productSku, "product_sku"),
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.productId, payload.product_id],
    [meta.variantName, payload.variant_name],
    [meta.sku, payload.sku],
    [meta.barcode, payload.barcode],
    [meta.variantType, payload.variant_type],
    [meta.size, payload.size],
    [meta.color, payload.color],
    [meta.weight, payload.weight],
    [meta.mrp, payload.mrp],
    [meta.sellingPrice, payload.selling_price],
    [meta.purchasePrice, payload.purchase_price],
    [meta.stockQty, payload.stock_qty],
    [meta.minStockQty, payload.min_stock_qty],
    [meta.isDefault, payload.is_default],
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
    [meta.variantName, payload.variant_name],
    [meta.sku, payload.sku],
    [meta.barcode, payload.barcode],
    [meta.variantType, payload.variant_type],
    [meta.size, payload.size],
    [meta.color, payload.color],
    [meta.weight, payload.weight],
    [meta.mrp, payload.mrp],
    [meta.sellingPrice, payload.selling_price],
    [meta.purchasePrice, payload.purchase_price],
    [meta.stockQty, payload.stock_qty],
    [meta.minStockQty, payload.min_stock_qty],
    [meta.isDefault, payload.is_default],
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

exports.getProductVariantSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(id) AS total_variants,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_variants,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_variants,
        COUNT(DISTINCT product_id) AS products_with_variants
      FROM product_variants
    `);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch variant summary", error: error.message });
  }
};

exports.getProductVariants = async (req, res) => {
  try {
    const {
      search = "",
      product_id = "",
      status = "",
      low_stock = "",
    } = req.query;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const where = [];
    const params = [];

    if (product_id) {
      where.push(`pv.\`${meta.productId}\` = ?`);
      params.push(product_id);
    }

    if (status && meta.status) {
      where.push(`pv.\`${meta.status}\` = ?`);
      params.push(normalizeStatus(status));
    }

    if (low_stock === "true" && meta.stockQty && meta.minStockQty) {
      where.push(`pv.\`${meta.stockQty}\` <= pv.\`${meta.minStockQty}\``);
    }

    if (search) {
      const searchFields = [
        meta.variantName && `pv.\`${meta.variantName}\` LIKE ?`,
        meta.sku && `pv.\`${meta.sku}\` LIKE ?`,
        meta.barcode && `pv.\`${meta.barcode}\` LIKE ?`,
        meta.productName && `p.\`${meta.productName}\` LIKE ?`,
        meta.productSku && `p.\`${meta.productSku}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);

        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [variants] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} pv
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pv.\`${meta.productId}\`
      ${whereSql}
      ORDER BY pv.\`${meta.id}\` DESC
      `,
      params
    );

    res.json({
      success: true,
      count: variants.length,
      variants,
    });
  } catch (error) {
    console.error("Get product variants error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product variants",
      error: error.message,
    });
  }
};

exports.getProductVariantById = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const [[variant]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} pv
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pv.\`${meta.productId}\`
      WHERE pv.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    res.json({
      success: true,
      variant,
    });
  } catch (error) {
    console.error("Get product variant by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product variant",
      error: error.message,
    });
  }
};

exports.createProductVariant = async (req, res) => {
  try {
    const {
      product_id,
      variant_name = "",
      sku = "",
      barcode = "",
      variant_type = "",
      size = "",
      color = "",
      weight = "",
      mrp = 0,
      selling_price = 0,
      purchase_price = 0,
      stock_qty = 0,
      min_stock_qty = 0,
      is_default = 0,
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

    if (meta.variantName && !variant_name) {
      return res.status(400).json({
        success: false,
        message: "Variant name is required",
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

    if (sku && meta.sku) {
      const [[existingSku]] = await db.query(
        `
        SELECT \`${meta.id}\` AS id
        FROM ${TABLE}
        WHERE \`${meta.sku}\` = ?
        LIMIT 1
        `,
        [sku]
      );

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    const payload = {
      product_id,
      variant_name: cleanValue(variant_name),
      sku: cleanValue(sku),
      barcode: cleanValue(barcode),
      variant_type: cleanValue(variant_type),
      size: cleanValue(size),
      color: cleanValue(color),
      weight: cleanValue(weight),
      mrp: toNumber(mrp),
      selling_price: toNumber(selling_price),
      purchase_price: toNumber(purchase_price),
      stock_qty: toNumber(stock_qty),
      min_stock_qty: toNumber(min_stock_qty),
      is_default: normalizeBoolean(is_default),
      description: cleanValue(description),
      status: normalizeStatus(status),
    };

    if (payload.is_default && meta.isDefault) {
      await db.query(
        `
        UPDATE ${TABLE}
        SET \`${meta.isDefault}\` = 0
        WHERE \`${meta.productId}\` = ?
        `,
        [product_id]
      );
    }

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
      message: "Product variant created successfully",
      variant_id: result.insertId,
    });
  } catch (error) {
    console.error("Create product variant error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product variant",
      error: error.message,
    });
  }
};

exports.updateProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      product_id,
      variant_name = "",
      sku = "",
      barcode = "",
      variant_type = "",
      size = "",
      color = "",
      weight = "",
      mrp = 0,
      selling_price = 0,
      purchase_price = 0,
      stock_qty = 0,
      min_stock_qty = 0,
      is_default = 0,
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

    if (meta.variantName && !variant_name) {
      return res.status(400).json({
        success: false,
        message: "Variant name is required",
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
        message: "Product variant not found",
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

    if (sku && meta.sku) {
      const [[existingSku]] = await db.query(
        `
        SELECT \`${meta.id}\` AS id
        FROM ${TABLE}
        WHERE \`${meta.sku}\` = ?
        AND \`${meta.id}\` != ?
        LIMIT 1
        `,
        [sku, id]
      );

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    const payload = {
      product_id,
      variant_name: cleanValue(variant_name),
      sku: cleanValue(sku),
      barcode: cleanValue(barcode),
      variant_type: cleanValue(variant_type),
      size: cleanValue(size),
      color: cleanValue(color),
      weight: cleanValue(weight),
      mrp: toNumber(mrp),
      selling_price: toNumber(selling_price),
      purchase_price: toNumber(purchase_price),
      stock_qty: toNumber(stock_qty),
      min_stock_qty: toNumber(min_stock_qty),
      is_default: normalizeBoolean(is_default),
      description: cleanValue(description),
      status: normalizeStatus(status),
    };

    if (payload.is_default && meta.isDefault) {
      await db.query(
        `
        UPDATE ${TABLE}
        SET \`${meta.isDefault}\` = 0
        WHERE \`${meta.productId}\` = ?
        AND \`${meta.id}\` != ?
        `,
        [product_id, id]
      );
    }

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
      message: "Product variant updated successfully",
    });
  } catch (error) {
    console.error("Update product variant error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update product variant",
      error: error.message,
    });
  }
};

exports.updateProductVariantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [result] = await db.query(`UPDATE product_variants SET status = ? WHERE id = ?`, [status, id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Product variant not found" });
    }

    res.json({ success: true, message: `Product variant ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update variant status", error: error.message });
  }
};

exports.deleteProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const [[inInventory]] = await db.query(
      `SELECT COUNT(id) AS cnt FROM inventories WHERE variant_id = ? LIMIT 1`, [id]
    );
    if (inInventory.cnt > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — variant is used in inventory (${inInventory.cnt} record(s)). Deactivate it instead.`,
      });
    }

    const [[inOrders]] = await db.query(
      `SELECT COUNT(id) AS cnt FROM order_items WHERE variant_id = ? LIMIT 1`, [id]
    );
    if (inOrders.cnt > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — variant is used in orders (${inOrders.cnt} record(s)). Deactivate it instead.`,
      });
    }

    const [result] = await db.query(
      `DELETE FROM ${TABLE} WHERE \`${meta.id}\` = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Product variant not found" });
    }

    res.json({ success: true, message: "Product variant deleted successfully" });
  } catch (error) {
    console.error("Delete product variant error:", error);
    res.status(500).json({ success: false, message: "Failed to delete product variant", error: error.message });
  }
};