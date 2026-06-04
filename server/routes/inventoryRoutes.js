const express = require("express");

const {
  getOutletStock,
  createOrUpdateOutletStock,
  updateOutletStock,
  deleteOutletStock,
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

router.get("/outlet-stock", protect, getOutletStock);
router.post("/outlet-stock", protect, createOrUpdateOutletStock);
router.put("/outlet-stock/:id", protect, updateOutletStock);
router.delete("/outlet-stock/:id", protect, deleteOutletStock);
router.get("/", protect, getInventories);
router.get("/summary", protect, getInventorySummary);
router.get("/low-stock/list", protect, getLowStockInventories);
router.get("/movements/list", protect, getStockMovements);
router.get("/:id", protect, getInventoryById);

router.post("/", protect, createOrUpdateInventory);
router.post("/adjust", protect, adjustStock);

module.exports = router;
