const express = require("express");
const router = express.Router();

const {
  getVendorContacts,
  getVendorContactById,
  createVendorContact,
  updateVendorContact,
  deleteVendorContact,
} = require("../controllers/vendorContactController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getVendorContacts);
router.post("/", protect, createVendorContact);
router.get("/:id", protect, getVendorContactById);
router.put("/:id", protect, updateVendorContact);
router.delete("/:id", protect, deleteVendorContact);

module.exports = router;