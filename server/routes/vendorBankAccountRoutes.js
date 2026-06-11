const express = require("express");
const router = express.Router();

const {
  getVendorBankAccountSummary,
  getVendorBankAccounts,
  getVendorBankAccountById,
  createVendorBankAccount,
  updateVendorBankAccount,
  updateVendorBankAccountStatus,
  deleteVendorBankAccount,
} = require("../controllers/vendorBankAccountController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorBankAccountSummary);
router.get("/", protect, getVendorBankAccounts);
router.post("/", protect, createVendorBankAccount);
router.get("/:id", protect, getVendorBankAccountById);
router.put("/:id", protect, updateVendorBankAccount);
router.patch("/:id/status", protect, updateVendorBankAccountStatus);
router.delete("/:id", protect, deleteVendorBankAccount);

module.exports = router;