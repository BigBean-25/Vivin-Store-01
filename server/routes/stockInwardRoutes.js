const express = require("express");
const router = express.Router();

const {
  getStockInwards,
  getStockInwardById,
  createStockInward,
  updateStockInward,
  postStockInward,
  cancelStockInward,
  deleteStockInward,
} = require("../controllers/stockInwardController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getStockInwards);
router.post("/", protect, createStockInward);
router.get("/:id", protect, getStockInwardById);
router.put("/:id", protect, updateStockInward);
router.post("/:id/post", protect, postStockInward);
router.patch("/:id/cancel", protect, cancelStockInward);
router.delete("/:id", protect, deleteStockInward);

module.exports = router;