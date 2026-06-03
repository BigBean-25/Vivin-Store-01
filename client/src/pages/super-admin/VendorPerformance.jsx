import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  Filter,
  IndianRupee,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Star,
  TrendingUp,
  Truck,
  Wallet,
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

const gradeOptions = [
  { value: "", label: "All Grades" },
  { value: "A+", label: "A+" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
];

const defaultFilters = {
  search: "",
  score_year: String(currentYear),
  score_month: String(currentMonth),
  vendor_id: "",
  grade: "",
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

const getGradeClass = (grade) => {
  if (grade === "A+") return "grade aplus";
  if (grade === "A") return "grade a";
  if (grade === "B") return "grade b";
  if (grade === "C") return "grade c";
  return "grade d";
};

const getStatusLabel = (status) => {
  if (status === "excellent") return "Excellent";
  if (status === "good") return "Good";
  if (status === "average") return "Average";
  if (status === "needs_improvement") return "Needs Improvement";
  if (status === "poor") return "Poor";
  return status || "-";
};

const getStatusClass = (status) => {
  if (status === "excellent") return "status excellent";
  if (status === "good") return "status good";
  if (status === "average") return "status average";
  if (status === "needs_improvement") return "status warning";
  return "status danger";
};

const exportCsv = (rows, fileName) => {
  if (!rows.length) return;

  const headers = [
    "Vendor",
    "Purchase Orders",
    "Purchase Value",
    "On Time Orders",
    "Delayed Orders",
    "Delivery Score",
    "Return Value",
    "Quality Score",
    "Paid Value",
    "Payment Score",
    "Quotation Count",
    "Accepted Quotations",
    "Quotation Score",
    "Overall Score",
    "Grade",
    "Status",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((item) =>
      [
        item.vendor_name,
        item.purchase_orders_count,
        item.total_purchase_value,
        item.on_time_orders,
        item.delayed_orders,
        item.delivery_score,
        item.return_value,
        item.quality_score,
        item.paid_value,
        item.payment_score,
        item.quotation_count,
        item.accepted_quotation_count,
        item.quotation_score,
        item.overall_score,
        item.performance_grade,
        getStatusLabel(item.performance_status),
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

export default function VendorPerformance() {
  const [scorecards, setScorecards] = useState([]);
  const [summary, setSummary] = useState({});
  const [topVendors, setTopVendors] = useState([]);
  const [riskVendors, setRiskVendors] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const [message, setMessage] = useState({ type: "", text: "" });
  const [apiMissing, setApiMissing] = useState(false);

  const gradeDistribution = useMemo(() => {
    return [
      { name: "A+", value: Number(summary.grade_a_plus || 0) },
      { name: "A", value: Number(summary.grade_a || 0) },
      { name: "B", value: Number(summary.grade_b || 0) },
      { name: "C", value: Number(summary.grade_c || 0) },
      { name: "D", value: Number(summary.grade_d || 0) },
    ].filter((item) => item.value > 0);
  }, [summary]);

  const chartTopVendors = useMemo(() => {
    const source = topVendors.length ? topVendors : scorecards;

    return source
      .slice()
      .sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
      .slice(0, 10)
      .map((item) => ({
        vendor: item.vendor_name || "-",
        score: Number(item.overall_score || 0),
      }));
  }, [topVendors, scorecards]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__vendorPerformanceTimer);
    window.__vendorPerformanceTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchVendors = useCallback(async () => {
    try {
      const res = await API.get("/api/vendors");

      setVendors(
        getArray(res, ["vendors", "data", "vendorList", "vendor_list"])
      );
    } catch (error) {
      console.error("Vendor dropdown error:", error.response?.data || error);
      setVendors([]);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);

      const res = await API.get("/api/vendor-performance/summary", {
        params: {
          score_year: filters.score_year || currentYear,
          score_month: filters.score_month || currentMonth,
        },
      });

      setSummary(res.data?.summary || {});
      setTopVendors(res.data?.top_vendors || []);
      setRiskVendors(res.data?.risk_vendors || []);
    } catch (error) {
      console.error(
        "Vendor performance summary error:",
        error.response?.data || error.message
      );

      setSummary({});
      setTopVendors([]);
      setRiskVendors([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.score_year, filters.score_month]);

  const fetchScorecards = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/vendor-performance", {
        params: {
          search: filters.search || undefined,
          score_year: filters.score_year || undefined,
          score_month: filters.score_month || undefined,
          vendor_id: filters.vendor_id || undefined,
          grade: filters.grade || undefined,
        },
      });

      setScorecards(res.data?.scorecards || res.data?.data || []);
    } catch (error) {
      console.error(
        "Vendor performance error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load vendor performance"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchScorecards();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchScorecards]);

  const refreshAll = () => {
    fetchSummary();
    fetchScorecards();
    fetchVendors();
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

  const handleSnapshot = async () => {
    try {
      setSnapshotLoading(true);

      const res = await API.post("/api/vendor-performance/snapshot", {
        score_year: Number(filters.score_year || currentYear),
        score_month: Number(filters.score_month || currentMonth),
      });

      showMessage(
        "success",
        res.data?.message || "Vendor performance snapshot saved successfully"
      );

      refreshAll();
    } catch (error) {
      console.error(
        "Save vendor performance snapshot error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to save vendor performance snapshot"
      );
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleExport = () => {
    if (!scorecards.length) {
      showMessage("error", "No vendor performance data available to export");
      return;
    }

    exportCsv(
      scorecards,
      `vendor-performance-${filters.score_year}-${filters.score_month}.csv` 
    );
  };

  return (
    <AdminLayout>
      <div className="vendor-performance-page">
        <style>{css}</style>

        <div className="performance-hero">
          <div>
            <div className="eyebrow">
              <Award size={15} />
              Procurement Intelligence
            </div>

            <h1>Vendor Performance Scorecard</h1>

            <p>
              Track vendor delivery quality, purchase value, payment settlement,
              quotation conversion and overall performance score month-wise.
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-dark-btn"
              onClick={refreshAll}
              disabled={loading || summaryLoading}
            >
              {loading || summaryLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

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
              className="primary-btn"
              onClick={handleSnapshot}
              disabled={snapshotLoading}
            >
              {snapshotLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <Save size={17} />
              )}
              Save Snapshot
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
              Vendor Performance backend route is not connected yet. Add
              /api/vendor-performance and restart backend.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard
            title="Total Vendors"
            value={summary.total_vendors || 0}
            icon={Building2}
          />

          <SummaryCard
            title="Average Score"
            value={`${formatNumber(summary.average_score || 0)}%`}
            icon={Star}
            success
          />

          <SummaryCard
            title="Purchase Value"
            value={formatCurrency(summary.total_purchase_value || 0)}
            icon={IndianRupee}
          />

          <SummaryCard
            title="Paid Value"
            value={formatCurrency(summary.total_paid_value || 0)}
            icon={Wallet}
            success
          />

          <SummaryCard
            title="Risk Vendors"
            value={summary.risk_vendors || 0}
            icon={ShieldAlert}
            danger
          />
        </div>

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>Performance Filters</span>
          </div>

          <div className="filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange("search", event.target.value)
                }
                placeholder="Search vendor..."
              />
            </div>

            <input
              type="number"
              value={filters.score_year}
              onChange={(event) =>
                handleFilterChange("score_year", event.target.value)
              }
            />

            <select
              value={filters.score_month}
              onChange={(event) =>
                handleFilterChange("score_month", event.target.value)
              }
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

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

            <select
              value={filters.grade}
              onChange={(event) =>
                handleFilterChange("grade", event.target.value)
              }
            >
              {gradeOptions.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Top Vendor Scores</h2>
                <p>Top 10 vendors based on overall performance score.</p>
              </div>
            </div>

            {chartTopVendors.length === 0 ? (
              <EmptySmall text="No top vendor score data found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartTopVendors}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="vendor" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" radius={[10, 10, 0, 0]} fill="#facc15" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Grade Distribution</h2>
                <p>Vendor count by performance grade.</p>
              </div>
            </div>

            {gradeDistribution.length === 0 ? (
              <EmptySmall text="No grade distribution found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={105}
                      label
                    >
                      {gradeDistribution.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            ["#047857", "#16a34a", "#2563eb", "#b45309", "#e11d48"][
                              index
                            ]
                          }
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

        <div className="ranking-card">
          <div className="section-head">
            <div>
              <h2>Top Vendor Ranking</h2>
              <p>Best performing vendors for selected month.</p>
            </div>
          </div>

          {topVendors.length === 0 ? (
            <EmptySmall text="No top vendors found" />
          ) : (
            <div className="ranking-grid">
              {topVendors.slice(0, 5).map((vendor, index) => (
                <div className="rank-card" key={vendor.vendor_id || index}>
                  <div className="rank-number">#{index + 1}</div>

                  <div>
                    <h3>{vendor.vendor_name || "-"}</h3>
                    <p>{formatCurrency(vendor.total_purchase_value || 0)}</p>
                  </div>

                  <div className="rank-score">
                    <strong>{formatNumber(vendor.overall_score || 0)}%</strong>
                    <span className={getGradeClass(vendor.performance_grade)}>
                      {vendor.performance_grade || "D"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {riskVendors.length > 0 && (
          <div className="risk-card">
            <div className="section-head">
              <div>
                <h2>Risk Vendors</h2>
                <p>Vendors needing improvement or below acceptable score.</p>
              </div>
            </div>

            <div className="risk-list">
              {riskVendors.map((vendor) => (
                <div className="risk-item" key={vendor.vendor_id}>
                  <ShieldAlert size={17} />

                  <div>
                    <strong>{vendor.vendor_name || "-"}</strong>
                    <span>
                      Score {formatNumber(vendor.overall_score || 0)}% · Grade{" "}
                      {vendor.performance_grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Vendor Performance Table</h2>
              <p>
                Complete scorecard with delivery, quality, payment and quotation
                scores.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Loading vendor performance...</h3>
              <p>Please wait while scorecards are loading.</p>
            </div>
          ) : scorecards.length === 0 ? (
            <div className="empty-box">
              <Award size={34} />
              <h3>No vendor performance found</h3>
              <p>Create purchase orders, payments or quotations for this month.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>PO Count</th>
                    <th>Purchase Value</th>
                    <th>Delivery</th>
                    <th>Quality</th>
                    <th>Payment</th>
                    <th>Quotation</th>
                    <th>Overall</th>
                    <th>Grade</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {scorecards.map((vendor) => (
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

                      <td>{vendor.purchase_orders_count || 0}</td>

                      <td>{formatCurrency(vendor.total_purchase_value || 0)}</td>

                      <td>
                        <ScoreCell
                          value={vendor.delivery_score}
                          sub={`${vendor.on_time_orders || 0} on-time / ${
                            vendor.delayed_orders || 0
                          } delayed`}
                        />
                      </td>

                      <td>
                        <ScoreCell
                          value={vendor.quality_score}
                          sub={`Return ${formatCurrency(vendor.return_value || 0)}`}
                        />
                      </td>

                      <td>
                        <ScoreCell
                          value={vendor.payment_score}
                          sub={`Paid ${formatCurrency(vendor.paid_value || 0)}`}
                        />
                      </td>

                      <td>
                        <ScoreCell
                          value={vendor.quotation_score}
                          sub={`${vendor.accepted_quotation_count || 0}/${
                            vendor.quotation_count || 0
                          } accepted`}
                        />
                      </td>

                      <td>
                        <strong className="overall-score">
                          {formatNumber(vendor.overall_score || 0)}%
                        </strong>
                      </td>

                      <td>
                        <span className={getGradeClass(vendor.performance_grade)}>
                          {vendor.performance_grade || "D"}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(vendor.performance_status)}>
                          {getStatusLabel(vendor.performance_status)}
                        </span>
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

function SummaryCard({ title, value, icon: Icon, success, danger }) {
  return (
    <div className={`summary-card ${success ? "success" : ""} ${danger ? "danger" : ""}`}>
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

function ScoreCell({ value, sub }) {
  const number = Number(value || 0);

  return (
    <div className="score-cell">
      <strong>{formatNumber(number)}%</strong>

      <div className="mini-progress">
        <div style={{ width: `${Math.min(number, 100)}%` }} />
      </div>

      <span>{sub}</span>
    </div>
  );
}

function EmptySmall({ text }) {
  return (
    <div className="empty-small">
      <BarChart3 size={28} />
      <p>{text}</p>
    </div>
  );
}

const css = `
  .vendor-performance-page {
    color: #111827;
  }

  .performance-hero {
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

  .performance-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .performance-hero p {
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

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .summary-card,
  .filter-card,
  .chart-card,
  .ranking-card,
  .risk-card,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
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

  .filter-card,
  .chart-card,
  .ranking-card,
  .risk-card,
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
    grid-template-columns: 1.4fr 0.7fr 1fr 1fr 0.8fr auto;
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

  .dashboard-grid {
    display: grid;
    grid-template-columns: 1.4fr 0.8fr;
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
    min-height: 300px;
  }

  .ranking-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
  }

  .rank-card {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 20px;
    padding: 16px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
  }

  .rank-number {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    background: #111;
    color: #facc15;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 950;
  }

  .rank-card h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 950;
    color: #111;
  }

  .rank-card p {
    margin: 5px 0 0;
    color: #777;
    font-size: 12px;
    font-weight: 800;
  }

  .rank-score {
    text-align: right;
  }

  .rank-score strong {
    display: block;
    margin-bottom: 7px;
    font-size: 15px;
    color: #111;
  }

  .risk-list {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }

  .risk-item {
    background: #fff1f2;
    color: #e11d48;
    border: 1px solid #fecdd3;
    border-radius: 18px;
    padding: 14px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .risk-item strong {
    display: block;
    color: #111;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .risk-item span {
    display: block;
    font-size: 12px;
    font-weight: 800;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1350px;
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

  .score-cell strong {
    display: block;
    color: #111;
    font-weight: 950;
    margin-bottom: 6px;
  }

  .score-cell span {
    display: block;
    color: #777;
    font-size: 11px;
    margin-top: 5px;
    font-weight: 800;
  }

  .mini-progress {
    width: 100px;
    height: 7px;
    border-radius: 999px;
    background: #f4f4f5;
    overflow: hidden;
  }

  .mini-progress div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, #facc15, #eab308);
  }

  .overall-score {
    color: #111;
    font-size: 15px;
  }

  .grade,
  .status {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .grade.aplus {
    background: #ecfdf5;
    color: #047857;
  }

  .grade.a {
    background: #f0fdf4;
    color: #16a34a;
  }

  .grade.b {
    background: #eff6ff;
    color: #2563eb;
  }

  .grade.c {
    background: #fffbeb;
    color: #b45309;
  }

  .grade.d {
    background: #fff1f2;
    color: #e11d48;
  }

  .status.excellent,
  .status.good {
    background: #ecfdf5;
    color: #047857;
  }

  .status.average {
    background: #eff6ff;
    color: #2563eb;
  }

  .status.warning {
    background: #fffbeb;
    color: #b45309;
  }

  .status.danger {
    background: #fff1f2;
    color: #e11d48;
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
    min-height: 300px;
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
    .ranking-grid,
    .risk-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dashboard-grid,
    .filter-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .performance-hero {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .secondary-dark-btn {
      width: 100%;
    }

    .summary-grid,
    .ranking-grid,
    .risk-list {
      grid-template-columns: 1fr;
    }
  }
`;
