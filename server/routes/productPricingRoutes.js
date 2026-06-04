const express = require("express");
const router = express.Router();

const {
  getProductPricingSummary,
  getProductPricing,
  getProductPricingById,
  createProductPricing,
  updateProductPricing,
  updateProductPricingStatus,
  deleteProductPricing,
} = require("../controllers/productPricingController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProductPricingSummary);
router.get("/", protect, getProductPricing);
router.post("/", protect, createProductPricing);
router.get("/:id", protect, getProductPricingById);
router.put("/:id", protect, updateProductPricing);
router.patch("/:id/status", protect, updateProductPricingStatus);
router.delete("/:id", protect, deleteProductPricing);

module.exports = router;