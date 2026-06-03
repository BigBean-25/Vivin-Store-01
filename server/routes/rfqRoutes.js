const express = require("express");
const router = express.Router();

const {
  getRfqs,
  getRfqSummary,
  getRfqById,
  createRfq,
  updateRfq,
  updateRfqStatus,
  deleteRfq,
} = require("../controllers/rfqController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getRfqs);
router.get("/summary", protect, getRfqSummary);
router.get("/:id", protect, getRfqById);

router.post("/", protect, createRfq);
router.put("/:id", protect, updateRfq);
router.patch("/:id/status", protect, updateRfqStatus);
router.delete("/:id", protect, deleteRfq);

module.exports = router;
