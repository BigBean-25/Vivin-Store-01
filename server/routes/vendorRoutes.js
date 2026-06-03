const express = require("express");
const {
  createVendor,
  deleteVendor,
  getVendorById,
  getVendors,
  updateVendor,
} = require("../controllers/vendorController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getVendors).post(createVendor);
router.route("/:id").get(getVendorById).put(updateVendor).delete(deleteVendor);

module.exports = router;
