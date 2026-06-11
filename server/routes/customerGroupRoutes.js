const express = require("express");

const {
  getSummary,
  getCustomerGroups,
  createCustomerGroup,
  getCustomerGroupById,
  updateCustomerGroup,
  updateStatus,
  deleteCustomerGroup,
} = require("../controllers/customerGroupController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/", protect, getCustomerGroups);
router.post("/", protect, createCustomerGroup);
router.get("/:id", protect, getCustomerGroupById);
router.put("/:id", protect, updateCustomerGroup);
router.patch("/:id/status", protect, updateStatus);
router.delete("/:id", protect, deleteCustomerGroup);

module.exports = router;
