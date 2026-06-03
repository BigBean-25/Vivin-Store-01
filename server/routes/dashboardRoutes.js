const express = require("express");
const { summary } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, summary);

module.exports = router;
