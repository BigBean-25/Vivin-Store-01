const express = require("express");
const router = express.Router();

const {
  getWarehouseBinSummary,
  getWarehouseBins,
  getWarehouseBinById,
  createWarehouseBin,
  updateWarehouseBin,
  updateWarehouseBinStatus,
  deleteWarehouseBin,
} = require("../controllers/warehouseBinController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getWarehouseBinSummary);
router.get("/", protect, getWarehouseBins);
router.post("/", protect, createWarehouseBin);
router.get("/:id", protect, getWarehouseBinById);
router.put("/:id", protect, updateWarehouseBin);
router.patch("/:id/status", protect, updateWarehouseBinStatus);
router.delete("/:id", protect, deleteWarehouseBin);

module.exports = router;
