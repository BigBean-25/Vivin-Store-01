const express = require("express");
const router = express.Router();

const {
  getVendorRateContractSummary,
  getVendorRateContracts,
  getVendorRateContractById,
  createVendorRateContract,
  updateVendorRateContract,
  approveVendorRateContract,
  closeVendorRateContract,
  deleteVendorRateContract,
  getActiveVendorRate,
} = require("../controllers/vendorRateContractController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getVendorRateContractSummary);
router.get("/active-rate", protect, getActiveVendorRate);

router.post("/:id/approve", protect, approveVendorRateContract);
router.post("/:id/close", protect, closeVendorRateContract);

router.get("/", protect, getVendorRateContracts);
router.post("/", protect, createVendorRateContract);

router.get("/:id", protect, getVendorRateContractById);
router.put("/:id", protect, updateVendorRateContract);
router.delete("/:id", protect, deleteVendorRateContract);

module.exports = router;
