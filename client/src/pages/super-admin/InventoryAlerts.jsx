import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Edit3,
  Eye,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

const initialForm = {
  warehouse_id: "",
  product_id: "",
  alert_type: "low_stock",
  message: "",
  status: "open",
};

const formatQty = (value) => Number(value || 0).toFixed(3);

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

const alertTypeLabels = {
  low_stock: "Low Stock",
  expiry: "Expiry",
  dead_stock: "Dead Stock",
  overstock: "Overstock",
};

export default function InventoryAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2600);
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/api/inventory-alerts/summary");

      if (res.data.success) {
        setSummary(res.data.summary || {});
      }
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

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("alert_type", typeFilter);
      if (warehouseFilter) params.append("warehouse_id", warehouseFilter);

      const res = await API.get(`/api/inventory-alerts?${params.toString()}`);

      if (res.data.success) {
        setAlerts(res.data.alerts || res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch inventory alerts");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchSummary(),
      fetchWarehouses(),
      fetchProducts(),
      fetchAlerts(),
    ]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlerts();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, warehouseFilter]);

  const stats = useMemo(() => {
    return {
      total: summary.total_alerts || 0,
      open: summary.open_alerts || 0,
      closed: summary.closed_alerts || 0,
      lowStock: summary.low_stock_alerts || 0,
      expiry: summary.expiry_alerts || 0,
      deadStock: summary.dead_stock_alerts || 0,
      overstock: summary.overstock_alerts || 0,
    };
  }, [summary]);

  const openCreateForm = () => {
    setEditingId(null);
    setViewData(null);
    setFormData(initialForm);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(false);
    setError("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.product_id) {
      setError("Product is required");
      return false;
    }

    if (!formData.alert_type) {
      setError("Alert type is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        warehouse_id: formData.warehouse_id || null,
        product_id: formData.product_id,
        alert_type: formData.alert_type,
        message: formData.message,
        status: formData.status,
      };

      if (editingId) {
        await API.put(`/api/inventory-alerts/${editingId}`, payload);
        showSuccess("Inventory alert updated successfully");
      } else {
        await API.post("/api/inventory-alerts", payload);
        showSuccess("Inventory alert created successfully");
      }

      closeForm();
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save inventory alert");
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (alert) => {
    try {
      setError("");
      setShowForm(false);

      const res = await API.get(`/api/inventory-alerts/${alert.id}`);

      if (res.data.success) {
        setViewData(res.data.alert);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to view inventory alert");
    }
  };

  const handleEdit = async (alert) => {
    try {
      setError("");
      setViewData(null);

      const res = await API.get(`/api/inventory-alerts/${alert.id}`);

      if (res.data.success) {
        const item = res.data.alert;

        setEditingId(item.id);
        setFormData({
          warehouse_id: item.warehouse_id || "",
          product_id: item.product_id || "",
          alert_type: item.alert_type || "low_stock",
          message: item.message || "",
          status: item.status || "open",
        });

        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit inventory alert");
    }
  };

  const handleGenerateAlerts = async () => {
    const confirmGenerate = window.confirm(
      "Generate alerts from low stock and expiry data?"
    );

    if (!confirmGenerate) return;

    try {
      setGenerating(true);
      setError("");

      const res = await API.post("/api/inventory-alerts/generate");

      showSuccess(
        `Alerts generated. Created: ${res.data.created_count || 0}, Updated: ${
          res.data.updated_count || 0
        }`
      );

      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate inventory alerts");
    } finally {
      setGenerating(false);
    }
  };

  const handleCloseAlert = async (alert) => {
    const confirmClose = window.confirm(`Close alert #${alert.id}?`);

    if (!confirmClose) return;

    try {
      setError("");
      await API.patch(`/api/inventory-alerts/${alert.id}/close`);
      showSuccess("Inventory alert closed successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to close alert");
    }
  };

  const handleReopenAlert = async (alert) => {
    const confirmReopen = window.confirm(`Reopen alert #${alert.id}?`);

    if (!confirmReopen) return;

    try {
      setError("");
      await API.patch(`/api/inventory-alerts/${alert.id}/reopen`);
      showSuccess("Inventory alert reopened successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reopen alert");
    }
  };

  const handleDeleteAlert = async (alert) => {
    const confirmDelete = window.confirm(`Delete alert #${alert.id}?`);

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/inventory-alerts/${alert.id}`);
      showSuccess("Inventory alert deleted successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete alert");
    }
  };

  return (
    <AdminLayout>
      <div className="alert-page">
        <style>{css}</style>

        <div className="alert-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <BellRing size={30} />
            </div>

            <div>
              <div className="eyebrow">Inventory Control</div>
              <h1>Inventory Alerts</h1>
              <p>
                Manage low stock alerts, expiry alerts, dead stock alerts and
                overstock alerts with open and closed status workflow.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={refreshAll}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

            <button
              type="button"
              className="secondary-btn warning"
              onClick={handleGenerateAlerts}
              disabled={generating}
            >
              {generating ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <AlertTriangle size={17} />
              )}
              Generate Alerts
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Alert
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
          <StatCard title="Total Alerts" value={stats.total} />
          <StatCard title="Open Alerts" value={stats.open} />
          <StatCard title="Closed Alerts" value={stats.closed} />
          <StatCard title="Low Stock" value={stats.lowStock} />
          <StatCard title="Expiry" value={stats.expiry} />
          <StatCard title="Dead Stock" value={stats.deadStock} />
          <StatCard title="Overstock" value={stats.overstock} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Inventory Alert" : "Create Inventory Alert"}</h2>
                <p>Select warehouse, product, alert type and status.</p>
              </div>

              <button type="button" className="close-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Warehouse</label>
                  <select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={handleFormChange}
                  >
                    <option value="">All / No Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}{" "}
                        {warehouse.warehouse_code
                          ? `(${warehouse.warehouse_code})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Product *</label>
                  <select
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.sku ? `(${product.sku})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Alert Type *</label>
                  <select
                    name="alert_type"
                    value={formData.alert_type}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="low_stock">Low Stock</option>
                    <option value="expiry">Expiry</option>
                    <option value="dead_stock">Dead Stock</option>
                    <option value="overstock">Overstock</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Message</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleFormChange}
                    placeholder="Alert message..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? (
                    <Loader2 size={17} className="spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {saving ? "Saving..." : editingId ? "Update Alert" : "Create Alert"}
                </button>
              </div>
            </form>
          </div>
        )}

        {viewData && (
          <div className="view-card">
            <div className="view-head">
              <div>
                <h2>{alertTypeLabels[viewData.alert_type] || viewData.alert_type}</h2>
                <p>
                  {viewData.product_name} · {viewData.warehouse_name || "All Warehouse"}
                </p>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={() => setViewData(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <Detail title="Product" value={viewData.product_name} />
              <Detail title="SKU" value={viewData.sku || viewData.product_code} />
              <Detail title="Warehouse" value={viewData.warehouse_name || "All Warehouse"} />
              <Detail title="Available Qty" value={formatQty(viewData.available_qty)} />
              <Detail title="Min Stock" value={formatQty(viewData.min_stock_level)} />
              <Detail title="Reorder Level" value={formatQty(viewData.reorder_level)} />
              <Detail title="Alert Type" value={alertTypeLabels[viewData.alert_type]} />
              <Detail title="Status" value={viewData.status} />
              <Detail title="Created At" value={formatDateTime(viewData.created_at)} />
            </div>

            <div className="message-box">
              <h3>Alert Message</h3>
              <p>{viewData.message || "-"}</p>
            </div>
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert, product, warehouse, message..."
            />
          </div>

          <select
            className="filter-select"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Alert Types</option>
            <option value="low_stock">Low Stock</option>
            <option value="expiry">Expiry</option>
            <option value="dead_stock">Dead Stock</option>
            <option value="overstock">Overstock</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{alerts.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Inventory Alert List</h2>
            <p>Low stock, expiry, dead stock and overstock alerts</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading inventory alerts...</h3>
              <p>Please wait while alerts are loading.</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-box">
              <BellRing size={34} />
              <h3>No inventory alerts found</h3>
              <p>Click Generate Alerts to create alerts from current stock data.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Alert</th>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Stock</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <span className={`type-badge ${alert.alert_type}`}>
                          {alertTypeLabels[alert.alert_type] || alert.alert_type}
                        </span>
                        <div className="small-text">Alert ID: #{alert.id}</div>
                      </td>

                      <td>
                        <div className="main-name">
                          <Package size={14} />
                          {alert.product_name || "-"}
                        </div>
                        <div className="small-text">
                          {alert.sku || alert.product_code || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="main-name">
                          <Warehouse size={14} />
                          {alert.warehouse_name || "All Warehouse"}
                        </div>
                        <div className="small-text">
                          {alert.warehouse_code || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="stock-line">
                          Available: <strong>{formatQty(alert.available_qty)}</strong>
                        </div>
                        <div className="small-text">
                          Min: {formatQty(alert.min_stock_level)} · Reorder:{" "}
                          {formatQty(alert.reorder_level)}
                        </div>
                      </td>

                      <td>
                        <div className="message-text">{alert.message || "-"}</div>
                      </td>

                      <td>
                        <span className={`status-badge ${alert.status}`}>
                          {alert.status}
                        </span>
                      </td>

                      <td>{formatDateTime(alert.created_at)}</td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="view-btn"
                            onClick={() => handleView(alert)}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(alert)}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>

                          {alert.status === "open" ? (
                            <button
                              type="button"
                              className="close-alert-btn"
                              onClick={() => handleCloseAlert(alert)}
                              title="Close Alert"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="reopen-btn"
                              onClick={() => handleReopenAlert(alert)}
                              title="Reopen Alert"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDeleteAlert(alert)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
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
  .alert-page { color: #151515; }

  .alert-hero {
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
    position: relative;
    overflow: hidden;
  }

  .alert-hero::after {
    content: "";
    position: absolute;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    border: 42px solid rgba(250,204,21,0.08);
    right: -70px;
    top: -90px;
  }

  .hero-left {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }

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

  .alert-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .alert-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 720px;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    position: relative;
    z-index: 1;
  }

  .primary-btn,
  .secondary-btn,
  .save-btn,
  .cancel-btn {
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
  }

  .primary-btn,
  .save-btn {
    background: #facc15;
    color: #111;
    box-shadow: 0 14px 30px rgba(250,204,21,0.24);
  }

  .secondary-btn {
    background: rgba(255,255,255,0.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .secondary-btn.warning {
    color: #facc15;
  }

  .cancel-btn {
    background: #f4f4f5;
    color: #111;
  }

  .success-box,
  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 900;
  }

  .success-box {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
  }

  .error-box {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
  }

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

  .stat-card h3 {
    margin: 0;
    font-size: 24px;
    font-weight: 950;
    color: #111;
    letter-spacing: -0.7px;
  }

  .stat-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .stat-mark {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: #facc15;
  }

  .form-card,
  .toolbar,
  .table-card,
  .view-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .form-card,
  .view-card {
    padding: 24px;
    margin-bottom: 22px;
  }

  .form-header,
  .view-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

  .form-header h2,
  .view-head h2,
  .table-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .form-header p,
  .view-head p,
  .table-header p {
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

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group.full {
    grid-column: span 4;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 950;
    color: #333;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    border: 1.5px solid #e8e8e8;
    border-radius: 15px;
    padding: 13px 14px;
    font-size: 14px;
    font-weight: 700;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
    background: #fbfbfb;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    border-color: #facc15;
    background: #fff;
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
    margin-bottom: 20px;
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

  .message-box {
    border-top: 1px solid #ececec;
    padding-top: 18px;
  }

  .message-box h3 {
    margin: 0 0 8px;
    color: #111;
    font-size: 18px;
    font-weight: 950;
  }

  .message-box p {
    margin: 0;
    color: #555;
    line-height: 1.7;
    font-weight: 700;
  }

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

  .table-header {
    margin-bottom: 18px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1180px;
  }

  th {
    background: #111;
    color: #facc15;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 15px 14px;
    border-bottom: 1px solid #222;
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

  .main-name {
    font-weight: 950;
    color: #111;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .small-text {
    color: #777;
    font-size: 12px;
    margin-top: 6px;
  }

  .stock-line {
    color: #555;
    font-weight: 800;
  }

  .stock-line strong {
    color: #111;
  }

  .message-text {
    max-width: 330px;
    color: #555;
    line-height: 1.6;
  }

  .type-badge,
  .status-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .type-badge.low_stock {
    background: #fffbeb;
    color: #b45309;
  }

  .type-badge.expiry {
    background: #fff1f2;
    color: #be123c;
  }

  .type-badge.dead_stock {
    background: #f4f4f5;
    color: #52525b;
  }

  .type-badge.overstock {
    background: #eff6ff;
    color: #2563eb;
  }

  .status-badge.open {
    background: #fff1f2;
    color: #be123c;
  }

  .status-badge.closed {
    background: #ecfdf5;
    color: #047857;
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .view-btn,
  .edit-btn,
  .close-alert-btn,
  .reopen-btn,
  .delete-btn {
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
    background: #f4f4f5;
    color: #52525b;
  }

  .edit-btn {
    background: #eff6ff;
    color: #2563eb;
  }

  .close-alert-btn {
    background: #ecfdf5;
    color: #047857;
  }

  .reopen-btn {
    background: #fffbeb;
    color: #b45309;
  }

  .delete-btn {
    background: #fff1f2;
    color: #e11d48;
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
    .stats-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .form-grid,
    .detail-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .form-group.full {
      grid-column: span 2;
    }
  }

  @media (max-width: 900px) {
    .stats-grid,
    .form-grid,
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full {
      grid-column: span 1;
    }

    .alert-hero,
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions {
      width: 100%;
    }

    .primary-btn,
    .secondary-btn {
      width: 100%;
    }
  }
`;