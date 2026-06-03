const express = require("express");
const router = express.Router();

const {
  getStockOutwards,
  getStockOutwardById,
  createStockOutward,
  updateStockOutward,
  postStockOutward,
  cancelStockOutward,
  deleteStockOutward,
} = require("../controllers/stockOutwardController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getStockOutwards);
router.post("/", protect, createStockOutward);
router.get("/:id", protect, getStockOutwardById);
router.put("/:id", protect, updateStockOutward);
router.post("/:id/post", protect, postStockOutward);
router.patch("/:id/cancel", protect, cancelStockOutward);
router.delete("/:id", protect, deleteStockOutward);

module.exports = router;