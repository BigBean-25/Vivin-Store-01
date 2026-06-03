const express = require("express");

const {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
} = require("../controllers/customerAddressController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:customerId", protect, getCustomerAddresses);
router.post("/:customerId", protect, createCustomerAddress);
router.put("/address/:addressId", protect, updateCustomerAddress);
router.delete("/address/:addressId", protect, deleteCustomerAddress);

module.exports = router;
