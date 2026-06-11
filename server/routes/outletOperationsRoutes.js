const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/outletOperationsController");

const router = express.Router();

// ── Static summary routes first ──────────────────────────────────────────
router.get("/outlets/summary",          protect, ctrl.getOutletsSummary);
router.get("/stock/summary",            protect, ctrl.getStockSummary);
router.get("/requests/summary",         protect, ctrl.getRequestsSummary);
router.get("/transfers/summary",        protect, ctrl.getTransfersSummary);
router.get("/approvals/summary",        protect, ctrl.getApprovalsSummary);
router.get("/reports/summary",          protect, ctrl.getReportsSummary);
router.get("/alerts/summary",           protect, ctrl.getAlertsSummary);

// ── List routes ──────────────────────────────────────────────────────────
router.get("/outlets",                  protect, ctrl.getOutlets);
router.get("/stock",                    protect, ctrl.getStock);
router.get("/requests",                 protect, ctrl.getRequests);
router.get("/transfers",                protect, ctrl.getTransfers);
router.get("/approvals",                protect, ctrl.getApprovals);

// ── Report sub-routes (static before dynamic) ────────────────────────────
router.get("/reports/outlet-stock",     protect, ctrl.getOutletStockReport);
router.get("/reports/requests",         protect, ctrl.getRequestsReport);
router.get("/reports/low-stock",        protect, ctrl.getLowStockReport);
router.get("/reports/transfers",        protect, ctrl.getTransfersReport);

// ── Alerts ───────────────────────────────────────────────────────────────
router.get("/alerts/low-stock",         protect, ctrl.getLowStockAlerts);

// ── Stock by outlet / product ────────────────────────────────────────────
router.get("/stock/product/:productId", protect, ctrl.getStockByProduct);
router.get("/stock/:outletId",          protect, ctrl.getStockByOutlet);

// ── Request items (specific before /:id) ────────────────────────────────
router.get("/requests/:requestId/items",  protect, ctrl.getRequestItems);
router.post("/requests/:requestId/items", protect, ctrl.addRequestItem);
router.put("/request-items/:id",          protect, ctrl.updateRequestItem);
router.delete("/request-items/:id",       protect, ctrl.deleteRequestItem);

// ── Outlet CRUD ──────────────────────────────────────────────────────────
router.post("/outlets",                 protect, ctrl.createOutlet);
router.get("/outlets/:id",              protect, ctrl.getOutletById);
router.put("/outlets/:id",              protect, ctrl.updateOutlet);
router.patch("/outlets/:id/status",     protect, ctrl.updateOutletStatus);
router.delete("/outlets/:id",           protect, ctrl.deleteOutlet);

// ── Request CRUD + approval/transfer actions ─────────────────────────────
router.post("/requests",                protect, ctrl.createRequest);
router.get("/requests/:id",             protect, ctrl.getRequestById);
router.put("/requests/:id",             protect, ctrl.updateRequest);
router.patch("/requests/:id/status",    protect, ctrl.updateRequestStatus);
router.delete("/requests/:id",          protect, ctrl.deleteRequest);
router.patch("/requests/:id/approve",   protect, ctrl.approveRequest);
router.patch("/requests/:id/reject",    protect, ctrl.rejectRequest);
router.post("/requests/:id/issue",      protect, ctrl.issueStock);
router.post("/requests/:id/receive",    protect, ctrl.receiveStock);

module.exports = router;
