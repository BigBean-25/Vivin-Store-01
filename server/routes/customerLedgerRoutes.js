const express = require("express");

const {
  getAllCustomerLedgers,
  getCustomerLedgerByCustomer,
  getCustomerLedgerById,
  getCustomerLedgerSummary,
  createCustomerLedger,
} = require("../controllers/customerLedgerController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getAllCustomerLedgers);
router.get("/customer/:customerId", protect, getCustomerLedgerByCustomer);
router.get("/customer/:customerId/summary", protect, getCustomerLedgerSummary);
router.get("/:id", protect, getCustomerLedgerById);
router.post("/", protect, createCustomerLedger);

module.exports = router;
