import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Ban,
  CheckCircle2,
  Edit3,
  Eye,
  Layers3,
  Loader2,
  PackageCheck,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

const formatMoney = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const formatQty = (value) => Number(value || 0).toFixed(3);

const formatDate = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};

const getExpiryLabel = (days) => {
  if (days === null || days === undefined || Number.isNaN(Number(days))) {
    return "No Expiry";
  }

  const value = Number(days);

  if (value < 0) return `Expired ${Math.abs(value)} days ago`;
  if (value === 0) return "Expires today";

  return `${value} days left`;
};

export default function InventoryBatches() {
  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState({});
  const [warehouses, setWarehouses] = useState([]);

  const [mode, setMode] = useState("all");
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("");
  const [expiryStatusFilter, setExpiryStatusFilter] = useState("");
  const [nearDays, setNearDays] = useState("30");

  const [viewData, setViewData] = useState(null);
  const [editData, setEditData] = useState(null);

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
      const res = await API.get("/api/inventory-batches/summary");

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

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (warehouseFilter) {
        params.append("warehouse_id", warehouseFilter);
      }

      let url = "/api/inventory-batches";

      if (mode === "near") {
        url = "/api/inventory-batches/near-expiry";
        params.append("days", nearDays || "30");
      } else if (mode === "expired") {
        url = "/api/inventory-batches/expired";
      } else {
        if (search.trim()) params.append("search", search.trim());
        if (batchStatusFilter) params.append("status", batchStatusFilter);
        if (expiryStatusFilter) {
          params.append("expiry_status", expiryStatusFilter);
        }
      }

      const res = await API.get(`${url}?${params.toString()}`);

      if (res.data.success) {
        setBatches(res.data.batches || res.data.data || []);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch inventory batches"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchSummary(), fetchWarehouses(), fetchBatches()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBatches();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    mode,
    search,
    warehouseFilter,
    batchStatusFilter,
    expiryStatusFilter,
    nearDays,
  ]);

  const visibleStats = useMemo(() => {
    return {
      total: summary.total_batches || 0,
      active: summary.active_batches || 0,
      nearExpiry: summary.near_expiry_count || 0,
      expired: summary.expired_count || 0,
      value: summary.total_value || 0,
    };
  }, [summary]);

  const handleView = async (batch) => {
    try {
      setError("");
      setEditData(null);

      const res = await API.get(`/api/inventory-batches/${batch.id}`);

      if (res.data.success) {
        setViewData({
          batch: res.data.batch,
          movements: res.data.movements || [],
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to view batch");
    }
  };

  const openEdit = (batch) => {
    setViewData(null);

    setEditData({
      id: batch.id,
      batch_no: batch.batch_no || "",
      manufacture_date:
        formatDate(batch.manufacture_date) === "-"
          ? ""
          : formatDate(batch.manufacture_date),
      expiry_date:
        formatDate(batch.expiry_date) === "-"
          ? ""
          : formatDate(batch.expiry_date),
      cost_price: batch.cost_price || "",
      status: batch.batch_status || batch.status || "active",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeEdit = () => {
    setEditData(null);
    setError("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await API.put(`/api/inventory-batches/${editData.id}`, {
        batch_no: editData.batch_no,
        manufacture_date: editData.manufacture_date || null,
        expiry_date: editData.expiry_date || null,
        cost_price: editData.cost_price || 0,
        status: editData.status,
      });

      showSuccess("Inventory batch updated successfully");
      closeEdit();
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update batch");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (batch, status) => {
    const confirmChange = window.confirm(
      `Change batch ${batch.batch_no || "-"} status to ${status}?`
    );

    if (!confirmChange) return;

    try {
      setError("");

      await API.patch(`/api/inventory-batches/${batch.id}/status`, {
        status,
      });

      showSuccess("Batch status updated successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update batch status");
    }
  };

  const handleDispose = async (batch) => {
    const confirmDispose = window.confirm(
      `Dispose batch ${
        batch.batch_no || "-"
      }? This will reduce stock and mark expiry as disposed.`
    );

    if (!confirmDispose) return;

    try {
      setError("");

      await API.post(`/api/inventory-batches/${batch.id}/dispose`);

      showSuccess("Expired batch disposed successfully");
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to dispose batch");
    }
  };

  return (
    <AdminLayout>
      <div className="batch-page">
        <style>{css}</style>

        <div className="batch-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <Layers3 size={30} />
            </div>

            <div>
              <div className="eyebrow">Batch Wise Inventory</div>
              <h1>Inventory Batches & Expiry</h1>
              <p>
                Track batch number, expiry date, near-expiry stock, expired
                stock, stock value and batch-wise movement history.
              </p>
            </div>
          </div>

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
        </div>

        {success && (
          <div className="success-box">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        <div className="stats-grid">
          <StatCard title="Total Batches" value={visibleStats.total} />
          <StatCard title="Active Batches" value={visibleStats.active} />
          <StatCard title="Near Expiry" value={visibleStats.nearExpiry} />
          <StatCard title="Expired" value={visibleStats.expired} />
          <StatCard
            title="Batch Stock Value"
            value={formatMoney(visibleStats.value)}
          />
        </div>

        {editData && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>Edit Inventory Batch</h2>
                <p>Update batch number, expiry date, cost price and status.</p>
              </div>

              <button type="button" className="close-btn" onClick={closeEdit}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Batch Number *</label>
                  <input
                    name="batch_no"
                    value={editData.batch_no}
                    onChange={handleEditChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Manufacture Date</label>
                  <input
                    type="date"
                    name="manufacture_date"
                    value={editData.manufacture_date}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={editData.expiry_date}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group">
                  <label>Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cost_price"
                    value={editData.cost_price}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={editData.status}
                    onChange={handleEditChange}
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="blocked">Blocked</option>
                    <option value="consumed">Consumed</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeEdit}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? (
                    <Loader2 size={17} className="spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {saving ? "Saving..." : "Update Batch"}
                </button>
              </div>
            </form>
          </div>
        )}

        {viewData && (
          <div className="view-card">
            <div className="view-head">
              <div>
                <h2>{viewData.batch.batch_no}</h2>
                <p>
                  {viewData.batch.product_name} ·{" "}
                  {viewData.batch.warehouse_name}
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

            <div className="batch-detail-grid">
              <Detail title="Product" value={viewData.batch.product_name} />
              <Detail title="Warehouse" value={viewData.batch.warehouse_name} />
              <Detail
                title="Quantity"
                value={`${formatQty(viewData.batch.quantity)} ${
                  viewData.batch.unit_name || ""
                }`}
              />
              <Detail
                title="Cost Price"
                value={formatMoney(viewData.batch.cost_price)}
              />
              <Detail
                title="Stock Value"
                value={formatMoney(
                  Number(viewData.batch.quantity || 0) *
                    Number(viewData.batch.cost_price || 0)
                )}
              />
              <Detail
                title="Expiry Date"
                value={formatDate(viewData.batch.expiry_date)}
              />
            </div>

            <div className="movement-box">
              <h3>Batch Movement History</h3>

              {viewData.movements.length === 0 ? (
                <div className="mini-empty">No batch movements found.</div>
              ) : (
                <div className="movement-list">
                  {viewData.movements.map((movement) => (
                    <div className="movement-row" key={movement.id}>
                      <div>
                        <strong>{movement.movement_type}</strong>
                        <span>
                          {movement.reference_type} #
                          {movement.reference_id || "-"}
                        </span>
                      </div>

                      <div>
                        <strong>{formatQty(movement.quantity)}</strong>
                        <span>
                          Balance: {formatQty(movement.balance_after)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mode-tabs">
          <button
            type="button"
            className={mode === "all" ? "active" : ""}
            onClick={() => setMode("all")}
          >
            All Batches
          </button>

          <button
            type="button"
            className={mode === "near" ? "active warning" : "warning"}
            onClick={() => setMode("near")}
          >
            Near Expiry
          </button>

          <button
            type="button"
            className={mode === "expired" ? "active danger" : "danger"}
            onClick={() => setMode("expired")}
          >
            Expired
          </button>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch, product, warehouse..."
              disabled={mode !== "all"}
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

          {mode === "all" && (
            <>
              <select
                className="filter-select"
                value={batchStatusFilter}
                onChange={(e) => setBatchStatusFilter(e.target.value)}
              >
                <option value="">All Batch Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="blocked">Blocked</option>
                <option value="consumed">Consumed</option>
              </select>

              <select
                className="filter-select"
                value={expiryStatusFilter}
                onChange={(e) => setExpiryStatusFilter(e.target.value)}
              >
                <option value="">All Expiry Status</option>
                <option value="normal">Normal</option>
                <option value="near_expiry">Near Expiry</option>
                <option value="expired">Expired</option>
                <option value="disposed">Disposed</option>
              </select>
            </>
          )}

          {mode === "near" && (
            <select
              className="filter-select"
              value={nearDays}
              onChange={(e) => setNearDays(e.target.value)}
            >
              <option value="7">Next 7 days</option>
              <option value="15">Next 15 days</option>
              <option value="30">Next 30 days</option>
              <option value="60">Next 60 days</option>
              <option value="90">Next 90 days</option>
            </select>
          )}

          <div className="api-chip">
            API Connected · <strong>{batches.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Inventory Batch List</h2>
            <p>Batch-wise quantity, expiry tracking and status management</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={26} className="spin" />
              <h3>Loading batches...</h3>
              <p>Please wait while inventory batches are loading.</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="empty-box">
              <PackageCheck size={34} />
              <h3>No inventory batches found</h3>
              <p>
                Batches will be created automatically from Stock Inward entries.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Value</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {batches.map((batch) => {
                    const batchStatus =
                      batch.batch_status || batch.status || "active";

                    const stockValue =
                      batch.stock_value !== undefined &&
                      batch.stock_value !== null
                        ? batch.stock_value
                        : Number(batch.quantity || 0) *
                          Number(batch.cost_price || 0);

                    const daysToExpiry =
                      batch.days_to_expiry !== undefined &&
                      batch.days_to_expiry !== null
                        ? batch.days_to_expiry
                        : batch.expired_days !== undefined &&
                          batch.expired_days !== null
                        ? -Number(batch.expired_days)
                        : null;

                    return (
                      <tr key={batch.id}>
                        <td>
                          <div className="main-name">
                            {batch.batch_no || "-"}
                          </div>
                          <div className="small-text">
                            MFG: {formatDate(batch.manufacture_date)}
                          </div>
                        </td>

                        <td>
                          <div className="main-name">
                            {batch.product_name || "-"}
                          </div>
                          <div className="small-text">
                            {batch.sku || batch.product_code || "-"}
                          </div>
                        </td>

                        <td>
                          <div className="info-line">
                            <Warehouse size={13} />
                            {batch.warehouse_name || "-"}
                          </div>
                          <div className="small-text">
                            {batch.warehouse_code || "-"}
                          </div>
                        </td>

                        <td>
                          {formatQty(batch.quantity)} {batch.unit_name || ""}
                        </td>

                        <td>{formatMoney(batch.cost_price)}</td>

                        <td>{formatMoney(stockValue)}</td>

                        <td>
                          <div className="main-name">
                            {formatDate(batch.expiry_date)}
                          </div>

                          <span
                            className={`expiry-pill ${
                              daysToExpiry === null
                                ? "normal"
                                : Number(daysToExpiry) < 0
                                ? "expired"
                                : Number(daysToExpiry) <= 30
                                ? "near"
                                : "normal"
                            }`}
                          >
                            {getExpiryLabel(daysToExpiry)}
                          </span>
                        </td>

                        <td>
                          <div className="status-stack">
                            <span className={`status-badge ${batchStatus}`}>
                              {batchStatus}
                            </span>

                            {batch.expiry_status && (
                              <span
                                className={`expiry-status ${batch.expiry_status}`}
                              >
                                {batch.expiry_status}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="view-btn"
                              onClick={() => handleView(batch)}
                              title="View"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => openEdit(batch)}
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            {batchStatus === "active" && (
                              <button
                                type="button"
                                className="block-btn"
                                onClick={() =>
                                  handleStatusChange(batch, "blocked")
                                }
                                title="Block"
                              >
                                <Ban size={16} />
                              </button>
                            )}

                            {batchStatus === "blocked" && (
                              <button
                                type="button"
                                className="active-btn"
                                onClick={() =>
                                  handleStatusChange(batch, "active")
                                }
                                title="Activate"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}

                            {(Number(daysToExpiry) < 0 ||
                              batch.expiry_status === "expired") &&
                              Number(batch.quantity || 0) > 0 && (
                                <button
                                  type="button"
                                  className="dispose-btn"
                                  onClick={() => handleDispose(batch)}
                                  title="Dispose Expired Batch"
                                >
                                  <Trash2 size={16} />
                                </button>
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
  .batch-page { color: #151515; }

  .batch-hero {
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

  .batch-hero::after {
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

  .batch-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .batch-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 760px;
  }

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
    position: relative;
    z-index: 1;
  }

  .secondary-btn {
    background: rgba(255,255,255,0.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .save-btn {
    background: #facc15;
    color: #111;
    box-shadow: 0 14px 30px rgba(250,204,21,0.24);
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
    grid-template-columns: repeat(5, minmax(0, 1fr));
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
    font-size: 24px;
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
  .view-card,
  .mode-tabs {
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
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 20px;
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
  }

  .batch-detail-grid {
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
  }

  .movement-box {
    border-top: 1px solid #ececec;
    padding-top: 18px;
  }

  .movement-box h3 {
    margin: 0 0 14px;
    color: #111;
    font-size: 18px;
    font-weight: 950;
  }

  .movement-list {
    display: grid;
    gap: 10px;
  }

  .movement-row {
    border: 1px solid #ececec;
    background: #fafafa;
    border-radius: 16px;
    padding: 13px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .movement-row strong {
    display: block;
    color: #111;
    font-weight: 950;
    text-transform: capitalize;
  }

  .movement-row span {
    display: block;
    margin-top: 4px;
    color: #777;
    font-size: 12px;
    font-weight: 800;
  }

  .mini-empty {
    border: 1px dashed #ddd;
    background: #fafafa;
    border-radius: 18px;
    padding: 22px;
    color: #777;
    font-size: 13px;
    font-weight: 850;
    text-align: center;
  }

  .mode-tabs {
    display: flex;
    gap: 10px;
    padding: 10px;
    margin-bottom: 18px;
  }

  .mode-tabs button {
    border: none;
    border-radius: 16px;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 950;
    background: #f4f4f5;
    color: #52525b;
    cursor: pointer;
  }

  .mode-tabs button.active {
    background: #111;
    color: #facc15;
  }

  .mode-tabs button.warning.active {
    background: #fffbeb;
    color: #b45309;
  }

  .mode-tabs button.danger.active {
    background: #fff1f2;
    color: #be123c;
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

  .search-wrap input:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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

  .expiry-pill,
  .status-badge,
  .expiry-status {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
    margin-top: 6px;
  }

  .expiry-pill.normal,
  .expiry-status.normal {
    background: #ecfdf5;
    color: #047857;
  }

  .expiry-pill.near,
  .expiry-status.near_expiry {
    background: #fffbeb;
    color: #b45309;
  }

  .expiry-pill.expired,
  .expiry-status.expired {
    background: #fff1f2;
    color: #be123c;
  }

  .expiry-status.disposed {
    background: #f4f4f5;
    color: #52525b;
  }

  .status-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .status-badge.active {
    background: #dcfce7;
    color: #15803d;
  }

  .status-badge.expired {
    background: #fff1f2;
    color: #be123c;
  }

  .status-badge.blocked {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.consumed {
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
  .block-btn,
  .active-btn,
  .dispose-btn {
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

  .block-btn {
    background: #fffbeb;
    color: #b45309;
  }

  .active-btn {
    background: #ecfdf5;
    color: #047857;
  }

  .dispose-btn {
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

  @media (max-width: 1200px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .form-grid,
    .batch-detail-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .stats-grid,
    .form-grid,
    .batch-detail-grid {
      grid-template-columns: 1fr;
    }

    .batch-hero,
    .toolbar,
    .movement-row {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .secondary-btn {
      width: 100%;
    }

    .mode-tabs {
      flex-direction: column;
    }
  }
`;