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
  PackageCheck,
  PackageSearch,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
  plan_year: String(currentYear),
  plan_month: String(currentMonth),
  forecast_id: "",
  search: "",
  status: "",
};

const defaultSaveForm = {
  plan_name: "",
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

const getStatusClass = (status) => {
  if (status === "approved") return "status approved";
  if (status === "closed") return "status closed";
  return "status draft";
};

const getPriorityClass = (priority) => {
  if (priority === "urgent") return "priority urgent";
  if (priority === "high") return "priority high";
  if (priority === "low") return "priority low";
  return "priority normal";
};

const exportCsv = (rows, fileName) => {
  if (!rows.length) return;

  const headers = [
    "Product",
    "Vendor",
    "Forecast Qty",
    "Current Stock",
    "Required Qty",
    "Average Unit Price",
    "Estimated Value",
    "Priority",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((item) =>
      [
        item.product_name,
        item.vendor_name,
        item.forecast_qty,
        item.current_stock_qty,
        item.required_qty,
        item.average_unit_price,
        item.estimated_value,
        item.priority,
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

export default function ProcurementReorderPlanning() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [generatedForecast, setGeneratedForecast] = useState(null);

  const [savedForecasts, setSavedForecasts] = useState([]);
  const [plans, setPlans] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [saveForm, setSaveForm] = useState(defaultSaveForm);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState("");

  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const selectedMonthLabel = useMemo(() => {
    return (
      monthOptions.find((month) => month.value === String(filters.plan_month))
        ?.label || filters.plan_month
    );
  }, [filters.plan_month]);

  const topItems = useMemo(() => {
    return [...items]
      .sort((a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0))
      .slice(0, 10);
  }, [items]);

  const topValueChart = useMemo(() => {
    return topItems.map((item) => ({
      product: item.product_name || "-",
      value: Number(item.estimated_value || 0),
    }));
  }, [topItems]);

  const priorityChart = useMemo(() => {
    const data = items.reduce((acc, item) => {
      const key = item.priority || "normal";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(data).map(([name, value]) => ({
      name,
      value,
    }));
  }, [items]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementReorderTimer);
    window.__procurementReorderTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchSavedForecasts = useCallback(async () => {
    try {
      setForecastLoading(true);

      const res = await API.get("/api/procurement-forecasts", {
        params: {
          forecast_year: filters.plan_year || undefined,
          forecast_month: filters.plan_month || undefined,
        },
      });

      setSavedForecasts(res.data?.forecasts || res.data?.data || []);
    } catch (error) {
      console.error(
        "Fetch saved forecasts error:",
        error.response?.data || error.message
      );
      setSavedForecasts([]);
    } finally {
      setForecastLoading(false);
    }
  }, [filters.plan_year, filters.plan_month]);

  const generateReorderPlan = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-reorder-plans/generate", {
        params: {
          forecast_id: filters.forecast_id || undefined,
          plan_year: filters.plan_year,
          plan_month: filters.plan_month,
        },
      });

      setItems(res.data?.items || res.data?.data || []);
      setSummary(res.data?.summary || {});
      setGeneratedForecast(res.data?.forecast || null);
    } catch (error) {
      console.error(
        "Generate reorder plan error:",
        error.response?.data || error.message
      );

      setItems([]);
      setSummary({});
      setGeneratedForecast(null);

      if (error.response?.status === 404) {
        showMessage(
          "error",
          error.response?.data?.message ||
            "No saved forecast found. First save forecast from Procurement Forecasting."
        );
        return;
      }

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to generate reorder plan"
      );
    } finally {
      setLoading(false);
    }
  }, [filters.forecast_id, filters.plan_year, filters.plan_month]);

  const fetchPlans = useCallback(async () => {
    try {
      setPlanLoading(true);

      const res = await API.get("/api/procurement-reorder-plans", {
        params: {
          search: filters.search || undefined,
          plan_year: filters.plan_year || undefined,
          plan_month: filters.plan_month || undefined,
          status: filters.status || undefined,
        },
      });

      setPlans(res.data?.plans || res.data?.data || []);
    } catch (error) {
      console.error(
        "Fetch reorder plans error:",
        error.response?.data || error.message
      );

      setPlans([]);
    } finally {
      setPlanLoading(false);
    }
  }, [filters.search, filters.plan_year, filters.plan_month, filters.status]);

  useEffect(() => {
    fetchSavedForecasts();
  }, [fetchSavedForecasts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      generateReorderPlan();
    }, 350);

    return () => clearTimeout(timer);
  }, [generateReorderPlan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlans();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchPlans]);

  const refreshAll = () => {
    fetchSavedForecasts();
    generateReorderPlan();
    fetchPlans();
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

  const handleSavePlan = async () => {
    const forecastId = filters.forecast_id || generatedForecast?.id;

    if (!forecastId) {
      showMessage(
        "error",
        "Forecast ID missing. First save forecast from Procurement Forecasting module."
      );
      return;
    }

    try {
      setSaveLoading(true);

      const res = await API.post("/api/procurement-reorder-plans/save", {
        plan_name:
          saveForm.plan_name ||
          `Reorder Plan - ${selectedMonthLabel} ${filters.plan_year}`,
        forecast_id: forecastId,
        plan_year: Number(filters.plan_year),
        plan_month: Number(filters.plan_month),
        remarks: saveForm.remarks,
        status: saveForm.status || "draft",
      });

      showMessage(
        "success",
        res.data?.message || "Procurement reorder plan saved successfully"
      );

      setSaveForm(defaultSaveForm);
      fetchPlans();
    } catch (error) {
      console.error(
        "Save reorder plan error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to save reorder plan"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleViewPlan = async (id) => {
    try {
      const res = await API.get(`/api/procurement-reorder-plans/${id}`);

      setSelectedPlan({
        plan: res.data?.plan || null,
        items: res.data?.items || [],
      });
    } catch (error) {
      console.error(
        "View reorder plan error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to open reorder plan"
      );
    }
  };

  const handleDeletePlan = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this procurement reorder plan permanently?"
    );

    if (!confirmDelete) return;

    try {
      setDeleteLoading(String(id));

      await API.delete(`/api/procurement-reorder-plans/${id}`);

      showMessage("success", "Procurement reorder plan deleted successfully");
      fetchPlans();
    } catch (error) {
      console.error(
        "Delete reorder plan error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete reorder plan"
      );
    } finally {
      setDeleteLoading("");
    }
  };

  const handleExport = () => {
    if (!items.length) {
      showMessage("error", "No reorder items available to export");
      return;
    }

    exportCsv(
      items,
      `procurement-reorder-plan-${filters.plan_year}-${filters.plan_month}.csv` 
    );
  };

  return (
    <AdminLayout>
      <div className="reorder-page">
        <style>{css}</style>

        <div className="reorder-hero">
          <div>
            <div className="eyebrow">
              <ShoppingCart size={15} />
              Procurement Planning
            </div>

            <h1>Procurement Reorder Planning</h1>

            <p>
              Convert saved forecast into reorder suggestions using forecast
              quantity, current stock and required purchase quantity.
            </p>
          </div>

          <div className="hero-actions">
            <button type="button" className="secondary-dark-btn" onClick={handleExport}>
              <Download size={17} />
              Export CSV
            </button>

            <button
              type="button"
              className="secondary-dark-btn"
              onClick={refreshAll}
              disabled={loading || planLoading || forecastLoading}
            >
              {loading || planLoading || forecastLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={handleSavePlan}
              disabled={saveLoading || loading}
            >
              {saveLoading ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
              Save Plan
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
              Procurement Reorder backend route is not connected yet. Add
              /api/procurement-reorder-plans and restart backend.
            </span>
          </div>
        )}

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>
              Reorder Settings · {selectedMonthLabel} {filters.plan_year}
            </span>
          </div>

          <div className="filter-grid">
            <input
              type="number"
              value={filters.plan_year}
              onChange={(event) => handleFilterChange("plan_year", event.target.value)}
              placeholder="Year"
            />

            <select
              value={filters.plan_month}
              onChange={(event) => handleFilterChange("plan_month", event.target.value)}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={filters.forecast_id}
              onChange={(event) => handleFilterChange("forecast_id", event.target.value)}
            >
              <option value="">Latest Saved Forecast</option>

              {savedForecasts.map((forecast) => (
                <option key={forecast.id} value={forecast.id}>
                  {forecast.forecast_name}
                </option>
              ))}
            </select>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>

          <div className="save-grid">
            <input
              value={saveForm.plan_name}
              onChange={(event) =>
                handleSaveFormChange("plan_name", event.target.value)
              }
              placeholder={`Plan name - ${selectedMonthLabel} ${filters.plan_year}`}
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
              onChange={(event) => handleSaveFormChange("status", event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard title="Required Items" value={summary.total_items || 0} icon={PackageSearch} />
          <SummaryCard title="Urgent Items" value={summary.urgent_items || 0} icon={AlertCircle} danger />
          <SummaryCard title="High Priority" value={summary.high_priority_items || 0} icon={PackageCheck} warning />
          <SummaryCard title="Required Qty" value={formatQty(summary.total_required_qty || 0)} icon={BarChart3} success />
          <SummaryCard title="Estimated Value" value={formatCurrency(summary.total_estimated_value || 0)} icon={IndianRupee} />
        </div>

        {generatedForecast && (
          <div className="forecast-info">
            <CalendarDays size={18} />
            <div>
              <strong>{generatedForecast.forecast_name}</strong>
              <span>
                Forecast ID: {generatedForecast.id} ·{" "}
                {monthOptions.find(
                  (month) => month.value === String(generatedForecast.forecast_month)
                )?.label || generatedForecast.forecast_month}{" "}
                {generatedForecast.forecast_year}
              </span>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Top Reorder Value Items</h2>
                <p>Highest estimated purchase value items from reorder plan.</p>
              </div>
            </div>

            {loading ? (
              <EmptySmall loading text="Generating reorder chart..." />
            ) : topValueChart.length === 0 ? (
              <EmptySmall text="No reorder chart data found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topValueChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="product" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="value" name="Estimated Value" fill="#facc15" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Priority Split</h2>
                <p>Urgent, high, normal and low priority reorder items.</p>
              </div>
            </div>

            {priorityChart.length === 0 ? (
              <EmptySmall text="No priority data found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={priorityChart} dataKey="value" nameKey="name" outerRadius={105} label>
                      {priorityChart.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={["#e11d48", "#b45309", "#111111", "#16a34a"][index % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="saved-card">
          <div className="section-head">
            <div>
              <h2>Saved Reorder Plans</h2>
              <p>Previously saved monthly reorder plans.</p>
            </div>
          </div>

          <div className="saved-filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => handleFilterChange("search", event.target.value)}
                placeholder="Search saved reorder plan..."
              />
            </div>

            <select
              value={filters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {planLoading ? (
            <EmptySmall loading text="Loading saved reorder plans..." />
          ) : plans.length === 0 ? (
            <EmptySmall text="No saved reorder plans found" />
          ) : (
            <div className="saved-grid">
              {plans.map((plan) => (
                <div className="plan-card" key={plan.id}>
                  <div>
                    <h3>{plan.plan_name}</h3>
                    <p>{plan.forecast_name || "Forecast not linked"}</p>
                  </div>

                  <div className="plan-meta">
                    <span className={getStatusClass(plan.status)}>{plan.status || "draft"}</span>
                    <strong>{formatCurrency(plan.total_estimated_value)}</strong>
                    <small>{formatDate(plan.created_at)}</small>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleViewPlan(plan.id)}
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => handleDeletePlan(plan.id)}
                      disabled={deleteLoading === String(plan.id)}
                    >
                      {deleteLoading === String(plan.id) ? (
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
              <h2>Generated Reorder Items</h2>
              <p>
                Product-wise required quantity after comparing forecast quantity
                and current stock.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Generating reorder plan...</h3>
              <p>Please wait while system checks forecast and stock quantity.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-box">
              <ShoppingCart size={34} />
              <h3>No reorder required</h3>
              <p>No shortage found or saved forecast is not available.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Vendor</th>
                    <th>Forecast Qty</th>
                    <th>Current Stock</th>
                    <th>Required Qty</th>
                    <th>Avg Unit Price</th>
                    <th>Estimated Value</th>
                    <th>Priority</th>
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

                      <td>{formatQty(item.forecast_qty)}</td>
                      <td>{formatQty(item.current_stock_qty)}</td>

                      <td>
                        <strong className="qty-highlight">
                          {formatQty(item.required_qty)}
                        </strong>
                      </td>

                      <td>{formatCurrency(item.average_unit_price)}</td>

                      <td>
                        <strong className="amount-highlight">
                          {formatCurrency(item.estimated_value)}
                        </strong>
                      </td>

                      <td>
                        <span className={getPriorityClass(item.priority)}>
                          {item.priority || "normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedPlan && (
          <div className="modal-overlay" onClick={() => setSelectedPlan(null)}>
            <div className="plan-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <h2>{selectedPlan.plan?.plan_name}</h2>
                  <p>
                    Saved Reorder Plan ·{" "}
                    {formatCurrency(selectedPlan.plan?.total_estimated_value || 0)}
                  </p>
                </div>

                <button type="button" className="close-btn" onClick={() => setSelectedPlan(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="detail-grid">
                <DetailItem label="Year" value={selectedPlan.plan?.plan_year} />
                <DetailItem
                  label="Month"
                  value={
                    monthOptions.find(
                      (month) => month.value === String(selectedPlan.plan?.plan_month)
                    )?.label || selectedPlan.plan?.plan_month
                  }
                />
                <DetailItem label="Forecast" value={selectedPlan.plan?.forecast_name || "-"} />
                <DetailItem label="Items" value={selectedPlan.plan?.total_items || 0} />
                <DetailItem label="Required Qty" value={formatQty(selectedPlan.plan?.total_required_qty || 0)} />
                <DetailItem label="Status" value={selectedPlan.plan?.status || "-"} />
              </div>

              <div className="modal-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Vendor</th>
                      <th>Forecast Qty</th>
                      <th>Current Stock</th>
                      <th>Required Qty</th>
                      <th>Estimated Value</th>
                      <th>Priority</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedPlan.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name || "-"}</td>
                        <td>{item.vendor_name || "-"}</td>
                        <td>{formatQty(item.forecast_qty)}</td>
                        <td>{formatQty(item.current_stock_qty)}</td>
                        <td>{formatQty(item.required_qty)}</td>
                        <td>{formatCurrency(item.estimated_value)}</td>
                        <td>
                          <span className={getPriorityClass(item.priority)}>
                            {item.priority || "normal"}
                          </span>
                        </td>
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

function SummaryCard({ title, value, icon: Icon, success, warning, danger }) {
  return (
    <div
      className={`summary-card ${success ? "success" : ""} ${
        warning ? "warning" : ""
      } ${danger ? "danger" : ""}`}
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
      {loading ? <Loader2 size={28} className="spin" /> : <BarChart3 size={28} />}
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
  .reorder-page {
    color: #111827;
  }

  .reorder-hero {
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

  .reorder-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .reorder-hero p {
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
    grid-template-columns: 0.8fr 1fr 1.5fr auto;
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

  .summary-card.danger .summary-icon {
    background: #fff1f2;
    color: #e11d48;
  }

  .forecast-info {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    border-radius: 20px;
    padding: 15px;
    margin-bottom: 22px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .forecast-info strong {
    display: block;
    color: #111;
    font-size: 14px;
    font-weight: 950;
  }

  .forecast-info span {
    display: block;
    color: #92400e;
    font-size: 12px;
    font-weight: 800;
    margin-top: 4px;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 0.8fr;
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

  .plan-card {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 20px;
    padding: 16px;
  }

  .plan-card h3 {
    margin: 0;
    color: #111;
    font-size: 15px;
    font-weight: 950;
  }

  .plan-card p {
    margin: 6px 0 0;
    color: #777;
    font-size: 12px;
    font-weight: 800;
  }

  .plan-meta {
    display: grid;
    gap: 7px;
    margin-top: 14px;
  }

  .plan-meta strong {
    color: #111;
    font-size: 17px;
    font-weight: 950;
  }

  .plan-meta small {
    color: #777;
    font-weight: 800;
  }

  .status,
  .priority {
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

  .priority.urgent {
    background: #fff1f2;
    color: #e11d48;
  }

  .priority.high {
    background: #fffbeb;
    color: #b45309;
  }

  .priority.normal {
    background: #eff6ff;
    color: #2563eb;
  }

  .priority.low {
    background: #ecfdf5;
    color: #047857;
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

  .plan-modal {
    width: min(1120px, 96vw);
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
    .reorder-hero {
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
