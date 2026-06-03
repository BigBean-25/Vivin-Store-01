const express = require("express");

const {
  getCustomerGroups,
  createCustomerGroup,
  getCustomerGroupById,
  updateCustomerGroup,
  deleteCustomerGroup,
} = require("../controllers/customerGroupController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getCustomerGroups);
router.post("/", protect, createCustomerGroup);
router.get("/:id", protect, getCustomerGroupById);
router.put("/:id", protect, updateCustomerGroup);
router.delete("/:id", protect, deleteCustomerGroup);

module.exports = router;
