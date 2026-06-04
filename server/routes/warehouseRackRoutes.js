const express = require("express");
const router = express.Router();

const {
  getWarehouseRackSummary,
  getWarehouseRacks,
  getWarehouseRackById,
  createWarehouseRack,
  updateWarehouseRack,
  updateWarehouseRackStatus,
  deleteWarehouseRack,
} = require("../controllers/warehouseRackController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getWarehouseRackSummary);
router.get("/", protect, getWarehouseRacks);
router.post("/", protect, createWarehouseRack);
router.get("/:id", protect, getWarehouseRackById);
router.put("/:id", protect, updateWarehouseRack);
router.patch("/:id/status", protect, updateWarehouseRackStatus);
router.delete("/:id", protect, deleteWarehouseRack);

module.exports = router;
