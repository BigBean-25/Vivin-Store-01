const db = require("../config/db");

const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

exports.getReportSummary = async (req, res) => {
  try {
    const [[del]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN delivery_status='pending'    THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN delivery_status='assigned'   THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN delivery_status='picked'     THEN 1 ELSE 0 END) AS picked,
        SUM(CASE WHEN delivery_status='in_transit' THEN 1 ELSE 0 END) AS in_transit,
        SUM(CASE WHEN delivery_status='delivered'  THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN delivery_status='failed'     THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN delivery_status='cancelled'  THEN 1 ELSE 0 END) AS cancelled
      FROM deliveries
    `);
    const [[drv]] = await db.query(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available, SUM(CASE WHEN status='busy' THEN 1 ELSE 0 END) AS busy FROM delivery_drivers"
    );
    const [[pod]] = await db.query("SELECT COUNT(*) AS total FROM delivery_proofs");
    res.json({ success: true, summary: { deliveries: del, drivers: drv, proofs: pod } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch summary", error: error.message });
  }
};

exports.getDeliveriesReport = async (req, res) => {
  try {
    const { from_date, to_date, delivery_status } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date)       { where.push("DATE(d.created_at) >= ?"); params.push(from_date); }
    if (to_date)         { where.push("DATE(d.created_at) <= ?"); params.push(to_date); }
    if (delivery_status) { where.push("d.delivery_status = ?");   params.push(delivery_status); }
    const [rows] = await db.query(`
      SELECT d.id, d.delivery_number, d.delivery_date, d.delivery_status,
             o.order_number, c.business_name AS customer_name,
             dd.name AS driver_name
      FROM deliveries d
      LEFT JOIN orders o            ON o.id  = d.order_id
      LEFT JOIN customers c         ON c.id  = d.customer_id
      LEFT JOIN delivery_drivers dd ON dd.id = d.driver_id
      WHERE ${where.join(" AND ")}
      ORDER BY d.id DESC
    `, params);
    res.json({ success: true, count: rows.length, deliveries: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch deliveries report", error: error.message });
  }
};

exports.getDriversReport = async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT dd.id, dd.driver_code, dd.name, dd.phone, dd.vehicle_type, dd.vehicle_number, dd.status,
             COUNT(d.id)                                          AS total_deliveries,
             SUM(CASE WHEN d.delivery_status='delivered'  THEN 1 ELSE 0 END) AS delivered,
             SUM(CASE WHEN d.delivery_status='failed'     THEN 1 ELSE 0 END) AS failed,
             SUM(CASE WHEN d.delivery_status='cancelled'  THEN 1 ELSE 0 END) AS cancelled
      FROM delivery_drivers dd
      LEFT JOIN deliveries d ON d.driver_id = dd.id
      GROUP BY dd.id
      ORDER BY delivered DESC
    `);
    res.json({ success: true, count: drivers.length, drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch drivers report", error: error.message });
  }
};

exports.getAssignmentsReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("DATE(da.assigned_at) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(da.assigned_at) <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT da.id, da.assigned_at, da.status,
             d.delivery_number, d.delivery_status,
             dd.name AS driver_name, dd.driver_code
      FROM delivery_assignments da
      LEFT JOIN deliveries d        ON d.id  = da.delivery_id
      LEFT JOIN delivery_drivers dd ON dd.id = da.driver_id
      WHERE ${where.join(" AND ")}
      ORDER BY da.id DESC
    `, params);
    res.json({ success: true, count: rows.length, assignments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch assignments report", error: error.message });
  }
};

exports.getStatusLogsReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("DATE(sl.changed_at) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(sl.changed_at) <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT sl.id, sl.old_status, sl.new_status, sl.remarks, sl.changed_at,
             d.delivery_number
      FROM delivery_status_logs sl
      LEFT JOIN deliveries d ON d.id = sl.delivery_id
      WHERE ${where.join(" AND ")}
      ORDER BY sl.id DESC LIMIT 500
    `, params);
    res.json({ success: true, count: rows.length, logs: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch status logs report", error: error.message });
  }
};

exports.getProofsReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("DATE(dp.captured_at) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(dp.captured_at) <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT dp.id, dp.proof_type, dp.received_by, dp.received_phone, dp.captured_at,
             d.delivery_number, d.delivery_status
      FROM delivery_proofs dp
      LEFT JOIN deliveries d ON d.id = dp.delivery_id
      WHERE ${where.join(" AND ")}
      ORDER BY dp.id DESC
    `, params);
    res.json({ success: true, count: rows.length, proofs: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch proofs report", error: error.message });
  }
};

exports.getRoutesReport = async (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("r.route_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("r.route_date <= ?"); params.push(to_date); }
    if (status)    { where.push("r.status = ?");      params.push(status); }
    const [rows] = await db.query(`
      SELECT r.id, r.route_code, r.route_date, r.start_location, r.end_location,
             r.total_distance_km, r.status, dd.name AS driver_name
      FROM delivery_routes r
      LEFT JOIN delivery_drivers dd ON dd.id = r.driver_id
      WHERE ${where.join(" AND ")}
      ORDER BY r.id DESC
    `, params);
    res.json({ success: true, count: rows.length, routes: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch routes report", error: error.message });
  }
};

exports.getChargesReport = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM delivery_charges ORDER BY id DESC"
    ).catch(() => [[]]);
    res.json({ success: true, count: rows.length, charges: rows });
  } catch (error) {
    res.json({ success: true, count: 0, charges: [], note: "delivery_charges table not yet created" });
  }
};

exports.getTrackingReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("DATE(dt.tracked_at) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(dt.tracked_at) <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT dt.id, dt.latitude, dt.longitude, dt.status, dt.remarks, dt.tracked_at,
             d.delivery_number, d.delivery_status
      FROM delivery_tracking dt
      LEFT JOIN deliveries d ON d.id = dt.delivery_id
      WHERE ${where.join(" AND ")}
      ORDER BY dt.id DESC LIMIT 500
    `, params);
    res.json({ success: true, count: rows.length, tracking: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tracking report", error: error.message });
  }
};

exports.getDeliveryReportsData = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("report_date >= ?"); params.push(from_date); }
    if (to_date)   { where.push("report_date <= ?"); params.push(to_date); }
    const [rows] = await db.query(
      `SELECT id, report_date, total_deliveries, delivered_count, failed_count, average_delivery_time_minutes, created_at FROM delivery_reports WHERE ${where.join(" AND ")} ORDER BY report_date DESC`,
      params
    );
    res.json({ success: true, count: rows.length, reports: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch delivery reports", error: error.message });
  }
};

exports.getPerformanceReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("DATE(d.created_at) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(d.created_at) <= ?"); params.push(to_date); }
    const w = where.join(" AND ");

    const [byStatus] = await db.query(
      `SELECT delivery_status, COUNT(*) AS count FROM deliveries d WHERE ${w} GROUP BY delivery_status`,
      params
    );
    const [byDay] = await db.query(
      `SELECT DATE(d.created_at) AS day, COUNT(*) AS total,
         SUM(CASE WHEN d.delivery_status='delivered' THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN d.delivery_status='failed'    THEN 1 ELSE 0 END) AS failed
       FROM deliveries d WHERE ${w}
       GROUP BY DATE(d.created_at) ORDER BY day ASC`,
      params
    );
    res.json({ success: true, by_status: byStatus, by_day: byDay });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch performance report", error: error.message });
  }
};
