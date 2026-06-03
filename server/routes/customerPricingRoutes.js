const express = require("express");

const {
  getAllCustomerPricing,
  getPricingByCustomer,
  createCustomerPricing,
  updateCustomerPricing,
  deleteCustomerPricing,
} = require("../controllers/customerPricingController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getAllCustomerPricing);
router.get("/customer/:customerId", protect, getPricingByCustomer);
router.post("/", protect, createCustomerPricing);
router.put("/:id", protect, updateCustomerPricing);
router.delete("/:id", protect, deleteCustomerPricing);

module.exports = router;
