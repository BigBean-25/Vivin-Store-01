const express = require("express");
const {
  getReportSummary,
  getOrdersReport,
  getItemsReport,
  getPaymentsReport,
  getInvoicesReport,
  getDeliveryReport,
  getReturnsReport,
  getPerformanceReport,
} = require("../controllers/orderReportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary",     protect, getReportSummary);
router.get("/orders",      protect, getOrdersReport);
router.get("/items",       protect, getItemsReport);
router.get("/payments",    protect, getPaymentsReport);
router.get("/invoices",    protect, getInvoicesReport);
router.get("/delivery",    protect, getDeliveryReport);
router.get("/returns",     protect, getReturnsReport);
router.get("/performance", protect, getPerformanceReport);

module.exports = router;
