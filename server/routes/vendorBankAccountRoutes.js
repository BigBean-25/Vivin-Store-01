const express = require("express");
const router = express.Router();

const {
  getVendorBankAccounts,
  getVendorBankAccountById,
  createVendorBankAccount,
  updateVendorBankAccount,
  deleteVendorBankAccount,
} = require("../controllers/vendorBankAccountController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorBankAccounts);
router.post("/", protect, createVendorBankAccount);
router.get("/:id", protect, getVendorBankAccountById);
router.put("/:id", protect, updateVendorBankAccount);
router.delete("/:id", protect, deleteVendorBankAccount);

module.exports = router;