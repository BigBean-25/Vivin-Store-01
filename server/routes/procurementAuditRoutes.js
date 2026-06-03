const express = require("express");
const router = express.Router();

const {
  getProcurementAuditLogs,
  getProcurementAuditSummary,
  getProcurementAuditById,
  createManualProcurementAuditLog,
} = require("../controllers/procurementAuditController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProcurementAuditLogs);
router.get("/summary", protect, getProcurementAuditSummary);
router.get("/:id", protect, getProcurementAuditById);

router.post("/", protect, createManualProcurementAuditLog);

module.exports = router;
