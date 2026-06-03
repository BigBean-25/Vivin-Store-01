import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Eye,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  Truck,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";

const initialForm = {
  request_type: "internal",
  from_warehouse_id: "",
  to_warehouse_id: "",
  request_date: new Date().toISOString().slice(0, 10),
  required_date: "",
  status: "draft",
  remarks: "",
  items: [{ product_id: "", requested_qty: "", approved_qty: "", issued_qty: "" }],
};

const statusLabels = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const requestTypeLabels = {
  outlet: "Outlet",
  customer: "Customer",
  warehouse: "Warehouse",
  internal: "Internal",
};

const formatQty = (value) => Number(value || 0).toFixed(3);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateInput = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export default function InventoryRequests() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewItems, setViewItems] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2800);
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/api/inventory-requests/summary");
      if (res.data.success) setSummary(res.data.summary || {});
    } catch {
      setSummary({});
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/api/warehouses");
      if (res.data.success) {
        setWarehouses(res.data.data || res.data.warehouses || []);
      }
    } catch {
      setWarehouses([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await API.get("/api/products");
      if (res.data.success) {
        setProducts(res.data.products || res.data.data || []);
      }
    } catch {
      setProducts([]);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("request_type", typeFilter);
      if (fromWarehouseFilter) params.append("from_warehouse_id", fromWarehouseFilter);

      const res = await API.get(`/api/inventory-requests?${params.toString()}`);

      if (res.data.success) {
        setRequests(res.data.requests || res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch inventory requests");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchSummary(), fetchWarehouses(), fetchProducts(), fetchRequests()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, fromWarehouseFilter]);

  const stats = useMemo(() => {
    return {
      total: summary.total_requests || 0,
      draft: summary.draft_requests || 0,
      submitted: summary.submitted_requests || 0,
      approved: summary.approved_requests || 0,
      fulfilled: summary.fulfilled_requests || 0,
      rejected: summary.rejected_requests || 0,
      cancelled: summary.cancelled_requests || 0,
    };
  }, [summary]);

  const openCreateForm = () => {
    setEditingId(null);
    setViewData(null);
    setViewItems([]);
    setFormData({
      ...initialForm,
      request_date: new Date().toISOString().slice(0, 10),
      items: [{ product_id: "", requested_qty: "", approved_qty: "", issued_qty: "" }],
    });
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData(initialForm);
    setError("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: "", requested_qty: "", approved_qty: "", issued_qty: "" },
      ],
    }));
  };

  const removeItemRow = (index) => {
    setFormData((prev) => {
      const nextItems = prev.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        items: nextItems.length
          ? nextItems
          : [{ product_id: "", requested_qty: "", approved_qty: "", issued_qty: "" }],
      };
    });
  };

  const validateForm = () => {
    const validItems = formData.items.filter(
      (item) => item.product_id && Number(item.requested_qty) > 0
    );

    if (!validItems.length) {
      setError("At least one product and requested quantity is required");
      return false;
    }

    return true;
  };

  const getPayload = () => {
    return {
      request_type: formData.request_type,
      from_warehouse_id: formData.from_warehouse_id || null,
      to_warehouse_id: formData.to_warehouse_id || null,
      request_date: formData.request_date,
      required_date: formData.required_date || null,
      status: formData.status,
      remarks: formData.remarks,
      items: formData.items
        .filter((item) => item.product_id && Number(item.requested_qty) > 0)
        .map((item) => ({
          product_id: item.product_id,
          requested_qty: Number(item.requested_qty || 0),
          approved_qty: Number(item.approved_qty || 0),
          issued_qty: Number(item.issued_qty || 0),
        })),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await API.put(`/api/inventory-requests/${editingId}`, getPayload());
        showSuccess("Inventory request updated successfully");
      } else {
        await API.post("/api/inventory-requests", getPayload());
        showSuccess("Inventory request created successfully");
      }

      closeForm();
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save inventory request");
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (request) => {
    try {
      setError("");
      setShowForm(false);

      const res = await API.get(`/api/inventory-requests/${request.id}`);

      if (res.data.success) {
        setViewData(res.data.request);
        setViewItems(res.data.items || []);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to view inventory request");
    }
  };

  const handleEdit = async (request) => {
    try {
      setError("");
      setViewData(null);
      setViewItems([]);

      const res = await API.get(`/api/inventory-requests/${request.id}`);

      if (res.data.success) {
        const item = res.data.request;
        const items = res.data.items || [];

        setEditingId(item.id);
        setFormData({
          request_type: item.request_type || "internal",
          from_warehouse_id: item.from_warehouse_id || "",
          to_warehouse_id: item.to_warehouse_id || "",
          request_date: toDateInput(item.request_date) || new Date().toISOString().slice(0, 10),
          required_date: toDateInput(item.required_date),
          status: item.status || "draft",
          remarks: item.remarks || "",
          items: items.length
            ? items.map((row) => ({
                product_id: row.product_id || "",
                requested_qty: row.requested_qty || "",
                approved_qty: row.approved_qty || "",
                issued_qty: row.issued_qty || "",
              }))
            : [{ product_id: "", requested_qty: "", approved_qty: "", issued_qty: "" }],
        });

        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit inventory request");
    }
  };

  const runAction = async (request, action, message, payload = {}) => {
    const confirmAction = window.confirm(message);
    if (!confirmAction) return;

    try {
      setError("");

      await API.patch(`/api/inventory-requests/${request.id}/${action}`, payload);

      showSuccess(`Inventory request ${action} successfully`);
      setViewData(null);
      setViewItems([]);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} inventory request`);
    }
  };

  const handleDelete = async (request) => {
    const confirmDelete = window.confirm(
      `Delete request ${request.request_number}? Only draft request can be deleted.`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/inventory-requests/${request.id}`);
      showSuccess("Inventory request deleted successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete inventory request");
    }
  };

  return (
    <AdminLayout>
      <div className="inventory-request-page">
        <style>{css}</style>

        <div className="request-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <ClipboardList size={30} />
            </div>

            <div>
              <div className="eyebrow">Inventory Workflow</div>
              <h1>Inventory Requests</h1>
              <p>
                Create, submit, approve, fulfil, reject and cancel inventory requests
                between warehouses, outlets and internal operations.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="secondary-btn" onClick={refreshAll} disabled={loading}>
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Request
            </button>
          </div>
        </div>

        {success && (
          <div className="success-box">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        <div className="stats-grid">
          <StatCard title="Total Requests" value={stats.total} />
          <StatCard title="Draft" value={stats.draft} />
          <StatCard title="Submitted" value={stats.submitted} />
          <StatCard title="Approved" value={stats.approved} />
          <StatCard title="Fulfilled" value={stats.fulfilled} />
          <StatCard title="Rejected" value={stats.rejected} />
          <StatCard title="Cancelled" value={stats.cancelled} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Inventory Request" : "Create Inventory Request"}</h2>
                <p>Add request details and product-wise quantity.</p>
              </div>

              <button type="button" className="close-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Request Type</label>
                  <select name="request_type" value={formData.request_type} onChange={handleFormChange}>
                    <option value="internal">Internal</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="outlet">Outlet</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>From Warehouse</label>
                  <select
                    name="from_warehouse_id"
                    value={formData.from_warehouse_id}
                    onChange={handleFormChange}
                  >
                    <option value="">Select From Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} {warehouse.warehouse_code ? `(${warehouse.warehouse_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>To Warehouse</label>
                  <select
                    name="to_warehouse_id"
                    value={formData.to_warehouse_id}
                    onChange={handleFormChange}
                  >
                    <option value="">No Destination Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} {warehouse.warehouse_code ? `(${warehouse.warehouse_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Request Date</label>
                  <input
                    type="date"
                    name="request_date"
                    value={formData.request_date}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Required Date</label>
                  <input
                    type="date"
                    name="required_date"
                    value={formData.required_date}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group full">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="Request remarks..."
                  />
                </div>
              </div>

              <div className="items-card">
                <div className="items-head">
                  <div>
                    <h3>Request Items</h3>
                    <p>Add product and requested quantity.</p>
                  </div>

                  <button type="button" className="add-row-btn" onClick={addItemRow}>
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="items-table-wrap">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Requested Qty</th>
                        <th>Approved Qty</th>
                        <th>Issued Qty</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              value={item.product_id}
                              onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                            >
                              <option value="">Select Product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} {product.sku ? `(${product.sku})` : ""}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={item.requested_qty}
                              onChange={(e) => handleItemChange(index, "requested_qty", e.target.value)}
                              placeholder="0.000"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={item.approved_qty}
                              onChange={(e) => handleItemChange(index, "approved_qty", e.target.value)}
                              placeholder="0.000"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={item.issued_qty}
                              onChange={(e) => handleItemChange(index, "issued_qty", e.target.value)}
                              placeholder="0.000"
                            />
                          </td>

                          <td>
                            <button type="button" className="remove-row-btn" onClick={() => removeItemRow(index)}>
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                  {saving ? "Saving..." : editingId ? "Update Request" : "Create Request"}
                </button>
              </div>
            </form>
          </div>
        )}

        {viewData && (
          <div className="view-card">
            <div className="view-head">
              <div>
                <h2>{viewData.request_number}</h2>
                <p>
                  {requestTypeLabels[viewData.request_type]} ·{" "}
                  {statusLabels[viewData.status]}
                </p>
              </div>

              <button type="button" className="close-btn" onClick={() => setViewData(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <Detail title="From Warehouse" value={viewData.from_warehouse_name || "-"} />
              <Detail title="To Warehouse" value={viewData.to_warehouse_name || "-"} />
              <Detail title="Request Date" value={formatDate(viewData.request_date)} />
              <Detail title="Required Date" value={formatDate(viewData.required_date)} />
              <Detail title="Status" value={viewData.status} />
              <Detail title="Remarks" value={viewData.remarks || "-"} />
            </div>

            <div className="view-items">
              <h3>Requested Items</h3>

              <div className="items-table-wrap">
                <table className="items-table readonly">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Available</th>
                      <th>Requested</th>
                      <th>Approved</th>
                      <th>Issued</th>
                    </tr>
                  </thead>

                  <tbody>
                    {viewItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="main-name">
                            <Package size={14} />
                            {item.product_name || "-"}
                          </div>
                          <div className="small-text">{item.sku || item.product_code || "-"}</div>
                        </td>
                        <td>{formatQty(item.available_qty)}</td>
                        <td>{formatQty(item.requested_qty)}</td>
                        <td>{formatQty(item.approved_qty)}</td>
                        <td>{formatQty(item.issued_qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="workflow-actions">
              {viewData.status === "draft" && (
                <button
                  type="button"
                  className="workflow-btn submit"
                  onClick={() =>
                    runAction(viewData, "submit", `Submit request ${viewData.request_number}?`)
                  }
                >
                  <Send size={16} />
                  Submit
                </button>
              )}

              {["draft", "submitted"].includes(viewData.status) && (
                <button
                  type="button"
                  className="workflow-btn approve"
                  onClick={() =>
                    runAction(viewData, "approve", `Approve request ${viewData.request_number}?`)
                  }
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
              )}

              {viewData.status === "approved" && (
                <button
                  type="button"
                  className="workflow-btn fulfill"
                  onClick={() =>
                    runAction(viewData, "fulfill", `Fulfil request ${viewData.request_number}?`)
                  }
                >
                  <Truck size={16} />
                  Fulfil
                </button>
              )}

              {["draft", "submitted", "approved"].includes(viewData.status) && (
                <button
                  type="button"
                  className="workflow-btn reject"
                  onClick={() =>
                    runAction(viewData, "reject", `Reject request ${viewData.request_number}?`)
                  }
                >
                  <XCircle size={16} />
                  Reject
                </button>
              )}

              {["draft", "submitted"].includes(viewData.status) && (
                <button
                  type="button"
                  className="workflow-btn cancel"
                  onClick={() =>
                    runAction(viewData, "cancel", `Cancel request ${viewData.request_number}?`)
                  }
                >
                  <Ban size={16} />
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request number, status, warehouse..."
            />
          </div>

          <select
            className="filter-select"
            value={fromWarehouseFilter}
            onChange={(e) => setFromWarehouseFilter(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="internal">Internal</option>
            <option value="warehouse">Warehouse</option>
            <option value="outlet">Outlet</option>
            <option value="customer">Customer</option>
          </select>

          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{requests.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Inventory Request List</h2>
            <p>Track all request workflow from draft to fulfilled.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={28} className="spin" />
              <h3>Loading requests...</h3>
              <p>Please wait while inventory requests are loading.</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-box">
              <ClipboardList size={34} />
              <h3>No inventory requests found</h3>
              <p>Create your first stock request from the New Request button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Qty</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="main-name">
                          <ClipboardList size={15} />
                          {request.request_number}
                        </div>
                        <div className="small-text">
                          {requestTypeLabels[request.request_type] || request.request_type} ·{" "}
                          {request.item_count || 0} items
                        </div>
                      </td>

                      <td>
                        <div className="main-name">
                          <Warehouse size={14} />
                          {request.from_warehouse_name || "-"}
                        </div>
                        <div className="small-text">{request.from_warehouse_code || "-"}</div>
                      </td>

                      <td>
                        <div className="main-name">
                          <Warehouse size={14} />
                          {request.to_warehouse_name || "-"}
                        </div>
                        <div className="small-text">{request.to_warehouse_code || "-"}</div>
                      </td>

                      <td>
                        <div className="qty-line">
                          Req: <strong>{formatQty(request.total_requested_qty)}</strong>
                        </div>
                        <div className="small-text">
                          Approved: {formatQty(request.total_approved_qty)} · Issued:{" "}
                          {formatQty(request.total_issued_qty)}
                        </div>
                      </td>

                      <td>
                        <div>Request: {formatDate(request.request_date)}</div>
                        <div className="small-text">
                          Required: {formatDate(request.required_date)}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge ${request.status}`}>
                          {statusLabels[request.status] || request.status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button type="button" className="view-btn" onClick={() => handleView(request)}>
                            <Eye size={16} />
                          </button>

                          {!["fulfilled", "rejected", "cancelled"].includes(request.status) && (
                            <button type="button" className="edit-btn" onClick={() => handleEdit(request)}>
                              <Edit3 size={16} />
                            </button>
                          )}

                          {request.status === "draft" && (
                            <button type="button" className="delete-btn" onClick={() => handleDelete(request)}>
                              <Trash2 size={16} />
                            </button>
                          )}
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

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3>{value}</h3>
      <p>{title}</p>
      <div className="stat-mark" />
    </div>
  );
}

function Detail({ title, value }) {
  return (
    <div className="detail-card">
      <p>{title}</p>
      <h4>{value || "-"}</h4>
    </div>
  );
}

const css = `
  .inventory-request-page { color: #151515; }

  .request-hero {
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

  .hero-left { display: flex; gap: 18px; align-items: flex-start; }

  .hero-icon {
    width: 60px;
    height: 60px;
    border-radius: 20px;
    background: #facc15;
    color: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 18px 36px rgba(250,204,21,0.25);
    flex-shrink: 0;
  }

  .eyebrow {
    color: #facc15;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 9px;
  }

  .request-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .request-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 760px;
  }

  .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

  .primary-btn, .secondary-btn, .save-btn, .cancel-btn, .add-row-btn {
    border: none;
    height: 46px;
    padding: 0 18px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }

  .primary-btn, .save-btn, .add-row-btn {
    background: #facc15;
    color: #111;
    box-shadow: 0 14px 30px rgba(250,204,21,0.22);
  }

  .secondary-btn {
    background: rgba(255,255,255,0.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .cancel-btn { background: #f4f4f5; color: #111; }

  .success-box, .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 900;
  }

  .success-box { background: #ecfdf5; border: 1px solid #bbf7d0; color: #047857; }
  .error-box { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 20px;
    box-shadow: 0 12px 34px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
  }

  .stat-card h3 { margin: 0; font-size: 24px; font-weight: 950; color: #111; }
  .stat-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .stat-mark {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 4px;
    background: #facc15;
  }

  .form-card, .toolbar, .table-card, .view-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .form-card, .view-card {
    padding: 24px;
    margin-bottom: 22px;
  }

  .form-header, .view-head, .items-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

  .form-header h2, .view-head h2, .table-header h2, .items-head h3, .view-items h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .items-head h3, .view-items h3 { font-size: 18px; }

  .form-header p, .view-head p, .table-header p, .items-head p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: none;
    background: #f6f6f6;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .form-group { display: flex; flex-direction: column; gap: 8px; }
  .form-group.full { grid-column: span 4; }

  .form-group label {
    font-size: 13px;
    font-weight: 950;
    color: #333;
  }

  .form-group input, .form-group select, .form-group textarea,
  .items-table input, .items-table select {
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

  .form-group textarea { resize: vertical; }

  .form-group input:focus, .form-group select:focus, .form-group textarea:focus,
  .items-table input:focus, .items-table select:focus {
    border-color: #facc15;
    background: #fff;
  }

  .items-card {
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 18px;
    margin-bottom: 20px;
    background: #fafafa;
  }

  .items-table-wrap, .table-wrap { overflow-x: auto; }

  .items-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8px;
    min-width: 760px;
  }

  .items-table th {
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    text-align: left;
    padding: 0 8px 6px;
    background: transparent;
  }

  .items-table td {
    padding: 8px;
    background: #fff;
    border-top: 1px solid #ececec;
    border-bottom: 1px solid #ececec;
  }

  .items-table td:first-child { border-left: 1px solid #ececec; border-radius: 16px 0 0 16px; }
  .items-table td:last-child { border-right: 1px solid #ececec; border-radius: 0 16px 16px 0; }

  .items-table.readonly {
    border-collapse: collapse;
    border-spacing: 0;
    min-width: 720px;
  }

  .items-table.readonly th {
    background: #111;
    color: #facc15;
    padding: 14px;
  }

  .items-table.readonly td {
    border: none;
    border-bottom: 1px solid #f0f0f0;
    padding: 14px;
    border-radius: 0;
  }

  .remove-row-btn {
    width: 36px;
    height: 36px;
    border-radius: 13px;
    border: none;
    background: #fff1f2;
    color: #e11d48;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .detail-card {
    background: #fafafa;
    border: 1px solid #ececec;
    border-radius: 18px;
    padding: 15px;
  }

  .detail-card p {
    margin: 0;
    color: #777;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .detail-card h4 {
    margin: 7px 0 0;
    color: #111;
    font-size: 15px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .workflow-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    border-top: 1px solid #ececec;
    padding-top: 18px;
    margin-top: 20px;
  }

  .workflow-btn {
    border: none;
    height: 42px;
    padding: 0 15px;
    border-radius: 14px;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .workflow-btn.submit { background: #eff6ff; color: #2563eb; }
  .workflow-btn.approve { background: #ecfdf5; color: #047857; }
  .workflow-btn.fulfill { background: #fffbeb; color: #b45309; }
  .workflow-btn.reject, .workflow-btn.cancel { background: #fff1f2; color: #be123c; }

  .toolbar {
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-wrap {
    max-width: 430px;
    width: 100%;
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
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    font-weight: 800;
  }

  .filter-select {
    height: 46px;
    border-radius: 15px;
    border: 1px solid #eeeeee;
    background: #fff;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 900;
    color: #333;
    outline: none;
  }

  .api-chip {
    background: #ecfdf5;
    color: #047857;
    border-radius: 999px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
  }

  .table-card {
    padding: 22px;
    overflow: hidden;
  }

  .table-header { margin-bottom: 18px; }

  table:not(.items-table) {
    width: 100%;
    border-collapse: collapse;
    min-width: 1120px;
  }

  table:not(.items-table) th {
    background: #111;
    color: #facc15;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 15px 14px;
  }

  table:not(.items-table) td {
    padding: 16px 14px;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
    font-size: 13px;
    vertical-align: top;
    font-weight: 700;
  }

  table:not(.items-table) tr:hover td { background: #fffbeb; }

  .main-name {
    font-weight: 950;
    color: #111;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .small-text { color: #777; font-size: 12px; margin-top: 6px; }

  .qty-line { color: #555; font-weight: 800; }
  .qty-line strong { color: #111; }

  .status-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status-badge.draft { background: #f4f4f5; color: #52525b; }
  .status-badge.submitted { background: #eff6ff; color: #2563eb; }
  .status-badge.approved { background: #fffbeb; color: #b45309; }
  .status-badge.fulfilled { background: #ecfdf5; color: #047857; }
  .status-badge.rejected, .status-badge.cancelled { background: #fff1f2; color: #be123c; }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .view-btn, .edit-btn, .delete-btn {
    width: 37px;
    height: 37px;
    border-radius: 13px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .view-btn { background: #f4f4f5; color: #52525b; }
  .edit-btn { background: #eff6ff; color: #2563eb; }
  .delete-btn { background: #fff1f2; color: #e11d48; }

  .right { text-align: right; }

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

  .empty-box h3 { margin: 0; font-size: 18px; font-weight: 950; color: #111; }
  .empty-box p { margin: 0; color: #777; font-size: 13px; }

  .spin { animation: spin 1s linear infinite; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1300px) {
    .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .form-grid, .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .form-group.full { grid-column: span 2; }
  }

  @media (max-width: 900px) {
    .request-hero, .toolbar { flex-direction: column; align-items: stretch; }
    .hero-left { flex-direction: column; }
    .hero-actions, .primary-btn, .secondary-btn { width: 100%; }
    .stats-grid, .form-grid, .detail-grid { grid-template-columns: 1fr; }
    .form-group.full { grid-column: span 1; }
  }
`;