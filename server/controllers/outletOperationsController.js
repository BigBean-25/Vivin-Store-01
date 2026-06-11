const db = require("../config/db");

const genReqNumber = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `ORS-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.floor(1000+Math.random()*9000)}`;
};

// ── MODULE 1: OUTLET MASTER ──────────────────────────────────────────────

exports.getOutletsSummary = async (req, res) => {
  try {
    const [[t]] = await db.query("SELECT COUNT(*) AS total FROM outlets");
    const [[a]] = await db.query("SELECT COUNT(*) AS cnt FROM outlets WHERE status='active'");
    const [[i]] = await db.query("SELECT COUNT(*) AS cnt FROM outlets WHERE status='inactive'");
    res.json({ success:true, data:{ total_outlets:t.total, active_outlets:a.cnt, inactive_outlets:i.cnt } });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getOutlets = async (req, res) => {
  try {
    const { search="", status="", city="" } = req.query;
    let sql = "SELECT o.*, u.name AS manager_name FROM outlets o LEFT JOIN users u ON o.manager_id=u.id WHERE 1=1";
    const p = [];
    if (search){ sql+=" AND (o.name LIKE ? OR o.outlet_code LIKE ? OR o.city LIKE ?)"; p.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    if (status){ sql+=" AND o.status=?"; p.push(status); }
    if (city)  { sql+=" AND o.city=?";   p.push(city); }
    sql += " ORDER BY o.created_at DESC";
    const [rows] = await db.query(sql, p);
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getOutletById = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT o.*, u.name AS manager_name FROM outlets o LEFT JOIN users u ON o.manager_id=u.id WHERE o.id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:"Outlet not found" });
    res.json({ success:true, data:rows[0] });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.createOutlet = async (req, res) => {
  try {
    const { outlet_code, name, phone, email, address, city, state, pincode, manager_id, status="active" } = req.body;
    if (!name) return res.status(400).json({ success:false, message:"Outlet name is required" });
    const [r] = await db.query(
      "INSERT INTO outlets (outlet_code,name,phone,email,address,city,state,pincode,manager_id,status) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [outlet_code||null,name,phone||null,email||null,address||null,city||null,state||null,pincode||null,manager_id||null,status]
    );
    res.status(201).json({ success:true, message:"Outlet created", id:r.insertId });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.updateOutlet = async (req, res) => {
  try {
    const { outlet_code, name, phone, email, address, city, state, pincode, manager_id, status } = req.body;
    const [ex] = await db.query("SELECT id FROM outlets WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Outlet not found" });
    await db.query(
      "UPDATE outlets SET outlet_code=?,name=?,phone=?,email=?,address=?,city=?,state=?,pincode=?,manager_id=?,status=? WHERE id=?",
      [outlet_code||null,name,phone||null,email||null,address||null,city||null,state||null,pincode||null,manager_id||null,status||"active",req.params.id]
    );
    res.json({ success:true, message:"Outlet updated" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.updateOutletStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active","inactive"].includes(status)) return res.status(400).json({ success:false, message:"Invalid status" });
    const [ex] = await db.query("SELECT id FROM outlets WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Outlet not found" });
    await db.query("UPDATE outlets SET status=? WHERE id=?", [status,req.params.id]);
    res.json({ success:true, message:`Outlet marked ${status}` });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.deleteOutlet = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM outlets WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Outlet not found" });
    await db.query("DELETE FROM outlets WHERE id=?", [req.params.id]);
    res.json({ success:true, message:"Outlet deleted" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 2: OUTLET STOCK BALANCE ──────────────────────────────────────

exports.getStockSummary = async (req, res) => {
  try {
    const [[rec]]  = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock");
    const [[outs]] = await db.query("SELECT COUNT(DISTINCT outlet_id) AS cnt FROM outlet_stock");
    const [[qty]]  = await db.query("SELECT COALESCE(SUM(available_qty),0) AS total FROM outlet_stock");
    const [[low]]  = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock os JOIN products p ON os.product_id=p.id WHERE os.available_qty<=p.reorder_level AND p.reorder_level>0");
    res.json({ success:true, data:{ total_records:rec.cnt, outlets_with_stock:outs.cnt, total_quantity:qty.total, low_stock_count:low.cnt } });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getStock = async (req, res) => {
  try {
    const { outlet_id="", search="" } = req.query;
    let sql = `SELECT os.*,o.name AS outlet_name,p.name AS product_name,p.product_code,p.reorder_level,p.min_stock_level,u.short_name AS unit
               FROM outlet_stock os JOIN outlets o ON os.outlet_id=o.id JOIN products p ON os.product_id=p.id LEFT JOIN units u ON p.unit_id=u.id WHERE 1=1`;
    const p = [];
    if (outlet_id){ sql+=" AND os.outlet_id=?"; p.push(outlet_id); }
    if (search)   { sql+=" AND (p.name LIKE ? OR p.product_code LIKE ?)"; p.push(`%${search}%`,`%${search}%`); }
    sql += " ORDER BY o.name,p.name";
    const [rows] = await db.query(sql, p);
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getStockByOutlet = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT os.*,p.name AS product_name,p.product_code,p.reorder_level,u.short_name AS unit
       FROM outlet_stock os JOIN products p ON os.product_id=p.id LEFT JOIN units u ON p.unit_id=u.id
       WHERE os.outlet_id=? ORDER BY p.name`,
      [req.params.outletId]
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getStockByProduct = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT os.*,o.name AS outlet_name FROM outlet_stock os JOIN outlets o ON os.outlet_id=o.id WHERE os.product_id=? ORDER BY o.name",
      [req.params.productId]
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 3: OUTLET STOCK REQUESTS ─────────────────────────────────────

exports.getRequestsSummary = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT status,COUNT(*) AS cnt FROM outlet_stock_requests GROUP BY status");
    const s = { total:0, draft:0, submitted:0, approved:0, dispatched:0, received:0, cancelled:0 };
    rows.forEach(r=>{ if(s[r.status]!==undefined) s[r.status]=r.cnt; s.total+=r.cnt; });
    res.json({ success:true, data:s });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getRequests = async (req, res) => {
  try {
    const { outlet_id="", status="", search="" } = req.query;
    let sql = `SELECT r.*,o.name AS outlet_name,w.name AS warehouse_name,u.name AS created_by_name
               FROM outlet_stock_requests r JOIN outlets o ON r.outlet_id=o.id
               LEFT JOIN warehouses w ON r.warehouse_id=w.id LEFT JOIN users u ON r.created_by=u.id WHERE 1=1`;
    const p = [];
    if (outlet_id){ sql+=" AND r.outlet_id=?"; p.push(outlet_id); }
    if (status)   { sql+=" AND r.status=?";    p.push(status); }
    if (search)   { sql+=" AND r.request_number LIKE ?"; p.push(`%${search}%`); }
    sql += " ORDER BY r.created_at DESC";
    const [rows] = await db.query(sql, p);
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getRequestById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*,o.name AS outlet_name,w.name AS warehouse_name,u.name AS created_by_name
       FROM outlet_stock_requests r JOIN outlets o ON r.outlet_id=o.id
       LEFT JOIN warehouses w ON r.warehouse_id=w.id LEFT JOIN users u ON r.created_by=u.id
       WHERE r.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:"Request not found" });
    const [items] = await db.query(
      `SELECT i.*,p.name AS product_name,p.product_code,u.short_name AS unit
       FROM outlet_stock_request_items i JOIN products p ON i.product_id=p.id LEFT JOIN units u ON p.unit_id=u.id
       WHERE i.outlet_stock_request_id=?`,
      [req.params.id]
    );
    res.json({ success:true, data:{ ...rows[0], items } });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.createRequest = async (req, res) => {
  try {
    const { outlet_id, warehouse_id, request_date, required_date, items=[] } = req.body;
    if (!outlet_id) return res.status(400).json({ success:false, message:"Outlet is required" });
    const request_number = genReqNumber();
    const [r] = await db.query(
      "INSERT INTO outlet_stock_requests (request_number,outlet_id,warehouse_id,request_date,required_date,status,created_by) VALUES (?,?,?,?,?,?,?)",
      [request_number,outlet_id,warehouse_id||null,request_date||null,required_date||null,"draft",req.user?.id||null]
    );
    const reqId = r.insertId;
    for (const item of items) {
      if (item.product_id && Number(item.requested_qty) > 0) {
        await db.query(
          "INSERT INTO outlet_stock_request_items (outlet_stock_request_id,product_id,requested_qty) VALUES (?,?,?)",
          [reqId, item.product_id, item.requested_qty]
        );
      }
    }
    res.status(201).json({ success:true, message:"Request created", id:reqId, request_number });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.updateRequest = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id,status FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Request not found" });
    if (ex[0].status !== "draft") return res.status(400).json({ success:false, message:"Only draft requests can be edited" });
    const { warehouse_id, request_date, required_date } = req.body;
    await db.query("UPDATE outlet_stock_requests SET warehouse_id=?,request_date=?,required_date=? WHERE id=?",
      [warehouse_id||null,request_date||null,required_date||null,req.params.id]);
    res.json({ success:true, message:"Request updated" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["draft","submitted","approved","dispatched","received","cancelled"];
    if (!valid.includes(status)) return res.status(400).json({ success:false, message:"Invalid status" });
    const [ex] = await db.query("SELECT id FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Request not found" });
    await db.query("UPDATE outlet_stock_requests SET status=? WHERE id=?", [status,req.params.id]);
    res.json({ success:true, message:`Status updated to ${status}` });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.deleteRequest = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id,status FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Request not found" });
    if (!["draft","cancelled"].includes(ex[0].status)) return res.status(400).json({ success:false, message:"Only draft or cancelled requests can be deleted" });
    await db.query("DELETE FROM outlet_stock_request_items WHERE outlet_stock_request_id=?", [req.params.id]);
    await db.query("DELETE FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    res.json({ success:true, message:"Request deleted" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 4: REQUEST ITEMS ──────────────────────────────────────────────

exports.getRequestItems = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*,p.name AS product_name,p.product_code,u.short_name AS unit
       FROM outlet_stock_request_items i JOIN products p ON i.product_id=p.id LEFT JOIN units u ON p.unit_id=u.id
       WHERE i.outlet_stock_request_id=?`,
      [req.params.requestId]
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.addRequestItem = async (req, res) => {
  try {
    const { product_id, requested_qty } = req.body;
    if (!product_id || !requested_qty) return res.status(400).json({ success:false, message:"product_id and requested_qty are required" });
    const [ex] = await db.query("SELECT id,status FROM outlet_stock_requests WHERE id=?", [req.params.requestId]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Request not found" });
    if (ex[0].status !== "draft") return res.status(400).json({ success:false, message:"Cannot add items to a non-draft request" });
    const [r] = await db.query(
      "INSERT INTO outlet_stock_request_items (outlet_stock_request_id,product_id,requested_qty) VALUES (?,?,?)",
      [req.params.requestId, product_id, requested_qty]
    );
    res.status(201).json({ success:true, message:"Item added", id:r.insertId });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.updateRequestItem = async (req, res) => {
  try {
    const { requested_qty, approved_qty } = req.body;
    const [ex] = await db.query("SELECT id FROM outlet_stock_request_items WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Item not found" });
    await db.query(
      "UPDATE outlet_stock_request_items SET requested_qty=COALESCE(?,requested_qty),approved_qty=COALESCE(?,approved_qty) WHERE id=?",
      [requested_qty??null, approved_qty??null, req.params.id]
    );
    res.json({ success:true, message:"Item updated" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.deleteRequestItem = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id FROM outlet_stock_request_items WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Item not found" });
    await db.query("DELETE FROM outlet_stock_request_items WHERE id=?", [req.params.id]);
    res.json({ success:true, message:"Item deleted" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 5: STOCK TRANSFER ─────────────────────────────────────────────

exports.issueStock = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [reqs] = await conn.query("SELECT * FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    if (!reqs.length){ await conn.rollback(); return res.status(404).json({ success:false, message:"Request not found" }); }
    const request = reqs[0];
    if (request.status !== "approved"){ await conn.rollback(); return res.status(400).json({ success:false, message:`Request must be approved first. Current: ${request.status}` }); }
    const [items] = await conn.query("SELECT * FROM outlet_stock_request_items WHERE outlet_stock_request_id=?", [req.params.id]);
    if (!items.length){ await conn.rollback(); return res.status(400).json({ success:false, message:"No items in request" }); }
    for (const item of items) {
      const qty = item.approved_qty > 0 ? Number(item.approved_qty) : Number(item.requested_qty);
      if (qty <= 0) continue;
      if (request.warehouse_id) {
        await conn.query(
          "UPDATE inventories SET available_qty=GREATEST(0,available_qty-?) WHERE warehouse_id=? AND product_id=?",
          [qty, request.warehouse_id, item.product_id]
        );
        await conn.query(
          "INSERT INTO stock_movements (warehouse_id,product_id,movement_type,quantity,reference_type,reference_id,created_by) VALUES (?,?,?,?,?,?,?)",
          [request.warehouse_id, item.product_id, "out", qty, "outlet_stock_request", req.params.id, req.user?.id||null]
        );
      }
      await conn.query(
        "INSERT INTO outlet_stock (outlet_id,product_id,available_qty) VALUES (?,?,?) ON DUPLICATE KEY UPDATE available_qty=available_qty+VALUES(available_qty)",
        [request.outlet_id, item.product_id, qty]
      );
      await conn.query("UPDATE outlet_stock_request_items SET issued_qty=? WHERE id=?", [qty, item.id]);
    }
    await conn.query("UPDATE outlet_stock_requests SET status='dispatched' WHERE id=?", [req.params.id]);
    await conn.commit();
    res.json({ success:true, message:"Stock issued and dispatched successfully" });
  } catch(e){ await conn.rollback(); res.status(500).json({ success:false, message:e.message }); }
  finally { conn.release(); }
};

exports.receiveStock = async (req, res) => {
  try {
    const [reqs] = await db.query("SELECT * FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    if (!reqs.length) return res.status(404).json({ success:false, message:"Request not found" });
    if (reqs[0].status !== "dispatched") return res.status(400).json({ success:false, message:`Request must be dispatched first. Current: ${reqs[0].status}` });
    await db.query("UPDATE outlet_stock_requests SET status='received' WHERE id=?", [req.params.id]);
    res.json({ success:true, message:"Stock received and completed" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getTransfers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*,o.name AS outlet_name,w.name AS warehouse_name,COUNT(i.id) AS item_count,COALESCE(SUM(i.issued_qty),0) AS total_issued
       FROM outlet_stock_requests r JOIN outlets o ON r.outlet_id=o.id LEFT JOIN warehouses w ON r.warehouse_id=w.id
       LEFT JOIN outlet_stock_request_items i ON r.id=i.outlet_stock_request_id
       WHERE r.status IN ('dispatched','received') GROUP BY r.id ORDER BY r.created_at DESC`
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getTransfersSummary = async (req, res) => {
  try {
    const [[d]] = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='dispatched'");
    const [[r]] = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='received'");
    res.json({ success:true, data:{ dispatched:d.cnt, received:r.cnt, total:d.cnt+r.cnt } });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 6: APPROVALS ──────────────────────────────────────────────────

exports.getApprovalsSummary = async (req, res) => {
  try {
    const [[p]] = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='submitted'");
    const [[a]] = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='approved'");
    res.json({ success:true, data:{ pending_approvals:p.cnt, approved:a.cnt } });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getApprovals = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*,o.name AS outlet_name,w.name AS warehouse_name,u.name AS created_by_name
       FROM outlet_stock_requests r JOIN outlets o ON r.outlet_id=o.id
       LEFT JOIN warehouses w ON r.warehouse_id=w.id LEFT JOIN users u ON r.created_by=u.id
       WHERE r.status IN ('submitted','approved') ORDER BY r.created_at DESC`
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.approveRequest = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id,status FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Request not found" });
    if (ex[0].status !== "submitted") return res.status(400).json({ success:false, message:`Only submitted requests can be approved. Current: ${ex[0].status}` });
    const [items] = await db.query("SELECT id FROM outlet_stock_request_items WHERE outlet_stock_request_id=?", [req.params.id]);
    if (!items.length) return res.status(400).json({ success:false, message:"Cannot approve request with no items" });
    const { approved_quantities=[] } = req.body;
    for (const aq of approved_quantities) {
      if (aq.item_id && aq.approved_qty >= 0) {
        await db.query("UPDATE outlet_stock_request_items SET approved_qty=? WHERE id=? AND outlet_stock_request_id=?", [aq.approved_qty, aq.item_id, req.params.id]);
      }
    }
    await db.query("UPDATE outlet_stock_requests SET status='approved' WHERE id=?", [req.params.id]);
    res.json({ success:true, message:"Request approved" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.rejectRequest = async (req, res) => {
  try {
    const [ex] = await db.query("SELECT id,status FROM outlet_stock_requests WHERE id=?", [req.params.id]);
    if (!ex.length) return res.status(404).json({ success:false, message:"Request not found" });
    if (!["submitted","approved"].includes(ex[0].status)) return res.status(400).json({ success:false, message:`Cannot reject a request in '${ex[0].status}' status` });
    await db.query("UPDATE outlet_stock_requests SET status='cancelled' WHERE id=?", [req.params.id]);
    res.json({ success:true, message:"Request rejected" });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 7: REPORTS ────────────────────────────────────────────────────

exports.getReportsSummary = async (req, res) => {
  try {
    const [[outlets]]    = await db.query("SELECT COUNT(*) AS cnt FROM outlets WHERE status='active'");
    const [[products]]   = await db.query("SELECT COUNT(DISTINCT product_id) AS cnt FROM outlet_stock");
    const [[qty]]        = await db.query("SELECT COALESCE(SUM(available_qty),0) AS total FROM outlet_stock");
    const [[low]]        = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock os JOIN products p ON os.product_id=p.id WHERE os.available_qty<=p.reorder_level AND p.reorder_level>0");
    const [[pending]]    = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='submitted'");
    const [[approved]]   = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='approved'");
    const [[dispatched]] = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='dispatched'");
    const [[received]]   = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock_requests WHERE status='received'");
    res.json({ success:true, data:{
      active_outlets:outlets.cnt, products_in_stock:products.cnt, total_stock_qty:qty.total,
      low_stock_alerts:low.cnt, pending_requests:pending.cnt, approved_requests:approved.cnt,
      dispatched_requests:dispatched.cnt, received_requests:received.cnt,
    }});
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getOutletStockReport = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.name AS outlet,p.name AS product,p.product_code,os.available_qty,u.short_name AS unit,os.updated_at
       FROM outlet_stock os JOIN outlets o ON os.outlet_id=o.id JOIN products p ON os.product_id=p.id
       LEFT JOIN units u ON p.unit_id=u.id ORDER BY o.name,p.name`
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getRequestsReport = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.request_number,o.name AS outlet_name,w.name AS warehouse_name,r.status,r.request_date,r.created_at
       FROM outlet_stock_requests r JOIN outlets o ON r.outlet_id=o.id LEFT JOIN warehouses w ON r.warehouse_id=w.id
       ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getLowStockReport = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT os.outlet_id,o.name AS outlet_name,p.name AS product_name,p.product_code,
              os.available_qty,p.reorder_level AS min_qty,p.min_stock_level,u.short_name AS unit
       FROM outlet_stock os JOIN outlets o ON os.outlet_id=o.id JOIN products p ON os.product_id=p.id
       LEFT JOIN units u ON p.unit_id=u.id WHERE os.available_qty<=p.reorder_level AND p.reorder_level>0
       ORDER BY o.name,os.available_qty ASC`
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getTransfersReport = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.request_number,o.name AS outlet_name,w.name AS warehouse_name,r.status,r.request_date,
              COUNT(i.id) AS item_count,COALESCE(SUM(i.issued_qty),0) AS total_issued_qty
       FROM outlet_stock_requests r JOIN outlets o ON r.outlet_id=o.id LEFT JOIN warehouses w ON r.warehouse_id=w.id
       LEFT JOIN outlet_stock_request_items i ON r.id=i.outlet_stock_request_id
       WHERE r.status IN ('dispatched','received') GROUP BY r.id ORDER BY r.created_at DESC`
    );
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 8: LOW STOCK ALERTS ───────────────────────────────────────────

exports.getAlertsSummary = async (req, res) => {
  try {
    const [[low]] = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock os JOIN products p ON os.product_id=p.id WHERE os.available_qty<=p.reorder_level AND p.reorder_level>0");
    const [[oos]] = await db.query("SELECT COUNT(*) AS cnt FROM outlet_stock WHERE available_qty=0");
    res.json({ success:true, data:{ low_stock_items:low.cnt, out_of_stock_items:oos.cnt } });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};

exports.getLowStockAlerts = async (req, res) => {
  try {
    const { outlet_id="" } = req.query;
    let sql = `SELECT os.outlet_id,o.name AS outlet_name,os.product_id,p.name AS product_name,p.product_code,
               os.available_qty,p.reorder_level AS min_qty,p.min_stock_level,u.short_name AS unit,
               CASE WHEN os.available_qty=0 THEN 'out_of_stock'
                    WHEN p.min_stock_level>0 AND os.available_qty<=p.min_stock_level THEN 'critical'
                    ELSE 'low' END AS alert_level
               FROM outlet_stock os JOIN outlets o ON os.outlet_id=o.id
               JOIN products p ON os.product_id=p.id LEFT JOIN units u ON p.unit_id=u.id
               WHERE os.available_qty<=p.reorder_level AND p.reorder_level>0`;
    const params = [];
    if (outlet_id){ sql+=" AND os.outlet_id=?"; params.push(outlet_id); }
    sql += " ORDER BY o.name,os.available_qty ASC";
    const [rows] = await db.query(sql, params);
    res.json({ success:true, data:rows });
  } catch(e){ res.status(500).json({ success:false, message:e.message }); }
};
