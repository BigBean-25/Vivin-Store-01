const express = require("express");
const router = express.Router();

const {
  getWarehouseStaffSummary,
  getWarehouseStaff,
  getWarehouseStaffById,
  createWarehouseStaff,
  updateWarehouseStaff,
  updateWarehouseStaffStatus,
  deleteWarehouseStaff,
  getAssignableUsers,
} = require("../controllers/warehouseStaffController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getWarehouseStaffSummary);
router.get("/assignable-users", protect, getAssignableUsers);
router.get("/", protect, getWarehouseStaff);
router.post("/", protect, createWarehouseStaff);
router.get("/:id", protect, getWarehouseStaffById);
router.put("/:id", protect, updateWarehouseStaff);
router.patch("/:id/status", protect, updateWarehouseStaffStatus);
router.delete("/:id", protect, deleteWarehouseStaff);

module.exports = router;
