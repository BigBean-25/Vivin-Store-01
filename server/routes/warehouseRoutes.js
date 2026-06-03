const express = require("express");

const {
  getWarehouseSummary,
  getWarehouses,
  getActiveWarehouses,
  createWarehouse,
  getWarehouseById,
  updateWarehouse,
  updateWarehouseStatus,
  deleteWarehouse,
} = require("../controllers/warehouseController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getWarehouseSummary);
router.get("/active/list", protect, getActiveWarehouses);
router.get("/", protect, getWarehouses);
router.post("/", protect, createWarehouse);
router.get("/:id", protect, getWarehouseById);
router.put("/:id", protect, updateWarehouse);
router.patch("/:id/status", protect, updateWarehouseStatus);
router.delete("/:id", protect, deleteWarehouse);

module.exports = router;
