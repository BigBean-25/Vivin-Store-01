const express = require("express");
const {
  getSummary, getKPIs, getDashboard,
  getSalesSummary, getSales, getSalesMonthly, getTopProducts, getPaymentMethods,
  getProcurementSummary, getProcurement, getProcurementVendorPerformance, getProcurementPayments,
  getInventorySummary, getInventory, getLowStock, getWarehouseStock,
  getVendorSummary, getVendors, getVendorPayments, getVendorOutstanding,
  getCustomerSummary, getCustomers, getTopCustomers, getCustomerOutstanding,
  getWarehouseSummary, getWarehouseList, getWarehouseMovements,
  getDeliverySummary, getDeliveryList, getDeliveryDrivers,
  getFinanceSummary, getFinancePL,
  getTaxSummary, getTaxTransactions,
} = require("../controllers/reportsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* ── Dashboard KPI ── */
router.get("/summary",   protect, getSummary);
router.get("/kpis",      protect, getKPIs);
router.get("/dashboard", protect, getDashboard);

/* ── Sales (named sub-routes before /sales itself) ── */
router.get("/sales/summary",         protect, getSalesSummary);
router.get("/sales/monthly",         protect, getSalesMonthly);
router.get("/sales/top-products",    protect, getTopProducts);
router.get("/sales/payment-methods", protect, getPaymentMethods);
router.get("/sales",                 protect, getSales);

/* ── Procurement ── */
router.get("/procurement/summary",            protect, getProcurementSummary);
router.get("/procurement/vendor-performance", protect, getProcurementVendorPerformance);
router.get("/procurement/payments",           protect, getProcurementPayments);
router.get("/procurement",                    protect, getProcurement);

/* ── Inventory ── */
router.get("/inventory/summary",         protect, getInventorySummary);
router.get("/inventory/low-stock",       protect, getLowStock);
router.get("/inventory/warehouse-stock", protect, getWarehouseStock);
router.get("/inventory/stock-value",     protect, getInventorySummary);
router.get("/inventory",                 protect, getInventory);

/* ── Vendors ── */
router.get("/vendors/summary",     protect, getVendorSummary);
router.get("/vendors/performance", protect, getProcurementVendorPerformance);
router.get("/vendors/payments",    protect, getVendorPayments);
router.get("/vendors/outstanding", protect, getVendorOutstanding);
router.get("/vendors",             protect, getVendors);

/* ── Customers ── */
router.get("/customers/summary",      protect, getCustomerSummary);
router.get("/customers/outstanding",  protect, getCustomerOutstanding);
router.get("/customers/top-customers",protect, getTopCustomers);
router.get("/customers",              protect, getCustomers);

/* ── Warehouses ── */
router.get("/warehouses/summary",    protect, getWarehouseSummary);
router.get("/warehouses/movements",  protect, getWarehouseMovements);
router.get("/warehouses/stock",      protect, getWarehouseList);
router.get("/warehouses/performance",protect, getWarehouseList);
router.get("/warehouses",            protect, getWarehouseList);

/* ── Delivery ── */
router.get("/delivery/summary",     protect, getDeliverySummary);
router.get("/delivery/drivers",     protect, getDeliveryDrivers);
router.get("/delivery/performance", protect, getDeliveryDrivers);
router.get("/delivery/status",      protect, getDeliverySummary);
router.get("/delivery",             protect, getDeliveryList);

/* ── Finance ── */
router.get("/finance/summary",     protect, getFinanceSummary);
router.get("/finance/profit-loss", protect, getFinancePL);
router.get("/finance/payments",    protect, getFinanceSummary);
router.get("/finance/outstanding", protect, getFinanceSummary);
router.get("/finance",             protect, getFinancePL);

/* ── Tax / GST ── */
router.get("/tax/summary",      protect, getTaxSummary);
router.get("/tax/gst",          protect, getTaxTransactions);
router.get("/tax/transactions", protect, getTaxTransactions);
router.get("/tax/gstr1",        protect, getTaxSummary);
router.get("/tax/gstr2b",       protect, getTaxSummary);
router.get("/tax/gstr3b",       protect, getTaxSummary);

module.exports = router;
