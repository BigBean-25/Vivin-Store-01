const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/notificationController");

const router = express.Router();

//  Static summary & tracking routes (before /:id) 
router.get("/summary",               protect, ctrl.getSummary);
router.get("/read-tracking/summary", protect, ctrl.getReadTrackingSummary);
router.get("/read-tracking",         protect, ctrl.getReadTracking);

//  Report sub-routes (all static) 
router.get("/reports/summary",      protect, ctrl.getReportsSummary);
router.get("/reports/by-type",      protect, ctrl.getReportsByType);
router.get("/reports/by-priority",  protect, ctrl.getReportsByPriority);
router.get("/reports/by-user",      protect, ctrl.getReportsByUser);
router.get("/reports/read-status",  protect, ctrl.getReportsReadStatus);
router.get("/reports/target-wise",  protect, ctrl.getReportsTargetWise);

//  Static list routes 
router.get("/users",   protect, ctrl.getUsersForNotifications);
router.get("/roles",   protect, ctrl.getRolesForNotifications);
router.get("/outlets", protect, ctrl.getOutletsForNotifications);

//  Static action routes 
router.patch("/mark-all-read", protect, ctrl.markAllRead);
router.post("/send",           protect, ctrl.sendNotification);

//  Root CRUD 
router.get("/",  protect, ctrl.getNotifications);
router.post("/", protect, ctrl.createNotification);

//  Dynamic sub-collection routes 
router.get("/users/:userId",      protect, ctrl.getUserNotifications);
router.post("/users/:userId",     protect, ctrl.sendToUser);
router.get("/roles/:roleId",      protect, ctrl.getRoleNotifications);
router.post("/roles/:roleId",     protect, ctrl.sendToRole);
router.get("/outlets/:outletId",  protect, ctrl.getOutletNotifications);
router.post("/outlets/:outletId", protect, ctrl.sendToOutlet);

// ── Dynamic /:id routes (last) ────────────────────────────────────────────
router.get("/:id",          protect, ctrl.getNotificationById);
router.put("/:id",          protect, ctrl.updateNotification);
router.patch("/:id/status", protect, ctrl.updateStatus);
router.patch("/:id/read",   protect, ctrl.markRead);
router.patch("/:id/unread", protect, ctrl.markUnread);
router.delete("/:id",       protect, ctrl.deleteNotification);

module.exports = router;
