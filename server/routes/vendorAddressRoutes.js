const express = require("express");
const router = express.Router();

const {
  getVendorAddressSummary,
  getVendorAddresses,
  getVendorAddressById,
  createVendorAddress,
  updateVendorAddress,
  updateVendorAddressStatus,
  deleteVendorAddress,
} = require("../controllers/vendorAddressController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorAddressSummary);
router.get("/", protect, getVendorAddresses);
router.post("/", protect, createVendorAddress);
router.get("/:id", protect, getVendorAddressById);
router.put("/:id", protect, updateVendorAddress);
router.patch("/:id/status", protect, updateVendorAddressStatus);
router.delete("/:id", protect, deleteVendorAddress);

module.exports = router;