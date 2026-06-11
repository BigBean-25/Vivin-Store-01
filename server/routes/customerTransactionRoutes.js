const express = require("express");

const {
  getSummary,
  getAllCustomerTransactions,
  getTransactionsByCustomer,
  getTransactionById,
  createCustomerTransaction,
} = require("../controllers/customerTransactionController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/", protect, getAllCustomerTransactions);
router.get("/customer/:customerId", protect, getTransactionsByCustomer);
router.get("/:id", protect, getTransactionById);
router.post("/", protect, createCustomerTransaction);

module.exports = router;
