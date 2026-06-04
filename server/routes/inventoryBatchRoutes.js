const express = require("express");
const router = express.Router();

const {
  getInventoryBatches,
  getInventoryBatchSummary,
  getNearExpiryBatches,
  getExpiredBatches,
  getInventoryBatchById,
  createInventoryBatch,
  updateInventoryBatch,
  updateBatchStatus,
  deleteInventoryBatch,
  disposeExpiredBatch,
} = require("../controllers/inventoryBatchController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getInventoryBatchSummary);
router.get("/near-expiry", protect, getNearExpiryBatches);
router.get("/expired", protect, getExpiredBatches);
router.get("/", protect, getInventoryBatches);
router.post("/", protect, createInventoryBatch);
router.get("/:id", protect, getInventoryBatchById);
router.put("/:id", protect, updateInventoryBatch);
router.patch("/:id/status", protect, updateBatchStatus);
router.delete("/:id", protect, deleteInventoryBatch);
router.post("/:id/dispose", protect, disposeExpiredBatch);

module.exports = router;