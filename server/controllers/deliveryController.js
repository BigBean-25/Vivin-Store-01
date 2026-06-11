const db     = require("../config/db");
const crypto = require("crypto");

const VALID_TRANSITIONS = {
  pending:    ["assigned", "failed", "cancelled"],
  assigned:   ["picked",   "failed", "cancelled"],
  picked:     ["in_transit", "failed"],
  in_transit: ["delivered", "failed"],
  delivered:  [],
  failed:     [],
  cancelled:  [],
};

const genDeliveryNumber = () => {
  const now = new Date();
  return `DEL-${now.toISOString().slice(0, 10).replace(/-/g, "")}${String(now.getTime()).slice(-5)}`;
};

exports.getSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN delivery_status = 'pending'    THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN delivery_status = 'assigned'   THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN delivery_status = 'picked'     THEN 1 ELSE 0 END) AS picked,
        SUM(CASE WHEN delivery_status = 'in_transit' THEN 1 ELSE 0 END) AS in_transit,
        SUM(CASE WHEN delivery_status = 'delivered'  THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN delivery_status = 'failed'     THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN delivery_status = 'cancelled'  THEN 1 ELSE 0 END) AS cancelled
      FROM deliveries
    `);
    res.json({ success: true, summary: totals });
  } catch (error) {
    console.error("Delivery summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch summary", error: error.message });
  }
};

exports.getAllDeliveries = async (req, res) => {
  try {
    const { delivery_status, from_date, to_date, page = 1, limit = 50 } = req.query;
    const where = ["1=1"];
    const params = [];
    if (delivery_status) { where.push("d.delivery_status = ?");    params.push(delivery_status); }
    if (from_date)       { where.push("DATE(d.created_at) >= ?"); params.push(from_date); }
    if (to_date)         { where.push("DATE(d.created_at) <= ?"); params.push(to_date); }
    const countParams = [...params];
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const [deliveries] = await db.query(`
      SELECT d.id, d.delivery_number, d.delivery_date, d.delivery_status,
             d.pickup_address, d.delivery_address, d.proof_required,
             d.order_id, d.customer_id, d.driver_id,
             d.created_at, d.updated_at,
             o.order_number,
             c.business_name AS customer_name, c.customer_code,
             dd.name AS driver_name, dd.phone AS driver_phone, dd.driver_code
      FROM deliveries d
      LEFT JOIN orders o             ON o.id  = d.order_id
      LEFT JOIN customers c          ON c.id  = d.customer_id
      LEFT JOIN delivery_drivers dd  ON dd.id = d.driver_id
      WHERE ${where.join(" AND ")}
      ORDER BY d.id DESC
      LIMIT ? OFFSET ?
    `, params);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM deliveries d WHERE ${where.join(" AND ")}`,
      countParams
    );

    res.json({ success: true, total, deliveries });
  } catch (error) {
    console.error("Get deliveries error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch deliveries", error: error.message });
  }
};

exports.getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[delivery]] = await db.query(`
      SELECT d.*,
             o.order_number, o.order_status,
             c.business_name AS customer_name, c.phone AS customer_phone,
             dd.name AS driver_name, dd.phone AS driver_phone,
             dd.driver_code, dd.vehicle_type, dd.vehicle_number
      FROM deliveries d
      LEFT JOIN orders o             ON o.id  = d.order_id
      LEFT JOIN customers c          ON c.id  = d.customer_id
      LEFT JOIN delivery_drivers dd  ON dd.id = d.driver_id
      WHERE d.id = ?
    `, [id]);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });

    const [logs] = await db.query(
      "SELECT * FROM delivery_status_logs WHERE delivery_id = ? ORDER BY id ASC", [id]
    );
    const [proofs] = await db.query(
      "SELECT * FROM delivery_proofs WHERE delivery_id = ? ORDER BY id DESC", [id]
    );

    res.json({ success: true, delivery: { ...delivery, status_logs: logs, proofs } });
  } catch (error) {
    console.error("Get delivery by ID error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch delivery", error: error.message });
  }
};

exports.createDelivery = async (req, res) => {
  try {
    const { order_id, customer_id, driver_id, pickup_address, delivery_address, delivery_date, proof_required } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, message: "customer_id is required" });
    const delivery_number = genDeliveryNumber();
    const [result] = await db.query(
      `INSERT INTO deliveries (delivery_number, order_id, customer_id, driver_id, pickup_address, delivery_address, delivery_date, delivery_status, proof_required)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [delivery_number, order_id || null, customer_id, driver_id || null,
        pickup_address || null, delivery_address || null, delivery_date || null,
        proof_required !== undefined ? proof_required : 1]
    );
    const deliveryId = result.insertId;
    if (driver_id) {
      await db.query(
        "INSERT INTO delivery_assignments (delivery_id, driver_id, assigned_by) VALUES (?, ?, ?)",
        [deliveryId, driver_id, req.user?.id || null]
      );
      await db.query("UPDATE delivery_drivers SET status = 'busy' WHERE id = ?", [driver_id]);
      await db.query("UPDATE deliveries SET delivery_status = 'assigned' WHERE id = ?", [deliveryId]);
      await db.query(
        "INSERT INTO delivery_status_logs (delivery_id, old_status, new_status, remarks, changed_by) VALUES (?, 'pending', 'assigned', 'Driver assigned on creation', ?)",
        [deliveryId, req.user?.id || null]
      );
    }
    res.status(201).json({ success: true, message: "Delivery created", delivery_number, id: deliveryId });
  } catch (error) {
    console.error("Create delivery error:", error);
    res.status(500).json({ success: false, message: "Failed to create delivery", error: error.message });
  }
};

exports.updateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { pickup_address, delivery_address, delivery_date, proof_required } = req.body;
    const [[existing]] = await db.query("SELECT id, delivery_status FROM deliveries WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Delivery not found" });
    if (["delivered", "cancelled", "failed"].includes(existing.delivery_status)) {
      return res.status(400).json({ success: false, message: `Cannot edit a ${existing.delivery_status} delivery.` });
    }
    await db.query(
      "UPDATE deliveries SET pickup_address = ?, delivery_address = ?, delivery_date = ?, proof_required = ? WHERE id = ?",
      [pickup_address || null, delivery_address || null, delivery_date || null,
        proof_required !== undefined ? proof_required : 1, id]
    );
    res.json({ success: true, message: "Delivery updated" });
  } catch (error) {
    console.error("Update delivery error:", error);
    res.status(500).json({ success: false, message: "Failed to update delivery", error: error.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_status, remarks } = req.body;
    const [[delivery]] = await db.query(
      "SELECT id, delivery_status, order_id, driver_id FROM deliveries WHERE id = ?", [id]
    );
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    const allowed = VALID_TRANSITIONS[delivery.delivery_status] || [];
    if (!delivery_status || !allowed.includes(delivery_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from '${delivery.delivery_status}' to '${delivery_status}'. Allowed: ${allowed.join(", ") || "none"}`
      });
    }
    await db.query("UPDATE deliveries SET delivery_status = ? WHERE id = ?", [delivery_status, id]);
    await db.query(
      "INSERT INTO delivery_status_logs (delivery_id, old_status, new_status, remarks, changed_by) VALUES (?, ?, ?, ?, ?)",
      [id, delivery.delivery_status, delivery_status, remarks || null, req.user?.id || null]
    );
    if (delivery_status === "delivered") {
      if (delivery.order_id) {
        const [[order]] = await db.query("SELECT order_status FROM orders WHERE id = ?", [delivery.order_id]);
        if (order && order.order_status === "dispatched") {
          await db.query("UPDATE orders SET order_status = 'delivered' WHERE id = ?", [delivery.order_id]);
          await db.query(
            "INSERT INTO order_status_history (order_id, old_status, new_status, remarks, changed_by) VALUES (?, 'dispatched', 'delivered', 'Auto: Delivery marked delivered', ?)",
            [delivery.order_id, req.user?.id || null]
          );
        }
      }
      if (delivery.driver_id) {
        await db.query("UPDATE delivery_drivers SET status = 'available' WHERE id = ?", [delivery.driver_id]);
      }
    }
    if (["failed", "cancelled"].includes(delivery_status) && delivery.driver_id) {
      await db.query("UPDATE delivery_drivers SET status = 'available' WHERE id = ?", [delivery.driver_id]);
    }
    res.json({ success: true, message: "Delivery status updated" });
  } catch (error) {
    console.error("Update delivery status error:", error);
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query("SELECT id, delivery_status FROM deliveries WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Delivery not found" });
    if (!["pending", "cancelled", "failed"].includes(existing.delivery_status)) {
      return res.status(400).json({ success: false, message: `Cannot delete a ${existing.delivery_status} delivery.` });
    }
    await db.query("DELETE FROM delivery_status_logs WHERE delivery_id = ?", [id]);
    await db.query("DELETE FROM delivery_assignments WHERE delivery_id = ?", [id]);
    await db.query("DELETE FROM delivery_proofs WHERE delivery_id = ?", [id]);
    await db.query("DELETE FROM deliveries WHERE id = ?", [id]);
    res.json({ success: true, message: "Delivery deleted" });
  } catch (error) {
    console.error("Delete delivery error:", error);
    res.status(500).json({ success: false, message: "Failed to delete delivery", error: error.message });
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;
    if (!driver_id) return res.status(400).json({ success: false, message: "driver_id is required" });
    const [[delivery]] = await db.query(
      "SELECT id, delivery_status, driver_id FROM deliveries WHERE id = ?", [id]
    );
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    if (["delivered", "cancelled", "failed"].includes(delivery.delivery_status)) {
      return res.status(400).json({ success: false, message: `Cannot assign driver to a ${delivery.delivery_status} delivery.` });
    }
    const [[driver]] = await db.query("SELECT id, name FROM delivery_drivers WHERE id = ?", [driver_id]);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    if (delivery.driver_id && delivery.driver_id !== Number(driver_id)) {
      await db.query("UPDATE delivery_drivers SET status = 'available' WHERE id = ?", [delivery.driver_id]);
    }
    const oldStatus = delivery.delivery_status;
    await db.query("UPDATE deliveries SET driver_id = ?, delivery_status = 'assigned' WHERE id = ?", [driver_id, id]);
    await db.query("UPDATE delivery_drivers SET status = 'busy' WHERE id = ?", [driver_id]);
    await db.query(
      "INSERT INTO delivery_assignments (delivery_id, driver_id, assigned_by) VALUES (?, ?, ?)",
      [id, driver_id, req.user?.id || null]
    );
    if (oldStatus !== "assigned") {
      await db.query(
        "INSERT INTO delivery_status_logs (delivery_id, old_status, new_status, remarks, changed_by) VALUES (?, ?, 'assigned', 'Driver assigned', ?)",
        [id, oldStatus, req.user?.id || null]
      );
    }
    res.json({ success: true, message: `Driver '${driver.name}' assigned successfully` });
  } catch (error) {
    console.error("Assign driver error:", error);
    res.status(500).json({ success: false, message: "Failed to assign driver", error: error.message });
  }
};

exports.getStatusLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const [logs] = await db.query(
      "SELECT * FROM delivery_status_logs WHERE delivery_id = ? ORDER BY id ASC", [id]
    );
    res.json({ success: true, logs });
  } catch (error) {
    console.error("Get status logs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch status logs", error: error.message });
  }
};

exports.getProof = async (req, res) => {
  try {
    const { id } = req.params;
    const [proofs] = await db.query(
      "SELECT * FROM delivery_proofs WHERE delivery_id = ? ORDER BY id DESC", [id]
    );
    res.json({ success: true, proofs });
  } catch (error) {
    console.error("Get proof error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch proof", error: error.message });
  }
};

exports.addProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { proof_type, proof_value, received_by, received_phone } = req.body;
    const [[delivery]] = await db.query("SELECT id, delivery_status FROM deliveries WHERE id = ?", [id]);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    if (delivery.delivery_status !== "delivered") {
      return res.status(400).json({ success: false, message: "Proof can only be added for delivered deliveries." });
    }
    const validTypes = ["signature", "photo", "otp", "document"];
    const pType = validTypes.includes(proof_type) ? proof_type : "signature";
    await db.query(
      "INSERT INTO delivery_proofs (delivery_id, proof_type, proof_value, received_by, received_phone) VALUES (?, ?, ?, ?, ?)",
      [id, pType, proof_value || null, received_by || null, received_phone || null]
    );
    res.status(201).json({ success: true, message: "Proof recorded" });
  } catch (error) {
    console.error("Add proof error:", error);
    res.status(500).json({ success: false, message: "Failed to record proof", error: error.message });
  }
};

exports.getDrivers = async (req, res) => {
  try {
    const [drivers] = await db.query(
      "SELECT id, driver_code, name, phone, vehicle_type, vehicle_number, status FROM delivery_drivers ORDER BY name ASC"
    );
    res.json({ success: true, drivers });
  } catch (error) {
    console.error("Get drivers error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch drivers", error: error.message });
  }
};

// ─── Delivery Routes ──────────────────────────────────────────────────────────
const ROUTE_STATUS = ["planned", "started", "completed", "cancelled"];
const genRouteCode = () => `RTE-${Date.now().toString().slice(-8)}`;

exports.getRouteSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status='planned'   THEN 1 ELSE 0 END) AS planned,
        SUM(CASE WHEN status='started'   THEN 1 ELSE 0 END) AS started,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(total_distance_km),0) AS total_km
      FROM delivery_routes
    `);
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch route summary", error: error.message });
  }
};

exports.getAllRoutes = async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (status)    { where.push("r.status = ?");             params.push(status); }
    if (from_date) { where.push("r.route_date >= ?");        params.push(from_date); }
    if (to_date)   { where.push("r.route_date <= ?");        params.push(to_date); }
    const [routes] = await db.query(`
      SELECT r.*, dd.name AS driver_name, dd.phone AS driver_phone
      FROM delivery_routes r
      LEFT JOIN delivery_drivers dd ON dd.id = r.driver_id
      WHERE ${where.join(" AND ")}
      ORDER BY r.id DESC
    `, params);
    res.json({ success: true, count: routes.length, routes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch routes", error: error.message });
  }
};

exports.getRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;
    const [[route]] = await db.query(`
      SELECT r.*, dd.name AS driver_name, dd.phone AS driver_phone
      FROM delivery_routes r LEFT JOIN delivery_drivers dd ON dd.id = r.driver_id
      WHERE r.id = ?
    `, [routeId]);
    if (!route) return res.status(404).json({ success: false, message: "Route not found" });
    res.json({ success: true, route });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch route", error: error.message });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const { driver_id, route_date, start_location, end_location, total_distance_km } = req.body;
    const route_code = genRouteCode();
    const [result] = await db.query(
      `INSERT INTO delivery_routes (route_code, driver_id, route_date, start_location, end_location, total_distance_km, status)
       VALUES (?, ?, ?, ?, ?, ?, 'planned')`,
      [route_code, driver_id || null, route_date || null, start_location || null,
        end_location || null, total_distance_km || 0]
    );
    res.status(201).json({ success: true, message: "Route created", route_code, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create route", error: error.message });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { driver_id, route_date, start_location, end_location, total_distance_km } = req.body;
    const [[existing]] = await db.query("SELECT id, status FROM delivery_routes WHERE id = ?", [routeId]);
    if (!existing) return res.status(404).json({ success: false, message: "Route not found" });
    if (["completed", "cancelled"].includes(existing.status)) {
      return res.status(400).json({ success: false, message: `Cannot edit a ${existing.status} route.` });
    }
    await db.query(
      "UPDATE delivery_routes SET driver_id=?, route_date=?, start_location=?, end_location=?, total_distance_km=? WHERE id=?",
      [driver_id || null, route_date || null, start_location || null,
        end_location || null, total_distance_km || 0, routeId]
    );
    res.json({ success: true, message: "Route updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update route", error: error.message });
  }
};

exports.updateRouteStatus = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { status } = req.body;
    if (!ROUTE_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: `Valid status required: ${ROUTE_STATUS.join(", ")}` });
    }
    const [[existing]] = await db.query("SELECT id, status FROM delivery_routes WHERE id = ?", [routeId]);
    if (!existing) return res.status(404).json({ success: false, message: "Route not found" });
    if (["completed", "cancelled"].includes(existing.status)) {
      return res.status(400).json({ success: false, message: `Cannot change status of a ${existing.status} route.` });
    }
    await db.query("UPDATE delivery_routes SET status = ? WHERE id = ?", [status, routeId]);
    res.json({ success: true, message: "Route status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update route status", error: error.message });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const [[existing]] = await db.query("SELECT id, status FROM delivery_routes WHERE id = ?", [routeId]);
    if (!existing) return res.status(404).json({ success: false, message: "Route not found" });
    if (!["planned", "cancelled"].includes(existing.status)) {
      return res.status(400).json({ success: false, message: `Cannot delete a ${existing.status} route.` });
    }
    await db.query("DELETE FROM delivery_routes WHERE id = ?", [routeId]);
    res.json({ success: true, message: "Route deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete route", error: error.message });
  }
};

// ─── Delivery Charges ─────────────────────────────────────────────────────────
const genChargeCode = () => `CHG-${Date.now().toString().slice(-8)}`;

exports.getChargeSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_active=0 THEN 1 ELSE 0 END) AS inactive
      FROM delivery_charges
    `);
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch charges summary", error: error.message });
  }
};

exports.getAllCharges = async (req, res) => {
  try {
    const [charges] = await db.query(
      "SELECT * FROM delivery_charges ORDER BY id DESC"
    );
    res.json({ success: true, count: charges.length, charges });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch charges", error: error.message });
  }
};

exports.getChargeById = async (req, res) => {
  try {
    const { chargeId } = req.params;
    const [[charge]] = await db.query("SELECT * FROM delivery_charges WHERE id = ?", [chargeId]);
    if (!charge) return res.status(404).json({ success: false, message: "Charge not found" });
    res.json({ success: true, charge });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch charge", error: error.message });
  }
};

exports.createCharge = async (req, res) => {
  try {
    const { label, base_charge, per_km_charge, min_distance_km, max_distance_km, minimum_order_amount } = req.body;
    if (!label) return res.status(400).json({ success: false, message: "label is required" });
    const charge_code = genChargeCode();
    const [result] = await db.query(
      `INSERT INTO delivery_charges (charge_code, label, base_charge, per_km_charge, min_distance_km, max_distance_km, minimum_order_amount, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [charge_code, label, base_charge || 0, per_km_charge || 0,
        min_distance_km || 0, max_distance_km || null, minimum_order_amount || 0]
    );
    res.status(201).json({ success: true, message: "Charge created", charge_code, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create charge", error: error.message });
  }
};

exports.updateCharge = async (req, res) => {
  try {
    const { chargeId } = req.params;
    const { label, base_charge, per_km_charge, min_distance_km, max_distance_km, minimum_order_amount } = req.body;
    if (!label) return res.status(400).json({ success: false, message: "label is required" });
    const [[existing]] = await db.query("SELECT id FROM delivery_charges WHERE id = ?", [chargeId]);
    if (!existing) return res.status(404).json({ success: false, message: "Charge not found" });
    await db.query(
      "UPDATE delivery_charges SET label=?, base_charge=?, per_km_charge=?, min_distance_km=?, max_distance_km=?, minimum_order_amount=? WHERE id=?",
      [label, base_charge || 0, per_km_charge || 0,
        min_distance_km || 0, max_distance_km || null, minimum_order_amount || 0, chargeId]
    );
    res.json({ success: true, message: "Charge updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update charge", error: error.message });
  }
};

exports.toggleChargeStatus = async (req, res) => {
  try {
    const { chargeId } = req.params;
    const [[existing]] = await db.query("SELECT id, is_active FROM delivery_charges WHERE id = ?", [chargeId]);
    if (!existing) return res.status(404).json({ success: false, message: "Charge not found" });
    await db.query("UPDATE delivery_charges SET is_active = ? WHERE id = ?", [existing.is_active ? 0 : 1, chargeId]);
    res.json({ success: true, message: `Charge ${existing.is_active ? "deactivated" : "activated"}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to toggle charge status", error: error.message });
  }
};

exports.deleteCharge = async (req, res) => {
  try {
    const { chargeId } = req.params;
    const [[existing]] = await db.query("SELECT id FROM delivery_charges WHERE id = ?", [chargeId]);
    if (!existing) return res.status(404).json({ success: false, message: "Charge not found" });
    await db.query("DELETE FROM delivery_charges WHERE id = ?", [chargeId]);
    res.json({ success: true, message: "Charge deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete charge", error: error.message });
  }
};

// ─── Driver CRUD ───────────────────────────────────────────────────────────────
const DRIVER_STATUS = ["available", "busy", "offline", "inactive"];
const genDriverCode = () => `DRV-${Date.now().toString().slice(-8)}`;

exports.getDriverSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status='busy'      THEN 1 ELSE 0 END) AS busy,
        SUM(CASE WHEN status='offline'   THEN 1 ELSE 0 END) AS offline,
        SUM(CASE WHEN status='inactive'  THEN 1 ELSE 0 END) AS inactive
      FROM delivery_drivers
    `);
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch driver summary", error: error.message });
  }
};

exports.getAllDriversFull = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? "WHERE status = ?" : "";
    const params = status ? [status] : [];
    const [drivers] = await db.query(
      `SELECT id, driver_code, name, phone, email, vehicle_type, vehicle_number, license_number, status, created_at
       FROM delivery_drivers ${where} ORDER BY name ASC`,
      params
    );
    res.json({ success: true, count: drivers.length, drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch drivers", error: error.message });
  }
};

exports.getDriverById = async (req, res) => {
  try {
    const { driverId } = req.params;
    const [[driver]] = await db.query("SELECT * FROM delivery_drivers WHERE id = ?", [driverId]);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch driver", error: error.message });
  }
};

exports.createDriver = async (req, res) => {
  try {
    const { name, phone, email, vehicle_type, vehicle_number, license_number } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const driver_code = genDriverCode();
    const [result] = await db.query(
      `INSERT INTO delivery_drivers (driver_code, name, phone, email, vehicle_type, vehicle_number, license_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'available')`,
      [driver_code, name, phone || null, email || null, vehicle_type || null, vehicle_number || null, license_number || null]
    );
    res.status(201).json({ success: true, message: "Driver created", driver_code, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create driver", error: error.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { name, phone, email, vehicle_type, vehicle_number, license_number } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const [[existing]] = await db.query("SELECT id FROM delivery_drivers WHERE id = ?", [driverId]);
    if (!existing) return res.status(404).json({ success: false, message: "Driver not found" });
    await db.query(
      "UPDATE delivery_drivers SET name=?, phone=?, email=?, vehicle_type=?, vehicle_number=?, license_number=? WHERE id=?",
      [name, phone || null, email || null, vehicle_type || null, vehicle_number || null, license_number || null, driverId]
    );
    res.json({ success: true, message: "Driver updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update driver", error: error.message });
  }
};

exports.updateDriverStatus = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;
    if (!DRIVER_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: `Valid status: ${DRIVER_STATUS.join(", ")}` });
    }
    const [[existing]] = await db.query("SELECT id FROM delivery_drivers WHERE id = ?", [driverId]);
    if (!existing) return res.status(404).json({ success: false, message: "Driver not found" });
    await db.query("UPDATE delivery_drivers SET status = ? WHERE id = ?", [status, driverId]);
    res.json({ success: true, message: "Driver status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update driver status", error: error.message });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const [[existing]] = await db.query("SELECT id, status FROM delivery_drivers WHERE id = ?", [driverId]);
    if (!existing) return res.status(404).json({ success: false, message: "Driver not found" });
    if (existing.status === "busy") {
      return res.status(400).json({ success: false, message: "Cannot delete a driver who is currently busy." });
    }
    await db.query("DELETE FROM delivery_drivers WHERE id = ?", [driverId]);
    res.json({ success: true, message: "Driver deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete driver", error: error.message });
  }
};

// ─── Assignment CRUD ──────────────────────────────────────────────────────────
exports.getAssignmentSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status='assigned'  THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN status='accepted'  THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN status='rejected'  THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed
      FROM delivery_assignments
    `);
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch assignment summary", error: error.message });
  }
};

exports.getAllAssignments = async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (status)    { where.push("da.status = ?");             params.push(status); }
    if (from_date) { where.push("DATE(da.assigned_at) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(da.assigned_at) <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT da.id, da.delivery_id, da.driver_id, da.assigned_at, da.status,
             d.delivery_number, d.delivery_status,
             dd.name AS driver_name, dd.driver_code, dd.phone AS driver_phone
      FROM delivery_assignments da
      LEFT JOIN deliveries d        ON d.id  = da.delivery_id
      LEFT JOIN delivery_drivers dd ON dd.id = da.driver_id
      WHERE ${where.join(" AND ")}
      ORDER BY da.id DESC
    `, params);
    res.json({ success: true, count: rows.length, assignments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch assignments", error: error.message });
  }
};

exports.getAssignmentById = async (req, res) => {
  try {
    const { assignId } = req.params;
    const [[row]] = await db.query(`
      SELECT da.*, d.delivery_number, d.delivery_status, dd.name AS driver_name
      FROM delivery_assignments da
      LEFT JOIN deliveries d        ON d.id  = da.delivery_id
      LEFT JOIN delivery_drivers dd ON dd.id = da.driver_id
      WHERE da.id = ?
    `, [assignId]);
    if (!row) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.json({ success: true, assignment: row });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch assignment", error: error.message });
  }
};

exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { assignId } = req.params;
    const { status } = req.body;
    const valid = ["assigned", "accepted", "rejected", "completed"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: `Valid status: ${valid.join(", ")}` });
    }
    const [[existing]] = await db.query("SELECT id FROM delivery_assignments WHERE id = ?", [assignId]);
    if (!existing) return res.status(404).json({ success: false, message: "Assignment not found" });
    await db.query("UPDATE delivery_assignments SET status = ? WHERE id = ?", [status, assignId]);
    res.json({ success: true, message: "Assignment status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update assignment status", error: error.message });
  }
};

// ─── Delivery Tracking ────────────────────────────────────────────────────────
exports.getTrackingSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(
      "SELECT COUNT(*) AS total, COUNT(DISTINCT delivery_id) AS deliveries_tracked FROM delivery_tracking"
    );
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tracking summary", error: error.message });
  }
};

exports.getAllTracking = async (req, res) => {
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
    res.status(500).json({ success: false, message: "Failed to fetch tracking", error: error.message });
  }
};

exports.getDeliveryTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM delivery_tracking WHERE delivery_id = ? ORDER BY tracked_at ASC", [id]
    );
    res.json({ success: true, count: rows.length, tracking: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tracking", error: error.message });
  }
};

exports.addDeliveryTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, status, remarks } = req.body;
    const [[delivery]] = await db.query("SELECT id FROM deliveries WHERE id = ?", [id]);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    await db.query(
      "INSERT INTO delivery_tracking (delivery_id, latitude, longitude, status, remarks) VALUES (?, ?, ?, ?, ?)",
      [id, latitude || null, longitude || null, status || null, remarks || null]
    );
    res.status(201).json({ success: true, message: "Tracking point added" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add tracking", error: error.message });
  }
};

// ─── Status Logs global ───────────────────────────────────────────────────────
exports.getStatusLogsSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(
      "SELECT COUNT(*) AS total, COUNT(DISTINCT delivery_id) AS deliveries FROM delivery_status_logs"
    );
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch status logs summary", error: error.message });
  }
};

exports.getAllStatusLogs = async (req, res) => {
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
    res.status(500).json({ success: false, message: "Failed to fetch status logs", error: error.message });
  }
};

// ─── Proofs global ────────────────────────────────────────────────────────────
exports.getProofSummary = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN proof_type='signature' THEN 1 ELSE 0 END) AS signature,
        SUM(CASE WHEN proof_type='photo'     THEN 1 ELSE 0 END) AS photo,
        SUM(CASE WHEN proof_type='otp'       THEN 1 ELSE 0 END) AS otp,
        SUM(CASE WHEN proof_type='document'  THEN 1 ELSE 0 END) AS document
      FROM delivery_proofs
    `);
    res.json({ success: true, summary: totals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch proof summary", error: error.message });
  }
};

exports.getAllProofs = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = ["1=1"];
    const params = [];
    if (from_date) { where.push("DATE(dp.captured_at) >= ?"); params.push(from_date); }
    if (to_date)   { where.push("DATE(dp.captured_at) <= ?"); params.push(to_date); }
    const [rows] = await db.query(`
      SELECT dp.id, dp.proof_type, dp.proof_value, dp.received_by, dp.received_phone, dp.captured_at,
             d.delivery_number, d.delivery_status
      FROM delivery_proofs dp
      LEFT JOIN deliveries d ON d.id = dp.delivery_id
      WHERE ${where.join(" AND ")}
      ORDER BY dp.id DESC
    `, params);
    res.json({ success: true, count: rows.length, proofs: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch proofs", error: error.message });
  }
};

// ─── Live GPS Tracking ────────────────────────────────────────────────────────

exports.generateDriverToken = async (req, res) => {
  try {
    const { driverId } = req.params;
    const [[driver]] = await db.query("SELECT id, name FROM delivery_drivers WHERE id = ?", [driverId]);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    const token      = crypto.randomBytes(32).toString("hex");
    const expiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.query(
      "UPDATE delivery_drivers SET tracking_token = ?, token_expires_at = ? WHERE id = ?",
      [token, expiresAt, driverId]
    );
    res.json({ success: true, token, expires_at: expiresAt, driver_name: driver.name });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate token", error: error.message });
  }
};

exports.saveLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, location_text, accuracy, status, remarks } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "latitude and longitude are required" });
    }
    const [[delivery]] = await db.query("SELECT id, driver_id FROM deliveries WHERE id = ?", [id]);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    const driverId = req.driver?.id || delivery.driver_id || null;
    await db.query(
      "INSERT INTO delivery_tracking (delivery_id, driver_id, latitude, longitude, location_text, accuracy, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, driverId, latitude, longitude, location_text || null, accuracy || null, status || null, remarks || null]
    );
    res.status(201).json({ success: true, message: "Location saved" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save location", error: error.message });
  }
};

exports.getLiveLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const [[point]] = await db.query(
      "SELECT id, driver_id, latitude, longitude, location_text, accuracy, status, remarks, tracked_at FROM delivery_tracking WHERE delivery_id = ? AND latitude IS NOT NULL ORDER BY id DESC LIMIT 1",
      [id]
    );
    res.json({ success: true, point: point || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch live location", error: error.message });
  }
};

exports.getTrackingHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT id, driver_id, latitude, longitude, location_text, accuracy, status, remarks, tracked_at FROM delivery_tracking WHERE delivery_id = ? AND latitude IS NOT NULL ORDER BY id ASC",
      [id]
    );
    res.json({ success: true, count: rows.length, history: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tracking history", error: error.message });
  }
};
