import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import "./procurementFinalPages.css";

const getStatusClass = (status) => {
  if (status === "matched") return "final-badge good";
  if (status === "above_contract" || status === "no_contract") return "final-badge danger";
  if (status === "below_contract") return "final-badge warn";
  return "final-badge";
};

export default function ProcurementRateContractChecks() {
  const [summary, setSummary] = useState({});
  const [checks, setChecks] = useState([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [filters, setFilters] = useState({ search: "", check_status: "" });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3500);
  };

  const fetchSummary = useCallback(async () => {
    const res = await API.get("/api/procurement-rate-contract-checks/summary");
    setSummary(res.data?.summary || {});
  }, []);

  const fetchChecks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/procurement-rate-contract-checks", {
        params: {
          search: filters.search || undefined,
          check_status: filters.check_status || undefined,
        },
      });
      setChecks(res.data?.checks || res.data?.data || []);
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to load checks");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary().catch(console.error);
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(fetchChecks, 300);
    return () => clearTimeout(timer);
  }, [fetchChecks]);

  const refreshAll = () => {
    fetchSummary().catch(console.error);
    fetchChecks();
  };

  const checkPO = async () => {
    if (!purchaseOrderId) {
      showMessage("error", "Enter purchase order ID");
      return;
    }

    try {
      setChecking(true);
      const res = await API.post(`/api/procurement-rate-contract-checks/check-po/${purchaseOrderId}`, {
        replace_existing: true,
      });
      showMessage("success", res.data?.message || "PO rate check completed");
      refreshAll();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to check PO rate contract");
    } finally {
      setChecking(false);
    }
  };

  const deleteCheck = async (id) => {
    if (!window.confirm("Delete this check?")) return;
    await API.delete(`/api/procurement-rate-contract-checks/${id}`);
    showMessage("success", "Rate check deleted");
    refreshAll();
  };

  return (
    <AdminLayout>
      <div className="final-proc-page">
        <div className="final-hero">
          <div>
            <div className="final-eyebrow">
              <BadgeCheck size={15} />
              Rate Contract Checks
            </div>
            <h1>PO Rate Contract Integration</h1>
            <p>Compare PO item price against active vendor rate contract price.</p>
          </div>

          <div className="final-actions">
            <button className="final-btn secondary" onClick={refreshAll}>
              <RefreshCw size={17} />
              Refresh
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
          <SummaryCard title="Total Checks" value={summary.total_checks || 0} icon={BadgeCheck} />
          <SummaryCard title="Matched" value={summary.matched_count || 0} icon={CheckCircle2} />
          <SummaryCard title="Above Contract" value={summary.above_contract_count || 0} icon={AlertCircle} />
          <SummaryCard title="Below Contract" value={summary.below_contract_count || 0} icon={BadgeCheck} />
          <SummaryCard title="No Contract" value={summary.no_contract_count || 0} icon={Search} />
        </div>

        <div className="final-card">
          <div className="final-section-head">
            <div>
              <h2>Check Purchase Order</h2>
              <p>Enter PO ID and check all PO item rates with active vendor rate contract.</p>
            </div>
            <button className="final-btn dark" onClick={checkPO} disabled={checking}>
              {checking ? <Loader2 size={16} className="final-spin" /> : <BadgeCheck size={16} />}
              Check PO
            </button>
          </div>

          <input
            value={purchaseOrderId}
            onChange={(e) => setPurchaseOrderId(e.target.value)}
            placeholder="Purchase Order ID"
          />
        </div>

        <div className="final-card">
          <div className="final-section-head">
            <div>
              <h2>Rate Contract Check History</h2>
              <p>All PO rate contract comparison results.</p>
            </div>
          </div>

          <div className="final-grid two" style={{ marginBottom: 16 }}>
            <input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search product / contract..."
            />
            <select
              value={filters.check_status}
              onChange={(e) => setFilters((p) => ({ ...p, check_status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="matched">Matched</option>
              <option value="above_contract">Above Contract</option>
              <option value="below_contract">Below Contract</option>
              <option value="no_contract">No Contract</option>
            </select>
          </div>

          {loading ? (
            <Empty text="Loading checks..." />
          ) : checks.length === 0 ? (
            <Empty text="No rate checks found" />
          ) : (
            <div className="final-table-wrap">
              <table className="final-table">
                <thead>
                  <tr>
                    <th>PO</th>
                    <th>Product</th>
                    <th>PO Rate</th>
                    <th>Contract Rate</th>
                    <th>Difference</th>
                    <th>Contract</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((row) => (
                    <tr key={row.id}>
                      <td>{row.purchase_order_id}</td>
                      <td>{row.product_name || row.product_id}</td>
                      <td>₹{Number(row.po_rate || 0).toLocaleString("en-IN")}</td>
                      <td>₹{Number(row.contract_rate || 0).toLocaleString("en-IN")}</td>
                      <td>₹{Number(row.difference_amount || 0).toLocaleString("en-IN")}</td>
                      <td>{row.contract_number || "-"}</td>
                      <td><span className={getStatusClass(row.check_status)}>{row.check_status}</span></td>
                      <td>
                        <button className="final-icon-btn danger" onClick={() => deleteCheck(row.id)}>
                          <Trash2 size={15} />
                        </button>
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
      <BadgeCheck size={28} />
      <h3>{text}</h3>
      <p>PO rate contract checks will appear here.</p>
    </div>
  );
}
