const express = require("express");
const router = express.Router();

const {
  getProcurementBudgets,
  getProcurementBudgetSummary,
  getProcurementBudgetById,
  createProcurementBudget,
  updateProcurementBudget,
  deleteProcurementBudget,
} = require("../controllers/procurementBudgetController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProcurementBudgets);
router.get("/summary", protect, getProcurementBudgetSummary);
router.get("/:id", protect, getProcurementBudgetById);

router.post("/", protect, createProcurementBudget);
router.put("/:id", protect, updateProcurementBudget);
router.delete("/:id", protect, deleteProcurementBudget);

module.exports = router;
