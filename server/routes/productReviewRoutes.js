const express = require("express");
const router = express.Router();

const {
  getProductReviews,
  getProductReviewById,
  createProductReview,
  updateProductReview,
  deleteProductReview,
} = require("../controllers/productReviewController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProductReviews);
router.post("/", protect, createProductReview);
router.get("/:id", protect, getProductReviewById);
router.put("/:id", protect, updateProductReview);
router.delete("/:id", protect, deleteProductReview);

module.exports = router;