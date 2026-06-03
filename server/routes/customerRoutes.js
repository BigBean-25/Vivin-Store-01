const express = require("express");

const {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getCustomers);
router.post("/", protect, createCustomer);
router.get("/:id", protect, getCustomerById);
router.put("/:id", protect, updateCustomer);
router.delete("/:id", protect, deleteCustomer);

module.exports = router;
