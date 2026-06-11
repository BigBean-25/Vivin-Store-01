const db = require("../config/db");

const VALID_STATUSES = ["active", "inactive"];

const normalizeStatus = (value, fallback = "active") => {
  if (VALID_STATUSES.includes(value)) return value;
  return fallback;
};

const normalizeBoolean = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }

  return 0;
};

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

exports.getVendorContactSummary = async (req, res) => {
  try {
    const [[cols]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'status'`);
    const hasStatus = !!cols;

    let summary;
    if (hasStatus) {
      [[summary]] = await db.query(`
        SELECT
          COUNT(id)                                                AS total_contacts,
          SUM(CASE WHEN status = 'active'   THEN 1 ELSE 0 END)    AS active_contacts,
          SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END)    AS inactive_contacts,
          SUM(CASE WHEN is_primary = 1      THEN 1 ELSE 0 END)    AS primary_contacts
        FROM vendor_contacts
      `);
    } else {
      [[summary]] = await db.query(`
        SELECT
          COUNT(id)                                             AS total_contacts,
          COUNT(id)                                             AS active_contacts,
          0                                                     AS inactive_contacts,
          SUM(CASE WHEN is_primary = 1 THEN 1 ELSE 0 END)      AS primary_contacts
        FROM vendor_contacts
      `);
    }
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vendor contact summary", error: error.message });
  }
};

exports.getVendorContacts = async (req, res) => {
  try {
    const { search = "", vendor_id = "", status = "", is_primary = "" } = req.query;

    const [[statusCol]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'status'`);
    const hasStatus = !!statusCol;
    const [[deptCol]]  = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'department'`);
    const hasDept = !!deptCol;
    const [[altCol]]   = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'alternate_phone'`);
    const hasAlt = !!altCol;
    const [[waCol]]    = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'whatsapp_number'`);
    const hasWa = !!waCol;
    const [[notesCol]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'notes'`);
    const hasNotes = !!notesCol;

    const where = [];
    const params = [];

    if (vendor_id) { where.push("vc.vendor_id = ?"); params.push(vendor_id); }
    if (is_primary !== "") { where.push("vc.is_primary = ?"); params.push(normalizeBoolean(is_primary)); }
    if (status && hasStatus && VALID_STATUSES.includes(status)) { where.push("vc.status = ?"); params.push(status); }

    if (search) {
      where.push(`(vc.name LIKE ? OR vc.phone LIKE ? OR vc.email LIKE ? OR vc.designation LIKE ? OR v.business_name LIKE ? OR v.vendor_code LIKE ?)`);
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw, kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const selectCols = [
      "vc.id", "vc.vendor_id",
      "vc.name AS contact_name",
      "vc.designation",
      hasDept  ? "vc.department"       : "NULL AS department",
      "vc.phone",
      hasAlt   ? "vc.alternate_phone"  : "NULL AS alternate_phone",
      "vc.email",
      hasWa    ? "vc.whatsapp_number"  : "NULL AS whatsapp_number",
      "vc.is_primary",
      hasStatus ? "vc.status"          : "'active' AS status",
      hasNotes ? "vc.notes"            : "NULL AS notes",
      "vc.created_at",
      "v.business_name AS vendor_name",
      "v.vendor_code",
    ].join(", ");

    const [contacts] = await db.query(
      `SELECT ${selectCols}
       FROM vendor_contacts vc
       LEFT JOIN vendors v ON v.id = vc.vendor_id
       ${whereSql}
       ORDER BY vc.id DESC`,
      params
    );

    res.json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    console.error("Get vendor contacts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor contacts", error: error.message });
  }
};

exports.getVendorContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[statusCol]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'status'`);
    const hasStatus = !!statusCol;
    const [[deptCol]]  = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'department'`);
    const [[altCol]]   = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'alternate_phone'`);
    const [[waCol]]    = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'whatsapp_number'`);
    const [[notesCol]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'notes'`);

    const selectCols = [
      "vc.id", "vc.vendor_id",
      "vc.name AS contact_name",
      "vc.designation",
      deptCol  ? "vc.department"       : "NULL AS department",
      "vc.phone",
      altCol   ? "vc.alternate_phone"  : "NULL AS alternate_phone",
      "vc.email",
      waCol    ? "vc.whatsapp_number"  : "NULL AS whatsapp_number",
      "vc.is_primary",
      hasStatus ? "vc.status"          : "'active' AS status",
      notesCol ? "vc.notes"            : "NULL AS notes",
      "vc.created_at",
      "v.business_name AS vendor_name",
      "v.vendor_code",
    ].join(", ");

    const [[contact]] = await db.query(
      `SELECT ${selectCols}
       FROM vendor_contacts vc
       LEFT JOIN vendors v ON v.id = vc.vendor_id
       WHERE vc.id = ? LIMIT 1`,
      [id]
    );

    if (!contact) {
      return res.status(404).json({ success: false, message: "Vendor contact not found" });
    }

    res.json({ success: true, contact });
  } catch (error) {
    console.error("Get vendor contact by id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch vendor contact", error: error.message });
  }
};

exports.createVendorContact = async (req, res) => {
  try {
    const {
      vendor_id,
      contact_name,
      designation = "",
      phone = "",
      email = "",
      is_primary = 0,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!contact_name || !contact_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact name is required",
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: "Phone or email is required",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
      FROM vendors
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

    const finalPrimary = normalizeBoolean(is_primary);

    if (finalPrimary) {
      await db.query(
        `
        UPDATE vendor_contacts
        SET is_primary = 0
        WHERE vendor_id = ?
        `,
        [vendor_id]
      );
    }

    const [[statusCol]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'status'`);
    const [[deptCol]]   = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'department'`);
    const [[altCol]]    = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'alternate_phone'`);
    const [[waCol]]     = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'whatsapp_number'`);
    const [[notesCol]]  = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'notes'`);

    const cols  = ["vendor_id", "name", "designation", "email", "phone", "is_primary"];
    const vals  = [vendor_id, contact_name.trim(), cleanValue(designation), cleanValue(email), cleanValue(phone), finalPrimary];

    const { department = "", alternate_phone = "", whatsapp_number = "", notes = "", status = "active" } = req.body;

    if (deptCol)   { cols.push("department");       vals.push(cleanValue(department)); }
    if (altCol)    { cols.push("alternate_phone");   vals.push(cleanValue(alternate_phone)); }
    if (waCol)     { cols.push("whatsapp_number");   vals.push(cleanValue(whatsapp_number)); }
    if (notesCol)  { cols.push("notes");             vals.push(cleanValue(notes)); }
    if (statusCol) { cols.push("status");            vals.push(normalizeStatus(status)); }

    const [result] = await db.query(
      `INSERT INTO vendor_contacts (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      vals
    );

    res.status(201).json({ success: true, message: "Vendor contact created successfully", contact_id: result.insertId });
  } catch (error) {
    console.error("Create vendor contact error:", error);
    res.status(500).json({ success: false, message: "Failed to create vendor contact", error: error.message });
  }
};

exports.updateVendorContact = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      contact_name,
      designation = "",
      phone = "",
      email = "",
      is_primary = 0,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!contact_name || !contact_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact name is required",
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: "Phone or email is required",
      });
    }

    const [[existing]] = await db.query(
      `
      SELECT id
      FROM vendor_contacts
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor contact not found",
      });
    }

    const [[vendor]] = await db.query(
      `
      SELECT id
      FROM vendors
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

    const finalPrimary = normalizeBoolean(is_primary);

    if (finalPrimary) {
      await db.query(
        `
        UPDATE vendor_contacts
        SET is_primary = 0
        WHERE vendor_id = ?
          AND id != ?
        `,
        [vendor_id, id]
      );
    }

    const [[statusCol]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'status'`);
    const [[deptCol]]   = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'department'`);
    const [[altCol]]    = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'alternate_phone'`);
    const [[waCol]]     = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'whatsapp_number'`);
    const [[notesCol]]  = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'notes'`);

    const { department = "", alternate_phone = "", whatsapp_number = "", notes = "", status = "active" } = req.body;

    const setClauses = [
      "vendor_id = ?", "name = ?", "designation = ?", "email = ?", "phone = ?", "is_primary = ?",
    ];
    const vals = [vendor_id, contact_name.trim(), cleanValue(designation), cleanValue(email), cleanValue(phone), finalPrimary];

    if (deptCol)   { setClauses.push("department = ?");       vals.push(cleanValue(department)); }
    if (altCol)    { setClauses.push("alternate_phone = ?");   vals.push(cleanValue(alternate_phone)); }
    if (waCol)     { setClauses.push("whatsapp_number = ?");   vals.push(cleanValue(whatsapp_number)); }
    if (notesCol)  { setClauses.push("notes = ?");             vals.push(cleanValue(notes)); }
    if (statusCol) { setClauses.push("status = ?");            vals.push(normalizeStatus(status)); }

    vals.push(id);

    await db.query(`UPDATE vendor_contacts SET ${setClauses.join(", ")} WHERE id = ?`, vals);

    res.json({ success: true, message: "Vendor contact updated successfully" });
  } catch (error) {
    console.error("Update vendor contact error:", error);
    res.status(500).json({ success: false, message: "Failed to update vendor contact", error: error.message });
  }
};

exports.updateVendorContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be active or inactive" });
    }

    const [[statusCol]] = await db.query(`SHOW COLUMNS FROM vendor_contacts LIKE 'status'`);
    if (!statusCol) {
      return res.status(400).json({ success: false, message: "Status column not available. Run the required ALTER TABLE first." });
    }

    const [result] = await db.query(`UPDATE vendor_contacts SET status = ? WHERE id = ?`, [status, id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Vendor contact not found" });
    }

    res.json({ success: true, message: `Vendor contact ${status === "active" ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update vendor contact status", error: error.message });
  }
};

exports.deleteVendorContact = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      DELETE FROM vendor_contacts
      WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Vendor contact not found",
      });
    }

    res.json({
      success: true,
      message: "Vendor contact deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor contact error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vendor contact",
      error: error.message,
    });
  }
};