const express = require("express");
const router = express.Router();

const {
  getRequisitionConversionSummary,
  getRequisitionConversionHistory,
  previewRequisitionConversion,
  convertRequisitionToRfq,
  convertRequisitionToPo,
} = require("../controllers/procurementRequisitionConversionController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getRequisitionConversionSummary);
router.get("/history", protect, getRequisitionConversionHistory);
router.get("/preview", protect, previewRequisitionConversion);

router.post("/:id/to-rfq", protect, convertRequisitionToRfq);
router.post("/:id/to-po", protect, convertRequisitionToPo);

module.exports = router;
