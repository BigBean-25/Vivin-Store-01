const express = require("express");
const router = express.Router();

const {
  getVendorTransactions,
  getVendorTransactionById,
  createVendorTransaction,
  updateVendorTransaction,
  deleteVendorTransaction,
  getVendorTransactionSummary,
  updateVendorTransactionStatus,
} = require("../controllers/vendorTransactionController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorTransactionSummary);
router.get("/", protect, getVendorTransactions);
router.post("/", protect, createVendorTransaction);
router.get("/:id", protect, getVendorTransactionById);
router.put("/:id", protect, updateVendorTransaction);
router.patch("/:id/status", protect, updateVendorTransactionStatus);
router.delete("/:id", protect, deleteVendorTransaction);

module.exports = router;