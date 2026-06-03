const express = require("express");
const router = express.Router();

const {
  getStockInwardSummary,
  getStockInwards,
  getStockInwardById,
  createStockInward,
  updateStockInward,
  postStockInward,
  cancelStockInward,
  deleteStockInward,
} = require("../controllers/stockInwardController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getStockInwardSummary);
router.get("/", protect, getStockInwards);
router.post("/", protect, createStockInward);
router.get("/:id", protect, getStockInwardById);
router.put("/:id", protect, updateStockInward);
router.post("/:id/post", protect, postStockInward);
router.patch("/:id/cancel", protect, cancelStockInward);
router.delete("/:id", protect, deleteStockInward);

module.exports = router;