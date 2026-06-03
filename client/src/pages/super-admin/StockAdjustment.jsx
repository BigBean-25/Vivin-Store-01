import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
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
  Warehouse,
  X,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const emptyItem = {
  product_id: "",
  batch_id: "",
  system_qty: "",
  physical_qty: "",
};

const initialForm = {
  adjustment_number: "",
  warehouse_id: "",
  adjustment_date: today,
  reason: "",
  status: "draft",
  items: [{ ...emptyItem }],
};

const formatQty = (value) => Number(value || 0).toFixed(3);

export default function StockAdjustment() {
  const [stockAdjustments, setStockAdjustments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [viewData, setViewData] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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

  const fetchStockAdjustments = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (statusFilter) params.append("status", statusFilter);
      if (warehouseFilter) params.append("warehouse_id", warehouseFilter);

      const res = await API.get(`/api/stock-adjustment?${params.toString()}`);

      if (res.data.success) {
        setStockAdjustments(res.data.stock_adjustments || res.data.data || []);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch stock adjustments"
      );
    } finally {
      setLoading(false);
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

  const fetchInventory = async (warehouseId = "") => {
    try {
      const params = new URLSearchParams();

      if (warehouseId) {
        params.append("warehouse_id", warehouseId);
      }

      const res = await API.get(`/api/inventory/outlet-stock?${params.toString()}`);

      if (res.data.success) {
        setInventory(res.data.inventory || res.data.data || []);
      }
    } catch {
      setInventory([]);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchStockAdjustments(),
      fetchWarehouses(),
      fetchInventory(formData.warehouse_id),
    ]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStockAdjustments();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, statusFilter, warehouseFilter]);

  useEffect(() => {
    if (formData.warehouse_id) {
      fetchInventory(formData.warehouse_id);
    }
  }, [formData.warehouse_id]);

  const stats = useMemo(() => {
    return {
      total: stockAdjustments.length,
      draft: stockAdjustments.filter((item) => item.status === "draft").length,
      approved: stockAdjustments.filter((item) => item.status === "approved")
        .length,
      posted: stockAdjustments.filter((item) => item.status === "posted")
        .length,
    };
  }, [stockAdjustments]);

  const getInventoryItem = (productId) => {
    return inventory.find(
      (item) => String(item.product_id) === String(productId)
    );
  };

  const calculateDifference = (item) => {
    return Number(item.physical_qty || 0) - Number(item.system_qty || 0);
  };

  const handleMainChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "warehouse_id") {
        updated.items = [{ ...emptyItem }];
      }

      return updated;
    });
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      const nextItem = {
        ...nextItems[index],
        [field]: value,
      };

      if (field === "product_id") {
        const stockItem = getInventoryItem(value);
        nextItem.system_qty = stockItem?.available_qty || 0;
        nextItem.physical_qty = stockItem?.available_qty || 0;
        nextItem.batch_id = "";
      }

      nextItems[index] = nextItem;

      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const removeItemRow = (index) => {
    setFormData((prev) => {
      if (prev.items.length === 1) return prev;

      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const openCreateForm = () => {
    setEditingId(null);
    setViewData(null);
    setFormData(initialForm);
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(false);
    setError("");
  };

  const validateForm = () => {
    if (!formData.warehouse_id) {
      setError("Warehouse is required");
      return false;
    }

    if (!formData.reason.trim()) {
      setError("Adjustment reason is required");
      return false;
    }

    if (!formData.items.length) {
      setError("At least one item is required");
      return false;
    }

    for (const item of formData.items) {
      if (!item.product_id) {
        setError("Product is required for all item rows");
        return false;
      }

      if (item.physical_qty === "" || item.physical_qty === null) {
        setError("Physical quantity is required for all item rows");
        return false;
      }

      if (Number(item.physical_qty) < 0) {
        setError("Physical quantity cannot be negative");
        return false;
      }
    }

    return true;
  };

  const handleEdit = async (item) => {
    try {
      setError("");
      setViewData(null);

      const res = await API.get(`/api/stock-adjustment/${item.id}`);

      if (res.data.success) {
        const adjustment = res.data.stock_adjustment;
        const items = res.data.items || [];

        setEditingId(adjustment.id);

        setFormData({
          adjustment_number: adjustment.adjustment_number || "",
          warehouse_id: adjustment.warehouse_id || "",
          adjustment_date: adjustment.adjustment_date?.slice(0, 10) || today,
          reason: adjustment.reason || "",
          status: "draft",
          items: items.length
            ? items.map((row) => ({
                product_id: row.product_id || "",
                batch_id: row.batch_id || "",
                system_qty: row.system_qty || 0,
                physical_qty: row.physical_qty || 0,
              }))
            : [{ ...emptyItem }],
        });

        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load stock adjustment"
      );
    }
  };

  const handleView = async (item) => {
    try {
      setError("");
      setShowForm(false);

      const res = await API.get(`/api/stock-adjustment/${item.id}`);

      if (res.data.success) {
        setViewData({
          adjustment: res.data.stock_adjustment,
          items: res.data.items || [],
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to view stock adjustment"
      );
    }
  };

  const handleSubmit = async (e, submitStatus = formData.status) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {
      ...formData,
      status: submitStatus,
      items: formData.items.map((item) => ({
        product_id: item.product_id,
        batch_id: item.batch_id || null,
        system_qty: Number(item.system_qty || 0),
        physical_qty: Number(item.physical_qty || 0),
      })),
    };

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await API.put(`/api/stock-adjustment/${editingId}`, payload);
        showSuccess("Stock adjustment draft updated successfully");
      } else {
        await API.post("/api/stock-adjustment", payload);
        showSuccess(
          submitStatus === "posted"
            ? "Stock adjustment created and posted successfully"
            : "Stock adjustment draft saved successfully"
        );
      }

      closeForm();
      refreshAll();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save stock adjustment"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (item) => {
    const confirmApprove = window.confirm(
      `Approve ${item.adjustment_number}?`
    );

    if (!confirmApprove) return;

    try {
      setError("");
      await API.post(`/api/stock-adjustment/${item.id}/approve`);
      showSuccess("Stock adjustment approved successfully");
      refreshAll();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to approve stock adjustment"
      );
    }
  };

  const handlePost = async (item) => {
    const confirmPost = window.confirm(
      `Post ${item.adjustment_number}? Inventory stock will be adjusted.`
    );

    if (!confirmPost) return;

    try {
      setError("");
      await API.post(`/api/stock-adjustment/${item.id}/post`);
      showSuccess("Stock adjustment posted successfully");
      refreshAll();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to post stock adjustment"
      );
    }
  };

  const handleCancel = async (item) => {
    const confirmCancel = window.confirm(`Cancel ${item.adjustment_number}?`);

    if (!confirmCancel) return;

    try {
      setError("");
      await API.patch(`/api/stock-adjustment/${item.id}/cancel`);
      showSuccess("Stock adjustment cancelled successfully");
      refreshAll();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to cancel stock adjustment"
      );
    }
  };

  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(`Delete ${item.adjustment_number}?`);

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/stock-adjustment/${item.id}`);
      showSuccess("Stock adjustment deleted successfully");
      refreshAll();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to delete stock adjustment"
      );
    }
  };

  return (
    <AdminLayout>
      <div className="stock-page">
        <style>{css}</style>

        <div className="stock-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <ClipboardCheck size={30} />
            </div>

            <div>
              <div className="eyebrow">Warehouse Stock Correction</div>
              <h1>Stock Adjustment</h1>
              <p>
                Compare system stock and physical stock, then adjust inventory
                quantity with approval and posting workflow.
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
              New Adjustment
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
          <StatCard title="Total Adjustments" value={stats.total} />
          <StatCard title="Draft" value={stats.draft} />
          <StatCard title="Approved" value={stats.approved} />
          <StatCard title="Posted" value={stats.posted} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>
                  {editingId ? "Edit Draft Adjustment" : "Create Stock Adjustment"}
                </h2>
                <p>
                  Enter physical stock count. Difference will be calculated
                  automatically from system stock.
                </p>
              </div>

              <button type="button" className="close-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, formData.status)}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Adjustment Number</label>
                  <input
                    name="adjustment_number"
                    value={formData.adjustment_number}
                    onChange={handleMainChange}
                    placeholder="Auto generate if empty"
                  />
                </div>

                <div className="form-group">
                  <label>Warehouse *</label>
                  <select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={handleMainChange}
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
                  <label>Adjustment Date</label>
                  <input
                    type="date"
                    name="adjustment_date"
                    value={formData.adjustment_date}
                    onChange={handleMainChange}
                  />
                </div>

                <div className="form-group full">
                  <label>Reason *</label>
                  <input
                    name="reason"
                    value={formData.reason}
                    onChange={handleMainChange}
                    placeholder="Example: Physical stock count correction"
                    required
                  />
                </div>

                {!editingId && (
                  <div className="form-group">
                    <label>Save Mode</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleMainChange}
                    >
                      <option value="draft">Save as Draft</option>
                      <option value="posted">Post Immediately</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="items-card">
                <div className="items-head">
                  <div>
                    <h3>Adjustment Items</h3>
                    <p>System qty, physical qty and difference qty</p>
                  </div>

                  <button type="button" className="mini-btn" onClick={addItemRow}>
                    <Plus size={15} />
                    Add Item
                  </button>
                </div>

                {!formData.warehouse_id && (
                  <div className="info-box">
                    Select warehouse first to load available stock items.
                  </div>
                )}

                <div className="items-table-wrap">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>System Qty</th>
                        <th>Physical Qty</th>
                        <th>Difference</th>
                        <th>Type</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {formData.items.map((item, index) => {
                        const difference = calculateDifference(item);

                        return (
                          <tr key={index}>
                            <td>
                              <select
                                value={item.product_id}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "product_id",
                                    e.target.value
                                  )
                                }
                                required
                                disabled={!formData.warehouse_id}
                              >
                                <option value="">Select Product</option>
                                {inventory.map((stock) => (
                                  <option key={stock.id} value={stock.product_id}>
                                    {stock.product_name || stock.name}{" "}
                                    {stock.sku ? `(${stock.sku})` : ""} · Sys:{" "}
                                    {formatQty(stock.available_qty)}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td>
                              <input
                                type="number"
                                step="0.001"
                                value={item.system_qty}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "system_qty",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                step="0.001"
                                value={item.physical_qty}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "physical_qty",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                required
                              />
                            </td>

                            <td>
                              <span
                                className={`difference-pill ${
                                  difference > 0
                                    ? "plus"
                                    : difference < 0
                                    ? "minus"
                                    : "same"
                                }`}
                              >
                                {difference > 0 ? "+" : ""}
                                {formatQty(difference)}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`adjustment-type ${
                                  difference > 0
                                    ? "increase"
                                    : difference < 0
                                    ? "decrease"
                                    : "nochange"
                                }`}
                              >
                                {difference > 0
                                  ? "Increase"
                                  : difference < 0
                                  ? "Decrease"
                                  : "No Change"}
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="row-delete-btn"
                                onClick={() => removeItemRow(index)}
                                disabled={formData.items.length === 1}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Draft"
                    : formData.status === "posted"
                    ? "Create & Post"
                    : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        )}

        {viewData && (
          <div className="view-card">
            <div className="view-head">
              <div>
                <h2>{viewData.adjustment.adjustment_number}</h2>
                <p>
                  {viewData.adjustment.warehouse_name} ·{" "}
                  {viewData.adjustment.adjustment_date?.slice(0, 10)}
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

            <div className="view-items">
              {viewData.items.map((item) => (
                <div className="view-row" key={item.id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>
                      System: {formatQty(item.system_qty)} · Physical:{" "}
                      {formatQty(item.physical_qty)}
                    </span>
                  </div>

                  <div>
                    <strong>
                      Difference:{" "}
                      {Number(item.difference_qty || 0) > 0 ? "+" : ""}
                      {formatQty(item.difference_qty)}
                    </strong>
                    <span>{item.unit_name || ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search adjustment number, warehouse, reason..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{stockAdjustments.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Stock Adjustment List</h2>
            <p>Draft, approved, posted and cancelled stock corrections</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading stock adjustments...</h3>
              <p>Please wait while adjustment records are loading.</p>
            </div>
          ) : stockAdjustments.length === 0 ? (
            <div className="empty-box">
              <Package size={34} />
              <h3>No stock adjustment found</h3>
              <p>Click New Adjustment to create your first stock correction.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Adjustment</th>
                    <th>Warehouse</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>System Qty</th>
                    <th>Physical Qty</th>
                    <th>Difference</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {stockAdjustments.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="main-name">{item.adjustment_number}</div>
                        <div className="small-text">
                          {item.reason || "No reason"}
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

                      <td>{item.adjustment_date?.slice(0, 10) || "-"}</td>
                      <td>{item.item_count || 0}</td>
                      <td>{formatQty(item.total_system_qty)}</td>
                      <td>{formatQty(item.total_physical_qty)}</td>
                      <td>{formatQty(item.total_difference_qty)}</td>

                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="view-btn"
                            onClick={() => handleView(item)}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          {item.status === "draft" && (
                            <>
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() => handleEdit(item)}
                                title="Edit"
                              >
                                <Edit3 size={16} />
                              </button>

                              <button
                                type="button"
                                className="approve-btn"
                                onClick={() => handleApprove(item)}
                                title="Approve"
                              >
                                <CheckCheck size={16} />
                              </button>
                            </>
                          )}

                          {(item.status === "draft" ||
                            item.status === "approved") && (
                            <button
                              type="button"
                              className="post-btn"
                              onClick={() => handlePost(item)}
                              title="Post"
                            >
                              <Send size={16} />
                            </button>
                          )}

                          {item.status !== "posted" &&
                            item.status !== "cancelled" && (
                              <button
                                type="button"
                                className="cancel-status-btn"
                                onClick={() => handleCancel(item)}
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            )}

                          {item.status !== "posted" && (
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(item)}
                              title="Delete"
                            >
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
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="stat-mark" />
    </div>
  );
}

const css = `
  .stock-page { color: #151515; }

  .stock-hero {
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

  .stock-hero::after {
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

  .stock-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .stock-hero p {
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
  .cancel-btn,
  .mini-btn {
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
  .save-btn,
  .mini-btn {
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
  .error-box,
  .info-box {
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

  .info-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
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
  .view-head,
  .items-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

  .form-header h2,
  .view-head h2,
  .table-header h2,
  .items-head h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .form-header p,
  .view-head p,
  .table-header p,
  .items-head p {
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
    margin-bottom: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group.full {
    grid-column: span 2;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 950;
    color: #333;
  }

  .form-group input,
  .form-group select,
  .items-table input,
  .items-table select {
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
  .form-group select:focus,
  .items-table input:focus,
  .items-table select:focus {
    border-color: #facc15;
    background: #fff;
  }

  .items-card {
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 18px;
    background: #fafafa;
  }

  .mini-btn {
    height: 40px;
    padding: 0 14px;
    border-radius: 13px;
  }

  .items-table-wrap {
    overflow-x: auto;
  }

  .items-table {
    width: 100%;
    min-width: 950px;
    border-collapse: separate;
    border-spacing: 0 10px;
  }

  .items-table th {
    background: transparent;
    color: #777;
    font-size: 11px;
    text-transform: uppercase;
    padding: 0 8px;
    border: none;
  }

  .items-table td {
    background: #fff;
    border-top: 1px solid #ececec;
    border-bottom: 1px solid #ececec;
    padding: 10px 8px;
  }

  .items-table td:first-child {
    border-left: 1px solid #ececec;
    border-top-left-radius: 16px;
    border-bottom-left-radius: 16px;
  }

  .items-table td:last-child {
    border-right: 1px solid #ececec;
    border-top-right-radius: 16px;
    border-bottom-right-radius: 16px;
  }

  .difference-pill,
  .adjustment-type {
    display: inline-flex;
    justify-content: center;
    border-radius: 999px;
    padding: 9px 12px;
    font-size: 12px;
    font-weight: 950;
    min-width: 98px;
  }

  .difference-pill.plus,
  .adjustment-type.increase {
    background: #ecfdf5;
    color: #047857;
  }

  .difference-pill.minus,
  .adjustment-type.decrease {
    background: #fff1f2;
    color: #be123c;
  }

  .difference-pill.same,
  .adjustment-type.nochange {
    background: #f4f4f5;
    color: #52525b;
  }

  .row-delete-btn {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    border: none;
    background: #fff1f2;
    color: #e11d48;
    cursor: pointer;
  }

  .row-delete-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
  }

  .view-items {
    display: grid;
    gap: 12px;
  }

  .view-row {
    border: 1px solid #ececec;
    background: #fafafa;
    border-radius: 18px;
    padding: 14px;
    display: flex;
    justify-content: space-between;
    gap: 18px;
  }

  .view-row strong {
    display: block;
    color: #111;
    font-weight: 950;
  }

  .view-row span {
    display: block;
    margin-top: 5px;
    color: #777;
    font-size: 12px;
    font-weight: 800;
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
    max-width: 420px;
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

  .status-badge.draft {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.approved {
    background: #eff6ff;
    color: #2563eb;
  }

  .status-badge.posted {
    background: #dcfce7;
    color: #15803d;
  }

  .status-badge.cancelled {
    background: #f4f4f5;
    color: #52525b;
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .view-btn,
  .edit-btn,
  .approve-btn,
  .post-btn,
  .delete-btn,
  .cancel-status-btn {
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

  .approve-btn {
    background: #fff7ed;
    color: #ea580c;
  }

  .post-btn {
    background: #ecfdf5;
    color: #047857;
  }

  .delete-btn,
  .cancel-status-btn {
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

    .form-group.full {
      grid-column: span 2;
    }
  }

  @media (max-width: 900px) {
    .stats-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full {
      grid-column: span 1;
    }

    .stock-hero,
    .toolbar,
    .view-row {
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