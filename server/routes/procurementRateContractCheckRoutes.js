const express = require("express");
const router = express.Router();

const {
  getRateContractCheckSummary,
  getRateContractChecks,
  getRateContractChecksByPo,
  checkPurchaseOrderRateContract,
  deleteRateContractCheck,
} = require("../controllers/procurementRateContractCheckController");

const { protect } = require("../middleware/authMiddleware");

router.get("/summary", protect, getRateContractCheckSummary);

router.post(
  "/check-po/:purchase_order_id",
  protect,
  checkPurchaseOrderRateContract
);

router.get("/po/:purchase_order_id", protect, getRateContractChecksByPo);

router.get("/", protect, getRateContractChecks);
router.delete("/:id", protect, deleteRateContractCheck);

module.exports = router;
