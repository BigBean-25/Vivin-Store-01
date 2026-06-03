const express = require("express");
const router = express.Router();

const {
  getProcurementPayments,
  getProcurementPaymentSummary,
  getProcurementPaymentById,
  getPurchaseOrderPaymentBalance,
  createProcurementPayment,
  updateProcurementPayment,
  updateProcurementPaymentStatus,
  deleteProcurementPayment,
} = require("../controllers/procurementPaymentController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProcurementPayments);
router.get("/summary", protect, getProcurementPaymentSummary);
router.get("/purchase-order/:purchase_order_id/balance", protect, getPurchaseOrderPaymentBalance);
router.get("/:id", protect, getProcurementPaymentById);

router.post("/", protect, createProcurementPayment);
router.put("/:id", protect, updateProcurementPayment);
router.patch("/:id/status", protect, updateProcurementPaymentStatus);
router.delete("/:id", protect, deleteProcurementPayment);

module.exports = router;
