const express = require("express");

const {
  getUnitSummary,
  getUnits,
  getActiveUnits,
  createUnit,
  getUnitById,
  updateUnit,
  updateUnitStatus,
  deleteUnit,
} = require("../controllers/unitController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getUnitSummary);
router.get("/active/list", protect, getActiveUnits);
router.get("/", protect, getUnits);
router.post("/", protect, createUnit);
router.get("/:id", protect, getUnitById);
router.put("/:id", protect, updateUnit);
router.patch("/:id/status", protect, updateUnitStatus);
router.delete("/:id", protect, deleteUnit);

module.exports = router;
