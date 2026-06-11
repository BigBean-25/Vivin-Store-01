const express = require("express");
const router = express.Router();

const {
  getVendorContactSummary,
  getVendorContacts,
  getVendorContactById,
  createVendorContact,
  updateVendorContact,
  updateVendorContactStatus,
  deleteVendorContact,
} = require("../controllers/vendorContactController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorContactSummary);
router.get("/", protect, getVendorContacts);
router.post("/", protect, createVendorContact);
router.get("/:id", protect, getVendorContactById);
router.put("/:id", protect, updateVendorContact);
router.patch("/:id/status", protect, updateVendorContactStatus);
router.delete("/:id", protect, deleteVendorContact);

module.exports = router;