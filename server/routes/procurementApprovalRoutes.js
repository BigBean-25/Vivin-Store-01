const express = require("express");
const router = express.Router();

const {
  getProcurementApprovals,
  getProcurementApprovalSummary,
  createProcurementApprovalRequest,
  approveProcurementApproval,
  rejectProcurementApproval,
} = require("../controllers/procurementApprovalController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProcurementApprovals);
router.get("/summary", protect, getProcurementApprovalSummary);

router.post("/request", protect, createProcurementApprovalRequest);
router.post("/:id/approve", protect, approveProcurementApproval);
router.post("/:id/reject", protect, rejectProcurementApproval);

module.exports = router;
