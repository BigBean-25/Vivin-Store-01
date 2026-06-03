const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const brandRoutes = require("./routes/brandRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const subCategoryRoutes = require("./routes/subCategoryRoutes");
const unitRoutes = require("./routes/unitRoutes");

const vendorRoutes = require("./routes/vendorRoutes");
const vendorCategoryRoutes = require("./routes/vendorCategoryRoutes");
const vendorContactRoutes = require("./routes/vendorContactRoutes");
const vendorAddressRoutes = require("./routes/vendorAddressRoutes");
const vendorBankAccountRoutes = require("./routes/vendorBankAccountRoutes");
const vendorDocumentRoutes = require("./routes/vendorDocumentRoutes");
const vendorWalletRoutes = require("./routes/vendorWalletRoutes");
const vendorTransactionRoutes = require("./routes/vendorTransactionRoutes");
const vendorLedgerRoutes = require("./routes/vendorLedgerRoutes");
const vendorRatingRoutes = require("./routes/vendorRatingRoutes");
const vendorReportRoutes = require("./routes/vendorReportRoutes");
const vendorSettlementRoutes = require("./routes/vendorSettlementRoutes");
const vendorPerformanceRoutes = require("./routes/vendorPerformanceRoutes");

const customerRoutes = require("./routes/customerRoutes");
const customerAddressRoutes = require("./routes/customerAddressRoutes");
const customerCreditLimitRoutes = require("./routes/customerCreditLimitRoutes");
const customerGroupRoutes = require("./routes/customerGroupRoutes");
const customerLedgerRoutes = require("./routes/customerLedgerRoutes");
const customerPricingRoutes = require("./routes/customerPricingRoutes");
const customerTransactionRoutes = require("./routes/customerTransactionRoutes");
const customerWalletRoutes = require("./routes/customerWalletRoutes");

const productRoutes = require("./routes/productRoutes");
const productImageRoutes = require("./routes/productImageRoutes");
const productVariantRoutes = require("./routes/productVariantRoutes");
const productPricingRoutes = require("./routes/productPricingRoutes");
const productReviewRoutes = require("./routes/productReviewRoutes");
const productReportRoutes = require("./routes/productReportRoutes");

const warehouseRoutes = require("./routes/warehouseRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const inventoryBatchRoutes = require("./routes/inventoryBatchRoutes");
const inventoryAlertRoutes = require("./routes/inventoryAlertRoutes");
const inventoryRequestRoutes = require("./routes/inventoryRequestRoutes");
const inventoryReportRoutes = require("./routes/inventoryReportRoutes");
const stockInwardRoutes = require("./routes/stockInwardRoutes");
const stockOutwardRoutes = require("./routes/stockOutwardRoutes");
const stockAdjustmentRoutes = require("./routes/stockAdjustmentRoutes");

/* Procurement */
const procurementDashboardRoutes = require("./routes/procurementDashboardRoutes");
const procurementReportRoutes = require("./routes/procurementReportRoutes");
const procurementApprovalRoutes = require("./routes/procurementApprovalRoutes");
const procurementBudgetRoutes = require("./routes/procurementBudgetRoutes");
const procurementAuditRoutes = require("./routes/procurementAuditRoutes");
const procurementKpiRoutes = require("./routes/procurementKpiRoutes");
const procurementForecastRoutes = require("./routes/procurementForecastRoutes");
const procurementReorderRoutes = require("./routes/procurementReorderRoutes");
const procurementAutoPoRoutes = require("./routes/procurementAutoPoRoutes");
const procurementRequisitionRoutes = require("./routes/procurementRequisitionRoutes");
const vendorRateContractRoutes = require("./routes/vendorRateContractRoutes");
const procurementDocumentRoutes = require("./routes/procurementDocumentRoutes");
const procurementRequisitionConversionRoutes = require("./routes/procurementRequisitionConversionRoutes");
const procurementRateContractCheckRoutes = require("./routes/procurementRateContractCheckRoutes");
const procurementAlertRoutes = require("./routes/procurementAlertRoutes");
const procurementMasterDashboardRoutes = require("./routes/procurementMasterDashboardRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const goodsReceiptRoutes = require("./routes/goodsReceiptRoutes");
const procurementPaymentRoutes = require("./routes/procurementPaymentRoutes");
const procurementReturnRoutes = require("./routes/procurementReturnRoutes");
const rfqRoutes = require("./routes/rfqRoutes");
const quotationRoutes = require("./routes/quotationRoutes");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Vivin Store API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend health check success",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS database_name");

    res.json({
      success: true,
      message: "Database connected successfully",
      database: rows[0].database_name,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

/* Auth & Dashboard */
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

/* Vendor */
app.use("/api/vendors", vendorRoutes);
app.use("/api/vendor-categories", vendorCategoryRoutes);
app.use("/api/vendor-contacts", vendorContactRoutes);
app.use("/api/vendor-addresses", vendorAddressRoutes);
app.use("/api/vendor-bank-accounts", vendorBankAccountRoutes);
app.use("/api/vendor-documents", vendorDocumentRoutes);
app.use("/api/vendor-wallets", vendorWalletRoutes);
app.use("/api/vendor-transactions", vendorTransactionRoutes);
app.use("/api/vendor-ledgers", vendorLedgerRoutes);
app.use("/api/vendor-settlements", vendorSettlementRoutes);
app.use("/api/vendor-performance", vendorPerformanceRoutes);
app.use("/api/vendor-ratings", vendorRatingRoutes);
app.use("/api/vendor-reports", vendorReportRoutes);

/* Customer */
app.use("/api/customers", customerRoutes);
app.use("/api/customer-addresses", customerAddressRoutes);
app.use("/api/customer-groups", customerGroupRoutes);
app.use("/api/customer-pricing", customerPricingRoutes);
app.use("/api/customer-credit-limits", customerCreditLimitRoutes);
app.use("/api/customer-wallets", customerWalletRoutes);
app.use("/api/customer-transactions", customerTransactionRoutes);
app.use("/api/customer-ledgers", customerLedgerRoutes);

/* Product Master */
app.use("/api/categories", categoryRoutes);
app.use("/api/sub-categories", subCategoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-images", productImageRoutes);
app.use("/api/product-variants", productVariantRoutes);
app.use("/api/product-pricing", productPricingRoutes);
app.use("/api/product-reviews", productReviewRoutes);
app.use("/api/product-reports", productReportRoutes);

/* Procurement */
app.use("/api/procurement-dashboard", procurementDashboardRoutes);
app.use("/api/procurement-reports", procurementReportRoutes);
app.use("/api/procurement-approvals", procurementApprovalRoutes);
app.use("/api/procurement-budgets", procurementBudgetRoutes);
app.use("/api/procurement-audit", procurementAuditRoutes);
app.use("/api/procurement-kpis", procurementKpiRoutes);
app.use("/api/procurement-forecasts", procurementForecastRoutes);
app.use("/api/procurement-reorder-plans", procurementReorderRoutes);
app.use("/api/procurement-auto-po", procurementAutoPoRoutes);
app.use("/api/procurement-requisitions", procurementRequisitionRoutes);
app.use("/api/vendor-rate-contracts", vendorRateContractRoutes);
app.use("/api/procurement-documents", procurementDocumentRoutes);
app.use("/api/procurement-requisition-conversions", procurementRequisitionConversionRoutes);
app.use("/api/procurement-rate-contract-checks", procurementRateContractCheckRoutes);
app.use("/api/procurement-alerts", procurementAlertRoutes);

// Test route to verify app.js is loaded
app.get("/api/test-route", (req, res) => {
  res.json({ success: true, message: "App.js is loaded correctly" });
});

app.use("/api/procurement-master-dashboard", procurementMasterDashboardRoutes);
app.use("/api/rfqs", rfqRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/goods-receipts", goodsReceiptRoutes);
app.use("/api/procurement-payments", procurementPaymentRoutes);
app.use("/api/procurement-returns", procurementReturnRoutes);

/* Warehouse & Inventory */
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory-batches", inventoryBatchRoutes);
app.use("/api/inventory-alerts", inventoryAlertRoutes);
app.use("/api/inventory-requests", inventoryRequestRoutes);
app.use("/api/inventory-reports", inventoryReportRoutes);
app.use("/api/stock-inward", stockInwardRoutes);
app.use("/api/stock-outward", stockOutwardRoutes);
app.use("/api/stock-adjustment", stockAdjustmentRoutes);

module.exports = app;