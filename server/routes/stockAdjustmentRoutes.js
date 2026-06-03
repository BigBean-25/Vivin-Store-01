const express = require("express");
const router = express.Router();

const {
  getStockAdjustmentSummary,
  getStockAdjustments,
  getStockAdjustmentById,
  createStockAdjustment,
  updateStockAdjustment,
  approveStockAdjustment,
  postStockAdjustment,
  cancelStockAdjustment,
  deleteStockAdjustment,
} = require("../controllers/stockAdjustmentController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getStockAdjustmentSummary);
router.get("/", protect, getStockAdjustments);
router.post("/", protect, createStockAdjustment);
router.get("/:id", protect, getStockAdjustmentById);
router.put("/:id", protect, updateStockAdjustment);
router.post("/:id/approve", protect, approveStockAdjustment);
router.post("/:id/post", protect, postStockAdjustment);
router.patch("/:id/cancel", protect, cancelStockAdjustment);
router.delete("/:id", protect, deleteStockAdjustment);

module.exports = router;