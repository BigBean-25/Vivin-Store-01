import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  ChevronDown,
  IndianRupee,
  Layers3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  Warehouse,
} from "lucide-react";

const TABS = [
  { key: "overview",   label: "Stock Overview",  icon: Package },
  { key: "low",        label: "Low Stock",        icon: TrendingDown },
  { key: "batches",    label: "Batch / Expiry",   icon: Layers3 },
  { key: "movements",  label: "Movements",        icon: BarChart3 },
  { key: "valuation",  label: "Valuation",        icon: IndianRupee },
];

const MOVEMENT_TYPES = ["in", "out", "transfer", "adjustment", "damage", "reservation", "release"];

const fmt = (n, dec = 0) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });

const fmtCurrency = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function WarehouseStockReports() {
  const [tab, setTab] = useState("overview");
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState({});

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [search, setSearch] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");
  const [expiryStatusFilter, setExpiryStatusFilter] = useState("");
  const [movTypeFilter, setMovTypeFilter] = useState("");

  const [stockData, setStockData] = useState([]);
  const [lowStockData, setLowStockData] = useState([]);
  const [batchData, setBatchData] = useState([]);
  const [movementData, setMovementData] = useState([]);
  const [valuationData, setValuationData] = useState([]);
  const [valuationTotals, setValuationTotals] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/api/warehouses");
      if (res.data.success) setWarehouses(res.data.warehouses || res.data.data || []);
    } catch { setWarehouses([]); }
  };

  const fetchSummary = useCallback(async () => {
    try {
      const res = await API.get("/api/warehouse-stock/summary", {
        params: warehouseFilter ? { warehouse_id: warehouseFilter } : {},
      });
      if (res.data.success) setSummary(res.data.summary || {});
    } catch { setSummary({}); }
  }, [warehouseFilter]);

  const fetchTabData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "overview") {
        const res = await API.get("/api/warehouse-stock", {
          params: { warehouse_id: warehouseFilter, search, stock_status: stockStatusFilter },
        });
        if (res.data.success) setStockData(res.data.stock || []);
      } else if (tab === "low") {
        const res = await API.get("/api/warehouse-stock/low-stock", {
          params: { warehouse_id: warehouseFilter },
        });
        if (res.data.success) setLowStockData(res.data.low_stock || []);
      } else if (tab === "batches") {
        const res = await API.get("/api/warehouse-stock/batches", {
          params: { warehouse_id: warehouseFilter, search, expiry_status: expiryStatusFilter },
        });
        if (res.data.success) setBatchData(res.data.batches || []);
      } else if (tab === "movements") {
        const res = await API.get("/api/warehouse-stock/movements", {
          params: { warehouse_id: warehouseFilter, movement_type: movTypeFilter, search, limit: 200 },
        });
        if (res.data.success) setMovementData(res.data.movements || []);
      } else if (tab === "valuation") {
        const res = await API.get("/api/warehouse-stock/valuation", {
          params: { warehouse_id: warehouseFilter },
        });
        if (res.data.success) {
          setValuationData(res.data.valuation || []);
          setValuationTotals(res.data.totals || {});
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch data");
    } finally { setLoading(false); }
  }, [tab, warehouseFilter, search, stockStatusFilter, expiryStatusFilter, movTypeFilter]);

  useEffect(() => { fetchWarehouses(); }, []);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchTabData(); }, [fetchTabData]);

  const refreshAll = () => { fetchSummary(); fetchTabData(); };

  const stats = useMemo(() => [
    { label: "Total Warehouses", value: fmt(summary.total_warehouses), icon: Warehouse },
    { label: "Products in Stock", value: fmt(summary.total_products), icon: Package },
    { label: "Total Stock Qty", value: fmt(summary.total_qty, 2), icon: Box },
    { label: "Total Stock Value", value: fmtCurrency(summary.total_value), icon: IndianRupee },
    { label: "Low Stock Items", value: fmt(summary.low_stock_count), icon: TrendingDown, warn: summary.low_stock_count > 0 },
    { label: "Near Expiry Batches", value: fmt(summary.near_expiry_count), icon: AlertTriangle, warn: summary.near_expiry_count > 0 },
    { label: "Expired Batches", value: fmt(summary.expired_count), icon: AlertTriangle, danger: summary.expired_count > 0 },
  ], [summary]);

  return (
    <AdminLayout>
      <div className="wsr-page">
        <style>{css}</style>

        <div className="wsr-hero">
          <div className="hero-left">
            <div className="hero-icon"><BarChart3 size={30} /></div>
            <div>
              <div className="eyebrow">Warehouse Reports</div>
              <h1>Warehouse Stock &amp; Reports</h1>
              <p>
                Warehouse-wise stock overview using batch inventory. Includes low
                stock alerts, expiry tracking, movement ledger and stock valuation.
              </p>
            </div>
          </div>
          <div className="hero-actions">
            <select
              className="wh-select"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <button type="button" className="refresh-btn" onClick={refreshAll} disabled={loading}>
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className={`stat-card ${s.warn ? "warn" : ""} ${s.danger ? "danger" : ""}`}>
              <div className="stat-icon"><s.icon size={18} /></div>
              <div>
                <div className="stat-val">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tab-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <OverviewTab
            data={stockData}
            loading={loading}
            search={search}
            setSearch={setSearch}
            stockStatusFilter={stockStatusFilter}
            setStockStatusFilter={setStockStatusFilter}
          />
        )}
        {tab === "low" && (
          <LowStockTab data={lowStockData} loading={loading} />
        )}
        {tab === "batches" && (
          <BatchesTab
            data={batchData}
            loading={loading}
            search={search}
            setSearch={setSearch}
            expiryStatusFilter={expiryStatusFilter}
            setExpiryStatusFilter={setExpiryStatusFilter}
          />
        )}
        {tab === "movements" && (
          <MovementsTab
            data={movementData}
            loading={loading}
            search={search}
            setSearch={setSearch}
            movTypeFilter={movTypeFilter}
            setMovTypeFilter={setMovTypeFilter}
          />
        )}
        {tab === "valuation" && (
          <ValuationTab data={valuationData} totals={valuationTotals} loading={loading} />
        )}
      </div>
    </AdminLayout>
  );
}

function OverviewTab({ data, loading, search, setSearch, stockStatusFilter, setStockStatusFilter }) {
  const STATUS_COLOR = { normal: "normal", reorder: "warn", low_stock: "danger", out_of_stock: "inactive" };

  return (
    <div className="tab-panel">
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, warehouse..." />
        </div>
        <select className="filter-select" value={stockStatusFilter} onChange={(e) => setStockStatusFilter(e.target.value)}>
          <option value="">All Stock Status</option>
          <option value="normal">Normal</option>
          <option value="reorder">Reorder</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <div className="record-chip"><strong>{data.length}</strong> records</div>
      </div>
      <div className="table-wrap">
        {loading ? <Loading /> : data.length === 0 ? <Empty msg="No stock records found." /> : (
          <table>
            <thead><tr>
              <th>Product</th><th>Warehouse</th><th>Total Qty</th>
              <th>Stock Value</th><th>Batches</th><th>Earliest Expiry</th><th>Status</th>
            </tr></thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div className="bold">{r.product_name}</div>
                    <div className="sub">{r.sku || r.product_code || ""}</div>
                  </td>
                  <td>
                    <div className="small">{r.warehouse_name}</div>
                    <div className="sub">{r.warehouse_code}</div>
                  </td>
                  <td><span className="qty">{fmt(r.total_qty, 3)}</span></td>
                  <td><span className="currency">{fmtCurrency(r.stock_value)}</span></td>
                  <td><span className="chip">{r.batch_count}</span></td>
                  <td><span className="sub">{fmtDate(r.earliest_expiry)}</span></td>
                  <td>
                    <span className={`badge ${STATUS_COLOR[r.stock_status] || "normal"}`}>
                      {r.stock_status?.replace("_", " ") || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LowStockTab({ data, loading }) {
  return (
    <div className="tab-panel">
      <div className="toolbar">
        <div className="warn-note">
          <AlertTriangle size={15} /> Items at or below reorder level or minimum stock level
        </div>
        <div className="record-chip"><strong>{data.length}</strong> records</div>
      </div>
      <div className="table-wrap">
        {loading ? <Loading /> : data.length === 0 ? <Empty msg="No low stock items found." icon="ok" /> : (
          <table>
            <thead><tr>
              <th>Product</th><th>Warehouse</th><th>Current Qty</th>
              <th>Min Level</th><th>Reorder Level</th><th>Stock Value</th>
            </tr></thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} className="warn-row">
                  <td>
                    <div className="bold">{r.product_name}</div>
                    <div className="sub">{r.sku || r.product_code || ""}</div>
                  </td>
                  <td>
                    <div className="small">{r.warehouse_name}</div>
                    <div className="sub">{r.warehouse_code}</div>
                  </td>
                  <td><span className="qty danger-text">{fmt(r.total_qty, 3)}</span></td>
                  <td><span className="sub">{fmt(r.min_stock_level, 3)}</span></td>
                  <td><span className="sub">{fmt(r.reorder_level, 3)}</span></td>
                  <td><span className="currency">{fmtCurrency(r.stock_value)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BatchesTab({ data, loading, search, setSearch, expiryStatusFilter, setExpiryStatusFilter }) {
  const EXPIRY_COLOR = {
    expired: "danger", near_expiry: "warn", normal: "normal", no_expiry: "chip",
  };

  return (
    <div className="tab-panel">
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, batch no..." />
        </div>
        <select className="filter-select" value={expiryStatusFilter} onChange={(e) => setExpiryStatusFilter(e.target.value)}>
          <option value="">All Expiry Status</option>
          <option value="expired">Expired</option>
          <option value="near_expiry">Near Expiry (30 days)</option>
          <option value="normal">Normal</option>
        </select>
        <div className="record-chip"><strong>{data.length}</strong> batches</div>
      </div>
      <div className="table-wrap">
        {loading ? <Loading /> : data.length === 0 ? <Empty msg="No batch records found." /> : (
          <table>
            <thead><tr>
              <th>Product</th><th>Batch No</th><th>Warehouse</th>
              <th>Qty</th><th>Cost</th><th>Batch Value</th>
              <th>Mfg Date</th><th>Expiry Date</th><th>Days Left</th><th>Status</th>
            </tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="bold">{r.product_name}</div>
                    <div className="sub">{r.sku || ""}</div>
                  </td>
                  <td><span className="chip">{r.batch_no}</span></td>
                  <td>
                    <div className="small">{r.warehouse_name}</div>
                    <div className="sub">{r.warehouse_code}</div>
                  </td>
                  <td><span className="qty">{fmt(r.quantity, 3)}</span></td>
                  <td><span className="sub">{fmtCurrency(r.cost_price)}</span></td>
                  <td><span className="currency">{fmtCurrency(r.batch_value)}</span></td>
                  <td><span className="sub">{fmtDate(r.manufacture_date)}</span></td>
                  <td><span className={`sub ${r.expiry_status === "expired" ? "danger-text" : r.expiry_status === "near_expiry" ? "warn-text" : ""}`}>{fmtDate(r.expiry_date)}</span></td>
                  <td>
                    {r.expiry_date
                      ? <span className={r.days_to_expiry < 0 ? "danger-text" : r.days_to_expiry <= 30 ? "warn-text" : "sub"}>
                          {r.days_to_expiry < 0 ? `${Math.abs(r.days_to_expiry)}d ago` : `${r.days_to_expiry}d`}
                        </span>
                      : <span className="sub">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${EXPIRY_COLOR[r.expiry_status] || "chip"}`}>
                      {r.expiry_status?.replace("_", " ") || r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MovementsTab({ data, loading, search, setSearch, movTypeFilter, setMovTypeFilter }) {
  const MOV_COLOR = {
    in: "normal", out: "danger", transfer: "warn", adjustment: "chip",
    damage: "inactive", reservation: "warn", release: "normal",
  };

  return (
    <div className="tab-panel">
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, warehouse, reference..." />
        </div>
        <select className="filter-select" value={movTypeFilter} onChange={(e) => setMovTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <div className="record-chip"><strong>{data.length}</strong> records</div>
      </div>
      <div className="table-wrap">
        {loading ? <Loading /> : data.length === 0 ? <Empty msg="No movement records found." /> : (
          <table>
            <thead><tr>
              <th>Date</th><th>Product</th><th>Warehouse</th><th>Type</th>
              <th>Qty</th><th>Balance After</th><th>Reference</th><th>Created By</th>
            </tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td><span className="sub">{fmtDate(r.created_at)}</span></td>
                  <td>
                    <div className="bold">{r.product_name}</div>
                    <div className="sub">{r.sku || ""}</div>
                  </td>
                  <td>
                    <div className="small">{r.warehouse_name}</div>
                    <div className="sub">{r.warehouse_code}</div>
                  </td>
                  <td>
                    <span className={`badge ${MOV_COLOR[r.movement_type] || "chip"}`}>
                      {r.movement_type}
                    </span>
                  </td>
                  <td>
                    <span className={r.movement_type === "out" || r.movement_type === "damage" ? "danger-text qty" : "qty"}>
                      {r.movement_type === "in" ? "+" : ""}{fmt(r.quantity, 3)}
                    </span>
                  </td>
                  <td><span className="qty">{fmt(r.balance_after, 3)}</span></td>
                  <td>
                    <div className="sub">{r.reference_type || "-"}</div>
                    {r.reference_id && <div className="sub">#{r.reference_id}</div>}
                    {r.batch_no && <div className="sub">Batch: {r.batch_no}</div>}
                  </td>
                  <td><span className="sub">{r.created_by_name || "-"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ValuationTab({ data, totals, loading }) {
  return (
    <div className="tab-panel">
      {!loading && totals.grand_total_value > 0 && (
        <div className="valuation-banner">
          <div className="val-item">
            <div className="val-label">Grand Total Value</div>
            <div className="val-num">{fmtCurrency(totals.grand_total_value)}</div>
          </div>
          <div className="val-item">
            <div className="val-label">Grand Total Qty</div>
            <div className="val-num">{fmt(totals.grand_total_qty, 2)}</div>
          </div>
        </div>
      )}
      <div className="table-wrap">
        {loading ? <Loading /> : data.length === 0 ? <Empty msg="No valuation data found." /> : (
          <table>
            <thead><tr>
              <th>Warehouse</th><th>Products</th>
              <th>Total Qty</th><th>Stock Value</th><th>Expired Value</th>
            </tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.warehouse_id}>
                  <td>
                    <div className="bold">{r.warehouse_name}</div>
                    <div className="sub">{r.warehouse_code}</div>
                  </td>
                  <td><span className="chip">{r.product_count}</span></td>
                  <td><span className="qty">{fmt(r.total_qty, 2)}</span></td>
                  <td><span className="currency">{fmtCurrency(r.total_value)}</span></td>
                  <td>
                    {r.expired_value > 0
                      ? <span className="danger-text currency">{fmtCurrency(r.expired_value)}</span>
                      : <span className="sub">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="empty-box">
      <Loader2 size={24} className="spin" />
      <span>Loading...</span>
    </div>
  );
}

function Empty({ msg, icon }) {
  return (
    <div className="empty-box">
      {icon === "ok" ? <CheckCircle2 size={30} color="#10b981" /> : <Package size={30} />}
      <p>{msg}</p>
    </div>
  );
}

const css = `
  .wsr-page { color: #151515; }

  .wsr-hero {
    background:
      radial-gradient(circle at top right, rgba(59,130,246,0.22), transparent 34%),
      linear-gradient(135deg, #080808, #171717 55%, #050505);
    border: 1px solid rgba(59,130,246,0.18);
    border-radius: 30px; padding: 32px; margin-bottom: 22px;
    display: flex; justify-content: space-between; gap: 22px; align-items: flex-start;
    box-shadow: 0 24px 70px rgba(0,0,0,0.22); color: #fff;
    position: relative; overflow: hidden;
  }
  .wsr-hero::after {
    content: ""; position: absolute; width: 220px; height: 220px; border-radius: 50%;
    border: 42px solid rgba(59,130,246,0.08); right: -70px; top: -90px;
  }
  .hero-left { display: flex; gap: 18px; align-items: flex-start; position: relative; z-index: 1; }
  .hero-icon {
    width: 58px; height: 58px; border-radius: 16px;
    background: rgba(59,130,246,0.18); border: 1px solid rgba(59,130,246,0.28);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 5px; }
  .wsr-hero h1 { font-size: 26px; font-weight: 700; margin: 0 0 5px; }
  .wsr-hero p { font-size: 13.5px; color: rgba(255,255,255,0.6); margin: 0; max-width: 520px; }
  .hero-actions { display: flex; gap: 10px; flex-shrink: 0; align-items: flex-start; position: relative; z-index: 1; flex-wrap: wrap; justify-content: flex-end; }
  .wh-select { border: 1px solid rgba(255,255,255,0.2); border-radius: 9px; padding: 9px 14px; font-size: 14px; background: rgba(255,255,255,0.08); color: #fff; cursor: pointer; outline: none; }
  .wh-select option { background: #1f2937; }
  .refresh-btn { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.14); padding: 9px 16px; border-radius: 9px; font-size: 14px; font-weight: 500; cursor: pointer; }
  .refresh-btn:hover { background: rgba(255,255,255,0.14); }
  .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .error-box { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; border-radius: 10px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 13px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .stat-card.warn { border-color: #fde68a; background: #fffbeb; }
  .stat-card.danger { border-color: #fecaca; background: #fef2f2; }
  .stat-icon { width: 34px; height: 34px; border-radius: 9px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #6b7280; flex-shrink: 0; }
  .stat-card.warn .stat-icon { background: #fef9c3; color: #b45309; }
  .stat-card.danger .stat-icon { background: #fee2e2; color: #dc2626; }
  .stat-val { font-size: 18px; font-weight: 700; color: #111; line-height: 1; }
  .stat-label { font-size: 11.5px; color: #6b7280; margin-top: 3px; }

  .tabs { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; border-bottom: 2px solid #e5e7eb; padding-bottom: 0; }
  .tab-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; background: none; font-size: 13.5px; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; border-radius: 0; transition: color 0.15s; }
  .tab-btn:hover { color: #3b82f6; }
  .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; font-weight: 600; }

  .tab-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
  .toolbar { display: flex; gap: 10px; align-items: center; padding: 16px 20px; flex-wrap: wrap; border-bottom: 1px solid #f3f4f6; }
  .search-wrap { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; color: #9ca3af; }
  .search-wrap input { border: none; outline: none; font-size: 14px; flex: 1; color: #111; background: transparent; }
  .filter-select { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 13.5px; color: #374151; background: #fff; cursor: pointer; outline: none; }
  .record-chip { font-size: 12px; color: #6b7280; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 7px; padding: 6px 12px; }
  .warn-note { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #b45309; font-weight: 500; }

  .valuation-banner { display: flex; gap: 24px; padding: 18px 24px; border-bottom: 1px solid #f3f4f6; background: #f0fdf4; }
  .val-item { display: flex; flex-direction: column; gap: 3px; }
  .val-label { font-size: 12px; color: #6b7280; font-weight: 500; }
  .val-num { font-size: 22px; font-weight: 700; color: #111; }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  thead th { background: #f9fafb; padding: 10px 16px; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
  tbody td { padding: 11px 16px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: top; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: #fafafa; }
  tbody tr.warn-row td { background: #fffbeb; }
  tbody tr.warn-row:hover td { background: #fef3c7; }

  .bold { font-weight: 600; color: #111; }
  .sub { font-size: 11.5px; color: #9ca3af; }
  .small { font-size: 13.5px; color: #374151; }
  .qty { font-weight: 600; color: #111; }
  .currency { font-weight: 600; color: #059669; }
  .danger-text { color: #dc2626 !important; }
  .warn-text { color: #d97706 !important; }

  .chip { display: inline-block; background: #f3f4f6; color: #374151; border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 500; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
  .badge.normal { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .badge.warn { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .badge.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  .badge.inactive { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
  .badge.chip { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }

  .empty-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; gap: 10px; color: #9ca3af; text-align: center; font-size: 13.5px; }

  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
