const express = require("express");
const router = express.Router();

const {
  getWarehouseZoneSummary,
  getWarehouseZones,
  getWarehouseZoneById,
  createWarehouseZone,
  updateWarehouseZone,
  updateWarehouseZoneStatus,
  deleteWarehouseZone,
} = require("../controllers/warehouseZoneController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getWarehouseZoneSummary);
router.get("/", protect, getWarehouseZones);
router.post("/", protect, createWarehouseZone);
router.get("/:id", protect, getWarehouseZoneById);
router.put("/:id", protect, updateWarehouseZone);
router.patch("/:id/status", protect, updateWarehouseZoneStatus);
router.delete("/:id", protect, deleteWarehouseZone);

module.exports = router;
