const express = require("express");
const router = express.Router();

const {
  getProductReviewSummary,
  getProductReviews,
  getProductReviewById,
  createProductReview,
  updateProductReview,
  updateProductReviewStatus,
  deleteProductReview,
} = require("../controllers/productReviewController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProductReviewSummary);
router.get("/", protect, getProductReviews);
router.post("/", protect, createProductReview);
router.get("/:id", protect, getProductReviewById);
router.put("/:id", protect, updateProductReview);
router.patch("/:id/status", protect, updateProductReviewStatus);
router.delete("/:id", protect, deleteProductReview);

module.exports = router;