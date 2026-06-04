import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  Users,
  Warehouse,
  X,
} from "lucide-react";

const USER_TYPE_LABEL = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
  warehouse_staff: "Warehouse Staff",
  delivery_driver: "Delivery Driver",
};

const initialForm = {
  warehouse_id: "",
  user_id: "",
  role_title: "",
  status: "active",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

export default function WarehouseStaff() {
  const [staffList, setStaffList] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
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

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 2500);
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/api/warehouse-staff/summary");
      if (res.data.success) setSummary(res.data.summary || {});
    } catch { setSummary({}); }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/api/warehouses");
      if (res.data.success) setWarehouses(res.data.warehouses || res.data.data || []);
    } catch { setWarehouses([]); }
  };

  const fetchAssignableUsers = async (warehouseId = "") => {
    try {
      const params = warehouseId ? `?warehouse_id=${warehouseId}` : "";
      const res = await API.get(`/api/warehouse-staff/assignable-users${params}`);
      if (res.data.success) setUsers(res.data.users || []);
    } catch { setUsers([]); }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/api/warehouse-staff");
      if (res.data.success) setStaffList(res.data.staff || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch warehouse staff");
    } finally { setLoading(false); }
  };

  const refreshAll = () => {
    fetchSummary();
    fetchWarehouses();
    fetchStaff();
  };

  useEffect(() => { refreshAll(); }, []);

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const text = `
        ${s.user_name || ""} ${s.user_email || ""} ${s.user_phone || ""}
        ${s.role_title || ""} ${s.warehouse_name || ""} ${s.user_type || ""}
        ${s.status || ""}
      `.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (statusFilter === "all" || s.status === statusFilter) &&
        (!warehouseFilter || String(s.warehouse_id) === String(warehouseFilter))
      );
    });
  }, [staffList, search, statusFilter, warehouseFilter]);

  const stats = useMemo(() => ({
    total: Number(summary.total_mappings) || 0,
    active: Number(summary.active_staff) || 0,
    inactive: Number(summary.inactive_staff) || 0,
    warehouses: Number(summary.warehouses_with_staff) || 0,
  }), [summary]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ ...initialForm, warehouse_id: warehouseFilter || "" });
    setError("");
    setShowForm(true);
    if (warehouseFilter) {
      fetchAssignableUsers(warehouseFilter);
    } else {
      fetchAssignableUsers();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setFormData({
      warehouse_id: record.warehouse_id || "",
      user_id: record.user_id || "",
      role_title: record.role_title || "",
      status: record.status || "active",
    });
    setError("");
    setShowForm(true);
    fetchAssignableUsers(record.warehouse_id);
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
      if (name === "warehouse_id") {
        updated.user_id = "";
        fetchAssignableUsers(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.warehouse_id) { setError("Please select a warehouse"); return; }
    if (!formData.user_id) { setError("Please select a user"); return; }

    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await API.put(`/api/warehouse-staff/${editingId}`, formData);
        showSuccess("Staff mapping updated successfully");
      } else {
        await API.post("/api/warehouse-staff", formData);
        showSuccess("Staff assigned to warehouse successfully");
      }
      handleCancelForm();
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save staff mapping");
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    if (!window.confirm(`${newStatus === "inactive" ? "Deactivate" : "Activate"} ${record.user_name}'s mapping?`)) return;
    try {
      setError("");
      await API.patch(`/api/warehouse-staff/${record.id}/status`, { status: newStatus });
      showSuccess(`Staff mapping ${newStatus}`);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Remove ${record.user_name} from ${record.warehouse_name}?`)) return;
    try {
      setError("");
      await API.delete(`/api/warehouse-staff/${record.id}`);
      showSuccess("Staff mapping removed successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove staff mapping");
    }
  };

  return (
    <AdminLayout>
      <div className="ws-page">
        <style>{css}</style>

        <div className="ws-hero">
          <div className="hero-left">
            <div className="hero-icon"><Users size={30} /></div>
            <div>
              <div className="eyebrow">Warehouse Structure</div>
              <h1>Warehouse Staff</h1>
              <p>
                Map users and staff to warehouses with designated roles. Staff
                assignments are used in inventory approval and stock issue flows.
              </p>
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" className="secondary-btn" onClick={refreshAll} disabled={loading}>
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>
            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} /> Assign Staff
            </button>
          </div>
        </div>

        {success && <div className="success-box"><CheckCircle2 size={18} />{success}</div>}
        {error && <div className="error-box">{error}</div>}

        <div className="stats-grid">
          <StatCard title="Total Mappings" value={stats.total} />
          <StatCard title="Active Staff" value={stats.active} />
          <StatCard title="Inactive Staff" value={stats.inactive} />
          <StatCard title="Warehouses Covered" value={stats.warehouses} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Staff Mapping" : "Assign Staff to Warehouse"}</h2>
                <p>Link a user account to a warehouse with an optional role title.</p>
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
                  <label>User / Staff *</label>
                  <select name="user_id" value={formData.user_id} onChange={handleChange} required>
                    <option value="">
                      {formData.warehouse_id
                        ? "Select User"
                        : "Select warehouse first"}
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.email} ({USER_TYPE_LABEL[u.user_type] || u.user_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Role Title</label>
                  <input
                    name="role_title" value={formData.role_title} onChange={handleChange}
                    placeholder="e.g. Warehouse Manager, Store Keeper"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCancelForm}>Cancel</button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving && <Loader2 size={17} className="spin" />}
                  {saving ? "Saving..." : editingId ? "Update Mapping" : "Assign Staff"}
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
              placeholder="Search name, email, role, warehouse..."
            />
          </div>

          <select className="filter-select" value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select className="filter-select" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="api-chip">API Connected · <strong>{filteredStaff.length}</strong> records</div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Staff Assignments</h2>
            <p>User-to-warehouse mapping records from MySQL database</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading staff...</h3>
              <p>Please wait while records are loading.</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="empty-box">
              <UserCheck size={34} />
              <h3>No staff assigned</h3>
              <p>Click Assign Staff to link a user to a warehouse.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Warehouse</th>
                    <th>Role Title</th>
                    <th>User Type</th>
                    <th>Assigned On</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <div className="staff-name">{record.user_name || "-"}</div>
                        <div className="small-text">{record.user_email || ""}</div>
                        {record.user_phone && (
                          <div className="small-text">{record.user_phone}</div>
                        )}
                      </td>
                      <td>
                        <div className="info-line">
                          <Warehouse size={13} />{record.warehouse_name || "-"}
                        </div>
                        <div className="small-text">{record.warehouse_code || ""}</div>
                      </td>
                      <td>
                        <div className="small-text role-text">
                          {record.role_title || <span className="muted">—</span>}
                        </div>
                      </td>
                      <td>
                        <span className="type-badge">
                          {USER_TYPE_LABEL[record.user_type] || record.user_type || "-"}
                        </span>
                      </td>
                      <td>
                        <div className="small-text">{formatDate(record.created_at)}</div>
                      </td>
                      <td>
                        <span className={`status-badge ${record.status}`}>
                          {record.status || "active"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button type="button" className="edit-btn" onClick={() => handleEdit(record)} title="Edit">
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${record.status}`}
                            onClick={() => handleToggleStatus(record)}
                            title={record.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {record.status === "active"
                              ? <ToggleRight size={18} />
                              : <ToggleLeft size={18} />}
                          </button>
                          <button type="button" className="delete-btn" onClick={() => handleDelete(record)} title="Remove">
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
  .ws-page { color: #151515; }

  .ws-hero {
    background:
      radial-gradient(circle at top right, rgba(245,158,11,0.2), transparent 34%),
      linear-gradient(135deg, #080808, #171717 55%, #050505);
    border: 1px solid rgba(245,158,11,0.18);
    border-radius: 30px; padding: 32px; margin-bottom: 22px;
    display: flex; justify-content: space-between; gap: 22px; align-items: flex-start;
    box-shadow: 0 24px 70px rgba(0,0,0,0.22); color: #fff;
    position: relative; overflow: hidden;
  }
  .ws-hero::after {
    content: ""; position: absolute; width: 220px; height: 220px; border-radius: 50%;
    border: 42px solid rgba(245,158,11,0.08); right: -70px; top: -90px;
  }
  .hero-left { display: flex; gap: 18px; align-items: flex-start; position: relative; z-index: 1; }
  .hero-icon {
    width: 58px; height: 58px; border-radius: 16px;
    background: rgba(245,158,11,0.18); border: 1px solid rgba(245,158,11,0.28);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 5px; }
  .ws-hero h1 { font-size: 26px; font-weight: 700; margin: 0 0 5px; }
  .ws-hero p { font-size: 13.5px; color: rgba(255,255,255,0.6); margin: 0; max-width: 520px; }
  .hero-actions { display: flex; gap: 10px; flex-shrink: 0; position: relative; z-index: 1; }

  .primary-btn {
    display: flex; align-items: center; gap: 7px; background: #f59e0b; color: #fff;
    border: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .primary-btn:hover { background: #d97706; }
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
  .stat-mark { width: 8px; height: 40px; background: #f59e0b; border-radius: 4px; opacity: 0.65; }

  .form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 26px; margin-bottom: 20px; }
  .form-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
  .form-header h2 { font-size: 17px; font-weight: 700; margin: 0 0 4px; color: #111; }
  .form-header p { font-size: 13px; color: #6b7280; margin: 0; }
  .close-btn { background: #f3f4f6; border: none; border-radius: 8px; padding: 7px; cursor: pointer; color: #374151; display: flex; align-items: center; }

  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 18px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label { font-size: 13px; font-weight: 600; color: #374151; }
  .form-group input, .form-group select {
    border: 1px solid #d1d5db; border-radius: 8px; padding: 9px 12px;
    font-size: 14px; color: #111; outline: none; background: #fff;
  }
  .form-group input:focus, .form-group select:focus {
    border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
  }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .cancel-btn { padding: 10px 18px; border: 1px solid #d1d5db; border-radius: 9px; background: #fff; font-size: 14px; font-weight: 500; cursor: pointer; color: #374151; }
  .save-btn { display: flex; align-items: center; gap: 7px; padding: 10px 22px; background: #f59e0b; color: #fff; border: none; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; }
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

  .staff-name { font-weight: 600; color: #111; font-size: 14px; }
  .small-text { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .role-text { color: #374151; font-size: 13px; }
  .muted { color: #d1d5db; }
  .info-line { display: flex; align-items: center; gap: 5px; font-size: 13.5px; color: #374151; }

  .type-badge {
    display: inline-block; padding: 3px 9px; border-radius: 20px;
    font-size: 11.5px; font-weight: 600;
    background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;
  }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .status-badge.active { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .status-badge.inactive { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

  .action-buttons { display: flex; gap: 6px; justify-content: flex-end; }
  .edit-btn, .delete-btn, .toggle-btn { border: none; border-radius: 7px; padding: 6px 8px; cursor: pointer; display: flex; align-items: center; }
  .edit-btn { background: #f3f4f6; color: #374151; }
  .edit-btn:hover { background: #e5e7eb; }
  .toggle-btn.active { background: #f0fdf4; color: #16a34a; }
  .toggle-btn.inactive { background: #fef2f2; color: #dc2626; }
  .toggle-btn:hover { opacity: 0.8; }
  .delete-btn { background: #fef2f2; color: #dc2626; }
  .delete-btn:hover { background: #fee2e2; }

  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
