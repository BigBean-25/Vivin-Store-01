const express = require("express");
const router = express.Router();

const {
  getInventoryReports,
  getInventoryReportSummary,
  getLiveStockReport,
  getLowStockReport,
  getExpiryReport,
  getStockMovementReport,
  generateInventoryReport,
  getInventoryReportById,
  deleteInventoryReport,
} = require("../controllers/inventoryReportController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getInventoryReports);
router.get("/summary", protect, getInventoryReportSummary);
router.get("/live-stock", protect, getLiveStockReport);
router.get("/low-stock", protect, getLowStockReport);
router.get("/expiry", protect, getExpiryReport);
router.get("/movements", protect, getStockMovementReport);
router.post("/generate", protect, generateInventoryReport);
router.get("/:id", protect, getInventoryReportById);
router.delete("/:id", protect, deleteInventoryReport);

module.exports = router;