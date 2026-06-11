const express = require("express");

const {
  getSummary,
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  updateStatus,
  deleteCustomer,
} = require("../controllers/customerController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/", protect, getCustomers);
router.post("/", protect, createCustomer);
router.get("/:id", protect, getCustomerById);
router.put("/:id", protect, updateCustomer);
router.patch("/:id/status", protect, updateStatus);
router.delete("/:id", protect, deleteCustomer);

module.exports = router;
