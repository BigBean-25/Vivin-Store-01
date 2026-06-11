import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle, ArrowLeftRight, BarChart3, CheckCircle2,
  FileText, RefreshCw, Search, X,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const INR = (v) =>
  "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt     = (v) => Number(v || 0).toLocaleString("en-IN");
const fmtDate = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const safe = (v, fb = "—") => (v !== null && v !== undefined && v !== "" ? String(v) : fb);
const pct  = (v) => (v !== null && v !== undefined ? `${Number(v).toFixed(2)}%` : "—");

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  .gst-page { padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .gst-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
  .gst-title  { font-size:22px; font-weight:900; color:#171717; margin:0; }
  .gst-subtitle { font-size:12px; color:#8A7A52; margin:2px 0 0; }

  .gst-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:22px; }
  .gst-stat  { display:flex; align-items:center; gap:12px; padding:16px 14px; background:#fff; border:1.5px solid rgba(232,224,199,0.5); border-radius:14px; box-shadow:0 2px 10px rgba(0,0,0,0.04); }
  .gst-icon  { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .gst-val   { font-size:14px; font-weight:900; color:#171717; line-height:1.2; }
  .gst-label { font-size:10px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }

  .gst-tabs  { display:flex; gap:4px; margin-bottom:16px; border-bottom:2px solid rgba(232,224,199,0.5); flex-wrap:wrap; }
  .gst-tab   { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; font-size:13px; font-weight:700; border:none; background:transparent; cursor:pointer; color:#6B7280; border-bottom:2px solid transparent; margin-bottom:-2px; border-radius:8px 8px 0 0; }
  .gst-tab.active { color:#171717; border-bottom-color:#FFD21E; background:rgba(255,210,30,0.08); }
  .gst-tab:hover:not(.active) { background:rgba(255,210,30,0.05); color:#171717; }

  .gst-filters { display:flex; gap:10px; margin-bottom:14px; align-items:center; flex-wrap:wrap; }
  .gst-search-wrap { position:relative; }
  .gst-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#8A7A52; pointer-events:none; }
  .gst-search { height:36px; padding:0 12px 0 34px; border:1.5px solid rgba(232,224,199,0.7); border-radius:10px; font-size:13px; background:rgba(255,250,240,0.6); width:260px; box-sizing:border-box; }
  .gst-search:focus { outline:none; border-color:#FFD21E; }
  .gst-date { height:36px; padding:0 10px; border:1.5px solid rgba(232,224,199,0.7); border-radius:10px; font-size:12px; background:rgba(255,250,240,0.6); }
  .gst-date:focus { outline:none; border-color:#FFD21E; }

  .gst-panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
  .gst-count { font-size:13px; color:#8A7A52; font-weight:700; }

  .gst-table-wrap { overflow-x:auto; border:1.5px solid rgba(232,224,199,0.5); border-radius:12px; }
  .gst-table { width:100%; border-collapse:collapse; font-size:13px; }
  .gst-table th { padding:10px 12px; background:rgba(255,249,230,0.9); font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#6B7280; text-align:left; white-space:nowrap; }
  .gst-table td { padding:10px 12px; border-top:1px solid rgba(232,224,199,0.4); vertical-align:middle; }
  .gst-table tr:hover td { background:rgba(255,249,230,0.4); }
  .gst-empty { text-align:center !important; padding:40px 20px !important; color:#8A7A52; font-size:13px; }
  .gst-code  { font-family:monospace; font-size:12px; font-weight:700; background:rgba(255,210,30,0.12); padding:2px 8px; border-radius:6px; white-space:nowrap; }
  .gst-amt   { font-family:monospace; font-weight:700; text-align:right; font-size:13px; }
  .gst-cgst  { color:#2563EB; }
  .gst-sgst  { color:#7C3AED; }
  .gst-igst  { color:#EA580C; }

  .gst-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; font-size:13px; color:#EF4444; margin-bottom:14px; }
  .gst-loading { display:flex; align-items:center; gap:10px; padding:40px; justify-content:center; color:#8A7A52; }

  .gst-iocard { flex:1; min-width:220px; padding:20px 22px; border-radius:14px; border:1.5px solid; }
  .gst-io-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(232,224,199,0.3); font-size:13px; }
  .gst-io-row:last-child { border-bottom:none; }
  .gst-io-lbl { color:#6B7280; font-weight:600; }
  .gst-net-card { padding:20px 24px; border-radius:14px; margin-top:14px; }

  .gst-rates-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
  .gst-rate-card  { padding:14px 16px; background:#fff; border:1.5px solid rgba(232,224,199,0.5); border-radius:12px; }
  .gst-rate-hsn   { font-family:monospace; font-size:12px; font-weight:800; color:#171717; margin-bottom:6px; }
  .gst-rate-desc  { font-size:11px; color:#6B7280; margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .gst-rate-rates { display:flex; gap:6px; flex-wrap:wrap; }
  .gst-rate-pill  { font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; }
  .gst-badge-active   { background:rgba(22,163,74,0.12);  color:#16A34A; }
  .gst-badge-inactive { background:rgba(107,114,128,0.12); color:#6B7280; }

  .gst-period-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .gst-status-draft     { background:rgba(107,114,128,0.12); color:#6B7280; }
  .gst-status-generated { background:rgba(37,99,235,0.12);  color:#2563EB; }
  .gst-status-filed     { background:rgba(22,163,74,0.12);   color:#16A34A; }

  .gst-dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .gst-dash-section { background:#fff; border:1.5px solid rgba(232,224,199,0.5); border-radius:14px; padding:16px 20px; }
  .gst-section-title { font-size:11px; font-weight:800; color:#6B7280; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px; }

  @keyframes gst-spin { to{transform:rotate(360deg);} }
  .spin { animation:gst-spin .8s linear infinite; }
  @media(max-width:1200px){ .gst-stats{ grid-template-columns:repeat(3,1fr); } .gst-rates-grid{ grid-template-columns:repeat(2,1fr); } }
  @media(max-width:768px)  { .gst-stats{ grid-template-columns:repeat(2,1fr); } .gst-rates-grid{ grid-template-columns:1fr; } .gst-dash-grid{ grid-template-columns:1fr; } }
`;

const TABS = [
  { key:"summary",      label:"Summary"         },
  { key:"gst-reports",  label:"GST Reports"      },
  { key:"sales",        label:"Sales GST"       },
  { key:"purchases",    label:"Purchase GST"    },
  { key:"input-output", label:"Input vs Output" },
  { key:"rates",        label:"GST Rates"       },
  { key:"gstr1",        label:"GSTR-1"          },
  { key:"gstr3b",       label:"GSTR-3B"         },
  { key:"tax-txns",     label:"Tax Transactions"},
];

export default function GSTReports() {
  const [activeTab, setActiveTab] = useState("summary");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");

  const [summaryData, setSummaryData] = useState({});
  const [sales,       setSales]       = useState([]);
  const [purchases,   setPurchases]   = useState([]);
  const [inputOutput, setInputOutput] = useState(null);
  const [rates,       setRates]       = useState([]);
  const [gstr1,       setGstr1]       = useState([]);
  const [gstr3b,      setGstr3b]      = useState([]);
  const [taxTxns,     setTaxTxns]     = useState([]);

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetch = useCallback(async (tab, fd, td) => {
    setLoading(true); setError("");
    const dateQ = fd && td ? `?from_date=${fd}&to_date=${td}` : "";
    try {
      if (tab === "summary") {
        const r = await API.get("/api/gst/summary");
        if (r.data.success) setSummaryData(r.data.summary || {});
      } else if (tab === "gst-reports") {
        const r = await API.get(`/api/gst/sales${dateQ}`);
        if (r.data.success) setSummaryData((prev) => ({ ...prev, monthly: r.data.sales || [] }));
      } else if (tab === "sales") {
        const r = await API.get(`/api/gst/sales${dateQ}`);
        if (r.data.success) setSales(r.data.sales || []);
      } else if (tab === "purchases") {
        const r = await API.get(`/api/gst/purchases${dateQ}`);
        if (r.data.success) setPurchases(r.data.purchases || []);
      } else if (tab === "input-output") {
        const r = await API.get(`/api/gst/input-output${dateQ}`);
        if (r.data.success) setInputOutput(r.data);
      } else if (tab === "rates") {
        const r = await API.get("/api/gst/rates");
        if (r.data.success) setRates(r.data.rates || []);
      } else if (tab === "gstr1") {
        const r = await API.get("/api/gst/gstr1");
        if (r.data.success) setGstr1(r.data.reports || []);
      } else if (tab === "gstr3b") {
        const r = await API.get("/api/gst/gstr3b");
        if (r.data.success) setGstr3b(r.data.reports || []);
      } else if (tab === "tax-txns") {
        const r = await API.get(`/api/gst/tax-transactions${dateQ}`);
        if (r.data.success) setTaxTxns(r.data.transactions || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch("summary"); }, [fetch]);

  const switchTab = (tab) => {
    setActiveTab(tab); setSearch(""); setError("");
    fetch(tab, fromDate, toDate);
  };

  const applyDateFilter = () => fetch(activeTab, fromDate, toDate);

  // ── Summary Derived ──────────────────────────────────────────────────────────
  const sl  = summaryData.sales         || {};
  const pur = summaryData.purchases      || {};
  const gb  = summaryData.gst_breakdown  || {};
  const itc = summaryData.itc            || {};

  const netGST = Math.max(0, Number(sl.total_tax || 0) - Number(pur.total_tax || 0));

  const CARDS = [
    { label:"Sales Taxable",      value:INR(sl.total_taxable),    color:"#2563EB" },
    { label:"Output GST (Sales)", value:INR(sl.total_tax),        color:"#16A34A" },
    { label:"Input GST (Purch)",  value:INR(pur.total_tax),       color:"#EA580C" },
    { label:"Net GST Payable",    value:INR(netGST),              color:"#DC2626" },
    { label:"ITC Eligible",       value:INR(itc.eligible),        color:"#7C3AED" },
  ];

  // ── Filtered lists ───────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const fSales = sales.filter((r) =>
    !q || [r.gst_invoice_number, r.invoice_number, r.customer_name, r.gstin].some((v) => v?.toLowerCase().includes(q))
  );
  const fPurch = purchases.filter((r) =>
    !q || [r.gst_invoice_number, r.invoice_number, r.vendor_name, r.gstin].some((v) => v?.toLowerCase().includes(q))
  );
  const fTxns = taxTxns.filter((r) =>
    !q || [r.reference_type, String(r.reference_id)].some((v) => v?.toLowerCase().includes(q))
  );
  const fRates = rates.filter((r) =>
    !q || [r.hsn_code, r.description].some((v) => v?.toLowerCase().includes(q))
  );

  const GSTAmtCols = ({ row }) => (
    <>
      <td className="gst-amt gst-cgst">{INR(row.cgst_amount)}</td>
      <td className="gst-amt gst-sgst">{INR(row.sgst_amount)}</td>
      <td className="gst-amt gst-igst">{INR(row.igst_amount)}</td>
      <td className="gst-amt" style={{ color:"#6B7280" }}>{INR(row.cess_amount)}</td>
      <td className="gst-amt" style={{ fontWeight:900 }}>
        {INR((Number(row.cgst_amount) + Number(row.sgst_amount) + Number(row.igst_amount) + Number(row.cess_amount)))}
      </td>
    </>
  );

  const statusBadge = (s) => (
    <span className={`gst-period-badge gst-status-${s || "draft"}`}>{s || "draft"}</span>
  );

  return (
    <AdminLayout>
      <style>{css}</style>
      <div className="gst-page">

        {/* Header */}
        <div className="gst-header">
          <div>
            <h1 className="gst-title">GST Reports</h1>
            <p className="gst-subtitle">GSTR-1 · GSTR-3B · Input Tax Credit · Tax Transactions</p>
          </div>
          <button
            style={{ display:"inline-flex", alignItems:"center", gap:6, height:38, padding:"0 18px", borderRadius:10, background:"#FFD21E", border:"none", cursor:"pointer", fontSize:13, fontWeight:800 }}
            onClick={() => fetch(activeTab, fromDate, toDate)}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="gst-stats">
          {CARDS.map((c) => (
            <div className="gst-stat" key={c.label}>
              <div className="gst-icon" style={{ background:`${c.color}18`, color:c.color }}>
                <BarChart3 size={18} />
              </div>
              <div>
                <div className="gst-val">{c.value}</div>
                <div className="gst-label">{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="gst-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`gst-tab${activeTab === t.key ? " active" : ""}`} onClick={() => switchTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Date filter (for tabs that need it) */}
        {["gst-reports","sales","purchases","input-output","tax-txns"].includes(activeTab) && (
          <div className="gst-filters">
            <div className="gst-search-wrap">
              <Search size={14} className="gst-search-icon" />
              <input className="gst-search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <input type="date" className="gst-date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span style={{ fontSize:12, color:"#8A7A52" }}>to</span>
            <input type="date" className="gst-date" value={toDate}   onChange={(e) => setToDate(e.target.value)} />
            <button
              style={{ height:36, padding:"0 16px", borderRadius:10, background:"#FFD21E", border:"none", cursor:"pointer", fontSize:13, fontWeight:800, display:"inline-flex", alignItems:"center", gap:6 }}
              onClick={applyDateFilter}
            >
              <RefreshCw size={13} /> Apply
            </button>
          </div>
        )}

        {["rates"].includes(activeTab) && (
          <div className="gst-filters">
            <div className="gst-search-wrap">
              <Search size={14} className="gst-search-icon" />
              <input className="gst-search" placeholder="Search HSN or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="gst-alert">
            <AlertCircle size={14} />{error}
            <button onClick={() => setError("")} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#EF4444", display:"flex" }}><X size={13} /></button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="gst-loading"><RefreshCw size={20} className="spin" /> Loading…</div>
        )}

        {/* ── SUMMARY ── */}
        {activeTab === "summary" && !loading && (
          <div className="gst-dash-grid">
            <div className="gst-dash-section">
              <div className="gst-section-title">Sales Invoices</div>
              {[
                ["Total Invoices",  fmt(sl.total_invoices),  "#171717"],
                ["Taxable Value",   INR(sl.total_taxable),   "#2563EB"],
                ["Tax Amount",      INR(sl.total_tax),       "#DC2626"],
                ["Total Billed",    INR(sl.total_billed),    "#16A34A"],
              ].map(([lbl, val, clr]) => (
                <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(232,224,199,0.3)", fontSize:13 }}>
                  <span style={{ color:"#6B7280" }}>{lbl}</span>
                  <span style={{ fontWeight:800, fontFamily:"monospace", color:clr }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="gst-dash-section">
              <div className="gst-section-title">Purchase Invoices</div>
              {[
                ["Total Invoices",  fmt(pur.total_invoices), "#171717"],
                ["Taxable Value",   INR(pur.total_taxable),  "#2563EB"],
                ["Tax Amount",      INR(pur.total_tax),      "#EA580C"],
                ["Total Billed",    INR(pur.total_billed),   "#7C3AED"],
              ].map(([lbl, val, clr]) => (
                <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(232,224,199,0.3)", fontSize:13 }}>
                  <span style={{ color:"#6B7280" }}>{lbl}</span>
                  <span style={{ fontWeight:800, fontFamily:"monospace", color:clr }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="gst-dash-section">
              <div className="gst-section-title">GST Breakdown (from linked GST invoices)</div>
              {[
                ["Linked GST Records", fmt(gb.linked_invoices), "#171717"],
                ["CGST",  INR(gb.total_cgst), "#7C3AED"],
                ["SGST",  INR(gb.total_sgst), "#0891B2"],
                ["IGST",  INR(gb.total_igst), "#EA580C"],
                ["CESS",  INR(gb.total_cess), "#6B7280"],
                ["Total (CGST+SGST+IGST+CESS)", INR(gb.total_tax), "#DC2626"],
              ].map(([lbl, val, clr]) => (
                <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(232,224,199,0.3)", fontSize:13 }}>
                  <span style={{ color:"#6B7280" }}>{lbl}</span>
                  <span style={{ fontWeight:800, fontFamily:"monospace", color:clr }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="gst-dash-section">
              <div className="gst-section-title">ITC &amp; Net GST Payable</div>
              {[
                ["ITC Claims",       fmt(itc.total_claims || 0),  "#171717"],
                ["ITC Eligible",     INR(itc.eligible    || 0),   "#16A34A"],
                ["ITC Claimed",      INR(itc.claimed     || 0),   "#2563EB"],
              ].map(([lbl, val, clr]) => (
                <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(232,224,199,0.3)", fontSize:13 }}>
                  <span style={{ color:"#6B7280" }}>{lbl}</span>
                  <span style={{ fontWeight:800, fontFamily:"monospace", color:clr }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop:12, padding:"12px 14px", background:"rgba(220,38,38,0.06)", borderRadius:10, border:"1.5px solid rgba(220,38,38,0.18)" }}>
                <div style={{ fontSize:11, color:"#DC2626", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>Net GST Payable</div>
                <div style={{ fontSize:11, color:"#6B7280", marginBottom:4 }}>Output GST (Sales) &minus; Input GST (Purchases)</div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#6B7280" }}>{INR(sl.total_tax || 0)} &minus; {INR(pur.total_tax || 0)}</span>
                  <span style={{ fontWeight:900, fontFamily:"monospace", color:"#DC2626", fontSize:15 }}>{INR(netGST)}</span>
                </div>
              </div>
              <div style={{ marginTop:10 }}>
                {[["Sales GST","sales"],["Purchase GST","purchases"],["Input vs Output","input-output"],["GSTR-1","gstr1"],["GSTR-3B","gstr3b"]].map(([lbl, key]) => (
                  <button key={key} onClick={() => switchTab(key)}
                    style={{ display:"flex", width:"100%", alignItems:"center", justifyContent:"space-between", padding:"8px 0", background:"transparent", border:"none", borderBottom:"1px solid rgba(232,224,199,0.3)", cursor:"pointer", fontSize:13, color:"#171717", fontWeight:600 }}>
                    <span>{lbl}</span><span style={{ color:"#C9B96E" }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GST REPORTS (monthly breakdown) ── */}
        {activeTab === "gst-reports" && !loading && (
          <div>
            <div className="gst-panel-head">
              <span className="gst-count">{(summaryData.monthly || []).length} months</span>
              <span style={{ fontSize:12, color:"#8A7A52" }}>Monthly Sales &amp; Purchase GST</span>
            </div>
            <div className="gst-table-wrap">
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Sales #</th><th>Sales Taxable</th><th>Sales Tax</th>
                    <th style={{color:"#7C3AED"}}>S-CGST</th><th style={{color:"#0891B2"}}>S-SGST</th><th style={{color:"#EA580C"}}>S-IGST</th>
                    <th>Purch #</th><th>Purch Taxable</th><th>Purch Tax</th>
                    <th style={{color:"#7C3AED"}}>P-CGST</th><th style={{color:"#0891B2"}}>P-SGST</th>
                  </tr>
                </thead>
                <tbody>
                  {(summaryData.monthly || []).map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>{MONTH_NAMES[(r.month||1)-1]} {r.year}</td>
                      <td style={{ textAlign:"center" }}>{fmt(r.sales_count)}</td>
                      <td className="gst-amt">{INR(r.sales_taxable)}</td>
                      <td className="gst-amt" style={{ color:"#DC2626" }}>{INR(r.sales_tax)}</td>
                      <td className="gst-amt gst-cgst">{INR(r.sales_cgst)}</td>
                      <td className="gst-amt gst-sgst">{INR(r.sales_sgst)}</td>
                      <td className="gst-amt gst-igst">{INR(r.sales_igst)}</td>
                      <td style={{ textAlign:"center" }}>{fmt(r.purchase_count)}</td>
                      <td className="gst-amt">{INR(r.purchase_taxable)}</td>
                      <td className="gst-amt" style={{ color:"#EA580C" }}>{INR(r.purchase_tax)}</td>
                      <td className="gst-amt gst-cgst">{INR(r.purchase_cgst)}</td>
                      <td className="gst-amt gst-sgst">{INR(r.purchase_sgst)}</td>
                    </tr>
                  ))}
                  {!(summaryData.monthly || []).length && <tr><td colSpan={12} className="gst-empty"><FileText size={24}/><br/>No GST report data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SALES GST ── */}
        {activeTab === "sales" && !loading && (
          <div>
            <div className="gst-panel-head">
              <span className="gst-count">{fSales.length} sales GST records</span>
              <span style={{ fontSize:12, color:"#8A7A52" }}>Output Tax Liability</span>
            </div>
            <div className="gst-table-wrap">
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>#</th><th>GST Inv No</th><th>Invoice No</th><th>Date</th>
                    <th>Customer</th><th>GSTIN</th><th>Place of Supply</th>
                    <th>Taxable</th><th style={{color:"#7C3AED"}}>CGST</th><th style={{color:"#0891B2"}}>SGST</th>
                    <th style={{color:"#EA580C"}}>IGST</th><th>CESS</th><th>Total Tax</th><th>RC</th>
                  </tr>
                </thead>
                <tbody>
                  {fSales.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{r.id}</td>
                      <td><span className="gst-code">{safe(r.gst_invoice_number)}</span></td>
                      <td style={{ fontSize:12 }}>{safe(r.invoice_number)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(r.invoice_date)}</td>
                      <td style={{ fontWeight:600 }}>{safe(r.customer_name)}</td>
                      <td style={{ fontFamily:"monospace", fontSize:11 }}>{safe(r.gstin)}</td>
                      <td style={{ fontSize:12 }}>{safe(r.place_of_supply)}</td>
                      <td className="gst-amt">{INR(r.taxable_value)}</td>
                      <GSTAmtCols row={r} />
                      <td style={{ fontSize:11, color:r.reverse_charge?"#EF4444":"#6B7280" }}>{r.reverse_charge ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                  {fSales.length === 0 && <tr><td colSpan={14} className="gst-empty"><FileText size={24} /><br />No sales GST records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PURCHASE GST ── */}
        {activeTab === "purchases" && !loading && (
          <div>
            <div className="gst-panel-head">
              <span className="gst-count">{fPurch.length} purchase GST records</span>
              <span style={{ fontSize:12, color:"#8A7A52" }}>Input Tax Credit (ITC)</span>
            </div>
            <div className="gst-table-wrap">
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>#</th><th>GST Inv No</th><th>Invoice No</th><th>Date</th>
                    <th>Vendor</th><th>GSTIN</th>
                    <th>Taxable</th><th style={{color:"#7C3AED"}}>CGST</th><th style={{color:"#0891B2"}}>SGST</th>
                    <th style={{color:"#EA580C"}}>IGST</th><th>CESS</th><th>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {fPurch.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{r.id}</td>
                      <td><span className="gst-code">{safe(r.gst_invoice_number)}</span></td>
                      <td style={{ fontSize:12 }}>{safe(r.invoice_number)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(r.invoice_date)}</td>
                      <td style={{ fontWeight:600, color:"#7C3AED" }}>{safe(r.vendor_name)}</td>
                      <td style={{ fontFamily:"monospace", fontSize:11 }}>{safe(r.gstin)}</td>
                      <td className="gst-amt">{INR(r.taxable_value)}</td>
                      <GSTAmtCols row={r} />
                    </tr>
                  ))}
                  {fPurch.length === 0 && <tr><td colSpan={12} className="gst-empty"><FileText size={24} /><br />No purchase GST records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── INPUT vs OUTPUT ── */}
        {activeTab === "input-output" && !loading && inputOutput && (
          <div>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:14 }}>
              <div className="gst-iocard" style={{ background:"rgba(22,163,74,0.04)", borderColor:"rgba(22,163,74,0.2)" }}>
                <div style={{ fontSize:12, fontWeight:800, color:"#16A34A", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Output Tax (Sales)</div>
                {[["Taxable Value", inputOutput.output_tax?.taxable_value, "#2563EB"],["CGST", inputOutput.output_tax?.cgst, "#7C3AED"],["SGST", inputOutput.output_tax?.sgst, "#0891B2"],["IGST", inputOutput.output_tax?.igst, "#EA580C"],["CESS", inputOutput.output_tax?.cess, "#6B7280"],["Total Tax", inputOutput.output_tax?.total_tax, "#DC2626"]].map(([l,v,c]) => (
                  <div className="gst-io-row" key={l}><span className="gst-io-lbl">{l}</span><span style={{ fontFamily:"monospace", fontWeight:800, color:c }}>{INR(v)}</span></div>
                ))}
              </div>

              <div className="gst-iocard" style={{ background:"rgba(37,99,235,0.04)", borderColor:"rgba(37,99,235,0.2)" }}>
                <div style={{ fontSize:12, fontWeight:800, color:"#2563EB", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Input Tax Credit (Purchases)</div>
                {[["Taxable Value", inputOutput.input_tax?.taxable_value, "#2563EB"],["CGST", inputOutput.input_tax?.cgst, "#7C3AED"],["SGST", inputOutput.input_tax?.sgst, "#0891B2"],["IGST", inputOutput.input_tax?.igst, "#EA580C"],["CESS", inputOutput.input_tax?.cess, "#6B7280"],["Total ITC", inputOutput.input_tax?.total_tax, "#16A34A"]].map(([l,v,c]) => (
                  <div className="gst-io-row" key={l}><span className="gst-io-lbl">{l}</span><span style={{ fontFamily:"monospace", fontWeight:800, color:c }}>{INR(v)}</span></div>
                ))}
              </div>
            </div>

            <div className="gst-net-card" style={{ background:"rgba(220,38,38,0.05)", border:"2px solid rgba(220,38,38,0.2)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <ArrowLeftRight size={16} style={{ color:"#DC2626" }} />
                <span style={{ fontSize:12, fontWeight:800, color:"#DC2626", textTransform:"uppercase", letterSpacing:"0.05em" }}>Net GST Payable (Output − Input)</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                {[["CGST Payable", inputOutput.net_payable?.cgst, "#7C3AED"],["SGST Payable", inputOutput.net_payable?.sgst, "#0891B2"],["IGST Payable", inputOutput.net_payable?.igst, "#EA580C"],["Total Payable", inputOutput.net_payable?.total, "#DC2626"]].map(([l,v,c]) => (
                  <div key={l} style={{ padding:"12px 14px", background:`${c}0A`, borderRadius:10, border:`1.5px solid ${c}22` }}>
                    <div style={{ fontSize:17, fontWeight:900, color:c, fontFamily:"monospace" }}>{INR(v)}</div>
                    <div style={{ fontSize:10, color:"#6B7280", marginTop:3, fontWeight:700, textTransform:"uppercase" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "input-output" && !loading && !inputOutput && (
          <div style={{ padding:"40px 0", textAlign:"center", color:"#8A7A52", fontSize:13 }}>No data available</div>
        )}

        {/* ── GST RATES ── */}
        {activeTab === "rates" && !loading && (
          <div>
            <div className="gst-panel-head">
              <span className="gst-count">{fRates.length} HSN codes</span>
            </div>
            {fRates.length === 0 && (
              <div style={{ padding:"40px 0", textAlign:"center", color:"#8A7A52", fontSize:13 }}>
                <FileText size={28} style={{ display:"block", margin:"0 auto 10px", opacity:0.4 }} />
                No GST rates configured
              </div>
            )}
            <div className="gst-rates-grid">
              {fRates.map((r) => (
                <div className="gst-rate-card" key={r.id}>
                  <div className="gst-rate-hsn">HSN: {safe(r.hsn_code)}</div>
                  <div className="gst-rate-desc" title={r.description}>{safe(r.description)}</div>
                  <div className="gst-rate-rates">
                    <span className="gst-rate-pill" style={{ background:"rgba(124,58,237,0.1)", color:"#7C3AED" }}>CGST {pct(r.cgst_rate)}</span>
                    <span className="gst-rate-pill" style={{ background:"rgba(8,145,178,0.1)",  color:"#0891B2" }}>SGST {pct(r.sgst_rate)}</span>
                    <span className="gst-rate-pill" style={{ background:"rgba(234,88,12,0.1)",  color:"#EA580C" }}>IGST {pct(r.igst_rate)}</span>
                    {Number(r.cess_rate) > 0 && (
                      <span className="gst-rate-pill" style={{ background:"rgba(107,114,128,0.1)", color:"#6B7280" }}>CESS {pct(r.cess_rate)}</span>
                    )}
                  </div>
                  <div style={{ marginTop:8 }}>
                    <span className={`gst-rate-pill ${r.status === "active" ? "gst-badge-active" : "gst-badge-inactive"}`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GSTR-1 ── */}
        {activeTab === "gstr1" && !loading && (
          <div>
            <div className="gst-panel-head">
              <span className="gst-count">{gstr1.length} GSTR-1 reports</span>
            </div>
            <div className="gst-table-wrap">
              <table className="gst-table">
                <thead><tr><th>#</th><th>Period</th><th>Status</th><th>Generated On</th></tr></thead>
                <tbody>
                  {gstr1.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{r.id}</td>
                      <td style={{ fontWeight:700 }}>{MONTH_NAMES[(r.period_month || 1) - 1]} {r.period_year}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                  {gstr1.length === 0 && <tr><td colSpan={4} className="gst-empty"><FileText size={24}/><br/>No GSTR-1 reports</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GSTR-3B ── */}
        {activeTab === "gstr3b" && !loading && (
          <div>
            <div className="gst-panel-head">
              <span className="gst-count">{gstr3b.length} GSTR-3B reports</span>
            </div>
            <div className="gst-table-wrap">
              <table className="gst-table">
                <thead><tr><th>#</th><th>Period</th><th>Tax Payable</th><th>Status</th><th>Generated On</th></tr></thead>
                <tbody>
                  {gstr3b.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{r.id}</td>
                      <td style={{ fontWeight:700 }}>{MONTH_NAMES[(r.period_month || 1) - 1]} {r.period_year}</td>
                      <td className="gst-amt" style={{ color:"#DC2626" }}>{INR(r.tax_payable)}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                  {gstr3b.length === 0 && <tr><td colSpan={5} className="gst-empty"><FileText size={24}/><br/>No GSTR-3B reports</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAX TRANSACTIONS ── */}
        {activeTab === "tax-txns" && !loading && (
          <div>
            <div className="gst-panel-head">
              <span className="gst-count">{fTxns.length} tax transactions</span>
            </div>
            <div className="gst-table-wrap">
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Date</th><th>Ref Type</th><th>Ref ID</th>
                    <th>Taxable</th><th style={{color:"#7C3AED"}}>CGST</th><th style={{color:"#0891B2"}}>SGST</th>
                    <th style={{color:"#EA580C"}}>IGST</th><th>CESS</th>
                  </tr>
                </thead>
                <tbody>
                  {fTxns.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{r.id}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(r.transaction_date)}</td>
                      <td style={{ fontSize:12 }}>{safe(r.reference_type)}</td>
                      <td style={{ fontSize:12 }}>{safe(r.reference_id)}</td>
                      <td className="gst-amt">{INR(r.taxable_value)}</td>
                      <td className="gst-amt gst-cgst">{INR(r.cgst_amount)}</td>
                      <td className="gst-amt gst-sgst">{INR(r.sgst_amount)}</td>
                      <td className="gst-amt gst-igst">{INR(r.igst_amount)}</td>
                      <td className="gst-amt" style={{ color:"#6B7280" }}>{INR(r.cess_amount)}</td>
                    </tr>
                  ))}
                  {fTxns.length === 0 && <tr><td colSpan={9} className="gst-empty"><CheckCircle2 size={24}/><br/>No tax transactions found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
