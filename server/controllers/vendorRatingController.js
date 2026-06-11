const db = require("../config/db");

const TABLE = "vendor_ratings";
const VENDOR_TABLE = "vendors";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeStatus = (value) => {
  if (value === "inactive" || value === "rejected" || value === "pending") {
    return value;
  }

  return "active";
};

const normalizeRating = (value) => {
  const rating = toNumber(value, 0);

  if (rating < 0) return 0;
  if (rating > 5) return 5;

  return rating;
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
  const vendorColumns = await getColumns(VENDOR_TABLE);

  return {
    columns,

    id: firstColumn(columns, ["id"]),
    vendorId: firstColumn(columns, ["vendor_id"]),

    rating: firstColumn(columns, [
      "rating",
      "overall_rating",
      "score",
      "rating_value",
    ]),

    qualityRating: firstColumn(columns, [
      "quality_rating",
      "product_quality_rating",
      "quality_score",
    ]),

    deliveryRating: firstColumn(columns, [
      "delivery_rating",
      "delivery_score",
      "timely_delivery_rating",
    ]),

    priceRating: firstColumn(columns, [
      "price_rating",
      "pricing_rating",
      "price_score",
    ]),

    serviceRating: firstColumn(columns, [
      "service_rating",
      "support_rating",
      "service_score",
    ]),

    review: firstColumn(columns, [
      "review",
      "feedback",
      "remarks",
      "notes",
      "comment",
    ]),

    ratedBy: firstColumn(columns, [
      "rated_by",
      "reviewed_by",
      "created_by",
      "user_name",
    ]),

    ratingDate: firstColumn(columns, [
      "rating_date",
      "review_date",
      "date",
    ]),

    status: firstColumn(columns, ["status"]),
    createdAt: firstColumn(columns, ["created_at"]),
    updatedAt: firstColumn(columns, ["updated_at"]),

    vendorName: firstColumn(vendorColumns, [
      "business_name",
      "vendor_name",
      "name",
      "company_name",
    ]),

    vendorCode: firstColumn(vendorColumns, ["vendor_code", "code"]),
  };
};

const validateMeta = (meta, res) => {
  if (!meta.id || !meta.vendorId) {
    res.status(500).json({
      success: false,
      message: "vendor_ratings table must have id and vendor_id columns",
    });

    return false;
  }

  return true;
};

const getSelectFields = (meta) => [
  selectColumn("vr", meta.id, "id"),
  selectColumn("vr", meta.vendorId, "vendor_id"),
  selectColumn("vr", meta.rating, "rating", "0"),
  selectColumn("vr", meta.qualityRating, "quality_rating", "0"),
  selectColumn("vr", meta.deliveryRating, "delivery_rating", "0"),
  selectColumn("vr", meta.priceRating, "price_rating", "0"),
  selectColumn("vr", meta.serviceRating, "service_rating", "0"),
  selectColumn("vr", meta.review, "review"),
  selectColumn("vr", meta.ratedBy, "rated_by"),
  selectColumn("vr", meta.ratingDate, "rating_date"),
  selectColumn("vr", meta.status, "status", "'active'"),
  selectColumn("vr", meta.createdAt, "created_at"),
  selectColumn("vr", meta.updatedAt, "updated_at"),
  selectColumn("v", meta.vendorName, "vendor_name"),
  selectColumn("v", meta.vendorCode, "vendor_code"),
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.rating, payload.rating],
    [meta.qualityRating, payload.quality_rating],
    [meta.deliveryRating, payload.delivery_rating],
    [meta.priceRating, payload.price_rating],
    [meta.serviceRating, payload.service_rating],
    [meta.review, payload.review],
    [meta.ratedBy, payload.rated_by],
    [meta.ratingDate, payload.rating_date],
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
    [meta.vendorId, payload.vendor_id],
    [meta.rating, payload.rating],
    [meta.qualityRating, payload.quality_rating],
    [meta.deliveryRating, payload.delivery_rating],
    [meta.priceRating, payload.price_rating],
    [meta.serviceRating, payload.service_rating],
    [meta.review, payload.review],
    [meta.ratedBy, payload.rated_by],
    [meta.ratingDate, payload.rating_date],
    [meta.status, payload.status],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;

    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return { sets, values };
};

exports.getVendorRatings = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      status = "",
      min_rating = "",
      max_rating = "",
    } = req.query;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push(`vr.\`${meta.vendorId}\` = ?`);
      params.push(vendor_id);
    }

    if (status) {
      if (meta.status) {
        where.push(`vr.\`${meta.status}\` = ?`);
        params.push(normalizeStatus(status));
      } else if (status !== "active") {
        where.push("1 = 0");
      }
    }

    if (min_rating && meta.rating) {
      where.push(`vr.\`${meta.rating}\` >= ?`);
      params.push(normalizeRating(min_rating));
    }

    if (max_rating && meta.rating) {
      where.push(`vr.\`${meta.rating}\` <= ?`);
      params.push(normalizeRating(max_rating));
    }

    if (search) {
      const searchFields = [
        meta.vendorName && `v.\`${meta.vendorName}\` LIKE ?`,
        meta.vendorCode && `v.\`${meta.vendorCode}\` LIKE ?`,
        meta.review && `vr.\`${meta.review}\` LIKE ?`,
        meta.ratedBy && `vr.\`${meta.ratedBy}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);

        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [ratings] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vr
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vr.\`${meta.vendorId}\`
      ${whereSql}
      ORDER BY vr.\`${meta.id}\` DESC
      `,
      params
    );

    res.json({
      success: true,
      count: ratings.length,
      ratings,
    });
  } catch (error) {
    console.error("Get vendor ratings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor ratings",
      error: error.message,
    });
  }
};

exports.getVendorRatingById = async (req, res) => {
  try {
    const { id } = req.params;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const [[rating]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vr
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vr.\`${meta.vendorId}\`
      WHERE vr.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Vendor rating not found",
      });
    }

    res.json({
      success: true,
      rating,
    });
  } catch (error) {
    console.error("Get vendor rating by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor rating",
      error: error.message,
    });
  }
};

exports.createVendorRating = async (req, res) => {
  try {
    const {
      vendor_id,
      rating = 0,
      quality_rating = 0,
      delivery_rating = 0,
      price_rating = 0,
      service_rating = 0,
      review = "",
      rated_by = "",
      rating_date = "",
      status = "active",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    const finalRating = normalizeRating(rating);

    if (meta.rating && finalRating <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rating must be greater than 0",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
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

    const payload = {
      vendor_id,
      rating: finalRating,
      quality_rating: normalizeRating(quality_rating),
      delivery_rating: normalizeRating(delivery_rating),
      price_rating: normalizeRating(price_rating),
      service_rating: normalizeRating(service_rating),
      review: cleanValue(review),
      rated_by: cleanValue(rated_by),
      rating_date: cleanValue(rating_date) || new Date(),
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
      message: "Vendor rating created successfully",
      rating_id: result.insertId,
    });
  } catch (error) {
    console.error("Create vendor rating error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create vendor rating",
      error: error.message,
    });
  }
};

exports.updateVendorRating = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      rating = 0,
      quality_rating = 0,
      delivery_rating = 0,
      price_rating = 0,
      service_rating = 0,
      review = "",
      rated_by = "",
      rating_date = "",
      status = "active",
    } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    const finalRating = normalizeRating(rating);

    if (meta.rating && finalRating <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rating must be greater than 0",
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
        message: "Vendor rating not found",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
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

    const payload = {
      vendor_id,
      rating: finalRating,
      quality_rating: normalizeRating(quality_rating),
      delivery_rating: normalizeRating(delivery_rating),
      price_rating: normalizeRating(price_rating),
      service_rating: normalizeRating(service_rating),
      review: cleanValue(review),
      rated_by: cleanValue(rated_by),
      rating_date: cleanValue(rating_date) || new Date(),
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
      message: "Vendor rating updated successfully",
    });
  } catch (error) {
    console.error("Update vendor rating error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor rating",
      error: error.message,
    });
  }
};

exports.deleteVendorRating = async (req, res) => {
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
        message: "Vendor rating not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor rating deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor rating error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor rating",
      error: error.message,
    });
  }
};

exports.getVendorRatingSummary = async (req, res) => {
  try {
    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    const ratingExpr = meta.rating ? `vr.\`${meta.rating}\`` : "NULL";
    const statusExpr = meta.status ? `vr.\`${meta.status}\`` : "NULL";

    const [rows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_ratings,
        ${ratingExpr ? `AVG(${ratingExpr})` : "NULL"} AS average_rating,
        ${ratingExpr ? `MAX(${ratingExpr})` : "NULL"} AS highest_rating,
        ${ratingExpr ? `MIN(${ratingExpr})` : "NULL"} AS lowest_rating,
        SUM(CASE WHEN ${statusExpr ? `${statusExpr} = 'active'` : "1=1"} THEN 1 ELSE 0 END) AS active_count,
        COUNT(DISTINCT vr.\`${meta.vendorId}\`) AS rated_vendors
      FROM ${TABLE} vr
      `
    );

    const row = rows[0] || {};

    res.json({
      success: true,
      summary: {
        total_ratings: Number(row.total_ratings || 0),
        average_rating: row.average_rating !== null ? Number(Number(row.average_rating).toFixed(2)) : 0,
        highest_rating: row.highest_rating !== null ? Number(row.highest_rating) : 0,
        lowest_rating: row.lowest_rating !== null ? Number(row.lowest_rating) : 0,
        active_count: Number(row.active_count || 0),
        rated_vendors: Number(row.rated_vendors || 0),
      },
    });
  } catch (error) {
    console.error("Get vendor rating summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor rating summary",
      error: error.message,
    });
  }
};

exports.updateVendorRatingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const meta = await getMeta();
    if (!validateMeta(meta, res)) return;

    if (!meta.status) {
      return res.status(400).json({
        success: false,
        message: "Status column does not exist in vendor_ratings. Run the provided ALTER SQL to add it.",
      });
    }

    const [[existing]] = await db.query(
      `SELECT \`${meta.id}\` AS id FROM ${TABLE} WHERE \`${meta.id}\` = ? LIMIT 1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "Vendor rating not found" });
    }

    await db.query(
      `UPDATE ${TABLE} SET \`${meta.status}\` = ? WHERE \`${meta.id}\` = ?`,
      [normalizeStatus(status), id]
    );

    res.json({ success: true, message: "Vendor rating status updated successfully" });
  } catch (error) {
    console.error("Update vendor rating status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update vendor rating status",
      error: error.message,
    });
  }
};