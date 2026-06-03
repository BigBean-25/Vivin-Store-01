const express = require("express");
const router = express.Router();

const {
  getProcurementMasterDashboard,
  getProcurementMasterHealth,
} = require("../controllers/procurementMasterDashboardController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProcurementMasterDashboard);
router.get("/health", protect, getProcurementMasterHealth);

module.exports = router;
