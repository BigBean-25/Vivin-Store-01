const express = require("express");
const router = express.Router();

const {
  getProductVariants,
  getProductVariantById,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} = require("../controllers/productVariantController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProductVariants);
router.post("/", protect, createProductVariant);
router.get("/:id", protect, getProductVariantById);
router.put("/:id", protect, updateProductVariant);
router.delete("/:id", protect, deleteProductVariant);

module.exports = router;