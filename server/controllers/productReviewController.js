const db = require("../config/db");

const TABLE = "product_reviews";
const PRODUCT_TABLE = "products";
const VARIANT_TABLE = "product_variants";
const CUSTOMER_TABLE = "customers";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeStatus = (value) => {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
};

const normalizeBoolean = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return 1;
  }

  return 0;
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
  const customerColumns = await getColumns(CUSTOMER_TABLE);

  const variantId = firstColumn(columns, [
    "variant_id",
    "product_variant_id",
  ]);

  const customerId = firstColumn(columns, [
    "customer_id",
    "user_id",
    "client_id",
  ]);

  const customerPrimaryId = firstColumn(customerColumns, ["id"]);

  return {
    columns,

    id: firstColumn(columns, ["id"]),
    productId: firstColumn(columns, ["product_id"]),
    variantId,
    customerId,

    orderId: firstColumn(columns, ["order_id", "sale_id", "invoice_id"]),

    rating: firstColumn(columns, [
      "rating",
      "score",
      "star_rating",
      "rating_value",
    ]),

    reviewTitle: firstColumn(columns, [
      "review_title",
      "title",
      "subject",
    ]),

    reviewText: firstColumn(columns, [
      "review",
      "comment",
      "feedback",
      "description",
      "remarks",
      "notes",
    ]),

    reviewDate: firstColumn(columns, [
      "review_date",
      "rating_date",
      "date",
    ]),

    isApproved: firstColumn(columns, [
      "is_approved",
      "approved",
      "approval_status",
    ]),

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

    customerPrimaryId,

    customerName: customerId
      ? firstColumn(customerColumns, [
          "customer_name",
          "name",
          "full_name",
          "business_name",
          "company_name",
          "contact_person",
        ])
      : null,

    customerPhone: customerId
      ? firstColumn(customerColumns, ["phone", "mobile", "contact_number"])
      : null,

    customerEmail: customerId
      ? firstColumn(customerColumns, ["email", "email_id"])
      : null,

    canJoinVariant: Boolean(variantId && variantColumns.length),
    canJoinCustomer: Boolean(customerId && customerPrimaryId),
  };
};

const validateMeta = (meta, res) => {
  if (!meta.id || !meta.productId) {
    res.status(500).json({
      success: false,
      message: "product_reviews table must have id and product_id columns",
    });

    return false;
  }

  return true;
};

const getSelectFields = (meta) => [
  selectColumn("pr", meta.id, "id"),
  selectColumn("pr", meta.productId, "product_id"),
  selectColumn("pr", meta.variantId, "variant_id"),
  selectColumn("pr", meta.customerId, "customer_id"),
  selectColumn("pr", meta.orderId, "order_id"),
  selectColumn("pr", meta.rating, "rating", "0"),
  selectColumn("pr", meta.reviewTitle, "review_title"),
  selectColumn("pr", meta.reviewText, "review"),
  selectColumn("pr", meta.reviewDate, "review_date"),
  selectColumn("pr", meta.isApproved, "is_approved", "0"),
  selectColumn("pr", meta.status, "status", "'active'"),
  selectColumn("pr", meta.createdAt, "created_at"),
  selectColumn("pr", meta.updatedAt, "updated_at"),
  selectColumn("p", meta.productName, "product_name"),
  selectColumn("p", meta.productSku, "product_sku"),
  meta.canJoinVariant
    ? selectColumn("pv", meta.variantName, "variant_name")
    : "NULL AS variant_name",
  meta.canJoinVariant
    ? selectColumn("pv", meta.variantSku, "variant_sku")
    : "NULL AS variant_sku",
  meta.canJoinCustomer
    ? selectColumn("c", meta.customerName, "customer_name")
    : "NULL AS customer_name",
  meta.canJoinCustomer
    ? selectColumn("c", meta.customerPhone, "customer_phone")
    : "NULL AS customer_phone",
  meta.canJoinCustomer
    ? selectColumn("c", meta.customerEmail, "customer_email")
    : "NULL AS customer_email",
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.productId, payload.product_id],
    [meta.variantId, payload.variant_id],
    [meta.customerId, payload.customer_id],
    [meta.orderId, payload.order_id],
    [meta.rating, payload.rating],
    [meta.reviewTitle, payload.review_title],
    [meta.reviewText, payload.review],
    [meta.reviewDate, payload.review_date],
    [meta.isApproved, payload.is_approved],
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
    [meta.customerId, payload.customer_id],
    [meta.orderId, payload.order_id],
    [meta.rating, payload.rating],
    [meta.reviewTitle, payload.review_title],
    [meta.reviewText, payload.review],
    [meta.reviewDate, payload.review_date],
    [meta.isApproved, payload.is_approved],
    [meta.status, payload.status],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return { sets, values };
};

exports.getProductReviewSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(id) AS total_reviews,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_reviews,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_reviews,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_reviews,
        ROUND(AVG(rating), 2) AS average_rating
      FROM product_reviews
    `);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch review summary", error: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const {
      search = "",
      product_id = "",
      variant_id = "",
      customer_id = "",
      status = "",
      min_rating = "",
      max_rating = "",
    } = req.query;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const where = [];
    const params = [];

    if (product_id) {
      where.push(`pr.\`${meta.productId}\` = ?`);
      params.push(product_id);
    }

    if (variant_id && meta.variantId) {
      where.push(`pr.\`${meta.variantId}\` = ?`);
      params.push(variant_id);
    }

    if (customer_id && meta.customerId) {
      where.push(`pr.\`${meta.customerId}\` = ?`);
      params.push(customer_id);
    }

    if (status && meta.status) {
      where.push(`pr.\`${meta.status}\` = ?`);
      params.push(normalizeStatus(status));
    }

    if (min_rating && meta.rating) {
      where.push(`pr.\`${meta.rating}\` >= ?`);
      params.push(toNumber(min_rating));
    }

    if (max_rating && meta.rating) {
      where.push(`pr.\`${meta.rating}\` <= ?`);
      params.push(toNumber(max_rating));
    }

    if (search) {
      const searchFields = [
        meta.productName && `p.\`${meta.productName}\` LIKE ?`,
        meta.productSku && `p.\`${meta.productSku}\` LIKE ?`,
        meta.canJoinVariant && meta.variantName && `pv.\`${meta.variantName}\` LIKE ?`,
        meta.canJoinVariant && meta.variantSku && `pv.\`${meta.variantSku}\` LIKE ?`,
        meta.canJoinCustomer && meta.customerName && `c.\`${meta.customerName}\` LIKE ?`,
        meta.reviewTitle && `pr.\`${meta.reviewTitle}\` LIKE ?`,
        meta.reviewText && `pr.\`${meta.reviewText}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);

        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const joinVariantSql = meta.canJoinVariant
      ? `LEFT JOIN ${VARIANT_TABLE} pv ON pv.id = pr.\`${meta.variantId}\``
      : "";

    const joinCustomerSql = meta.canJoinCustomer
      ? `LEFT JOIN ${CUSTOMER_TABLE} c ON c.\`${meta.customerPrimaryId}\` = pr.\`${meta.customerId}\``
      : "";

    const [reviews] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} pr
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pr.\`${meta.productId}\`
      ${joinVariantSql}
      ${joinCustomerSql}
      ${whereSql}
      ORDER BY pr.\`${meta.id}\` DESC
      `,
      params
    );

    res.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get product reviews error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews",
      error: error.message,
    });
  }
};

exports.getProductReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const joinVariantSql = meta.canJoinVariant
      ? `LEFT JOIN ${VARIANT_TABLE} pv ON pv.id = pr.\`${meta.variantId}\``
      : "";

    const joinCustomerSql = meta.canJoinCustomer
      ? `LEFT JOIN ${CUSTOMER_TABLE} c ON c.\`${meta.customerPrimaryId}\` = pr.\`${meta.customerId}\``
      : "";

    const [[review]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} pr
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = pr.\`${meta.productId}\`
      ${joinVariantSql}
      ${joinCustomerSql}
      WHERE pr.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Product review not found",
      });
    }

    res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("Get product review by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product review",
      error: error.message,
    });
  }
};

exports.createProductReview = async (req, res) => {
  try {
    const {
      product_id,
      variant_id = "",
      customer_id = "",
      order_id = "",
      rating = 0,
      review_title = "",
      review = "",
      review_date = "",
      is_approved = 0,
      status = "pending",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    if (meta.rating && Number(rating || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
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

    if (customer_id && meta.canJoinCustomer) {
      const [[customer]] = await db.query(
        `
        SELECT \`${meta.customerPrimaryId}\` AS id
        FROM ${CUSTOMER_TABLE}
        WHERE \`${meta.customerPrimaryId}\` = ?
        LIMIT 1
        `,
        [customer_id]
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
    }

    const payload = {
      product_id,
      variant_id: cleanValue(variant_id),
      customer_id: cleanValue(customer_id),
      order_id: cleanValue(order_id),
      rating: toNumber(rating),
      review_title: cleanValue(review_title),
      review: cleanValue(review),
      review_date: cleanValue(review_date),
      is_approved: normalizeBoolean(is_approved),
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
      message: "Product review created successfully",
      review_id: result.insertId,
    });
  } catch (error) {
    console.error("Create product review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product review",
      error: error.message,
    });
  }
};

exports.updateProductReview = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      product_id,
      variant_id = "",
      customer_id = "",
      order_id = "",
      rating = 0,
      review_title = "",
      review = "",
      review_date = "",
      is_approved = 0,
      status = "pending",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    if (meta.rating && Number(rating || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
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
        message: "Product review not found",
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

    if (customer_id && meta.canJoinCustomer) {
      const [[customer]] = await db.query(
        `
        SELECT \`${meta.customerPrimaryId}\` AS id
        FROM ${CUSTOMER_TABLE}
        WHERE \`${meta.customerPrimaryId}\` = ?
        LIMIT 1
        `,
        [customer_id]
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
    }

    const payload = {
      product_id,
      variant_id: cleanValue(variant_id),
      customer_id: cleanValue(customer_id),
      order_id: cleanValue(order_id),
      rating: toNumber(rating),
      review_title: cleanValue(review_title),
      review: cleanValue(review),
      review_date: cleanValue(review_date),
      is_approved: normalizeBoolean(is_approved),
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
      message: "Product review updated successfully",
    });
  } catch (error) {
    console.error("Update product review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update product review",
      error: error.message,
    });
  }
};

exports.updateProductReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be pending, approved, or rejected" });
    }

    const [result] = await db.query(`UPDATE product_reviews SET status = ? WHERE id = ?`, [status, id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Product review not found" });
    }

    res.json({ success: true, message: `Review ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update review status", error: error.message });
  }
};

exports.deleteProductReview = async (req, res) => {
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
        message: "Product review not found",
      });
    }

    res.json({
      success: true,
      message: "Product review deleted successfully",
    });
  } catch (error) {
    console.error("Delete product review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete product review",
      error: error.message,
    });
  }
};