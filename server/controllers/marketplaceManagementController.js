const db = require("../config/db");

// ── MODULE 1: MARKETPLACE MASTER ─────────────────────────────────────────

exports.getMarketplacesSummary = async (req, res) => {
  try {
    const [[t]] = await db.query("SELECT COUNT(*) AS total FROM marketplaces");
    const [[a]] = await db.query("SELECT COUNT(*) AS cnt FROM marketplaces WHERE status='active'");
    const [[i]] = await db.query("SELECT COUNT(*) AS cnt FROM marketplaces WHERE status='inactive'");
    res.json({ success: true, data: { total: t.total, active: a.cnt, inactive: i.cnt } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMarketplaces = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    let sql = "SELECT * FROM marketplaces WHERE 1=1";
    const p = [];
    if (search) { sql += " AND (name LIKE ? OR description LIKE ?)"; p.push(`%${search}%`, `%${search}%`); }
    if (status) { sql += " AND status=?"; p.push(status); }
    sql += " ORDER BY created_at DESC";
    const [rows] = await db.query(sql, p);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMarketplaceById = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM marketplaces WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Marketplace not found" });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createMarketplace = async (req, res) => {
  try {
    const {
      marketplace_code, name, description, type, website_url,
      commission_percentage, settlement_cycle, contact_person,
      contact_phone, contact_email, status = "active"
    } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Marketplace name is required" });
    const cols = ["name", "description", "status"];
    const vals = [name, description || null, status];
    const extra = { marketplace_code, type, website_url, commission_percentage, settlement_cycle, contact_person, contact_phone, contact_email };
    const [colInfo] = await db.query("SHOW COLUMNS FROM marketplaces");
    const existing = colInfo.map(c => c.Field);
    for (const [k, v] of Object.entries(extra)) {
      if (existing.includes(k)) { cols.push(k); vals.push(v || null); }
    }
    const sql = `INSERT INTO marketplaces (${cols.join(",")}) VALUES (${cols.map(()=>"?").join(",")})`;
    const [r] = await db.query(sql, vals);
    res.status(201).json({ success: true, message: "Marketplace created", id: r.insertId });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateMarketplace = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplaces WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace not found" });
    const {
      marketplace_code, name, description, type, website_url,
      commission_percentage, settlement_cycle, contact_person,
      contact_phone, contact_email, status
    } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Marketplace name is required" });
    const sets = ["name=?", "description=?", "status=?"];
    const vals = [name, description || null, status || "active"];
    const extra = { marketplace_code, type, website_url, commission_percentage, settlement_cycle, contact_person, contact_phone, contact_email };
    const [colInfo] = await db.query("SHOW COLUMNS FROM marketplaces");
    const existing = colInfo.map(c => c.Field);
    for (const [k, v] of Object.entries(extra)) {
      if (existing.includes(k)) { sets.push(`${k}=?`); vals.push(v || null); }
    }
    vals.push(req.params.id);
    await db.query(`UPDATE marketplaces SET ${sets.join(",")} WHERE id=?`, vals);
    res.json({ success: true, message: "Marketplace updated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateMarketplaceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const [ex] = await db.query("SELECT id FROM marketplaces WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace not found" });
    await db.query("UPDATE marketplaces SET status=? WHERE id=?", [status, req.params.id]);
    res.json({ success: true, message: `Marketplace marked ${status}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteMarketplace = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplaces WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace not found" });
    await db.query("DELETE FROM marketplaces WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Marketplace deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MODULE 2: MARKETPLACE VENDORS ────────────────────────────────────────

exports.getMktVendorsSummary = async (req, res) => {
  try {
    const [[t]]  = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_vendors");
    const [rows] = await db.query("SELECT status, COUNT(*) AS cnt FROM marketplace_vendors GROUP BY status");
    const s = { total: t.cnt, pending: 0, active: 0, inactive: 0, blocked: 0 };
    rows.forEach(r => { if (s[r.status] !== undefined) s[r.status] = r.cnt; });
    res.json({ success: true, data: s });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMktVendors = async (req, res) => {
  try {
    const { marketplace_id = "", status = "", search = "" } = req.query;
    let sql = `SELECT mv.*, m.name AS marketplace_name, v.business_name AS vendor_name, v.vendor_code
               FROM marketplace_vendors mv
               JOIN marketplaces m ON mv.marketplace_id = m.id
               JOIN vendors v ON mv.vendor_id = v.id
               WHERE 1=1`;
    const p = [];
    if (marketplace_id) { sql += " AND mv.marketplace_id=?"; p.push(marketplace_id); }
    if (status)         { sql += " AND mv.status=?";         p.push(status); }
    if (search)         { sql += " AND (v.business_name LIKE ? OR v.vendor_code LIKE ?)"; p.push(`%${search}%`, `%${search}%`); }
    sql += " ORDER BY mv.created_at DESC";
    const [rows] = await db.query(sql, p);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMktVendorById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mv.*, m.name AS marketplace_name, v.business_name AS vendor_name, v.vendor_code
       FROM marketplace_vendors mv
       JOIN marketplaces m ON mv.marketplace_id = m.id
       JOIN vendors v ON mv.vendor_id = v.id
       WHERE mv.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Marketplace vendor not found" });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createMktVendor = async (req, res) => {
  try {
    const { marketplace_id, vendor_id, commission_rate = 0, status = "pending" } = req.body;
    if (!marketplace_id || !vendor_id)
      return res.status(400).json({ success: false, message: "marketplace_id and vendor_id are required" });
    const valid = ["pending", "active", "inactive", "blocked"];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const [r] = await db.query(
      "INSERT INTO marketplace_vendors (marketplace_id, vendor_id, commission_rate, status) VALUES (?,?,?,?)",
      [marketplace_id, vendor_id, commission_rate, status]
    );
    res.status(201).json({ success: true, message: "Marketplace vendor added", id: r.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      return res.status(400).json({ success: false, message: "This vendor is already linked to this marketplace" });
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateMktVendor = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_vendors WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace vendor not found" });
    const { commission_rate, status } = req.body;
    const valid = ["pending", "active", "inactive", "blocked"];
    if (status && !valid.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    await db.query(
      "UPDATE marketplace_vendors SET commission_rate=COALESCE(?,commission_rate), status=COALESCE(?,status) WHERE id=?",
      [commission_rate ?? null, status || null, req.params.id]
    );
    res.json({ success: true, message: "Marketplace vendor updated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateMktVendorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending", "active", "inactive", "blocked"];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const [ex] = await db.query("SELECT id FROM marketplace_vendors WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace vendor not found" });
    await db.query("UPDATE marketplace_vendors SET status=? WHERE id=?", [status, req.params.id]);
    res.json({ success: true, message: `Vendor status updated to ${status}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteMktVendor = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_vendors WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace vendor not found" });
    await db.query("DELETE FROM marketplace_vendors WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Marketplace vendor removed" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MODULE 3: MARKETPLACE PRODUCTS ───────────────────────────────────────

exports.getMktProductsSummary = async (req, res) => {
  try {
    const [[t]]  = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products");
    const [rows] = await db.query("SELECT status, COUNT(*) AS cnt FROM marketplace_products GROUP BY status");
    const s = { total: t.cnt, active: 0, inactive: 0, out_of_stock: 0 };
    rows.forEach(r => { if (s[r.status] !== undefined) s[r.status] = r.cnt; });
    res.json({ success: true, data: s });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMktProducts = async (req, res) => {
  try {
    const { marketplace_id = "", vendor_id = "", status = "", search = "" } = req.query;
    let sql = `SELECT mp.*, m.name AS marketplace_name, v.business_name AS vendor_name,
               p.name AS product_name, p.product_code, p.sku
               FROM marketplace_products mp
               JOIN marketplaces m ON mp.marketplace_id = m.id
               JOIN vendors v ON mp.vendor_id = v.id
               JOIN products p ON mp.product_id = p.id
               WHERE 1=1`;
    const params = [];
    if (marketplace_id) { sql += " AND mp.marketplace_id=?"; params.push(marketplace_id); }
    if (vendor_id)      { sql += " AND mp.vendor_id=?";      params.push(vendor_id); }
    if (status)         { sql += " AND mp.status=?";          params.push(status); }
    if (search)         { sql += " AND (p.name LIKE ? OR p.product_code LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    sql += " ORDER BY mp.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMktProductById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mp.*, m.name AS marketplace_name, v.business_name AS vendor_name,
       p.name AS product_name, p.product_code, p.sku
       FROM marketplace_products mp
       JOIN marketplaces m ON mp.marketplace_id = m.id
       JOIN vendors v ON mp.vendor_id = v.id
       JOIN products p ON mp.product_id = p.id
       WHERE mp.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Marketplace product not found" });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createMktProduct = async (req, res) => {
  try {
    const { marketplace_id, vendor_id, product_id, price, available_qty = 0, status = "active" } = req.body;
    if (!marketplace_id || !vendor_id || !product_id || price === undefined)
      return res.status(400).json({ success: false, message: "marketplace_id, vendor_id, product_id and price are required" });
    const valid = ["active", "inactive", "out_of_stock"];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const [r] = await db.query(
      "INSERT INTO marketplace_products (marketplace_id, vendor_id, product_id, price, available_qty, status) VALUES (?,?,?,?,?,?)",
      [marketplace_id, vendor_id, product_id, price, available_qty, status]
    );
    res.status(201).json({ success: true, message: "Marketplace product added", id: r.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      return res.status(400).json({ success: false, message: "This product is already listed under this marketplace & vendor" });
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateMktProduct = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace product not found" });
    const { price, available_qty, status } = req.body;
    const valid = ["active", "inactive", "out_of_stock"];
    if (status && !valid.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    await db.query(
      "UPDATE marketplace_products SET price=COALESCE(?,price), available_qty=COALESCE(?,available_qty), status=COALESCE(?,status) WHERE id=?",
      [price ?? null, available_qty ?? null, status || null, req.params.id]
    );
    res.json({ success: true, message: "Marketplace product updated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateMktProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["active", "inactive", "out_of_stock"];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace product not found" });
    await db.query("UPDATE marketplace_products SET status=? WHERE id=?", [status, req.params.id]);
    res.json({ success: true, message: `Product status updated to ${status}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteMktProduct = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Marketplace product not found" });
    await db.query("DELETE FROM marketplace_products WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Marketplace product removed" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MODULE 4: PRODUCT MARKETPLACE MAPPING ────────────────────────────────
// Uses marketplace_products as the mapping table (no separate table in schema)

exports.getMappingSummary = async (req, res) => {
  try {
    const [[t]] = await db.query("SELECT COUNT(*) AS total FROM marketplace_products");
    const [byMkt] = await db.query(
      `SELECT m.name AS marketplace, COUNT(*) AS count
       FROM marketplace_products mp JOIN marketplaces m ON mp.marketplace_id = m.id
       GROUP BY mp.marketplace_id, m.name ORDER BY count DESC`
    );
    res.json({ success: true, data: { total_mappings: t.total, by_marketplace: byMkt } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMapping = async (req, res) => {
  try {
    const { marketplace_id = "", vendor_id = "", product_id = "", status = "", search = "" } = req.query;
    let sql = `SELECT mp.*, m.name AS marketplace_name, v.business_name AS vendor_name, v.vendor_code,
               p.name AS product_name, p.product_code
               FROM marketplace_products mp
               JOIN marketplaces m ON mp.marketplace_id = m.id
               JOIN vendors v ON mp.vendor_id = v.id
               JOIN products p ON mp.product_id = p.id WHERE 1=1`;
    const params = [];
    if (marketplace_id) { sql += " AND mp.marketplace_id=?"; params.push(marketplace_id); }
    if (vendor_id)      { sql += " AND mp.vendor_id=?";      params.push(vendor_id); }
    if (product_id)     { sql += " AND mp.product_id=?";     params.push(product_id); }
    if (status)         { sql += " AND mp.status=?";          params.push(status); }
    if (search)         { sql += " AND (p.name LIKE ? OR p.product_code LIKE ? OR m.name LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += " ORDER BY mp.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getMappingById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mp.*, m.name AS marketplace_name, v.business_name AS vendor_name, v.vendor_code, p.name AS product_name, p.product_code
       FROM marketplace_products mp
       JOIN marketplaces m ON mp.marketplace_id = m.id
       JOIN vendors v ON mp.vendor_id = v.id
       JOIN products p ON mp.product_id = p.id WHERE mp.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Mapping not found" });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createMapping = async (req, res) => {
  try {
    const { marketplace_id, vendor_id, product_id, price, available_qty = 0, status = "active" } = req.body;
    if (!marketplace_id || !vendor_id || !product_id || price === undefined)
      return res.status(400).json({ success: false, message: "marketplace_id, vendor_id, product_id and price are required" });
    const valid = ["active", "inactive", "out_of_stock"];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
    const [dup] = await db.query(
      "SELECT id FROM marketplace_products WHERE marketplace_id=? AND vendor_id=? AND product_id=?",
      [marketplace_id, vendor_id, product_id]
    );
    if (dup.length) return res.status(400).json({ success: false, message: "This product is already mapped to this marketplace & vendor" });
    const [r] = await db.query(
      "INSERT INTO marketplace_products (marketplace_id, vendor_id, product_id, price, available_qty, status) VALUES (?,?,?,?,?,?)",
      [marketplace_id, vendor_id, product_id, price, available_qty, status]
    );
    res.status(201).json({ success: true, message: "Product mapped to marketplace", id: r.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(400).json({ success: false, message: "This product is already mapped to this marketplace & vendor" });
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateMapping = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Mapping not found" });
    const { price, available_qty, status } = req.body;
    const valid = ["active", "inactive", "out_of_stock"];
    if (status && !valid.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
    await db.query(
      "UPDATE marketplace_products SET price=COALESCE(?,price), available_qty=COALESCE(?,available_qty), status=COALESCE(?,status) WHERE id=?",
      [price ?? null, available_qty ?? null, status || null, req.params.id]
    );
    res.json({ success: true, message: "Mapping updated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteMapping = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Mapping not found" });
    await db.query("DELETE FROM marketplace_products WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Mapping removed" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MODULE 5: MARKETPLACE PRICE / COMMISSION ─────────────────────────────

const _getMktCols = async () => {
  const [c] = await db.query("SHOW COLUMNS FROM marketplaces");
  return c.map(r => r.Field);
};

exports.getPricingSummary = async (req, res) => {
  try {
    const [[tot]] = await db.query("SELECT COUNT(*) AS cnt, AVG(price) AS avg_price, MIN(price) AS min_price, MAX(price) AS max_price FROM marketplace_products");
    const [[vc]]  = await db.query("SELECT AVG(commission_rate) AS avg FROM marketplace_vendors WHERE commission_rate > 0");
    const mktCols = await _getMktCols();
    let avgMktComm = null;
    if (mktCols.includes("commission_percentage")) {
      const [[mc]] = await db.query("SELECT AVG(commission_percentage) AS avg FROM marketplaces WHERE commission_percentage > 0");
      avgMktComm = mc.avg ? parseFloat(mc.avg).toFixed(2) : null;
    }
    res.json({ success: true, data: {
      total: tot.cnt,
      avg_price: tot.avg_price ? parseFloat(tot.avg_price).toFixed(2) : 0,
      min_price: tot.min_price || 0,
      max_price: tot.max_price || 0,
      avg_vendor_commission: vc.avg ? parseFloat(vc.avg).toFixed(2) : 0,
      avg_mkt_commission: avgMktComm
    }});
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getPricing = async (req, res) => {
  try {
    const { marketplace_id = "", vendor_id = "", search = "" } = req.query;
    const mktCols = await _getMktCols();
    let sql = `SELECT mp.id, mp.marketplace_id, mp.vendor_id, mp.product_id, mp.price, mp.available_qty, mp.status,
               m.name AS marketplace_name, v.business_name AS vendor_name, mv.commission_rate AS vendor_commission,
               p.name AS product_name, p.product_code`;
    if (mktCols.includes("commission_percentage")) sql += `, m.commission_percentage AS mkt_commission`;
    sql += ` FROM marketplace_products mp
             JOIN marketplaces m ON mp.marketplace_id = m.id
             JOIN vendors v ON mp.vendor_id = v.id
             LEFT JOIN marketplace_vendors mv ON mv.marketplace_id = mp.marketplace_id AND mv.vendor_id = mp.vendor_id
             JOIN products p ON mp.product_id = p.id WHERE 1=1`;
    const params = [];
    if (marketplace_id) { sql += " AND mp.marketplace_id=?"; params.push(marketplace_id); }
    if (vendor_id)      { sql += " AND mp.vendor_id=?";      params.push(vendor_id); }
    if (search)         { sql += " AND (p.name LIKE ? OR p.product_code LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    sql += " ORDER BY mp.price DESC";
    const [rows] = await db.query(sql, params);
    const hasMktComm = mktCols.includes("commission_percentage");
    const result = rows.map(row => {
      const rate = parseFloat(row.vendor_commission || (hasMktComm ? row.mkt_commission : null) || 0);
      const commission_amount = parseFloat((row.price * rate / 100).toFixed(2));
      const net_receivable    = parseFloat((row.price - commission_amount).toFixed(2));
      return { ...row, effective_commission_rate: rate, commission_amount, net_receivable };
    });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getPricingById = async (req, res) => {
  try {
    const mktCols = await _getMktCols();
    let sql = `SELECT mp.*, m.name AS marketplace_name, v.business_name AS vendor_name, mv.commission_rate AS vendor_commission, p.name AS product_name, p.product_code`;
    if (mktCols.includes("commission_percentage")) sql += `, m.commission_percentage AS mkt_commission`;
    sql += ` FROM marketplace_products mp
             JOIN marketplaces m ON mp.marketplace_id = m.id
             JOIN vendors v ON mp.vendor_id = v.id
             LEFT JOIN marketplace_vendors mv ON mv.marketplace_id = mp.marketplace_id AND mv.vendor_id = mp.vendor_id
             JOIN products p ON mp.product_id = p.id WHERE mp.id=?`;
    const [rows] = await db.query(sql, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const row  = rows[0];
    const hasMktComm = mktCols.includes("commission_percentage");
    const rate = parseFloat(row.vendor_commission || (hasMktComm ? row.mkt_commission : null) || 0);
    const commission_amount = parseFloat((row.price * rate / 100).toFixed(2));
    const net_receivable    = parseFloat((row.price - commission_amount).toFixed(2));
    res.json({ success: true, data: { ...row, effective_commission_rate: rate, commission_amount, net_receivable } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateMktProductPricing = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Product not found" });
    const { price, available_qty } = req.body;
    if (price === undefined && available_qty === undefined)
      return res.status(400).json({ success: false, message: "price or available_qty required" });
    await db.query(
      "UPDATE marketplace_products SET price=COALESCE(?,price), available_qty=COALESCE(?,available_qty) WHERE id=?",
      [price ?? null, available_qty ?? null, req.params.id]
    );
    res.json({ success: true, message: "Pricing updated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MODULE 6: MARKETPLACE PRODUCT STATUS CONTROL ─────────────────────────
// updateMktProductStatus already handles PATCH /products/:id/status

exports.activateMktProduct = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Product not found" });
    await db.query("UPDATE marketplace_products SET status='active' WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Product activated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.bulkUpdateProductStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "ids array is required" });
    const valid = ["active", "inactive", "out_of_stock"];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
    const safeIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (!safeIds.length) return res.status(400).json({ success: false, message: "No valid ids" });
    await db.query(
      `UPDATE marketplace_products SET status=? WHERE id IN (${safeIds.map(() => "?").join(",")})`,
      [status, ...safeIds]
    );
    res.json({ success: true, message: `${safeIds.length} product(s) updated to ${status}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MODULE 7: MARKETPLACE APPROVAL FLOW ──────────────────────────────────
// No approval_status column — inactive = pending review, active = approved

exports.getApprovalsSummary = async (req, res) => {
  try {
    const [[total]]    = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products");
    const [[pending]]  = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products WHERE status='inactive'");
    const [[approved]] = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products WHERE status='active'");
    const [[oos]]      = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products WHERE status='out_of_stock'");
    res.json({ success: true, data: { total: total.cnt, pending_review: pending.cnt, approved: approved.cnt, out_of_stock: oos.cnt } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getApprovals = async (req, res) => {
  try {
    const { marketplace_id = "", status = "inactive", search = "" } = req.query;
    let sql = `SELECT mp.*, m.name AS marketplace_name, v.business_name AS vendor_name, p.name AS product_name, p.product_code
               FROM marketplace_products mp
               JOIN marketplaces m ON mp.marketplace_id = m.id
               JOIN vendors v ON mp.vendor_id = v.id
               JOIN products p ON mp.product_id = p.id WHERE 1=1`;
    const params = [];
    if (marketplace_id) { sql += " AND mp.marketplace_id=?"; params.push(marketplace_id); }
    const s = status || "inactive";
    sql += " AND mp.status=?"; params.push(s);
    if (search) { sql += " AND (p.name LIKE ? OR p.product_code LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    sql += " ORDER BY mp.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.approveMktProduct = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id, marketplace_id, product_id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Product not found" });
    await db.query("UPDATE marketplace_products SET status='active' WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Product approved and activated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.rejectMktProduct = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM marketplace_products WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success: false, message: "Product not found" });
    await db.query("UPDATE marketplace_products SET status='inactive' WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Product rejected" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MODULE 8: MARKETPLACE REPORTS ────────────────────────────────────────

exports.getReportsSummary = async (req, res) => {
  try {
    const [[mTotal]]   = await db.query("SELECT COUNT(*) AS cnt FROM marketplaces");
    const [[mActive]]  = await db.query("SELECT COUNT(*) AS cnt FROM marketplaces WHERE status='active'");
    const [[mInactive]]= await db.query("SELECT COUNT(*) AS cnt FROM marketplaces WHERE status='inactive'");
    const [[vTotal]]   = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_vendors");
    const [[vActive]]  = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_vendors WHERE status='active'");
    const [[pTotal]]   = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products");
    const [[pActive]]  = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products WHERE status='active'");
    const [[pInactive]]= await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products WHERE status='inactive'");
    const [[pOos]]     = await db.query("SELECT COUNT(*) AS cnt FROM marketplace_products WHERE status='out_of_stock'");
    const [[vc]]       = await db.query("SELECT AVG(commission_rate) AS avg FROM marketplace_vendors WHERE commission_rate > 0");
    const mktCols = await _getMktCols();
    let avgMktComm = null;
    if (mktCols.includes("commission_percentage")) {
      const [[mc]] = await db.query("SELECT AVG(commission_percentage) AS avg FROM marketplaces WHERE commission_percentage > 0");
      avgMktComm = mc.avg ? parseFloat(mc.avg).toFixed(2) : null;
    }
    res.json({ success: true, data: {
      total_marketplaces: mTotal.cnt, active_marketplaces: mActive.cnt, inactive_marketplaces: mInactive.cnt,
      total_marketplace_vendors: vTotal.cnt, active_marketplace_vendors: vActive.cnt,
      total_mapped_products: pTotal.cnt, active_marketplace_products: pActive.cnt,
      inactive_marketplace_products: pInactive.cnt, out_of_stock: pOos.cnt,
      pending_approval: pInactive.cnt, approved: pActive.cnt,
      avg_vendor_commission: vc.avg ? parseFloat(vc.avg).toFixed(2) : null,
      avg_mkt_commission: avgMktComm
    }});
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getReportMarketplaces = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.id, m.name, m.status,
        COUNT(DISTINCT mv.vendor_id) AS vendor_count,
        COUNT(DISTINCT mp.product_id) AS product_count,
        COUNT(mp.id) AS total_listings,
        SUM(CASE WHEN mp.status='active' THEN 1 ELSE 0 END) AS active_listings,
        ROUND(AVG(mp.price),2) AS avg_price
       FROM marketplaces m
       LEFT JOIN marketplace_vendors mv ON mv.marketplace_id = m.id
       LEFT JOIN marketplace_products mp ON mp.marketplace_id = m.id
       GROUP BY m.id, m.name, m.status ORDER BY total_listings DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getReportVendors = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT v.id, v.business_name, v.vendor_code,
        COUNT(DISTINCT mv.marketplace_id) AS marketplace_count,
        COUNT(DISTINCT mp.id) AS listing_count,
        ROUND(AVG(mv.commission_rate),2) AS avg_commission
       FROM vendors v
       JOIN marketplace_vendors mv ON mv.vendor_id = v.id
       LEFT JOIN marketplace_products mp ON mp.vendor_id = v.id AND mp.marketplace_id = mv.marketplace_id
       GROUP BY v.id, v.business_name, v.vendor_code ORDER BY listing_count DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getReportProducts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.name AS product_name, p.product_code,
        COUNT(DISTINCT mp.marketplace_id) AS marketplace_count,
        COUNT(mp.id) AS total_listings,
        SUM(CASE WHEN mp.status='active' THEN 1 ELSE 0 END) AS active_listings,
        ROUND(AVG(mp.price),2) AS avg_price, MIN(mp.price) AS min_price, MAX(mp.price) AS max_price,
        SUM(mp.available_qty) AS total_qty
       FROM products p JOIN marketplace_products mp ON mp.product_id = p.id
       GROUP BY p.id, p.name, p.product_code ORDER BY marketplace_count DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getReportPricing = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.name AS marketplace, p.name AS product, p.product_code,
        v.business_name AS vendor, mp.price, mp.available_qty, mp.status,
        COALESCE(mv.commission_rate, 0) AS commission_rate,
        ROUND(mp.price * COALESCE(mv.commission_rate,0) / 100, 2) AS commission_amount,
        ROUND(mp.price - mp.price * COALESCE(mv.commission_rate,0) / 100, 2) AS net_receivable
       FROM marketplace_products mp
       JOIN marketplaces m ON mp.marketplace_id = m.id
       JOIN vendors v ON mp.vendor_id = v.id
       JOIN products p ON mp.product_id = p.id
       LEFT JOIN marketplace_vendors mv ON mv.marketplace_id = mp.marketplace_id AND mv.vendor_id = mp.vendor_id
       ORDER BY mp.price DESC LIMIT 200`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getReportApprovals = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mp.id, m.name AS marketplace, p.name AS product, p.product_code,
        v.business_name AS vendor, mp.price, mp.status, mp.created_at
       FROM marketplace_products mp
       JOIN marketplaces m ON mp.marketplace_id = m.id
       JOIN vendors v ON mp.vendor_id = v.id
       JOIN products p ON mp.product_id = p.id
       ORDER BY mp.status, mp.created_at DESC LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── LOOKUP APIs (master data for dropdown population) ─────────────────────

exports.getLookupMarketplaces = async (req, res) => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM marketplaces");
    const colNames = cols.map(c => c.Field);
    const select = ["id", "name"];
    if (colNames.includes("marketplace_code")) select.push("marketplace_code");
    if (colNames.includes("type"))             select.push("type");
    if (colNames.includes("status"))           select.push("status");
    let sql = `SELECT ${select.join(", ")} FROM marketplaces`;
    if (colNames.includes("status")) sql += " WHERE status='active'";
    sql += " ORDER BY name ASC";
    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getLookupVendors = async (req, res) => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM vendors");
    const colNames = cols.map(c => c.Field);
    const select = ["id"];
    if (colNames.includes("vendor_code"))    select.push("vendor_code");
    if (colNames.includes("business_name"))  select.push("business_name");
    if (colNames.includes("contact_person")) select.push("contact_person");
    if (colNames.includes("phone"))          select.push("phone");
    if (colNames.includes("status"))         select.push("status");
    let sql = `SELECT ${select.join(", ")} FROM vendors`;
    if (colNames.includes("status")) sql += " WHERE status IN ('active','pending')";
    const orderCol = colNames.includes("business_name") ? "business_name" : "id";
    sql += ` ORDER BY ${orderCol} ASC`;
    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getLookupProducts = async (req, res) => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM products");
    const colNames = cols.map(c => c.Field);
    const select = ["id"];
    if (colNames.includes("product_code"))  select.push("product_code");
    if (colNames.includes("name"))          select.push("name");
    if (colNames.includes("base_price"))    select.push("base_price");
    if (colNames.includes("selling_price")) select.push("selling_price");
    if (colNames.includes("price"))         select.push("price");
    if (colNames.includes("status"))        select.push("status");
    let sql = `SELECT ${select.join(", ")} FROM products`;
    if (colNames.includes("status")) sql += " WHERE status='active'";
    const orderCol = colNames.includes("name") ? "name" : "id";
    sql += ` ORDER BY ${orderCol} ASC`;
    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
