import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Eye,
  Filter,
  IndianRupee,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

const todayDate = () => new Date().toISOString().slice(0, 10);

const defaultFilters = {
  search: "",
  status: "",
  approval_status: "",
  priority: "",
  from_date: "",
  to_date: "",
};

const defaultForm = {
  request_title: "",
  request_date: todayDate(),
  required_date: "",
  requester_name: "",
  outlet_name: "",
  warehouse_name: "",
  priority: "normal",
  purpose: "",
  status: "draft",
  remarks: "",
};

const defaultItem = {
  product_id: "",
  product_name: "",
  required_qty: "",
  unit_name: "",
  estimated_unit_price: "",
  preferred_vendor_id: "",
  preferred_vendor_name: "",
  remarks: "",
};

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "converted", label: "Converted" },
];

const approvalOptions = [
  { value: "", label: "All Approval" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const priorityOptions = [
  { value: "", label: "All Priority" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

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

const toInputDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const getStatusClass = (status) => {
  if (status === "approved") return "status approved";
  if (status === "submitted") return "status submitted";
  if (status === "rejected") return "status rejected";
  if (status === "converted") return "status converted";
  return "status draft";
};

const getPriorityClass = (priority) => {
  if (priority === "urgent") return "priority urgent";
  if (priority === "high") return "priority high";
  if (priority === "low") return "priority low";
  return "priority normal";
};

export default function ProcurementRequisitions() {
  const [summary, setSummary] = useState({});
  const [latest, setLatest] = useState([]);
  const [requisitions, setRequisitions] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [formData, setFormData] = useState(defaultForm);
  const [items, setItems] = useState([{ ...defaultItem }]);

  const [editingId, setEditingId] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });
  const [apiMissing, setApiMissing] = useState(false);

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.required_qty || 0);
      const price = Number(item.estimated_unit_price || 0);
      return sum + qty * price;
    }, 0);
  }, [items]);

  const validItemsCount = useMemo(() => {
    return items.filter((item) => item.product_name || item.product_id).length;
  }, [items]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementReqTimer);
    window.__procurementReqTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);

      const res = await API.get("/api/procurement-requisitions/summary");

      setSummary(res.data?.summary || {});
      setLatest(res.data?.latest || []);
    } catch (error) {
      console.error(
        "Procurement requisition summary error:",
        error.response?.data || error.message
      );

      setSummary({});
      setLatest([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-requisitions", {
        params: {
          search: filters.search || undefined,
          status: filters.status || undefined,
          approval_status: filters.approval_status || undefined,
          priority: filters.priority || undefined,
          from_date: filters.from_date || undefined,
          to_date: filters.to_date || undefined,
        },
      });

      setRequisitions(res.data?.requisitions || res.data?.data || []);
    } catch (error) {
      console.error(
        "Procurement requisition list error:",
        error.response?.data || error.message
      );

      setRequisitions([]);

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load procurement requisitions"
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
      fetchRequisitions();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchRequisitions]);

  const refreshAll = () => {
    fetchSummary();
    fetchRequisitions();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setItems([{ ...defaultItem }]);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

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
    }));
  };

  const handleItemChange = (index, name, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...defaultItem }]);
  };

  const removeItem = (index) => {
    setItems((prev) => {
      if (prev.length === 1) return [{ ...defaultItem }];
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const buildPayload = () => {
    return {
      ...formData,
      items: items
        .filter((item) => item.product_name || item.product_id)
        .map((item) => ({
          ...item,
          product_id: item.product_id || null,
          required_qty: Number(item.required_qty || 0),
          estimated_unit_price: Number(item.estimated_unit_price || 0),
          preferred_vendor_id: item.preferred_vendor_id || null,
        })),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.request_title.trim()) {
      showMessage("error", "Request title is required");
      return;
    }

    if (!validItemsCount) {
      showMessage("error", "At least one item is required");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();

      if (editingId) {
        await API.put(`/api/procurement-requisitions/${editingId}`, payload);
        showMessage("success", "Procurement requisition updated successfully");
      } else {
        await API.post("/api/procurement-requisitions", payload);
        showMessage("success", "Procurement requisition created successfully");
      }

      resetForm();
      refreshAll();
    } catch (error) {
      console.error(
        "Save procurement requisition error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to save procurement requisition"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setActionLoading(`edit-${id}`);

      const res = await API.get(`/api/procurement-requisitions/${id}`);

      const req = res.data?.requisition;
      const reqItems = res.data?.items || [];

      if (!req) return;

      setEditingId(req.id);
      setFormData({
        request_title: req.request_title || "",
        request_date: toInputDate(req.request_date) || todayDate(),
        required_date: toInputDate(req.required_date),
        requester_name: req.requester_name || "",
        outlet_name: req.outlet_name || "",
        warehouse_name: req.warehouse_name || "",
        priority: req.priority || "normal",
        purpose: req.purpose || "",
        status: req.status || "draft",
        remarks: req.remarks || "",
      });

      setItems(
        reqItems.length
          ? reqItems.map((item) => ({
              product_id: item.product_id || "",
              product_name: item.product_name || "",
              required_qty: item.required_qty || "",
              unit_name: item.unit_name || "",
              estimated_unit_price: item.estimated_unit_price || "",
              preferred_vendor_id: item.preferred_vendor_id || "",
              preferred_vendor_name: item.preferred_vendor_name || "",
              remarks: item.remarks || "",
            }))
          : [{ ...defaultItem }]
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(
        "Edit procurement requisition error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load requisition for edit"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleView = async (id) => {
    try {
      setActionLoading(`view-${id}`);

      const res = await API.get(`/api/procurement-requisitions/${id}`);

      setSelectedRequisition({
        requisition: res.data?.requisition || null,
        items: res.data?.items || [],
      });
    } catch (error) {
      console.error(
        "View procurement requisition error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to open requisition"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleQuickAction = async (id, action) => {
    let endpoint = "";
    let body = {};
    let confirmText = "";

    if (action === "submit") {
      endpoint = `/api/procurement-requisitions/${id}/submit`;
      confirmText = "Submit this requisition for approval?";
    }

    if (action === "approve") {
      endpoint = `/api/procurement-requisitions/${id}/approve`;
      const remarks = window.prompt("Approval remarks optional:", "");
      body = { remarks: remarks || "" };
      confirmText = "Approve this requisition?";
    }

    if (action === "reject") {
      endpoint = `/api/procurement-requisitions/${id}/reject`;
      const reason = window.prompt("Enter rejection reason:", "Rejected");
      if (reason === null) return;
      body = { rejection_reason: reason || "Rejected" };
      confirmText = "Reject this requisition?";
    }

    const confirmAction = window.confirm(confirmText);
    if (!confirmAction) return;

    try {
      setActionLoading(`${action}-${id}`);

      await API.post(endpoint, body);

      showMessage("success", `Requisition ${action} completed successfully`);
      refreshAll();
    } catch (error) {
      console.error(
        `Requisition ${action} error:`,
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || `Failed to ${action} requisition` 
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this procurement requisition permanently?"
    );

    if (!confirmDelete) return;

    try {
      setActionLoading(`delete-${id}`);

      await API.delete(`/api/procurement-requisitions/${id}`);

      showMessage("success", "Procurement requisition deleted successfully");
      refreshAll();
    } catch (error) {
      console.error(
        "Delete procurement requisition error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete procurement requisition"
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <AdminLayout>
      <div className="req-page">
        <style>{css}</style>

        <div className="req-hero">
          <div>
            <div className="eyebrow">
              <ClipboardList size={15} />
              Procurement Request
            </div>

            <h1>Purchase Requisition / Indent Request</h1>

            <p>
              Outlet or warehouse team can raise item requirements. Admin can
              approve, reject, and use approved requests for RFQ / purchase flow.
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
              Procurement Requisition backend route is not connected yet. Add
              /api/procurement-requisitions and restart backend.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard
            title="Total Requests"
            value={summary.total_requisitions || 0}
            icon={ClipboardList}
          />
          <SummaryCard
            title="Submitted"
            value={summary.submitted_count || 0}
            icon={Send}
          />
          <SummaryCard
            title="Approved"
            value={summary.approved_count || 0}
            icon={ShieldCheck}
            success
          />
          <SummaryCard
            title="Urgent"
            value={summary.urgent_count || 0}
            icon={AlertCircle}
            danger
          />
          <SummaryCard
            title="Estimated Value"
            value={formatCurrency(summary.estimated_total || 0)}
            icon={IndianRupee}
            warning
          />
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-head">
            <div>
              <h2>{editingId ? "Update Requisition" : "Create Requisition"}</h2>
              <p>Add requested products, required quantity and estimated price.</p>
            </div>

            <div className="form-actions">
              {editingId && (
                <button type="button" className="secondary-btn" onClick={resetForm}>
                  <X size={16} />
                  Cancel Edit
                </button>
              )}

              <button type="submit" className="primary-btn light" disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>

          <div className="form-grid">
            <input
              value={formData.request_title}
              onChange={(event) =>
                handleFormChange("request_title", event.target.value)
              }
              placeholder="Request title"
            />

            <input
              type="date"
              value={formData.request_date}
              onChange={(event) =>
                handleFormChange("request_date", event.target.value)
              }
            />

            <input
              type="date"
              value={formData.required_date}
              onChange={(event) =>
                handleFormChange("required_date", event.target.value)
              }
            />

            <input
              value={formData.requester_name}
              onChange={(event) =>
                handleFormChange("requester_name", event.target.value)
              }
              placeholder="Requester name"
            />

            <input
              value={formData.outlet_name}
              onChange={(event) =>
                handleFormChange("outlet_name", event.target.value)
              }
              placeholder="Outlet name"
            />

            <input
              value={formData.warehouse_name}
              onChange={(event) =>
                handleFormChange("warehouse_name", event.target.value)
              }
              placeholder="Warehouse name"
            />

            <select
              value={formData.priority}
              onChange={(event) =>
                handleFormChange("priority", event.target.value)
              }
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              value={formData.status}
              onChange={(event) => handleFormChange("status", event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>

          <div className="form-grid two">
            <input
              value={formData.purpose}
              onChange={(event) => handleFormChange("purpose", event.target.value)}
              placeholder="Purpose"
            />

            <input
              value={formData.remarks}
              onChange={(event) => handleFormChange("remarks", event.target.value)}
              placeholder="Remarks"
            />
          </div>

          <div className="items-head">
            <div>
              <h3>Requested Items</h3>
              <p>
                Items: {validItemsCount} · Estimated Total:{" "}
                <strong>{formatCurrency(estimatedTotal)}</strong>
              </p>
            </div>

            <button type="button" className="secondary-btn" onClick={addItem}>
              <Plus size={16} />
              Add Item
            </button>
          </div>

          <div className="item-list">
            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <input
                  value={item.product_name}
                  onChange={(event) =>
                    handleItemChange(index, "product_name", event.target.value)
                  }
                  placeholder="Product / raw material name"
                />

                <input
                  type="number"
                  value={item.required_qty}
                  onChange={(event) =>
                    handleItemChange(index, "required_qty", event.target.value)
                  }
                  placeholder="Qty"
                />

                <input
                  value={item.unit_name}
                  onChange={(event) =>
                    handleItemChange(index, "unit_name", event.target.value)
                  }
                  placeholder="Unit"
                />

                <input
                  type="number"
                  value={item.estimated_unit_price}
                  onChange={(event) =>
                    handleItemChange(
                      index,
                      "estimated_unit_price",
                      event.target.value
                    )
                  }
                  placeholder="Unit price"
                />

                <input
                  value={item.preferred_vendor_name}
                  onChange={(event) =>
                    handleItemChange(
                      index,
                      "preferred_vendor_name",
                      event.target.value
                    )
                  }
                  placeholder="Preferred vendor"
                />

                <input
                  value={item.remarks}
                  onChange={(event) =>
                    handleItemChange(index, "remarks", event.target.value)
                  }
                  placeholder="Item remarks"
                />

                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </form>

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>Requisition Filters</span>
          </div>

          <div className="filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange("search", event.target.value)
                }
                placeholder="Search requisition..."
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

            <select
              value={filters.approval_status}
              onChange={(event) =>
                handleFilterChange("approval_status", event.target.value)
              }
            >
              {approvalOptions.map((approval) => (
                <option key={approval.value} value={approval.value}>
                  {approval.label}
                </option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(event) =>
                handleFilterChange("priority", event.target.value)
              }
            >
              {priorityOptions.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
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
              <h2>Requisition List</h2>
              <p>Review, approve, reject, submit and edit purchase requests.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Loading requisitions...</h3>
              <p>Please wait while purchase requests are loading.</p>
            </div>
          ) : requisitions.length === 0 ? (
            <div className="empty-box">
              <PackagePlus size={34} />
              <h3>No requisitions found</h3>
              <p>Create a new purchase requisition from the form above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Date</th>
                    <th>Required</th>
                    <th>Requester</th>
                    <th>Outlet / Warehouse</th>
                    <th>Items</th>
                    <th>Estimated</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {requisitions.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div className="request-cell">
                          <strong>{req.request_title}</strong>
                          <span>{req.requisition_number}</span>
                        </div>
                      </td>

                      <td>{formatDate(req.request_date)}</td>
                      <td>{formatDate(req.required_date)}</td>
                      <td>{req.requester_name || "-"}</td>
                      <td>
                        <div className="muted-lines">
                          <span>{req.outlet_name || "-"}</span>
                          <span>{req.warehouse_name || "-"}</span>
                        </div>
                      </td>
                      <td>{req.total_items || 0}</td>
                      <td>{formatCurrency(req.estimated_total || 0)}</td>

                      <td>
                        <span className={getPriorityClass(req.priority)}>
                          {req.priority || "normal"}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(req.status)}>
                          {req.status || "draft"}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(req.approval_status)}>
                          {req.approval_status || "draft"}
                        </span>
                      </td>

                      <td className="right">
                        <div className="action-group">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleView(req.id)}
                          >
                            {actionLoading === `view-${req.id}` ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Eye size={15} />
                            )}
                          </button>

                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => handleEdit(req.id)}
                          >
                            {actionLoading === `edit-${req.id}` ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Edit3 size={15} />
                            )}
                          </button>

                          {req.status === "draft" && (
                            <button
                              type="button"
                              className="icon-btn submit"
                              onClick={() => handleQuickAction(req.id, "submit")}
                            >
                              {actionLoading === `submit-${req.id}` ? (
                                <Loader2 size={15} className="spin" />
                              ) : (
                                <Send size={15} />
                              )}
                            </button>
                          )}

                          {(req.approval_status === "pending" ||
                            req.approval_status === "draft") && (
                            <>
                              <button
                                type="button"
                                className="icon-btn approve"
                                onClick={() =>
                                  handleQuickAction(req.id, "approve")
                                }
                              >
                                {actionLoading === `approve-${req.id}` ? (
                                  <Loader2 size={15} className="spin" />
                                ) : (
                                  <CheckCircle2 size={15} />
                                )}
                              </button>

                              <button
                                type="button"
                                className="icon-btn reject"
                                onClick={() => handleQuickAction(req.id, "reject")}
                              >
                                {actionLoading === `reject-${req.id}` ? (
                                  <Loader2 size={15} className="spin" />
                                ) : (
                                  <XCircle size={15} />
                                )}
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleDelete(req.id)}
                          >
                            {actionLoading === `delete-${req.id}` ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
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

        {selectedRequisition && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedRequisition(null)}
          >
            <div
              className="req-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h2>{selectedRequisition.requisition?.request_title}</h2>
                  <p>{selectedRequisition.requisition?.requisition_number}</p>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setSelectedRequisition(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="detail-grid">
                <DetailItem
                  label="Request Date"
                  value={formatDate(selectedRequisition.requisition?.request_date)}
                />
                <DetailItem
                  label="Required Date"
                  value={formatDate(selectedRequisition.requisition?.required_date)}
                />
                <DetailItem
                  label="Requester"
                  value={selectedRequisition.requisition?.requester_name || "-"}
                />
                <DetailItem
                  label="Priority"
                  value={selectedRequisition.requisition?.priority || "-"}
                />
                <DetailItem
                  label="Status"
                  value={selectedRequisition.requisition?.status || "-"}
                />
                <DetailItem
                  label="Estimated"
                  value={formatCurrency(
                    selectedRequisition.requisition?.estimated_total || 0
                  )}
                />
              </div>

              <div className="modal-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Unit Price</th>
                      <th>Value</th>
                      <th>Preferred Vendor</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedRequisition.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name || "-"}</td>
                        <td>{formatQty(item.required_qty)}</td>
                        <td>{item.unit_name || "-"}</td>
                        <td>{formatCurrency(item.estimated_unit_price)}</td>
                        <td>{formatCurrency(item.estimated_value)}</td>
                        <td>{item.preferred_vendor_name || "-"}</td>
                        <td>{item.remarks || "-"}</td>
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

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const css = `
  .req-page {
    color: #111827;
  }

  .req-hero {
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

  .req-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .req-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 780px;
  }

  .hero-actions,
  .form-actions,
  .action-group {
    display: flex;
    gap: 10px;
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

  .primary-btn.light {
    background: #111;
    color: #facc15;
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
  .form-card,
  .filter-card,
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

  .summary-card.warning .summary-icon {
    background: #fffbeb;
    color: #b45309;
  }

  .summary-card.danger .summary-icon {
    background: #fff1f2;
    color: #e11d48;
  }

  .form-card,
  .filter-card,
  .table-card {
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

  .form-grid,
  .filter-grid {
    display: grid;
    gap: 12px;
    align-items: center;
  }

  .form-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-bottom: 12px;
  }

  .form-grid.two {
    grid-template-columns: 1fr 1fr;
  }

  .filter-grid {
    grid-template-columns: 1.4fr 0.8fr 0.9fr 0.8fr 0.8fr 0.8fr auto;
  }

  .filter-title,
  .items-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .filter-title {
    justify-content: flex-start;
    color: #111827;
    font-size: 14px;
    font-weight: 950;
  }

  .items-head {
    margin-top: 18px;
  }

  .items-head h3 {
    margin: 0;
    color: #111;
    font-size: 18px;
    font-weight: 950;
  }

  .items-head p {
    margin: 5px 0 0;
    color: #777;
    font-size: 13px;
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

  input,
  select {
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

  .item-list {
    display: grid;
    gap: 10px;
  }

  .item-row {
    display: grid;
    grid-template-columns: 1.4fr 0.5fr 0.5fr 0.7fr 1fr 1fr auto;
    gap: 10px;
    align-items: center;
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 18px;
    padding: 12px;
  }

  .remove-btn {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    border: none;
    background: #fff1f2;
    color: #e11d48;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .table-wrap,
  .modal-table-wrap {
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

  .request-cell strong {
    display: block;
    color: #111;
    font-weight: 950;
  }

  .request-cell span,
  .muted-lines span {
    display: block;
    color: #777;
    font-size: 12px;
    margin-top: 4px;
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

  .status.submitted {
    background: #eff6ff;
    color: #2563eb;
  }

  .status.approved,
  .status.converted {
    background: #ecfdf5;
    color: #047857;
  }

  .status.rejected {
    background: #fff1f2;
    color: #e11d48;
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

  .right {
    text-align: right;
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

  .icon-btn.edit {
    background: #eff6ff;
    color: #2563eb;
  }

  .icon-btn.submit {
    background: #fffbeb;
    color: #b45309;
  }

  .icon-btn.approve {
    background: #ecfdf5;
    color: #047857;
  }

  .icon-btn.reject,
  .icon-btn.danger {
    background: #fff1f2;
    color: #e11d48;
  }

  .close-btn {
    background: #f4f4f5;
    color: #111;
  }

  .empty-box {
    min-height: 220px;
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

  .req-modal {
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
    .form-grid,
    .form-grid.two,
    .filter-grid,
    .item-row,
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .req-hero,
    .section-head,
    .items-head {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-actions,
    .form-actions,
    .primary-btn,
    .secondary-btn,
    .secondary-dark-btn {
      width: 100%;
    }
  }
`;
