import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  CheckCircle2,
  Edit3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";

const initialForm = {
  warehouse_code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  status: "active",
};

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2500);
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/warehouses");

      if (res.data.success) {
        const list = res.data.data || res.data.warehouses || [];
        setWarehouses(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((warehouse) => {
      const text = `
        ${warehouse.warehouse_code || ""}
        ${warehouse.name || ""}
        ${warehouse.phone || ""}
        ${warehouse.email || ""}
        ${warehouse.address || ""}
        ${warehouse.city || ""}
        ${warehouse.state || ""}
        ${warehouse.pincode || ""}
        ${warehouse.status || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || warehouse.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [warehouses, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: warehouses.length,
      active: warehouses.filter((w) => w.status === "active").length,
      inactive: warehouses.filter((w) => w.status === "inactive").length,
      cities: new Set(warehouses.map((w) => w.city).filter(Boolean)).size,
    };
  }, [warehouses]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingWarehouseId(null);
    setFormData(initialForm);
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouseId(warehouse.id);

    setFormData({
      warehouse_code: warehouse.warehouse_code || "",
      name: warehouse.name || "",
      phone: warehouse.phone || "",
      email: warehouse.email || "",
      address: warehouse.address || "",
      city: warehouse.city || "",
      state: warehouse.state || "",
      pincode: warehouse.pincode || "",
      status: warehouse.status || "active",
    });

    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingWarehouseId(null);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Warehouse name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      let res;

      if (editingWarehouseId) {
        res = await API.put(`/api/warehouses/${editingWarehouseId}`, formData);
      } else {
        res = await API.post("/api/warehouses", formData);
      }

      if (res.data.success) {
        setFormData(initialForm);
        setEditingWarehouseId(null);
        setShowForm(false);

        showSuccess(
          editingWarehouseId
            ? "Warehouse updated successfully"
            : "Warehouse created successfully"
        );

        fetchWarehouses();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingWarehouseId
            ? "Failed to update warehouse"
            : "Failed to create warehouse")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warehouse) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${warehouse.name}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/warehouses/${warehouse.id}`);

      showSuccess("Warehouse deleted successfully");
      fetchWarehouses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete warehouse");
    }
  };

  return (
    <AdminLayout>
      <div className="warehouse-page">
        <style>{css}</style>

        <div className="warehouse-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <WarehouseIcon size={30} />
            </div>

            <div>
              <div className="eyebrow">Warehouse Control Center</div>
              <h1>Warehouses</h1>
              <p>
                Manage central warehouses and storage locations. These
                warehouses will be used in inventory, purchase, dispatch and
                stock movement operations.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchWarehouses}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              Add Warehouse
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
          <StatCard title="Total Warehouses" value={stats.total} />
          <StatCard title="Active Warehouses" value={stats.active} />
          <StatCard title="Inactive Warehouses" value={stats.inactive} />
          <StatCard title="Covered Cities" value={stats.cities} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>
                  {editingWarehouseId ? "Edit Warehouse" : "Add New Warehouse"}
                </h2>
                <p>
                  Fill warehouse master details properly for stock and inventory
                  operations.
                </p>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={handleCancelForm}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Warehouse Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Bangalore Central Warehouse"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Warehouse Code</label>
                  <input
                    name="warehouse_code"
                    value={formData.warehouse_code}
                    onChange={handleChange}
                    placeholder="Auto generate if empty"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="warehouse@vivinstore.com"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Bangalore"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Karnataka"
                  />
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="560001"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Full warehouse address"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving && <Loader2 size={17} className="spin" />}
                  {saving
                    ? "Saving..."
                    : editingWarehouseId
                    ? "Update Warehouse"
                    : "Save Warehouse"}
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
              placeholder="Search warehouse, code, city, phone..."
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Warehouses</option>
            <option value="active">Active Warehouses</option>
            <option value="inactive">Inactive Warehouses</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{filteredWarehouses.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Warehouse List</h2>
            <p>Warehouse master records from MySQL database</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading warehouses...</h3>
              <p>Please wait while warehouse records are loading.</p>
            </div>
          ) : filteredWarehouses.length === 0 ? (
            <div className="empty-box">
              <WarehouseIcon size={34} />
              <h3>No warehouses found</h3>
              <p>Click Add Warehouse to create your first warehouse.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWarehouses.map((warehouse) => (
                    <tr key={warehouse.id}>
                      <td>
                        <div className="warehouse-name">{warehouse.name}</div>
                        <div className="small-text">
                          Code: {warehouse.warehouse_code || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="info-line">
                          <Phone size={13} />
                          {warehouse.phone || "-"}
                        </div>

                        <div className="info-line">
                          <Mail size={13} />
                          {warehouse.email || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="info-line">
                          <MapPin size={13} />
                          {warehouse.city || "-"}, {warehouse.state || "-"}
                        </div>

                        <div className="small-text">
                          Pincode: {warehouse.pincode || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="address-text">
                          {warehouse.address || "-"}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge ${warehouse.status}`}>
                          {warehouse.status || "active"}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(warehouse)}
                            title="Edit Warehouse"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(warehouse)}
                            title="Delete Warehouse"
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
  .warehouse-page {
    color: #151515;
  }

  .warehouse-hero {
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

  .warehouse-hero::after {
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

  .warehouse-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .warehouse-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 760px;
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
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
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

  .cancel-btn {
    background: #f4f4f5;
    color: #111;
  }

  .primary-btn:hover,
  .secondary-btn:hover,
  .save-btn:hover,
  .cancel-btn:hover {
    transform: translateY(-1px);
  }

  .primary-btn:disabled,
  .secondary-btn:disabled,
  .save-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
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
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 22px;
  }

  .stat-card {
    background: rgba(255,255,255,0.94);
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 21px;
    box-shadow: 0 12px 34px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
  }

  .stat-card h3 {
    margin: 0;
    font-size: 30px;
    font-weight: 950;
    color: #111;
    letter-spacing: -0.7px;
  }

  .stat-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 12px;
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

  .form-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    padding: 24px;
    margin-bottom: 22px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.07);
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

  .form-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .form-header p {
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group.full {
    grid-column: 1 / -1;
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
    transition: border-color 0.18s ease, background 0.18s ease;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    border-color: #facc15;
    background: #fff;
  }

  .form-group textarea {
    min-height: 92px;
    resize: vertical;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
  }

  .toolbar {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }

  .search-wrap {
    max-width: 440px;
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
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    padding: 22px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
    overflow: hidden;
  }

  .table-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .table-header p {
    margin: 5px 0 18px;
    color: #777;
    font-size: 13px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1050px;
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

  th:first-child {
    border-top-left-radius: 14px;
  }

  th:last-child {
    border-top-right-radius: 14px;
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

  .warehouse-name {
    font-weight: 950;
    color: #111;
    font-size: 14px;
  }

  .small-text {
    color: #777;
    font-size: 12.5px;
    margin-top: 5px;
  }

  .address-text {
    max-width: 260px;
    color: #555;
    line-height: 1.5;
  }

  .info-line {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 6px;
    color: #555;
  }

  .status-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #15803d;
  }

  .status-badge.inactive {
    background: #f4f4f5;
    color: #52525b;
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .edit-btn,
  .delete-btn {
    width: 37px;
    height: 37px;
    border-radius: 13px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease;
  }

  .edit-btn {
    background: #eff6ff;
    color: #2563eb;
  }

  .delete-btn {
    background: #fff1f2;
    color: #e11d48;
  }

  .edit-btn:hover,
  .delete-btn:hover {
    transform: translateY(-1px);
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

  @media (max-width: 1100px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .form-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .stats-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .warehouse-hero,
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