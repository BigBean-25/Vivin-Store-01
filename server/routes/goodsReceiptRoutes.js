const express = require("express");
const router = express.Router();

const {
  getGoodsReceipts,
  getGoodsReceiptSummary,
  getGoodsReceiptById,
  createGoodsReceipt,
  verifyGoodsReceipt,
  postGoodsReceipt,
  cancelGoodsReceipt,
} = require("../controllers/goodsReceiptController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getGoodsReceipts);
router.get("/summary", protect, getGoodsReceiptSummary);
router.get("/:id", protect, getGoodsReceiptById);

router.post("/", protect, createGoodsReceipt);

router.patch("/:id/verify", protect, verifyGoodsReceipt);
router.patch("/:id/post", protect, postGoodsReceipt);
router.patch("/:id/cancel", protect, cancelGoodsReceipt);

module.exports = router;