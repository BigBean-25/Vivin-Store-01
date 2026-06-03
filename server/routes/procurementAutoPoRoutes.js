const express = require("express");
const router = express.Router();

const {
  previewAutoPurchaseOrders,
  createPurchaseOrdersFromReorderPlan,
  getAutoPoHistory,
} = require("../controllers/procurementAutoPoController");

const { protect } = require("../middleware/authMiddleware");

router.get("/preview", protect, previewAutoPurchaseOrders);
router.post("/create", protect, createPurchaseOrdersFromReorderPlan);
router.get("/history", protect, getAutoPoHistory);

module.exports = router;
