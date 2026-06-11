import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  IndianRupee,
  Package,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";

const fmt = (v) =>
  Number(v || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const fmtNum = (v) => Number(v || 0).toLocaleString("en-IN");
const fmtDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const safe = (v, fb = "-") => (v !== null && v !== undefined && v !== "" ? String(v) : fb);

const TABS = [
  { key: "summary",     label: "Summary",     icon: BarChart3 },
  { key: "orders",      label: "Orders",       icon: ShoppingCart },
  { key: "items",       label: "Top Items",    icon: Package },
  { key: "payments",    label: "Payments",     icon: IndianRupee },
  { key: "invoices",    label: "Invoices",     icon: ClipboardList },
  { key: "delivery",    label: "Delivery",     icon: Truck },
  { key: "returns",     label: "Returns",      icon: ArrowLeftRight },
  { key: "performance", label: "Performance",  icon: TrendingUp },
];

const ORDER_STATUS_COLOR = {
  pending:    { bg: "rgba(234,179,8,0.13)",  color: "#CA8A04" },
  confirmed:  { bg: "rgba(37,99,235,0.12)",  color: "#2563EB" },
  processing: { bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  packed:     { bg: "rgba(6,182,212,0.12)",  color: "#0891B2" },
  dispatched: { bg: "rgba(234,88,12,0.12)",  color: "#EA580C" },
  delivered:  { bg: "rgba(22,163,74,0.13)",  color: "#16A34A" },
  cancelled:  { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
  returned:   { bg: "rgba(107,114,128,0.12)",color: "#6B7280" },
};

const StatusBadge = ({ value, map }) => {
  const s = (map || {})[value] || { bg: "rgba(107,114,128,0.1)", color: "#6B7280" };
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {safe(value, "—")}
    </span>
  );
};

const StatCard = ({ label, value, hint, color, icon: Icon }) => (
  <div className="orr-stat">
    <div className="orr-stat-icon" style={{ background: `${color}1a`, color }}><Icon size={18} /></div>
    <div>
      <div className="orr-stat-val">{value}</div>
      <div className="orr-stat-label">{label}</div>
      {hint && <div className="orr-stat-hint">{hint}</div>}
    </div>
  </div>
);

export default function OrderReports() {
  const [activeTab, setActiveTab] = useState("summary");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ from_date: "", to_date: "" });

  const fetchTab = useCallback(async (tab, f) => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (f.from_date) p.set("from_date", f.from_date);
      if (f.to_date)   p.set("to_date",   f.to_date);
      const qs = p.toString() ? `?${p}` : "";
      const res = await API.get(`/api/order-reports/${tab}${qs}`);
      if (res.data.success) setData((d) => ({ ...d, [tab]: res.data }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTab(activeTab, filters); }, [activeTab, filters, fetchTab]);

  const applyFilter = () => fetchTab(activeTab, filters);
  const d = data[activeTab] || {};

  return (
    <AdminLayout>
      <style>{css}</style>
      <div className="orr-page">
        {/* Header */}
        <div className="orr-header">
          <div>
            <h1 className="orr-title">Order Reports</h1>
            <p className="orr-sub">Analytics across orders, items, payments, delivery and returns</p>
          </div>
          <div className="orr-filter-bar">
            <input type="date" value={filters.from_date} onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))} className="orr-input" />
            <input type="date" value={filters.to_date}   onChange={(e) => setFilters((f) => ({ ...f, to_date:   e.target.value }))} className="orr-input" />
            <button className="orr-btn-apply" onClick={applyFilter} disabled={loading}>
              {loading ? <RefreshCw size={14} className="spin" /> : <BarChart3 size={14} />} Apply
            </button>
          </div>
        </div>

        {error && (
          <div className="orr-error"><X size={14} />{error}</div>
        )}

        {/* Tabs */}
        <div className="orr-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`orr-tab${activeTab === key ? " active" : ""}`} onClick={() => setActiveTab(key)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="orr-content">
          {/* SUMMARY */}
          {activeTab === "summary" && d.summary && (
            <div className="orr-stats-grid">
              <StatCard label="Total Orders"     value={fmtNum(d.summary.total_orders)}    hint="All time" color="#FFD21E" icon={ShoppingCart} />
              <StatCard label="Delivered"        value={fmtNum(d.summary.delivered_orders)} hint="Completed"  color="#16A34A" icon={PackageCheck} />
              <StatCard label="Cancelled"        value={fmtNum(d.summary.cancelled_orders)} hint="" color="#EF4444" icon={X} />
              <StatCard label="Returned"         value={fmtNum(d.summary.returned_orders)}  hint="" color="#6B7280" icon={ArrowLeftRight} />
              <StatCard label="Active Revenue"   value={fmt(d.summary.active_revenue)}      hint="Excl. cancelled/returned" color="#16A34A" icon={TrendingUp} />
              <StatCard label="Paid Revenue"     value={fmt(d.summary.paid_revenue)}        hint="payment_status=paid" color="#2563EB" icon={IndianRupee} />
              <StatCard label="Unpaid Revenue"   value={fmt(d.summary.unpaid_revenue)}      hint="payment_status=pending" color="#CA8A04" icon={IndianRupee} />
              <StatCard label="Collected"        value={fmt(d.summary.total_collected)}     hint="From payments table" color="#7C3AED" icon={IndianRupee} />
            </div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <>
              <div className="orr-count">{fmtNum(d.count || 0)} orders</div>
              <div className="orr-table-wrap">
                <table className="orr-table">
                  <thead><tr>
                    <th>Order #</th><th>Customer</th><th>Date</th>
                    <th>Status</th><th>Payment</th><th className="right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {(d.orders || []).map((o) => (
                      <tr key={o.id}>
                        <td><span className="orr-code">{o.order_number}</span></td>
                        <td>{safe(o.customer_name)}</td>
                        <td>{fmtDate(o.order_date)}</td>
                        <td><StatusBadge value={o.order_status}   map={ORDER_STATUS_COLOR} /></td>
                        <td><StatusBadge value={o.payment_status} map={ORDER_STATUS_COLOR} /></td>
                        <td className="right orr-amount">{fmt(o.total_amount)}</td>
                      </tr>
                    ))}
                    {(d.orders || []).length === 0 && <tr><td colSpan={6} className="orr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ITEMS */}
          {activeTab === "items" && (
            <>
              <div className="orr-count">{fmtNum(d.count || 0)} products</div>
              <div className="orr-table-wrap">
                <table className="orr-table">
                  <thead><tr>
                    <th>Product</th><th>SKU</th><th className="right">Orders</th>
                    <th className="right">Qty Sold</th><th className="right">Revenue</th>
                  </tr></thead>
                  <tbody>
                    {(d.items || []).map((item, i) => (
                      <tr key={i}>
                        <td>{safe(item.product_name)}</td>
                        <td><span className="orr-code">{safe(item.sku)}</span></td>
                        <td className="right">{fmtNum(item.order_count)}</td>
                        <td className="right">{fmtNum(item.total_qty)}</td>
                        <td className="right orr-amount">{fmt(item.total_revenue)}</td>
                      </tr>
                    ))}
                    {(d.items || []).length === 0 && <tr><td colSpan={5} className="orr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* PAYMENTS */}
          {activeTab === "payments" && (
            <>
              <div className="orr-count">{fmtNum(d.count || 0)} payments · Total: <strong>{fmt(d.total_collected)}</strong></div>
              <div className="orr-table-wrap">
                <table className="orr-table">
                  <thead><tr>
                    <th>Payment #</th><th>Order #</th><th>Customer</th>
                    <th>Date</th><th>Reference</th><th className="right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {(d.payments || []).map((p) => (
                      <tr key={p.id}>
                        <td><span className="orr-code">{p.payment_number}</span></td>
                        <td>{safe(p.order_number)}</td>
                        <td>{safe(p.customer_name)}</td>
                        <td>{fmtDate(p.payment_date)}</td>
                        <td className="orr-muted">{safe(p.transaction_reference)}</td>
                        <td className="right orr-amount">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                    {(d.payments || []).length === 0 && <tr><td colSpan={6} className="orr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* INVOICES */}
          {activeTab === "invoices" && (
            <>
              <div className="orr-count">{fmtNum(d.count || 0)} invoices</div>
              <div className="orr-table-wrap">
                <table className="orr-table">
                  <thead><tr>
                    <th>Invoice #</th><th>Order #</th><th>Customer</th>
                    <th>Date</th><th>Status</th><th className="right">Total</th><th className="right">Balance</th>
                  </tr></thead>
                  <tbody>
                    {(d.invoices || []).map((inv) => (
                      <tr key={inv.id}>
                        <td><span className="orr-code">{inv.invoice_number}</span></td>
                        <td>{safe(inv.order_number)}</td>
                        <td>{safe(inv.customer_name)}</td>
                        <td>{fmtDate(inv.invoice_date)}</td>
                        <td><StatusBadge value={inv.status} map={ORDER_STATUS_COLOR} /></td>
                        <td className="right orr-amount">{fmt(inv.total_amount)}</td>
                        <td className="right" style={{ color: Number(inv.balance_amount) > 0 ? "#EF4444" : "#16A34A", fontWeight: 700 }}>{fmt(inv.balance_amount)}</td>
                      </tr>
                    ))}
                    {(d.invoices || []).length === 0 && <tr><td colSpan={7} className="orr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* DELIVERY */}
          {activeTab === "delivery" && (
            <>
              <div className="orr-count">{fmtNum(d.count || 0)} deliveries</div>
              <div className="orr-table-wrap">
                <table className="orr-table">
                  <thead><tr>
                    <th>Delivery #</th><th>Order #</th><th>Customer</th>
                    <th>Driver</th><th>Delivery Date</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {(d.deliveries || []).map((del) => (
                      <tr key={del.id}>
                        <td><span className="orr-code">{del.delivery_number}</span></td>
                        <td>{safe(del.order_number)}</td>
                        <td>{safe(del.customer_name)}</td>
                        <td>{safe(del.driver_name)}</td>
                        <td>{fmtDate(del.delivery_date)}</td>
                        <td><StatusBadge value={del.delivery_status} map={ORDER_STATUS_COLOR} /></td>
                      </tr>
                    ))}
                    {(d.deliveries || []).length === 0 && <tr><td colSpan={6} className="orr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* RETURNS */}
          {activeTab === "returns" && (
            <>
              <div className="orr-count">{fmtNum(d.count || 0)} returns</div>
              <div className="orr-table-wrap">
                <table className="orr-table">
                  <thead><tr>
                    <th>Return #</th><th>Order #</th><th>Customer</th>
                    <th>Date</th><th>Status</th><th>Reason</th>
                  </tr></thead>
                  <tbody>
                    {(d.returns || []).map((r) => (
                      <tr key={r.id}>
                        <td><span className="orr-code">{r.return_number}</span></td>
                        <td>{safe(r.order_number)}</td>
                        <td>{safe(r.customer_name)}</td>
                        <td>{fmtDate(r.return_date)}</td>
                        <td><StatusBadge value={r.status} map={ORDER_STATUS_COLOR} /></td>
                        <td className="orr-muted">{safe(r.reason)}</td>
                      </tr>
                    ))}
                    {(d.returns || []).length === 0 && <tr><td colSpan={6} className="orr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* PERFORMANCE */}
          {activeTab === "performance" && (
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div className="orr-card" style={{ flex: "1 1 320px" }}>
                <div className="orr-card-title">Orders by Status</div>
                <table className="orr-table">
                  <thead><tr><th>Status</th><th className="right">Count</th><th className="right">Revenue</th></tr></thead>
                  <tbody>
                    {(d.by_status || []).map((row) => (
                      <tr key={row.order_status}>
                        <td><StatusBadge value={row.order_status} map={ORDER_STATUS_COLOR} /></td>
                        <td className="right">{fmtNum(row.count)}</td>
                        <td className="right orr-amount">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="orr-card" style={{ flex: "2 1 480px" }}>
                <div className="orr-card-title">Daily Orders &amp; Revenue</div>
                <div className="orr-table-wrap" style={{ maxHeight: 320 }}>
                  <table className="orr-table">
                    <thead><tr><th>Date</th><th className="right">Orders</th><th className="right">Revenue</th></tr></thead>
                    <tbody>
                      {(d.by_day || []).map((row) => (
                        <tr key={row.day}>
                          <td>{fmtDate(row.day)}</td>
                          <td className="right">{fmtNum(row.orders)}</td>
                          <td className="right orr-amount">{fmt(row.revenue)}</td>
                        </tr>
                      ))}
                      {(d.by_day || []).length === 0 && <tr><td colSpan={3} className="orr-empty">No data</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {loading && <div className="orr-loading"><RefreshCw size={20} className="spin" /> Loading…</div>}
        </div>
      </div>
    </AdminLayout>
  );
}

const css = `
  .orr-page {
    --orr-bg: linear-gradient(135deg,#FFFDF6 0%,#FFF8E1 45%,#F7EBC5 100%);
    --orr-card: rgba(255,255,255,0.96);
    --orr-border: rgba(232,224,199,0.95);
    --orr-text: #171717;
    --orr-muted: #6B7280;
    min-height:100vh; padding:28px 28px 60px; background:var(--orr-bg);
    font-family:inherit; color:var(--orr-text);
  }
  .theme-dark .orr-page { --orr-bg:linear-gradient(135deg,#18150A 0%,#1C1A0F 100%); --orr-card:rgba(30,28,18,0.98); --orr-border:rgba(255,210,30,0.12); --orr-text:#F8FAFC; --orr-muted:rgba(255,255,255,0.5); }

  .orr-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:24px; }
  .orr-title  { font-size:22px; font-weight:900; margin:0 0 4px; letter-spacing:-.4px; }
  .orr-sub    { font-size:13px; color:var(--orr-muted); margin:0; }

  .orr-filter-bar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .orr-input { height:36px; padding:0 12px; border-radius:10px; border:1.5px solid var(--orr-border); background:var(--orr-card); color:var(--orr-text); font-size:13px; outline:none; }
  .orr-input:focus { border-color:#FFD21E; }
  .orr-btn-apply { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 18px; border-radius:10px; background:#FFD21E; color:#171717; font-weight:800; font-size:13px; border:none; cursor:pointer; }
  .orr-btn-apply:hover { background:#F5C400; }
  .orr-btn-apply:disabled { opacity:.6; cursor:not-allowed; }

  .orr-error { display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:10px; background:rgba(239,68,68,0.1); color:#EF4444; font-size:13px; margin-bottom:16px; }

  .orr-tabs { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:20px; border-bottom:2px solid var(--orr-border); padding-bottom:4px; }
  .orr-tab { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:8px 8px 0 0; border:none; background:transparent; color:var(--orr-muted); font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; }
  .orr-tab:hover  { color:var(--orr-text); background:rgba(255,210,30,0.1); }
  .orr-tab.active { background:#FFD21E; color:#171717; font-weight:800; }

  .orr-content { min-height:300px; }
  .orr-count   { font-size:13px; font-weight:700; color:var(--orr-muted); margin-bottom:12px; }

  .orr-stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
  .orr-stat { display:flex; align-items:center; gap:14px; padding:16px 18px; border-radius:14px; background:var(--orr-card); border:1.5px solid var(--orr-border); }
  .orr-stat-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .orr-stat-val   { font-size:17px; font-weight:900; line-height:1; }
  .orr-stat-label { font-size:11px; font-weight:700; color:var(--orr-muted); margin-top:3px; }
  .orr-stat-hint  { font-size:11px; color:var(--orr-muted); margin-top:2px; }

  .orr-table-wrap { overflow-x:auto; border-radius:14px; border:1.5px solid var(--orr-border); }
  .orr-table { width:100%; border-collapse:collapse; font-size:13px; }
  .orr-table thead tr { background:rgba(255,210,30,0.08); }
  .orr-table th { padding:10px 14px; text-align:left; font-size:11px; font-weight:800; color:var(--orr-muted); letter-spacing:.04em; white-space:nowrap; }
  .orr-table th.right, .orr-table td.right { text-align:right; }
  .orr-table td { padding:10px 14px; border-top:1px solid var(--orr-border); vertical-align:middle; }
  .orr-table tr:hover td { background:rgba(255,210,30,0.04); }
  .orr-code   { font-family:monospace; font-size:11.5px; font-weight:700; background:rgba(255,210,30,0.12); padding:2px 8px; border-radius:6px; }
  .orr-amount { font-weight:800; }
  .orr-muted  { color:var(--orr-muted); font-size:12px; }
  .orr-empty  { text-align:center; padding:28px; color:var(--orr-muted); font-size:13px; }

  .orr-card       { background:var(--orr-card); border:1.5px solid var(--orr-border); border-radius:14px; padding:18px; }
  .orr-card-title { font-size:13px; font-weight:800; margin-bottom:14px; }

  .orr-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px; color:var(--orr-muted); font-size:14px; }
  @keyframes orr-spin { to { transform:rotate(360deg); } }
  .spin { animation:orr-spin .8s linear infinite; }
`;
