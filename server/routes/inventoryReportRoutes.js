const express = require("express");
const router = express.Router();

const {
  getInventoryReports,
  getInventoryReportSummary,
  getLiveStockReport,
  getLowStockReport,
  getExpiryReport,
  getStockMovementReport,
  getStockValuationReport,
  getBatchExpiryReport,
  getInwardOutwardSummary,
  generateInventoryReport,
  getInventoryReportById,
  deleteInventoryReport,
} = require("../controllers/inventoryReportController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getInventoryReportSummary);
router.get("/live-stock", protect, getLiveStockReport);
router.get("/stock-valuation", protect, getStockValuationReport);
router.get("/low-stock", protect, getLowStockReport);
router.get("/expiry", protect, getExpiryReport);
router.get("/batch-expiry", protect, getBatchExpiryReport);
router.get("/movements", protect, getStockMovementReport);
router.get("/stock-movements", protect, getStockMovementReport);
router.get("/inward-outward-summary", protect, getInwardOutwardSummary);
router.post("/generate", protect, generateInventoryReport);
router.get("/", protect, getInventoryReports);
router.get("/:id", protect, getInventoryReportById);
router.delete("/:id", protect, deleteInventoryReport);

module.exports = router;