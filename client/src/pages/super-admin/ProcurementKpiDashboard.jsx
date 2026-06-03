import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  IndianRupee,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
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

const defaultFilters = {
  year: String(currentYear),
  month: String(currentMonth),
  vendor_search: "",
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatNumber = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const exportCsv = (rows, fileName) => {
  if (!rows.length) return;

  const headers = [
    "Vendor",
    "Purchase Orders",
    "Purchase Value",
    "Paid Value",
    "Outstanding",
    "Return Value",
    "Payment %",
    "Return %",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((item) =>
      [
        item.vendor_name,
        item.total_purchase_orders,
        item.total_purchase_value,
        item.total_paid_value,
        item.outstanding_value,
        item.total_return_value,
        item.payment_percent,
        item.return_percent,
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

export default function ProcurementKpiDashboard() {
  const [summary, setSummary] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [trends, setTrends] = useState([]);
  const [vendorKpis, setVendorKpis] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(false);

  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const selectedMonthLabel = useMemo(() => {
    return (
      monthOptions.find((item) => item.value === String(filters.month))?.label ||
      filters.month
    );
  }, [filters.month]);

  const purchaseStatusData = useMemo(() => {
    return [
      {
        name: "Pending PO",
        value: Number(summary.pending_po_orders || 0),
      },
      {
        name: "Approved",
        value: Number(summary.approved_orders || 0),
      },
      {
        name: "Ordered",
        value: Number(summary.ordered_orders || 0),
      },
      {
        name: "Received",
        value: Number(summary.received_orders || 0),
      },
      {
        name: "Closed",
        value: Number(summary.closed_orders || 0),
      },
    ];
  }, [summary]);

  const vendorChartData = useMemo(() => {
    return vendorKpis.slice(0, 8).map((vendor) => ({
      vendor: vendor.vendor_name || "-",
      purchase: Number(vendor.total_purchase_value || 0),
      outstanding: Number(vendor.outstanding_value || 0),
    }));
  }, [vendorKpis]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementKpiTimer);
    window.__procurementKpiTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-kpis/summary", {
        params: {
          year: filters.year,
          month: filters.month,
        },
      });

      setSummary(res.data?.summary || {});
      setAlerts(res.data?.alerts || []);
    } catch (error) {
      console.error(
        "Procurement KPI summary error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      setSummary({});
      setAlerts([]);

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load procurement KPI summary"
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.year, filters.month]);

  const fetchTrends = useCallback(async () => {
    try {
      setTrendLoading(true);

      const res = await API.get("/api/procurement-kpis/trends", {
        params: {
          months: 6,
        },
      });

      setTrends(res.data?.trends || res.data?.data || []);
    } catch (error) {
      console.error(
        "Procurement KPI trends error:",
        error.response?.data || error.message
      );

      setTrends([]);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  const fetchVendorKpis = useCallback(async () => {
    try {
      setVendorLoading(true);

      const res = await API.get("/api/procurement-kpis/vendors", {
        params: {
          year: filters.year,
          month: filters.month,
          search: filters.vendor_search || undefined,
        },
      });

      setVendorKpis(res.data?.vendors || res.data?.data || []);
    } catch (error) {
      console.error(
        "Procurement vendor KPI error:",
        error.response?.data || error.message
      );

      setVendorKpis([]);
    } finally {
      setVendorLoading(false);
    }
  }, [filters.year, filters.month, filters.vendor_search]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorKpis();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchVendorKpis]);

  const refreshAll = () => {
    fetchSummary();
    fetchTrends();
    fetchVendorKpis();
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleExport = () => {
    if (!vendorKpis.length) {
      showMessage("error", "No vendor KPI data available to export");
      return;
    }

    exportCsv(vendorKpis, `procurement-vendor-kpi-${filters.year}-${filters.month}.csv`);
  };

  return (
    <AdminLayout>
      <div className="kpi-page">
        <style>{css}</style>

        <div className="kpi-hero">
          <div>
            <div className="eyebrow">
              <BarChart3 size={15} />
              Procurement Intelligence
            </div>

            <h1>Procurement KPI Dashboard</h1>

            <p>
              Monitor purchase value, vendor outstanding, payment completion,
              budget usage, return rate, delivery performance and monthly
              procurement trends.
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-dark-btn"
              onClick={handleExport}
            >
              <Download size={17} />
              Export Vendor KPI
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={refreshAll}
              disabled={summaryLoading || trendLoading || vendorLoading}
            >
              {summaryLoading || trendLoading || vendorLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
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
              Procurement KPI backend route is not connected yet. Add
              /api/procurement-kpis and restart backend.
            </span>
          </div>
        )}

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>
              KPI Filters · {selectedMonthLabel} {filters.year}
            </span>
          </div>

          <div className="filter-grid">
            <input
              type="number"
              value={filters.year}
              onChange={(event) => handleFilterChange("year", event.target.value)}
            />

            <select
              value={filters.month}
              onChange={(event) => handleFilterChange("month", event.target.value)}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.vendor_search}
                onChange={(event) =>
                  handleFilterChange("vendor_search", event.target.value)
                }
                placeholder="Search vendor KPI..."
              />
            </div>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard
            title="Purchase Value"
            value={formatCurrency(summary.total_purchase_value || 0)}
            icon={ShoppingCart}
          />

          <SummaryCard
            title="Paid Value"
            value={formatCurrency(summary.total_paid_value || 0)}
            icon={Wallet}
            success
          />

          <SummaryCard
            title="Outstanding"
            value={formatCurrency(summary.outstanding_value || 0)}
            icon={IndianRupee}
            danger
          />

          <SummaryCard
            title="Budget Usage"
            value={`${formatNumber(summary.budget_usage_percent || 0)}%`}
            icon={TrendingUp}
            warning={Number(summary.budget_usage_percent || 0) >= 80}
          />

          <SummaryCard
            title="Active Vendors"
            value={summary.active_vendors || 0}
            icon={Building2}
          />
        </div>

        <div className="metric-grid">
          <MetricCard
            title="Payment Completion"
            value={`${formatNumber(summary.payment_completion_percent || 0)}%`}
            icon={CheckCircle2}
            sub={`${formatCurrency(summary.total_paid_value || 0)} paid`}
          />

          <MetricCard
            title="Return Rate"
            value={`${formatNumber(summary.return_rate_percent || 0)}%`}
            icon={PackageCheck}
            sub={`${formatCurrency(summary.total_return_value || 0)} returns`}
            danger={Number(summary.return_rate_percent || 0) >= 10}
          />

          <MetricCard
            title="On-Time Delivery"
            value={`${formatNumber(summary.on_time_delivery_percent || 0)}%`}
            icon={Truck}
            sub={`${summary.on_time_receipts || 0} on-time / ${
              summary.delayed_receipts || 0
            } delayed`}
          />

          <MetricCard
            title="Pending Approvals"
            value={summary.pending_approvals || 0}
            icon={Clock3}
            sub={formatCurrency(summary.pending_approval_amount || 0)}
            warning={Number(summary.pending_approvals || 0) > 0}
          />
        </div>

        {alerts.length > 0 && (
          <div className="alert-card">
            <div className="section-head">
              <div>
                <h2>KPI Alerts</h2>
                <p>Important warnings generated from current procurement data.</p>
              </div>
            </div>

            <div className="alert-list">
              {alerts.map((alert, index) => (
                <div className={`alert-item ${alert.type}`} key={`${alert.title}-${index}`}>
                  <ShieldAlert size={18} />

                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Monthly Procurement Trend</h2>
                <p>Purchase, paid and return value for the last 6 months.</p>
              </div>
            </div>

            {trendLoading ? (
              <EmptySmall loading text="Loading trends..." />
            ) : trends.length === 0 ? (
              <EmptySmall text="No monthly trend data found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={310}>
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="purchase_value"
                      name="Purchase"
                      stroke="#facc15"
                      fill="#facc15"
                      fillOpacity={0.22}
                    />
                    <Area
                      type="monotone"
                      dataKey="paid_value"
                      name="Paid"
                      stroke="#16a34a"
                      fill="#16a34a"
                      fillOpacity={0.16}
                    />
                    <Area
                      type="monotone"
                      dataKey="return_value"
                      name="Returns"
                      stroke="#e11d48"
                      fill="#e11d48"
                      fillOpacity={0.12}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>PO Status Snapshot</h2>
                <p>Purchase order stage split for selected month.</p>
              </div>
            </div>

            <div className="chart-box">
              <ResponsiveContainer width="100%" height={310}>
                <BarChart data={purchaseStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Orders" fill="#111111" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="section-head">
            <div>
              <h2>Top Vendor Purchase vs Outstanding</h2>
              <p>Compare purchase value and outstanding amount vendor-wise.</p>
            </div>
          </div>

          {vendorChartData.length === 0 ? (
            <EmptySmall text="No vendor KPI chart data found" />
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={330}>
                <LineChart data={vendorChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="vendor" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="purchase"
                    name="Purchase"
                    stroke="#facc15"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="outstanding"
                    name="Outstanding"
                    stroke="#e11d48"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Vendor KPI Report</h2>
              <p>
                Vendor-wise purchase value, paid value, outstanding, return rate
                and payment completion.
              </p>
            </div>
          </div>

          {vendorLoading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Loading vendor KPI...</h3>
              <p>Please wait while vendor KPI report is loading.</p>
            </div>
          ) : vendorKpis.length === 0 ? (
            <div className="empty-box">
              <Building2 size={34} />
              <h3>No vendor KPI found</h3>
              <p>Create purchase orders or payments for selected period.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>PO Count</th>
                    <th>Purchase Value</th>
                    <th>Paid Value</th>
                    <th>Outstanding</th>
                    <th>Return Value</th>
                    <th>Payment %</th>
                    <th>Return %</th>
                  </tr>
                </thead>

                <tbody>
                  {vendorKpis.map((vendor) => (
                    <tr key={vendor.vendor_id}>
                      <td>
                        <div className="vendor-cell">
                          <Building2 size={16} />
                          <div>
                            <strong>{vendor.vendor_name || "-"}</strong>
                            <span>{vendor.phone || vendor.email || "-"}</span>
                          </div>
                        </div>
                      </td>

                      <td>{vendor.total_purchase_orders || 0}</td>
                      <td>{formatCurrency(vendor.total_purchase_value || 0)}</td>
                      <td>
                        <span className="amount-success">
                          {formatCurrency(vendor.total_paid_value || 0)}
                        </span>
                      </td>
                      <td>
                        <span className="amount-danger">
                          {formatCurrency(vendor.outstanding_value || 0)}
                        </span>
                      </td>
                      <td>{formatCurrency(vendor.total_return_value || 0)}</td>

                      <td>
                        <ProgressCell value={vendor.payment_percent || 0} />
                      </td>

                      <td>
                        <ProgressCell
                          value={vendor.return_percent || 0}
                          danger={Number(vendor.return_percent || 0) >= 10}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, value, icon: Icon, success, danger, warning }) {
  return (
    <div
      className={`summary-card ${success ? "success" : ""} ${
        danger ? "danger" : ""
      } ${warning ? "warning" : ""}`}
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

function MetricCard({ title, value, sub, icon: Icon, danger, warning }) {
  return (
    <div className={`metric-card ${danger ? "danger" : ""} ${warning ? "warning" : ""}`}>
      <div className="metric-icon">
        <Icon size={19} />
      </div>

      <div>
        <h3>{value}</h3>
        <p>{title}</p>
        <span>{sub}</span>
      </div>
    </div>
  );
}

function ProgressCell({ value, danger }) {
  const number = Number(value || 0);

  return (
    <div className="progress-cell">
      <strong className={danger ? "amount-danger" : ""}>{formatNumber(number)}%</strong>

      <div className="mini-progress">
        <div
          className={danger ? "danger" : ""}
          style={{ width: `${Math.min(number, 100)}%` }}
        />
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

const css = `
  .kpi-page {
    color: #111827;
  }

  .kpi-hero {
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

  .kpi-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .kpi-hero p {
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

  .primary-btn:disabled {
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
  .metric-card,
  .alert-card,
  .chart-card,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .filter-card,
  .alert-card,
  .chart-card,
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
  .filter-grid select {
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

  .summary-card.danger .summary-icon {
    background: #fff1f2;
    color: #e11d48;
  }

  .summary-card.warning .summary-icon {
    background: #fffbeb;
    color: #b45309;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .metric-card {
    padding: 18px;
    border-radius: 22px;
    display: flex;
    gap: 13px;
    align-items: flex-start;
  }

  .metric-icon {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    background: #fffbeb;
    color: #b45309;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .metric-card h3 {
    margin: 0;
    color: #111;
    font-size: 20px;
    font-weight: 950;
  }

  .metric-card p {
    margin: 5px 0 0;
    color: #111;
    font-size: 13px;
    font-weight: 950;
  }

  .metric-card span {
    display: block;
    margin-top: 5px;
    color: #777;
    font-size: 12px;
    font-weight: 800;
  }

  .metric-card.danger .metric-icon {
    background: #fff1f2;
    color: #e11d48;
  }

  .metric-card.warning .metric-icon {
    background: #fffbeb;
    color: #b45309;
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

  .alert-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .alert-item {
    border-radius: 18px;
    padding: 14px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border: 1px solid #e5e7eb;
    background: #fafafa;
  }

  .alert-item strong {
    display: block;
    color: #111;
    font-size: 13px;
    font-weight: 950;
    margin-bottom: 4px;
  }

  .alert-item span {
    color: #52525b;
    font-size: 12px;
    line-height: 1.5;
    font-weight: 800;
  }

  .alert-item.danger {
    background: #fff1f2;
    border-color: #fecdd3;
    color: #e11d48;
  }

  .alert-item.warning {
    background: #fffbeb;
    border-color: #fde68a;
    color: #b45309;
  }

  .alert-item.info {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #2563eb;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 1.4fr 0.8fr;
    gap: 22px;
  }

  .chart-box {
    width: 100%;
    min-height: 310px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1200px;
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

  .vendor-cell {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .vendor-cell strong {
    display: block;
    color: #111;
    font-weight: 950;
  }

  .vendor-cell span {
    display: block;
    color: #777;
    font-size: 12px;
    margin-top: 4px;
  }

  .amount-success {
    color: #047857;
    font-weight: 950;
  }

  .amount-danger {
    color: #e11d48;
    font-weight: 950;
  }

  .progress-cell strong {
    display: block;
    color: #111;
    font-weight: 950;
    margin-bottom: 6px;
  }

  .mini-progress {
    width: 110px;
    height: 8px;
    border-radius: 999px;
    background: #f4f4f5;
    overflow: hidden;
  }

  .mini-progress div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, #facc15, #eab308);
  }

  .mini-progress div.danger {
    background: linear-gradient(135deg, #fb7185, #e11d48);
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
    min-height: 310px;
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
    .metric-grid,
    .alert-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dashboard-grid,
    .filter-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .kpi-hero {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .secondary-dark-btn {
      width: 100%;
    }

    .summary-grid,
    .metric-grid,
    .alert-list {
      grid-template-columns: 1fr;
    }
  }
`;
