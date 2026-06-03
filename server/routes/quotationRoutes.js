const express = require("express");
const router = express.Router();

const {
  getQuotations,
  getQuotationSummary,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  deleteQuotation,
  createPurchaseOrderFromQuotation,
  getRfqQuotationComparison,
} = require("../controllers/quotationController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getQuotations);
router.get("/summary", protect, getQuotationSummary);

router.get("/rfq/:rfq_id/comparison", protect, getRfqQuotationComparison);
router.post("/:id/create-purchase-order", protect, createPurchaseOrderFromQuotation);

router.get("/:id", protect, getQuotationById);

router.post("/", protect, createQuotation);
router.put("/:id", protect, updateQuotation);
router.patch("/:id/status", protect, updateQuotationStatus);
router.delete("/:id", protect, deleteQuotation);

module.exports = router;




