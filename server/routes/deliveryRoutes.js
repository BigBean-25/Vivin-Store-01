const express = require("express");
const db      = require("../config/db");
const {
  /* Deliveries */
  getSummary, getAllDeliveries, getDeliveryById, createDelivery,
  updateDelivery, updateDeliveryStatus, deleteDelivery,
  assignDriver, getStatusLogs, getProof, addProof,
  /* Drivers */
  getDrivers, getDriverSummary, getAllDriversFull, getDriverById,
  createDriver, updateDriver, updateDriverStatus, deleteDriver,
  /* Assignments */
  getAssignmentSummary, getAllAssignments, getAssignmentById,
  updateAssignmentStatus,
  /* Tracking */
  getTrackingSummary, getAllTracking, getDeliveryTracking, addDeliveryTracking,
  /* Status Logs global */
  getStatusLogsSummary, getAllStatusLogs,
  /* Proofs global */
  getProofSummary, getAllProofs,
  /* Live GPS Tracking */
  generateDriverToken, saveLocation, getLiveLocation, getTrackingHistory,
  /* Routes */
  getRouteSummary, getAllRoutes, getRouteById, createRoute,
  updateRoute, updateRouteStatus, deleteRoute,
  /* Charges */
  getChargeSummary, getAllCharges, getChargeById, createCharge,
  updateCharge, toggleChargeStatus, deleteCharge,
} = require("../controllers/deliveryController");
const { protect } = require("../middleware/authMiddleware");

const protectDriverToken = async (req, res, next) => {
  const token = req.headers["x-tracking-token"];
  if (!token) return res.status(401).json({ success: false, message: "No tracking token provided" });
  try {
    const [[driver]] = await db.query(
      "SELECT id, name, status FROM delivery_drivers WHERE tracking_token = ? AND token_expires_at > NOW()",
      [token]
    );
    if (!driver) return res.status(401).json({ success: false, message: "Invalid or expired tracking token" });
    req.driver = driver;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Token validation error" });
  }
};

const router = express.Router();

/* ── Top-level named (MUST be before /:id) ── */
router.get("/summary", protect, getSummary);

/* ── Drivers (full CRUD, before /:id) ── */
router.get("/drivers/summary",                          protect, getDriverSummary);
router.get("/drivers",                                  protect, getAllDriversFull);
router.post("/drivers",                                 protect, createDriver);
router.get("/drivers/:driverId",                        protect, getDriverById);
router.put("/drivers/:driverId",                        protect, updateDriver);
router.patch("/drivers/:driverId/status",               protect, updateDriverStatus);
router.delete("/drivers/:driverId",                     protect, deleteDriver);
router.post("/drivers/:driverId/tracking-token",        protect, generateDriverToken);

/* ── Assignments (before /:id) ── */
router.get("/assignments/summary",             protect, getAssignmentSummary);
router.get("/assignments",                     protect, getAllAssignments);
router.get("/assignments/:assignId",           protect, getAssignmentById);
router.patch("/assignments/:assignId/status",  protect, updateAssignmentStatus);

/* ── Routes (before /:id) ── */
router.get("/routes/summary",           protect, getRouteSummary);
router.get("/routes",                   protect, getAllRoutes);
router.post("/routes",                  protect, createRoute);
router.get("/routes/:routeId",          protect, getRouteById);
router.put("/routes/:routeId",          protect, updateRoute);
router.patch("/routes/:routeId/status", protect, updateRouteStatus);
router.delete("/routes/:routeId",       protect, deleteRoute);

/* ── Charges (before /:id) ── */
router.get("/charges/summary",            protect, getChargeSummary);
router.get("/charges",                    protect, getAllCharges);
router.post("/charges",                   protect, createCharge);
router.get("/charges/:chargeId",          protect, getChargeById);
router.put("/charges/:chargeId",          protect, updateCharge);
router.patch("/charges/:chargeId/status", protect, toggleChargeStatus);
router.delete("/charges/:chargeId",       protect, deleteCharge);

/* ── Tracking global (before /:id) ── */
router.get("/tracking/summary", protect, getTrackingSummary);
router.get("/tracking",         protect, getAllTracking);

/* ── Status Logs global (before /:id) ── */
router.get("/status-logs/summary", protect, getStatusLogsSummary);
router.get("/status-logs",         protect, getAllStatusLogs);

/* ── Proofs global (before /:id) ── */
router.get("/proofs/summary", protect, getProofSummary);
router.get("/proofs",         protect, getAllProofs);

/* ── Per-delivery sub-resources (/:id/...) ── */
router.get("/:id/status-logs",          protect,             getStatusLogs);
router.get("/:id/proof",                protect,             getProof);
router.post("/:id/proof",               protect,             addProof);
router.get("/:id/tracking/live",        protect,             getLiveLocation);
router.get("/:id/tracking/history",     protect,             getTrackingHistory);
router.post("/:id/tracking/location",   protectDriverToken,  saveLocation);
router.get("/:id/tracking",             protect,             getDeliveryTracking);
router.post("/:id/tracking",            protect,             addDeliveryTracking);
router.patch("/:id/status",             protect,             updateDeliveryStatus);
router.patch("/:id/assign-driver",      protect,             assignDriver);

/* ── Delivery CRUD ── */
router.get("/",       protect, getAllDeliveries);
router.get("/:id",    protect, getDeliveryById);
router.post("/",      protect, createDelivery);
router.put("/:id",    protect, updateDelivery);
router.delete("/:id", protect, deleteDelivery);

module.exports = router;
