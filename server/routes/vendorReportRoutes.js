const express = require("express");
const router = express.Router();

const { getVendorReports } = require("../controllers/vendorReportController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorReports);

module.exports = router;