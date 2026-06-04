const express = require("express");
const router = express.Router();

const {
  getWarehouseStockSummary,
  getWarehouseStock,
  getLowStock,
  getStockBatches,
  getStockMovements,
  getStockValuation,
} = require("../controllers/warehouseStockController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getWarehouseStockSummary);
router.get("/low-stock", protect, getLowStock);
router.get("/batches", protect, getStockBatches);
router.get("/movements", protect, getStockMovements);
router.get("/valuation", protect, getStockValuation);
router.get("/", protect, getWarehouseStock);

module.exports = router;
