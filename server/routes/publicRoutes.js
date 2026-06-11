const express = require("express");
const { getCustomerWebsiteSettings } = require("../controllers/publicController");

const router = express.Router();

router.get("/customer-website-settings", getCustomerWebsiteSettings);

module.exports = router;
