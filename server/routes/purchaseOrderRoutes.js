const express = require("express");
const router = express.Router();

const {
  getPurchaseOrders,
  getPurchaseOrderSummary,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} = require("../controllers/purchaseOrderController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getPurchaseOrders);
router.get("/summary", protect, getPurchaseOrderSummary);
router.get("/:id", protect, getPurchaseOrderById);

router.post("/", protect, createPurchaseOrder);
router.put("/:id", protect, updatePurchaseOrder);
router.patch("/:id/status", protect, updatePurchaseOrderStatus);
router.delete("/:id", protect, deletePurchaseOrder);

module.exports = router;