import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Edit3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

const initialForm = {
  warehouse_id: "",
  product_id: "",
  available_qty: "",
  reserved_qty: 0,
  damaged_qty: 0,
  average_cost: "",
};

const formatMoney = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);

  const [formData, setFormData] = useState(initialForm);
  const [editingInventoryId, setEditingInventoryId] = useState(null);

  const [search, setSearch] = useState("");
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

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (warehouseFilter) params.append("warehouse_id", warehouseFilter);

      const res = await API.get(`/api/inventory?${params.toString()}`);

      if (res.data.success) {
        setInventory(res.data.inventory || res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/api/inventory/summary");
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch {
      setSummary(null);
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

  const refreshAll = async () => {
    await Promise.all([
      fetchInventory(),
      fetchSummary(),
      fetchWarehouses(),
      fetchProducts(),
    ]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, warehouseFilter]);

  const stats = useMemo(() => {
    return {
      totalStockItems: summary?.total_stock_items || inventory.length,
      totalQty:
        summary?.total_available_qty ||
        inventory.reduce((sum, item) => sum + Number(item.available_qty || 0), 0),
      lowStock:
        summary?.low_stock_count ||
        inventory.filter((item) => item.stock_status === "low_stock").length,
      stockValue:
        summary?.total_stock_value ||
        inventory.reduce((sum, item) => sum + Number(item.stock_value || 0), 0),
    };
  }, [summary, inventory]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingInventoryId(null);
    setFormData(initialForm);
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (item) => {
    setEditingInventoryId(item.id);

    setFormData({
      warehouse_id: item.warehouse_id || "",
      product_id: item.product_id || "",
      available_qty: item.available_qty ?? "",
      reserved_qty: item.reserved_qty ?? 0,
      damaged_qty: item.damaged_qty ?? 0,
      average_cost: item.average_cost ?? "",
    });

    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingInventoryId(null);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.warehouse_id) {
      setError("Warehouse is required");
      return;
    }

    if (!formData.product_id) {
      setError("Product is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingInventoryId) {
        await API.put(`/api/inventory/${editingInventoryId}`, formData);
      } else {
        await API.post("/api/inventory", formData);
      }

      showSuccess(
        editingInventoryId
          ? "Inventory stock updated successfully"
          : "Inventory stock created successfully"
      );

      handleCancelForm();
      refreshAll();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingInventoryId
            ? "Failed to update inventory stock"
            : "Failed to create inventory stock")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete stock for ${item.product_name}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/inventory/${item.id}`);

      showSuccess("Inventory stock deleted successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete inventory stock");
    }
  };

  return (
    <AdminLayout>
      <div className="inventory-page">
        <style>{css}</style>

        <div className="inventory-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <Boxes size={30} />
            </div>

            <div>
              <div className="eyebrow">Inventory Stock Center</div>
              <h1>Inventory Management</h1>
              <p>
                Manage warehouse-wise product stock, available quantity, reserved
                quantity, damaged stock, average cost and low-stock visibility.
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

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              Add Stock
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
          <StatCard title="Stock Items" value={stats.totalStockItems} />
          <StatCard title="Available Qty" value={Number(stats.totalQty).toFixed(2)} />
          <StatCard title="Low Stock" value={stats.lowStock} danger />
          <StatCard title="Stock Value" value={formatMoney(stats.stockValue)} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingInventoryId ? "Edit Stock" : "Add Inventory Stock"}</h2>
                <p>Select warehouse and product, then update stock quantities.</p>
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
                  <label>Warehouse *</label>
                  <select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
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
                    onChange={handleChange}
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
                  <label>Available Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    name="available_qty"
                    value={formData.available_qty}
                    onChange={handleChange}
                    placeholder="100"
                  />
                </div>

                <div className="form-group">
                  <label>Reserved Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    name="reserved_qty"
                    value={formData.reserved_qty}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Damaged Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    name="damaged_qty"
                    value={formData.damaged_qty}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Average Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    name="average_cost"
                    value={formData.average_cost}
                    onChange={handleChange}
                    placeholder="75"
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
                    : editingInventoryId
                    ? "Update Stock"
                    : "Save Stock"}
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
              placeholder="Search product, SKU, warehouse..."
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

          <div className="api-chip">
            API Connected · <strong>{inventory.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Inventory Stock List</h2>
            <p>Warehouse-wise product stock records from MySQL database</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading inventory...</h3>
              <p>Please wait while stock records are loading.</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="empty-box">
              <Package size={34} />
              <h3>No inventory stock found</h3>
              <p>Click Add Stock to create your first inventory record.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Available</th>
                    <th>Reserved</th>
                    <th>Damaged</th>
                    <th>Average Cost</th>
                    <th>Stock Value</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="main-name">{item.product_name || "-"}</div>
                        <div className="small-text">
                          SKU: {item.sku || "-"} · Code:{" "}
                          {item.product_code || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="info-line">
                          <Warehouse size={13} />
                          {item.warehouse_name || "-"}
                        </div>
                        <div className="small-text">
                          {item.warehouse_code || "-"}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {Number(item.available_qty || 0).toFixed(3)}
                        </strong>{" "}
                        <span className="small-text">{item.unit_name || ""}</span>
                      </td>

                      <td>{Number(item.reserved_qty || 0).toFixed(3)}</td>

                      <td>{Number(item.damaged_qty || 0).toFixed(3)}</td>

                      <td>{formatMoney(item.average_cost)}</td>

                      <td>{formatMoney(item.stock_value)}</td>

                      <td>
                        <span
                          className={`status-badge ${
                            item.stock_status === "low_stock"
                              ? "low"
                              : "normal"
                          }`}
                        >
                          {item.stock_status === "low_stock"
                            ? "Low Stock"
                            : "Normal"}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(item)}
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

function StatCard({ title, value, danger }) {
  return (
    <div className={`stat-card ${danger ? "danger" : ""}`}>
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="stat-mark" />
    </div>
  );
}

const css = `
  .inventory-page { color: #151515; }

  .inventory-hero {
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

  .inventory-hero::after {
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

  .inventory-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .inventory-hero p {
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
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 21px;
    box-shadow: 0 12px 34px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
  }

  .stat-card.danger .stat-mark {
    background: #ef4444;
  }

  .stat-card h3 {
    margin: 0;
    font-size: 26px;
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

  .form-card,
  .toolbar,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .form-card {
    padding: 24px;
    margin-bottom: 22px;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

  .form-header h2,
  .table-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .form-header p,
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 950;
    color: #333;
  }

  .form-group input,
  .form-group select {
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
  }

  .form-group input:focus,
  .form-group select:focus {
    border-color: #facc15;
    background: #fff;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
  }

  .toolbar {
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
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
    min-width: 1150px;
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
  }

  .small-text {
    color: #777;
    font-size: 12px;
    margin-top: 5px;
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

  .status-badge.normal {
    background: #dcfce7;
    color: #15803d;
  }

  .status-badge.low {
    background: #fff1f2;
    color: #e11d48;
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
  }

  .edit-btn {
    background: #eff6ff;
    color: #2563eb;
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

    .inventory-hero,
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