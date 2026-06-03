const express = require("express");
const router = express.Router();

const {
  getVendorPerformanceScorecards,
  getVendorPerformanceSummary,
  getVendorPerformanceByVendor,
  saveVendorPerformanceSnapshot,
} = require("../controllers/vendorPerformanceController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorPerformanceScorecards);
router.get("/summary", protect, getVendorPerformanceSummary);
router.get("/:vendor_id", protect, getVendorPerformanceByVendor);

router.post("/snapshot", protect, saveVendorPerformanceSnapshot);

module.exports = router;
