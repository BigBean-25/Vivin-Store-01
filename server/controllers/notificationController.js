const db = require("../config/db");

//  Column cache 
let _nc = null;
const getNotiCols = async () => {
  if (!_nc) { const [r] = await db.query("SHOW COLUMNS FROM notifications"); _nc = r.map(c => c.Field); }
  return _nc;
};
const has = (cols, f) => cols.includes(f);
const selBase = (cols) => {
  const base = ["id","title","message","type","module","reference_id","created_by","created_at"];
  const opt  = ["priority","target_type","target_id","status","updated_at"].filter(f => has(cols,f));
  return [...base,...opt].join(",");
};

//  MODULE 1: SUMMARY 
exports.getSummary = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const [[t]]  = await db.query("SELECT COUNT(*) v FROM notifications");
    const [[td]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE DATE(created_at)=CURDATE()");
    const [[rd]] = await db.query("SELECT COUNT(*) v FROM notification_reads");
    const [[ur]] = await db.query("SELECT COUNT(DISTINCT notification_id) v FROM notification_reads");
    let active=t.v, inactive=0, high=0, urgent=0, userW=0, roleW=0, outletW=0;
    if (has(cols,"status")) {
      const [[a]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE status='active'");
      const [[i]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE status='inactive'");
      active=a.v; inactive=i.v;
    }
    if (has(cols,"priority")) {
      const [[h]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE priority='high'");
      const [[u]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE priority='urgent'");
      high=h.v; urgent=u.v;
    }
    if (has(cols,"target_type")) {
      const [[u]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE target_type='user'");
      const [[r]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE target_type='role'");
      const [[o]] = await db.query("SELECT COUNT(*) v FROM notifications WHERE target_type='outlet'");
      userW=u.v; roleW=r.v; outletW=o.v;
    }
    res.json({ success:true, data:{ total_notifications:t.v, today_notifications:td.v, total_reads:rd.v, read_notifications:ur.v, active_notifications:active, inactive_notifications:inactive, high_priority:high, urgent_priority:urgent, user_wise:userW, role_wise:roleW, outlet_wise:outletW } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

//  MODULE 2: ALL NOTIFICATIONS 
exports.getNotifications = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const { search="", type="", status="", priority="", limit=100 } = req.query;
    let sql = "SELECT " + selBase(cols) + " FROM notifications WHERE 1=1";
    const p = [];
    if (search)   { sql += " AND (title LIKE ? OR message LIKE ?)"; p.push("%"+search+"%","%"+search+"%"); }
    if (type)     { sql += " AND type=?"; p.push(type); }
    if (status   && has(cols,"status"))   { sql += " AND status=?";   p.push(status); }
    if (priority && has(cols,"priority")) { sql += " AND priority=?"; p.push(priority); }
    sql += " ORDER BY created_at DESC LIMIT ?";
    p.push(parseInt(limit)||100);
    const [rows] = await db.query(sql, p);
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getNotificationById = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const [rows] = await db.query("SELECT " + selBase(cols) + " FROM notifications WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:"Notification not found" });
    res.json({ success:true, data:rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.createNotification = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const { title, message="", type="info", module:mod="", reference_id=null } = req.body;
    if (!title) return res.status(400).json({ success:false, message:"Title is required" });
    const fields = ["title","message","type","module","reference_id","created_by"];
    const vals   = [title, message, type, mod, reference_id, req.user.id];
    if (has(cols,"priority"))    { fields.push("priority");    vals.push(req.body.priority||"medium"); }
    if (has(cols,"target_type")) { fields.push("target_type"); vals.push(req.body.target_type||"all"); }
    if (has(cols,"target_id"))   { fields.push("target_id");   vals.push(req.body.target_id||null); }
    if (has(cols,"status"))      { fields.push("status");      vals.push(req.body.status||"active"); }
    const [r] = await db.query("INSERT INTO notifications ("+fields.join(",")+") VALUES ("+fields.map(()=>"?").join(",")+")", vals);
    res.status(201).json({ success:true, message:"Notification created", id:r.insertId });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.updateNotification = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const sets=[]; const vals=[];
    ["title","message","type","module","reference_id"].forEach(f => {
      if (req.body[f]!==undefined) { sets.push(f+"=?"); vals.push(req.body[f]); }
    });
    ["priority","target_type","target_id","status"].forEach(f => {
      if (req.body[f]!==undefined && has(cols,f)) { sets.push(f+"=?"); vals.push(req.body[f]); }
    });
    if (!sets.length) return res.status(400).json({ success:false, message:"Nothing to update" });
    vals.push(req.params.id);
    await db.query("UPDATE notifications SET "+sets.join(",")+" WHERE id=?", vals);
    res.json({ success:true, message:"Updated" });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const cols = await getNotiCols();
    if (!has(cols,"status")) return res.json({ success:true, message:"Run SQL migration to enable status" });
    const { status } = req.body;
    if (!["active","inactive"].includes(status)) return res.status(400).json({ success:false, message:"Invalid status" });
    await db.query("UPDATE notifications SET status=? WHERE id=?", [status, req.params.id]);
    res.json({ success:true, message:"Status set to "+status });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.deleteNotification = async (req, res) => {
  try {
    await db.query("DELETE FROM notification_reads WHERE notification_id=?", [req.params.id]);
    await db.query("DELETE FROM notifications WHERE id=?", [req.params.id]);
    res.json({ success:true, message:"Deleted" });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

//  MODULE 3: SEND NOTIFICATION 
exports.sendNotification = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const { title, message="", type="info", module:mod="general", priority="medium", target_type="all", target_id=null } = req.body;
    if (!title) return res.status(400).json({ success:false, message:"Title is required" });
    const fields = ["title","message","type","module","created_by"];
    const vals   = [title, message, type, mod, req.user.id];
    if (has(cols,"priority"))    { fields.push("priority");    vals.push(priority); }
    if (has(cols,"target_type")) { fields.push("target_type"); vals.push(target_type); }
    if (has(cols,"target_id"))   { fields.push("target_id");   vals.push(target_id); }
    if (has(cols,"status"))      { fields.push("status");      vals.push("active"); }
    const [r] = await db.query("INSERT INTO notifications ("+fields.join(",")+") VALUES ("+fields.map(()=>"?").join(",")+")", vals);
    const notifId = r.insertId;
    let userCount = 0;
    try {
      let userIds = [];
      if (target_type==="all") {
        const [us] = await db.query("SELECT id FROM users WHERE status='active'");
        userIds = us.map(u => u.id);
      } else if (target_type==="user" && target_id) {
        userIds = [parseInt(target_id)];
      } else if (target_type==="role" && target_id) {
        const [ur] = await db.query("SELECT user_id FROM user_roles WHERE role_id=?", [target_id]);
        userIds = ur.map(r => r.user_id);
      } else if (target_type==="outlet" && target_id) {
        try {
          const [uo] = await db.query("SELECT user_id FROM user_outlets WHERE outlet_id=?", [target_id]);
          userIds = uo.map(r => r.user_id);
        } catch { userIds = []; }
      }
      userCount = userIds.length;
    } catch { userCount = 0; }
    res.status(201).json({ success:true, message:"Notification sent ("+userCount+" user(s) targeted)", id:notifId, target_count:userCount });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 4: USER-WISE ───────────────────────────────────────────────────
exports.getUsersForNotifications = async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, name, email, user_type, status FROM users WHERE status!='blocked' ORDER BY name ASC");
    const [rc] = await db.query("SELECT user_id, COUNT(*) cnt FROM notification_reads GROUP BY user_id");
    const rcMap = Object.fromEntries(rc.map(r => [r.user_id, r.cnt]));
    res.json({ success:true, data: users.map(u => ({ ...u, read_count: rcMap[u.id]||0 })) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const selN = selBase(cols).split(",").map(c => "n."+c.trim()).join(",");
    const [rows] = await db.query(
      "SELECT "+selN+", IF(nr.id IS NOT NULL,1,0) AS is_read, nr.read_at FROM notifications n LEFT JOIN notification_reads nr ON n.id=nr.notification_id AND nr.user_id=? ORDER BY n.created_at DESC LIMIT 100",
      [req.params.userId]
    );
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.sendToUser = async (req, res) => {
  req.body.target_type = "user"; req.body.target_id = req.params.userId;
  return exports.sendNotification(req, res);
};

// ── MODULE 5: ROLE-WISE ───────────────────────────────────────────────────
exports.getRolesForNotifications = async (req, res) => {
  try {
    const [roles] = await db.query("SELECT id, name, display_name, status FROM roles WHERE status='active' ORDER BY display_name ASC");
    const [uc] = await db.query("SELECT role_id, COUNT(*) cnt FROM user_roles GROUP BY role_id");
    const ucMap = Object.fromEntries(uc.map(r => [r.role_id, r.cnt]));
    res.json({ success:true, data: roles.map(r => ({ ...r, user_count: ucMap[r.id]||0 })) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getRoleNotifications = async (req, res) => {
  try {
    const cols = await getNotiCols();
    let sql = "SELECT "+selBase(cols)+" FROM notifications";
    const p = [];
    if (has(cols,"target_type") && has(cols,"target_id")) {
      sql += " WHERE (target_type='role' AND target_id=?) OR target_type='all'";
      p.push(req.params.roleId);
    }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const [rows] = await db.query(sql, p);
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.sendToRole = async (req, res) => {
  req.body.target_type = "role"; req.body.target_id = req.params.roleId;
  return exports.sendNotification(req, res);
};

// ── MODULE 6: OUTLET-WISE ─────────────────────────────────────────────────
exports.getOutletsForNotifications = async (req, res) => {
  try {
    const [outlets] = await db.query("SELECT id, outlet_code, name, status FROM outlets WHERE status='active' ORDER BY name ASC");
    res.json({ success:true, data:outlets });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getOutletNotifications = async (req, res) => {
  try {
    const cols = await getNotiCols();
    let sql = "SELECT "+selBase(cols)+" FROM notifications";
    const p = [];
    if (has(cols,"target_type") && has(cols,"target_id")) {
      sql += " WHERE (target_type='outlet' AND target_id=?) OR target_type='all'";
      p.push(req.params.outletId);
    }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const [rows] = await db.query(sql, p);
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.sendToOutlet = async (req, res) => {
  req.body.target_type = "outlet"; req.body.target_id = req.params.outletId;
  return exports.sendNotification(req, res);
};

// ── MODULE 7: READ TRACKING ───────────────────────────────────────────────
exports.getReadTrackingSummary = async (req, res) => {
  try {
    const [[total]]   = await db.query("SELECT COUNT(*) v FROM notifications");
    const [[rd]]      = await db.query("SELECT COUNT(*) v FROM notification_reads");
    const [[myRd]]    = await db.query("SELECT COUNT(*) v FROM notification_reads WHERE user_id=?", [req.user.id]);
    const [[usersRd]] = await db.query("SELECT COUNT(DISTINCT user_id) v FROM notification_reads");
    res.json({ success:true, data:{ total_notifications:total.v, total_read_events:rd.v, my_reads:myRd.v, users_with_reads:usersRd.v, my_unread: total.v - myRd.v } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getReadTracking = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const selN = selBase(cols).split(",").map(c => "n."+c.trim()).join(",");
    const [rows] = await db.query(
      "SELECT "+selN+", u.name AS user_name, u.email AS user_email, nr.read_at FROM notification_reads nr JOIN notifications n ON nr.notification_id=n.id JOIN users u ON nr.user_id=u.id ORDER BY nr.read_at DESC LIMIT 200"
    );
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.markRead = async (req, res) => {
  try {
    await db.query("INSERT IGNORE INTO notification_reads (notification_id,user_id,read_at) VALUES (?,?,NOW())", [req.params.id, req.user.id]);
    res.json({ success:true, message:"Marked as read" });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.markUnread = async (req, res) => {
  try {
    await db.query("DELETE FROM notification_reads WHERE notification_id=? AND user_id=?", [req.params.id, req.user.id]);
    res.json({ success:true, message:"Marked as unread" });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.query("INSERT IGNORE INTO notification_reads (notification_id,user_id,read_at) SELECT id,?,NOW() FROM notifications", [req.user.id]);
    res.json({ success:true, message:"All notifications marked as read" });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── MODULE 8: REPORTS ─────────────────────────────────────────────────────
exports.getReportsSummary = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const [[total]]        = await db.query("SELECT COUNT(*) v FROM notifications");
    const [[reads]]        = await db.query("SELECT COUNT(*) v FROM notification_reads");
    const [[distinctRead]] = await db.query("SELECT COUNT(DISTINCT notification_id) v FROM notification_reads");
    const [byType]         = await db.query("SELECT type, COUNT(*) AS cnt FROM notifications GROUP BY type ORDER BY cnt DESC");
    let byPriority=[], byStatus=[];
    if (has(cols,"priority")) {
      const [bp] = await db.query("SELECT priority, COUNT(*) cnt FROM notifications GROUP BY priority ORDER BY cnt DESC");
      byPriority = bp;
    }
    if (has(cols,"status")) {
      const [bs] = await db.query("SELECT status, COUNT(*) cnt FROM notifications GROUP BY status");
      byStatus = bs;
    }
    res.json({ success:true, data:{ total_notifications:total.v, total_reads:reads.v, distinct_read_count:distinctRead.v, by_type:byType, by_priority:byPriority, by_status:byStatus } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getReportsByType = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT type, COUNT(*) AS count, MAX(created_at) AS last_at FROM notifications GROUP BY type ORDER BY count DESC");
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getReportsByPriority = async (req, res) => {
  try {
    const cols = await getNotiCols();
    if (!has(cols,"priority")) return res.json({ success:true, data:[], message:"Run SQL migration to enable priority" });
    const [rows] = await db.query("SELECT priority, COUNT(*) AS count FROM notifications GROUP BY priority ORDER BY count DESC");
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getReportsByUser = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT u.id, u.name, u.email, u.user_type, COUNT(nr.id) AS read_count FROM users u LEFT JOIN notification_reads nr ON u.id=nr.user_id WHERE u.status='active' GROUP BY u.id, u.name, u.email, u.user_type ORDER BY read_count DESC LIMIT 50"
    );
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getReportsReadStatus = async (req, res) => {
  try {
    const cols = await getNotiCols();
    const selN = selBase(cols).split(",").map(c => "n."+c.trim()).join(",");
    const [rows] = await db.query(
      "SELECT "+selN+", COUNT(nr.id) AS read_count FROM notifications n LEFT JOIN notification_reads nr ON n.id=nr.notification_id GROUP BY n.id ORDER BY n.created_at DESC LIMIT 100"
    );
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getReportsTargetWise = async (req, res) => {
  try {
    const cols = await getNotiCols();
    if (!has(cols,"target_type")) return res.json({ success:true, data:[], message:"Run SQL migration to enable target_type" });
    const [rows] = await db.query("SELECT target_type, COUNT(*) AS count FROM notifications GROUP BY target_type ORDER BY count DESC");
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};
