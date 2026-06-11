const express = require("express");
const router = express.Router();

const {
  getVendorCategorySummary,
  getVendorCategories,
  getVendorCategoryById,
  createVendorCategory,
  updateVendorCategory,
  updateVendorCategoryStatus,
  deleteVendorCategory,
} = require("../controllers/vendorCategoryController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorCategorySummary);
router.get("/", protect, getVendorCategories);
router.post("/", protect, createVendorCategory);
router.get("/:id", protect, getVendorCategoryById);
router.put("/:id", protect, updateVendorCategory);
router.patch("/:id/status", protect, updateVendorCategoryStatus);
router.delete("/:id", protect, deleteVendorCategory);

module.exports = router;