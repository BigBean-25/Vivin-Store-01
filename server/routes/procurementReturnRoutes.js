const express = require("express");
const router = express.Router();

const {
  getProcurementReturns,
  getProcurementReturnSummary,
  getProcurementReturnById,
  createProcurementReturn,
  updateProcurementReturn,
  updateProcurementReturnStatus,
  deleteProcurementReturn,
} = require("../controllers/procurementReturnController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProcurementReturns);
router.get("/summary", protect, getProcurementReturnSummary);
router.get("/:id", protect, getProcurementReturnById);

router.post("/", protect, createProcurementReturn);
router.put("/:id", protect, updateProcurementReturn);
router.patch("/:id/status", protect, updateProcurementReturnStatus);
router.delete("/:id", protect, deleteProcurementReturn);

module.exports = router;
