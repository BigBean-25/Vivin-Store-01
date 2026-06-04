import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Box,
  CheckCircle2,
  Edit3,
  Layers3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

const BIN_STATUSES = ["empty", "occupied", "reserved", "inactive"];

const STATUS_STYLE = {
  empty:    { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  occupied: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  reserved: { bg: "#fefce8", color: "#854d0e", border: "#fde68a" },
  inactive: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
};

const initialForm = {
  warehouse_id: "",
  zone_id: "",
  rack_id: "",
  bin_code: "",
  bin_name: "",
  description: "",
  capacity: "",
  status: "empty",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

export default function WarehouseBins() {
  const [bins, setBins] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState([]);
  const [racks, setRacks] = useState([]);
  const [summary, setSummary] = useState({});
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [rackFilter, setRackFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 2500);
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/api/warehouse-bins/summary");
      if (res.data.success) setSummary(res.data.summary || {});
    } catch { setSummary({}); }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/api/warehouses");
      if (res.data.success) setWarehouses(res.data.warehouses || res.data.data || []);
    } catch { setWarehouses([]); }
  };

  const fetchZones = async () => {
    try {
      const res = await API.get("/api/warehouse-zones");
      if (res.data.success) setZones(res.data.zones || []);
    } catch { setZones([]); }
  };

  const fetchRacks = async () => {
    try {
      const res = await API.get("/api/warehouse-racks");
      if (res.data.success) setRacks(res.data.racks || []);
    } catch { setRacks([]); }
  };

  const fetchBins = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/api/warehouse-bins");
      if (res.data.success) setBins(res.data.bins || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch warehouse bins");
    } finally { setLoading(false); }
  };

  const refreshAll = () => {
    fetchSummary();
    fetchWarehouses();
    fetchZones();
    fetchRacks();
    fetchBins();
  };

  useEffect(() => { refreshAll(); }, []);

  const zonesForForm = useMemo(() =>
    formData.warehouse_id ? zones.filter((z) => String(z.warehouse_id) === String(formData.warehouse_id)) : zones
  , [zones, formData.warehouse_id]);

  const racksForForm = useMemo(() =>
    formData.zone_id ? racks.filter((r) => String(r.zone_id) === String(formData.zone_id))
    : formData.warehouse_id ? racks.filter((r) => String(r.warehouse_id) === String(formData.warehouse_id))
    : racks
  , [racks, formData.warehouse_id, formData.zone_id]);

  const zonesForFilter = useMemo(() =>
    warehouseFilter ? zones.filter((z) => String(z.warehouse_id) === String(warehouseFilter)) : zones
  , [zones, warehouseFilter]);

  const racksForFilter = useMemo(() =>
    zoneFilter ? racks.filter((r) => String(r.zone_id) === String(zoneFilter))
    : warehouseFilter ? racks.filter((r) => String(r.warehouse_id) === String(warehouseFilter))
    : racks
  , [racks, warehouseFilter, zoneFilter]);

  const filteredBins = useMemo(() => {
    return bins.filter((bin) => {
      const text = `
        ${bin.bin_code || ""} ${bin.bin_name || ""} ${bin.description || ""}
        ${bin.rack_name || ""} ${bin.rack_code || ""} ${bin.zone_name || ""}
        ${bin.warehouse_name || ""} ${bin.status || ""}
      `.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (!statusFilter || bin.status === statusFilter) &&
        (!warehouseFilter || String(bin.warehouse_id) === String(warehouseFilter)) &&
        (!zoneFilter || String(bin.zone_id) === String(zoneFilter)) &&
        (!rackFilter || String(bin.rack_id) === String(rackFilter))
      );
    });
  }, [bins, search, statusFilter, warehouseFilter, zoneFilter, rackFilter]);

  const stats = useMemo(() => ({
    total: Number(summary.total_bins) || 0,
    empty: Number(summary.empty_bins) || 0,
    occupied: Number(summary.occupied_bins) || 0,
    inactive: Number(summary.inactive_bins) || 0,
  }), [summary]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      warehouse_id: warehouseFilter || "",
      zone_id: zoneFilter || "",
      rack_id: rackFilter || "",
    });
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (bin) => {
    setEditingId(bin.id);
    setFormData({
      warehouse_id: bin.warehouse_id || "",
      zone_id: bin.zone_id || "",
      rack_id: bin.rack_id || "",
      bin_code: bin.bin_code || "",
      bin_name: bin.bin_name || "",
      description: bin.description || "",
      capacity: bin.capacity || "",
      status: bin.status || "empty",
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
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "warehouse_id") { updated.zone_id = ""; updated.rack_id = ""; }
      if (name === "zone_id") { updated.rack_id = ""; }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.warehouse_id) { setError("Please select a warehouse"); return; }
    if (!formData.bin_name.trim()) { setError("Bin name is required"); return; }

    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await API.put(`/api/warehouse-bins/${editingId}`, formData);
        showSuccess("Warehouse bin updated successfully");
      } else {
        await API.post("/api/warehouse-bins", formData);
        showSuccess("Warehouse bin created successfully");
      }
      handleCancelForm();
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save warehouse bin");
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (bin, newStatus) => {
    if (!window.confirm(`Set bin "${bin.bin_name}" status to "${newStatus}"?`)) return;
    try {
      setError("");
      await API.patch(`/api/warehouse-bins/${bin.id}/status`, { status: newStatus });
      showSuccess(`Bin status updated to ${newStatus}`);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update bin status");
    }
  };

  const handleDelete = async (bin) => {
    if (!window.confirm(`Delete bin "${bin.bin_name}"? This cannot be undone.`)) return;
    try {
      setError("");
      await API.delete(`/api/warehouse-bins/${bin.id}`);
      showSuccess("Warehouse bin deleted successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete warehouse bin");
    }
  };

  return (
    <AdminLayout>
      <div className="wb-page">
        <style>{css}</style>

        <div className="wb-hero">
          <div className="hero-left">
            <div className="hero-icon"><Box size={30} /></div>
            <div>
              <div className="eyebrow">Warehouse Structure</div>
              <h1>Warehouse Bins</h1>
              <p>
                Manage storage bins within racks. Bins are the smallest storage
                unit and will connect with product and batch location mapping.
              </p>
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" className="secondary-btn" onClick={refreshAll} disabled={loading}>
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>
            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} /> Add Bin
            </button>
          </div>
        </div>

        {success && <div className="success-box"><CheckCircle2 size={18} />{success}</div>}
        {error && <div className="error-box">{error}</div>}

        <div className="stats-grid">
          <StatCard title="Total Bins" value={stats.total} color="#6366f1" />
          <StatCard title="Empty" value={stats.empty} color="#10b981" />
          <StatCard title="Occupied" value={stats.occupied} color="#3b82f6" />
          <StatCard title="Inactive" value={stats.inactive} color="#ef4444" />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Bin" : "Add New Bin"}</h2>
                <p>Assign bin to a warehouse → zone → rack hierarchy.</p>
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
                  <label>Zone</label>
                  <select name="zone_id" value={formData.zone_id} onChange={handleChange}>
                    <option value="">Select Zone (optional)</option>
                    {zonesForForm.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.zone_name} {z.zone_code ? `(${z.zone_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Rack</label>
                  <select name="rack_id" value={formData.rack_id} onChange={handleChange}>
                    <option value="">Select Rack (optional)</option>
                    {racksForForm.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rack_name} {r.rack_code ? `(${r.rack_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Bin Code</label>
                  <input
                    name="bin_code" value={formData.bin_code} onChange={handleChange}
                    placeholder="Auto-generate if empty"
                  />
                </div>

                <div className="form-group">
                  <label>Bin Name *</label>
                  <input
                    name="bin_name" value={formData.bin_name} onChange={handleChange}
                    placeholder="e.g. Bin A-01-01" required
                  />
                </div>

                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number" name="capacity" value={formData.capacity}
                    onChange={handleChange} placeholder="0" min="0" step="0.001"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    {BIN_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    name="description" value={formData.description} onChange={handleChange}
                    rows="2" placeholder="Bin notes or storage type..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCancelForm}>Cancel</button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving && <Loader2 size={17} className="spin" />}
                  {saving ? "Saving..." : editingId ? "Update Bin" : "Save Bin"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bin code, name, rack, zone, warehouse..."
            />
          </div>

          <select className="filter-select" value={warehouseFilter}
            onChange={(e) => { setWarehouseFilter(e.target.value); setZoneFilter(""); setRackFilter(""); }}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select className="filter-select" value={zoneFilter}
            onChange={(e) => { setZoneFilter(e.target.value); setRackFilter(""); }}>
            <option value="">All Zones</option>
            {zonesForFilter.map((z) => <option key={z.id} value={z.id}>{z.zone_name}</option>)}
          </select>

          <select className="filter-select" value={rackFilter} onChange={(e) => setRackFilter(e.target.value)}>
            <option value="">All Racks</option>
            {racksForFilter.map((r) => <option key={r.id} value={r.id}>{r.rack_name}</option>)}
          </select>

          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {BIN_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <div className="api-chip">API Connected · <strong>{filteredBins.length}</strong> records</div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Bin List</h2>
            <p>Warehouse bin master records from MySQL database</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading bins...</h3>
              <p>Please wait while bin records are loading.</p>
            </div>
          ) : filteredBins.length === 0 ? (
            <div className="empty-box">
              <Box size={34} />
              <h3>No bins found</h3>
              <p>Click Add Bin to create your first warehouse bin.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bin</th>
                    <th>Rack</th>
                    <th>Zone / Warehouse</th>
                    <th>Capacity</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBins.map((bin) => (
                    <tr key={bin.id}>
                      <td>
                        <div className="bin-name">{bin.bin_name || "-"}</div>
                        <div className="small-text">Code: {bin.bin_code || "-"}</div>
                        {bin.description && <div className="desc-text">{bin.description}</div>}
                      </td>
                      <td>
                        <div className="info-line"><Package size={13} />{bin.rack_name || "-"}</div>
                        <div className="small-text">{bin.rack_code || ""}</div>
                      </td>
                      <td>
                        <div className="info-line"><Layers3 size={13} />{bin.zone_name || "-"}</div>
                        <div className="info-line mt2"><Warehouse size={13} />{bin.warehouse_name || "-"}</div>
                      </td>
                      <td>
                        <div className="small-text">
                          {bin.capacity > 0 ? Number(bin.capacity).toLocaleString() : "-"}
                        </div>
                      </td>
                      <td><div className="small-text">{formatDate(bin.created_at)}</div></td>
                      <td>
                        <StatusBadge status={bin.status} />
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button type="button" className="edit-btn" onClick={() => handleEdit(bin)} title="Edit">
                            <Edit3 size={16} />
                          </button>
                          <select
                            className="status-select"
                            value={bin.status}
                            onChange={(e) => handleStatusChange(bin, e.target.value)}
                            title="Change Status"
                          >
                            {BIN_STATUSES.map((s) => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                          <button type="button" className="delete-btn" onClick={() => handleDelete(bin)} title="Delete">
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

function StatCard({ title, value, color }) {
  return (
    <div className="stat-card">
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="stat-mark" style={{ background: color }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.inactive;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: "20px",
      fontSize: "12px", fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "-"}
    </span>
  );
}

const css = `
  .wb-page { color: #151515; }

  .wb-hero {
    background:
      radial-gradient(circle at top right, rgba(99,102,241,0.22), transparent 34%),
      linear-gradient(135deg, #080808, #171717 55%, #050505);
    border: 1px solid rgba(99,102,241,0.18);
    border-radius: 30px; padding: 32px; margin-bottom: 22px;
    display: flex; justify-content: space-between; gap: 22px; align-items: flex-start;
    box-shadow: 0 24px 70px rgba(0,0,0,0.22); color: #fff;
    position: relative; overflow: hidden;
  }
  .wb-hero::after {
    content: ""; position: absolute; width: 220px; height: 220px; border-radius: 50%;
    border: 42px solid rgba(99,102,241,0.08); right: -70px; top: -90px;
  }
  .hero-left { display: flex; gap: 18px; align-items: flex-start; position: relative; z-index: 1; }
  .hero-icon {
    width: 58px; height: 58px; border-radius: 16px;
    background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.28);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 5px; }
  .wb-hero h1 { font-size: 26px; font-weight: 700; margin: 0 0 5px; }
  .wb-hero p { font-size: 13.5px; color: rgba(255,255,255,0.6); margin: 0; max-width: 520px; }
  .hero-actions { display: flex; gap: 10px; flex-shrink: 0; position: relative; z-index: 1; }

  .primary-btn {
    display: flex; align-items: center; gap: 7px; background: #6366f1; color: #fff;
    border: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .primary-btn:hover { background: #4f46e5; }
  .secondary-btn {
    display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.08); color: #fff;
    border: 1px solid rgba(255,255,255,0.14); padding: 10px 16px; border-radius: 10px;
    font-size: 14px; font-weight: 500; cursor: pointer;
  }
  .secondary-btn:hover { background: rgba(255,255,255,0.14); }
  .secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .success-box {
    display: flex; align-items: center; gap: 10px; background: #f0fdf4;
    border: 1px solid #86efac; color: #166534; border-radius: 10px;
    padding: 12px 16px; font-size: 14px; font-weight: 500; margin-bottom: 16px;
  }
  .error-box {
    background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;
    border-radius: 10px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px;
  }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .stat-card {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
    padding: 18px 20px; display: flex; justify-content: space-between; align-items: center;
  }
  .stat-card h3 { font-size: 26px; font-weight: 700; margin: 0 0 3px; color: #111; }
  .stat-card p { font-size: 12.5px; color: #6b7280; margin: 0; }
  .stat-mark { width: 8px; height: 40px; border-radius: 4px; opacity: 0.65; }

  .form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 26px; margin-bottom: 20px; }
  .form-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
  .form-header h2 { font-size: 17px; font-weight: 700; margin: 0 0 4px; color: #111; }
  .form-header p { font-size: 13px; color: #6b7280; margin: 0; }
  .close-btn { background: #f3f4f6; border: none; border-radius: 8px; padding: 7px; cursor: pointer; color: #374151; display: flex; align-items: center; }

  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 18px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: 1 / -1; }
  .form-group label { font-size: 13px; font-weight: 600; color: #374151; }
  .form-group input, .form-group select, .form-group textarea {
    border: 1px solid #d1d5db; border-radius: 8px; padding: 9px 12px;
    font-size: 14px; color: #111; outline: none; background: #fff; resize: vertical;
  }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
    border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .cancel-btn { padding: 10px 18px; border: 1px solid #d1d5db; border-radius: 9px; background: #fff; font-size: 14px; font-weight: 500; cursor: pointer; color: #374151; }
  .save-btn { display: flex; align-items: center; gap: 7px; padding: 10px 22px; background: #6366f1; color: #fff; border: none; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .search-wrap { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 9px; background: #fff; border: 1px solid #d1d5db; border-radius: 9px; padding: 9px 13px; color: #6b7280; }
  .search-wrap input { border: none; outline: none; font-size: 14px; flex: 1; color: #111; background: transparent; }
  .filter-select { border: 1px solid #d1d5db; border-radius: 9px; padding: 9px 13px; font-size: 14px; color: #374151; background: #fff; cursor: pointer; outline: none; }
  .api-chip { font-size: 12.5px; color: #6b7280; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 7px 13px; }

  .table-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; }
  .table-header { padding: 20px 24px 16px; border-bottom: 1px solid #f3f4f6; }
  .table-header h2 { font-size: 16px; font-weight: 700; margin: 0 0 3px; color: #111; }
  .table-header p { font-size: 13px; color: #6b7280; margin: 0; }

  .empty-box { display: flex; flex-direction: column; align-items: center; padding: 56px 24px; color: #9ca3af; gap: 10px; text-align: center; }
  .empty-box h3 { font-size: 15px; font-weight: 600; color: #374151; margin: 0; }
  .empty-box p { font-size: 13px; margin: 0; }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead th { background: #f9fafb; padding: 11px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  thead th.right { text-align: right; }
  tbody td { padding: 13px 16px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: top; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: #fafafa; }

  .bin-name { font-weight: 600; color: #111; font-size: 14px; }
  .small-text { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .desc-text { font-size: 12px; color: #6b7280; margin-top: 3px; }
  .info-line { display: flex; align-items: center; gap: 5px; font-size: 13px; color: #374151; }
  .mt2 { margin-top: 3px; }

  .action-buttons { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
  .edit-btn, .delete-btn { border: none; border-radius: 7px; padding: 6px 8px; cursor: pointer; display: flex; align-items: center; }
  .edit-btn { background: #f3f4f6; color: #374151; }
  .edit-btn:hover { background: #e5e7eb; }
  .delete-btn { background: #fef2f2; color: #dc2626; }
  .delete-btn:hover { background: #fee2e2; }
  .status-select { border: 1px solid #d1d5db; border-radius: 7px; padding: 5px 8px; font-size: 12px; color: #374151; background: #fff; cursor: pointer; outline: none; }
  .status-select:focus { border-color: #6366f1; }

  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
