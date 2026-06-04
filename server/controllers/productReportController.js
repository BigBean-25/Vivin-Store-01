const db = require("../config/db");

const PRODUCT_TABLE = "products";
const CATEGORY_TABLE = "categories";
const SUB_CATEGORY_TABLE = "sub_categories";
const BRAND_TABLE = "brands";
const UNIT_TABLE = "units";
const VARIANT_TABLE = "product_variants";
const PRICING_TABLE = "product_pricing";
const REVIEW_TABLE = "product_reviews";
const IMAGE_TABLE = "product_images";

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
  const productColumns = await getColumns(PRODUCT_TABLE);
  const categoryColumns = await getColumns(CATEGORY_TABLE);
  const subCategoryColumns = await getColumns(SUB_CATEGORY_TABLE);
  const brandColumns = await getColumns(BRAND_TABLE);
  const unitColumns = await getColumns(UNIT_TABLE);
  const variantColumns = await getColumns(VARIANT_TABLE);
  const pricingColumns = await getColumns(PRICING_TABLE);
  const reviewColumns = await getColumns(REVIEW_TABLE);
  const imageColumns = await getColumns(IMAGE_TABLE);

  return {
    productColumns,

    productId: firstColumn(productColumns, ["id"]),
    productName: firstColumn(productColumns, ["product_name", "name", "title", "item_name"]),
    sku: firstColumn(productColumns, ["sku", "product_sku"]),
    barcode: firstColumn(productColumns, ["barcode", "bar_code"]),
    hsnCode: firstColumn(productColumns, ["hsn_code", "hsn", "hsn_sac"]),
    categoryId: firstColumn(productColumns, ["category_id"]),
    subCategoryId: firstColumn(productColumns, ["sub_category_id", "subcategory_id"]),
    brandId: firstColumn(productColumns, ["brand_id"]),
    unitId: firstColumn(productColumns, ["unit_id"]),
    status: firstColumn(productColumns, ["status"]),
    createdAt: firstColumn(productColumns, ["created_at"]),

    categoryName: firstColumn(categoryColumns, ["category_name", "name", "title"]),
    subCategoryName: firstColumn(subCategoryColumns, ["sub_category_name", "subcategory_name", "name", "title"]),
    brandName: firstColumn(brandColumns, ["brand_name", "name", "title"]),
    unitName: firstColumn(unitColumns, ["unit_name", "name", "title", "short_name"]),

    variantProductId: firstColumn(variantColumns, ["product_id"]),
    variantId: firstColumn(variantColumns, ["id"]),
    variantStatus: firstColumn(variantColumns, ["status"]),
    variantStock: firstColumn(variantColumns, ["stock_qty", "current_stock", "qty", "quantity"]),
    variantMinStock: firstColumn(variantColumns, ["min_stock_qty", "minimum_stock", "min_qty"]),

    pricingProductId: firstColumn(pricingColumns, ["product_id"]),
    sellingPrice: firstColumn(pricingColumns, ["selling_price", "sale_price", "price"]),

    reviewProductId: firstColumn(reviewColumns, ["product_id"]),
    reviewRating: firstColumn(reviewColumns, ["rating", "score", "star_rating", "rating_value"]),

    imageProductId: firstColumn(imageColumns, ["product_id"]),
    imagePath: firstColumn(imageColumns, ["image_path", "image_url", "file_path", "path", "image"]),
    imagePrimary: firstColumn(imageColumns, ["is_primary", "primary_image", "is_default"]),

    canJoinCategory: Boolean(firstColumn(productColumns, ["category_id"]) && categoryColumns.length),
    canJoinSubCategory: Boolean(firstColumn(productColumns, ["sub_category_id", "subcategory_id"]) && subCategoryColumns.length),
    canJoinBrand: Boolean(firstColumn(productColumns, ["brand_id"]) && brandColumns.length),
    canJoinUnit: Boolean(firstColumn(productColumns, ["unit_id"]) && unitColumns.length),

    canJoinVariants: Boolean(firstColumn(variantColumns, ["product_id"]) && firstColumn(variantColumns, ["id"])),
    canJoinPricing: Boolean(firstColumn(pricingColumns, ["product_id"])),
    canJoinReviews: Boolean(firstColumn(reviewColumns, ["product_id"])),
    canJoinImages: Boolean(firstColumn(imageColumns, ["product_id"])),
  };
};

const validateMeta = (meta, res) => {
  if (!meta.productId) {
    res.status(500).json({
      success: false,
      message: "products table must have id column",
    });

    return false;
  }

  return true;
};

const buildVariantJoin = (meta) => {
  if (!meta.canJoinVariants) return "";

  const activeCount = meta.variantStatus
    ? `SUM(CASE WHEN \`${meta.variantStatus}\` = 'active' THEN 1 ELSE 0 END) AS active_variant_count`
    : `COUNT(*) AS active_variant_count`;

  const totalStock = meta.variantStock
    ? `SUM(COALESCE(\`${meta.variantStock}\`, 0)) AS total_stock`
    : `0 AS total_stock`;

  const lowStock = meta.variantStock && meta.variantMinStock
    ? `SUM(CASE WHEN COALESCE(\`${meta.variantStock}\`, 0) <= COALESCE(\`${meta.variantMinStock}\`, 0) THEN 1 ELSE 0 END) AS low_stock_count`
    : `0 AS low_stock_count`;

  return `
    LEFT JOIN (
      SELECT
        \`${meta.variantProductId}\` AS product_id,
        COUNT(*) AS variant_count,
        ${activeCount},
        ${totalStock},
        ${lowStock}
      FROM ${VARIANT_TABLE}
      GROUP BY \`${meta.variantProductId}\`
    ) va ON va.product_id = p.\`${meta.productId}\`
  `;
};

const buildPricingJoin = (meta) => {
  if (!meta.canJoinPricing || !meta.sellingPrice) return "";

  return `
    LEFT JOIN (
      SELECT
        \`${meta.pricingProductId}\` AS product_id,
        COUNT(*) AS pricing_count,
        MIN(COALESCE(\`${meta.sellingPrice}\`, 0)) AS min_selling_price,
        MAX(COALESCE(\`${meta.sellingPrice}\`, 0)) AS max_selling_price
      FROM ${PRICING_TABLE}
      GROUP BY \`${meta.pricingProductId}\`
    ) pa ON pa.product_id = p.\`${meta.productId}\`
  `;
};

const buildReviewJoin = (meta) => {
  if (!meta.canJoinReviews || !meta.reviewRating) return "";

  return `
    LEFT JOIN (
      SELECT
        \`${meta.reviewProductId}\` AS product_id,
        COUNT(*) AS review_count,
        ROUND(AVG(COALESCE(\`${meta.reviewRating}\`, 0)), 1) AS average_rating
      FROM ${REVIEW_TABLE}
      GROUP BY \`${meta.reviewProductId}\`
    ) ra ON ra.product_id = p.\`${meta.productId}\`
  `;
};

const buildImageJoin = (meta) => {
  if (!meta.canJoinImages || !meta.imagePath) return "";

  const primaryImage = meta.imagePrimary
    ? `COALESCE(MAX(CASE WHEN \`${meta.imagePrimary}\` = 1 THEN \`${meta.imagePath}\` END), MAX(\`${meta.imagePath}\`)) AS primary_image`
    : `MAX(\`${meta.imagePath}\`) AS primary_image`;

  return `
    LEFT JOIN (
      SELECT
        \`${meta.imageProductId}\` AS product_id,
        COUNT(*) AS image_count,
        ${primaryImage}
      FROM ${IMAGE_TABLE}
      GROUP BY \`${meta.imageProductId}\`
    ) ia ON ia.product_id = p.\`${meta.productId}\`
  `;
};

const buildReportQuery = (meta, filters = {}) => {
  const {
    search = "",
    product_id = "",
    category_id = "",
    brand_id = "",
    status = "",
    low_stock = "",
  } = filters;

  const joins = [
    meta.canJoinCategory
      ? `LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.\`${meta.categoryId}\``
      : "",
    meta.canJoinSubCategory
      ? `LEFT JOIN ${SUB_CATEGORY_TABLE} sc ON sc.id = p.\`${meta.subCategoryId}\``
      : "",
    meta.canJoinBrand
      ? `LEFT JOIN ${BRAND_TABLE} b ON b.id = p.\`${meta.brandId}\``
      : "",
    meta.canJoinUnit
      ? `LEFT JOIN ${UNIT_TABLE} u ON u.id = p.\`${meta.unitId}\``
      : "",
    buildVariantJoin(meta),
    buildPricingJoin(meta),
    buildReviewJoin(meta),
    buildImageJoin(meta),
  ].filter(Boolean);

  const where = [];
  const params = [];

  if (product_id) {
    where.push(`p.\`${meta.productId}\` = ?`);
    params.push(product_id);
  }

  if (category_id && meta.categoryId) {
    where.push(`p.\`${meta.categoryId}\` = ?`);
    params.push(category_id);
  }

  if (brand_id && meta.brandId) {
    where.push(`p.\`${meta.brandId}\` = ?`);
    params.push(brand_id);
  }

  if (status && meta.status) {
    where.push(`p.\`${meta.status}\` = ?`);
    params.push(status);
  }

  if (low_stock === "true" && meta.canJoinVariants) {
    where.push(`COALESCE(va.low_stock_count, 0) > 0`);
  }

  if (search) {
    const searchFields = [
      meta.productName && `p.\`${meta.productName}\` LIKE ?`,
      meta.sku && `p.\`${meta.sku}\` LIKE ?`,
      meta.barcode && `p.\`${meta.barcode}\` LIKE ?`,
      meta.hsnCode && `p.\`${meta.hsnCode}\` LIKE ?`,
      meta.canJoinCategory && meta.categoryName && `c.\`${meta.categoryName}\` LIKE ?`,
      meta.canJoinBrand && meta.brandName && `b.\`${meta.brandName}\` LIKE ?`,
    ].filter(Boolean);

    if (searchFields.length) {
      where.push(`(${searchFields.join(" OR ")})`);
      const keyword = `%${search}%`;
      searchFields.forEach(() => params.push(keyword));
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const selectFields = [
    selectColumn("p", meta.productId, "id"),
    selectColumn("p", meta.productName, "product_name"),
    selectColumn("p", meta.sku, "sku"),
    selectColumn("p", meta.barcode, "barcode"),
    selectColumn("p", meta.hsnCode, "hsn_code"),
    selectColumn("p", meta.categoryId, "category_id"),
    selectColumn("p", meta.subCategoryId, "sub_category_id"),
    selectColumn("p", meta.brandId, "brand_id"),
    selectColumn("p", meta.unitId, "unit_id"),
    selectColumn("p", meta.status, "status", "'active'"),
    selectColumn("p", meta.createdAt, "created_at"),

    meta.canJoinCategory ? selectColumn("c", meta.categoryName, "category_name") : "NULL AS category_name",
    meta.canJoinSubCategory ? selectColumn("sc", meta.subCategoryName, "sub_category_name") : "NULL AS sub_category_name",
    meta.canJoinBrand ? selectColumn("b", meta.brandName, "brand_name") : "NULL AS brand_name",
    meta.canJoinUnit ? selectColumn("u", meta.unitName, "unit_name") : "NULL AS unit_name",

    meta.canJoinVariants ? "COALESCE(va.variant_count, 0) AS variant_count" : "0 AS variant_count",
    meta.canJoinVariants ? "COALESCE(va.active_variant_count, 0) AS active_variant_count" : "0 AS active_variant_count",
    meta.canJoinVariants ? "COALESCE(va.total_stock, 0) AS total_stock" : "0 AS total_stock",
    meta.canJoinVariants ? "COALESCE(va.low_stock_count, 0) AS low_stock_count" : "0 AS low_stock_count",

    meta.canJoinPricing && meta.sellingPrice ? "COALESCE(pa.pricing_count, 0) AS pricing_count" : "0 AS pricing_count",
    meta.canJoinPricing && meta.sellingPrice ? "COALESCE(pa.min_selling_price, 0) AS min_selling_price" : "0 AS min_selling_price",
    meta.canJoinPricing && meta.sellingPrice ? "COALESCE(pa.max_selling_price, 0) AS max_selling_price" : "0 AS max_selling_price",

    meta.canJoinReviews && meta.reviewRating ? "COALESCE(ra.review_count, 0) AS review_count" : "0 AS review_count",
    meta.canJoinReviews && meta.reviewRating ? "COALESCE(ra.average_rating, 0) AS average_rating" : "0 AS average_rating",

    meta.canJoinImages && meta.imagePath ? "COALESCE(ia.image_count, 0) AS image_count" : "0 AS image_count",
    meta.canJoinImages && meta.imagePath ? "ia.primary_image AS primary_image" : "NULL AS primary_image",
  ];

  const sql = `
    SELECT
      ${selectFields.join(",\n      ")}
    FROM ${PRODUCT_TABLE} p
    ${joins.join("\n")}
    ${whereSql}
    ORDER BY p.\`${meta.productId}\` DESC
  `;

  return { sql, params };
};

exports.getProductReports = async (req, res) => {
  try {
    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const { sql, params } = buildReportQuery(meta, req.query);
    const [reports] = await db.query(sql, params);

    res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get product reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product reports",
      error: error.message,
    });
  }
};

exports.getProductReportById = async (req, res) => {
  try {
    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const { sql, params } = buildReportQuery(meta, {
      ...req.query,
      product_id: req.params.id,
    });

    const [reports] = await db.query(sql, params);

    if (!reports.length) {
      return res.status(404).json({
        success: false,
        message: "Product report not found",
      });
    }

    res.json({
      success: true,
      report: reports[0],
    });
  } catch (error) {
    console.error("Get product report by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product report",
      error: error.message,
    });
  }
};

exports.getProductsReport = async (req, res) => {
  try {
    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;
    const { sql, params } = buildReportQuery(meta, req.query);
    const [reports] = await db.query(sql, params);
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch products report", error: error.message });
  }
};

exports.getStockSettingsReport = async (req, res) => {
  try {
    const productColumns = await getColumns(PRODUCT_TABLE);
    const minStockLevel = firstColumn(productColumns, ["min_stock_level", "minimum_stock_level"]);
    const reorderLevel = firstColumn(productColumns, ["reorder_level", "reorder_point"]);
    const shelfLife = firstColumn(productColumns, ["shelf_life_days", "shelf_life", "expiry_days"]);
    const batchTracking = firstColumn(productColumns, ["is_batch_tracking", "batch_tracking"]);
    const expiryTracking = firstColumn(productColumns, ["is_expiry_tracking", "expiry_tracking"]);
    const productName = firstColumn(productColumns, ["product_name", "name", "title", "item_name"]);
    const sku = firstColumn(productColumns, ["sku", "product_sku"]);
    const status = firstColumn(productColumns, ["status"]);
    const createdAt = firstColumn(productColumns, ["created_at"]);

    const select = [
      `p.id`,
      productName ? `p.\`${productName}\` AS product_name` : `NULL AS product_name`,
      sku ? `p.\`${sku}\` AS sku` : `NULL AS sku`,
      status ? `p.\`${status}\` AS status` : `'active' AS status`,
      minStockLevel ? `p.\`${minStockLevel}\` AS min_stock_level` : `NULL AS min_stock_level`,
      reorderLevel ? `p.\`${reorderLevel}\` AS reorder_level` : `NULL AS reorder_level`,
      shelfLife ? `p.\`${shelfLife}\` AS shelf_life_days` : `NULL AS shelf_life_days`,
      batchTracking ? `p.\`${batchTracking}\` AS is_batch_tracking` : `0 AS is_batch_tracking`,
      expiryTracking ? `p.\`${expiryTracking}\` AS is_expiry_tracking` : `0 AS is_expiry_tracking`,
      createdAt ? `p.\`${createdAt}\` AS created_at` : `NULL AS created_at`,
    ];

    const [reports] = await db.query(`SELECT ${select.join(", ")} FROM ${PRODUCT_TABLE} p ORDER BY p.id DESC`);
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stock settings report", error: error.message });
  }
};

exports.getPricingReport = async (req, res) => {
  try {
    const productColumns = await getColumns(PRODUCT_TABLE);
    const pricingColumns = await getColumns(PRICING_TABLE);
    if (!pricingColumns.length) return res.json({ success: true, count: 0, reports: [] });

    const productName = firstColumn(productColumns, ["product_name", "name", "title", "item_name"]);
    const sku = firstColumn(productColumns, ["sku", "product_sku"]);
    const sellingPrice = firstColumn(pricingColumns, ["selling_price", "sale_price", "price"]);
    const priceType = firstColumn(pricingColumns, ["price_type", "pricing_type", "type"]);
    const minQty = firstColumn(pricingColumns, ["min_qty", "minimum_qty"]);
    const effectiveFrom = firstColumn(pricingColumns, ["effective_from", "start_date", "valid_from"]);
    const effectiveTo = firstColumn(pricingColumns, ["effective_to", "end_date", "valid_to"]);
    const pricingStatus = firstColumn(pricingColumns, ["status"]);

    const select = [
      `pp.id`,
      `pp.product_id`,
      productName ? `p.\`${productName}\` AS product_name` : `NULL AS product_name`,
      sku ? `p.\`${sku}\` AS product_sku` : `NULL AS product_sku`,
      priceType ? `pp.\`${priceType}\` AS price_type` : `NULL AS price_type`,
      sellingPrice ? `pp.\`${sellingPrice}\` AS selling_price` : `0 AS selling_price`,
      minQty ? `pp.\`${minQty}\` AS min_qty` : `NULL AS min_qty`,
      effectiveFrom ? `pp.\`${effectiveFrom}\` AS effective_from` : `NULL AS effective_from`,
      effectiveTo ? `pp.\`${effectiveTo}\` AS effective_to` : `NULL AS effective_to`,
      pricingStatus ? `pp.\`${pricingStatus}\` AS status` : `'active' AS status`,
      `pp.created_at`,
    ];

    const { search = "", product_id = "", status = "" } = req.query;
    const where = [];
    const params = [];
    if (product_id) { where.push(`pp.product_id = ?`); params.push(product_id); }
    if (status && pricingStatus) { where.push(`pp.\`${pricingStatus}\` = ?`); params.push(status); }
    if (search && productName) { where.push(`p.\`${productName}\` LIKE ?`); params.push(`%${search}%`); }

    const [reports] = await db.query(
      `SELECT ${select.join(", ")} FROM ${PRICING_TABLE} pp LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pp.product_id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY pp.id DESC`,
      params
    );
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch pricing report", error: error.message });
  }
};

exports.getVariantsReport = async (req, res) => {
  try {
    const variantColumns = await getColumns(VARIANT_TABLE);
    const productColumns = await getColumns(PRODUCT_TABLE);
    if (!variantColumns.length) return res.json({ success: true, count: 0, reports: [] });

    const productName = firstColumn(productColumns, ["product_name", "name", "title", "item_name"]);
    const variantName = firstColumn(variantColumns, ["variant_name", "name", "title"]);
    const variantSku = firstColumn(variantColumns, ["sku", "variant_sku"]);
    const variantStatus = firstColumn(variantColumns, ["status"]);
    const variantStock = firstColumn(variantColumns, ["stock_qty", "current_stock", "qty", "quantity"]);
    const variantMinStock = firstColumn(variantColumns, ["min_stock_qty", "minimum_stock", "min_qty"]);
    const price = firstColumn(variantColumns, ["selling_price", "sale_price", "price"]);
    const purchasePrice = firstColumn(variantColumns, ["purchase_price", "cost_price"]);

    const select = [
      `pv.id`,
      `pv.product_id`,
      productName ? `p.\`${productName}\` AS product_name` : `NULL AS product_name`,
      variantName ? `pv.\`${variantName}\` AS variant_name` : `NULL AS variant_name`,
      variantSku ? `pv.\`${variantSku}\` AS sku` : `NULL AS sku`,
      variantStatus ? `pv.\`${variantStatus}\` AS status` : `'active' AS status`,
      variantStock ? `pv.\`${variantStock}\` AS stock_qty` : `0 AS stock_qty`,
      variantMinStock ? `pv.\`${variantMinStock}\` AS min_stock_qty` : `0 AS min_stock_qty`,
      price ? `pv.\`${price}\` AS selling_price` : `0 AS selling_price`,
      purchasePrice ? `pv.\`${purchasePrice}\` AS purchase_price` : `0 AS purchase_price`,
      `pv.created_at`,
    ];

    const { search = "", product_id = "", status = "" } = req.query;
    const where = [];
    const params = [];
    if (product_id) { where.push(`pv.product_id = ?`); params.push(product_id); }
    if (status && variantStatus) { where.push(`pv.\`${variantStatus}\` = ?`); params.push(status); }
    if (search && (variantName || productName)) {
      const fields = [variantName && `pv.\`${variantName}\` LIKE ?`, productName && `p.\`${productName}\` LIKE ?`].filter(Boolean);
      where.push(`(${fields.join(" OR ")})`);
      fields.forEach(() => params.push(`%${search}%`));
    }

    const [reports] = await db.query(
      `SELECT ${select.join(", ")} FROM ${VARIANT_TABLE} pv LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pv.product_id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY pv.id DESC`,
      params
    );
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch variants report", error: error.message });
  }
};

exports.getReviewsReport = async (req, res) => {
  try {
    const reviewColumns = await getColumns(REVIEW_TABLE);
    const productColumns = await getColumns(PRODUCT_TABLE);
    const customerColumns = await getColumns("customers");
    if (!reviewColumns.length) return res.json({ success: true, count: 0, reports: [] });

    const productName = firstColumn(productColumns, ["product_name", "name", "title", "item_name"]);
    const rating = firstColumn(reviewColumns, ["rating", "score", "star_rating"]);
    const reviewText = firstColumn(reviewColumns, ["review", "comment", "feedback", "description"]);
    const reviewStatus = firstColumn(reviewColumns, ["status"]);
    const customerId = firstColumn(reviewColumns, ["customer_id", "user_id"]);
    const customerName = customerId ? firstColumn(customerColumns, ["customer_name", "name", "full_name", "business_name", "contact_person"]) : null;

    const select = [
      `r.id`,
      `r.product_id`,
      productName ? `p.\`${productName}\` AS product_name` : `NULL AS product_name`,
      customerId ? `r.\`${customerId}\` AS customer_id` : `NULL AS customer_id`,
      customerName ? `c.\`${customerName}\` AS customer_name` : `NULL AS customer_name`,
      rating ? `r.\`${rating}\` AS rating` : `0 AS rating`,
      reviewText ? `r.\`${reviewText}\` AS review` : `NULL AS review`,
      reviewStatus ? `r.\`${reviewStatus}\` AS status` : `'pending' AS status`,
      `r.created_at`,
    ];

    const { search = "", product_id = "", status = "" } = req.query;
    const where = [];
    const params = [];
    if (product_id) { where.push(`r.product_id = ?`); params.push(product_id); }
    if (status && reviewStatus) { where.push(`r.\`${reviewStatus}\` = ?`); params.push(status); }
    if (search && productName) { where.push(`p.\`${productName}\` LIKE ?`); params.push(`%${search}%`); }

    const customerJoin = customerId && customerColumns.length
      ? `LEFT JOIN customers c ON c.id = r.\`${customerId}\`` : "";

    const [reports] = await db.query(
      `SELECT ${select.join(", ")} FROM ${REVIEW_TABLE} r LEFT JOIN ${PRODUCT_TABLE} p ON p.id = r.product_id ${customerJoin} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch reviews report", error: error.message });
  }
};

exports.getProductReportSummary = async (req, res) => {
  try {
    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const { sql, params } = buildReportQuery(meta, req.query);
    const [reports] = await db.query(sql, params);

    const summary = reports.reduce(
      (acc, item) => {
        acc.total_products += 1;

        if (item.status === "active") acc.active_products += 1;

        acc.total_variants += Number(item.variant_count || 0);
        acc.total_images += Number(item.image_count || 0);
        acc.total_pricing += Number(item.pricing_count || 0);
        acc.total_reviews += Number(item.review_count || 0);
        acc.total_stock += Number(item.total_stock || 0);
        acc.low_stock_products += Number(item.low_stock_count || 0) > 0 ? 1 : 0;

        acc.total_rating += Number(item.average_rating || 0);
        return acc;
      },
      {
        total_products: 0,
        active_products: 0,
        total_variants: 0,
        total_images: 0,
        total_pricing: 0,
        total_reviews: 0,
        total_stock: 0,
        low_stock_products: 0,
        total_rating: 0,
        average_rating: 0,
      }
    );

    summary.average_rating =
      reports.length > 0
        ? Number((summary.total_rating / reports.length).toFixed(1))
        : 0;

    delete summary.total_rating;

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Get product report summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product report summary",
      error: error.message,
    });
  }
};