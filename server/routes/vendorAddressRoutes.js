const express = require("express");
const router = express.Router();

const {
  getVendorAddresses,
  getVendorAddressById,
  createVendorAddress,
  updateVendorAddress,
  deleteVendorAddress,
} = require("../controllers/vendorAddressController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorAddresses);
router.post("/", protect, createVendorAddress);
router.get("/:id", protect, getVendorAddressById);
router.put("/:id", protect, updateVendorAddress);
router.delete("/:id", protect, deleteVendorAddress);

module.exports = router;