const express = require("express");
const router = express.Router();

const {
  getVendorTransactions,
  getVendorTransactionById,
  createVendorTransaction,
  updateVendorTransaction,
  deleteVendorTransaction,
} = require("../controllers/vendorTransactionController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorTransactions);
router.post("/", protect, createVendorTransaction);
router.get("/:id", protect, getVendorTransactionById);
router.put("/:id", protect, updateVendorTransaction);
router.delete("/:id", protect, deleteVendorTransaction);

module.exports = router;