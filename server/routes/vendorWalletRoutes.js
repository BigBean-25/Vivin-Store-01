const express = require("express");
const router = express.Router();

const {
  getVendorWallets,
  getVendorWalletById,
  createVendorWallet,
  updateVendorWallet,
  deleteVendorWallet,
} = require("../controllers/vendorWalletController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorWallets);
router.post("/", protect, createVendorWallet);
router.get("/:id", protect, getVendorWalletById);
router.put("/:id", protect, updateVendorWallet);
router.delete("/:id", protect, deleteVendorWallet);

module.exports = router;