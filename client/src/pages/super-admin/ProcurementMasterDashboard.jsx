import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  BarChart3,
  BellRing,
  CheckCircle2,
  FileText,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import "./procurementFinalPages.css";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

export default function ProcurementMasterDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [filters, setFilters] = useState({ from_date: "", to_date: "" });
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [dashboardRes, healthRes] = await Promise.all([
        API.get("/api/procurement-master-dashboard", {
          params: {
            from_date: filters.from_date || undefined,
            to_date: filters.to_date || undefined,
          },
        }),
        API.get("/api/procurement-master-dashboard/health"),
      ]);

      setDashboard(dashboardRes.data || null);
      setHealth(healthRes.data || null);
    } catch (error) {
      console.error("Master dashboard error:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const summary = dashboard?.summary || {};
  const modules = dashboard?.modules || {};
  const activity = dashboard?.recent_activity || [];

  return (
    <AdminLayout>
      <div className="final-proc-page">
        <div className="final-hero">
          <div>
            <div className="final-eyebrow">
              <LayoutDashboard size={15} />
              Procurement Control Center
            </div>
            <h1>Procurement Master Dashboard</h1>
            <p>Complete control center for purchase value, payments, alerts, approvals, contracts and documents.</p>
          </div>

          <div className="final-actions">
            <button className="final-btn secondary" onClick={fetchDashboard} disabled={loading}>
              {loading ? <Loader2 size={17} className="final-spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>
          </div>
        </div>

        <div className="final-card">
          <div className="final-section-head">
            <div>
              <h2>Period Filter</h2>
              <p>Filter procurement dashboard by date range.</p>
            </div>
          </div>

          <div className="final-grid three">
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))}
            />
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))}
            />
            <button className="final-btn dark" onClick={() => setFilters({ from_date: "", to_date: "" })}>
              Clear
            </button>
          </div>
        </div>

        {loading && !dashboard ? (
          <div className="final-empty">
            <Loader2 size={30} className="final-spin" />
            <h3>Loading master dashboard...</h3>
          </div>
        ) : (
          <>
            <div className="final-grid five" style={{ marginBottom: 22 }}>
              <SummaryCard title="Purchase Value" value={formatCurrency(summary.procurement_value)} icon={IndianRupee} />
              <SummaryCard title="Paid Value" value={formatCurrency(summary.paid_value)} icon={CheckCircle2} />
              <SummaryCard title="Outstanding" value={formatCurrency(summary.outstanding_value)} icon={AlertCircle} />
              <SummaryCard title="Open Alerts" value={summary.open_alerts || 0} icon={BellRing} />
              <SummaryCard title="Health Score" value={`${summary.health_score || 0}%`} icon={BarChart3} />
            </div>

            <div className="final-grid five" style={{ marginBottom: 22 }}>
              <SummaryCard title="Purchase Orders" value={summary.purchase_orders_count || 0} icon={ShoppingCart} />
              <SummaryCard title="GRN Count" value={summary.goods_receipts_count || 0} icon={FileText} />
              <SummaryCard title="Payments" value={summary.payments_count || 0} icon={IndianRupee} />
              <SummaryCard title="Returns" value={summary.returns_count || 0} icon={AlertCircle} />
              <SummaryCard title="Documents" value={summary.documents_count || 0} icon={FileText} />
            </div>

            <div className="final-grid two">
              <div className="final-card">
                <div className="final-section-head">
                  <div>
                    <h2>Module Health</h2>
                    <p>Procurement module status overview.</p>
                  </div>
                </div>

                <div className="final-table-wrap">
                  <table className="final-table">
                    <thead>
                      <tr>
                        <th>Module</th>
                        <th>Total</th>
                        <th>Active</th>
                        <th>Pending</th>
                        <th>Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(modules).map(([key, value]) => (
                        <tr key={key}>
                          <td>{key.replaceAll("_", " ")}</td>
                          <td>{value?.total ?? value?.count ?? 0}</td>
                          <td>{value?.active ?? value?.approved_count ?? "-"}</td>
                          <td>{value?.pending ?? value?.pending_count ?? "-"}</td>
                          <td>{value?.closed ?? value?.completed_count ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="final-card">
                <div className="final-section-head">
                  <div>
                    <h2>System Health Checks</h2>
                    <p>Procurement control warnings and good statuses.</p>
                  </div>
                </div>

                {!health?.checks?.length ? (
                  <div className="final-empty">
                    <BarChart3 size={30} />
                    <h3>No health checks found</h3>
                  </div>
                ) : (
                  <div className="final-grid">
                    {health.checks.map((check) => (
                      <div className="final-summary-card" key={check.title}>
                        <div>
                          <h3>{check.value}</h3>
                          <p>{check.title}</p>
                          <span style={{ color: "#777", fontSize: 13 }}>{check.message}</span>
                        </div>
                        <span className={check.status === "good" ? "final-badge good" : "final-badge warn"}>
                          {check.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="final-card">
              <div className="final-section-head">
                <div>
                  <h2>Recent Activity</h2>
                  <p>Latest purchase orders, requisitions and alerts.</p>
                </div>
              </div>

              {activity.length === 0 ? (
                <div className="final-empty">
                  <LayoutDashboard size={30} />
                  <h3>No recent activity found</h3>
                </div>
              ) : (
                <div className="final-table-wrap">
                  <table className="final-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Module</th>
                        <th>Title</th>
                        <th>Amount</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.map((item, index) => (
                        <tr key={index}>
                          <td>{formatDate(item.date)}</td>
                          <td>{item.module}</td>
                          <td><strong>{item.title}</strong></td>
                          <td>{item.amount ? formatCurrency(item.amount) : "-"}</td>
                          <td>{item.priority ? <span className="final-badge warn">{item.priority}</span> : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <div className="final-summary-card">
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="final-summary-icon">
        <Icon size={20} />
      </div>
    </div>
  );
}
