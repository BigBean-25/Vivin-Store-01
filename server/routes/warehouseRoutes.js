const express = require("express");

const {
  getWarehouses,
  getActiveWarehouses,
  createWarehouse,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
} = require("../controllers/warehouseController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getWarehouses);
router.get("/active/list", protect, getActiveWarehouses);
router.post("/", protect, createWarehouse);
router.get("/:id", protect, getWarehouseById);
router.put("/:id", protect, updateWarehouse);
router.delete("/:id", protect, deleteWarehouse);

module.exports = router;
