const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const TABLE = "vendor_documents";
const VENDOR_TABLE = "vendors";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const VALID_STATUSES = ["active", "expired", "inactive", "rejected"];

const normalizeStatus = (value) => {
  if (VALID_STATUSES.includes(value)) return value;
  return "active";
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

const deleteLocalFile = (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;

  const filePath = path.join(__dirname, "..", fileUrl.replace("/uploads/", "uploads/"));

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const getMeta = async () => {
  const columns = await getColumns(TABLE);
  const vendorColumns = await getColumns(VENDOR_TABLE);

  return {
    columns,

    id: firstColumn(columns, ["id"]),
    vendorId: firstColumn(columns, ["vendor_id"]),

    documentType: firstColumn(columns, [
      "document_type",
      "doc_type",
      "type",
    ]),

    documentName: firstColumn(columns, [
      "document_name",
      "doc_name",
      "name",
      "title",
    ]),

    documentNumber: firstColumn(columns, [
      "document_number",
      "doc_number",
      "reference_number",
      "reference_no",
    ]),

    fileName: firstColumn(columns, [
      "file_name",
      "original_file_name",
      "original_name",
    ]),

    filePath: firstColumn(columns, [
      "file_path",
      "document_file",
      "file_url",
      "document_url",
      "url",
    ]),

    fileType: firstColumn(columns, [
      "file_type",
      "mime_type",
      "document_mime_type",
    ]),

    fileSize: firstColumn(columns, [
      "file_size",
      "size",
      "document_size",
    ]),

    issueDate: firstColumn(columns, [
      "issue_date",
      "issued_date",
      "valid_from",
    ]),

    expiryDate: firstColumn(columns, [
      "expiry_date",
      "expired_at",
      "valid_to",
    ]),

    status: firstColumn(columns, ["status", "verification_status"]),
    notes: firstColumn(columns, ["notes", "remarks"]),
    createdAt: firstColumn(columns, ["created_at", "uploaded_at"]),
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

const getSelectFields = (meta) => [
  selectColumn("vd", meta.id, "id"),
  selectColumn("vd", meta.vendorId, "vendor_id"),
  selectColumn("vd", meta.documentType, "document_type"),
  selectColumn("vd", meta.documentName, "document_name"),
  selectColumn("vd", meta.documentNumber, "document_number"),
  selectColumn("vd", meta.fileName, "file_name"),
  selectColumn("vd", meta.filePath, "file_path"),
  selectColumn("vd", meta.fileType, "file_type"),
  selectColumn("vd", meta.fileSize, "file_size"),
  selectColumn("vd", meta.issueDate, "issue_date"),
  selectColumn("vd", meta.expiryDate, "expiry_date"),
  selectColumn("vd", meta.status, "status", "'active'"),
  selectColumn("vd", meta.notes, "notes"),
  selectColumn("vd", meta.createdAt, "created_at"),
  selectColumn("vd", meta.updatedAt, "updated_at"),
  selectColumn("v", meta.vendorName, "vendor_name"),
  selectColumn("v", meta.vendorCode, "vendor_code"),
];

const buildInsert = (meta, payload) => {
  const fields = [];
  const placeholders = [];
  const values = [];

  const map = [
    [meta.vendorId, payload.vendor_id],
    [meta.documentType, payload.document_type],
    [meta.documentName, payload.document_name],
    [meta.documentNumber, payload.document_number],
    [meta.fileName, payload.file_name],
    [meta.filePath, payload.file_path],
    [meta.fileType, payload.file_type],
    [meta.fileSize, payload.file_size],
    [meta.issueDate, payload.issue_date],
    [meta.expiryDate, payload.expiry_date],
    [meta.status, payload.status],
    [meta.notes, payload.notes],
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
    [meta.documentType, payload.document_type],
    [meta.documentName, payload.document_name],
    [meta.documentNumber, payload.document_number],
    [meta.fileName, payload.file_name],
    [meta.filePath, payload.file_path],
    [meta.fileType, payload.file_type],
    [meta.fileSize, payload.file_size],
    [meta.issueDate, payload.issue_date],
    [meta.expiryDate, payload.expiry_date],
    [meta.status, payload.status],
    [meta.notes, payload.notes],
  ];

  map.forEach(([column, value]) => {
    if (!column) return;
    sets.push(`\`${column}\` = ?`);
    values.push(value);
  });

  return { sets, values };
};

exports.getVendorDocumentSummary = async (req, res) => {
  try {
    const meta = await getMeta();

    const countFields = [
      `COUNT(\`${meta.id}\`) AS total_documents`,
      meta.status ? `SUM(CASE WHEN \`${meta.status}\` = 'active'   THEN 1 ELSE 0 END) AS active_documents`   : `0 AS active_documents`,
      meta.status ? `SUM(CASE WHEN \`${meta.status}\` = 'expired'  THEN 1 ELSE 0 END) AS expired_documents`  : `0 AS expired_documents`,
      meta.status ? `SUM(CASE WHEN \`${meta.status}\` = 'inactive' THEN 1 ELSE 0 END) AS inactive_documents` : `0 AS inactive_documents`,
      meta.status ? `SUM(CASE WHEN \`${meta.status}\` = 'rejected' THEN 1 ELSE 0 END) AS rejected_documents` : `0 AS rejected_documents`,
      meta.expiryDate
        ? `SUM(CASE WHEN \`${meta.expiryDate}\` IS NOT NULL AND \`${meta.expiryDate}\` >= CURDATE() AND \`${meta.expiryDate}\` <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS expiring_soon`
        : `0 AS expiring_soon`,
    ].join(",\n      ");

    const [[summary]] = await db.query(`SELECT ${countFields} FROM ${TABLE}`);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor document summary", error: error.message });
  }
};

exports.getVendorDocuments = async (req, res) => {
  try {
    const {
      search = "",
      vendor_id = "",
      document_type = "",
      status = "",
    } = req.query;

    const meta = await getMeta();

    if (!meta.id || !meta.vendorId) {
      return res.status(500).json({
        success: false,
        message: "vendor_documents table must have id and vendor_id columns",
      });
    }

    const where = [];
    const params = [];

    if (vendor_id) {
      where.push(`vd.\`${meta.vendorId}\` = ?`);
      params.push(vendor_id);
    }

    if (document_type && meta.documentType) {
      where.push(`vd.\`${meta.documentType}\` = ?`);
      params.push(document_type);
    }

    if (status) {
      if (meta.status) {
        where.push(`vd.\`${meta.status}\` = ?`);
        params.push(normalizeStatus(status));
      } else if (status !== "active") {
        where.push("1 = 0");
      }
    }

    if (search) {
      const searchFields = [
        meta.documentName && `vd.\`${meta.documentName}\` LIKE ?`,
        meta.documentType && `vd.\`${meta.documentType}\` LIKE ?`,
        meta.documentNumber && `vd.\`${meta.documentNumber}\` LIKE ?`,
        meta.fileName && `vd.\`${meta.fileName}\` LIKE ?`,
        meta.vendorName && `v.\`${meta.vendorName}\` LIKE ?`,
        meta.vendorCode && `v.\`${meta.vendorCode}\` LIKE ?`,
      ].filter(Boolean);

      if (searchFields.length) {
        where.push(`(${searchFields.join(" OR ")})`);
        const keyword = `%${search}%`;
        searchFields.forEach(() => params.push(keyword));
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [documents] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vd
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vd.\`${meta.vendorId}\`
      ${whereSql}
      ORDER BY vd.\`${meta.id}\` DESC
      `,
      params
    );

    res.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Get vendor documents error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor documents",
      error: error.message,
    });
  }
};

exports.getVendorDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await getMeta();

    const [[document]] = await db.query(
      `
      SELECT
        ${getSelectFields(meta).join(",\n        ")}
      FROM ${TABLE} vd
      LEFT JOIN ${VENDOR_TABLE} v ON v.id = vd.\`${meta.vendorId}\`
      WHERE vd.\`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Vendor document not found",
      });
    }

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Get vendor document by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor document",
      error: error.message,
    });
  }
};

exports.createVendorDocument = async (req, res) => {
  try {
    const {
      vendor_id,
      document_type = "",
      document_name = "",
      document_number = "",
      issue_date = "",
      expiry_date = "",
      status = "active",
      notes = "",
    } = req.body;

    const meta = await getMeta();

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!document_type.trim()) {
      return res.status(400).json({
        success: false,
        message: "Document type is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
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
      deleteLocalFile(`/uploads/vendor-documents/${req.file.filename}`);

      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const payload = {
      vendor_id,
      document_type: document_type.trim(),
      document_name: document_name.trim() || req.file.originalname,
      document_number: cleanValue(document_number),
      file_name: req.file.originalname,
      file_path: `/uploads/vendor-documents/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      issue_date: cleanValue(issue_date),
      expiry_date: cleanValue(expiry_date),
      status: normalizeStatus(status),
      notes: cleanValue(notes),
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
      message: "Vendor document uploaded successfully",
      document_id: result.insertId,
      file_path: payload.file_path,
    });
  } catch (error) {
    console.error("Create vendor document error:", error);

    if (req.file) {
      deleteLocalFile(`/uploads/vendor-documents/${req.file.filename}`);
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload vendor document",
      error: error.message,
    });
  }
};

exports.updateVendorDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      document_type = "",
      document_name = "",
      document_number = "",
      issue_date = "",
      expiry_date = "",
      status = "active",
      notes = "",
    } = req.body;

    const meta = await getMeta();

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!document_type.trim()) {
      return res.status(400).json({
        success: false,
        message: "Document type is required",
      });
    }

    const [[existing]] = await db.query(
      `
      SELECT
        \`${meta.id}\` AS id,
        ${meta.filePath ? `\`${meta.filePath}\`` : "NULL"} AS file_path
      FROM ${TABLE}
      WHERE \`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      if (req.file) {
        deleteLocalFile(`/uploads/vendor-documents/${req.file.filename}`);
      }

      return res.status(404).json({
        success: false,
        message: "Vendor document not found",
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
      if (req.file) {
        deleteLocalFile(`/uploads/vendor-documents/${req.file.filename}`);
      }

      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const payload = {
      vendor_id,
      document_type: document_type.trim(),
      document_name: document_name.trim() || existing.file_name,
      document_number: cleanValue(document_number),
      file_name: undefined,
      file_path: undefined,
      file_type: undefined,
      file_size: undefined,
      issue_date: cleanValue(issue_date),
      expiry_date: cleanValue(expiry_date),
      status: normalizeStatus(status),
      notes: cleanValue(notes),
    };

    if (req.file) {
      payload.file_name = req.file.originalname;
      payload.file_path = `/uploads/vendor-documents/${req.file.filename}`;
      payload.file_type = req.file.mimetype;
      payload.file_size = req.file.size;
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

    if (req.file && existing.file_path) {
      deleteLocalFile(existing.file_path);
    }

    res.json({
      success: true,
      message: "Vendor document updated successfully",
    });
  } catch (error) {
    console.error("Update vendor document error:", error);

    if (req.file) {
      deleteLocalFile(`/uploads/vendor-documents/${req.file.filename}`);
    }

    res.status(500).json({
      success: false,
      message: "Failed to update vendor document",
      error: error.message,
    });
  }
};

exports.updateVendorDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active, expired, inactive or rejected" });
    }

    const meta = await getMeta();

    if (!meta.status) {
      return res.status(400).json({ success: false, message: "Status column not available. Run the required ALTER TABLE first." });
    }

    const [result] = await db.query(
      `UPDATE ${TABLE} SET \`${meta.status}\` = ? WHERE \`${meta.id}\` = ?`,
      [status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Vendor document not found" });
    }

    res.json({ success: true, message: `Vendor document status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update vendor document status", error: error.message });
  }
};

exports.deleteVendorDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await getMeta();

    const [[existing]] = await db.query(
      `
      SELECT
        \`${meta.id}\` AS id,
        ${meta.filePath ? `\`${meta.filePath}\`` : "NULL"} AS file_path
      FROM ${TABLE}
      WHERE \`${meta.id}\` = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor document not found",
      });
    }

    await db.query(
      `
      DELETE FROM ${TABLE}
      WHERE \`${meta.id}\` = ?
      `,
      [id]
    );

    if (existing.file_path) {
      deleteLocalFile(existing.file_path);
    }

    res.json({
      success: true,
      message: "Vendor document deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor document error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor document",
      error: error.message,
    });
  }
};