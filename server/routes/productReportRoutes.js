const express = require("express");
const router = express.Router();

const {
  getProductReports,
  getProductReportById,
  getProductReportSummary,
} = require("../controllers/productReportController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProductReports);
router.get("/summary", protect, getProductReportSummary);
router.get("/:id", protect, getProductReportById);

module.exports = router;