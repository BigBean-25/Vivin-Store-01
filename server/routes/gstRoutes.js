const express = require("express");
const {
  getGSTSummary,
  getSalesGST,
  getPurchasesGST,
  getInputOutput,
  getGSTRates,
  getGSTR1Reports,
  getGSTR3BReports,
  getTaxTransactions,
} = require("../controllers/gstController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary",           protect, getGSTSummary);
router.get("/sales",             protect, getSalesGST);
router.get("/purchases",         protect, getPurchasesGST);
router.get("/input-output",      protect, getInputOutput);
router.get("/rates",             protect, getGSTRates);
router.get("/gstr1",             protect, getGSTR1Reports);
router.get("/gstr3b",            protect, getGSTR3BReports);
router.get("/tax-transactions",  protect, getTaxTransactions);

module.exports = router;
