const app = require("./app");
require("dotenv").config();

// Add missing routes directly to ensure they're loaded
const procurementDocumentRoutes = require("./routes/procurementDocumentRoutes");
const procurementRequisitionConversionRoutes = require("./routes/procurementRequisitionConversionRoutes");
const procurementRateContractCheckRoutes = require("./routes/procurementRateContractCheckRoutes");
const procurementAlertRoutes = require("./routes/procurementAlertRoutes");
const procurementMasterDashboardRoutes = require("./routes/procurementMasterDashboardRoutes");
const procurementForecastRoutes = require("./routes/procurementForecastRoutes");
const procurementReorderRoutes = require("./routes/procurementReorderRoutes");
const procurementAutoPoRoutes = require("./routes/procurementAutoPoRoutes");
const procurementDashboardRoutes = require("./routes/procurementDashboardRoutes");
const procurementReportRoutes = require("./routes/procurementReportRoutes");
const procurementApprovalRoutes = require("./routes/procurementApprovalRoutes");
const procurementBudgetRoutes = require("./routes/procurementBudgetRoutes");
const procurementAuditRoutes = require("./routes/procurementAuditRoutes");
const procurementKpiRoutes = require("./routes/procurementKpiRoutes");
const procurementRequisitionRoutes = require("./routes/procurementRequisitionRoutes");
const vendorRateContractRoutes = require("./routes/vendorRateContractRoutes");
const rfqRoutes = require("./routes/rfqRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const goodsReceiptRoutes = require("./routes/goodsReceiptRoutes");
const procurementPaymentRoutes = require("./routes/procurementPaymentRoutes");
const procurementReturnRoutes = require("./routes/procurementReturnRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const warehouseZoneRoutes = require("./routes/warehouseZoneRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const inventoryBatchRoutes = require("./routes/inventoryBatchRoutes");
const inventoryAlertRoutes = require("./routes/inventoryAlertRoutes");
const inventoryReportRoutes = require("./routes/inventoryReportRoutes");
const inventoryRequestRoutes = require("./routes/inventoryRequestRoutes");
const stockInwardRoutes = require("./routes/stockInwardRoutes");
const stockOutwardRoutes = require("./routes/stockOutwardRoutes");
const stockAdjustmentRoutes = require("./routes/stockAdjustmentRoutes");

app.use("/api/warehouses", warehouseRoutes);
app.use("/api/warehouse-zones", warehouseZoneRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory-batches", inventoryBatchRoutes);
app.use("/api/inventory-alerts", inventoryAlertRoutes);
app.use("/api/inventory-reports", inventoryReportRoutes);
app.use("/api/inventory-requests", inventoryRequestRoutes);
app.use("/api/stock-inward", stockInwardRoutes);
app.use("/api/stock-outward", stockOutwardRoutes);
app.use("/api/stock-adjustment", stockAdjustmentRoutes);

app.use("/api/procurement-documents", procurementDocumentRoutes);
app.use("/api/procurement-requisition-conversions", procurementRequisitionConversionRoutes);
app.use("/api/procurement-rate-contract-checks", procurementRateContractCheckRoutes);
app.use("/api/procurement-alerts", procurementAlertRoutes);
app.use("/api/procurement-master-dashboard", procurementMasterDashboardRoutes);
app.use("/api/procurement-forecasts", procurementForecastRoutes);
app.use("/api/procurement-reorder-plans", procurementReorderRoutes);
app.use("/api/procurement-auto-po", procurementAutoPoRoutes);
app.use("/api/procurement-dashboard", procurementDashboardRoutes);
app.use("/api/procurement-reports", procurementReportRoutes);
app.use("/api/procurement-approvals", procurementApprovalRoutes);
app.use("/api/procurement-budgets", procurementBudgetRoutes);
app.use("/api/procurement-audit", procurementAuditRoutes);
app.use("/api/procurement-kpis", procurementKpiRoutes);
app.use("/api/procurement-requisitions", procurementRequisitionRoutes);
app.use("/api/vendor-rate-contracts", vendorRateContractRoutes);
app.use("/api/rfqs", rfqRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/goods-receipts", goodsReceiptRoutes);
app.use("/api/procurement-payments", procurementPaymentRoutes);
app.use("/api/procurement-returns", procurementReturnRoutes);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Vivin Store server running on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server error:", error.message);
});