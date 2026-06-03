import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import "./procurementFinalPages.css";

const defaultForm = {
  alert_type: "manual",
  alert_title: "",
  alert_message: "",
  module_name: "",
  record_id: "",
  reference_number: "",
  priority: "normal",
  due_date: "",
  assigned_to_name: "",
};

const badgeClass = (priority, status) => {
  if (status === "resolved") return "final-badge good";
  if (priority === "urgent") return "final-badge danger";
  if (priority === "high") return "final-badge warn";
  return "final-badge";
};

export default function ProcurementAlerts() {
  const [summary, setSummary] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [formData, setFormData] = useState(defaultForm);
  const [filters, setFilters] = useState({ alert_status: "open", priority: "", search: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3500);
  };

  const fetchSummary = useCallback(async () => {
    const res = await API.get("/api/procurement-alerts/summary");
    setSummary(res.data?.summary || {});
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/procurement-alerts", {
        params: {
          alert_status: filters.alert_status || undefined,
          priority: filters.priority || undefined,
          search: filters.search || undefined,
        },
      });
      setAlerts(res.data?.alerts || res.data?.data || []);
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary().catch(console.error);
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(fetchAlerts, 300);
    return () => clearTimeout(timer);
  }, [fetchAlerts]);

  const refreshAll = () => {
    fetchSummary().catch(console.error);
    fetchAlerts();
  };

  const saveAlert = async (e) => {
    e.preventDefault();

    if (!formData.alert_title) {
      showMessage("error", "Alert title required");
      return;
    }

    try {
      setSaving(true);
      await API.post("/api/procurement-alerts", formData);
      showMessage("success", "Alert created successfully");
      setFormData(defaultForm);
      refreshAll();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to save alert");
    } finally {
      setSaving(false);
    }
  };

  const generateAlerts = async () => {
    try {
      setGenerating(true);
      const res = await API.post("/api/procurement-alerts/generate");
      showMessage("success", res.data?.message || "Alerts generated successfully");
      refreshAll();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to generate alerts");
    } finally {
      setGenerating(false);
    }
  };

  const resolveAlert = async (id) => {
    const remarks = window.prompt("Resolution remarks:", "Resolved");
    if (remarks === null) return;

    await API.post(`/api/procurement-alerts/${id}/resolve`, {
      resolution_remarks: remarks,
    });

    showMessage("success", "Alert resolved");
    refreshAll();
  };

  const deleteAlert = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    await API.delete(`/api/procurement-alerts/${id}`);
    showMessage("success", "Alert deleted");
    refreshAll();
  };

  return (
    <AdminLayout>
      <div className="final-proc-page">
        <div className="final-hero">
          <div>
            <div className="final-eyebrow">
              <BellRing size={15} />
              Procurement Alerts
            </div>
            <h1>Procurement Alerts & Reminders</h1>
            <p>Generate and manage pending approvals, contract expiry, delayed PO and overdue request alerts.</p>
          </div>

          <div className="final-actions">
            <button className="final-btn secondary" onClick={refreshAll}>
              <RefreshCw size={17} />
              Refresh
            </button>
            <button className="final-btn primary" onClick={generateAlerts} disabled={generating}>
              {generating ? <Loader2 size={17} className="final-spin" /> : <BellRing size={17} />}
              Generate Alerts
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`final-message ${message.type}`}>
            {message.type === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
            {message.text}
          </div>
        )}

        <div className="final-grid five" style={{ marginBottom: 22 }}>
          <SummaryCard title="Total Alerts" value={summary.total_alerts || 0} icon={BellRing} />
          <SummaryCard title="Open" value={summary.open_count || 0} icon={AlertCircle} />
          <SummaryCard title="Resolved" value={summary.resolved_count || 0} icon={CheckCircle2} />
          <SummaryCard title="Urgent" value={summary.urgent_count || 0} icon={AlertCircle} />
          <SummaryCard title="Overdue" value={summary.overdue_count || 0} icon={BellRing} />
        </div>

        <form className="final-card" onSubmit={saveAlert}>
          <div className="final-section-head">
            <div>
              <h2>Create Manual Alert</h2>
              <p>Create reminders for vendor payment, approval follow-up or delivery issue.</p>
            </div>
            <button className="final-btn dark" disabled={saving}>
              {saving ? <Loader2 size={16} className="final-spin" /> : <Save size={16} />}
              Save Alert
            </button>
          </div>

          <div className="final-grid four">
            <input
              value={formData.alert_title}
              onChange={(e) => setFormData((p) => ({ ...p, alert_title: e.target.value }))}
              placeholder="Alert title"
            />
            <select
              value={formData.alert_type}
              onChange={(e) => setFormData((p) => ({ ...p, alert_type: e.target.value }))}
            >
              <option value="manual">Manual</option>
              <option value="payment_due">Payment Due</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="contract_expiry">Contract Expiry</option>
              <option value="delayed_po">Delayed PO</option>
            </select>
            <select
              value={formData.priority}
              onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
            />
            <input
              value={formData.module_name}
              onChange={(e) => setFormData((p) => ({ ...p, module_name: e.target.value }))}
              placeholder="Module name"
            />
            <input
              value={formData.record_id}
              onChange={(e) => setFormData((p) => ({ ...p, record_id: e.target.value }))}
              placeholder="Record ID"
            />
            <input
              value={formData.reference_number}
              onChange={(e) => setFormData((p) => ({ ...p, reference_number: e.target.value }))}
              placeholder="Reference number"
            />
            <input
              value={formData.assigned_to_name}
              onChange={(e) => setFormData((p) => ({ ...p, assigned_to_name: e.target.value }))}
              placeholder="Assigned to"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <textarea
              value={formData.alert_message}
              onChange={(e) => setFormData((p) => ({ ...p, alert_message: e.target.value }))}
              placeholder="Alert message"
            />
          </div>
        </form>

        <div className="final-card">
          <div className="final-section-head">
            <div>
              <h2>Alert List</h2>
              <p>Open, resolved, urgent and overdue alerts.</p>
            </div>
          </div>

          <div className="final-grid three" style={{ marginBottom: 16 }}>
            <input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search alerts..."
            />
            <select
              value={filters.alert_status}
              onChange={(e) => setFilters((p) => ({ ...p, alert_status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {loading ? (
            <Empty text="Loading alerts..." />
          ) : alerts.length === 0 ? (
            <Empty text="No alerts found" />
          ) : (
            <div className="final-table-wrap">
              <table className="final-table">
                <thead>
                  <tr>
                    <th>Alert</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Assigned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <strong>{alert.alert_title}</strong>
                        <p style={{ margin: "4px 0 0", color: "#777" }}>{alert.alert_message}</p>
                      </td>
                      <td>{alert.alert_type}</td>
                      <td>{alert.reference_number || alert.record_id || "-"}</td>
                      <td><span className={badgeClass(alert.priority)}>{alert.priority}</span></td>
                      <td><span className={badgeClass(alert.priority, alert.alert_status)}>{alert.alert_status}</span></td>
                      <td>{alert.due_date ? String(alert.due_date).slice(0, 10) : "-"}</td>
                      <td>{alert.assigned_to_name || "-"}</td>
                      <td>
                        <div className="final-actions">
                          {alert.alert_status !== "resolved" && (
                            <button className="final-icon-btn good" onClick={() => resolveAlert(alert.id)}>
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button className="final-icon-btn danger" onClick={() => deleteAlert(alert.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
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

function Empty({ text }) {
  return (
    <div className="final-empty">
      <BellRing size={28} />
      <h3>{text}</h3>
      <p>Procurement alerts will appear here.</p>
    </div>
  );
}
