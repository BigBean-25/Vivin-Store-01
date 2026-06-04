import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  CheckCircle2,
  Edit3,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

const initialForm = {
  warehouse_id: "",
  zone_code: "",
  zone_name: "",
  description: "",
  status: "active",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function WarehouseZones() {
  const [zones, setZones] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState({});
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2500);
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/api/warehouse-zones/summary");
      if (res.data.success) setSummary(res.data.summary || {});
    } catch {
      setSummary({});
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/api/warehouses");
      if (res.data.success) {
        setWarehouses(res.data.warehouses || res.data.data || []);
      }
    } catch {
      setWarehouses([]);
    }
  };

  const fetchZones = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/api/warehouse-zones");
      if (res.data.success) setZones(res.data.zones || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch warehouse zones");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => {
    fetchSummary();
    fetchWarehouses();
    fetchZones();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      const text = `
        ${zone.zone_code || ""}
        ${zone.zone_name || ""}
        ${zone.description || ""}
        ${zone.warehouse_name || ""}
        ${zone.warehouse_code || ""}
        ${zone.status || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || zone.status === statusFilter;
      const matchesWarehouse = !warehouseFilter || String(zone.warehouse_id) === String(warehouseFilter);

      return matchesSearch && matchesStatus && matchesWarehouse;
    });
  }, [zones, search, statusFilter, warehouseFilter]);

  const stats = useMemo(() => ({
    total: summary.total_zones || 0,
    active: summary.active_zones || 0,
    inactive: summary.inactive_zones || 0,
    warehouses: summary.warehouses_with_zones || 0,
  }), [summary]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ ...initialForm, warehouse_id: warehouseFilter || "" });
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (zone) => {
    setEditingId(zone.id);
    setFormData({
      warehouse_id: zone.warehouse_id || "",
      zone_code: zone.zone_code || "",
      zone_name: zone.zone_name || "",
      description: zone.description || "",
      status: zone.status || "active",
    });
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(false);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.warehouse_id) {
      setError("Please select a warehouse");
      return;
    }

    if (!formData.zone_name.trim()) {
      setError("Zone name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await API.put(`/api/warehouse-zones/${editingId}`, formData);
        showSuccess("Warehouse zone updated successfully");
      } else {
        await API.post("/api/warehouse-zones", formData);
        showSuccess("Warehouse zone created successfully");
      }

      handleCancelForm();
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save warehouse zone");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (zone) => {
    const newStatus = zone.status === "active" ? "inactive" : "active";
    const msg = `${newStatus === "inactive" ? "Deactivate" : "Activate"} zone "${zone.zone_name}"?`;

    if (!window.confirm(msg)) return;

    try {
      setError("");
      await API.patch(`/api/warehouse-zones/${zone.id}/status`, { status: newStatus });
      showSuccess(`Zone ${newStatus} successfully`);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update zone status");
    }
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`Delete zone "${zone.zone_name}"? This cannot be undone.`)) return;

    try {
      setError("");
      await API.delete(`/api/warehouse-zones/${zone.id}`);
      showSuccess("Warehouse zone deleted successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete warehouse zone");
    }
  };

  return (
    <AdminLayout>
      <div className="wz-page">
        <style>{css}</style>

        <div className="wz-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <Layers size={30} />
            </div>
            <div>
              <div className="eyebrow">Warehouse Structure</div>
              <h1>Warehouse Zones</h1>
              <p>
                Define and manage zones within each warehouse. Zones help organise
                racks, bins and inventory locations for efficient stock management.
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
              Add Zone
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
          <StatCard title="Total Zones" value={stats.total} />
          <StatCard title="Active Zones" value={stats.active} />
          <StatCard title="Inactive Zones" value={stats.inactive} />
          <StatCard title="Warehouses" value={stats.warehouses} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Zone" : "Add New Zone"}</h2>
                <p>Define zone details under a specific warehouse.</p>
              </div>
              <button type="button" className="close-btn" onClick={handleCancelForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Warehouse *</label>
                  <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} required>
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.warehouse_code ? `(${w.warehouse_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Zone Code</label>
                  <input
                    name="zone_code"
                    value={formData.zone_code}
                    onChange={handleChange}
                    placeholder="Auto-generate if empty"
                  />
                </div>

                <div className="form-group">
                  <label>Zone Name *</label>
                  <input
                    name="zone_name"
                    value={formData.zone_name}
                    onChange={handleChange}
                    placeholder="e.g. Cold Storage Zone A"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Zone description or storage type..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCancelForm}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving && <Loader2 size={17} className="spin" />}
                  {saving ? "Saving..." : editingId ? "Update Zone" : "Save Zone"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search zone code, name, warehouse..."
            />
          </div>

          <select
            className="filter-select"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{filteredZones.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Zone List</h2>
            <p>Warehouse zones master records from MySQL database</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading zones...</h3>
              <p>Please wait while zone records are loading.</p>
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="empty-box">
              <Layers size={34} />
              <h3>No zones found</h3>
              <p>Click Add Zone to create your first warehouse zone.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Warehouse</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.map((zone) => (
                    <tr key={zone.id}>
                      <td>
                        <div className="zone-name">{zone.zone_name}</div>
                        <div className="small-text">Code: {zone.zone_code || "-"}</div>
                      </td>
                      <td>
                        <div className="info-line">
                          <Warehouse size={13} />
                          {zone.warehouse_name || "-"}
                        </div>
                        <div className="small-text">{zone.warehouse_code || ""}</div>
                      </td>
                      <td>
                        <div className="desc-text">{zone.description || "-"}</div>
                      </td>
                      <td>
                        <div className="small-text">{formatDate(zone.created_at)}</div>
                      </td>
                      <td>
                        <span className={`status-badge ${zone.status}`}>
                          {zone.status || "active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(zone)}
                            title="Edit Zone"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${zone.status}`}
                            onClick={() => handleToggleStatus(zone)}
                            title={zone.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {zone.status === "active" ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(zone)}
                            title="Delete Zone"
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
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="stat-mark" />
    </div>
  );
}

const css = `
  .wz-page {
    color: #151515;
  }

  .wz-hero {
    background:
      radial-gradient(circle at top right, rgba(139,92,246,0.22), transparent 34%),
      linear-gradient(135deg, #080808, #171717 55%, #050505);
    border: 1px solid rgba(139,92,246,0.18);
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

  .wz-hero::after {
    content: "";
    position: absolute;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    border: 42px solid rgba(139,92,246,0.08);
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
    width: 58px;
    height: 58px;
    border-radius: 16px;
    background: rgba(139,92,246,0.18);
    border: 1px solid rgba(139,92,246,0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-bottom: 5px;
  }

  .wz-hero h1 {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 5px;
  }

  .wz-hero p {
    font-size: 13.5px;
    color: rgba(255,255,255,0.6);
    margin: 0;
    max-width: 520px;
  }

  .hero-actions {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .primary-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: #8b5cf6;
    color: #fff;
    border: none;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s;
  }

  .primary-btn:hover { background: #7c3aed; }

  .secondary-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: rgba(255,255,255,0.08);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.18s;
  }

  .secondary-btn:hover { background: rgba(255,255,255,0.14); }
  .secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .success-box {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 16px;
  }

  .error-box {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #991b1b;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 18px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-card h3 {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 3px;
    color: #111;
  }

  .stat-card p {
    font-size: 12.5px;
    color: #6b7280;
    margin: 0;
  }

  .stat-mark {
    width: 8px;
    height: 40px;
    background: #8b5cf6;
    border-radius: 4px;
    opacity: 0.6;
  }

  .form-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 26px;
    margin-bottom: 20px;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 22px;
  }

  .form-header h2 {
    font-size: 17px;
    font-weight: 700;
    margin: 0 0 4px;
    color: #111;
  }

  .form-header p {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }

  .close-btn {
    background: #f3f4f6;
    border: none;
    border-radius: 8px;
    padding: 7px;
    cursor: pointer;
    color: #374151;
    display: flex;
    align-items: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group.full {
    grid-column: 1 / -1;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 14px;
    color: #111;
    outline: none;
    transition: border-color 0.15s;
    background: #fff;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
  }

  .form-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .cancel-btn {
    padding: 10px 18px;
    border: 1px solid #d1d5db;
    border-radius: 9px;
    background: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    color: #374151;
  }

  .save-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 22px;
    background: #8b5cf6;
    color: #fff;
    border: none;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .search-wrap {
    flex: 1;
    min-width: 220px;
    display: flex;
    align-items: center;
    gap: 9px;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 9px;
    padding: 9px 13px;
    color: #6b7280;
  }

  .search-wrap input {
    border: none;
    outline: none;
    font-size: 14px;
    flex: 1;
    color: #111;
    background: transparent;
  }

  .filter-select {
    border: 1px solid #d1d5db;
    border-radius: 9px;
    padding: 9px 13px;
    font-size: 14px;
    color: #374151;
    background: #fff;
    cursor: pointer;
    outline: none;
  }

  .api-chip {
    font-size: 12.5px;
    color: #6b7280;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 7px 13px;
  }

  .table-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    overflow: hidden;
  }

  .table-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f3f4f6;
  }

  .table-header h2 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 3px;
    color: #111;
  }

  .table-header p {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }

  .empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 56px 24px;
    color: #9ca3af;
    gap: 10px;
    text-align: center;
  }

  .empty-box h3 {
    font-size: 15px;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }

  .empty-box p {
    font-size: 13px;
    margin: 0;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  thead th {
    background: #f9fafb;
    padding: 11px 16px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  thead th.right { text-align: right; }

  tbody td {
    padding: 13px 16px;
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
    vertical-align: top;
  }

  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: #fafafa; }

  .zone-name {
    font-weight: 600;
    color: #111;
    font-size: 14px;
  }

  .small-text {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 2px;
  }

  .info-line {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13.5px;
    color: #374151;
  }

  .desc-text {
    font-size: 13px;
    color: #6b7280;
    max-width: 260px;
    white-space: pre-wrap;
  }

  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .status-badge.active {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .status-badge.inactive {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .action-buttons {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .edit-btn, .delete-btn, .toggle-btn {
    border: none;
    border-radius: 7px;
    padding: 6px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background 0.15s;
  }

  .edit-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .edit-btn:hover { background: #e5e7eb; }

  .toggle-btn.active {
    background: #f0fdf4;
    color: #16a34a;
  }

  .toggle-btn.inactive {
    background: #fef2f2;
    color: #dc2626;
  }

  .toggle-btn:hover { opacity: 0.8; }

  .delete-btn {
    background: #fef2f2;
    color: #dc2626;
  }

  .delete-btn:hover { background: #fee2e2; }

  .spin {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
