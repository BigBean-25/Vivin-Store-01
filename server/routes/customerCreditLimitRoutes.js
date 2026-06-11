const express = require("express");

const {
  getSummary,
  getAllCreditLimits,
  getCreditLimitById,
  getCreditLimitsByCustomer,
  createCreditLimit,
  updateCreditLimit,
  updateStatus,
  deleteCreditLimit,
} = require("../controllers/customerCreditLimitController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/", protect, getAllCreditLimits);
router.get("/customer/:customerId", protect, getCreditLimitsByCustomer);
router.get("/:id", protect, getCreditLimitById);
router.post("/", protect, createCreditLimit);
router.put("/:id", protect, updateCreditLimit);
router.patch("/:id/status", protect, updateStatus);
router.delete("/:id", protect, deleteCreditLimit);

module.exports = router;
