const express = require("express");

const {
  getAllCreditLimits,
  getCreditLimitsByCustomer,
  createCreditLimit,
  updateCreditLimit,
  deleteCreditLimit,
} = require("../controllers/customerCreditLimitController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getAllCreditLimits);
router.get("/customer/:customerId", protect, getCreditLimitsByCustomer);
router.post("/", protect, createCreditLimit);
router.put("/:id", protect, updateCreditLimit);
router.delete("/:id", protect, deleteCreditLimit);

module.exports = router;
