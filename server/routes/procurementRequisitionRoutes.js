const express = require("express");
const router = express.Router();

const {
  getProcurementRequisitionSummary,
  getProcurementRequisitions,
  getProcurementRequisitionById,
  createProcurementRequisition,
  updateProcurementRequisition,
  submitProcurementRequisition,
  approveProcurementRequisition,
  rejectProcurementRequisition,
  deleteProcurementRequisition,
} = require("../controllers/procurementRequisitionController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getProcurementRequisitionSummary);

router.post("/:id/submit", protect, submitProcurementRequisition);
router.post("/:id/approve", protect, approveProcurementRequisition);
router.post("/:id/reject", protect, rejectProcurementRequisition);

router.get("/", protect, getProcurementRequisitions);
router.post("/", protect, createProcurementRequisition);

router.get("/:id", protect, getProcurementRequisitionById);
router.put("/:id", protect, updateProcurementRequisition);
router.delete("/:id", protect, deleteProcurementRequisition);

module.exports = router;
