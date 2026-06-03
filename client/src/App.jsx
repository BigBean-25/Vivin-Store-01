import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
import ProtectedRoute from "./routes/ProtectedRoute";

import Dashboard from "./pages/super-admin/Dashboard";
import ModulePage from "./pages/super-admin/ModulePage";

import Vendors from "./pages/super-admin/Vendors";
import VendorCategories from "./pages/super-admin/VendorCategories";
import VendorContacts from "./pages/super-admin/VendorContacts";
import VendorAddresses from "./pages/super-admin/VendorAddresses";
import VendorBankAccounts from "./pages/super-admin/VendorBankAccounts";
import VendorDocuments from "./pages/super-admin/VendorDocuments";
import VendorWallets from "./pages/super-admin/VendorWallets";
import VendorTransactions from "./pages/super-admin/VendorTransactions";
import VendorLedgers from "./pages/super-admin/VendorLedgers";
import VendorSettlements from "./pages/super-admin/VendorSettlements";
import ProcurementApprovals from "./pages/super-admin/ProcurementApprovals";
import ProcurementBudgets from "./pages/super-admin/ProcurementBudgets";
import VendorPerformance from "./pages/super-admin/VendorPerformance";
import ProcurementAudit from "./pages/super-admin/ProcurementAudit";
import ProcurementKpiDashboard from "./pages/super-admin/ProcurementKpiDashboard";
import ProcurementForecasting from "./pages/super-admin/ProcurementForecasting";
import ProcurementReorderPlanning from "./pages/super-admin/ProcurementReorderPlanning";
import ProcurementAutoPo from "./pages/super-admin/ProcurementAutoPo";
import ProcurementRequisitions from "./pages/super-admin/ProcurementRequisitions";
import VendorRateContracts from "./pages/super-admin/VendorRateContracts";
import ProcurementDocuments from "./pages/super-admin/ProcurementDocuments";
import ProcurementRequisitionConversion from "./pages/super-admin/ProcurementRequisitionConversion";
import ProcurementRateContractChecks from "./pages/super-admin/ProcurementRateContractChecks";
import ProcurementAlerts from "./pages/super-admin/ProcurementAlerts";
import ProcurementMasterDashboard from "./pages/super-admin/ProcurementMasterDashboard";
import VendorRatings from "./pages/super-admin/VendorRatings";
import VendorReports from "./pages/super-admin/VendorReports";

import Customers from "./pages/super-admin/Customers";

import Products from "./pages/super-admin/Products";
import ProductVariants from "./pages/super-admin/ProductVariants";
import ProductPricing from "./pages/super-admin/ProductPricing";
import ProductReviews from "./pages/super-admin/ProductReviews";
import ProductReports from "./pages/super-admin/ProductReports";

import PurchaseOrders from "./pages/super-admin/PurchaseOrders";
import PurchaseReceipts from "./pages/super-admin/PurchaseReceipts";
import ProcurementPayments from "./pages/super-admin/ProcurementPayments";
import ProcurementReturns from "./pages/super-admin/ProcurementReturns";
import Rfqs from "./pages/super-admin/Rfqs";
import Quotations from "./pages/super-admin/Quotations";
import QuotationComparison from "./pages/super-admin/QuotationComparison";
import ProcurementDashboard from "./pages/super-admin/ProcurementDashboard";
import ProcurementReports from "./pages/super-admin/ProcurementReports";

import Warehouses from "./pages/super-admin/Warehouses";
import WarehouseZones from "./pages/super-admin/WarehouseZones";
import WarehouseRacks from "./pages/super-admin/WarehouseRacks";
import WarehouseBins from "./pages/super-admin/WarehouseBins";
import WarehouseStaff from "./pages/super-admin/WarehouseStaff";
import WarehouseStockReports from "./pages/super-admin/WarehouseStockReports";
import Inventory from "./pages/super-admin/Inventory";
import InventoryBatches from "./pages/super-admin/InventoryBatches";
import InventoryAlerts from "./pages/super-admin/InventoryAlerts";
import InventoryRequests from "./pages/super-admin/InventoryRequests";
import InventoryReports from "./pages/super-admin/InventoryReports";
import StockInward from "./pages/super-admin/StockInward";
import StockOutward from "./pages/super-admin/StockOutward";
import StockAdjustment from "./pages/super-admin/StockAdjustment";

import Categories from "./pages/super-admin/Categories";
import SubCategories from "./pages/super-admin/SubCategories";
import Brands from "./pages/super-admin/Brands";
import Units from "./pages/super-admin/Units";

import CustomerGroups from "./pages/super-admin/CustomerGroups";
import CustomerCreditLimits from "./pages/super-admin/CustomerCreditLimits";
import CustomerWallets from "./pages/super-admin/CustomerWallets";
import CustomerTransactions from "./pages/super-admin/CustomerTransactions";
import CustomerLedgers from "./pages/super-admin/CustomerLedgers";
import CustomerPricing from "./pages/super-admin/CustomerPricing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/super-admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Customer Main Pages */}
        <Route
          path="/super-admin/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/customer-groups"
          element={
            <ProtectedRoute>
              <CustomerGroups />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/customer-credit-limits"
          element={
            <ProtectedRoute>
              <CustomerCreditLimits />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/customer-wallets"
          element={
            <ProtectedRoute>
              <CustomerWallets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/customer-transactions"
          element={
            <ProtectedRoute>
              <CustomerTransactions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/customer-ledgers"
          element={
            <ProtectedRoute>
              <CustomerLedgers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/customer-pricing"
          element={
            <ProtectedRoute>
              <CustomerPricing />
            </ProtectedRoute>
          }
        />

        {/* Product Master Pages */}
        <Route
          path="/super-admin/categories"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/sub-categories"
          element={
            <ProtectedRoute>
              <SubCategories />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/brands"
          element={
            <ProtectedRoute>
              <Brands />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/units"
          element={
            <ProtectedRoute>
              <Units />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/product-variants"
          element={
            <ProtectedRoute>
              <ProductVariants />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/product-pricing"
          element={
            <ProtectedRoute>
              <ProductPricing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/product-reviews"
          element={
            <ProtectedRoute>
              <ProductReviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/product-reports"
          element={
            <ProtectedRoute>
              <ProductReports />
            </ProtectedRoute>
          }
        />

        {/* Vendor */}
        <Route
          path="/super-admin/vendors"
          element={
            <ProtectedRoute>
              <Vendors />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-categories"
          element={
            <ProtectedRoute>
              <VendorCategories />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-contacts"
          element={
            <ProtectedRoute>
              <VendorContacts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-addresses"
          element={
            <ProtectedRoute>
              <VendorAddresses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-bank-accounts"
          element={
            <ProtectedRoute>
              <VendorBankAccounts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-documents"
          element={
            <ProtectedRoute>
              <VendorDocuments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-wallets"
          element={
            <ProtectedRoute>
              <VendorWallets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-transactions"
          element={
            <ProtectedRoute>
              <VendorTransactions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-ledgers"
          element={
            <ProtectedRoute>
              <VendorLedgers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-settlements"
          element={
            <ProtectedRoute>
              <VendorSettlements />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-approvals"
          element={
            <ProtectedRoute>
              <ProcurementApprovals />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-budgets"
          element={
            <ProtectedRoute>
              <ProcurementBudgets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-performance"
          element={
            <ProtectedRoute>
              <VendorPerformance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-audit"
          element={
            <ProtectedRoute>
              <ProcurementAudit />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-kpis"
          element={
            <ProtectedRoute>
              <ProcurementKpiDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-forecasting"
          element={
            <ProtectedRoute>
              <ProcurementForecasting />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-reorder-planning"
          element={
            <ProtectedRoute>
              <ProcurementReorderPlanning />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-auto-po"
          element={
            <ProtectedRoute>
              <ProcurementAutoPo />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-requisitions"
          element={
            <ProtectedRoute>
              <ProcurementRequisitions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-rate-contracts"
          element={
            <ProtectedRoute>
              <VendorRateContracts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-documents"
          element={
            <ProtectedRoute>
              <ProcurementDocuments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-requisition-conversion"
          element={
            <ProtectedRoute>
              <ProcurementRequisitionConversion />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-rate-contract-checks"
          element={
            <ProtectedRoute>
              <ProcurementRateContractChecks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-alerts"
          element={
            <ProtectedRoute>
              <ProcurementAlerts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-master-dashboard"
          element={
            <ProtectedRoute>
              <ProcurementMasterDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-ratings"
          element={
            <ProtectedRoute>
              <VendorRatings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/vendor-reports"
          element={
            <ProtectedRoute>
              <VendorReports />
            </ProtectedRoute>
          }
        />

        {/* Procurement */}
        <Route
          path="/super-admin/procurement-dashboard"
          element={
            <ProtectedRoute>
              <ProcurementDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-reports"
          element={
            <ProtectedRoute>
              <ProcurementReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/rfqs"
          element={
            <ProtectedRoute>
              <Rfqs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/quotations"
          element={
            <ProtectedRoute>
              <Quotations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/quotation-comparison"
          element={
            <ProtectedRoute>
              <QuotationComparison />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/purchase-orders"
          element={
            <ProtectedRoute>
              <PurchaseOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/purchase-receipts"
          element={
            <ProtectedRoute>
              <PurchaseReceipts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-payments"
          element={
            <ProtectedRoute>
              <ProcurementPayments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/procurement-returns"
          element={
            <ProtectedRoute>
              <ProcurementReturns />
            </ProtectedRoute>
          }
        />

        {/* Warehouse */}
        <Route
          path="/super-admin/warehouse"
          element={
            <ProtectedRoute>
              <Warehouses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/warehouses"
          element={
            <ProtectedRoute>
              <Warehouses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/warehouse-zones"
          element={
            <ProtectedRoute>
              <WarehouseZones />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/warehouse-racks"
          element={
            <ProtectedRoute>
              <WarehouseRacks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/warehouse-bins"
          element={
            <ProtectedRoute>
              <WarehouseBins />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/warehouse-staff"
          element={
            <ProtectedRoute>
              <WarehouseStaff />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/warehouse-stock"
          element={
            <ProtectedRoute>
              <WarehouseStockReports />
            </ProtectedRoute>
          }
        />

        {/* Inventory */}
        <Route
          path="/super-admin/inventory"
          element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/inventory-batches"
          element={
            <ProtectedRoute>
              <InventoryBatches />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/inventory-alerts"
          element={
            <ProtectedRoute>
              <InventoryAlerts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/inventory-requests"
          element={
            <ProtectedRoute>
              <InventoryRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/inventory-reports"
          element={
            <ProtectedRoute>
              <InventoryReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/stock-inward"
          element={
            <ProtectedRoute>
              <StockInward />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/stock-outward"
          element={
            <ProtectedRoute>
              <StockOutward />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin/stock-adjustment"
          element={
            <ProtectedRoute>
              <StockAdjustment />
            </ProtectedRoute>
          }
        />

        {/* Generic module route should always stay last */}
        <Route
          path="/super-admin/:module"
          element={
            <ProtectedRoute>
              <ModulePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}