const express = require("express");
const router = express.Router();

const {
  getVendorLedgers,
  getVendorLedgerById,
  createVendorLedger,
  updateVendorLedger,
  deleteVendorLedger,

  getVendorLedgerOverview,
  getVendorLedgerSummary,
  getVendorStatement,

  syncAutoVendorLedgers,
  syncAutoVendorLedgerByVendor,

  getVendorPaymentAgeingReport,

  recalculateVendorLedgerBalances,
} = require("../controllers/vendorLedgerController");

const { protect } = require("../middleware/authMiddleware");

// Auto sync routes must come before "/:id"
router.post("/sync-auto", protect, syncAutoVendorLedgers);
router.post("/:vendor_id/sync-auto", protect, syncAutoVendorLedgerByVendor);

// Recalculate routes must come before "/:id"
router.post("/recalculate-balances", protect, recalculateVendorLedgerBalances);
router.post("/:vendor_id/recalculate-balances", protect, recalculateVendorLedgerBalances);

// Statement / report routes must come before "/:id"
router.get("/summary", protect, getVendorLedgerOverview);
router.get("/ageing", protect, getVendorPaymentAgeingReport);
router.get("/:vendor_id/summary", protect, getVendorLedgerSummary);
router.get("/:vendor_id/statement", protect, getVendorStatement);
router.get("/:vendor_id/ageing", protect, getVendorPaymentAgeingReport);

// Existing CRUD
router.get("/", protect, getVendorLedgers);
router.post("/", protect, createVendorLedger);
router.get("/:id", protect, getVendorLedgerById);
router.put("/:id", protect, updateVendorLedger);
router.delete("/:id", protect, deleteVendorLedger);

module.exports = router;