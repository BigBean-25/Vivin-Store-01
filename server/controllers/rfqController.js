const db = require("../config/db");

const generateRfqNumber = () => `RFQ-${Date.now().toString().slice(-8)}`;

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
};

const getUserId = (req) => req.user?.id || req.user?.user_id || null;

const buildWhereClause = (filters = {}) => {
  const conditions = [];
  const values = [];

  if (filters.search) {
    conditions.push("(r.rfq_number LIKE ? OR r.title LIKE ? OR r.remarks LIKE ?)");
    const search = `%${filters.search}%`;
    values.push(search, search, search);
  }

  if (filters.status) {
    conditions.push("r.status = ?");
    values.push(filters.status);
  }

  if (filters.from_date) {
    conditions.push("r.required_date >= ?");
    values.push(filters.from_date);
  }

  if (filters.to_date) {
    conditions.push("r.required_date <= ?");
    values.push(filters.to_date);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
};

exports.getRfqs = async (req, res) => {
  try {
    const { search = "", status = "", from_date = "", to_date = "" } = req.query;
    const { whereSql, values } = buildWhereClause({
      search: search.trim(),
      status,
      from_date,
      to_date,
    });

    const [rfqs] = await db.query(
      `
        SELECT
          r.id,
          r.rfq_number,
          r.title,
          r.requested_by,
          r.required_date,
          r.status,
          r.remarks,
          r.created_at,
          r.updated_at,
          COUNT(ri.id) AS item_count,
          COALESCE(SUM(ri.quantity), 0) AS total_quantity
        FROM rfqs r
        LEFT JOIN rfq_items ri ON r.id = ri.rfq_id
        ${whereSql}
        GROUP BY r.id
        ORDER BY r.id DESC
      `,
      values
    );

    res.json({ success: true, count: rfqs.length, rfqs, data: rfqs });
  } catch (error) {
    console.error("Get RFQs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch RFQs", error: error.message });
  }
};

exports.getRfqSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_rfqs,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
        SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) AS quoted_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
      FROM rfqs
    `);

    const [qtyRows] = await db.query("SELECT COALESCE(SUM(quantity), 0) AS total_quantity FROM rfq_items");

    res.json({
      success: true,
      summary: {
        ...(rows[0] || {}),
        ...(qtyRows[0] || {}),
      },
    });
  } catch (error) {
    console.error("Get RFQ summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch RFQ summary", error: error.message });
  }
};

exports.getRfqById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rfqs] = await db.query(
      `
        SELECT id, rfq_number, title, requested_by, required_date, status, remarks, created_at, updated_at
        FROM rfqs
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (rfqs.length === 0) {
      return res.status(404).json({ success: false, message: "RFQ not found" });
    }

    const [items] = await db.query(
      `
        SELECT
          ri.id,
          ri.rfq_id,
          ri.product_id,
          p.name AS product_name,
          p.product_code,
          p.sku,
          ri.quantity,
          ri.unit_id,
          u.name AS unit_name,
          ri.remarks,
          ri.created_at
        FROM rfq_items ri
        LEFT JOIN products p ON ri.product_id = p.id
        LEFT JOIN units u ON ri.unit_id = u.id
        WHERE ri.rfq_id = ?
        ORDER BY ri.id ASC
      `,
      [id]
    );

    res.json({ success: true, rfq: { ...rfqs[0], items }, data: { ...rfqs[0], items } });
  } catch (error) {
    console.error("Get RFQ by id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch RFQ", error: error.message });
  }
};

exports.createRfq = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { title, required_date, status = "draft", remarks, items = [] } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "RFQ title is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one RFQ item is required" });
    }

    await connection.beginTransaction();

    const rfqNumber = generateRfqNumber();

    const [result] = await connection.query(
      `
        INSERT INTO rfqs (rfq_number, title, requested_by, required_date, status, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [rfqNumber, title, getUserId(req), cleanValue(required_date), cleanValue(status) || "draft", cleanValue(remarks)]
    );

    const rfqId = result.insertId;

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = toNumber(item.quantity);

      if (!productId) throw new Error("Product is required in RFQ item");
      if (quantity <= 0) throw new Error("Quantity must be greater than 0 in RFQ item");

      await connection.query(
        `
          INSERT INTO rfq_items (rfq_id, product_id, quantity, unit_id, remarks)
          VALUES (?, ?, ?, ?, ?)
        `,
        [rfqId, productId, quantity, cleanValue(item.unit_id), cleanValue(item.remarks)]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "RFQ created successfully",
      rfq: { id: rfqId, rfq_number: rfqNumber },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create RFQ error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create RFQ" });
  } finally {
    connection.release();
  }
};

exports.updateRfq = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { title, required_date, status, remarks, items = [] } = req.body;

    await connection.beginTransaction();

    const [existingRows] = await connection.query("SELECT * FROM rfqs WHERE id = ? LIMIT 1", [id]);

    if (existingRows.length === 0) throw new Error("RFQ not found");

    const existing = existingRows[0];

    if (["closed", "cancelled"].includes(existing.status)) {
      throw new Error("Closed or cancelled RFQ cannot be edited");
    }

    await connection.query(
      `
        UPDATE rfqs
        SET title = ?, required_date = ?, status = ?, remarks = ?
        WHERE id = ?
      `,
      [
        title || existing.title,
        required_date === undefined ? existing.required_date : cleanValue(required_date),
        status || existing.status,
        remarks === undefined ? existing.remarks : cleanValue(remarks),
        id,
      ]
    );

    if (Array.isArray(items) && items.length > 0) {
      await connection.query("DELETE FROM rfq_items WHERE rfq_id = ?", [id]);

      for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = toNumber(item.quantity);

        if (!productId) throw new Error("Product is required in RFQ item");
        if (quantity <= 0) throw new Error("Quantity must be greater than 0 in RFQ item");

        await connection.query(
          `
            INSERT INTO rfq_items (rfq_id, product_id, quantity, unit_id, remarks)
            VALUES (?, ?, ?, ?, ?)
          `,
          [id, productId, quantity, cleanValue(item.unit_id), cleanValue(item.remarks)]
        );
      }
    }

    await connection.commit();

    res.json({ success: true, message: "RFQ updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Update RFQ error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update RFQ" });
  } finally {
    connection.release();
  }
};

exports.updateRfqStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatus = ["draft", "sent", "quoted", "closed", "cancelled"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid RFQ status" });
    }

    const [result] = await db.query("UPDATE rfqs SET status = ? WHERE id = ?", [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "RFQ not found" });
    }

    res.json({ success: true, message: "RFQ status updated successfully" });
  } catch (error) {
    console.error("Update RFQ status error:", error);
    res.status(500).json({ success: false, message: "Failed to update RFQ status", error: error.message });
  }
};

exports.deleteRfq = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [rfqs] = await connection.query("SELECT id, status FROM rfqs WHERE id = ? LIMIT 1", [id]);

    if (rfqs.length === 0) throw new Error("RFQ not found");
    if (["closed", "quoted"].includes(rfqs[0].status)) throw new Error("Closed or quoted RFQ cannot be deleted");

    await connection.query("DELETE FROM rfq_items WHERE rfq_id = ?", [id]);
    await connection.query("DELETE FROM rfqs WHERE id = ?", [id]);

    await connection.commit();

    res.json({ success: true, message: "RFQ deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Delete RFQ error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete RFQ" });
  } finally {
    connection.release();
  }
};
