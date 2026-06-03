import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  IndianRupee,
  Loader2,
  PackageSearch,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "closed", label: "Closed" },
];

const defaultFilters = {
  forecast_year: String(currentYear),
  forecast_month: String(currentMonth),
  lookback_months: "3",
  growth_percent: "0",
  safety_stock_percent: "10",
  vendor_id: "",
  search: "",
  status: "",
};

const defaultSaveForm = {
  forecast_name: "",
  remarks: "",
  status: "draft",
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatQty = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 3,
  });
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getArray = (res, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(res?.data?.[key])) return res.data[key];
  }

  if (Array.isArray(res?.data)) return res.data;

  return [];
};

const getVendorName = (vendor) => {
  return (
    vendor?.vendor_name ||
    vendor?.business_name ||
    vendor?.name ||
    vendor?.company_name ||
    "-"
  );
};

const getVendorId = (vendor) => {
  return vendor?.vendor_id || vendor?.id || "";
};

const getStatusClass = (status) => {
  if (status === "approved") return "status approved";
  if (status === "closed") return "status closed";
  return "status draft";
};

const exportCsv = (rows, fileName) => {
  if (!rows.length) return;

  const headers = [
    "Product",
    "Vendor",
    "Historical Qty",
    "Average Monthly Qty",
    "Forecast Qty",
    "Average Unit Price",
    "Forecast Value",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((item) =>
      [
        item.product_name,
        item.vendor_name,
        item.historical_qty,
        item.average_monthly_qty,
        item.forecast_qty,
        item.average_unit_price,
        item.forecast_value,
      ]
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export default function ProcurementForecasting() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [period, setPeriod] = useState({});
  const [forecasts, setForecasts] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [saveForm, setSaveForm] = useState(defaultSaveForm);
  const [selectedForecast, setSelectedForecast] = useState(null);

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState("");

  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const selectedMonthLabel = useMemo(() => {
    return (
      monthOptions.find(
        (month) => month.value === String(filters.forecast_month)
      )?.label || filters.forecast_month
    );
  }, [filters.forecast_month]);

  const topValueItems = useMemo(() => {
    return [...items]
      .sort(
        (a, b) => Number(b.forecast_value || 0) - Number(a.forecast_value || 0)
      )
      .slice(0, 10);
  }, [items]);

  const valueChartData = useMemo(() => {
    return topValueItems.map((item) => ({
      product: item.product_name || "-",
      value: Number(item.forecast_value || 0),
    }));
  }, [topValueItems]);

  const qtyChartData = useMemo(() => {
    return topValueItems.map((item) => ({
      product: item.product_name || "-",
      historical: Number(item.historical_qty || 0),
      forecast: Number(item.forecast_qty || 0),
    }));
  }, [topValueItems]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementForecastTimer);
    window.__procurementForecastTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchVendors = useCallback(async () => {
    try {
      const res = await API.get("/api/vendors");

      setVendors(getArray(res, ["vendors", "data", "vendorList"]));
    } catch (error) {
      console.error("Vendor dropdown error:", error.response?.data || error);
      setVendors([]);
    }
  }, []);

  const generateForecast = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-forecasts/generate", {
        params: {
          forecast_year: filters.forecast_year,
          forecast_month: filters.forecast_month,
          lookback_months: filters.lookback_months,
          growth_percent: filters.growth_percent,
          safety_stock_percent: filters.safety_stock_percent,
          vendor_id: filters.vendor_id || undefined,
        },
      });

      setItems(res.data?.items || res.data?.data || []);
      setSummary(res.data?.summary || {});
      setPeriod(res.data?.period || {});
    } catch (error) {
      console.error(
        "Generate procurement forecast error:",
        error.response?.data || error.message
      );

      setItems([]);
      setSummary({});
      setPeriod({});

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to generate procurement forecast"
      );
    } finally {
      setLoading(false);
    }
  }, [
    filters.forecast_year,
    filters.forecast_month,
    filters.lookback_months,
    filters.growth_percent,
    filters.safety_stock_percent,
    filters.vendor_id,
  ]);

  const fetchForecasts = useCallback(async () => {
    try {
      setListLoading(true);

      const res = await API.get("/api/procurement-forecasts", {
        params: {
          search: filters.search || undefined,
          forecast_year: filters.forecast_year || undefined,
          forecast_month: filters.forecast_month || undefined,
          status: filters.status || undefined,
        },
      });

      setForecasts(res.data?.forecasts || res.data?.data || []);
    } catch (error) {
      console.error(
        "Fetch procurement forecasts error:",
        error.response?.data || error.message
      );

      setForecasts([]);
    } finally {
      setListLoading(false);
    }
  }, [
    filters.search,
    filters.forecast_year,
    filters.forecast_month,
    filters.status,
  ]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    const timer = setTimeout(() => {
      generateForecast();
    }, 350);

    return () => clearTimeout(timer);
  }, [generateForecast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchForecasts();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchForecasts]);

  const refreshAll = () => {
    generateForecast();
    fetchForecasts();
    fetchVendors();
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveFormChange = (name, value) => {
    setSaveForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSaveForm(defaultSaveForm);
  };

  const handleSaveForecast = async () => {
    try {
      setSaveLoading(true);

      const res = await API.post("/api/procurement-forecasts/save", {
        forecast_name:
          saveForm.forecast_name ||
          `Procurement Forecast - ${selectedMonthLabel} ${filters.forecast_year}`,
        forecast_year: Number(filters.forecast_year),
        forecast_month: Number(filters.forecast_month),
        lookback_months: Number(filters.lookback_months || 3),
        growth_percent: Number(filters.growth_percent || 0),
        safety_stock_percent: Number(filters.safety_stock_percent || 10),
        vendor_id: filters.vendor_id || "",
        remarks: saveForm.remarks,
        status: saveForm.status || "draft",
      });

      showMessage(
        "success",
        res.data?.message || "Procurement forecast saved successfully"
      );

      setSaveForm(defaultSaveForm);
      fetchForecasts();
    } catch (error) {
      console.error(
        "Save procurement forecast error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to save procurement forecast"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleViewForecast = async (id) => {
    try {
      const res = await API.get(`/api/procurement-forecasts/${id}`);

      setSelectedForecast({
        forecast: res.data?.forecast || null,
        items: res.data?.items || [],
      });
    } catch (error) {
      console.error(
        "View procurement forecast error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to open procurement forecast"
      );
    }
  };

  const handleDeleteForecast = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this procurement forecast permanently?"
    );

    if (!confirmDelete) return;

    try {
      setDeleteLoading(String(id));

      await API.delete(`/api/procurement-forecasts/${id}`);

      showMessage("success", "Procurement forecast deleted successfully");
      fetchForecasts();
    } catch (error) {
      console.error(
        "Delete procurement forecast error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete procurement forecast"
      );
    } finally {
      setDeleteLoading("");
    }
  };

  const handleExport = () => {
    if (!items.length) {
      showMessage("error", "No forecast items available to export");
      return;
    }

    exportCsv(
      items,
      `procurement-forecast-${filters.forecast_year}-${filters.forecast_month}.csv` 
    );
  };

  return (
    <AdminLayout>
      <div className="forecast-page">
        <style>{css}</style>

        <div className="forecast-hero">
          <div>
            <div className="eyebrow">
              <Sparkles size={15} />
              Procurement Planning
            </div>

            <h1>Procurement Forecasting</h1>

            <p>
              Forecast next month purchase quantity and value using historical
              purchase trends, expected growth and safety stock percentage.
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-dark-btn"
              onClick={handleExport}
            >
              <Download size={17} />
              Export CSV
            </button>

            <button
              type="button"
              className="secondary-dark-btn"
              onClick={refreshAll}
              disabled={loading || listLoading}
            >
              {loading || listLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={handleSaveForecast}
              disabled={saveLoading || loading}
            >
              {saveLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <Save size={17} />
              )}
              Save Forecast
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle2 size={17} />
            ) : (
              <AlertCircle size={17} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {apiMissing && (
          <div className="message error">
            <AlertCircle size={17} />
            <span>
              Procurement Forecast backend route is not connected yet. Add
              /api/procurement-forecasts and restart backend.
            </span>
          </div>
        )}

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>
              Forecast Settings · {selectedMonthLabel} {filters.forecast_year}
            </span>
          </div>

          <div className="filter-grid">
            <input
              type="number"
              value={filters.forecast_year}
              onChange={(event) =>
                handleFilterChange("forecast_year", event.target.value)
              }
              placeholder="Year"
            />

            <select
              value={filters.forecast_month}
              onChange={(event) =>
                handleFilterChange("forecast_month", event.target.value)
              }
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              value={filters.lookback_months}
              onChange={(event) =>
                handleFilterChange("lookback_months", event.target.value)
              }
              placeholder="Lookback Months"
            />

            <input
              type="number"
              value={filters.growth_percent}
              onChange={(event) =>
                handleFilterChange("growth_percent", event.target.value)
              }
              placeholder="Growth %"
            />

            <input
              type="number"
              value={filters.safety_stock_percent}
              onChange={(event) =>
                handleFilterChange("safety_stock_percent", event.target.value)
              }
              placeholder="Safety Stock %"
            />

            <select
              value={filters.vendor_id}
              onChange={(event) =>
                handleFilterChange("vendor_id", event.target.value)
              }
            >
              <option value="">All Vendors</option>

              {vendors.map((vendor) => (
                <option key={getVendorId(vendor)} value={getVendorId(vendor)}>
                  {getVendorName(vendor)}
                </option>
              ))}
            </select>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>

          <div className="save-grid">
            <input
              value={saveForm.forecast_name}
              onChange={(event) =>
                handleSaveFormChange("forecast_name", event.target.value)
              }
              placeholder={`Forecast name - ${selectedMonthLabel} ${filters.forecast_year}`}
            />

            <input
              value={saveForm.remarks}
              onChange={(event) =>
                handleSaveFormChange("remarks", event.target.value)
              }
              placeholder="Remarks"
            />

            <select
              value={saveForm.status}
              onChange={(event) =>
                handleSaveFormChange("status", event.target.value)
              }
            >
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard
            title="Forecast Items"
            value={summary.total_items || 0}
            icon={PackageSearch}
          />

          <SummaryCard
            title="Historical Qty"
            value={formatQty(summary.total_historical_qty || 0)}
            icon={BarChart3}
          />

          <SummaryCard
            title="Forecast Qty"
            value={formatQty(summary.total_forecast_qty || 0)}
            icon={TrendingUp}
            success
          />

          <SummaryCard
            title="Forecast Value"
            value={formatCurrency(summary.total_forecast_value || 0)}
            icon={IndianRupee}
            warning
          />

          <SummaryCard
            title="Lookback Months"
            value={period.lookback_months || filters.lookback_months}
            icon={CalendarDays}
          />
        </div>

        <div className="dashboard-grid">
          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Top Forecast Value Items</h2>
                <p>Highest purchase value expected for the selected period.</p>
              </div>
            </div>

            {loading ? (
              <EmptySmall loading text="Generating forecast chart..." />
            ) : valueChartData.length === 0 ? (
              <EmptySmall text="No forecast value data found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={valueChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="product" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar
                      dataKey="value"
                      name="Forecast Value"
                      fill="#facc15"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Historical vs Forecast Qty</h2>
                <p>Compare past quantity and predicted quantity.</p>
              </div>
            </div>

            {loading ? (
              <EmptySmall loading text="Generating quantity forecast..." />
            ) : qtyChartData.length === 0 ? (
              <EmptySmall text="No forecast quantity data found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={qtyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="product" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatQty(value)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      name="Historical Qty"
                      stroke="#111111"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast Qty"
                      stroke="#facc15"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="saved-card">
          <div className="section-head">
            <div>
              <h2>Saved Forecasts</h2>
              <p>Previously saved monthly procurement forecasts.</p>
            </div>
          </div>

          <div className="saved-filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange("search", event.target.value)
                }
                placeholder="Search saved forecast..."
              />
            </div>

            <select
              value={filters.status}
              onChange={(event) =>
                handleFilterChange("status", event.target.value)
              }
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {listLoading ? (
            <EmptySmall loading text="Loading saved forecasts..." />
          ) : forecasts.length === 0 ? (
            <EmptySmall text="No saved forecasts found" />
          ) : (
            <div className="saved-grid">
              {forecasts.map((forecast) => (
                <div className="forecast-card" key={forecast.id}>
                  <div>
                    <h3>{forecast.forecast_name}</h3>
                    <p>
                      {monthOptions.find(
                        (month) =>
                          month.value === String(forecast.forecast_month)
                      )?.label || forecast.forecast_month}{" "}
                      {forecast.forecast_year}
                    </p>
                  </div>

                  <div className="forecast-meta">
                    <span className={getStatusClass(forecast.status)}>
                      {forecast.status || "draft"}
                    </span>
                    <strong>{formatCurrency(forecast.total_forecast_value)}</strong>
                    <small>{formatDate(forecast.created_at)}</small>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleViewForecast(forecast.id)}
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => handleDeleteForecast(forecast.id)}
                      disabled={deleteLoading === String(forecast.id)}
                    >
                      {deleteLoading === String(forecast.id) ? (
                        <Loader2 size={15} className="spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Generated Forecast Items</h2>
              <p>
                Product-wise forecast quantity and purchase value based on last{" "}
                {filters.lookback_months} months.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Generating procurement forecast...</h3>
              <p>Please wait while system calculates forecast items.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-box">
              <PackageSearch size={34} />
              <h3>No forecast data found</h3>
              <p>Create purchase orders with items for previous months.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Vendor</th>
                    <th>Historical Qty</th>
                    <th>Avg Monthly Qty</th>
                    <th>Forecast Qty</th>
                    <th>Avg Unit Price</th>
                    <th>Forecast Value</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.product_id}-${item.vendor_id}-${index}`}>
                      <td>
                        <div className="product-cell">
                          <PackageSearch size={16} />
                          <div>
                            <strong>{item.product_name || "-"}</strong>
                            <span>Product ID: {item.product_id || "-"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="vendor-cell">
                          <Building2 size={15} />
                          <span>{item.vendor_name || "-"}</span>
                        </div>
                      </td>

                      <td>{formatQty(item.historical_qty)}</td>
                      <td>{formatQty(item.average_monthly_qty)}</td>

                      <td>
                        <strong className="qty-highlight">
                          {formatQty(item.forecast_qty)}
                        </strong>
                      </td>

                      <td>{formatCurrency(item.average_unit_price)}</td>

                      <td>
                        <strong className="amount-highlight">
                          {formatCurrency(item.forecast_value)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedForecast && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedForecast(null)}
          >
            <div
              className="forecast-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h2>{selectedForecast.forecast?.forecast_name}</h2>
                  <p>
                    Saved Forecast ·{" "}
                    {formatCurrency(
                      selectedForecast.forecast?.total_forecast_value || 0
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setSelectedForecast(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="detail-grid">
                <DetailItem
                  label="Year"
                  value={selectedForecast.forecast?.forecast_year}
                />
                <DetailItem
                  label="Month"
                  value={
                    monthOptions.find(
                      (month) =>
                        month.value ===
                        String(selectedForecast.forecast?.forecast_month)
                    )?.label || selectedForecast.forecast?.forecast_month
                  }
                />
                <DetailItem
                  label="Lookback"
                  value={`${selectedForecast.forecast?.lookback_months || 0} months`}
                />
                <DetailItem
                  label="Growth"
                  value={`${selectedForecast.forecast?.growth_percent || 0}%`}
                />
                <DetailItem
                  label="Safety Stock"
                  value={`${
                    selectedForecast.forecast?.safety_stock_percent || 0
                  }%`}
                />
                <DetailItem
                  label="Status"
                  value={selectedForecast.forecast?.status || "-"}
                />
              </div>

              <div className="modal-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Vendor</th>
                      <th>Historical Qty</th>
                      <th>Forecast Qty</th>
                      <th>Forecast Value</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedForecast.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name || "-"}</td>
                        <td>{item.vendor_name || "-"}</td>
                        <td>{formatQty(item.historical_qty)}</td>
                        <td>{formatQty(item.forecast_qty)}</td>
                        <td>{formatCurrency(item.forecast_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, value, icon: Icon, success, warning }) {
  return (
    <div
      className={`summary-card ${success ? "success" : ""} ${
        warning ? "warning" : ""
      }`}
    >
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>

      <div className="summary-icon">
        <Icon size={20} />
      </div>
    </div>
  );
}

function EmptySmall({ text, loading }) {
  return (
    <div className="empty-small">
      {loading ? (
        <Loader2 size={28} className="spin" />
      ) : (
        <BarChart3 size={28} />
      )}
      <p>{text}</p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const css = `
  .forecast-page {
    color: #111827;
  }

  .forecast-hero {
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

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #facc15;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 9px;
  }

  .forecast-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .forecast-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 780px;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .primary-btn,
  .secondary-btn,
  .secondary-dark-btn {
    border: none;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 15px;
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

  .secondary-btn {
    background: #f4f4f5;
    color: #111;
    border: 1px solid #e5e7eb;
  }

  .secondary-dark-btn {
    background: rgba(255,255,255,0.1);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .primary-btn:disabled,
  .secondary-dark-btn:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .message {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 850;
  }

  .message.success {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
  }

  .message.error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
  }

  .filter-card,
  .summary-card,
  .chart-card,
  .saved-card,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .filter-card,
  .chart-card,
  .saved-card,
  .table-card {
    padding: 22px;
    margin-bottom: 22px;
  }

  .filter-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #111827;
    font-size: 14px;
    font-weight: 950;
    margin-bottom: 14px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: 0.7fr 1fr 0.8fr 0.8fr 0.8fr 1.2fr auto;
    gap: 12px;
    align-items: center;
  }

  .save-grid {
    display: grid;
    grid-template-columns: 1fr 1.4fr 0.7fr;
    gap: 12px;
    margin-top: 13px;
  }

  .saved-filter-grid {
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 12px;
    margin-bottom: 16px;
  }

  .search-wrap {
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

  .search-wrap input,
  .filter-grid input,
  .filter-grid select,
  .save-grid input,
  .save-grid select,
  .saved-filter-grid select {
    width: 100%;
    border: 1.5px solid #e8e8e8;
    border-radius: 15px;
    padding: 12px 13px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
    background: #fbfbfb;
  }

  .search-wrap input {
    border: none;
    background: transparent;
    padding: 0;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .summary-card {
    border-radius: 22px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .summary-card h3 {
    margin: 0;
    color: #111;
    font-size: 20px;
    font-weight: 950;
  }

  .summary-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    background: #111;
    color: #facc15;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-card.success .summary-icon {
    background: #ecfdf5;
    color: #047857;
  }

  .summary-card.warning .summary-icon {
    background: #fffbeb;
    color: #b45309;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .section-head h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .section-head p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .chart-box {
    width: 100%;
    min-height: 320px;
  }

  .saved-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .forecast-card {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 20px;
    padding: 16px;
  }

  .forecast-card h3 {
    margin: 0;
    color: #111;
    font-size: 15px;
    font-weight: 950;
  }

  .forecast-card p {
    margin: 6px 0 0;
    color: #777;
    font-size: 12px;
    font-weight: 800;
  }

  .forecast-meta {
    display: grid;
    gap: 7px;
    margin-top: 14px;
  }

  .forecast-meta strong {
    color: #111;
    font-size: 17px;
    font-weight: 950;
  }

  .forecast-meta small {
    color: #777;
    font-weight: 800;
  }

  .status {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status.draft {
    background: #fffbeb;
    color: #b45309;
  }

  .status.approved {
    background: #ecfdf5;
    color: #047857;
  }

  .status.closed {
    background: #eff6ff;
    color: #2563eb;
  }

  .card-actions {
    display: flex;
    gap: 9px;
    margin-top: 14px;
  }

  .icon-btn,
  .close-btn {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    border: none;
    background: #111;
    color: #facc15;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-btn.danger {
    background: #fff1f2;
    color: #e11d48;
  }

  .icon-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .close-btn {
    background: #f4f4f5;
    color: #111;
  }

  .table-wrap,
  .modal-table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1100px;
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

  .product-cell,
  .vendor-cell {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .product-cell strong {
    display: block;
    color: #111;
    font-weight: 950;
  }

  .product-cell span {
    display: block;
    color: #777;
    font-size: 12px;
    margin-top: 4px;
  }

  .vendor-cell span {
    color: #111;
    font-weight: 900;
  }

  .qty-highlight {
    color: #047857;
    font-size: 14px;
  }

  .amount-highlight {
    color: #b45309;
    font-size: 14px;
  }

  .empty-box,
  .empty-small {
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

  .empty-small {
    min-height: 260px;
  }

  .empty-box h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    color: #111;
  }

  .empty-box p,
  .empty-small p {
    margin: 0;
    color: #777;
    font-size: 13px;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.58);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .forecast-modal {
    width: min(1100px, 96vw);
    max-height: 88vh;
    overflow-y: auto;
    background: #fff;
    border-radius: 26px;
    padding: 24px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.35);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .modal-head h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 950;
    color: #111;
  }

  .modal-head p {
    margin: 6px 0 0;
    color: #777;
    font-weight: 800;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .detail-item {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 16px;
    padding: 14px;
  }

  .detail-item span {
    display: block;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .detail-item strong {
    color: #111;
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

  @media (max-width: 1300px) {
    .summary-grid,
    .dashboard-grid,
    .saved-grid,
    .filter-grid,
    .save-grid,
    .saved-filter-grid,
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .forecast-hero {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .secondary-dark-btn {
      width: 100%;
    }
  }
`;
