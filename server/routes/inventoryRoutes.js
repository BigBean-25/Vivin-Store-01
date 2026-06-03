const express = require("express");

const {
  getInventories,
  getLowStockInventories,
  getInventorySummary,
  getInventoryById,
  createOrUpdateInventory,
  adjustStock,
  getStockMovements,
} = require("../controllers/inventoryController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getInventories);
router.get("/summary", protect, getInventorySummary);
router.get("/low-stock/list", protect, getLowStockInventories);
router.get("/movements/list", protect, getStockMovements);
router.get("/:id", protect, getInventoryById);

router.post("/", protect, createOrUpdateInventory);
router.post("/adjust", protect, adjustStock);

module.exports = router;
