const express = require("express");
const router = express.Router();

const {
  getProductVariantSummary,
  getProductVariants,
  getProductVariantById,
  createProductVariant,
  updateProductVariant,
  updateProductVariantStatus,
  deleteProductVariant,
} = require("../controllers/productVariantController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProductVariantSummary);
router.get("/", protect, getProductVariants);
router.post("/", protect, createProductVariant);
router.get("/:id", protect, getProductVariantById);
router.put("/:id", protect, updateProductVariant);
router.patch("/:id/status", protect, updateProductVariantStatus);
router.delete("/:id", protect, deleteProductVariant);

module.exports = router;