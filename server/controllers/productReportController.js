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