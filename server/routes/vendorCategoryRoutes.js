const express = require("express");
const router = express.Router();

const {
  getVendorCategories,
  getVendorCategoryById,
  createVendorCategory,
  updateVendorCategory,
  deleteVendorCategory,
} = require("../controllers/vendorCategoryController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorCategories);
router.post("/", protect, createVendorCategory);
router.get("/:id", protect, getVendorCategoryById);
router.put("/:id", protect, updateVendorCategory);
router.delete("/:id", protect, deleteVendorCategory);

module.exports = router;