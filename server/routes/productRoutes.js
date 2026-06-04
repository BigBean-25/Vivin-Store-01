const express = require("express");

const {
  getProductSummary,
  getProducts,
  getActiveProducts,
  getPendingProducts,
  createProduct,
  getProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getProductSummary);
router.get("/active/list", protect, getActiveProducts);
router.get("/pending/list", protect, getPendingProducts);
router.get("/", protect, getProducts);
router.post("/", protect, createProduct);
router.get("/:id", protect, getProductById);
router.put("/:id", protect, updateProduct);
router.patch("/:id/status", protect, updateProductStatus);
router.delete("/:id", protect, deleteProduct);

module.exports = router;
