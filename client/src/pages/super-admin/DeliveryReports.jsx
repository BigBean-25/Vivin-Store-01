import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BarChart3, CheckCircle2, MapPin, Navigation, PackageCheck,
  RefreshCw, Truck, User, X, IndianRupee, ShieldCheck,
  ClipboardList, ArrowLeftRight,
} from "lucide-react";

const fmt  = (v) => Number(v || 0).toLocaleString("en-IN");
const fmtDate = (v) => { if (!v) return "—"; return new Date(v).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); };
const safe = (v, fb = "—") => (v !== null && v !== undefined && v !== "" ? String(v) : fb);

const TABS = [
  { key: "summary",     label: "Summary",     icon: BarChart3 },
  { key: "deliveries",  label: "Deliveries",  icon: Truck },
  { key: "drivers",     label: "Drivers",     icon: User },
  { key: "assignments", label: "Assignments", icon: ClipboardList },
  { key: "status-logs", label: "Status Logs", icon: ArrowLeftRight },
  { key: "proofs",      label: "POD / Proofs",icon: ShieldCheck },
  { key: "routes",      label: "Routes",      icon: Navigation },
  { key: "charges",     label: "Charges",     icon: IndianRupee },
  { key: "tracking",   label: "Tracking",   icon: MapPin },
  { key: "performance", label: "Performance", icon: CheckCircle2 },
];

const STATUS_COLOR = {
  pending:    { bg:"rgba(234,179,8,0.13)",  color:"#CA8A04" },
  assigned:   { bg:"rgba(37,99,235,0.12)",  color:"#2563EB" },
  picked:     { bg:"rgba(124,58,237,0.12)", color:"#7C3AED" },
  in_transit: { bg:"rgba(234,88,12,0.12)",  color:"#EA580C" },
  delivered:  { bg:"rgba(22,163,74,0.13)",  color:"#16A34A" },
  failed:     { bg:"rgba(239,68,68,0.12)",  color:"#EF4444" },
  cancelled:  { bg:"rgba(107,114,128,0.12)",color:"#6B7280" },
};
const StatusBadge = ({ value }) => {
  const s = STATUS_COLOR[value] || { bg:"rgba(107,114,128,0.1)", color:"#6B7280" };
  return <span style={{ padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:s.bg, color:s.color, whiteSpace:"nowrap" }}>{value ? value.replace(/_/g," ") : "—"}</span>;
};

export default function DeliveryReports() {
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [data, setData]           = useState({});
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchTab = useCallback(async (tab) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (filterFrom)   params.set("from_date", filterFrom);
      if (filterTo)     params.set("to_date", filterTo);
      if (filterStatus) params.set("delivery_status", filterStatus);
      const res = await API.get(`/api/delivery-reports/${tab}?${params}`);
      if (res.data.success) setData((d) => ({ ...d, [tab]: res.data }));
    } catch (err) {
      setError(err.response?.data?.message || `Failed to load ${tab} report`);
    } finally { setLoading(false); }
  }, [filterFrom, filterTo, filterStatus]);

  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const d = data[activeTab] || {};

  return (
    <AdminLayout>
      <style>{css}</style>
      <div className="dr-page">
        <div className="dr-hero">
          <div>
            <h1 className="dr-title">Delivery Reports</h1>
            <p className="dr-sub">Analytics and insights across all delivery operations</p>
          </div>
          <div className="dr-hero-right">
            <input type="date" className="dr-date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            <input type="date" className="dr-date" value={filterTo}   onChange={(e) => setFilterTo(e.target.value)} />
            <button className="dr-btn-apply" onClick={() => fetchTab(activeTab)}>Apply</button>
            <button className="dr-btn-refresh" onClick={() => fetchTab(activeTab)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {error && <div className="dr-alert"><X size={14} />{error}<button onClick={() => setError("")}><X size={12} /></button></div>}

        <div className="dr-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`dr-tab${activeTab === t.key ? " active" : ""}`}
              onClick={() => setActiveTab(t.key)}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        <div className="dr-panel">
          {loading && <div className="dr-loading"><RefreshCw size={20} className="spin" /> Loading report…</div>}

          {/* ── Summary ── */}
          {activeTab === "summary" && !loading && (() => {
            const s = d.summary || {};
            const sd = s.deliveries || {};
            const dr = s.drivers    || {};
            const pr = s.proofs     || {};
            return (
              <>
                <div className="dr-section-title">Delivery Overview</div>
                <div className="dr-kpi-grid">
                  {[
                    { label:"Total",      val:fmt(sd.total),      color:"#FFD21E" },
                    { label:"Pending",    val:fmt(sd.pending),    color:"#CA8A04" },
                    { label:"Assigned",   val:fmt(sd.assigned),   color:"#2563EB" },
                    { label:"In Transit", val:fmt(sd.in_transit), color:"#EA580C" },
                    { label:"Delivered",  val:fmt(sd.delivered),  color:"#16A34A" },
                    { label:"Failed",     val:fmt(sd.failed),     color:"#EF4444" },
                    { label:"Cancelled",  val:fmt(sd.cancelled),  color:"#6B7280" },
                  ].map((c) => (
                    <div key={c.label} className="dr-kpi-card">
                      <div className="dr-kpi-val" style={{ color:c.color }}>{c.val}</div>
                      <div className="dr-kpi-label">{c.label}</div>
                    </div>
                  ))}
                </div>
                <div className="dr-section-title" style={{ marginTop:20 }}>Drivers &amp; POD</div>
                <div className="dr-kpi-grid" style={{ gridTemplateColumns:"repeat(3,1fr)" }}>
                  <div className="dr-kpi-card"><div className="dr-kpi-val">{fmt(dr.total)}</div><div className="dr-kpi-label">Total Drivers</div></div>
                  <div className="dr-kpi-card"><div className="dr-kpi-val" style={{ color:"#16A34A" }}>{fmt(dr.available)}</div><div className="dr-kpi-label">Available</div></div>
                  <div className="dr-kpi-card"><div className="dr-kpi-val" style={{ color:"#EA580C" }}>{fmt(dr.busy)}</div><div className="dr-kpi-label">Busy</div></div>
                  <div className="dr-kpi-card"><div className="dr-kpi-val">{fmt(pr.total)}</div><div className="dr-kpi-label">POD Records</div></div>
                </div>
              </>
            );
          })()}

          {/* ── Deliveries ── */}
          {activeTab === "deliveries" && !loading && (
            <>
              <div className="dr-filter-row">
                <select className="dr-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {["pending","assigned","picked","in_transit","delivered","failed","cancelled"].map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                </select>
                <button className="dr-btn-apply" onClick={() => fetchTab("deliveries")}>Filter</button>
                <span className="dr-count">{d.count || 0} records</span>
              </div>
              <div className="dr-table-wrap">
                <table className="dr-table">
                  <thead><tr><th>#</th><th>Delivery #</th><th>Order #</th><th>Customer</th><th>Driver</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {(d.deliveries || []).map((row, i) => (
                      <tr key={row.id}>
                        <td className="dr-seq">{i + 1}</td>
                        <td><span className="dr-code">{row.delivery_number}</span></td>
                        <td><span className="dr-code">{safe(row.order_number)}</span></td>
                        <td>{safe(row.customer_name)}</td>
                        <td>{safe(row.driver_name)}</td>
                        <td>{fmtDate(row.delivery_date)}</td>
                        <td><StatusBadge value={row.delivery_status} /></td>
                      </tr>
                    ))}
                    {!(d.deliveries || []).length && <tr><td colSpan={7} className="dr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Drivers ── */}
          {activeTab === "drivers" && !loading && (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>#</th><th>Driver</th><th>Code</th><th>Phone</th><th>Vehicle</th><th>Status</th><th className="right">Total</th><th className="right">Delivered</th><th className="right">Failed</th></tr></thead>
                <tbody>
                  {(d.drivers || []).map((row, i) => (
                    <tr key={row.id}>
                      <td className="dr-seq">{i + 1}</td>
                      <td><strong>{row.name}</strong></td>
                      <td><span className="dr-code">{row.driver_code}</span></td>
                      <td>{safe(row.phone)}</td>
                      <td>{safe(row.vehicle_type)} {safe(row.vehicle_number, "")}</td>
                      <td><StatusBadge value={row.status} /></td>
                      <td className="right">{fmt(row.total_deliveries)}</td>
                      <td className="right" style={{ color:"#16A34A", fontWeight:800 }}>{fmt(row.delivered)}</td>
                      <td className="right" style={{ color:"#EF4444", fontWeight:700 }}>{fmt(row.failed)}</td>
                    </tr>
                  ))}
                  {!(d.drivers || []).length && <tr><td colSpan={9} className="dr-empty">No data</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Assignments ── */}
          {activeTab === "assignments" && !loading && (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>#</th><th>Delivery #</th><th>Driver</th><th>Assigned At</th><th>Status</th><th>Delivery Status</th></tr></thead>
                <tbody>
                  {(d.assignments || []).map((row, i) => (
                    <tr key={row.id}>
                      <td className="dr-seq">{i + 1}</td>
                      <td><span className="dr-code">{safe(row.delivery_number)}</span></td>
                      <td>{safe(row.driver_name)} {row.driver_code ? <span className="dr-code" style={{ fontSize:10 }}>{row.driver_code}</span> : null}</td>
                      <td>{fmtDate(row.assigned_at)}</td>
                      <td><span className="dr-badge">{row.status}</span></td>
                      <td><StatusBadge value={row.delivery_status} /></td>
                    </tr>
                  ))}
                  {!(d.assignments || []).length && <tr><td colSpan={6} className="dr-empty">No data</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Status Logs ── */}
          {activeTab === "status-logs" && !loading && (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>#</th><th>Delivery #</th><th>From</th><th>To</th><th>Remarks</th><th>Changed At</th></tr></thead>
                <tbody>
                  {(d.logs || []).map((row, i) => (
                    <tr key={row.id}>
                      <td className="dr-seq">{i + 1}</td>
                      <td><span className="dr-code">{safe(row.delivery_number)}</span></td>
                      <td><StatusBadge value={row.old_status} /></td>
                      <td><StatusBadge value={row.new_status} /></td>
                      <td style={{ fontSize:12, color:"#8A7A52" }}>{safe(row.remarks)}</td>
                      <td>{fmtDate(row.changed_at)}</td>
                    </tr>
                  ))}
                  {!(d.logs || []).length && <tr><td colSpan={6} className="dr-empty">No data</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Proofs ── */}
          {activeTab === "proofs" && !loading && (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>#</th><th>Delivery #</th><th>Type</th><th>Received By</th><th>Phone</th><th>Captured At</th></tr></thead>
                <tbody>
                  {(d.proofs || []).map((row, i) => (
                    <tr key={row.id}>
                      <td className="dr-seq">{i + 1}</td>
                      <td><span className="dr-code">{safe(row.delivery_number)}</span></td>
                      <td><span className="dr-badge">{row.proof_type}</span></td>
                      <td>{safe(row.received_by)}</td>
                      <td>{safe(row.received_phone)}</td>
                      <td>{fmtDate(row.captured_at)}</td>
                    </tr>
                  ))}
                  {!(d.proofs || []).length && <tr><td colSpan={6} className="dr-empty">No data</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Routes ── */}
          {activeTab === "routes" && !loading && (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>#</th><th>Code</th><th>Driver</th><th>Date</th><th>From</th><th>To</th><th className="right">km</th><th>Status</th></tr></thead>
                <tbody>
                  {(d.routes || []).map((row, i) => (
                    <tr key={row.id}>
                      <td className="dr-seq">{i + 1}</td>
                      <td><span className="dr-code">{row.route_code}</span></td>
                      <td>{safe(row.driver_name)}</td>
                      <td>{fmtDate(row.route_date)}</td>
                      <td>{safe(row.start_location)}</td>
                      <td>{safe(row.end_location)}</td>
                      <td className="right">{row.total_distance_km}</td>
                      <td><span className="dr-badge">{row.status}</span></td>
                    </tr>
                  ))}
                  {!(d.routes || []).length && <tr><td colSpan={8} className="dr-empty">No data</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Charges ── */}
          {activeTab === "charges" && !loading && (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>#</th><th>Code</th><th>Label</th><th className="right">Base (₹)</th><th className="right">/km (₹)</th><th>Min km</th><th>Max km</th><th>Active</th></tr></thead>
                <tbody>
                  {(d.charges || []).length > 0 ? (d.charges || []).map((row, i) => (
                    <tr key={row.id}>
                      <td className="dr-seq">{i + 1}</td>
                      <td><span className="dr-code">{row.charge_code}</span></td>
                      <td><strong>{row.label}</strong></td>
                      <td className="right">{Number(row.base_charge).toFixed(2)}</td>
                      <td className="right">{Number(row.per_km_charge).toFixed(2)}</td>
                      <td>{row.min_distance_km}</td>
                      <td>{safe(row.max_distance_km)}</td>
                      <td><span style={{ color: row.is_active ? "#16A34A" : "#6B7280", fontWeight:700 }}>{row.is_active ? "Yes" : "No"}</span></td>
                    </tr>
                  )) : <tr><td colSpan={8} className="dr-empty">No charge rules. Run SQL to create delivery_charges table.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Tracking ── */}
          {activeTab === "tracking" && !loading && (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>#</th><th>Delivery #</th><th>Status</th><th>Lat</th><th>Lng</th><th>Remarks</th><th>Tracked At</th></tr></thead>
                <tbody>
                  {(d.tracking || []).map((row, i) => (
                    <tr key={row.id}>
                      <td className="dr-seq">{i + 1}</td>
                      <td><span className="dr-code">{safe(row.delivery_number)}</span></td>
                      <td>{safe(row.status)}</td>
                      <td style={{ fontSize:11, fontFamily:"monospace" }}>{safe(row.latitude)}</td>
                      <td style={{ fontSize:11, fontFamily:"monospace" }}>{safe(row.longitude)}</td>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{safe(row.remarks)}</td>
                      <td>{fmtDate(row.tracked_at)}</td>
                    </tr>
                  ))}
                  {!(d.tracking || []).length && <tr><td colSpan={7} className="dr-empty">No tracking data</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Performance ── */}
          {activeTab === "performance" && !loading && (
            <>
              <div className="dr-section-title">By Status</div>
              <div className="dr-kpi-grid">
                {(d.by_status || []).map((row) => (
                  <div key={row.delivery_status} className="dr-kpi-card">
                    <div className="dr-kpi-val">{fmt(row.count)}</div>
                    <div className="dr-kpi-label">{(row.delivery_status || "").replace(/_/g," ")}</div>
                  </div>
                ))}
              </div>
              <div className="dr-section-title" style={{ marginTop:20 }}>Daily Trend</div>
              <div className="dr-table-wrap">
                <table className="dr-table">
                  <thead><tr><th>Date</th><th className="right">Total</th><th className="right">Delivered</th><th className="right">Failed</th></tr></thead>
                  <tbody>
                    {(d.by_day || []).map((row) => (
                      <tr key={row.day}>
                        <td>{fmtDate(row.day)}</td>
                        <td className="right">{fmt(row.total)}</td>
                        <td className="right" style={{ color:"#16A34A", fontWeight:700 }}>{fmt(row.delivered)}</td>
                        <td className="right" style={{ color:"#EF4444", fontWeight:700 }}>{fmt(row.failed)}</td>
                      </tr>
                    ))}
                    {!(d.by_day || []).length && <tr><td colSpan={4} className="dr-empty">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

const css = `
  .dr-page { --dr-bg:linear-gradient(135deg,#FFFDF6 0%,#FFF8E1 45%,#F7EBC5 100%); --dr-card:rgba(255,255,255,0.96); --dr-border:rgba(232,224,199,0.95); --dr-text:#171717; --dr-muted:#6B7280; min-height:100vh; padding:24px 24px 60px; background:var(--dr-bg); font-family:inherit; color:var(--dr-text); }
  .theme-dark .dr-page { --dr-bg:linear-gradient(135deg,#18150A 0%,#1C1A0F 100%); --dr-card:rgba(30,28,18,0.98); --dr-border:rgba(255,210,30,0.12); --dr-text:#F8FAFC; --dr-muted:rgba(255,255,255,0.5); }

  .dr-hero { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:20px; }
  .dr-title { font-size:22px; font-weight:900; margin:0 0 4px; }
  .dr-sub   { font-size:13px; color:var(--dr-muted); margin:0; }
  .dr-hero-right { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .dr-date  { height:36px; padding:0 10px; border-radius:9px; border:1.5px solid var(--dr-border); background:var(--dr-card); color:var(--dr-text); font-size:13px; outline:none; }
  .dr-date:focus { border-color:#FFD21E; }
  .dr-btn-apply   { height:36px; padding:0 16px; border-radius:9px; background:#FFD21E; color:#171717; font-weight:800; font-size:13px; border:none; cursor:pointer; }
  .dr-btn-refresh { width:36px; height:36px; border-radius:9px; border:1.5px solid var(--dr-border); background:var(--dr-card); color:var(--dr-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .dr-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; background:rgba(239,68,68,0.1); color:#EF4444; font-size:13px; margin-bottom:14px; }
  .dr-alert button { margin-left:auto; background:none; border:none; cursor:pointer; color:#EF4444; }

  .dr-tabs { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:16px; border-bottom:2px solid var(--dr-border); padding-bottom:0; }
  .dr-tab  { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; font-size:12px; font-weight:700; border:none; background:transparent; cursor:pointer; color:var(--dr-muted); border-bottom:2px solid transparent; margin-bottom:-2px; border-radius:8px 8px 0 0; }
  .dr-tab.active { color:var(--dr-text); border-bottom-color:#FFD21E; background:rgba(255,210,30,0.08); }
  .dr-tab:hover:not(.active) { background:rgba(255,210,30,0.05); }

  .dr-panel { background:var(--dr-card); border-radius:14px; border:1.5px solid var(--dr-border); padding:20px; }
  .dr-loading { display:flex; align-items:center; gap:10px; justify-content:center; padding:40px; color:var(--dr-muted); font-size:14px; }
  .dr-section-title { font-size:12px; font-weight:800; color:var(--dr-muted); letter-spacing:.05em; text-transform:uppercase; margin-bottom:12px; }

  .dr-kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; margin-bottom:16px; }
  .dr-kpi-card { padding:14px 16px; border-radius:12px; border:1.5px solid var(--dr-border); background:rgba(255,210,30,0.04); }
  .dr-kpi-val  { font-size:22px; font-weight:900; line-height:1; }
  .dr-kpi-label{ font-size:11px; font-weight:700; color:var(--dr-muted); margin-top:4px; }

  .dr-filter-row { display:flex; gap:10px; align-items:center; margin-bottom:12px; flex-wrap:wrap; }
  .dr-select { height:34px; padding:0 10px; border-radius:9px; border:1.5px solid var(--dr-border); background:var(--dr-card); color:var(--dr-text); font-size:13px; outline:none; }
  .dr-count  { font-size:12px; font-weight:700; color:var(--dr-muted); margin-left:auto; }

  .dr-table-wrap { border-radius:12px; border:1.5px solid var(--dr-border); overflow:auto; }
  .dr-table { width:100%; border-collapse:collapse; font-size:13px; }
  .dr-table thead tr { background:rgba(255,210,30,0.06); }
  .dr-table th { padding:9px 12px; text-align:left; font-size:11px; font-weight:800; color:var(--dr-muted); white-space:nowrap; }
  .dr-table th.right, .dr-table td.right { text-align:right; }
  .dr-table td { padding:9px 12px; border-top:1px solid var(--dr-border); vertical-align:middle; }
  .dr-table tr:hover td { background:rgba(255,210,30,0.04); }
  .dr-code  { font-family:monospace; font-size:11.5px; font-weight:700; background:rgba(255,210,30,0.12); padding:2px 7px; border-radius:5px; }
  .dr-seq   { color:var(--dr-muted); font-size:11px; width:30px; }
  .dr-empty { text-align:center; padding:30px; color:var(--dr-muted); font-size:13px; }
  .dr-badge { font-size:11px; font-weight:700; text-transform:uppercase; background:rgba(37,99,235,0.1); color:#2563EB; padding:2px 8px; border-radius:6px; }
  @keyframes dr-spin { to { transform:rotate(360deg); } }
  .spin { animation:dr-spin .8s linear infinite; }
  @media(max-width:600px){ .dr-kpi-grid{grid-template-columns:repeat(2,1fr);} .dr-tabs{gap:2px;} .dr-tab{padding:6px 10px;font-size:11px;} }
`;
