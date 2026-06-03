const db = require("../config/db");
const fs = require("fs");
const path = require("path");

const TABLE = "procurement_documents";

const safeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || req.user?.admin_id || null;
};

const getUserName = (req) => {
  return (
    req.user?.name ||
    req.user?.full_name ||
    req.user?.username ||
    req.user?.email ||
    null
  );
};

const resolveUploadPath = (filePath) => {
  if (!filePath) return null;

  const cleanPath = filePath.startsWith("/")
    ? filePath.slice(1)
    : filePath;

  return path.join(__dirname, "..", cleanPath);
};

exports.getProcurementDocumentSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
        SELECT
          COUNT(*) AS total_documents,
          SUM(CASE WHEN document_type = 'invoice' THEN 1 ELSE 0 END) AS invoice_count,
          SUM(CASE WHEN document_type = 'quotation' THEN 1 ELSE 0 END) AS quotation_count,
          SUM(CASE WHEN document_type = 'delivery_challan' THEN 1 ELSE 0 END) AS delivery_challan_count,
          SUM(CASE WHEN document_type = 'payment_proof' THEN 1 ELSE 0 END) AS payment_proof_count,
          SUM(CASE WHEN document_type = 'grn_proof' THEN 1 ELSE 0 END) AS grn_proof_count,
          COALESCE(SUM(file_size), 0) AS total_file_size
        FROM ${TABLE}
      `
    );

    const [moduleSummary] = await db.query(
      `
        SELECT
          module_name,
          COUNT(*) AS document_count
        FROM ${TABLE}
        GROUP BY module_name
        ORDER BY document_count DESC
      `
    );

    const [recent] = await db.query(
      `
        SELECT *
        FROM ${TABLE}
        ORDER BY id DESC
        LIMIT 10
      `
    );

    res.json({
      success: true,
      summary: {
        total_documents: safeNumber(summary?.total_documents),
        invoice_count: safeNumber(summary?.invoice_count),
        quotation_count: safeNumber(summary?.quotation_count),
        delivery_challan_count: safeNumber(summary?.delivery_challan_count),
        payment_proof_count: safeNumber(summary?.payment_proof_count),
        grn_proof_count: safeNumber(summary?.grn_proof_count),
        total_file_size: safeNumber(summary?.total_file_size),
      },
      module_summary: moduleSummary,
      recent,
    });
  } catch (error) {
    console.error("Procurement document summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load procurement document summary",
      error: error.message,
    });
  }
};

exports.getProcurementDocuments = async (req, res) => {
  try {
    const {
      search = "",
      module_name = "",
      record_id = "",
      document_type = "",
      from_date = "",
      to_date = "",
    } = req.query;

    const where = [];
    const values = [];

    if (module_name) {
      where.push("module_name = ?");
      values.push(module_name);
    }

    if (record_id) {
      where.push("record_id = ?");
      values.push(record_id);
    }

    if (document_type) {
      where.push("document_type = ?");
      values.push(document_type);
    }

    if (from_date) {
      where.push("DATE(uploaded_at) >= ?");
      values.push(from_date);
    }

    if (to_date) {
      where.push("DATE(uploaded_at) <= ?");
      values.push(to_date);
    }

    if (search.trim()) {
      where.push(
        "(document_title LIKE ? OR reference_number LIKE ? OR original_name LIKE ? OR remarks LIKE ?)"
      );

      const keyword = `%${search.trim()}%`;
      values.push(keyword, keyword, keyword, keyword);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
        SELECT *
        FROM ${TABLE}
        ${whereSql}
        ORDER BY id DESC
      `,
      values
    );

    res.json({
      success: true,
      count: rows.length,
      documents: rows,
      data: rows,
    });
  } catch (error) {
    console.error("Get procurement documents error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement documents",
      error: error.message,
    });
  }
};

exports.getProcurementDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[document]] = await db.query(
      `
        SELECT *
        FROM ${TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Procurement document not found",
      });
    }

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Get procurement document error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch procurement document",
      error: error.message,
    });
  }
};

exports.uploadProcurementDocument = async (req, res) => {
  try {
    const {
      module_name,
      record_id,
      reference_number = "",
      document_title = "",
      document_type = "other",
      remarks = "",
    } = req.body;

    if (!module_name) {
      return res.status(400).json({
        success: false,
        message: "Module name is required",
      });
    }

    if (!record_id) {
      return res.status(400).json({
        success: false,
        message: "Record ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
      });
    }

    const filePath = `/uploads/procurement-documents/${req.file.filename}`;

    const [result] = await db.query(
      `
        INSERT INTO ${TABLE}
          (
            module_name,
            record_id,
            reference_number,
            document_title,
            document_type,
            file_name,
            original_name,
            file_path,
            file_mime,
            file_size,
            remarks,
            uploaded_by,
            uploaded_by_name
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        module_name,
        record_id,
        reference_number || null,
        document_title || req.file.originalname,
        document_type || "other",
        req.file.filename,
        req.file.originalname,
        filePath,
        req.file.mimetype,
        req.file.size,
        remarks || null,
        getUserId(req),
        getUserName(req),
      ]
    );

    res.status(201).json({
      success: true,
      message: "Procurement document uploaded successfully",
      document_id: result.insertId,
      file_path: filePath,
    });
  } catch (error) {
    console.error("Upload procurement document error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload procurement document",
      error: error.message,
    });
  }
};

exports.updateProcurementDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      document_title = "",
      document_type = "",
      reference_number = "",
      remarks = "",
    } = req.body;

    const [[existing]] = await db.query(
      `
        SELECT *
        FROM ${TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Procurement document not found",
      });
    }

    await db.query(
      `
        UPDATE ${TABLE}
        SET
          document_title = ?,
          document_type = ?,
          reference_number = ?,
          remarks = ?
        WHERE id = ?
      `,
      [
        document_title || existing.document_title,
        document_type || existing.document_type,
        reference_number || existing.reference_number,
        remarks || existing.remarks,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Procurement document updated successfully",
    });
  } catch (error) {
    console.error("Update procurement document error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update procurement document",
      error: error.message,
    });
  }
};

exports.downloadProcurementDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const [[document]] = await db.query(
      `
        SELECT *
        FROM ${TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Procurement document not found",
      });
    }

    const fullPath = resolveUploadPath(document.file_path);

    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: "Document file not found on server",
      });
    }

    res.download(fullPath, document.original_name || document.file_name);
  } catch (error) {
    console.error("Download procurement document error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to download procurement document",
      error: error.message,
    });
  }
};

exports.deleteProcurementDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const [[document]] = await db.query(
      `
        SELECT *
        FROM ${TABLE}
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Procurement document not found",
      });
    }

    const fullPath = resolveUploadPath(document.file_path);

    if (fullPath && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await db.query(
      `
        DELETE FROM ${TABLE}
        WHERE id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Procurement document deleted successfully",
    });
  } catch (error) {
    console.error("Delete procurement document error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete procurement document",
      error: error.message,
    });
  }
};
