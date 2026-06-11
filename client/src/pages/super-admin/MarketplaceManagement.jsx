import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, BarChart3, Building2, CheckCircle2, Edit3,
  IndianRupee, Link2, Package, Plus, RefreshCw, Search,
  ShoppingBag, Sliders, Trash2, TrendingUp, X, XCircle,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";

const B = {
  black: "#111318", yellow: "#F8C400", cream: "#FFF7DB",
  white: "#FFFFFF", border: "#DBDADE", muted: "#6E6B7B", bg: "#F8F8FA",
};

const STATUS_COLORS = {
  active:       { bg: "#DCFCE7", color: "#166534" },
  inactive:     { bg: "#FEE2E2", color: "#991B1B" },
  pending:      { bg: "#FEF9C3", color: "#854D0E" },
  blocked:      { bg: "#111318", color: "#fff" },
  out_of_stock: { bg: "#FEE2E2", color: "#991B1B" },
};

const Badge = ({ val }) => {
  const s = STATUS_COLORS[val] || { bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {String(val || "").replace(/_/g, " ")}
    </span>
  );
};

const SummaryCard = ({ icon: Icon, label, value, color = "#F8C400" }) => (
  <div style={{ background: B.white, border: `1.5px solid ${B.border}`, borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 150 }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, color: B.black }}>{value ?? 0}</div>
      <div style={{ fontSize: 12, color: B.muted, fontWeight: 600 }}>{label}</div>
    </div>
  </div>
);

const TABS = [
  { key: "marketplaces", label: "Marketplace Master",   icon: ShoppingBag },
  { key: "vendors",      label: "Marketplace Vendors",  icon: Building2 },
  { key: "products",     label: "Marketplace Products", icon: Package },
  { key: "mapping",      label: "Product Mapping",      icon: Link2 },
  { key: "pricing",      label: "Price / Commission",   icon: IndianRupee },
  { key: "status",       label: "Status Control",       icon: Sliders },
  { key: "approvals",    label: "Approvals",            icon: CheckCircle2 },
  { key: "reports",      label: "Reports",              icon: TrendingUp },
];

const TYPE_OPTIONS = ["own_app", "website", "swiggy", "zomato", "ondc", "dine_in", "other"];

const emptyMkt  = { marketplace_code: "", name: "", description: "", type: "other", website_url: "", commission_percentage: "", settlement_cycle: "", contact_person: "", contact_phone: "", contact_email: "", status: "active" };
const emptyVend = { marketplace_id: "", vendor_id: "", commission_rate: "", status: "pending" };
const emptyProd = { marketplace_id: "", vendor_id: "", product_id: "", price: "", available_qty: "", status: "active" };

const emptyMapForm   = { marketplace_id: "", vendor_id: "", product_id: "", price: "", available_qty: "", status: "active" };
const emptyPriceForm = { price: "", available_qty: "" };

export default function MarketplaceManagement() {
  const [tab, setTab]               = useState("marketplaces");
  const [summary, setSummary]       = useState({});
  const [marketplaces, setMkts]     = useState([]);
  const [vendors, setVendors]       = useState([]);
  const [products, setProducts]     = useState([]);
  const [mapping, setMapping]       = useState([]);
  const [pricing, setPricing]       = useState([]);
  const [approvals, setApprovals]   = useState([]);
  const [reportData, setReportData] = useState({ rows: [], type: "" });
  const [allVendors, setAllVendors] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [lookupMkts, setLookupMkts]         = useState([]);
  const [lookupVendors, setLookupVendors]   = useState([]);
  const [lookupProducts, setLookupProducts] = useState([]);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const [search, setSearch]               = useState("");
  const [filterMkt, setFilterMkt]         = useState("");
  const [filterVendor, setFilterVendor]   = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [approvalFilter, setApprovalFilter] = useState("inactive");

  const [showMktModal, setShowMktModal]     = useState(false);
  const [showVendModal, setShowVendModal]   = useState(false);
  const [showProdModal, setShowProdModal]   = useState(false);
  const [showMapModal, setShowMapModal]     = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showBulkModal, setShowBulkModal]   = useState(false);
  const [editItem, setEditItem]             = useState(null);
  const [mktForm, setMktForm]               = useState(emptyMkt);
  const [vendForm, setVendForm]             = useState(emptyVend);
  const [prodForm, setProdForm]             = useState(emptyProd);
  const [mapForm, setMapForm]               = useState(emptyMapForm);
  const [priceForm, setPriceForm]           = useState(emptyPriceForm);
  const [bulkStatus, setBulkStatus]         = useState("active");
  const [selectedIds, setSelectedIds]       = useState([]);
  const [actionLoading, setActionLoading]   = useState("");

  const notify = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const mktLabel  = (m) => [m.marketplace_code, m.name].filter(Boolean).join(" - ");
  const vendLabel = (v) => [v.vendor_code, v.business_name || v.name].filter(Boolean).join(" - ") || `Vendor #${v.id}`;
  const prodLabel = (p) => [p.product_code, p.name].filter(Boolean).join(" - ") || `Product #${p.id}`;

  const loadDropdowns = useCallback(async () => {
    const [lm, lv, lp, mm] = await Promise.allSettled([
      API.get("/api/marketplace-management/lookups/marketplaces"),
      API.get("/api/marketplace-management/lookups/vendors"),
      API.get("/api/marketplace-management/lookups/products"),
      API.get("/api/marketplace-management/marketplaces"),
    ]);
    if (lm.status === "fulfilled") setLookupMkts(Array.isArray(lm.value.data?.data)    ? lm.value.data.data    : []);
    if (lv.status === "fulfilled") setLookupVendors(Array.isArray(lv.value.data?.data) ? lv.value.data.data : []);
    if (lp.status === "fulfilled") setLookupProducts(Array.isArray(lp.value.data?.data)? lp.value.data.data : []);
    if (mm.status === "fulfilled") setMkts(Array.isArray(mm.value.data?.data)          ? mm.value.data.data : []);
    setAllVendors(lv.status === "fulfilled" ? (Array.isArray(lv.value.data?.data) ? lv.value.data.data : []) : []);
    setAllProducts(lp.status === "fulfilled" ? (Array.isArray(lp.value.data?.data) ? lp.value.data.data : []) : []);
  }, []);

  const loadSummary = useCallback(async () => {
    const [ms, vs, ps] = await Promise.allSettled([
      API.get("/api/marketplace-management/marketplaces/summary"),
      API.get("/api/marketplace-management/vendors/summary"),
      API.get("/api/marketplace-management/products/summary"),
    ]);
    const m = (r) => r.status === "fulfilled" ? r.value.data?.data || {} : {};
    setSummary({ ...m(ms), ...m(vs), ...m(ps) });
  }, []);

  const loadTab = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams();
      if (search)       q.set("search", search);
      if (filterMkt)    q.set("marketplace_id", filterMkt);
      if (filterVendor) q.set("vendor_id", filterVendor);
      if (filterStatus) q.set("status", filterStatus);
      const qs = q.toString() ? `?${q}` : "";

      if (tab === "marketplaces") {
        const r = await API.get(`/api/marketplace-management/marketplaces${qs}`);
        setMkts(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "vendors") {
        const r = await API.get(`/api/marketplace-management/vendors${qs}`);
        setVendors(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "products") {
        const r = await API.get(`/api/marketplace-management/products${qs}`);
        setProducts(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "mapping") {
        const r = await API.get(`/api/marketplace-management/mapping${qs}`);
        setMapping(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "pricing") {
        const r = await API.get(`/api/marketplace-management/pricing${qs}`);
        setPricing(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "status") {
        const r = await API.get(`/api/marketplace-management/products${qs}`);
        setProducts(Array.isArray(r.data?.data) ? r.data.data : []);
        setSelectedIds([]);
      } else if (tab === "approvals") {
        const af = new URLSearchParams();
        if (filterMkt)    af.set("marketplace_id", filterMkt);
        if (search)       af.set("search", search);
        af.set("status",  approvalFilter || "inactive");
        const r = await API.get(`/api/marketplace-management/approvals?${af}`);
        setApprovals(Array.isArray(r.data?.data) ? r.data.data : []);
      } else if (tab === "reports") {
        const r = await API.get("/api/marketplace-management/reports/summary");
        setReportData({ rows: [], type: "summary", summary: r.data?.data || {} });
      }
    } catch (e) { setError(e?.response?.data?.message || "Failed to load data"); }
    finally { setLoading(false); }
  }, [tab, search, filterMkt, filterVendor, filterStatus, approvalFilter]);

  useEffect(() => { loadDropdowns(); loadSummary(); }, [loadDropdowns, loadSummary]);
  useEffect(() => { loadTab(); }, [loadTab]);

  // ── Marketplace CRUD ──────────────────────────────────────────────────

  const openCreateMkt = () => { setEditItem(null); setMktForm(emptyMkt); setShowMktModal(true); };
  const openEditMkt   = (m) => {
    setEditItem(m);
    setMktForm({ marketplace_code: m.marketplace_code || "", name: m.name || "", description: m.description || "", type: m.type || "other", website_url: m.website_url || "", commission_percentage: m.commission_percentage || "", settlement_cycle: m.settlement_cycle || "", contact_person: m.contact_person || "", contact_phone: m.contact_phone || "", contact_email: m.contact_email || "", status: m.status || "active" });
    setShowMktModal(true);
  };

  const saveMkt = async () => {
    if (!mktForm.name.trim()) { notify("Marketplace name is required", true); return; }
    setActionLoading("mkt-save");
    try {
      if (editItem) await API.put(`/api/marketplace-management/marketplaces/${editItem.id}`, mktForm);
      else          await API.post("/api/marketplace-management/marketplaces", mktForm);
      notify(editItem ? "Marketplace updated" : "Marketplace created");
      setShowMktModal(false);
      loadTab(); loadSummary(); loadDropdowns();
    } catch (e) { notify(e?.response?.data?.message || "Save failed", true); }
    finally { setActionLoading(""); }
  };

  const deleteMkt = async (id) => {
    if (!window.confirm("Delete this marketplace?")) return;
    try { await API.delete(`/api/marketplace-management/marketplaces/${id}`); notify("Marketplace deleted"); loadTab(); loadSummary(); }
    catch (e) { notify(e?.response?.data?.message || "Delete failed", true); }
  };

  const toggleMktStatus = async (m) => {
    const ns = m.status === "active" ? "inactive" : "active";
    try { await API.patch(`/api/marketplace-management/marketplaces/${m.id}/status`, { status: ns }); notify(`Marketplace marked ${ns}`); loadTab(); }
    catch (e) { notify(e?.response?.data?.message || "Status update failed", true); }
  };

  // ── Marketplace Vendor CRUD ───────────────────────────────────────────

  const openCreateVend = () => { setEditItem(null); setVendForm(emptyVend); setShowVendModal(true); };
  const openEditVend   = (v) => { setEditItem(v); setVendForm({ marketplace_id: v.marketplace_id, vendor_id: v.vendor_id, commission_rate: v.commission_rate || "", status: v.status || "pending" }); setShowVendModal(true); };

  const saveVend = async () => {
    if (!vendForm.marketplace_id || !vendForm.vendor_id) { notify("Marketplace and Vendor are required", true); return; }
    setActionLoading("vend-save");
    try {
      if (editItem) await API.put(`/api/marketplace-management/vendors/${editItem.id}`, vendForm);
      else          await API.post("/api/marketplace-management/vendors", vendForm);
      notify(editItem ? "Vendor updated" : "Vendor linked to marketplace");
      setShowVendModal(false);
      loadTab(); loadSummary();
    } catch (e) { notify(e?.response?.data?.message || "Save failed", true); }
    finally { setActionLoading(""); }
  };

  const deleteVend = async (id) => {
    if (!window.confirm("Remove this vendor from marketplace?")) return;
    try { await API.delete(`/api/marketplace-management/vendors/${id}`); notify("Vendor removed"); loadTab(); loadSummary(); }
    catch (e) { notify(e?.response?.data?.message || "Delete failed", true); }
  };

  // ── Marketplace Product CRUD ──────────────────────────────────────────

  const openCreateProd = () => { setEditItem(null); setProdForm(emptyProd); setShowProdModal(true); };
  const openEditProd   = (p) => { setEditItem(p); setProdForm({ marketplace_id: p.marketplace_id, vendor_id: p.vendor_id, product_id: p.product_id, price: p.price, available_qty: p.available_qty, status: p.status || "active" }); setShowProdModal(true); };

  const saveProd = async () => {
    if (!prodForm.marketplace_id || !prodForm.vendor_id || !prodForm.product_id || prodForm.price === "") { notify("Marketplace, Vendor, Product and Price are required", true); return; }
    setActionLoading("prod-save");
    try {
      if (editItem) await API.put(`/api/marketplace-management/products/${editItem.id}`, prodForm);
      else          await API.post("/api/marketplace-management/products", prodForm);
      notify(editItem ? "Product updated" : "Product listed on marketplace");
      setShowProdModal(false);
      loadTab(); loadSummary();
    } catch (e) { notify(e?.response?.data?.message || "Save failed", true); }
    finally { setActionLoading(""); }
  };

  const deleteProd = async (id) => {
    if (!window.confirm("Remove this product from marketplace?")) return;
    try { await API.delete(`/api/marketplace-management/products/${id}`); notify("Product removed"); loadTab(); loadSummary(); }
    catch (e) { notify(e?.response?.data?.message || "Delete failed", true); }
  };

  const toggleProdStatus = async (p) => {
    const ns = p.status === "active" ? "inactive" : "active";
    try { await API.patch(`/api/marketplace-management/products/${p.id}/status`, { status: ns }); notify(`Product marked ${ns}`); loadTab(); }
    catch (e) { notify(e?.response?.data?.message || "Status update failed", true); }
  };

  const toggleVendStatus = async (v) => {
    const ns = v.status === "active" ? "inactive" : "active";
    try { await API.patch(`/api/marketplace-management/vendors/${v.id}/status`, { status: ns }); notify(`Vendor status updated to ${ns}`); loadTab(); }
    catch (e) { notify(e?.response?.data?.message || "Status update failed", true); }
  };

  // ── Module 4: Mapping CRUD ───────────────────────────────────────────

  const openCreateMap = () => { setEditItem(null); setMapForm(emptyMapForm); setShowMapModal(true); };
  const openEditMap   = (m) => { setEditItem(m); setMapForm({ marketplace_id: m.marketplace_id, vendor_id: m.vendor_id, product_id: m.product_id, price: m.price, available_qty: m.available_qty, status: m.status || "active" }); setShowMapModal(true); };

  const saveMap = async () => {
    if (!mapForm.marketplace_id || !mapForm.vendor_id || !mapForm.product_id || mapForm.price === "") { notify("Marketplace, Vendor, Product and Price are required", true); return; }
    setActionLoading("map-save");
    try {
      if (editItem) await API.put(`/api/marketplace-management/mapping/${editItem.id}`, mapForm);
      else          await API.post("/api/marketplace-management/mapping", mapForm);
      notify(editItem ? "Mapping updated" : "Product mapped to marketplace");
      setShowMapModal(false); loadTab(); loadSummary();
    } catch (e) { notify(e?.response?.data?.message || "Save failed", true); }
    finally { setActionLoading(""); }
  };

  const deleteMap = async (id) => {
    if (!window.confirm("Remove this mapping?")) return;
    try { await API.delete(`/api/marketplace-management/mapping/${id}`); notify("Mapping removed"); loadTab(); loadSummary(); }
    catch (e) { notify(e?.response?.data?.message || "Delete failed", true); }
  };

  // ── Module 5: Pricing ────────────────────────────────────────────────

  const openEditPrice = (p) => { setEditItem(p); setPriceForm({ price: p.price, available_qty: p.available_qty }); setShowPriceModal(true); };

  const savePrice = async () => {
    if (priceForm.price === "" && priceForm.available_qty === "") { notify("Enter price or quantity", true); return; }
    setActionLoading("price-save");
    try {
      await API.put(`/api/marketplace-management/products/${editItem.id}/pricing`, priceForm);
      notify("Pricing updated"); setShowPriceModal(false); loadTab();
    } catch (e) { notify(e?.response?.data?.message || "Save failed", true); }
    finally { setActionLoading(""); }
  };

  // ── Module 6: Status Control ─────────────────────────────────────────

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = (rows) => setSelectedIds(selectedIds.length === rows.length ? [] : rows.map(r => r.id));

  const quickStatus = async (id, status) => {
    try { await API.patch(`/api/marketplace-management/products/${id}/status`, { status }); notify(`Set to ${status}`); loadTab(); }
    catch (e) { notify(e?.response?.data?.message || "Failed", true); }
  };

  const runBulkStatus = async () => {
    if (!selectedIds.length) { notify("Select at least one product", true); return; }
    setActionLoading("bulk-save");
    try {
      await API.patch("/api/marketplace-management/products/bulk-status", { ids: selectedIds, status: bulkStatus });
      notify(`${selectedIds.length} product(s) updated to ${bulkStatus}`);
      setShowBulkModal(false); setSelectedIds([]); loadTab();
    } catch (e) { notify(e?.response?.data?.message || "Bulk update failed", true); }
    finally { setActionLoading(""); }
  };

  // ── Module 7: Approvals ──────────────────────────────────────────────

  const approveProduct = async (id) => {
    try { await API.patch(`/api/marketplace-management/products/${id}/approve`); notify("Product approved"); loadTab(); loadSummary(); }
    catch (e) { notify(e?.response?.data?.message || "Failed", true); }
  };

  const rejectProduct = async (id) => {
    if (!window.confirm("Reject this product listing?")) return;
    try { await API.patch(`/api/marketplace-management/products/${id}/reject`); notify("Product rejected"); loadTab(); loadSummary(); }
    catch (e) { notify(e?.response?.data?.message || "Failed", true); }
  };

  // ── Module 8: Reports ────────────────────────────────────────────────

  const loadReport = async (type) => {
    setLoading(true); setError("");
    try {
      const r = await API.get(`/api/marketplace-management/reports/${type}`);
      setReportData(prev => ({ ...prev, rows: Array.isArray(r.data?.data) ? r.data.data : [], type }));
    } catch (e) { setError(e?.response?.data?.message || "Failed to load report"); }
    finally { setLoading(false); }
  };

  // ── Styles ────────────────────────────────────────────────────────────

  const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
  const th  = { padding: "10px 12px", background: B.black, color: B.yellow, fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" };
  const td  = { padding: "10px 12px", borderBottom: `1px solid ${B.border}`, verticalAlign: "middle", color: B.black };
  const btn = (bg = "#111318", color = "#fff") => ({ padding: "6px 14px", borderRadius: 7, background: bg, color, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 });
  const inp = { width: "100%", padding: "9px 12px", border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const lbl = { display: "block", marginBottom: 12 };
  const lbl_s = { fontSize: 12, fontWeight: 700, color: B.muted, display: "block", marginBottom: 4 };

  const EmptyState = ({ msg = "No data found" }) => (
    <div style={{ padding: 48, textAlign: "center", color: B.muted }}>
      <Package size={36} color={B.border} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 14 }}>{msg}</div>
    </div>
  );

  const ModalShell = ({ title, onClose, onSave, saving, children }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: B.white, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${B.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: B.black }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {children}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={onClose} style={btn("#F3F4F6", "#374151")}>Cancel</button>
            <button onClick={onSave} disabled={saving} style={btn()}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div style={{ padding: "24px 28px", background: B.bg, minHeight: "100vh" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: B.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingBag size={22} color={B.black} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: B.black }}>Marketplace Management</h1>
              <p style={{ margin: 0, fontSize: 13, color: B.muted }}>Manage marketplaces, vendor listings and product listings</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error   && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 16px", borderRadius: 9, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{error}</span><button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#991B1B" }}><X size={14} /></button></div>}
        {success && <div style={{ background: "#DCFCE7", color: "#166534", padding: "10px 16px", borderRadius: 9, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{success}</span><button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534" }}><X size={14} /></button></div>}

        {/* Summary Cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
          <SummaryCard icon={ShoppingBag} label="Total Marketplaces"   value={summary.total}        color="#F8C400" />
          <SummaryCard icon={CheckCircle2} label="Active Marketplaces"  value={summary.active}       color="#10B981" />
          <SummaryCard icon={Building2}   label="Vendor Listings"       value={(summary.total !== undefined && summary.pending !== undefined) ? (summary.pending + (summary.active || 0)) : summary.total} color="#6366F1" />
          <SummaryCard icon={Package}     label="Product Listings"      value={summary.total}        color="#3B82F6" />
          <SummaryCard icon={AlertTriangle} label="Out of Stock"        value={summary.out_of_stock} color="#EF4444" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20, borderBottom: `2px solid ${B.border}` }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); setFilterMkt(""); setFilterVendor(""); setFilterStatus(""); }}
                style={{ padding: "9px 16px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, background: active ? B.black : B.white, color: active ? B.yellow : B.muted }}>
                <Icon size={15} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Filters + Actions Bar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: B.white, border: `1.5px solid ${B.border}`, borderRadius: 8, padding: "7px 12px", flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} color={B.muted} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ border: "none", outline: "none", fontSize: 13, color: B.black, background: "transparent", width: "100%" }} />
          </div>

          {["vendors", "products", "mapping", "pricing", "status", "approvals"].includes(tab) && (
            <select value={filterMkt} onChange={e => setFilterMkt(e.target.value)} style={{ padding: "8px 12px", border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13, color: B.black, background: B.white }}>
              <option value="">All Marketplaces</option>
              {marketplaces.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}

          {["products", "mapping", "pricing", "status"].includes(tab) && (
            <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} style={{ padding: "8px 12px", border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13, color: B.black, background: B.white }}>
              <option value="">All Vendors</option>
              {allVendors.map(v => <option key={v.id} value={v.id}>{v.business_name || v.vendor_name}</option>)}
            </select>
          )}

          {tab === "approvals" && (
            <select value={approvalFilter} onChange={e => { setApprovalFilter(e.target.value); }} style={{ padding: "8px 12px", border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13, color: B.black, background: B.white }}>
              <option value="inactive">Pending Review</option>
              <option value="active">Approved</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          )}

          {!["approvals", "reports"].includes(tab) && (
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "8px 12px", border: `1.5px solid ${B.border}`, borderRadius: 8, fontSize: 13, color: B.black, background: B.white }}>
              <option value="">All Status</option>
              {tab === "vendors"
                ? ["pending", "active", "inactive", "blocked"].map(s => <option key={s} value={s}>{s}</option>)
                : ["active", "inactive", "out_of_stock"].map(s => <option key={s} value={s}>{s}</option>)
              }
            </select>
          )}

          <button onClick={loadTab} style={{ ...btn(B.white, B.black), border: `1.5px solid ${B.border}` }}><RefreshCw size={13} />Refresh</button>
          {tab === "marketplaces" && <button onClick={openCreateMkt}  style={btn()}><Plus size={13} />Add Marketplace</button>}
          {tab === "vendors"      && <button onClick={openCreateVend} style={btn()}><Plus size={13} />Link Vendor</button>}
          {tab === "products"     && <button onClick={openCreateProd} style={btn()}><Plus size={13} />List Product</button>}
          {tab === "mapping"      && <button onClick={openCreateMap}  style={btn()}><Plus size={13} />Map Product</button>}
          {tab === "status"       && selectedIds.length > 0 && <button onClick={() => setShowBulkModal(true)} style={btn("#6366F1")}><Sliders size={13} />Bulk Update ({selectedIds.length})</button>}
        </div>

        {/* Tab Content */}
        <div style={{ background: B.white, border: `1.5px solid ${B.border}`, borderRadius: 14, overflow: "hidden" }}>
          {loading ? <div style={{ padding: 48, textAlign: "center", color: B.muted }}>Loading…</div> : (
            <>

              {/* MARKETPLACE MASTER */}
              {tab === "marketplaces" && (
                marketplaces.length === 0
                  ? <EmptyState msg="No marketplaces yet. Add your first marketplace (Swiggy, Zomato, Own App, etc.)." />
                  : <div style={{ overflowX: "auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={th}>Code</th><th style={th}>Name</th><th style={th}>Type</th>
                        <th style={th}>Website</th><th style={th}>Commission %</th><th style={th}>Status</th><th style={th}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {marketplaces.map(m => (
                          <tr key={m.id}>
                            <td style={td}>{m.marketplace_code || "-"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{m.name}</td>
                            <td style={td}>{m.type ? String(m.type).replace(/_/g, " ") : "-"}</td>
                            <td style={td}>{m.website_url ? <a href={m.website_url} target="_blank" rel="noreferrer" style={{ color: "#3B82F6" }}>{m.website_url}</a> : "-"}</td>
                            <td style={td}>{m.commission_percentage != null ? `${m.commission_percentage}%` : "-"}</td>
                            <td style={td}><Badge val={m.status} /></td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => openEditMkt(m)} style={btn("#F3F4F6", "#374151")}><Edit3 size={12} />Edit</button>
                                <button onClick={() => toggleMktStatus(m)} style={btn(m.status === "active" ? "#FEE2E2" : "#DCFCE7", m.status === "active" ? "#991B1B" : "#166534")}>{m.status === "active" ? "Deactivate" : "Activate"}</button>
                                <button onClick={() => deleteMkt(m.id)} style={btn("#FEE2E2", "#991B1B")}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* MARKETPLACE VENDORS */}
              {tab === "vendors" && (
                vendors.length === 0
                  ? <EmptyState msg="No vendor listings. Link a vendor to a marketplace." />
                  : <div style={{ overflowX: "auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={th}>Marketplace</th><th style={th}>Vendor</th><th style={th}>Vendor Code</th>
                        <th style={th}>Commission Rate</th><th style={th}>Status</th><th style={th}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {vendors.map(v => (
                          <tr key={v.id}>
                            <td style={td}>{v.marketplace_name || "-"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{v.vendor_name || "-"}</td>
                            <td style={td}>{v.vendor_code || "-"}</td>
                            <td style={td}>{v.commission_rate != null ? `${v.commission_rate}%` : "-"}</td>
                            <td style={td}><Badge val={v.status} /></td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => openEditVend(v)} style={btn("#F3F4F6", "#374151")}><Edit3 size={12} />Edit</button>
                                <button onClick={() => toggleVendStatus(v)} style={btn(v.status === "active" ? "#FEE2E2" : "#DCFCE7", v.status === "active" ? "#991B1B" : "#166534")}>{v.status === "active" ? "Deactivate" : "Activate"}</button>
                                <button onClick={() => deleteVend(v.id)} style={btn("#FEE2E2", "#991B1B")}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* MARKETPLACE PRODUCTS */}
              {tab === "products" && (
                products.length === 0
                  ? <EmptyState msg="No products listed on any marketplace yet." />
                  : <div style={{ overflowX: "auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={th}>Marketplace</th><th style={th}>Product</th><th style={th}>Code</th>
                        <th style={th}>Vendor</th><th style={th}>Price</th><th style={th}>Avail Qty</th><th style={th}>Status</th><th style={th}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id}>
                            <td style={td}>{p.marketplace_name || "-"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{p.product_name || "-"}</td>
                            <td style={td}>{p.product_code || "-"}</td>
                            <td style={td}>{p.vendor_name || "-"}</td>
                            <td style={td}>₹{p.price ?? "-"}</td>
                            <td style={td}>{p.available_qty ?? 0}</td>
                            <td style={td}><Badge val={p.status} /></td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => openEditProd(p)} style={btn("#F3F4F6", "#374151")}><Edit3 size={12} />Edit</button>
                                <button onClick={() => toggleProdStatus(p)} style={btn(p.status === "active" ? "#FEE2E2" : "#DCFCE7", p.status === "active" ? "#991B1B" : "#166534")}>{p.status === "active" ? "Deactivate" : "Activate"}</button>
                                <button onClick={() => deleteProd(p.id)} style={btn("#FEE2E2", "#991B1B")}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* PRODUCT MAPPING */}
              {tab === "mapping" && (
                mapping.length === 0
                  ? <EmptyState msg="No product mappings. Map a product to a marketplace." />
                  : <div style={{ overflowX: "auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={th}>Marketplace</th><th style={th}>Product</th><th style={th}>Code</th>
                        <th style={th}>Vendor</th><th style={th}>Price</th><th style={th}>Avail Qty</th><th style={th}>Status</th><th style={th}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {mapping.map(m => (
                          <tr key={m.id}>
                            <td style={td}>{m.marketplace_name || "-"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{m.product_name || "-"}</td>
                            <td style={td}>{m.product_code || "-"}</td>
                            <td style={td}>{m.vendor_name || "-"}</td>
                            <td style={td}>₹{m.price ?? "-"}</td>
                            <td style={td}>{m.available_qty ?? 0}</td>
                            <td style={td}><Badge val={m.status} /></td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => openEditMap(m)} style={btn("#F3F4F6", "#374151")}><Edit3 size={12} />Edit</button>
                                <button onClick={() => deleteMap(m.id)} style={btn("#FEE2E2", "#991B1B")}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* PRICE / COMMISSION */}
              {tab === "pricing" && (
                pricing.length === 0
                  ? <EmptyState msg="No pricing data found." />
                  : <div style={{ overflowX: "auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={th}>Marketplace</th><th style={th}>Product</th><th style={th}>Vendor</th>
                        <th style={th}>Price</th><th style={th}>Commission %</th><th style={th}>Commission ₹</th>
                        <th style={th}>Net Receivable</th><th style={th}>Avail Qty</th><th style={th}>Status</th><th style={th}>Action</th>
                      </tr></thead>
                      <tbody>
                        {pricing.map(p => (
                          <tr key={p.id}>
                            <td style={td}>{p.marketplace_name || "-"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{p.product_name || "-"}</td>
                            <td style={td}>{p.vendor_name || "-"}</td>
                            <td style={td}>₹{p.price ?? "-"}</td>
                            <td style={td}>{p.effective_commission_rate ?? 0}%</td>
                            <td style={{ ...td, color: "#EF4444" }}>₹{p.commission_amount ?? 0}</td>
                            <td style={{ ...td, color: "#10B981", fontWeight: 700 }}>₹{p.net_receivable ?? "-"}</td>
                            <td style={td}>{p.available_qty ?? 0}</td>
                            <td style={td}><Badge val={p.status} /></td>
                            <td style={td}>
                              <button onClick={() => openEditPrice(p)} style={btn("#F3F4F6", "#374151")}><Edit3 size={12} />Edit Price</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* STATUS CONTROL */}
              {tab === "status" && (
                products.length === 0
                  ? <EmptyState msg="No products found." />
                  : <div style={{ overflowX: "auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={{ ...th, width: 36 }}>
                          <input type="checkbox" checked={selectedIds.length === products.length && products.length > 0} onChange={() => toggleSelectAll(products)} />
                        </th>
                        <th style={th}>Marketplace</th><th style={th}>Product</th><th style={th}>Vendor</th>
                        <th style={th}>Price</th><th style={th}>Status</th><th style={th}>Quick Actions</th>
                      </tr></thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} style={{ background: selectedIds.includes(p.id) ? "#FFFBEB" : "transparent" }}>
                            <td style={td}><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                            <td style={td}>{p.marketplace_name || "-"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{p.product_name || "-"}</td>
                            <td style={td}>{p.vendor_name || "-"}</td>
                            <td style={td}>₹{p.price ?? "-"}</td>
                            <td style={td}><Badge val={p.status} /></td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                <button onClick={() => quickStatus(p.id, "active")}       style={btn("#DCFCE7", "#166534")}>Active</button>
                                <button onClick={() => quickStatus(p.id, "inactive")}     style={btn("#FEF9C3", "#854D0E")}>Inactive</button>
                                <button onClick={() => quickStatus(p.id, "out_of_stock")} style={btn("#FEE2E2", "#991B1B")}>OOS</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* APPROVALS */}
              {tab === "approvals" && (
                approvals.length === 0
                  ? <EmptyState msg={approvalFilter === "inactive" ? "No pending products for review." : "No records found."} />
                  : <div style={{ overflowX: "auto" }}>
                    <table style={tbl}>
                      <thead><tr>
                        <th style={th}>Marketplace</th><th style={th}>Product</th><th style={th}>Code</th>
                        <th style={th}>Vendor</th><th style={th}>Price</th><th style={th}>Status</th><th style={th}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {approvals.map(a => (
                          <tr key={a.id}>
                            <td style={td}>{a.marketplace_name || "-"}</td>
                            <td style={{ ...td, fontWeight: 700 }}>{a.product_name || "-"}</td>
                            <td style={td}>{a.product_code || "-"}</td>
                            <td style={td}>{a.vendor_name || "-"}</td>
                            <td style={td}>₹{a.price ?? "-"}</td>
                            <td style={td}><Badge val={a.status} /></td>
                            <td style={td}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => approveProduct(a.id)} style={btn("#DCFCE7", "#166534")}><CheckCircle2 size={12} />Approve</button>
                                <button onClick={() => rejectProduct(a.id)}  style={btn("#FEE2E2", "#991B1B")}><XCircle size={12} />Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* REPORTS */}
              {tab === "reports" && (
                <div style={{ padding: 24 }}>
                  {/* Report Summary Cards */}
                  {reportData.summary && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                      {[
                        { label: "Total Marketplaces",     val: reportData.summary.total_marketplaces,     color: "#F8C400" },
                        { label: "Active Marketplaces",    val: reportData.summary.active_marketplaces,    color: "#10B981" },
                        { label: "Vendor Listings",        val: reportData.summary.total_marketplace_vendors, color: "#6366F1" },
                        { label: "Total Mapped Products",  val: reportData.summary.total_mapped_products,  color: "#3B82F6" },
                        { label: "Active Products",        val: reportData.summary.active_marketplace_products, color: "#10B981" },
                        { label: "Inactive / Pending",     val: reportData.summary.inactive_marketplace_products, color: "#F59E0B" },
                        { label: "Out of Stock",           val: reportData.summary.out_of_stock,           color: "#EF4444" },
                        { label: "Avg Vendor Commission",  val: reportData.summary.avg_vendor_commission != null ? `${reportData.summary.avg_vendor_commission}%` : "-", color: "#8B5CF6" },
                      ].map(c => (
                        <div key={c.label} style={{ background: B.white, border: `1.5px solid ${B.border}`, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 130 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.val ?? 0}</div>
                          <div style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>{c.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Report Type Buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                    {[
                      { key: "marketplaces", label: "By Marketplace" },
                      { key: "vendors",      label: "By Vendor" },
                      { key: "products",     label: "By Product" },
                      { key: "pricing",      label: "Pricing Report" },
                      { key: "approvals",    label: "Status Report" },
                    ].map(r => (
                      <button key={r.key} onClick={() => loadReport(r.key)}
                        style={btn(reportData.type === r.key ? B.black : B.white, reportData.type === r.key ? B.yellow : B.black)}>
                        <BarChart3 size={12} />{r.label}
                      </button>
                    ))}
                  </div>
                  {/* Report Table */}
                  {loading ? <div style={{ padding: 24, textAlign: "center", color: B.muted }}>Loading report…</div> : reportData.rows.length > 0 && (
                    <div style={{ overflowX: "auto", border: `1px solid ${B.border}`, borderRadius: 10 }}>
                      <table style={tbl}>
                        {reportData.type === "marketplaces" && <>
                          <thead><tr>{["Marketplace","Status","Vendors","Products","Listings","Active","Avg Price"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                          <tbody>{reportData.rows.map((r,i) => <tr key={i}><td style={td}>{r.name}</td><td style={td}><Badge val={r.status} /></td><td style={td}>{r.vendor_count}</td><td style={td}>{r.product_count}</td><td style={td}>{r.total_listings}</td><td style={td}>{r.active_listings}</td><td style={td}>{r.avg_price ? `₹${r.avg_price}` : "-"}</td></tr>)}</tbody>
                        </>}
                        {reportData.type === "vendors" && <>
                          <thead><tr>{["Vendor","Code","Marketplaces","Listings","Avg Commission"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                          <tbody>{reportData.rows.map((r,i) => <tr key={i}><td style={{ ...td, fontWeight: 700 }}>{r.business_name}</td><td style={td}>{r.vendor_code || "-"}</td><td style={td}>{r.marketplace_count}</td><td style={td}>{r.listing_count}</td><td style={td}>{r.avg_commission != null ? `${r.avg_commission}%` : "-"}</td></tr>)}</tbody>
                        </>}
                        {reportData.type === "products" && <>
                          <thead><tr>{["Product","Code","Marketplaces","Listings","Active","Avg Price","Min","Max","Total Qty"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                          <tbody>{reportData.rows.map((r,i) => <tr key={i}><td style={{ ...td, fontWeight: 700 }}>{r.product_name}</td><td style={td}>{r.product_code || "-"}</td><td style={td}>{r.marketplace_count}</td><td style={td}>{r.total_listings}</td><td style={td}>{r.active_listings}</td><td style={td}>{r.avg_price ? `₹${r.avg_price}` : "-"}</td><td style={td}>{r.min_price ? `₹${r.min_price}` : "-"}</td><td style={td}>{r.max_price ? `₹${r.max_price}` : "-"}</td><td style={td}>{r.total_qty ?? 0}</td></tr>)}</tbody>
                        </>}
                        {reportData.type === "pricing" && <>
                          <thead><tr>{["Marketplace","Product","Code","Vendor","Price","Commission %","Commission ₹","Net Receivable","Status"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                          <tbody>{reportData.rows.map((r,i) => <tr key={i}><td style={td}>{r.marketplace}</td><td style={{ ...td, fontWeight: 700 }}>{r.product}</td><td style={td}>{r.product_code || "-"}</td><td style={td}>{r.vendor}</td><td style={td}>₹{r.price}</td><td style={td}>{r.commission_rate ?? 0}%</td><td style={{ ...td, color: "#EF4444" }}>₹{r.commission_amount ?? 0}</td><td style={{ ...td, color: "#10B981", fontWeight: 700 }}>₹{r.net_receivable ?? "-"}</td><td style={td}><Badge val={r.status} /></td></tr>)}</tbody>
                        </>}
                        {reportData.type === "approvals" && <>
                          <thead><tr>{["Marketplace","Product","Code","Vendor","Price","Status","Date"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                          <tbody>{reportData.rows.map((r,i) => <tr key={i}><td style={td}>{r.marketplace}</td><td style={{ ...td, fontWeight: 700 }}>{r.product}</td><td style={td}>{r.product_code || "-"}</td><td style={td}>{r.vendor}</td><td style={td}>₹{r.price}</td><td style={td}><Badge val={r.status} /></td><td style={td}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td></tr>)}</tbody>
                        </>}
                      </table>
                    </div>
                  )}
                  {!loading && reportData.type && reportData.rows.length === 0 && <EmptyState msg="No data for this report yet." />}
                </div>
              )}

            </>
          )}
        </div>
      </div>

      {/* ── MARKETPLACE MODAL ──────────────────────────────────────────────── */}
      {showMktModal && (
        <ModalShell title={editItem ? "Edit Marketplace" : "Add Marketplace"} onClose={() => setShowMktModal(false)} onSave={saveMkt} saving={actionLoading === "mkt-save"}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={lbl}>
              <span style={lbl_s}>Code</span>
              <input style={inp} value={mktForm.marketplace_code} onChange={e => setMktForm(p => ({ ...p, marketplace_code: e.target.value }))} placeholder="e.g. SWG-001" />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Name *</span>
              <input style={inp} value={mktForm.name} onChange={e => setMktForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Swiggy" />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Type</span>
              <select style={inp} value={mktForm.type} onChange={e => setMktForm(p => ({ ...p, type: e.target.value }))}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Status</span>
              <select style={inp} value={mktForm.status} onChange={e => setMktForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label style={{ ...lbl, gridColumn: "1/-1" }}>
              <span style={lbl_s}>Website URL</span>
              <input style={inp} value={mktForm.website_url} onChange={e => setMktForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Commission %</span>
              <input style={inp} type="number" min="0" step="0.01" value={mktForm.commission_percentage} onChange={e => setMktForm(p => ({ ...p, commission_percentage: e.target.value }))} />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Settlement Cycle</span>
              <input style={inp} value={mktForm.settlement_cycle} onChange={e => setMktForm(p => ({ ...p, settlement_cycle: e.target.value }))} placeholder="e.g. Weekly" />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Contact Person</span>
              <input style={inp} value={mktForm.contact_person} onChange={e => setMktForm(p => ({ ...p, contact_person: e.target.value }))} />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Contact Phone</span>
              <input style={inp} value={mktForm.contact_phone} onChange={e => setMktForm(p => ({ ...p, contact_phone: e.target.value }))} />
            </label>
            <label style={{ ...lbl, gridColumn: "1/-1" }}>
              <span style={lbl_s}>Contact Email</span>
              <input style={inp} type="email" value={mktForm.contact_email} onChange={e => setMktForm(p => ({ ...p, contact_email: e.target.value }))} />
            </label>
            <label style={{ ...lbl, gridColumn: "1/-1" }}>
              <span style={lbl_s}>Description</span>
              <textarea style={{ ...inp, resize: "vertical" }} rows={3} value={mktForm.description} onChange={e => setMktForm(p => ({ ...p, description: e.target.value }))} />
            </label>
          </div>
        </ModalShell>
      )}

      {/* ── VENDOR MODAL ───────────────────────────────────────────────────── */}
      {showVendModal && (
        <ModalShell title={editItem ? "Edit Vendor Listing" : "Link Vendor to Marketplace"} onClose={() => setShowVendModal(false)} onSave={saveVend} saving={actionLoading === "vend-save"}>
          <label style={lbl}>
            <span style={lbl_s}>Marketplace *</span>
            <select style={inp} value={vendForm.marketplace_id} onChange={e => setVendForm(p => ({ ...p, marketplace_id: e.target.value }))} disabled={!!editItem}>
              <option value="">Select Marketplace</option>
              {lookupMkts.map(m => <option key={m.id} value={m.id}>{mktLabel(m)}</option>)}
            </select>
            {lookupMkts.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No marketplaces found. Please create Marketplace Master first.</span>}
          </label>
          <label style={lbl}>
            <span style={lbl_s}>Vendor *</span>
            <select style={inp} value={vendForm.vendor_id} onChange={e => setVendForm(p => ({ ...p, vendor_id: e.target.value }))} disabled={!!editItem}>
              <option value="">Select Vendor</option>
              {lookupVendors.map(v => <option key={v.id} value={v.id}>{vendLabel(v)}</option>)}
            </select>
            {lookupVendors.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No vendors found. Please create Vendor Master first.</span>}
          </label>
          <label style={lbl}>
            <span style={lbl_s}>Commission Rate (%)</span>
            <input style={inp} type="number" min="0" step="0.01" value={vendForm.commission_rate} onChange={e => setVendForm(p => ({ ...p, commission_rate: e.target.value }))} placeholder="0.00" />
          </label>
          <label style={lbl}>
            <span style={lbl_s}>Status</span>
            <select style={inp} value={vendForm.status} onChange={e => setVendForm(p => ({ ...p, status: e.target.value }))}>
              {["pending", "active", "inactive", "blocked"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </ModalShell>
      )}

      {/* ── PRODUCT MODAL ──────────────────────────────────────────────────── */}
      {showProdModal && (
        <ModalShell title={editItem ? "Edit Product Listing" : "List Product on Marketplace"} onClose={() => setShowProdModal(false)} onSave={saveProd} saving={actionLoading === "prod-save"}>
          <label style={lbl}>
            <span style={lbl_s}>Marketplace *</span>
            <select style={inp} value={prodForm.marketplace_id} onChange={e => setProdForm(p => ({ ...p, marketplace_id: e.target.value }))} disabled={!!editItem}>
              <option value="">Select Marketplace</option>
              {lookupMkts.map(m => <option key={m.id} value={m.id}>{mktLabel(m)}</option>)}
            </select>
            {lookupMkts.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No marketplaces found. Please create Marketplace Master first.</span>}
          </label>
          <label style={lbl}>
            <span style={lbl_s}>Vendor *</span>
            <select style={inp} value={prodForm.vendor_id} onChange={e => setProdForm(p => ({ ...p, vendor_id: e.target.value }))} disabled={!!editItem}>
              <option value="">Select Vendor</option>
              {lookupVendors.map(v => <option key={v.id} value={v.id}>{vendLabel(v)}</option>)}
            </select>
            {lookupVendors.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No vendors found. Please create Vendor Master first.</span>}
          </label>
          <label style={lbl}>
            <span style={lbl_s}>Product *</span>
            <select style={inp} value={prodForm.product_id} onChange={e => {
              const pid = e.target.value;
              const prod = lookupProducts.find(p => String(p.id) === String(pid));
              const autoPrice = prod ? (prod.base_price || prod.selling_price || prod.price || "") : "";
              setProdForm(prev => ({ ...prev, product_id: pid, price: prev.price === "" ? String(autoPrice) : prev.price }));
            }} disabled={!!editItem}>
              <option value="">Select Product</option>
              {lookupProducts.map(p => <option key={p.id} value={p.id}>{prodLabel(p)}</option>)}
            </select>
            {lookupProducts.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No products found. Please create Product Master first.</span>}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={lbl}>
              <span style={lbl_s}>Price (₹) *</span>
              <input style={inp} type="number" min="0" step="0.01" value={prodForm.price} onChange={e => setProdForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Available Qty</span>
              <input style={inp} type="number" min="0" value={prodForm.available_qty} onChange={e => setProdForm(p => ({ ...p, available_qty: e.target.value }))} placeholder="0" />
            </label>
          </div>
          <label style={lbl}>
            <span style={lbl_s}>Status</span>
            <select style={inp} value={prodForm.status} onChange={e => setProdForm(p => ({ ...p, status: e.target.value }))}>
              {["active", "inactive", "out_of_stock"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </label>
        </ModalShell>
      )}

      {/* ── MAPPING MODAL ──────────────────────────────────────────────────── */}
      {showMapModal && (
        <ModalShell title={editItem ? "Edit Mapping" : "Map Product to Marketplace"} onClose={() => setShowMapModal(false)} onSave={saveMap} saving={actionLoading === "map-save"}>
          <label style={lbl}>
            <span style={lbl_s}>Marketplace *</span>
            <select style={inp} value={mapForm.marketplace_id} onChange={e => setMapForm(p => ({ ...p, marketplace_id: e.target.value }))} disabled={!!editItem}>
              <option value="">Select Marketplace</option>
              {lookupMkts.map(m => <option key={m.id} value={m.id}>{mktLabel(m)}</option>)}
            </select>
            {lookupMkts.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No marketplaces found. Please create Marketplace Master first.</span>}
          </label>
          <label style={lbl}>
            <span style={lbl_s}>Vendor *</span>
            <select style={inp} value={mapForm.vendor_id} onChange={e => setMapForm(p => ({ ...p, vendor_id: e.target.value }))} disabled={!!editItem}>
              <option value="">Select Vendor</option>
              {lookupVendors.map(v => <option key={v.id} value={v.id}>{vendLabel(v)}</option>)}
            </select>
            {lookupVendors.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No vendors found. Please create Vendor Master first.</span>}
          </label>
          <label style={lbl}>
            <span style={lbl_s}>Product *</span>
            <select style={inp} value={mapForm.product_id} onChange={e => {
              const pid = e.target.value;
              const prod = lookupProducts.find(p => String(p.id) === String(pid));
              const autoPrice = prod ? (prod.base_price || prod.selling_price || prod.price || "") : "";
              setMapForm(prev => ({ ...prev, product_id: pid, price: prev.price === "" ? String(autoPrice) : prev.price }));
            }} disabled={!!editItem}>
              <option value="">Select Product</option>
              {lookupProducts.map(p => <option key={p.id} value={p.id}>{prodLabel(p)}</option>)}
            </select>
            {lookupProducts.length === 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>No products found. Please create Product Master first.</span>}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={lbl}>
              <span style={lbl_s}>Price (₹) *</span>
              <input style={inp} type="number" min="0" step="0.01" value={mapForm.price} onChange={e => setMapForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Available Qty</span>
              <input style={inp} type="number" min="0" value={mapForm.available_qty} onChange={e => setMapForm(p => ({ ...p, available_qty: e.target.value }))} placeholder="0" />
            </label>
          </div>
          <label style={lbl}>
            <span style={lbl_s}>Status</span>
            <select style={inp} value={mapForm.status} onChange={e => setMapForm(p => ({ ...p, status: e.target.value }))}>
              {["active", "inactive", "out_of_stock"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </label>
        </ModalShell>
      )}

      {/* ── PRICE EDIT MODAL ───────────────────────────────────────────────── */}
      {showPriceModal && editItem && (
        <ModalShell title="Edit Price / Quantity" onClose={() => setShowPriceModal(false)} onSave={savePrice} saving={actionLoading === "price-save"}>
          <div style={{ background: B.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: B.black, marginBottom: 4 }}>{editItem.product_name || "-"}</div>
            <div style={{ color: B.muted }}>{editItem.marketplace_name || "-"} · {editItem.vendor_name || "-"}</div>
            {editItem.effective_commission_rate > 0 && (
              <div style={{ color: "#6366F1", marginTop: 4 }}>
                Commission source: vendor rate ({editItem.effective_commission_rate}%) — Net receivable: ₹{editItem.net_receivable ?? "-"}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={lbl}>
              <span style={lbl_s}>Price (₹)</span>
              <input style={inp} type="number" min="0" step="0.01" value={priceForm.price} onChange={e => setPriceForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
            </label>
            <label style={lbl}>
              <span style={lbl_s}>Available Qty</span>
              <input style={inp} type="number" min="0" value={priceForm.available_qty} onChange={e => setPriceForm(p => ({ ...p, available_qty: e.target.value }))} placeholder="0" />
            </label>
          </div>
        </ModalShell>
      )}

      {/* ── BULK STATUS MODAL ──────────────────────────────────────────────── */}
      {showBulkModal && (
        <ModalShell title={`Bulk Status Update (${selectedIds.length} selected)`} onClose={() => setShowBulkModal(false)} onSave={runBulkStatus} saving={actionLoading === "bulk-save"}>
          <p style={{ margin: "0 0 16px", color: B.muted, fontSize: 13 }}>Set status for all {selectedIds.length} selected product(s):</p>
          <label style={lbl}>
            <span style={lbl_s}>New Status</span>
            <select style={inp} value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </label>
        </ModalShell>
      )}

    </AdminLayout>
  );
}
