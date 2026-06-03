import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const todayDate = () => new Date().toISOString().slice(0, 10);

const defaultFilters = {
  search: "",
  module_name: "",
  action_type: "",
  from_date: "",
  to_date: "",
};

const MODULE_OPTIONS = [
  { value: "", label: "All Modules" },
  { value: "rfq", label: "RFQ" },
  { value: "quotation", label: "Quotation" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "procurement_payment", label: "Procurement Payment" },
  { value: "vendor_settlement", label: "Vendor Settlement" },
  { value: "vendor_ledger", label: "Vendor Ledger" },
  { value: "procurement_budget", label: "Budget Control" },
  { value: "vendor_performance", label: "Vendor Performance" },
];

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "approval_request", label: "Approval Request" },
];

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

const getModuleLabel = (value) => {
  return MODULE_OPTIONS.find((item) => item.value === value)?.label || value || "-";
};

const getActionLabel = (value) => {
  return ACTION_OPTIONS.find((item) => item.value === value)?.label || value || "-";
};

const getActionClass = (action) => {
  if (action === "create") return "action create";
  if (action === "update") return "action update";
  if (action === "delete") return "action delete";
  if (action === "approve") return "action approve";
  if (action === "reject") return "action reject";
  if (action === "approval_request") return "action request";
  return "action";
};

const prettyJson = (value) => {
  if (!value) return "-";

  try {
    if (typeof value === "string") {
      return JSON.stringify(JSON.parse(value), null, 2);
    }

    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default function ProcurementAudit() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({});
  const [modules, setModules] = useState([]);
  const [actions, setActions] = useState([]);
  const [latestLogs, setLatestLogs] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [selectedLog, setSelectedLog] = useState(null);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const activeDateText = useMemo(() => {
    if (filters.from_date && filters.to_date) {
      return `${filters.from_date} to ${filters.to_date}`;
    }

    if (filters.from_date) return `From ${filters.from_date}`;
    if (filters.to_date) return `Until ${filters.to_date}`;

    return "All Time";
  }, [filters.from_date, filters.to_date]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementAuditTimer);
    window.__procurementAuditTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);

      const res = await API.get("/api/procurement-audit/summary", {
        params: {
          from_date: filters.from_date || undefined,
          to_date: filters.to_date || undefined,
        },
      });

      setSummary(res.data?.summary || {});
      setModules(res.data?.modules || []);
      setActions(res.data?.actions || []);
      setLatestLogs(res.data?.latest_logs || []);
    } catch (error) {
      console.error(
        "Procurement audit summary error:",
        error.response?.data || error.message
      );

      setSummary({});
      setModules([]);
      setActions([]);
      setLatestLogs([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.from_date, filters.to_date]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-audit", {
        params: {
          search: filters.search || undefined,
          module_name: filters.module_name || undefined,
          action_type: filters.action_type || undefined,
          from_date: filters.from_date || undefined,
          to_date: filters.to_date || undefined,
        },
      });

      setLogs(res.data?.logs || res.data?.data || []);
    } catch (error) {
      console.error(
        "Procurement audit logs error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load procurement audit logs"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const refreshAll = () => {
    fetchSummary();
    fetchLogs();
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

  const setTodayFilter = () => {
    const today = todayDate();

    setFilters((prev) => ({
      ...prev,
      from_date: today,
      to_date: today,
    }));
  };

  return (
    <AdminLayout>
      <div className="audit-page">
        <style>{css}</style>

        <div className="audit-hero">
          <div>
            <div className="eyebrow">
              <ShieldCheck size={15} />
              Procurement Security
            </div>

            <h1>Procurement Audit Trail</h1>

            <p>
              Track every procurement activity including approval requests,
              approvals, rejections, settlements, updates and deleted records.
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-dark-btn"
              onClick={setTodayFilter}
            >
              <Clock3 size={17} />
              Today
            </button>

            <button
              type="button"
              className="primary-btn"
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
              Procurement Audit backend route is not connected yet. Add
              /api/procurement-audit and restart backend.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard title="Total Logs" value={summary.total_logs || 0} icon={Activity} />
          <SummaryCard title="Created" value={summary.created_count || 0} icon={FileText} success />
          <SummaryCard title="Updated" value={summary.updated_count || 0} icon={RefreshCw} />
          <SummaryCard title="Approved" value={summary.approved_count || 0} icon={CheckCircle2} success />
          <SummaryCard title="Rejected / Deleted" value={(summary.rejected_count || 0) + (summary.deleted_count || 0)} icon={Trash2} danger />
        </div>

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>Audit Filters · {activeDateText}</span>
          </div>

          <div className="filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => handleFilterChange("search", event.target.value)}
                placeholder="Search reference, action, remarks, user..."
              />
            </div>

            <select
              value={filters.module_name}
              onChange={(event) => handleFilterChange("module_name", event.target.value)}
            >
              {MODULE_OPTIONS.map((module) => (
                <option key={module.value} value={module.value}>
                  {module.label}
                </option>
              ))}
            </select>

            <select
              value={filters.action_type}
              onChange={(event) => handleFilterChange("action_type", event.target.value)}
            >
              {ACTION_OPTIONS.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.from_date}
              onChange={(event) => handleFilterChange("from_date", event.target.value)}
            />

            <input
              type="date"
              value={filters.to_date}
              onChange={(event) => handleFilterChange("to_date", event.target.value)}
            />

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="mini-grid">
          <div className="mini-card">
            <div className="section-head">
              <div>
                <h2>Module Activity</h2>
                <p>Activity count by procurement module.</p>
              </div>
            </div>

            {modules.length === 0 ? (
              <EmptySmall text="No module activity found" />
            ) : (
              <div className="mini-list">
                {modules.slice(0, 8).map((module) => (
                  <button
                    type="button"
                    key={module.module_name}
                    className="mini-row"
                    onClick={() => handleFilterChange("module_name", module.module_name)}
                  >
                    <span>{getModuleLabel(module.module_name)}</span>
                    <strong>{module.total_logs}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mini-card">
            <div className="section-head">
              <div>
                <h2>Action Activity</h2>
                <p>Audit split by action type.</p>
              </div>
            </div>

            {actions.length === 0 ? (
              <EmptySmall text="No action activity found" />
            ) : (
              <div className="mini-list">
                {actions.slice(0, 8).map((action) => (
                  <button
                    type="button"
                    key={action.action_type}
                    className="mini-row"
                    onClick={() => handleFilterChange("action_type", action.action_type)}
                  >
                    <span>{getActionLabel(action.action_type)}</span>
                    <strong>{action.total_logs}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mini-card">
            <div className="section-head">
              <div>
                <h2>Latest Activity</h2>
                <p>Last 10 procurement actions.</p>
              </div>
            </div>

            {latestLogs.length === 0 ? (
              <EmptySmall text="No latest logs found" />
            ) : (
              <div className="latest-list">
                {latestLogs.slice(0, 6).map((log) => (
                  <div className="latest-row" key={log.id}>
                    <span className={getActionClass(log.action_type)}>
                      {getActionLabel(log.action_type)}
                    </span>

                    <div>
                      <strong>{log.reference_number || getModuleLabel(log.module_name)}</strong>
                      <p>{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Audit Logs</h2>
              <p>Complete procurement action history. Latest 500 logs shown.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Loading audit logs...</h3>
              <p>Please wait while procurement history is loading.</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-box">
              <ShieldCheck size={34} />
              <h3>No audit logs found</h3>
              <p>Create approvals or settlements to generate audit logs.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Module</th>
                    <th>Reference</th>
                    <th>Action</th>
                    <th>Action Label</th>
                    <th>Performed By</th>
                    <th>Remarks</th>
                    <th className="right">View</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.created_at)}</td>

                      <td>
                        <strong>{getModuleLabel(log.module_name)}</strong>
                      </td>

                      <td>{log.reference_number || "-"}</td>

                      <td>
                        <span className={getActionClass(log.action_type)}>
                          {getActionLabel(log.action_type)}
                        </span>
                      </td>

                      <td>{log.action_label || "-"}</td>

                      <td>
                        <div className="user-cell">
                          <UserRound size={15} />
                          <span>{log.performed_by_name || log.performed_by || "-"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="remarks-text">{log.remarks || "-"}</div>
                      </td>

                      <td className="right">
                        <button
                          type="button"
                          className="view-btn"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedLog && (
          <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="audit-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <h2>Audit Log Details</h2>
                  <p>{selectedLog.reference_number || getModuleLabel(selectedLog.module_name)}</p>
                </div>

                <button type="button" className="close-btn" onClick={() => setSelectedLog(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="detail-grid">
                <DetailItem label="Module" value={getModuleLabel(selectedLog.module_name)} />
                <DetailItem label="Action" value={getActionLabel(selectedLog.action_type)} />
                <DetailItem label="Reference" value={selectedLog.reference_number || "-"} />
                <DetailItem label="Performed By" value={selectedLog.performed_by_name || selectedLog.performed_by || "-"} />
                <DetailItem label="Date Time" value={formatDateTime(selectedLog.created_at)} />
                <DetailItem label="IP Address" value={selectedLog.ip_address || "-"} />
              </div>

              <div className="json-section">
                <h3>Remarks</h3>
                <p>{selectedLog.remarks || "-"}</p>
              </div>

              <div className="json-grid">
                <div className="json-section">
                  <h3>Old Values</h3>
                  <pre>{prettyJson(selectedLog.old_values)}</pre>
                </div>

                <div className="json-section">
                  <h3>New Values</h3>
                  <pre>{prettyJson(selectedLog.new_values)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
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

function EmptySmall({ text }) {
  return (
    <div className="empty-small">
      <Activity size={26} />
      <p>{text}</p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const css = `
  .audit-page {
    color: #111827;
  }

  .audit-hero {
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

  .audit-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .audit-hero p {
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

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .summary-card,
  .filter-card,
  .mini-card,
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
    font-size: 22px;
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
  }

  .summary-card.success .summary-icon {
    background: #ecfdf5;
    color: #047857;
  }

  .summary-card.danger .summary-icon {
    background: #fff1f2;
    color: #e11d48;
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
  .mini-card,
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
    grid-template-columns: 1.5fr 1fr 1fr 0.8fr 0.8fr auto;
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

  .mini-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr;
    gap: 22px;
  }

  .section-head {
    margin-bottom: 16px;
  }

  .section-head h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 950;
    color: #111;
  }

  .section-head p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
  }

  .mini-list,
  .latest-list {
    display: grid;
    gap: 10px;
  }

  .mini-row {
    border: 1px solid #eee;
    background: #fafafa;
    border-radius: 16px;
    min-height: 46px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    font-family: inherit;
  }

  .mini-row span,
  .mini-row strong {
    font-size: 13px;
    font-weight: 950;
    color: #111;
  }

  .latest-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
    align-items: flex-start;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 10px;
  }

  .latest-row strong {
    display: block;
    font-size: 13px;
    color: #111;
  }

  .latest-row p {
    margin: 4px 0 0;
    color: #777;
    font-size: 12px;
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

  .action {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
    background: #f4f4f5;
    color: #52525b;
  }

  .action.create {
    background: #ecfdf5;
    color: #047857;
  }

  .action.update,
  .action.request {
    background: #eff6ff;
    color: #2563eb;
  }

  .action.delete,
  .action.reject {
    background: #fff1f2;
    color: #e11d48;
  }

  .action.approve {
    background: #f0fdf4;
    color: #16a34a;
  }

  .user-cell {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #111;
    font-weight: 900;
  }

  .remarks-text {
    max-width: 260px;
    color: #52525b;
    line-height: 1.5;
  }

  .view-btn,
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

  .close-btn {
    background: #f4f4f5;
    color: #111;
  }

  .right {
    text-align: right;
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
    min-height: 210px;
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

  .audit-modal {
    width: min(1050px, 96vw);
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .json-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .json-section {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 18px;
    padding: 16px;
    margin-bottom: 14px;
  }

  .json-section h3 {
    margin: 0 0 10px;
    font-size: 14px;
    font-weight: 950;
    color: #111;
  }

  .json-section p {
    margin: 0;
    color: #52525b;
    font-size: 13px;
    line-height: 1.6;
  }

  .json-section pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.6;
    color: #27272a;
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
    .mini-grid,
    .filter-grid,
    .detail-grid,
    .json-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .audit-hero {
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
