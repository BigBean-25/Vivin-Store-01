const express = require("express");
const router = express.Router();

const {
  generateProcurementForecast,
  saveProcurementForecast,
  getProcurementForecasts,
  getProcurementForecastById,
  deleteProcurementForecast,
} = require("../controllers/procurementForecastController");

const { protect } = require("../middleware/authMiddleware");

router.get("/generate", protect, generateProcurementForecast);
router.post("/save", protect, saveProcurementForecast);

router.get("/", protect, getProcurementForecasts);
router.get("/:id", protect, getProcurementForecastById);
router.delete("/:id", protect, deleteProcurementForecast);

module.exports = router;
