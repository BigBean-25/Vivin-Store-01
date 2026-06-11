const express = require("express");
const router = express.Router();

const {
  getVendorReports,
  getVendorReportSummary,
  getVendorReportVendors,
  getVendorReportWallets,
  getVendorReportTransactions,
  getVendorReportLedgers,
  getVendorReportRatings,
  getVendorReportPerformance,
} = require("../controllers/vendorReportController");
const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorReportSummary);
router.get("/vendors", protect, getVendorReportVendors);
router.get("/wallets", protect, getVendorReportWallets);
router.get("/transactions", protect, getVendorReportTransactions);
router.get("/ledgers", protect, getVendorReportLedgers);
router.get("/ratings", protect, getVendorReportRatings);
router.get("/performance", protect, getVendorReportPerformance);
router.get("/", protect, getVendorReports);

module.exports = router;