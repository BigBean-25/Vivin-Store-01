const express = require("express");
const router = express.Router();

const {
  getInventoryRequests,
  getInventoryRequestSummary,
  getInventoryRequestById,
  createInventoryRequest,
  updateInventoryRequest,
  submitInventoryRequest,
  approveInventoryRequest,
  fulfillInventoryRequest,
  issueInventoryRequest,
  rejectInventoryRequest,
  cancelInventoryRequest,
  deleteInventoryRequest,
} = require("../controllers/inventoryRequestController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getInventoryRequestSummary);
router.get("/", protect, getInventoryRequests);
router.post("/", protect, createInventoryRequest);
router.get("/:id", protect, getInventoryRequestById);
router.put("/:id", protect, updateInventoryRequest);
router.patch("/:id/submit", protect, submitInventoryRequest);
router.patch("/:id/approve", protect, approveInventoryRequest);
router.patch("/:id/fulfill", protect, fulfillInventoryRequest);
router.patch("/:id/issue", protect, issueInventoryRequest);
router.patch("/:id/reject", protect, rejectInventoryRequest);
router.patch("/:id/cancel", protect, cancelInventoryRequest);
router.delete("/:id", protect, deleteInventoryRequest);

module.exports = router;