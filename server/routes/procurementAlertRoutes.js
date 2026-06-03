const express = require("express");
const router = express.Router();

const {
  getProcurementAlertSummary,
  getProcurementAlerts,
  createProcurementAlert,
  resolveProcurementAlert,
  deleteProcurementAlert,
  generateProcurementAlerts,
} = require("../controllers/procurementAlertController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProcurementAlertSummary);
router.post("/generate", protect, generateProcurementAlerts);

router.post("/:id/resolve", protect, resolveProcurementAlert);

router.get("/", protect, getProcurementAlerts);
router.post("/", protect, createProcurementAlert);
router.delete("/:id", protect, deleteProcurementAlert);

module.exports = router;
