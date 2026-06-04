const express = require("express");
const router = express.Router();

const {
  getProductReports,
  getProductReportById,
  getProductReportSummary,
  getProductsReport,
  getStockSettingsReport,
  getPricingReport,
  getVariantsReport,
  getReviewsReport,
} = require("../controllers/productReportController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProductReportSummary);
router.get("/products", protect, getProductsReport);
router.get("/stock-settings", protect, getStockSettingsReport);
router.get("/pricing", protect, getPricingReport);
router.get("/variants", protect, getVariantsReport);
router.get("/reviews", protect, getReviewsReport);
router.get("/", protect, getProductReports);
router.get("/:id", protect, getProductReportById);

module.exports = router;