const express = require("express");

const {
  getProducts,
  getActiveProducts,
  getPendingProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getProducts);
router.get("/active/list", protect, getActiveProducts);
router.get("/pending/list", protect, getPendingProducts);
router.post("/", protect, createProduct);
router.get("/:id", protect, getProductById);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);

module.exports = router;
