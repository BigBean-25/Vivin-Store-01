const express = require("express");
const router = express.Router();

const {
  getVendorSettlementSummary,
  getVendorSettlements,
  getVendorSettlementById,
  createVendorSettlement,
  updateVendorSettlement,
  deleteVendorSettlement,
} = require("../controllers/vendorSettlementController");

const { protect } = require("../middleware/authMiddleware");

// Summary route must come before /:id
router.get("/summary", protect, getVendorSettlementSummary);

// CRUD routes
router.get("/", protect, getVendorSettlements);
router.post("/", protect, createVendorSettlement);
router.get("/:id", protect, getVendorSettlementById);
router.put("/:id", protect, updateVendorSettlement);
router.delete("/:id", protect, deleteVendorSettlement);

module.exports = router;
