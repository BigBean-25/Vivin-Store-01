const express = require("express");

const {
  getUnits,
  getActiveUnits,
  createUnit,
  getUnitById,
  updateUnit,
  deleteUnit,
} = require("../controllers/unitController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getUnits);
router.get("/active/list", protect, getActiveUnits);
router.post("/", protect, createUnit);
router.get("/:id", protect, getUnitById);
router.put("/:id", protect, updateUnit);
router.delete("/:id", protect, deleteUnit);

module.exports = router;
