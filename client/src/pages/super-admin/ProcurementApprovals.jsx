import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Filter,
  IndianRupee,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  Eye,
  ClipboardList,
  FileText,
  ShoppingCart,
  Wallet,
  HandCoins,
} from "lucide-react";

const MODULES = [
  { value: "", label: "All Modules" },
  { value: "rfq", label: "RFQs" },
  { value: "quotation", label: "Quotations" },
  { value: "purchase_order", label: "Purchase Orders" },
  { value: "procurement_payment", label: "Procurement Payments" },
  { value: "vendor_settlement", label: "Vendor Settlements" },
];

const REQUEST_MODULES = MODULES.filter((item) => item.value);

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const defaultFilters = {
  search: "",
  module_name: "",
  approval_status: "",
  from_date: "",
  to_date: "",
};

const defaultForm = {
  module_name: "purchase_order",
  record_id: "",
  remarks: "",
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
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

const getModuleLabel = (value) => {
  return MODULES.find((item) => item.value === value)?.label || value || "-";
};

const getModuleIcon = (moduleName) => {
  if (moduleName === "rfq") return ClipboardList;
  if (moduleName === "quotation") return FileText;
  if (moduleName === "purchase_order") return ShoppingCart;
  if (moduleName === "procurement_payment") return Wallet;
  if (moduleName === "vendor_settlement") return HandCoins;

  return FileCheck2;
};

const getStatusClass = (status) => {
  if (status === "approved") return "status approved";
  if (status === "rejected") return "status rejected";
  return "status pending";
};

const getRecordReference = (record, moduleName) => {
  if (!record) return "-";

  if (moduleName === "rfq") {
    return record.rfq_number || record.reference_number || `RFQ-${record.id}`;
  }

  if (moduleName === "quotation") {
    return (
      record.quotation_number || record.reference_number || `QUOT-${record.id}` 
    );
  }

  if (moduleName === "purchase_order") {
    return record.po_number || record.reference_number || `PO-${record.id}`;
  }

  if (moduleName === "procurement_payment") {
    return (
      record.reference_number ||
      record.reference_no ||
      record.payment_reference ||
      `PAY-${record.id}` 
    );
  }

  if (moduleName === "vendor_settlement") {
    return record.reference_no || record.reference_number || `SETT-${record.id}`;
  }

  return record.reference_number || `#${record.id}`;
};

const getRecordAmount = (record) => {
  return (
    record.total_amount ||
    record.amount ||
    record.payment_amount ||
    record.settlement_amount ||
    0
  );
};

const getRecordVendor = (record) => {
  return (
    record.vendor_name ||
    record.business_name ||
    record.vendor?.business_name ||
    "-"
  );
};

export default function ProcurementApprovals() {
  const navigate = useNavigate();

  const [approvals, setApprovals] = useState([]);
  const [summary, setSummary] = useState({});
  const [moduleSummary, setModuleSummary] = useState([]);

  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [formData, setFormData] = useState(defaultForm);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [message, setMessage] = useState({ type: "", text: "" });
  const [apiMissing, setApiMissing] = useState(false);

  const pendingApprovals = useMemo(() => {
    return approvals.filter((item) => item.approval_status === "pending");
  }, [approvals]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementApprovalTimer);
    window.__procurementApprovalTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);

      const res = await API.get("/api/procurement-approvals/summary");

      setSummary(res.data?.summary || {});
      setModuleSummary(res.data?.modules || []);
    } catch (error) {
      console.error(
        "Procurement approval summary error:",
        error.response?.data || error.message
      );

      setSummary({});
      setModuleSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const params = {
        search: filters.search || undefined,
        module_name: filters.module_name || undefined,
        approval_status: filters.approval_status || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      };

      const res = await API.get("/api/procurement-approvals", { params });

      setApprovals(res.data?.approvals || res.data?.data || []);
    } catch (error) {
      console.error(
        "Procurement approvals error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load procurement approvals"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchRecords = useCallback(async () => {
    try {
      setRecordsLoading(true);

      let endpoint = "/api/purchase-orders";
      let keys = ["purchaseOrders", "purchase_orders", "orders", "data"];

      if (formData.module_name === "rfq") {
        endpoint = "/api/rfqs";
        keys = ["rfqs", "data"];
      }

      if (formData.module_name === "quotation") {
        endpoint = "/api/quotations";
        keys = ["quotations", "data"];
      }

      if (formData.module_name === "purchase_order") {
        endpoint = "/api/purchase-orders";
        keys = ["purchaseOrders", "purchase_orders", "orders", "data"];
      }

      if (formData.module_name === "procurement_payment") {
        endpoint = "/api/procurement-payments";
        keys = ["payments", "procurement_payments", "data"];
      }

      if (formData.module_name === "vendor_settlement") {
        endpoint = "/api/vendor-settlements";
        keys = ["settlements", "vendor_settlements", "data"];
      }

      const res = await API.get(endpoint);

      setRecords(getArray(res, keys));
    } catch (error) {
      console.error(
        "Approval record dropdown error:",
        error.response?.data || error.message
      );

      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [formData.module_name]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApprovals();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchApprovals]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "module_name" ? { record_id: "" } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const resetForm = () => {
    setFormData(defaultForm);
  };

  const refreshAll = () => {
    fetchSummary();
    fetchApprovals();
    fetchRecords();
  };

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    if (!formData.module_name) {
      showMessage("error", "Module is required");
      return;
    }

    if (!formData.record_id) {
      showMessage("error", "Record is required");
      return;
    }

    try {
      setSaving(true);

      await API.post("/api/procurement-approvals/request", {
        module_name: formData.module_name,
        record_id: formData.record_id,
        remarks: formData.remarks,
      });

      showMessage("success", "Approval request created successfully");

      resetForm();
      refreshAll();
    } catch (error) {
      console.error(
        "Create approval request error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to create approval request"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (approval) => {
    const remarks = window.prompt(
      `Approve ${approval.reference_number || `#${approval.id}`}? Remarks:`,
      "Approved"
    );

    if (remarks === null) return;

    try {
      setActionLoadingId(approval.id);

      await API.post(`/api/procurement-approvals/${approval.id}/approve`, {
        remarks,
      });

      showMessage("success", "Approval request approved successfully");
      refreshAll();
    } catch (error) {
      console.error(
        "Approve approval error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to approve request"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (approval) => {
    const remarks = window.prompt(
      `Reject ${approval.reference_number || `#${approval.id}`}? Reason:`,
      ""
    );

    if (remarks === null) return;

    try {
      setActionLoadingId(approval.id);

      await API.post(`/api/procurement-approvals/${approval.id}/reject`, {
        remarks,
      });

      showMessage("success", "Approval request rejected successfully");
      refreshAll();
    } catch (error) {
      console.error(
        "Reject approval error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to reject request"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewRecord = (approval) => {
    if (approval.module_name === "rfq") {
      navigate("/super-admin/rfqs");
      return;
    }

    if (approval.module_name === "quotation") {
      navigate("/super-admin/quotations");
      return;
    }

    if (approval.module_name === "purchase_order") {
      navigate("/super-admin/purchase-orders");
      return;
    }

    if (approval.module_name === "procurement_payment") {
      navigate("/super-admin/procurement-payments");
      return;
    }

    if (approval.module_name === "vendor_settlement") {
      navigate("/super-admin/vendor-settlements");
    }
  };

  return (
    <AdminLayout>
      <div className="approval-page">
        <style>{css}</style>

        <div className="approval-hero">
          <div>
            <div className="eyebrow">
              <ShieldCheck size={15} />
              Procurement Control
            </div>

            <h1>Procurement Approval Center</h1>

            <p>
              Manage approval requests for RFQs, quotations, purchase orders,
              vendor payments and vendor settlements with role-wise approval
              levels.
            </p>
          </div>

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
              Procurement Approval backend route is not connected yet. Add
              /api/procurement-approvals and restart backend.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard
            title="Total Requests"
            value={summary.total_requests || 0}
            icon={FileCheck2}
          />

          <SummaryCard
            title="Pending Requests"
            value={summary.pending_requests || 0}
            icon={Clock3}
            warning
          />

          <SummaryCard
            title="Approved"
            value={summary.approved_requests || 0}
            icon={ThumbsUp}
            success
          />

          <SummaryCard
            title="Rejected"
            value={summary.rejected_requests || 0}
            icon={ThumbsDown}
            danger
          />

          <SummaryCard
            title="Pending Amount"
            value={formatCurrency(summary.pending_amount || 0)}
            icon={IndianRupee}
          />
        </div>

        <div className="module-card-grid">
          {moduleSummary.map((module) => {
            const Icon = getModuleIcon(module.module_name);

            return (
              <button
                type="button"
                className="module-card"
                key={module.module_name}
                onClick={() =>
                  handleFilterChange("module_name", module.module_name)
                }
              >
                <div className="module-icon">
                  <Icon size={18} />
                </div>

                <div>
                  <h3>{getModuleLabel(module.module_name)}</h3>
                  <p>
                    {module.pending || 0} pending ·{" "}
                    {formatCurrency(module.pending_amount || 0)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="request-card">
          <div className="section-head">
            <div>
              <h2>Create Approval Request</h2>
              <p>Select a procurement record and send it for approval.</p>
            </div>
          </div>

          <form onSubmit={handleCreateRequest}>
            <div className="request-grid">
              <div className="field">
                <label>Module</label>
                <select
                  value={formData.module_name}
                  onChange={(event) =>
                    handleFormChange("module_name", event.target.value)
                  }
                >
                  {REQUEST_MODULES.map((module) => (
                    <option key={module.value} value={module.value}>
                      {module.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Record</label>
                <select
                  value={formData.record_id}
                  onChange={(event) =>
                    handleFormChange("record_id", event.target.value)
                  }
                  disabled={recordsLoading}
                >
                  <option value="">
                    {recordsLoading ? "Loading records..." : "Select Record"}
                  </option>

                  {records.map((record) => (
                    <option key={record.id} value={record.id}>
                      {getRecordReference(record, formData.module_name)} ·{" "}
                      {getRecordVendor(record)} ·{" "}
                      {formatCurrency(getRecordAmount(record))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field full">
                <label>Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(event) =>
                    handleFormChange("remarks", event.target.value)
                  }
                  rows={3}
                  placeholder="Approval request remarks..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
              >
                Reset
              </button>

              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <Send size={17} />
                )}
                {saving ? "Sending..." : "Send for Approval"}
              </button>
            </div>
          </form>
        </div>

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>Approval Filters</span>
          </div>

          <div className="filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange("search", event.target.value)
                }
                placeholder="Search reference, vendor, remarks..."
              />
            </div>

            <select
              value={filters.module_name}
              onChange={(event) =>
                handleFilterChange("module_name", event.target.value)
              }
            >
              {MODULES.map((module) => (
                <option key={module.value} value={module.value}>
                  {module.label}
                </option>
              ))}
            </select>

            <select
              value={filters.approval_status}
              onChange={(event) =>
                handleFilterChange("approval_status", event.target.value)
              }
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.from_date}
              onChange={(event) =>
                handleFilterChange("from_date", event.target.value)
              }
            />

            <input
              type="date"
              value={filters.to_date}
              onChange={(event) =>
                handleFilterChange("to_date", event.target.value)
              }
            />

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Approval Requests</h2>
              <p>
                {pendingApprovals.length} pending approval requests waiting for
                action.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Loading approvals...</h3>
              <p>Please wait while approval requests are loading.</p>
            </div>
          ) : approvals.length === 0 ? (
            <div className="empty-box">
              <ShieldCheck size={34} />
              <h3>No approval requests found</h3>
              <p>Create approval request from the form above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request Date</th>
                    <th>Module</th>
                    <th>Reference</th>
                    <th>Vendor</th>
                    <th>Amount</th>
                    <th>Approval Level</th>
                    <th>Approval Role</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {approvals.map((approval) => {
                    const Icon = getModuleIcon(approval.module_name);
                    const isPending = approval.approval_status === "pending";
                    const isLoading = actionLoadingId === approval.id;

                    return (
                      <tr key={approval.id}>
                        <td>{formatDate(approval.requested_at)}</td>

                        <td>
                          <div className="module-name">
                            <Icon size={15} />
                            {getModuleLabel(approval.module_name)}
                          </div>
                        </td>

                        <td>
                          <strong>{approval.reference_number || "-"}</strong>
                        </td>

                        <td>{approval.vendor_name || "-"}</td>

                        <td>{formatCurrency(approval.amount || 0)}</td>

                        <td>
                          <span className="level-pill">
                            Level {approval.approval_level || 1}
                          </span>
                        </td>

                        <td>{approval.approval_role || "-"}</td>

                        <td>
                          <span
                            className={getStatusClass(
                              approval.approval_status
                            )}
                          >
                            {approval.approval_status || "pending"}
                          </span>
                        </td>

                        <td>
                          <div className="remarks-text">
                            {approval.request_remarks || "-"}
                          </div>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="view-btn"
                              title="View Record"
                              onClick={() => handleViewRecord(approval)}
                            >
                              <Eye size={15} />
                            </button>

                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  className="approve-btn"
                                  title="Approve"
                                  onClick={() => handleApprove(approval)}
                                  disabled={isLoading}
                                >
                                  {isLoading ? (
                                    <Loader2 size={15} className="spin" />
                                  ) : (
                                    <ThumbsUp size={15} />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  className="reject-btn"
                                  title="Reject"
                                  onClick={() => handleReject(approval)}
                                  disabled={isLoading}
                                >
                                  <XCircle size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

const css = `
  .approval-page {
    color: #111827;
  }

  .approval-hero {
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

  .approval-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .approval-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 780px;
  }

  .primary-btn,
  .secondary-btn {
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

  .primary-btn:disabled,
  .secondary-btn:disabled {
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

  .summary-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 20px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
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

  .module-card-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .module-card {
    border: 1px solid #ececec;
    background: #fff;
    border-radius: 20px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    display: flex;
    gap: 12px;
    align-items: center;
    box-shadow: 0 12px 30px rgba(0,0,0,0.045);
  }

  .module-card:hover {
    transform: translateY(-1px);
  }

  .module-icon {
    width: 40px;
    height: 40px;
    border-radius: 15px;
    background: #fffbeb;
    color: #b45309;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .module-card h3 {
    margin: 0;
    color: #111;
    font-size: 14px;
    font-weight: 950;
  }

  .module-card p {
    margin: 5px 0 0;
    color: #777;
    font-size: 12px;
    font-weight: 800;
  }

  .request-card,
  .filter-card,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
    padding: 22px;
    margin-bottom: 22px;
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

  .request-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .field.full {
    grid-column: span 2;
  }

  .field label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-size: 13px;
    font-weight: 950;
  }

  .field input,
  .field select,
  .field textarea,
  .filter-grid select,
  .filter-grid input {
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

  .field textarea {
    resize: vertical;
  }

  .field input:focus,
  .field select:focus,
  .field textarea:focus,
  .filter-grid select:focus,
  .filter-grid input:focus {
    border-color: #facc15;
    background: #fff;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
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
    grid-template-columns: 1.4fr 1fr 1fr 0.8fr 0.8fr auto;
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

  .search-wrap input {
    border: none;
    outline: none;
    background: transparent;
    padding: 0;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1250px;
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

  td strong {
    color: #111;
    font-weight: 950;
  }

  .module-name {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #111;
    font-weight: 950;
  }

  .level-pill,
  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .level-pill {
    background: #eff6ff;
    color: #2563eb;
  }

  .status.pending {
    background: #fffbeb;
    color: #b45309;
  }

  .status.approved {
    background: #ecfdf5;
    color: #047857;
  }

  .status.rejected {
    background: #fff1f2;
    color: #e11d48;
  }

  .remarks-text {
    max-width: 240px;
    color: #52525b;
    line-height: 1.5;
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .view-btn,
  .approve-btn,
  .reject-btn {
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
    background: #111;
    color: #facc15;
  }

  .approve-btn {
    background: #ecfdf5;
    color: #047857;
  }

  .reject-btn {
    background: #fff1f2;
    color: #e11d48;
  }

  .view-btn:disabled,
  .approve-btn:disabled,
  .reject-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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

  @media (max-width: 1300px) {
    .summary-grid,
    .module-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filter-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .approval-hero {
      flex-direction: column;
    }

    .primary-btn,
    .secondary-btn {
      width: 100%;
    }

    .summary-grid,
    .module-card-grid,
    .request-grid,
    .filter-grid {
      grid-template-columns: 1fr;
    }

    .field.full {
      grid-column: span 1;
    }

    .form-actions {
      flex-direction: column;
    }
  }
`;
