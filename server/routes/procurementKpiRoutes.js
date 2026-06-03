const express = require("express");
const router = express.Router();

const {
  getProcurementKpiSummary,
  getProcurementKpiTrends,
  getProcurementVendorKpis,
} = require("../controllers/procurementKpiController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProcurementKpiSummary);
router.get("/trends", protect, getProcurementKpiTrends);
router.get("/vendors", protect, getProcurementVendorKpis);

module.exports = router;
