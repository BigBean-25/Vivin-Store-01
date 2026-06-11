const express = require("express");
const {
  getReportSummary,
  getDeliveriesReport,
  getDriversReport,
  getAssignmentsReport,
  getStatusLogsReport,
  getProofsReport,
  getRoutesReport,
  getChargesReport,
  getTrackingReport,
  getDeliveryReportsData,
  getPerformanceReport,
} = require("../controllers/deliveryReportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary",     protect, getReportSummary);
router.get("/deliveries",  protect, getDeliveriesReport);
router.get("/drivers",     protect, getDriversReport);
router.get("/assignments", protect, getAssignmentsReport);
router.get("/status-logs", protect, getStatusLogsReport);
router.get("/proofs",      protect, getProofsReport);
router.get("/routes",      protect, getRoutesReport);
router.get("/charges",     protect, getChargesReport);
router.get("/tracking",   protect, getTrackingReport);
router.get("/reports",    protect, getDeliveryReportsData);
router.get("/performance", protect, getPerformanceReport);

module.exports = router;
