const express = require("express");

const {
  getAllCustomerWallets,
  getWalletByCustomer,
  createCustomerWallet,
  updateCustomerWallet,
  addWalletTransaction,
  deleteCustomerWallet,
} = require("../controllers/customerWalletController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getAllCustomerWallets);
router.get("/customer/:customerId", protect, getWalletByCustomer);
router.post("/", protect, createCustomerWallet);
router.post("/customer/:customerId/transaction", protect, addWalletTransaction);
router.put("/:id", protect, updateCustomerWallet);
router.delete("/:id", protect, deleteCustomerWallet);

module.exports = router;
