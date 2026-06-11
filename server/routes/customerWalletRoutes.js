const express = require("express");

const {
  getSummary,
  getAllCustomerWallets,
  getWalletById,
  getWalletByCustomer,
  createCustomerWallet,
  updateCustomerWallet,
  updateStatus,
  addWalletTransaction,
  deleteCustomerWallet,
} = require("../controllers/customerWalletController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/", protect, getAllCustomerWallets);
router.get("/customer/:customerId", protect, getWalletByCustomer);
router.get("/:id", protect, getWalletById);
router.post("/", protect, createCustomerWallet);
router.post("/customer/:customerId/transaction", protect, addWalletTransaction);
router.put("/:id", protect, updateCustomerWallet);
router.patch("/:id/status", protect, updateStatus);
router.delete("/:id", protect, deleteCustomerWallet);

module.exports = router;
