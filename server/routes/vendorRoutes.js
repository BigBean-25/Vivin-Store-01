const express = require("express");
const {
  getVendorSummary,
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
} = require("../controllers/vendorController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/summary", getVendorSummary);
router.route("/").get(getVendors).post(createVendor);
router.route("/:id").get(getVendorById).put(updateVendor).delete(deleteVendor);
router.patch("/:id/status", updateVendorStatus);

module.exports = router;
