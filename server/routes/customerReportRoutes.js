const express = require("express");

const {
  getSummary,
  getCustomersReport,
  getWalletsReport,
  getTransactionsReport,
  getLedgersReport,
  getCreditLimitsReport,
  getPricingReport,
  getPerformanceReport,
} = require("../controllers/customerReportController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/customers", protect, getCustomersReport);
router.get("/wallets", protect, getWalletsReport);
router.get("/transactions", protect, getTransactionsReport);
router.get("/ledgers", protect, getLedgersReport);
router.get("/credit-limits", protect, getCreditLimitsReport);
router.get("/pricing", protect, getPricingReport);
router.get("/performance", protect, getPerformanceReport);

module.exports = router;
