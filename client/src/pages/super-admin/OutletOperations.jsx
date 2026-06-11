import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, BarChart3, Bell, Building2, CheckCircle2, ChevronDown,
  ClipboardList, Edit3, Package, Plus, RefreshCw, Search, Store,
  Trash2, TrendingUp, Truck, X, XCircle,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";

const B = {
  black: "#111318", yellow: "#F8C400", yellowDark: "#DFAE00",
  cream: "#FFF7DB", white: "#FFFFFF", border: "#DBDADE",
  muted: "#6E6B7B", bg: "#F8F8FA",
};

const STATUS_COLORS = {
  draft:      { bg:"#F3F4F6", color:"#374151" },
  submitted:  { bg:"#FEF9C3", color:"#854D0E" },
  approved:   { bg:"#DCFCE7", color:"#166534" },
  dispatched: { bg:"#DBEAFE", color:"#1E40AF" },
  received:   { bg:"#D1FAE5", color:"#065F46" },
  cancelled:  { bg:"#FEE2E2", color:"#991B1B" },
  active:     { bg:"#DCFCE7", color:"#166534" },
  inactive:   { bg:"#FEE2E2", color:"#991B1B" },
  low:        { bg:"#FEF9C3", color:"#854D0E" },
  critical:   { bg:"#FEE2E2", color:"#991B1B" },
  out_of_stock:{ bg:"#111318", color:"#fff" },
};

const Badge = ({ val }) => {
  const s = STATUS_COLORS[val] || { bg:"#F3F4F6", color:"#374151" };
  return (
    <span style={{ background:s.bg, color:s.color, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700, textTransform:"capitalize", whiteSpace:"nowrap" }}>
      {String(val).replace(/_/g," ")}
    </span>
  );
};

const SummaryCard = ({ icon:Icon, label, value, color="#F8C400" }) => (
  <div style={{ background:B.white, border:`1.5px solid ${B.border}`, borderRadius:14, padding:"18px 22px", display:"flex", alignItems:"center", gap:16, flex:1, minWidth:160 }}>
    <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize:22, fontWeight:900, color:B.black }}>{value ?? 0}</div>
      <div style={{ fontSize:12, color:B.muted, fontWeight:600 }}>{label}</div>
    </div>
  </div>
);

const TABS = [
  { key:"outlets",   label:"Outlets",         icon:Store },
  { key:"stock",     label:"Stock Balance",    icon:Package },
  { key:"requests",  label:"Stock Requests",   icon:ClipboardList },
  { key:"transfers", label:"Stock Transfer",   icon:Truck },
  { key:"approvals", label:"Approvals",        icon:CheckCircle2 },
  { key:"reports",   label:"Reports",          icon:BarChart3 },
  { key:"alerts",    label:"Low Stock Alerts", icon:Bell },
];

const emptyOutlet = { outlet_code:"", name:"", phone:"", email:"", address:"", city:"", state:"", pincode:"", manager_id:"", status:"active" };
const emptyRequest = { outlet_id:"", warehouse_id:"", request_date:"", required_date:"", items:[{ product_id:"", requested_qty:"" }] };

export default function OutletOperations() {
  const [tab, setTab] = useState("outlets");
  const [summary, setSummary]         = useState({});
  const [outlets, setOutlets]         = useState([]);
  const [warehouses, setWarehouses]   = useState([]);
  const [products, setProducts]       = useState([]);
  const [stock, setStock]             = useState([]);
  const [requests, setRequests]       = useState([]);
  const [transfers, setTransfers]     = useState([]);
  const [approvals, setApprovals]     = useState([]);
  const [alerts, setAlerts]           = useState([]);
  const [reportData, setReportData]   = useState([]);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const [search, setSearch]         = useState("");
  const [filterOutlet, setFilterOutlet] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showOutletModal, setShowOutletModal]   = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailModal, setShowDetailModal]   = useState(false);
  const [editOutlet, setEditOutlet]   = useState(null);
  const [outletForm, setOutletForm]   = useState(emptyOutlet);
  const [requestForm, setRequestForm] = useState(emptyRequest);
  const [detailRequest, setDetailRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState("");

  const notify = (msg, isErr=false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const loadBase = useCallback(async () => {
    try {
      const [ow, pw] = await Promise.all([
        API.get("/api/outlet-operations/outlets"),
        API.get("/api/warehouses"),
      ]);
      setOutlets(Array.isArray(ow.data?.data) ? ow.data.data : []);
      setWarehouses(Array.isArray(pw.data?.data) ? pw.data.data : []);
    } catch {}
    try {
      const pr = await API.get("/api/products");
      setProducts(Array.isArray(pr.data?.data) ? pr.data.data : []);
    } catch {}
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const [os, ss, rs, ts, as, als] = await Promise.allSettled([
        API.get("/api/outlet-operations/outlets/summary"),
        API.get("/api/outlet-operations/stock/summary"),
        API.get("/api/outlet-operations/requests/summary"),
        API.get("/api/outlet-operations/transfers/summary"),
        API.get("/api/outlet-operations/approvals/summary"),
        API.get("/api/outlet-operations/alerts/summary"),
      ]);
      const merge = (r) => r.status === "fulfilled" ? r.value.data?.data || {} : {};
      setSummary({ ...merge(os), ...merge(ss), ...merge(rs), ...merge(ts), ...merge(as), ...merge(als) });
    } catch {}
  }, []);

  const loadTab = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterOutlet) params.set("outlet_id", filterOutlet);
      if (filterStatus) params.set("status", filterStatus);
      const q = params.toString() ? `?${params}` : "";

      if (tab === "outlets") {
        const r = await API.get(`/api/outlet-operations/outlets${q}`);
        setOutlets(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "stock") {
        const r = await API.get(`/api/outlet-operations/stock${q}`);
        setStock(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "requests") {
        const r = await API.get(`/api/outlet-operations/requests${q}`);
        setRequests(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "transfers") {
        const r = await API.get("/api/outlet-operations/transfers");
        setTransfers(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "approvals") {
        const r = await API.get("/api/outlet-operations/approvals");
        setApprovals(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "reports") {
        const r = await API.get("/api/outlet-operations/reports/outlet-stock");
        setReportData(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "alerts") {
        const r = await API.get(`/api/outlet-operations/alerts/low-stock${filterOutlet ? `?outlet_id=${filterOutlet}` : ""}`);
        setAlerts(Array.isArray(r.data?.data) ? r.data.data : []);
      }
    } catch(e) { setError(e?.response?.data?.message || "Failed to load data"); }
    finally { setLoading(false); }
  }, [tab, search, filterOutlet, filterStatus]);

  useEffect(() => { loadBase(); loadSummary(); }, [loadBase, loadSummary]);
  useEffect(() => { loadTab(); }, [loadTab]);

  // ── Outlet CRUD ──────────────────────────────────────────────────────────

  const openCreateOutlet = () => { setEditOutlet(null); setOutletForm(emptyOutlet); setShowOutletModal(true); };
  const openEditOutlet   = (o) => { setEditOutlet(o); setOutletForm({ outlet_code:o.outlet_code||"", name:o.name||"", phone:o.phone||"", email:o.email||"", address:o.address||"", city:o.city||"", state:o.state||"", pincode:o.pincode||"", manager_id:o.manager_id||"", status:o.status||"active" }); setShowOutletModal(true); };

  const saveOutlet = async () => {
    if (!outletForm.name.trim()) { notify("Outlet name is required", true); return; }
    setActionLoading("outlet-save");
    try {
      if (editOutlet) await API.put(`/api/outlet-operations/outlets/${editOutlet.id}`, outletForm);
      else await API.post("/api/outlet-operations/outlets", outletForm);
      notify(editOutlet ? "Outlet updated" : "Outlet created");
      setShowOutletModal(false);
      loadTab(); loadSummary(); loadBase();
    } catch(e) { notify(e?.response?.data?.message || "Save failed", true); }
    finally { setActionLoading(""); }
  };

  const deleteOutlet = async (id) => {
    if (!window.confirm("Delete this outlet?")) return;
    try { await API.delete(`/api/outlet-operations/outlets/${id}`); notify("Outlet deleted"); loadTab(); loadSummary(); loadBase(); }
    catch(e) { notify(e?.response?.data?.message || "Delete failed", true); }
  };

  const toggleOutletStatus = async (o) => {
    const ns = o.status === "active" ? "inactive" : "active";
    try { await API.patch(`/api/outlet-operations/outlets/${o.id}/status`, { status:ns }); notify(`Outlet marked ${ns}`); loadTab(); }
    catch(e) { notify(e?.response?.data?.message || "Status update failed", true); }
  };

  // ── Requests ─────────────────────────────────────────────────────────────

  const addItemRow = () => setRequestForm(f => ({ ...f, items:[...f.items, { product_id:"", requested_qty:"" }] }));
  const removeItemRow = (i) => setRequestForm(f => ({ ...f, items:f.items.filter((_,idx)=>idx!==i) }));
  const setItemField = (i, field, val) => setRequestForm(f => { const items=[...f.items]; items[i]={...items[i],[field]:val}; return {...f,items}; });

  const saveRequest = async () => {
    if (!requestForm.outlet_id) { notify("Outlet is required", true); return; }
    const validItems = requestForm.items.filter(it => it.product_id && Number(it.requested_qty) > 0);
    if (!validItems.length) { notify("Add at least one valid item", true); return; }
    setActionLoading("req-save");
    try {
      await API.post("/api/outlet-operations/requests", { ...requestForm, items:validItems });
      notify("Request created");
      setShowRequestModal(false);
      setRequestForm(emptyRequest);
      loadTab(); loadSummary();
    } catch(e) { notify(e?.response?.data?.message || "Create failed", true); }
    finally { setActionLoading(""); }
  };

  const submitRequest = async (id) => {
    setActionLoading(`submit-${id}`);
    try { await API.patch(`/api/outlet-operations/requests/${id}/status`, { status:"submitted" }); notify("Request submitted"); loadTab(); loadSummary(); }
    catch(e) { notify(e?.response?.data?.message || "Submit failed", true); }
    finally { setActionLoading(""); }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm("Delete this request?")) return;
    try { await API.delete(`/api/outlet-operations/requests/${id}`); notify("Request deleted"); loadTab(); loadSummary(); }
    catch(e) { notify(e?.response?.data?.message || "Delete failed", true); }
  };

  const openDetail = async (id) => {
    try {
      const r = await API.get(`/api/outlet-operations/requests/${id}`);
      setDetailRequest(r.data?.data || null);
      setShowDetailModal(true);
    } catch(e) { notify("Failed to load request details", true); }
  };

  // ── Approval actions ──────────────────────────────────────────────────────

  const approveReq = async (id) => {
    setActionLoading(`approve-${id}`);
    try { await API.patch(`/api/outlet-operations/requests/${id}/approve`); notify("Request approved"); loadTab(); loadSummary(); }
    catch(e) { notify(e?.response?.data?.message || "Approve failed", true); }
    finally { setActionLoading(""); }
  };

  const rejectReq = async (id) => {
    if (!window.confirm("Reject this request?")) return;
    setActionLoading(`reject-${id}`);
    try { await API.patch(`/api/outlet-operations/requests/${id}/reject`); notify("Request rejected"); loadTab(); loadSummary(); }
    catch(e) { notify(e?.response?.data?.message || "Reject failed", true); }
    finally { setActionLoading(""); }
  };

  // ── Transfer actions ──────────────────────────────────────────────────────

  const issueStock = async (id) => {
    if (!window.confirm("Issue stock to outlet? This will update warehouse inventory.")) return;
    setActionLoading(`issue-${id}`);
    try { await API.post(`/api/outlet-operations/requests/${id}/issue`); notify("Stock issued and dispatched"); loadTab(); loadSummary(); }
    catch(e) { notify(e?.response?.data?.message || "Issue failed", true); }
    finally { setActionLoading(""); }
  };

  const receiveStock = async (id) => {
    setActionLoading(`receive-${id}`);
    try { await API.post(`/api/outlet-operations/requests/${id}/receive`); notify("Stock received"); loadTab(); loadSummary(); }
    catch(e) { notify(e?.response?.data?.message || "Receive failed", true); }
    finally { setActionLoading(""); }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const tbl = { width:"100%", borderCollapse:"collapse", fontSize:13 };
  const th  = { padding:"10px 12px", background:B.black, color:B.yellow, fontWeight:700, textAlign:"left", whiteSpace:"nowrap" };
  const td  = { padding:"10px 12px", borderBottom:`1px solid ${B.border}`, verticalAlign:"middle", color:B.black };
  const btn = (color="#111318", textColor="#fff") => ({ padding:"6px 14px", borderRadius:7, background:color, color:textColor, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, display:"inline-flex", alignItems:"center", gap:5 });

  const EmptyState = ({ msg="No data found" }) => (
    <div style={{ padding:48, textAlign:"center", color:B.muted }}>
      <Package size={36} color={B.border} style={{ marginBottom:10 }} />
      <div style={{ fontSize:14 }}>{msg}</div>
    </div>
  );

  return (
    <AdminLayout>
      <div style={{ padding:"24px 28px", background:B.bg, minHeight:"100vh" }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:B.yellow, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Store size={22} color={B.black} />
            </div>
            <div>
              <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:B.black }}>Outlet Operations</h1>
              <p style={{ margin:0, fontSize:13, color:B.muted }}>Manage outlets, stock, requests and transfers</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error   && <div style={{ background:"#FEE2E2", color:"#991B1B", padding:"10px 16px", borderRadius:9, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}><span>{error}</span><button onClick={()=>setError("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#991B1B" }}><X size={14}/></button></div>}
        {success && <div style={{ background:"#DCFCE7", color:"#166534", padding:"10px 16px", borderRadius:9, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}><span>{success}</span><button onClick={()=>setSuccess("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#166534" }}><X size={14}/></button></div>}

        {/* Summary Cards */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:14, marginBottom:24 }}>
          <SummaryCard icon={Store}       label="Active Outlets"      value={summary.active_outlets}      color="#F8C400" />
          <SummaryCard icon={Package}     label="Products in Stock"   value={summary.products_in_stock}   color="#6366F1" />
          <SummaryCard icon={ClipboardList} label="Pending Requests"  value={summary.pending_approvals}   color="#F59E0B" />
          <SummaryCard icon={Truck}       label="Dispatched"          value={summary.dispatched}          color="#3B82F6" />
          <SummaryCard icon={AlertTriangle} label="Low Stock Alerts"  value={summary.low_stock_items}     color="#EF4444" />
          <SummaryCard icon={TrendingUp}  label="Total Stock Qty"     value={summary.total_stock_qty}     color="#10B981" />
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:20, borderBottom:`2px solid ${B.border}`, paddingBottom:0 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={()=>{ setTab(t.key); setSearch(""); setFilterOutlet(""); setFilterStatus(""); }}
                style={{ padding:"9px 16px", borderRadius:"8px 8px 0 0", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontWeight:700, fontSize:13, background:active?B.black:B.white, color:active?B.yellow:B.muted, borderBottom:active?"2px solid transparent":"none" }}>
                <Icon size={15}/>{t.label}
              </button>
            );
          })}
        </div>

        {/* Filters + Actions Bar */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:B.white, border:`1.5px solid ${B.border}`, borderRadius:8, padding:"7px 12px", flex:1, minWidth:200, maxWidth:340 }}>
            <Search size={14} color={B.muted}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ border:"none", outline:"none", fontSize:13, color:B.black, background:"transparent", width:"100%" }}/>
          </div>
          {["outlets","stock","requests","alerts"].includes(tab) && (
            <select value={filterOutlet} onChange={e=>setFilterOutlet(e.target.value)} style={{ padding:"8px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13, color:B.black, background:B.white }}>
              <option value="">All Outlets</option>
              {outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          {tab === "requests" && (
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ padding:"8px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13, color:B.black, background:B.white }}>
              <option value="">All Status</option>
              {["draft","submitted","approved","dispatched","received","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={loadTab} style={{ ...btn(B.white, B.black), border:`1.5px solid ${B.border}` }}><RefreshCw size={13}/>Refresh</button>
          {tab === "outlets"  && <button onClick={openCreateOutlet}   style={btn()}><Plus size={13}/>Add Outlet</button>}
          {tab === "requests" && <button onClick={()=>{setRequestForm(emptyRequest);setShowRequestModal(true);}} style={btn()}><Plus size={13}/>New Request</button>}
        </div>

        {/* Tab Content */}
        <div style={{ background:B.white, border:`1.5px solid ${B.border}`, borderRadius:14, overflow:"hidden" }}>
          {loading ? (
            <div style={{ padding:48, textAlign:"center", color:B.muted }}>Loading...</div>
          ) : (
            <>
              {/* OUTLETS TAB */}
              {tab === "outlets" && (
                outlets.length === 0 ? <EmptyState msg="No outlets found. Create your first outlet." /> :
                <div style={{ overflowX:"auto" }}>
                  <table style={tbl}>
                    <thead><tr>
                      <th style={th}>Code</th><th style={th}>Name</th><th style={th}>City</th>
                      <th style={th}>Phone</th><th style={th}>Manager</th><th style={th}>Status</th><th style={th}>Actions</th>
                    </tr></thead>
                    <tbody>
                      {outlets.map(o=>(
                        <tr key={o.id} style={{ background:B.white }}>
                          <td style={td}>{o.outlet_code||"-"}</td>
                          <td style={{ ...td, fontWeight:700 }}>{o.name}</td>
                          <td style={td}>{o.city||"-"}</td>
                          <td style={td}>{o.phone||"-"}</td>
                          <td style={td}>{o.manager_name||"-"}</td>
                          <td style={td}><Badge val={o.status}/></td>
                          <td style={td}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>openEditOutlet(o)} style={btn("#F3F4F6","#374151")}><Edit3 size={12}/>Edit</button>
                              <button onClick={()=>toggleOutletStatus(o)} style={btn(o.status==="active"?"#FEE2E2":"#DCFCE7",o.status==="active"?"#991B1B":"#166534")}>{o.status==="active"?"Deactivate":"Activate"}</button>
                              <button onClick={()=>deleteOutlet(o.id)} style={btn("#FEE2E2","#991B1B")}><Trash2 size={12}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* STOCK BALANCE TAB */}
              {tab === "stock" && (
                stock.length === 0 ? <EmptyState msg="No stock records. Issue stock via requests."/> :
                <div style={{ overflowX:"auto" }}>
                  <table style={tbl}>
                    <thead><tr>
                      <th style={th}>Outlet</th><th style={th}>Product</th><th style={th}>Code</th>
                      <th style={th}>Qty Available</th><th style={th}>Unit</th><th style={th}>Reorder Level</th><th style={th}>Status</th>
                    </tr></thead>
                    <tbody>
                      {stock.map((s,i)=>{
                        const isLow = Number(s.available_qty) <= Number(s.reorder_level||0) && Number(s.reorder_level||0) > 0;
                        return (
                          <tr key={i}>
                            <td style={td}>{s.outlet_name}</td>
                            <td style={{ ...td, fontWeight:700 }}>{s.product_name}</td>
                            <td style={td}>{s.product_code||"-"}</td>
                            <td style={{ ...td, color:isLow?"#991B1B":"inherit", fontWeight:isLow?700:400 }}>{s.available_qty}</td>
                            <td style={td}>{s.unit||"-"}</td>
                            <td style={td}>{s.reorder_level||"-"}</td>
                            <td style={td}>{isLow ? <Badge val="low"/> : <Badge val="active"/>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* REQUESTS TAB */}
              {tab === "requests" && (
                requests.length === 0 ? <EmptyState msg="No stock requests yet."/> :
                <div style={{ overflowX:"auto" }}>
                  <table style={tbl}>
                    <thead><tr>
                      <th style={th}>Request #</th><th style={th}>Outlet</th><th style={th}>Warehouse</th>
                      <th style={th}>Date</th><th style={th}>Status</th><th style={th}>Actions</th>
                    </tr></thead>
                    <tbody>
                      {requests.map(r=>(
                        <tr key={r.id}>
                          <td style={{ ...td, fontWeight:700 }}>{r.request_number}</td>
                          <td style={td}>{r.outlet_name}</td>
                          <td style={td}>{r.warehouse_name||"-"}</td>
                          <td style={td}>{r.request_date ? new Date(r.request_date).toLocaleDateString("en-IN") : "-"}</td>
                          <td style={td}><Badge val={r.status}/></td>
                          <td style={td}>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <button onClick={()=>openDetail(r.id)} style={btn("#F3F4F6","#374151")}>View</button>
                              {r.status==="draft" && <button onClick={()=>submitRequest(r.id)} disabled={actionLoading===`submit-${r.id}`} style={btn("#FEF9C3","#854D0E")}>Submit</button>}
                              {r.status==="approved" && <button onClick={()=>issueStock(r.id)} disabled={actionLoading===`issue-${r.id}`} style={btn("#DBEAFE","#1E40AF")}><Truck size={12}/>Issue</button>}
                              {r.status==="dispatched" && <button onClick={()=>receiveStock(r.id)} disabled={actionLoading===`receive-${r.id}`} style={btn("#DCFCE7","#166534")}><CheckCircle2 size={12}/>Receive</button>}
                              {["draft","cancelled"].includes(r.status) && <button onClick={()=>deleteRequest(r.id)} style={btn("#FEE2E2","#991B1B")}><Trash2 size={12}/></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TRANSFERS TAB */}
              {tab === "transfers" && (
                transfers.length === 0 ? <EmptyState msg="No dispatched or received transfers yet."/> :
                <div style={{ overflowX:"auto" }}>
                  <table style={tbl}>
                    <thead><tr>
                      <th style={th}>Request #</th><th style={th}>Outlet</th><th style={th}>Warehouse</th>
                      <th style={th}>Items</th><th style={th}>Total Issued Qty</th><th style={th}>Status</th><th style={th}>Actions</th>
                    </tr></thead>
                    <tbody>
                      {transfers.map(t=>(
                        <tr key={t.id}>
                          <td style={{ ...td, fontWeight:700 }}>{t.request_number}</td>
                          <td style={td}>{t.outlet_name}</td>
                          <td style={td}>{t.warehouse_name||"-"}</td>
                          <td style={{ ...td, textAlign:"center" }}>{t.item_count||0}</td>
                          <td style={td}>{t.total_issued||0}</td>
                          <td style={td}><Badge val={t.status}/></td>
                          <td style={td}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>openDetail(t.id)} style={btn("#F3F4F6","#374151")}>View</button>
                              {t.status==="dispatched" && <button onClick={()=>receiveStock(t.id)} disabled={actionLoading===`receive-${t.id}`} style={btn("#DCFCE7","#166534")}><CheckCircle2 size={12}/>Receive</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* APPROVALS TAB */}
              {tab === "approvals" && (
                approvals.length === 0 ? <EmptyState msg="No requests pending approval."/> :
                <div style={{ overflowX:"auto" }}>
                  <table style={tbl}>
                    <thead><tr>
                      <th style={th}>Request #</th><th style={th}>Outlet</th><th style={th}>Requested By</th>
                      <th style={th}>Date</th><th style={th}>Status</th><th style={th}>Actions</th>
                    </tr></thead>
                    <tbody>
                      {approvals.map(r=>(
                        <tr key={r.id}>
                          <td style={{ ...td, fontWeight:700 }}>{r.request_number}</td>
                          <td style={td}>{r.outlet_name}</td>
                          <td style={td}>{r.created_by_name||"-"}</td>
                          <td style={td}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "-"}</td>
                          <td style={td}><Badge val={r.status}/></td>
                          <td style={td}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>openDetail(r.id)} style={btn("#F3F4F6","#374151")}>View</button>
                              {r.status==="submitted" && <>
                                <button onClick={()=>approveReq(r.id)} disabled={actionLoading===`approve-${r.id}`} style={btn("#DCFCE7","#166534")}><CheckCircle2 size={12}/>Approve</button>
                                <button onClick={()=>rejectReq(r.id)} disabled={actionLoading===`reject-${r.id}`} style={btn("#FEE2E2","#991B1B")}><XCircle size={12}/>Reject</button>
                              </>}
                              {r.status==="approved" && <button onClick={()=>issueStock(r.id)} disabled={actionLoading===`issue-${r.id}`} style={btn("#DBEAFE","#1E40AF")}><Truck size={12}/>Issue Stock</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* REPORTS TAB */}
              {tab === "reports" && (
                <div>
                  <div style={{ padding:"16px 20px", borderBottom:`1px solid ${B.border}`, display:"flex", gap:10, flexWrap:"wrap" }}>
                    <button onClick={async()=>{ try{ const r=await API.get("/api/outlet-operations/reports/outlet-stock"); setReportData(Array.isArray(r.data?.data)?r.data.data:[]); }catch{} }} style={btn("#F3F4F6","#374151")}>Stock Report</button>
                    <button onClick={async()=>{ try{ const r=await API.get("/api/outlet-operations/reports/requests"); setReportData(Array.isArray(r.data?.data)?r.data.data:[]); }catch{} }} style={btn("#F3F4F6","#374151")}>Requests Report</button>
                    <button onClick={async()=>{ try{ const r=await API.get("/api/outlet-operations/reports/low-stock"); setReportData(Array.isArray(r.data?.data)?r.data.data:[]); }catch{} }} style={btn("#FEE2E2","#991B1B")}>Low Stock Report</button>
                    <button onClick={async()=>{ try{ const r=await API.get("/api/outlet-operations/reports/transfers"); setReportData(Array.isArray(r.data?.data)?r.data.data:[]); }catch{} }} style={btn("#DBEAFE","#1E40AF")}>Transfers Report</button>
                  </div>
                  {reportData.length === 0 ? <EmptyState msg="Select a report above to view data."/> :
                    <div style={{ overflowX:"auto" }}>
                      <table style={tbl}>
                        <thead><tr>{Object.keys(reportData[0]||{}).map(k=><th key={k} style={th}>{k.replace(/_/g," ")}</th>)}</tr></thead>
                        <tbody>
                          {reportData.map((row,i)=>(
                            <tr key={i}>
                              {Object.values(row).map((v,j)=>(
                                <td key={j} style={td}>{v===null||v===undefined?"-":String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  }
                  <div style={{ padding:"16px 20px", borderTop:`1px solid ${B.border}`, display:"flex", flexWrap:"wrap", gap:16 }}>
                    {[
                      { label:"Active Outlets",  value:summary.active_outlets },
                      { label:"Products in Stock",value:summary.products_in_stock },
                      { label:"Total Stock Qty",  value:summary.total_stock_qty },
                      { label:"Low Stock Alerts", value:summary.low_stock_alerts },
                      { label:"Pending",          value:summary.pending_requests },
                      { label:"Approved",         value:summary.approved_requests },
                      { label:"Dispatched",       value:summary.dispatched_requests },
                      { label:"Received",         value:summary.received_requests },
                    ].map(item=>(
                      <div key={item.label} style={{ background:B.cream, borderRadius:10, padding:"10px 18px", minWidth:120, textAlign:"center" }}>
                        <div style={{ fontSize:20, fontWeight:900, color:B.black }}>{item.value??0}</div>
                        <div style={{ fontSize:11, color:B.muted, fontWeight:600 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LOW STOCK ALERTS TAB */}
              {tab === "alerts" && (
                alerts.length === 0 ? <EmptyState msg="No low stock alerts. All products are well stocked."/> :
                <div>
                  <div style={{ padding:"12px 20px", background:"#FEF9C3", borderBottom:`1px solid ${B.border}`, display:"flex", alignItems:"center", gap:8, color:"#854D0E", fontSize:13, fontWeight:700 }}>
                    <AlertTriangle size={15}/> {alerts.length} low stock alert{alerts.length>1?"s":""} detected
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={th}>Outlet</th><th style={th}>Product</th><th style={th}>Code</th>
                        <th style={th}>Current Qty</th><th style={th}>Min Qty</th><th style={th}>Unit</th><th style={th}>Alert</th>
                      </tr></thead>
                      <tbody>
                        {alerts.map((a,i)=>(
                          <tr key={i}>
                            <td style={td}>{a.outlet_name}</td>
                            <td style={{ ...td, fontWeight:700 }}>{a.product_name}</td>
                            <td style={td}>{a.product_code||"-"}</td>
                            <td style={{ ...td, color:a.available_qty===0?"#991B1B":"#854D0E", fontWeight:700 }}>{a.available_qty}</td>
                            <td style={td}>{a.min_qty}</td>
                            <td style={td}>{a.unit||"-"}</td>
                            <td style={td}><Badge val={a.alert_level}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── OUTLET MODAL ─────────────────────────────────────────────────────── */}
      {showOutletModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:B.white, borderRadius:16, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${B.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:B.black }}>{editOutlet?"Edit Outlet":"Create Outlet"}</h3>
              <button onClick={()=>setShowOutletModal(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18}/></button>
            </div>
            <div style={{ padding:"20px 24px" }}>
              {[
                { key:"outlet_code", label:"Outlet Code" },
                { key:"name",        label:"Name *" },
                { key:"phone",       label:"Phone" },
                { key:"email",       label:"Email" },
                { key:"city",        label:"City" },
                { key:"state",       label:"State" },
                { key:"pincode",     label:"Pincode" },
              ].map(f=>(
                <label key={f.key} style={{ display:"block", marginBottom:12 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:B.muted, display:"block", marginBottom:4 }}>{f.label}</span>
                  <input value={outletForm[f.key]||""} onChange={e=>setOutletForm(p=>({...p,[f.key]:e.target.value}))}
                    style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
                </label>
              ))}
              <label style={{ display:"block", marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:700, color:B.muted, display:"block", marginBottom:4 }}>Address</span>
                <textarea value={outletForm.address||""} onChange={e=>setOutletForm(p=>({...p,address:e.target.value}))} rows={3}
                  style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13, boxSizing:"border-box", resize:"vertical" }}/>
              </label>
              <label style={{ display:"block", marginBottom:16 }}>
                <span style={{ fontSize:12, fontWeight:700, color:B.muted, display:"block", marginBottom:4 }}>Status</span>
                <select value={outletForm.status||"active"} onChange={e=>setOutletForm(p=>({...p,status:e.target.value}))}
                  style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13 }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={()=>setShowOutletModal(false)} style={btn("#F3F4F6","#374151")}>Cancel</button>
                <button onClick={saveOutlet} disabled={actionLoading==="outlet-save"} style={btn()}>{actionLoading==="outlet-save"?"Saving...":"Save Outlet"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUEST MODAL ─────────────────────────────────────────────────────── */}
      {showRequestModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:B.white, borderRadius:16, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${B.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:B.black }}>Create Stock Request</h3>
              <button onClick={()=>setShowRequestModal(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18}/></button>
            </div>
            <div style={{ padding:"20px 24px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <label>
                  <span style={{ fontSize:12, fontWeight:700, color:B.muted, display:"block", marginBottom:4 }}>Outlet *</span>
                  <select value={requestForm.outlet_id} onChange={e=>setRequestForm(p=>({...p,outlet_id:e.target.value}))}
                    style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13 }}>
                    <option value="">Select Outlet</option>
                    {outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </label>
                <label>
                  <span style={{ fontSize:12, fontWeight:700, color:B.muted, display:"block", marginBottom:4 }}>Warehouse</span>
                  <select value={requestForm.warehouse_id} onChange={e=>setRequestForm(p=>({...p,warehouse_id:e.target.value}))}
                    style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13 }}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </label>
                <label>
                  <span style={{ fontSize:12, fontWeight:700, color:B.muted, display:"block", marginBottom:4 }}>Request Date</span>
                  <input type="date" value={requestForm.request_date} onChange={e=>setRequestForm(p=>({...p,request_date:e.target.value}))}
                    style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13 }}/>
                </label>
                <label>
                  <span style={{ fontSize:12, fontWeight:700, color:B.muted, display:"block", marginBottom:4 }}>Required By</span>
                  <input type="date" value={requestForm.required_date} onChange={e=>setRequestForm(p=>({...p,required_date:e.target.value}))}
                    style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:13 }}/>
                </label>
              </div>

              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:B.black }}>Products</span>
                  <button onClick={addItemRow} style={btn("#F3F4F6","#374151")}><Plus size={12}/>Add Row</button>
                </div>
                {requestForm.items.map((item,i)=>(
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                    <select value={item.product_id} onChange={e=>setItemField(i,"product_id",e.target.value)}
                      style={{ flex:1, padding:"8px 10px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:12 }}>
                      <option value="">Select Product</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name} {p.product_code?`(${p.product_code})`:""}</option>)}
                    </select>
                    <input type="number" min="0" placeholder="Qty" value={item.requested_qty} onChange={e=>setItemField(i,"requested_qty",e.target.value)}
                      style={{ width:90, padding:"8px 10px", border:`1.5px solid ${B.border}`, borderRadius:8, fontSize:12 }}/>
                    {requestForm.items.length>1 && <button onClick={()=>removeItemRow(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#991B1B" }}><X size={14}/></button>}
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
                <button onClick={()=>setShowRequestModal(false)} style={btn("#F3F4F6","#374151")}>Cancel</button>
                <button onClick={saveRequest} disabled={actionLoading==="req-save"} style={btn()}>{actionLoading==="req-save"?"Creating...":"Create Request"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUEST DETAIL MODAL ──────────────────────────────────────────────── */}
      {showDetailModal && detailRequest && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:B.white, borderRadius:16, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${B.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:B.black }}>{detailRequest.request_number}</h3>
                <p style={{ margin:"2px 0 0", fontSize:12, color:B.muted }}>{detailRequest.outlet_name} → {detailRequest.warehouse_name||"No Warehouse"}</p>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Badge val={detailRequest.status}/>
                <button onClick={()=>setShowDetailModal(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18}/></button>
              </div>
            </div>
            <div style={{ padding:"20px 24px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { label:"Request Date",   val:detailRequest.request_date ? new Date(detailRequest.request_date).toLocaleDateString("en-IN") : "-" },
                  { label:"Required By",    val:detailRequest.required_date ? new Date(detailRequest.required_date).toLocaleDateString("en-IN") : "-" },
                  { label:"Created By",     val:detailRequest.created_by_name||"-" },
                  { label:"Created At",     val:detailRequest.created_at ? new Date(detailRequest.created_at).toLocaleString("en-IN") : "-" },
                ].map(f=>(
                  <div key={f.label} style={{ background:B.cream, borderRadius:9, padding:"10px 14px" }}>
                    <div style={{ fontSize:11, color:B.muted, fontWeight:700 }}>{f.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:B.black, marginTop:2 }}>{f.val}</div>
                  </div>
                ))}
              </div>
              <h4 style={{ fontSize:13, fontWeight:800, color:B.black, margin:"0 0 10px" }}>Items ({(detailRequest.items||[]).length})</h4>
              {(detailRequest.items||[]).length === 0 ? <p style={{ color:B.muted, fontSize:13 }}>No items in this request</p> :
                <table style={tbl}>
                  <thead><tr>
                    <th style={th}>Product</th><th style={th}>Unit</th>
                    <th style={th}>Requested</th><th style={th}>Approved</th><th style={th}>Issued</th>
                  </tr></thead>
                  <tbody>
                    {(detailRequest.items||[]).map(it=>(
                      <tr key={it.id}>
                        <td style={td}>{it.product_name} <span style={{ color:B.muted, fontSize:11 }}>{it.product_code||""}</span></td>
                        <td style={td}>{it.unit||"-"}</td>
                        <td style={td}>{it.requested_qty}</td>
                        <td style={td}>{it.approved_qty||0}</td>
                        <td style={td}>{it.issued_qty||0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20, flexWrap:"wrap" }}>
                {detailRequest.status==="draft"      && <button onClick={()=>{ submitRequest(detailRequest.id); setShowDetailModal(false); }} style={btn("#FEF9C3","#854D0E")}>Submit for Approval</button>}
                {detailRequest.status==="submitted"  && <button onClick={()=>{ approveReq(detailRequest.id); setShowDetailModal(false); }} style={btn("#DCFCE7","#166534")}><CheckCircle2 size={12}/>Approve</button>}
                {detailRequest.status==="submitted"  && <button onClick={()=>{ rejectReq(detailRequest.id); setShowDetailModal(false); }} style={btn("#FEE2E2","#991B1B")}><XCircle size={12}/>Reject</button>}
                {detailRequest.status==="approved"   && <button onClick={()=>{ issueStock(detailRequest.id); setShowDetailModal(false); }} style={btn("#DBEAFE","#1E40AF")}><Truck size={12}/>Issue Stock</button>}
                {detailRequest.status==="dispatched" && <button onClick={()=>{ receiveStock(detailRequest.id); setShowDetailModal(false); }} style={btn("#DCFCE7","#166534")}><CheckCircle2 size={12}/>Mark Received</button>}
                <button onClick={()=>setShowDetailModal(false)} style={btn("#F3F4F6","#374151")}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
