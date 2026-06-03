const express = require("express");
const router = express.Router();

const {
  generateProcurementReorderPlan,
  saveProcurementReorderPlan,
  getProcurementReorderPlans,
  getProcurementReorderPlanById,
  deleteProcurementReorderPlan,
} = require("../controllers/procurementReorderController");

const { protect } = require("../middleware/authMiddleware");

router.get("/generate", protect, generateProcurementReorderPlan);
router.post("/save", protect, saveProcurementReorderPlan);

router.get("/", protect, getProcurementReorderPlans);
router.get("/:id", protect, getProcurementReorderPlanById);
router.delete("/:id", protect, deleteProcurementReorderPlan);

module.exports = router;
