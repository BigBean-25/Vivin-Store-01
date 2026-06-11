const express = require("express");
const router = express.Router();

const {
  getVendorWalletSummary,
  getVendorWallets,
  getVendorWalletById,
  createVendorWallet,
  updateVendorWallet,
  updateVendorWalletStatus,
  deleteVendorWallet,
} = require("../controllers/vendorWalletController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorWalletSummary);
router.get("/", protect, getVendorWallets);
router.post("/", protect, createVendorWallet);
router.get("/:id", protect, getVendorWalletById);
router.put("/:id", protect, updateVendorWallet);
router.patch("/:id/status", protect, updateVendorWalletStatus);
router.delete("/:id", protect, deleteVendorWallet);

module.exports = router;