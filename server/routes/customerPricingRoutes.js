const express = require("express");

const {
  getSummary,
  getAllCustomerPricing,
  getCustomerPricingById,
  getPricingByCustomer,
  createCustomerPricing,
  updateCustomerPricing,
  updateStatus,
  deleteCustomerPricing,
} = require("../controllers/customerPricingController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/", protect, getAllCustomerPricing);
router.get("/customer/:customerId", protect, getPricingByCustomer);
router.get("/:id", protect, getCustomerPricingById);
router.post("/", protect, createCustomerPricing);
router.put("/:id", protect, updateCustomerPricing);
router.patch("/:id/status", protect, updateStatus);
router.delete("/:id", protect, deleteCustomerPricing);

module.exports = router;
