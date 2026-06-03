const express = require("express");
const router = express.Router();

const {
  getProductPricing,
  getProductPricingById,
  createProductPricing,
  updateProductPricing,
  deleteProductPricing,
} = require("../controllers/productPricingController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProductPricing);
router.post("/", protect, createProductPricing);
router.get("/:id", protect, getProductPricingById);
router.put("/:id", protect, updateProductPricing);
router.delete("/:id", protect, deleteProductPricing);

module.exports = router;