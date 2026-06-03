const express = require("express");
const router = express.Router();

const {
  getVendorRatings,
  getVendorRatingById,
  createVendorRating,
  updateVendorRating,
  deleteVendorRating,
} = require("../controllers/vendorRatingController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorRatings);
router.post("/", protect, createVendorRating);
router.get("/:id", protect, getVendorRatingById);
router.put("/:id", protect, updateVendorRating);
router.delete("/:id", protect, deleteVendorRating);

module.exports = router;