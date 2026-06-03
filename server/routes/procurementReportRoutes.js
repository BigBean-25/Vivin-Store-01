const express = require("express");
const router = express.Router();

const {
  getProcurementReportSummary,
  getMonthlyProcurementReport,
  getVendorProcurementReport,
  getProductProcurementReport,
  getOutstandingVendorPayments,
  getProcurementStatusReport,
} = require("../controllers/procurementReportController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProcurementReportSummary);
router.get("/monthly", protect, getMonthlyProcurementReport);
router.get("/vendors", protect, getVendorProcurementReport);
router.get("/products", protect, getProductProcurementReport);
router.get("/outstanding-payments", protect, getOutstandingVendorPayments);
router.get("/status", protect, getProcurementStatusReport);

module.exports = router;
