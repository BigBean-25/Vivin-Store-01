const express = require("express");
const router = express.Router();

const {
  getInventoryAlerts,
  getInventoryAlertSummary,
  getInventoryAlertById,
  createInventoryAlert,
  updateInventoryAlert,
  closeInventoryAlert,
  reopenInventoryAlert,
  deleteInventoryAlert,
  generateInventoryAlerts,
} = require("../controllers/inventoryAlertController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getInventoryAlerts);
router.get("/summary", protect, getInventoryAlertSummary);
router.post("/generate", protect, generateInventoryAlerts);
router.post("/", protect, createInventoryAlert);
router.get("/:id", protect, getInventoryAlertById);
router.put("/:id", protect, updateInventoryAlert);
router.patch("/:id/close", protect, closeInventoryAlert);
router.patch("/:id/reopen", protect, reopenInventoryAlert);
router.delete("/:id", protect, deleteInventoryAlert);

module.exports = router;