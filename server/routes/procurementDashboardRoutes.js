const express = require("express");
const router = express.Router();

const {
  getProcurementDashboardSummary,
} = require("../controllers/procurementDashboardController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProcurementDashboardSummary);

module.exports = router;
