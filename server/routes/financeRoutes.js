const express = require("express");
const {
  getSummary,
  getAllPayments, getPaymentById, createPayment, updatePayment,
  updatePaymentStatus, deletePayment,
  getReceipts,
  getExpenses, createExpense, deleteExpense,
  getInvoiceSummary, getAllInvoices, getInvoiceById, updateInvoiceStatus,
  getVendorPaymentsSummary, getVendorPayments,
  getCustomerOutstandingSummary, getCustomerOutstanding,
  getFinanceReport,
} = require("../controllers/financeController");
const {
  getGSTSummary,
  getGSTReports,
  getSalesGST,
  getPurchasesGST,
  getInputOutput,
} = require("../controllers/gstController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* ── Summary / Dashboard (MUST be before /:id) ── */
router.get("/summary",   protect, getSummary);
router.get("/dashboard", protect, getSummary);

/* ── Invoices (before /:id) ── */
router.get("/invoices/summary",       protect, getInvoiceSummary);
router.get("/invoices",               protect, getAllInvoices);
router.get("/invoices/:id",           protect, getInvoiceById);
router.patch("/invoices/:id/status",  protect, updateInvoiceStatus);

/* ── Receipts (read-only, customer payments) ── */
router.get("/receipts", protect, getReceipts);

/* ── Expenses (transactions type=expense) ── */
router.get("/expenses",        protect, getExpenses);
router.post("/expenses",       protect, createExpense);
router.delete("/expenses/:id", protect, deleteExpense);

/* ── Payments ── */
router.get("/payments",              protect, getAllPayments);
router.post("/payments",             protect, createPayment);
router.get("/payments/:id",          protect, getPaymentById);
router.put("/payments/:id",          protect, updatePayment);
router.patch("/payments/:id/status", protect, updatePaymentStatus);
router.delete("/payments/:id",       protect, deletePayment);

/* ── Vendor Payments (procurement_payments — must be before /:id) ── */
router.get("/vendor-payments/summary", protect, getVendorPaymentsSummary);
router.get("/vendor-payments",         protect, getVendorPayments);

/* ── Customer Outstanding (must be before /:id) ── */
router.get("/customer-outstanding/summary", protect, getCustomerOutstandingSummary);
router.get("/customer-outstanding",         protect, getCustomerOutstanding);

/* ── Finance Report (P&L) ── */
router.get("/report", protect, getFinanceReport);

/* ── GST Reports (must be before /:id) ── */
router.get("/gst-summary",              protect, getGSTSummary);
router.get("/gst-reports/sales",        protect, getSalesGST);
router.get("/gst-reports/purchases",    protect, getPurchasesGST);
router.get("/gst-reports/input-output", protect, getInputOutput);
router.get("/gst-reports",              protect, getGSTReports);

module.exports = router;
