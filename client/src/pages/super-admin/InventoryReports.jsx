import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const reportTabs = [
  { key: "saved", label: "Saved Reports" },
  { key: "live", label: "Live Stock" },
  { key: "low", label: "Low Stock" },
  { key: "expiry", label: "Expiry Report" },
  { key: "movements", label: "Stock Movements" },
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatQty = (value) => Number(value || 0).toFixed(3);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const downloadExcel = ({ fileName, sheetName, rows }) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

const downloadPdf = ({ title, fileName, columns, rows }) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  doc.setFontSize(18);
  doc.text(title, 40, 40);

  doc.setFontSize(9);
  doc.text(`Generated on: ${formatDateTime(new Date())}`, 40, 58);

  autoTable(doc, {
    startY: 76,
    head: [columns],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [17, 17, 17],
      textColor: [250, 204, 21],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${fileName}.pdf`);
};

export default function InventoryReports() {
  const [activeTab, setActiveTab] = useState("saved");

  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState({});

  const [savedReports, setSavedReports] = useState([]);
  const [liveStock, setLiveStock] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiryItems, setExpiryItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [movementSummary, setMovementSummary] = useState({});

  const [viewReport, setViewReport] = useState(null);

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expiryStatus, setExpiryStatus] = useState("");
  const [movementType, setMovementType] = useState("");
  const [reportDate, setReportDate] = useState(today);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2800);
  };

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/api/warehouses");

      if (res.data.success) {
        setWarehouses(res.data.data || res.data.warehouses || []);
      }
    } catch {
      setWarehouses([]);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();

      if (warehouseFilter) params.append("warehouse_id", warehouseFilter);

      const res = await API.get(`/api/inventory-reports/summary?${params.toString()}`);

      if (res.data.success) {
        setSummary(res.data.summary || {});
      }
    } catch {
      setSummary({});
    }
  };

  const fetchSavedReports = async () => {
    const params = new URLSearchParams();

    if (warehouseFilter) params.append("warehouse_id", warehouseFilter);
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);
    if (search.trim()) params.append("search", search.trim());

    const res = await API.get(`/api/inventory-reports?${params.toString()}`);

    if (res.data.success) {
      setSavedReports(res.data.reports || []);
    }
  };

  const fetchLiveStock = async () => {
    const params = new URLSearchParams();

    if (warehouseFilter) params.append("warehouse_id", warehouseFilter);
    if (search.trim()) params.append("search", search.trim());

    const res = await API.get(`/api/inventory-reports/live-stock?${params.toString()}`);

    if (res.data.success) {
      setLiveStock(res.data.stock || []);
    }
  };

  const fetchLowStock = async () => {
    const params = new URLSearchParams();

    if (warehouseFilter) params.append("warehouse_id", warehouseFilter);

    const res = await API.get(`/api/inventory-reports/low-stock?${params.toString()}`);

    if (res.data.success) {
      setLowStock(res.data.items || []);
    }
  };

  const fetchExpiryReport = async () => {
    const params = new URLSearchParams();

    if (warehouseFilter) params.append("warehouse_id", warehouseFilter);
    if (expiryStatus) params.append("expiry_status", expiryStatus);
    params.append("days", "30");

    const res = await API.get(`/api/inventory-reports/expiry?${params.toString()}`);

    if (res.data.success) {
      setExpiryItems(res.data.items || []);
    }
  };

  const fetchMovementReport = async () => {
    const params = new URLSearchParams();

    if (warehouseFilter) params.append("warehouse_id", warehouseFilter);
    if (movementType) params.append("movement_type", movementType);
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);

    const res = await API.get(`/api/inventory-reports/movements?${params.toString()}`);

    if (res.data.success) {
      setMovements(res.data.movements || []);
      setMovementSummary(res.data.summary || {});
    }
  };

  const fetchActiveReport = async () => {
    try {
      setLoading(true);
      setError("");

      await fetchSummary();

      if (activeTab === "saved") await fetchSavedReports();
      if (activeTab === "live") await fetchLiveStock();
      if (activeTab === "low") await fetchLowStock();
      if (activeTab === "expiry") await fetchExpiryReport();
      if (activeTab === "movements") await fetchMovementReport();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch inventory report");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchWarehouses(), fetchActiveReport()]);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActiveReport();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    activeTab,
    warehouseFilter,
    search,
    fromDate,
    toDate,
    expiryStatus,
    movementType,
  ]);

  const stats = useMemo(() => {
    return {
      products: summary.total_products || 0,
      warehouses: summary.total_warehouses || 0,
      availableQty: summary.total_available_qty || 0,
      reservedQty: summary.total_reserved_qty || 0,
      damagedQty: summary.total_damaged_qty || 0,
      stockValue: summary.total_stock_value || 0,
      lowStock: summary.low_stock_count || 0,
      expired: summary.expired_count || 0,
      nearExpiry: summary.near_expiry_count || 0,
    };
  }, [summary]);

  const handleGenerateReport = async () => {
    const confirmGenerate = window.confirm("Generate new inventory report?");

    if (!confirmGenerate) return;

    try {
      setGenerating(true);
      setError("");

      await API.post("/api/inventory-reports/generate", {
        report_date: reportDate,
        warehouse_id: warehouseFilter || null,
      });

      showSuccess("Inventory report generated successfully");
      setActiveTab("saved");
      fetchActiveReport();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate inventory report");
    } finally {
      setGenerating(false);
    }
  };

  const handleViewReport = async (report) => {
    try {
      setError("");

      const res = await API.get(`/api/inventory-reports/${report.id}`);

      if (res.data.success) {
        setViewReport(res.data.report);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to view report");
    }
  };

  const handleDeleteReport = async (report) => {
    const confirmDelete = window.confirm(`Delete report #${report.id}?`);

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/inventory-reports/${report.id}`);
      showSuccess("Inventory report deleted successfully");
      fetchActiveReport();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete report");
    }
  };

  const getExportData = () => {
    if (activeTab === "saved") {
      const rows = savedReports.map((item) => ({
        "Report ID": item.id,
        "Report Date": formatDate(item.report_date),
        Warehouse: item.warehouse_name || "All Warehouses",
        "Warehouse Code": item.warehouse_code || "-",
        "Stock Value": Number(item.total_stock_value || 0),
        "Low Stock Count": item.low_stock_count || 0,
        "Expiry Count": item.expiry_count || 0,
        "Created At": formatDateTime(item.created_at),
      }));

      return {
        title: "Inventory Saved Reports",
        fileName: "inventory_saved_reports",
        sheetName: "Saved Reports",
        columns: Object.keys(rows[0] || {
          "Report ID": "",
          "Report Date": "",
          Warehouse: "",
          "Warehouse Code": "",
          "Stock Value": "",
          "Low Stock Count": "",
          "Expiry Count": "",
          "Created At": "",
        }),
        rows,
      };
    }

    if (activeTab === "live") {
      const rows = liveStock.map((item) => ({
        Warehouse: item.warehouse_name || "-",
        "Warehouse Code": item.warehouse_code || "-",
        Product: item.product_name || "-",
        SKU: item.sku || item.product_code || "-",
        Unit: item.unit_name || "-",
        "Available Qty": Number(item.available_qty || 0),
        "Reserved Qty": Number(item.reserved_qty || 0),
        "Damaged Qty": Number(item.damaged_qty || 0),
        "Average Cost": Number(item.average_cost || 0),
        "Stock Value": Number(item.stock_value || 0),
        "Min Stock": Number(item.min_stock_level || 0),
        "Reorder Level": Number(item.reorder_level || 0),
        Status: item.stock_status || "-",
      }));

      return {
        title: "Inventory Live Stock Report",
        fileName: "inventory_live_stock_report",
        sheetName: "Live Stock",
        columns: Object.keys(rows[0] || {
          Warehouse: "",
          "Warehouse Code": "",
          Product: "",
          SKU: "",
          Unit: "",
          "Available Qty": "",
          "Reserved Qty": "",
          "Damaged Qty": "",
          "Average Cost": "",
          "Stock Value": "",
          "Min Stock": "",
          "Reorder Level": "",
          Status: "",
        }),
        rows,
      };
    }

    if (activeTab === "low") {
      const rows = lowStock.map((item) => ({
        Warehouse: item.warehouse_name || "-",
        Product: item.product_name || "-",
        SKU: item.sku || item.product_code || "-",
        Unit: item.unit_name || "-",
        "Available Qty": Number(item.available_qty || 0),
        "Alert Level": Number(item.alert_level || 0),
        "Min Stock": Number(item.min_stock_level || 0),
        "Reorder Level": Number(item.reorder_level || 0),
        "Stock Value": Number(item.stock_value || 0),
      }));

      return {
        title: "Inventory Low Stock Report",
        fileName: "inventory_low_stock_report",
        sheetName: "Low Stock",
        columns: Object.keys(rows[0] || {
          Warehouse: "",
          Product: "",
          SKU: "",
          Unit: "",
          "Available Qty": "",
          "Alert Level": "",
          "Min Stock": "",
          "Reorder Level": "",
          "Stock Value": "",
        }),
        rows,
      };
    }

    if (activeTab === "expiry") {
      const rows = expiryItems.map((item) => ({
        Warehouse: item.warehouse_name || "-",
        Product: item.product_name || "-",
        SKU: item.sku || item.product_code || "-",
        "Batch No": item.batch_no || "-",
        Qty: Number(item.quantity || 0),
        "Cost Price": Number(item.cost_price || 0),
        "Stock Value": Number(item.stock_value || 0),
        "Expiry Date": formatDate(item.expiry_date),
        "Days To Expiry": item.days_to_expiry,
        "Expiry Status": item.expiry_status || "-",
        "Batch Status": item.batch_status || "-",
      }));

      return {
        title: "Inventory Expiry Report",
        fileName: "inventory_expiry_report",
        sheetName: "Expiry",
        columns: Object.keys(rows[0] || {
          Warehouse: "",
          Product: "",
          SKU: "",
          "Batch No": "",
          Qty: "",
          "Cost Price": "",
          "Stock Value": "",
          "Expiry Date": "",
          "Days To Expiry": "",
          "Expiry Status": "",
          "Batch Status": "",
        }),
        rows,
      };
    }

    const rows = movements.map((item) => ({
      "Movement ID": item.id,
      Warehouse: item.warehouse_name || "-",
      Product: item.product_name || "-",
      SKU: item.sku || item.product_code || "-",
      Batch: item.batch_no || "-",
      Type: item.movement_type || "-",
      Quantity: Number(item.quantity || 0),
      Reference: item.reference_type || "-",
      "Reference ID": item.reference_id || "-",
      "Balance After": Number(item.balance_after || 0),
      "Created At": formatDateTime(item.created_at),
    }));

    return {
      title: "Inventory Stock Movement Report",
      fileName: "inventory_stock_movement_report",
      sheetName: "Movements",
      columns: Object.keys(rows[0] || {
        "Movement ID": "",
        Warehouse: "",
        Product: "",
        SKU: "",
        Batch: "",
        Type: "",
        Quantity: "",
        Reference: "",
        "Reference ID": "",
        "Balance After": "",
        "Created At": "",
      }),
      rows,
    };
  };

  const handleExcelExport = () => {
    const exportData = getExportData();

    if (!exportData.rows.length) {
      setError("No records available to export");
      return;
    }

    downloadExcel(exportData);
  };

  const handlePdfExport = () => {
    const exportData = getExportData();

    if (!exportData.rows.length) {
      setError("No records available to export");
      return;
    }

    const pdfRows = exportData.rows.map((row) =>
      exportData.columns.map((column) => String(row[column] ?? "-"))
    );

    downloadPdf({
      title: exportData.title,
      fileName: exportData.fileName,
      columns: exportData.columns,
      rows: pdfRows,
    });
  };

  return (
    <AdminLayout>
      <div className="inventory-report-page">
        <style>{css}</style>

        <div className="report-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <BarChart3 size={30} />
            </div>

            <div>
              <div className="eyebrow">Inventory Analytics</div>
              <h1>Inventory Reports</h1>
              <p>
                View live stock value, low stock, expiry, movement reports and
                export reports as PDF or Excel.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={refreshAll}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="excel-btn" onClick={handleExcelExport}>
              <FileSpreadsheet size={17} />
              Excel
            </button>

            <button type="button" className="pdf-btn" onClick={handlePdfExport}>
              <FileText size={17} />
              PDF
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={handleGenerateReport}
              disabled={generating}
            >
              {generating ? <Loader2 size={17} className="spin" /> : <Download size={17} />}
              Generate
            </button>
          </div>
        </div>

        {success && (
          <div className="success-box">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
            <button type="button" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}

        <div className="stats-grid">
          <StatCard title="Products" value={stats.products} />
          <StatCard title="Warehouses" value={stats.warehouses} />
          <StatCard title="Available Qty" value={formatQty(stats.availableQty)} />
          <StatCard title="Reserved Qty" value={formatQty(stats.reservedQty)} />
          <StatCard title="Damaged Qty" value={formatQty(stats.damagedQty)} />
          <StatCard title="Stock Value" value={formatMoney(stats.stockValue)} />
          <StatCard title="Low Stock" value={stats.lowStock} />
          <StatCard title="Expired" value={stats.expired} />
          <StatCard title="Near Expiry" value={stats.nearExpiry} />
        </div>

        {viewReport && (
          <div className="view-card">
            <div className="view-head">
              <div>
                <h2>Report #{viewReport.id}</h2>
                <p>
                  {formatDate(viewReport.report_date)} ·{" "}
                  {viewReport.warehouse_name || "All Warehouses"}
                </p>
              </div>

              <button type="button" className="close-btn" onClick={() => setViewReport(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <Detail title="Warehouse" value={viewReport.warehouse_name || "All Warehouses"} />
              <Detail title="Report Date" value={formatDate(viewReport.report_date)} />
              <Detail title="Stock Value" value={formatMoney(viewReport.total_stock_value)} />
              <Detail title="Low Stock Count" value={viewReport.low_stock_count} />
              <Detail title="Expiry Count" value={viewReport.expiry_count} />
              <Detail title="Created At" value={formatDateTime(viewReport.created_at)} />
            </div>
          </div>
        )}

        <div className="tabs-card">
          <div className="tabs">
            {reportTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => {
                  setActiveTab(tab.key);
                  setViewReport(null);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, warehouse, SKU, report..."
            />
          </div>

          <select
            className="filter-select"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          {(activeTab === "saved" || activeTab === "movements") && (
            <>
              <input
                className="date-input"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />

              <input
                className="date-input"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </>
          )}

          {activeTab === "expiry" && (
            <select
              className="filter-select"
              value={expiryStatus}
              onChange={(e) => setExpiryStatus(e.target.value)}
            >
              <option value="">All Expiry</option>
              <option value="expired">Expired</option>
              <option value="near_expiry">Near Expiry</option>
              <option value="normal">Normal</option>
            </select>
          )}

          {activeTab === "movements" && (
            <select
              className="filter-select"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              <option value="">All Movements</option>
              <option value="in">In</option>
              <option value="out">Out</option>
              <option value="adjustment">Adjustment</option>
              <option value="damage">Damage</option>
              <option value="transfer">Transfer</option>
            </select>
          )}

          <input
            className="date-input"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            title="Generate report date"
          />
        </div>

        {activeTab === "movements" && (
          <div className="movement-summary">
            <MiniStat title="Total Movements" value={movementSummary.total_movements || 0} />
            <MiniStat title="In Qty" value={formatQty(movementSummary.total_in_qty)} />
            <MiniStat title="Out Qty" value={formatQty(movementSummary.total_out_qty)} />
            <MiniStat title="Adjustment Qty" value={formatQty(movementSummary.total_adjustment_qty)} />
            <MiniStat title="Damage Qty" value={formatQty(movementSummary.total_damage_qty)} />
            <MiniStat title="Transfer Qty" value={formatQty(movementSummary.total_transfer_qty)} />
          </div>
        )}

        <div className="table-card">
          <div className="table-header">
            <h2>{reportTabs.find((tab) => tab.key === activeTab)?.label}</h2>
            <p>Export current filtered report as PDF or Excel.</p>
          </div>

          {loading ? (
            <EmptyState loading title="Loading inventory report..." />
          ) : (
            <>
              {activeTab === "saved" && (
                <SavedReportsTable
                  rows={savedReports}
                  onView={handleViewReport}
                  onDelete={handleDeleteReport}
                />
              )}

              {activeTab === "live" && <LiveStockTable rows={liveStock} />}
              {activeTab === "low" && <LowStockTable rows={lowStock} />}
              {activeTab === "expiry" && <ExpiryTable rows={expiryItems} />}
              {activeTab === "movements" && <MovementsTable rows={movements} />}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SavedReportsTable({ rows, onView, onDelete }) {
  if (!rows.length) {
    return <EmptyState title="No saved reports found" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Report</th>
            <th>Warehouse</th>
            <th>Stock Value</th>
            <th>Low Stock</th>
            <th>Expiry</th>
            <th>Created</th>
            <th className="right">Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="main-name">
                  <CalendarDays size={14} />
                  Report #{item.id}
                </div>
                <div className="small-text">{formatDate(item.report_date)}</div>
              </td>

              <td>
                <div className="main-name">
                  <Warehouse size={14} />
                  {item.warehouse_name || "All Warehouses"}
                </div>
                <div className="small-text">{item.warehouse_code || "-"}</div>
              </td>

              <td>{formatMoney(item.total_stock_value)}</td>
              <td>{item.low_stock_count || 0}</td>
              <td>{item.expiry_count || 0}</td>
              <td>{formatDateTime(item.created_at)}</td>

              <td>
                <div className="action-buttons">
                  <button type="button" className="view-btn" onClick={() => onView(item)}>
                    <Eye size={16} />
                  </button>
                  <button type="button" className="delete-btn" onClick={() => onDelete(item)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveStockTable({ rows }) {
  if (!rows.length) {
    return <EmptyState title="No live stock records found" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Warehouse</th>
            <th>Available</th>
            <th>Reserved</th>
            <th>Damaged</th>
            <th>Average Cost</th>
            <th>Stock Value</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="main-name">
                  <Package size={14} />
                  {item.product_name || "-"}
                </div>
                <div className="small-text">{item.sku || item.product_code || "-"}</div>
              </td>

              <td>{item.warehouse_name || "-"}</td>
              <td>{formatQty(item.available_qty)}</td>
              <td>{formatQty(item.reserved_qty)}</td>
              <td>{formatQty(item.damaged_qty)}</td>
              <td>{formatMoney(item.average_cost)}</td>
              <td>{formatMoney(item.stock_value)}</td>
              <td>
                <span className={`status-badge ${item.stock_status}`}>
                  {item.stock_status || "normal"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LowStockTable({ rows }) {
  if (!rows.length) {
    return <EmptyState title="No low stock records found" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Warehouse</th>
            <th>Available</th>
            <th>Alert Level</th>
            <th>Min Stock</th>
            <th>Reorder Level</th>
            <th>Stock Value</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="main-name">
                  <Package size={14} />
                  {item.product_name || "-"}
                </div>
                <div className="small-text">{item.sku || item.product_code || "-"}</div>
              </td>

              <td>{item.warehouse_name || "-"}</td>
              <td>{formatQty(item.available_qty)}</td>
              <td>{formatQty(item.alert_level)}</td>
              <td>{formatQty(item.min_stock_level)}</td>
              <td>{formatQty(item.reorder_level)}</td>
              <td>{formatMoney(item.stock_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpiryTable({ rows }) {
  if (!rows.length) {
    return <EmptyState title="No expiry records found" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Batch</th>
            <th>Product</th>
            <th>Warehouse</th>
            <th>Qty</th>
            <th>Stock Value</th>
            <th>Expiry Date</th>
            <th>Days</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="main-name">{item.batch_no || "-"}</div>
                <div className="small-text">{item.batch_status || "-"}</div>
              </td>

              <td>
                <div className="main-name">
                  <Package size={14} />
                  {item.product_name || "-"}
                </div>
                <div className="small-text">{item.sku || item.product_code || "-"}</div>
              </td>

              <td>{item.warehouse_name || "-"}</td>
              <td>{formatQty(item.quantity)}</td>
              <td>{formatMoney(item.stock_value)}</td>
              <td>{formatDate(item.expiry_date)}</td>
              <td>{item.days_to_expiry}</td>
              <td>
                <span className={`status-badge ${item.expiry_status}`}>
                  {item.expiry_status || "-"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTable({ rows }) {
  if (!rows.length) {
    return <EmptyState title="No stock movement records found" />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Movement</th>
            <th>Product</th>
            <th>Warehouse</th>
            <th>Batch</th>
            <th>Qty</th>
            <th>Reference</th>
            <th>Balance</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <span className={`move-badge ${item.movement_type}`}>
                  {item.movement_type}
                </span>
                <div className="small-text">ID: #{item.id}</div>
              </td>

              <td>
                <div className="main-name">
                  <Package size={14} />
                  {item.product_name || "-"}
                </div>
                <div className="small-text">{item.sku || item.product_code || "-"}</div>
              </td>

              <td>{item.warehouse_name || "-"}</td>
              <td>{item.batch_no || "-"}</td>
              <td>{formatQty(item.quantity)}</td>
              <td>
                {item.reference_type || "-"}
                <div className="small-text">#{item.reference_id || "-"}</div>
              </td>
              <td>{formatQty(item.balance_after)}</td>
              <td>{formatDateTime(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3>{value}</h3>
      <p>{title}</p>
      <div className="stat-mark" />
    </div>
  );
}

function MiniStat({ title, value }) {
  return (
    <div className="mini-stat">
      <p>{title}</p>
      <h4>{value}</h4>
    </div>
  );
}

function Detail({ title, value }) {
  return (
    <div className="detail-card">
      <p>{title}</p>
      <h4>{value || "-"}</h4>
    </div>
  );
}

function EmptyState({ title, loading = false }) {
  return (
    <div className="empty-box">
      {loading ? <Loader2 size={30} className="spin" /> : <BarChart3 size={34} />}
      <h3>{title}</h3>
      <p>No data available for the selected filters.</p>
    </div>
  );
}

const css = `
  .inventory-report-page { color: #151515; }

  .report-hero {
    background:
      radial-gradient(circle at top right, rgba(250,204,21,0.24), transparent 34%),
      linear-gradient(135deg, #080808, #171717 55%, #050505);
    border: 1px solid rgba(250,204,21,0.18);
    border-radius: 30px;
    padding: 32px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 22px;
    align-items: flex-start;
    box-shadow: 0 24px 70px rgba(0,0,0,0.22);
    color: #fff;
  }

  .hero-left {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }

  .hero-icon {
    width: 60px;
    height: 60px;
    border-radius: 20px;
    background: #facc15;
    color: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 18px 36px rgba(250,204,21,0.25);
    flex-shrink: 0;
  }

  .eyebrow {
    color: #facc15;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 9px;
  }

  .report-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .report-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 760px;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .primary-btn,
  .secondary-btn,
  .excel-btn,
  .pdf-btn {
    border: none;
    height: 46px;
    padding: 0 18px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }

  .primary-btn {
    background: #facc15;
    color: #111;
    box-shadow: 0 14px 30px rgba(250,204,21,0.22);
  }

  .secondary-btn,
  .excel-btn,
  .pdf-btn {
    background: rgba(255,255,255,0.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .excel-btn { color: #86efac; }
  .pdf-btn { color: #fda4af; }

  .success-box,
  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 900;
  }

  .success-box {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
  }

  .error-box {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
    justify-content: space-between;
  }

  .error-box button {
    border: none;
    background: transparent;
    color: #be123c;
    cursor: pointer;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(9, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 18px;
    box-shadow: 0 12px 34px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
  }

  .stat-card h3 {
    margin: 0;
    font-size: 19px;
    font-weight: 950;
    color: #111;
    letter-spacing: -0.4px;
  }

  .stat-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .stat-mark {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: #facc15;
  }

  .tabs-card,
  .toolbar,
  .table-card,
  .view-card,
  .movement-summary {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .view-card {
    padding: 24px;
    margin-bottom: 22px;
  }

  .view-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .view-head h2,
  .table-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .view-head p,
  .table-header p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: none;
    background: #f6f6f6;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .detail-card {
    background: #fafafa;
    border: 1px solid #ececec;
    border-radius: 18px;
    padding: 15px;
  }

  .detail-card p {
    margin: 0;
    color: #777;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .detail-card h4 {
    margin: 7px 0 0;
    color: #111;
    font-size: 15px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .tabs-card {
    padding: 12px;
    margin-bottom: 18px;
  }

  .tabs {
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
  }

  .tabs button {
    border: none;
    min-height: 42px;
    border-radius: 14px;
    padding: 0 15px;
    background: #f4f4f5;
    color: #52525b;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .tabs button.active {
    background: #111;
    color: #facc15;
  }

  .toolbar {
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-wrap {
    max-width: 430px;
    width: 100%;
    height: 46px;
    border-radius: 15px;
    background: #f7f7f7;
    border: 1px solid #eeeeee;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    color: #888;
  }

  .search-wrap input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    font-weight: 800;
  }

  .filter-select,
  .date-input {
    height: 46px;
    border-radius: 15px;
    border: 1px solid #eeeeee;
    background: #fff;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 900;
    color: #333;
    outline: none;
  }

  .movement-summary {
    padding: 16px;
    margin-bottom: 22px;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .mini-stat {
    background: #fafafa;
    border: 1px solid #ececec;
    border-radius: 18px;
    padding: 14px;
  }

  .mini-stat p {
    margin: 0;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .mini-stat h4 {
    margin: 7px 0 0;
    color: #111;
    font-size: 17px;
    font-weight: 950;
  }

  .table-card {
    padding: 22px;
    overflow: hidden;
  }

  .table-header {
    margin-bottom: 18px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1120px;
  }

  th {
    background: #111;
    color: #facc15;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 15px 14px;
  }

  td {
    padding: 16px 14px;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
    font-size: 13px;
    vertical-align: top;
    font-weight: 700;
  }

  tr:hover td {
    background: #fffbeb;
  }

  .main-name {
    font-weight: 950;
    color: #111;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .small-text {
    color: #777;
    font-size: 12px;
    margin-top: 6px;
  }

  .status-badge,
  .move-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status-badge.normal {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.low,
  .status-badge.near_expiry {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.critical,
  .status-badge.expired {
    background: #fff1f2;
    color: #be123c;
  }

  .move-badge.in {
    background: #ecfdf5;
    color: #047857;
  }

  .move-badge.out {
    background: #fff1f2;
    color: #be123c;
  }

  .move-badge.adjustment {
    background: #eff6ff;
    color: #2563eb;
  }

  .move-badge.damage {
    background: #f4f4f5;
    color: #52525b;
  }

  .move-badge.transfer {
    background: #fffbeb;
    color: #b45309;
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .view-btn,
  .delete-btn {
    width: 37px;
    height: 37px;
    border-radius: 13px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .view-btn {
    background: #f4f4f5;
    color: #52525b;
  }

  .delete-btn {
    background: #fff1f2;
    color: #e11d48;
  }

  .right {
    text-align: right;
  }

  .empty-box {
    min-height: 190px;
    border: 1px dashed #ddd;
    border-radius: 22px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 28px;
    color: #777;
  }

  .empty-box h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    color: #111;
  }

  .empty-box p {
    margin: 0;
    color: #777;
    font-size: 13px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1500px) {
    .stats-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .movement-summary {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .report-hero,
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .excel-btn,
    .pdf-btn {
      width: 100%;
    }

    .stats-grid,
    .movement-summary,
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
`;