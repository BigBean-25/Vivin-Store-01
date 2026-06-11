import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle, BarChart3, CheckCircle2, CreditCard, Eye,
  FileText, IndianRupee, Pencil, Plus, Receipt, RefreshCw,
  Search, ShoppingBag, TrendingDown, Trash2, Truck, Users, X,
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

// ─── Status Config ────────────────────────────────────────────────────────────
const PAY_STATUSES = ["pending", "success", "failed", "cancelled", "refunded"];
const INV_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "cancelled"];

const PAY_COLORS = {
  pending:   { bg: "rgba(234,179,8,0.12)",   color: "#CA8A04" },
  success:   { bg: "rgba(22,163,74,0.12)",    color: "#16A34A" },
  failed:    { bg: "rgba(239,68,68,0.12)",    color: "#EF4444" },
  cancelled: { bg: "rgba(107,114,128,0.12)",  color: "#6B7280" },
  refunded:  { bg: "rgba(37,99,235,0.12)",    color: "#2563EB" },
};
const INV_COLORS = {
  draft:     { bg: "rgba(107,114,128,0.12)",  color: "#6B7280" },
  sent:      { bg: "rgba(37,99,235,0.12)",    color: "#2563EB" },
  partial:   { bg: "rgba(234,88,12,0.12)",    color: "#EA580C" },
  paid:      { bg: "rgba(22,163,74,0.12)",    color: "#16A34A" },
  overdue:   { bg: "rgba(239,68,68,0.12)",    color: "#EF4444" },
  cancelled: { bg: "rgba(107,114,128,0.12)",  color: "#6B7280" },
};

const PayBadge = ({ value }) => {
  const c = PAY_COLORS[value] || PAY_COLORS.pending;
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", background:c.bg, color:c.color }}>{value}</span>;
};
const InvBadge = ({ value }) => {
  const c = INV_COLORS[value] || INV_COLORS.draft;
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", background:c.bg, color:c.color }}>{value}</span>;
};

// ─── Blank forms ──────────────────────────────────────────────────────────────
const BLANK_PAY = { invoice_id:"", order_id:"", customer_id:"", vendor_id:"",
  payment_method_id:"", payment_date:"", amount:"", transaction_reference:"", remarks:"" };
const BLANK_EXP = { transaction_date:"", amount:"", description:"" };

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  .fn-page { padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .fn-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
  .fn-title  { font-size:22px; font-weight:900; color:#171717; margin:0; }
  .fn-subtitle { font-size:12px; color:#8A7A52; margin:2px 0 0; }

  .fn-stats { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:22px; }
  .fn-stat-card { display:flex; align-items:center; gap:12px; padding:16px 14px; background:#fff; border:1.5px solid rgba(232,224,199,0.5); border-radius:14px; box-shadow:0 2px 10px rgba(0,0,0,0.04); }
  .fn-stat-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .fn-stat-val   { font-size:14px; font-weight:900; color:#171717; line-height:1.2; }
  .fn-stat-label { font-size:10px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }
  .fn-stat-sub   { font-size:10px; color:#8A7A52; margin-top:1px; }

  .fn-tabs { display:flex; gap:4px; margin-bottom:16px; border-bottom:2px solid rgba(232,224,199,0.5); padding-bottom:0; flex-wrap:wrap; }
  .fn-tab  { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; font-size:13px; font-weight:700; border:none; background:transparent; cursor:pointer; color:#6B7280; border-bottom:2px solid transparent; margin-bottom:-2px; border-radius:8px 8px 0 0; }
  .fn-tab.active { color:#171717; border-bottom-color:#FFD21E; background:rgba(255,210,30,0.08); }
  .fn-tab:hover:not(.active) { background:rgba(255,210,30,0.05); color:#171717; }

  .fn-filters { display:flex; gap:10px; margin-bottom:14px; align-items:center; }
  .fn-search-wrap { position:relative; flex:1; max-width:320px; }
  .fn-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#8A7A52; pointer-events:none; }
  .fn-search { width:100%; height:36px; padding:0 12px 0 34px; border:1.5px solid rgba(232,224,199,0.7); border-radius:10px; font-size:13px; background:rgba(255,250,240,0.6); box-sizing:border-box; }
  .fn-search:focus { outline:none; border-color:#FFD21E; }

  .fn-panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
  .fn-count { font-size:13px; color:#8A7A52; font-weight:700; }
  .fn-note  { font-size:11px; color:#8A7A52; }

  .fn-table-wrap { overflow-x:auto; border:1.5px solid rgba(232,224,199,0.5); border-radius:12px; }
  .fn-table { width:100%; border-collapse:collapse; font-size:13px; }
  .fn-table th { padding:10px 12px; background:rgba(255,249,230,0.9); font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#6B7280; text-align:left; white-space:nowrap; }
  .fn-table td { padding:10px 12px; border-top:1px solid rgba(232,224,199,0.4); vertical-align:middle; }
  .fn-table tr:hover td { background:rgba(255,249,230,0.4); }
  .fn-empty { text-align:center !important; padding:40px 20px !important; color:#8A7A52; font-size:13px; }
  .fn-code   { font-family:monospace; font-size:12px; font-weight:700; background:rgba(255,210,30,0.12); padding:2px 8px; border-radius:6px; white-space:nowrap; }
  .fn-amount { font-family:monospace; font-weight:700; text-align:right; font-size:13px; }
  .fn-type-badge { font-size:11px; font-weight:700; text-transform:uppercase; background:rgba(37,99,235,0.1); color:#2563EB; padding:2px 8px; border-radius:6px; }

  .fn-actions { display:flex; gap:4px; }
  .fn-act-btn { width:28px; height:28px; border-radius:8px; border:1.5px solid rgba(232,224,199,0.7); background:transparent; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; color:#6B7280; }
  .fn-act-btn:hover { background:rgba(255,210,30,0.15); color:#171717; border-color:#FFD21E; }
  .fn-act-del:hover { background:rgba(239,68,68,0.1) !important; color:#EF4444 !important; border-color:#EF4444 !important; }

  .fn-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; font-size:13px; color:#EF4444; margin-bottom:14px; }
  .fn-alert button { margin-left:auto; background:none; border:none; cursor:pointer; color:#EF4444; display:flex; }

  .fn-loading { display:flex; align-items:center; gap:10px; padding:40px; justify-content:center; color:#8A7A52; font-size:14px; }

  .fn-dash-grid    { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .fn-dash-section { background:#fff; border:1.5px solid rgba(232,224,199,0.5); border-radius:14px; padding:16px 20px; }
  .fn-section-title { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:800; color:#6B7280; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:14px; }
  .fn-kpi-row  { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end; }
  .fn-kpi-item { display:flex; flex-direction:column; align-items:center; gap:4px; }
  .fn-kpi-count { font-size:20px; font-weight:900; color:#171717; }

  .fn-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
  .fn-modal    { background:#fff; border-radius:18px; width:100%; max-width:560px; box-shadow:0 24px 80px rgba(0,0,0,0.25); display:flex; flex-direction:column; max-height:90dvh; }
  .fn-modal-xl { max-width:880px; }
  .fn-modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1.5px solid rgba(232,224,199,0.5); gap:10px; }
  .fn-modal-head h2 { font-size:16px; font-weight:900; margin:0; }
  .fn-modal-head button { width:32px; height:32px; border-radius:8px; border:none; background:rgba(232,224,199,0.4); cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .fn-form-scroll { overflow-y:auto; flex:1; padding:16px 24px; display:flex; flex-direction:column; gap:12px; }
  .fn-form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .fn-field { display:flex; flex-direction:column; gap:5px; }
  .fn-field label { font-size:11px; font-weight:800; color:#6B7280; text-transform:uppercase; letter-spacing:0.04em; }
  .fn-field input,.fn-field select,.fn-field textarea { height:38px; padding:0 12px; border:1.5px solid rgba(232,224,199,0.7); border-radius:10px; font-size:13px; background:rgba(255,250,240,0.6); }
  .fn-field textarea { height:auto; padding:8px 12px; resize:vertical; }
  .fn-field input:focus,.fn-field select:focus,.fn-field textarea:focus { outline:none; border-color:#FFD21E; }
  .fn-form-error { display:flex; align-items:center; gap:6px; padding:8px 12px; background:rgba(239,68,68,0.08); border-radius:8px; font-size:12px; color:#EF4444; }
  .fn-modal-foot { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1.5px solid rgba(232,224,199,0.5); flex-wrap:wrap; }
  .fn-btn-cancel  { height:38px; padding:0 20px; border-radius:10px; background:rgba(232,224,199,0.3); border:none; cursor:pointer; font-size:13px; font-weight:700; }
  .fn-btn-save    { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 20px; border-radius:10px; background:#FFD21E; border:none; cursor:pointer; font-size:13px; font-weight:800; }
  .fn-btn-save:disabled { opacity:0.6; cursor:not-allowed; }
  .fn-btn-danger  { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 20px; border-radius:10px; background:#EF4444; color:#fff; border:none; cursor:pointer; font-size:13px; font-weight:800; }
  .fn-btn-outline { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 20px; border-radius:10px; background:transparent; border:2px solid #FFD21E; cursor:pointer; font-size:13px; font-weight:800; }
  .fn-btn-primary { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 18px; border-radius:10px; background:#FFD21E; color:#171717; border:none; cursor:pointer; font-size:13px; font-weight:800; }

  .fn-view-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
  .fn-view-field { display:flex; flex-direction:column; gap:3px; }
  .fn-view-field label { font-size:10px; font-weight:800; color:#8A7A52; text-transform:uppercase; letter-spacing:0.05em; }
  .fn-view-field span  { font-size:13px; color:#171717; }

  .theme-dark .fn-title,.theme-dark .fn-kpi-count,.theme-dark .fn-stat-val { color:#F8FAFC; }
  .theme-dark .fn-stat-card,.theme-dark .fn-dash-section { background:rgba(255,255,255,0.04); border-color:rgba(255,210,30,0.1); }
  .theme-dark .fn-table th { background:rgba(255,210,30,0.06); }
  .theme-dark .fn-table-wrap { border-color:rgba(255,210,30,0.1); }
  .theme-dark .fn-modal { background:#1A1A0A; }
  .theme-dark .fn-modal-head h2,.theme-dark .fn-view-field span { color:#F8FAFC; }
  .theme-dark .fn-field input,.theme-dark .fn-field select,.theme-dark .fn-field textarea { background:rgba(255,255,255,0.06); color:#F8FAFC; border-color:rgba(255,210,30,0.2); }
  .theme-dark .fn-tab.active { color:#F8FAFC; }
  .theme-dark .fn-search { background:rgba(255,255,255,0.06); color:#F8FAFC; }

  @keyframes fn-spin { to { transform:rotate(360deg); } }
  .spin { animation:fn-spin .8s linear infinite; }
  @media(max-width:1200px){ .fn-stats{ grid-template-columns:repeat(3,1fr); } }
  @media(max-width:768px){ .fn-stats{ grid-template-columns:repeat(2,1fr); } .fn-form-row{ grid-template-columns:1fr; } .fn-view-grid{ grid-template-columns:1fr 1fr; } .fn-dash-grid{ grid-template-columns:1fr; } }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Finance() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [activeTab,setActiveTab]= useState("dashboard");
  const [summary,  setSummary]  = useState({});
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [search,   setSearch]   = useState("");

  /* Payment form */
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [payFormMode,   setPayFormMode]   = useState("create");
  const [editPayId,     setEditPayId]     = useState(null);
  const [payForm,       setPayForm]       = useState(BLANK_PAY);
  const [payFormError,  setPayFormError]  = useState("");
  const [payDelConfirm, setPayDelConfirm] = useState(null);

  /* Payment status */
  const [showPayStatus,   setShowPayStatus]   = useState(false);
  const [payStatusTarget, setPayStatusTarget] = useState(null);
  const [newPayStatus,    setNewPayStatus]    = useState("");

  /* Invoice view + status */
  const [showInvView,     setShowInvView]     = useState(false);
  const [viewInvoice,     setViewInvoice]     = useState(null);
  const [invLoading,      setInvLoading]      = useState(false);
  const [showInvStatus,   setShowInvStatus]   = useState(false);
  const [invStatusTarget, setInvStatusTarget] = useState(null);
  const [newInvStatus,    setNewInvStatus]    = useState("");

  /* Expense form */
  const [showExpModal,  setShowExpModal]  = useState(false);
  const [expForm,       setExpForm]       = useState(BLANK_EXP);
  const [expFormError,  setExpFormError]  = useState("");
  const [expDelConfirm, setExpDelConfirm] = useState(null);

  /* Vendor Payments */
  const [vendorPay,    setVendorPay]    = useState([]);
  const [vendorPaySum, setVendorPaySum] = useState({});

  /* Customer Outstanding */
  const [outstanding,    setOutstanding]    = useState([]);
  const [outstandingSum, setOutstandingSum] = useState({});
  const [outTopCust,     setOutTopCust]     = useState([]);

  /* Finance Report */
  const [reportData,   setReportData]   = useState(null);
  const [reportFrom,   setReportFrom]   = useState("");
  const [reportTo,     setReportTo]     = useState("");

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const res = await API.get("/api/finance/summary");
      if (res.data.success) setSummary(res.data.summary || {});
    } catch {}
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/api/finance/payments");
      if (res.data.success) setPayments(res.data.payments || []);
    } catch (err) { setError(err.response?.data?.message || "Failed to load payments"); }
    finally { setLoading(false); }
  }, []);

  const fetchReceipts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/api/finance/receipts");
      if (res.data.success) setReceipts(res.data.receipts || []);
    } catch (err) { setError(err.response?.data?.message || "Failed to load receipts"); }
    finally { setLoading(false); }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/api/finance/expenses");
      if (res.data.success) setExpenses(res.data.expenses || []);
    } catch (err) { setError(err.response?.data?.message || "Failed to load expenses"); }
    finally { setLoading(false); }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/api/finance/invoices");
      if (res.data.success) setInvoices(res.data.invoices || []);
    } catch (err) { setError(err.response?.data?.message || "Failed to load invoices"); }
    finally { setLoading(false); }
  }, []);

  const fetchVendorPayments = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [s, r] = await Promise.all([
        API.get("/api/finance/vendor-payments/summary"),
        API.get("/api/finance/vendor-payments"),
      ]);
      if (s.data.success) setVendorPaySum(s.data.summary || {});
      if (r.data.success) setVendorPay(r.data.vendor_payments || []);
    } catch (err) { setError(err.response?.data?.message || "Failed to load vendor payments"); }
    finally { setLoading(false); }
  }, []);

  const fetchOutstanding = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [s, r] = await Promise.all([
        API.get("/api/finance/customer-outstanding/summary"),
        API.get("/api/finance/customer-outstanding"),
      ]);
      if (s.data.success) { setOutstandingSum(s.data.summary || {}); setOutTopCust(s.data.top_customers || []); }
      if (r.data.success) setOutstanding(r.data.outstanding || []);
    } catch (err) { setError(err.response?.data?.message || "Failed to load outstanding"); }
    finally { setLoading(false); }
  }, []);

  const fetchReport = useCallback(async (from, to) => {
    setLoading(true); setError("");
    try {
      const params = from && to ? `?from_date=${from}&to_date=${to}` : "";
      const res = await API.get(`/api/finance/report${params}`);
      if (res.data.success) setReportData(res.data);
    } catch (err) { setError(err.response?.data?.message || "Failed to load report"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const switchTab = (tab) => {
    setActiveTab(tab); setSearch(""); setError("");
    if (tab === "payments")        fetchPayments();
    if (tab === "receipts")        fetchReceipts();
    if (tab === "expenses")        fetchExpenses();
    if (tab === "invoices")        fetchInvoices();
    if (tab === "vendor-payments") fetchVendorPayments();
    if (tab === "outstanding")     fetchOutstanding();
    if (tab === "report")          fetchReport();
  };

  // ── Payment handlers ────────────────────────────────────────────────────────
  const openPayModal = (pay) => {
    if (pay) {
      setPayForm({
        invoice_id: pay.invoice_id || "", order_id: pay.order_id || "",
        customer_id: pay.customer_id || "", vendor_id: pay.vendor_id || "",
        payment_method_id: pay.payment_method_id || "",
        payment_date: pay.payment_date?.slice(0, 10) || "",
        amount: pay.amount || "", transaction_reference: pay.transaction_reference || "",
        remarks: pay.remarks || "",
      });
      setPayFormMode("edit"); setEditPayId(pay.id);
    } else {
      setPayForm(BLANK_PAY); setPayFormMode("create"); setEditPayId(null);
    }
    setPayFormError(""); setShowPayModal(true);
  };

  const handlePaySave = async () => {
    setPayFormError(""); setSaving(true);
    try {
      if (!payForm.amount || !payForm.payment_date) {
        setPayFormError("Amount and payment date are required");
        setSaving(false); return;
      }
      if (payFormMode === "edit") await API.put(`/api/finance/payments/${editPayId}`, payForm);
      else await API.post("/api/finance/payments", payForm);
      setShowPayModal(false); fetchPayments(); fetchSummary();
    } catch (err) { setPayFormError(err.response?.data?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handlePayDelete = async (id) => {
    try {
      await API.delete(`/api/finance/payments/${id}`);
      setPayDelConfirm(null); fetchPayments(); fetchSummary();
    } catch (err) { setError(err.response?.data?.message || "Failed to delete payment"); }
  };

  const handlePayStatus = async () => {
    try {
      await API.patch(`/api/finance/payments/${payStatusTarget.id}/status`, { status: newPayStatus });
      setShowPayStatus(false); fetchPayments(); fetchSummary();
    } catch (err) { setError(err.response?.data?.message || "Failed to update status"); }
  };

  // ── Invoice handlers ────────────────────────────────────────────────────────
  const openInvView = async (inv) => {
    setInvLoading(true); setShowInvView(true); setViewInvoice(inv);
    try {
      const res = await API.get(`/api/finance/invoices/${inv.id}`);
      if (res.data.success) setViewInvoice(res.data.invoice);
    } catch {}
    finally { setInvLoading(false); }
  };

  const handleInvStatus = async () => {
    try {
      await API.patch(`/api/finance/invoices/${invStatusTarget.id}/status`, { status: newInvStatus });
      setShowInvStatus(false); fetchInvoices(); fetchSummary();
    } catch (err) { setError(err.response?.data?.message || "Failed to update invoice status"); }
  };

  // ── Expense handlers ────────────────────────────────────────────────────────
  const handleExpSave = async () => {
    setExpFormError(""); setSaving(true);
    try {
      if (!expForm.amount || !expForm.transaction_date) {
        setExpFormError("Amount and date are required");
        setSaving(false); return;
      }
      await API.post("/api/finance/expenses", expForm);
      setShowExpModal(false); setExpForm(BLANK_EXP); fetchExpenses(); fetchSummary();
    } catch (err) { setExpFormError(err.response?.data?.message || "Failed to save expense"); }
    finally { setSaving(false); }
  };

  const handleExpDelete = async (id) => {
    try {
      await API.delete(`/api/finance/expenses/${id}`);
      setExpDelConfirm(null); fetchExpenses(); fetchSummary();
    } catch (err) { setError(err.response?.data?.message || "Failed to delete expense"); }
  };

  // ── Filtered data ────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const fPay = payments.filter((p) => !q || [p.payment_number, p.customer_name, p.vendor_name, p.transaction_reference].some((v) => v?.toLowerCase().includes(q)));
  const fRec = receipts.filter((r) => !q || [r.payment_number, r.customer_name, r.transaction_reference].some((v) => v?.toLowerCase().includes(q)));
  const fExp = expenses.filter((e) => !q || [e.transaction_number, e.description, e.reference_type].some((v) => v?.toLowerCase().includes(q)));
  const fInv = invoices.filter((i) => !q || [i.invoice_number, i.customer_name, i.vendor_name].some((v) => v?.toLowerCase().includes(q)));

  // ── Summary card data ────────────────────────────────────────────────────────
  const invS = summary.invoices || {};
  const payS = summary.payments || {};
  const expS = summary.expenses || {};

  const CARDS = [
    { label:"Total Invoices",    value:INR(invS.total_invoice_amount), sub:`${fmt(invS.total_invoices)} invoices`,    icon:FileText,     color:"#2563EB" },
    { label:"Collected",         value:INR(invS.total_paid),           sub:`${fmt(invS.paid_count)} paid`,            icon:CheckCircle2, color:"#16A34A" },
    { label:"Outstanding",       value:INR(invS.total_outstanding),    sub:`${fmt(invS.overdue_count)} overdue`,       icon:AlertCircle,  color:"#EF4444" },
    { label:"Total Payments",    value:INR(payS.total_payment_amount), sub:`${fmt(payS.total_payments)} transactions`, icon:CreditCard,   color:"#7C3AED" },
    { label:"Receipts Received", value:INR(payS.total_receipts),       sub:"From customers",                          icon:Receipt,      color:"#EA580C" },
    { label:"Total Expenses",    value:INR(expS.total_expense_amount), sub:`${fmt(expS.total_expenses)} entries`,      icon:TrendingDown, color:"#DC2626" },
  ];

  const TABS = [
    { key:"dashboard",      label:"Dashboard",      icon:BarChart3   },
    { key:"payments",       label:"Payments",       icon:CreditCard  },
    { key:"receipts",       label:"Receipts",       icon:Receipt     },
    { key:"expenses",       label:"Expenses",       icon:ShoppingBag },
    { key:"invoices",       label:"Invoices",       icon:FileText    },
    { key:"vendor-payments",label:"Vendor Pmts",    icon:Truck       },
    { key:"outstanding",    label:"Outstanding",    icon:Users       },
    { key:"report",         label:"P&L Report",     icon:IndianRupee },
  ];

  return (
    <AdminLayout>
      <style>{css}</style>
      <div className="fn-page">

        {/* Header */}
        <div className="fn-header">
          <div>
            <h1 className="fn-title">Finance</h1>
            <p className="fn-subtitle">Payments · Receipts · Expenses · Invoices</p>
          </div>
          <button className="fn-btn-primary" onClick={() => { fetchSummary(); if (activeTab !== "dashboard") switchTab(activeTab); }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="fn-stats">
          {CARDS.map((c) => (
            <div className="fn-stat-card" key={c.label}>
              <div className="fn-stat-icon" style={{ background:`${c.color}18`, color:c.color }}>
                <c.icon size={18} />
              </div>
              <div>
                <div className="fn-stat-val">{c.value}</div>
                <div className="fn-stat-label">{c.label}</div>
                <div className="fn-stat-sub">{c.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="fn-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`fn-tab${activeTab === t.key ? " active" : ""}`} onClick={() => switchTab(t.key)}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        {activeTab !== "dashboard" && (
          <div className="fn-filters">
            <div className="fn-search-wrap">
              <Search size={14} className="fn-search-icon" />
              <input className="fn-search" placeholder={`Search ${activeTab}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="fn-alert">
            <AlertCircle size={14} />{error}
            <button onClick={() => setError("")}><X size={13} /></button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="fn-loading"><RefreshCw size={20} className="spin" /> Loading…</div>
        )}

        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && !loading && (
          <div className="fn-dash-grid">
            <div className="fn-dash-section">
              <div className="fn-section-title"><FileText size={12} /> Invoice Status</div>
              <div className="fn-kpi-row">
                {INV_STATUSES.map((s) => (
                  <div className="fn-kpi-item" key={s}>
                    <InvBadge value={s} />
                    <div className="fn-kpi-count">{fmt(invS[s] || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="fn-dash-section">
              <div className="fn-section-title"><CreditCard size={12} /> Payment Status</div>
              <div className="fn-kpi-row">
                {[["pending","pending_count"],["success","success_count"],["failed","failed_count"],["refunded","refunded_count"]].map(([s, k]) => (
                  <div className="fn-kpi-item" key={s}>
                    <PayBadge value={s} />
                    <div className="fn-kpi-count">{fmt(payS[k] || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="fn-dash-section" style={{ gridColumn:"1 / -1" }}>
              <div className="fn-section-title"><IndianRupee size={12} /> Financial Summary</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
                {[
                  { label:"Invoice Total",    value: INR(invS.total_invoice_amount), color:"#2563EB" },
                  { label:"Total Collected",  value: INR(invS.total_paid),           color:"#16A34A" },
                  { label:"Total Outstanding",value: INR(invS.total_outstanding),    color:"#EF4444" },
                  { label:"Total Expenses",   value: INR(expS.total_expense_amount), color:"#DC2626" },
                ].map((k) => (
                  <div key={k.label} style={{ padding:"12px 16px", background:`${k.color}0A`, borderRadius:12, border:`1.5px solid ${k.color}22` }}>
                    <div style={{ fontSize:18, fontWeight:900, color:k.color, fontFamily:"monospace" }}>{k.value}</div>
                    <div style={{ fontSize:11, color:"#6B7280", marginTop:3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em" }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {activeTab === "payments" && !loading && (
          <div>
            <div className="fn-panel-head">
              <span className="fn-count">{fPay.length} payments</span>
              <button className="fn-btn-primary" onClick={() => openPayModal(null)}><Plus size={13} /> New Payment</button>
            </div>
            <div className="fn-table-wrap">
              <table className="fn-table">
                <thead>
                  <tr><th>#</th><th>Payment No</th><th>Date</th><th>Customer / Vendor</th><th>Method</th><th>Invoice</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {fPay.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color:"#8A7A52", fontSize:11 }}>{p.id}</td>
                      <td><span className="fn-code">{safe(p.payment_number)}</span></td>
                      <td style={{ fontSize:12 }}>{fmtDate(p.payment_date)}</td>
                      <td>
                        {p.customer_name
                          ? <span style={{ color:"#2563EB", fontWeight:600 }}>{p.customer_name}</span>
                          : p.vendor_name
                          ? <span style={{ color:"#7C3AED", fontWeight:600 }}>{p.vendor_name}</span>
                          : "—"}
                      </td>
                      <td style={{ fontSize:12 }}>{safe(p.payment_method_name)}</td>
                      <td style={{ fontSize:11 }}>{safe(p.invoice_number)}</td>
                      <td className="fn-amount">{INR(p.amount)}</td>
                      <td><PayBadge value={p.status} /></td>
                      <td>
                        <div className="fn-actions">
                          <button className="fn-act-btn" title="Edit" onClick={() => openPayModal(p)}><Pencil size={12} /></button>
                          <button className="fn-act-btn" title="Status" onClick={() => { setPayStatusTarget(p); setNewPayStatus(p.status); setShowPayStatus(true); }}><CheckCircle2 size={12} /></button>
                          <button className="fn-act-btn fn-act-del" title="Delete" onClick={() => setPayDelConfirm(p)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {fPay.length === 0 && <tr><td colSpan={9} className="fn-empty"><CreditCard size={24} /><br />No payments found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── RECEIPTS ── */}
        {activeTab === "receipts" && !loading && (
          <div>
            <div className="fn-panel-head">
              <span className="fn-count">{fRec.length} receipts</span>
              <span className="fn-note">Customer payments received · sourced from payments table</span>
            </div>
            <div className="fn-table-wrap">
              <table className="fn-table">
                <thead>
                  <tr><th>#</th><th>Payment No</th><th>Date</th><th>Customer</th><th>Method</th><th>Invoice</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {fRec.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color:"#8A7A52", fontSize:11 }}>{r.id}</td>
                      <td><span className="fn-code">{safe(r.payment_number)}</span></td>
                      <td style={{ fontSize:12 }}>{fmtDate(r.payment_date)}</td>
                      <td style={{ fontWeight:600 }}>{safe(r.customer_name)}</td>
                      <td style={{ fontSize:12 }}>{safe(r.payment_method_name)}</td>
                      <td style={{ fontSize:11 }}>{safe(r.invoice_number)}</td>
                      <td className="fn-amount">{INR(r.amount)}</td>
                      <td><PayBadge value={r.status} /></td>
                    </tr>
                  ))}
                  {fRec.length === 0 && <tr><td colSpan={8} className="fn-empty"><Receipt size={24} /><br />No receipts found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EXPENSES ── */}
        {activeTab === "expenses" && !loading && (
          <div>
            <div className="fn-panel-head">
              <span className="fn-count">{fExp.length} expenses</span>
              <button className="fn-btn-primary" onClick={() => { setExpForm(BLANK_EXP); setExpFormError(""); setShowExpModal(true); }}><Plus size={13} /> Add Expense</button>
            </div>
            <div className="fn-table-wrap">
              <table className="fn-table">
                <thead>
                  <tr><th>#</th><th>Txn No</th><th>Date</th><th>Description</th><th>Ref Type</th><th>Amount</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {fExp.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color:"#8A7A52", fontSize:11 }}>{e.id}</td>
                      <td><span className="fn-code">{safe(e.transaction_number)}</span></td>
                      <td style={{ fontSize:12 }}>{fmtDate(e.transaction_date)}</td>
                      <td style={{ fontSize:13 }}>{safe(e.description)}</td>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{safe(e.reference_type)}</td>
                      <td className="fn-amount">{INR(e.amount)}</td>
                      <td>
                        <div className="fn-actions">
                          <button className="fn-act-btn fn-act-del" title="Delete" onClick={() => setExpDelConfirm(e)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {fExp.length === 0 && <tr><td colSpan={7} className="fn-empty"><TrendingDown size={24} /><br />No expenses found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── INVOICES ── */}
        {activeTab === "invoices" && !loading && (
          <div>
            <div className="fn-panel-head">
              <span className="fn-count">{fInv.length} invoices</span>
            </div>
            <div className="fn-table-wrap">
              <table className="fn-table">
                <thead>
                  <tr><th>#</th><th>Invoice No</th><th>Type</th><th>Date</th><th>Due</th><th>Customer / Vendor</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {fInv.map((i) => (
                    <tr key={i.id}>
                      <td style={{ color:"#8A7A52", fontSize:11 }}>{i.id}</td>
                      <td><span className="fn-code">{safe(i.invoice_number)}</span></td>
                      <td><span className="fn-type-badge">{i.invoice_type}</span></td>
                      <td style={{ fontSize:12 }}>{fmtDate(i.invoice_date)}</td>
                      <td style={{ fontSize:12, color: i.status === "overdue" ? "#EF4444" : undefined }}>{fmtDate(i.due_date)}</td>
                      <td>
                        {i.customer_name
                          ? <span style={{ color:"#2563EB", fontWeight:600 }}>{i.customer_name}</span>
                          : i.vendor_name
                          ? <span style={{ color:"#7C3AED", fontWeight:600 }}>{i.vendor_name}</span>
                          : "—"}
                      </td>
                      <td className="fn-amount">{INR(i.total_amount)}</td>
                      <td className="fn-amount" style={{ color:"#16A34A" }}>{INR(i.paid_amount)}</td>
                      <td className="fn-amount" style={{ color: Number(i.balance_amount) > 0 ? "#EF4444" : "#6B7280" }}>{INR(i.balance_amount)}</td>
                      <td><InvBadge value={i.status} /></td>
                      <td>
                        <div className="fn-actions">
                          <button className="fn-act-btn" title="View" onClick={() => openInvView(i)}><Eye size={12} /></button>
                          <button className="fn-act-btn" title="Update Status" onClick={() => { setInvStatusTarget(i); setNewInvStatus(i.status); setShowInvStatus(true); }}><CheckCircle2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {fInv.length === 0 && <tr><td colSpan={11} className="fn-empty"><FileText size={24} /><br />No invoices found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VENDOR PAYMENTS ── */}
        {activeTab === "vendor-payments" && !loading && (
          <div>
            <div className="fn-panel-head">
              <span className="fn-count">{vendorPay.filter((v) => !search || [v.vendor_name, v.vendor_code, v.reference_number, v.po_number].some((x) => x?.toLowerCase().includes(search.toLowerCase()))).length} payments</span>
              <div style={{ display:"flex", gap:10, fontSize:12, color:"#6B7280" }}>
                <span>Paid: <strong style={{color:"#16A34A"}}>{INR(vendorPaySum.paid_amount)}</strong></span>
                <span>Pending: <strong style={{color:"#CA8A04"}}>{INR(vendorPaySum.pending_amount)}</strong></span>
              </div>
            </div>
            <div className="fn-table-wrap">
              <table className="fn-table">
                <thead><tr><th>#</th><th>Date</th><th>Vendor</th><th>PO No</th><th>Mode</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {vendorPay
                    .filter((v) => !search || [v.vendor_name, v.vendor_code, v.reference_number, v.po_number].some((x) => x?.toLowerCase().includes(search.toLowerCase())))
                    .map((v) => (
                    <tr key={v.id}>
                      <td style={{color:"#8A7A52",fontSize:11}}>{v.id}</td>
                      <td style={{fontSize:12}}>{fmtDate(v.payment_date)}</td>
                      <td><span style={{fontWeight:600,color:"#7C3AED"}}>{safe(v.vendor_name)}</span><br/><span style={{fontSize:10,color:"#8A7A52"}}>{safe(v.vendor_code)}</span></td>
                      <td style={{fontSize:11}}><span className="fn-code">{safe(v.po_number)}</span></td>
                      <td style={{fontSize:12}}>{safe(v.payment_mode)}</td>
                      <td style={{fontSize:11}}>{safe(v.reference_number)}</td>
                      <td className="fn-amount">{INR(v.amount)}</td>
                      <td><span style={{display:"inline-flex",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,textTransform:"uppercase",background:v.status==="paid"?"rgba(22,163,74,0.12)":v.status==="pending"?"rgba(234,179,8,0.12)":"rgba(107,114,128,0.12)",color:v.status==="paid"?"#16A34A":v.status==="pending"?"#CA8A04":"#6B7280"}}>{v.status}</span></td>
                    </tr>
                  ))}
                  {vendorPay.length === 0 && <tr><td colSpan={8} className="fn-empty"><Truck size={24}/><br/>No vendor payments found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CUSTOMER OUTSTANDING ── */}
        {activeTab === "outstanding" && !loading && (
          <div>
            <div className="fn-panel-head">
              <div style={{display:"flex",gap:16,fontSize:12,flexWrap:"wrap"}}>
                <span className="fn-count">{outstanding.filter((o) => !search || [o.invoice_number, o.customer_name].some((x) => x?.toLowerCase().includes(search.toLowerCase()))).length} invoices outstanding</span>
                <span style={{color:"#EF4444",fontWeight:700}}>Total: {INR(outstandingSum.total_outstanding)}</span>
                <span style={{color:"#DC2626",fontWeight:700}}>Overdue: {INR(outstandingSum.overdue_amount)} ({fmt(outstandingSum.overdue_count)})</span>
              </div>
            </div>
            {outTopCust.length > 0 && (
              <div style={{marginBottom:14,padding:"12px 16px",background:"rgba(239,68,68,0.04)",border:"1.5px solid rgba(239,68,68,0.15)",borderRadius:12}}>
                <div className="fn-section-title" style={{marginBottom:10}}><Users size={12}/> Top Outstanding Customers</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {outTopCust.map((c) => (
                    <div key={c.id} style={{padding:"6px 12px",background:"#fff",borderRadius:10,border:"1.5px solid rgba(239,68,68,0.2)",fontSize:12}}>
                      <strong>{c.customer_name}</strong>
                      <span style={{display:"block",fontSize:11,color:"#EF4444",fontWeight:700,fontFamily:"monospace"}}>{INR(c.outstanding_amount)}</span>
                      <span style={{fontSize:10,color:"#8A7A52"}}>{fmt(c.invoice_count)} inv</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="fn-table-wrap">
              <table className="fn-table">
                <thead><tr><th>#</th><th>Invoice No</th><th>Customer</th><th>Phone</th><th>Invoice Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {outstanding
                    .filter((o) => !search || [o.invoice_number, o.customer_name].some((x) => x?.toLowerCase().includes(search.toLowerCase())))
                    .map((o) => (
                    <tr key={o.id}>
                      <td style={{color:"#8A7A52",fontSize:11}}>{o.id}</td>
                      <td><span className="fn-code">{safe(o.invoice_number)}</span></td>
                      <td style={{fontWeight:600,color:"#2563EB"}}>{safe(o.customer_name)}</td>
                      <td style={{fontSize:11,color:"#6B7280"}}>{safe(o.customer_phone)}</td>
                      <td style={{fontSize:12}}>{fmtDate(o.invoice_date)}</td>
                      <td style={{fontSize:12,color:o.status==="overdue"?"#EF4444":undefined}}>{fmtDate(o.due_date)}</td>
                      <td className="fn-amount">{INR(o.total_amount)}</td>
                      <td className="fn-amount" style={{color:"#16A34A"}}>{INR(o.paid_amount)}</td>
                      <td className="fn-amount" style={{color:"#EF4444",fontWeight:900}}>{INR(o.balance_amount)}</td>
                      <td><span style={{display:"inline-flex",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,textTransform:"uppercase",background:o.status==="overdue"?"rgba(239,68,68,0.12)":"rgba(234,88,12,0.12)",color:o.status==="overdue"?"#EF4444":"#EA580C"}}>{o.status}</span></td>
                    </tr>
                  ))}
                  {outstanding.length === 0 && <tr><td colSpan={10} className="fn-empty"><Users size={24}/><br/>No outstanding invoices</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── P&L REPORT ── */}
        {activeTab === "report" && !loading && (
          <div>
            <div className="fn-panel-head">
              <span className="fn-count">Finance Report</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} style={{height:34,padding:"0 10px",border:"1.5px solid rgba(232,224,199,0.7)",borderRadius:10,fontSize:12}} />
                <span style={{fontSize:12,color:"#8A7A52"}}>to</span>
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} style={{height:34,padding:"0 10px",border:"1.5px solid rgba(232,224,199,0.7)",borderRadius:10,fontSize:12}} />
                <button className="fn-btn-primary" onClick={() => fetchReport(reportFrom || undefined, reportTo || undefined)} style={{height:34,fontSize:12}}><RefreshCw size={13}/> Run</button>
              </div>
            </div>
            {reportData && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                {[
                  {label:"Total Invoiced (Sales)",  value:INR(reportData.report?.revenue?.total_invoiced),         color:"#2563EB"},
                  {label:"Total Collected",          value:INR(reportData.report?.revenue?.total_collected),        color:"#16A34A"},
                  {label:"Revenue Outstanding",      value:INR(reportData.report?.revenue?.total_outstanding),      color:"#EF4444"},
                  {label:"Receipts Received",        value:INR(reportData.report?.receipts?.total_received),        color:"#EA580C"},
                  {label:"Vendor Payments Made",     value:INR(reportData.report?.vendor_payments?.total_vendor_paid), color:"#7C3AED"},
                  {label:"Total Expenses",           value:INR(reportData.report?.expenses?.total_expenses),        color:"#DC2626"},
                  {label:"GST Output (Collected)",   value:INR(reportData.report?.gst_output?.total_gst_output),   color:"#0891B2"},
                  {label:"GST Input (ITC)",          value:INR(reportData.report?.gst_input?.total_gst_input),     color:"#059669"},
                  {label:"Net GST Payable",          value:INR(reportData.report?.net_gst_payable),                color:"#D97706"},
                ].map((k) => (
                  <div key={k.label} style={{padding:"16px 18px",background:`${k.color}08`,borderRadius:12,border:`1.5px solid ${k.color}22`}}>
                    <div style={{fontSize:20,fontWeight:900,color:k.color,fontFamily:"monospace"}}>{k.value}</div>
                    <div style={{fontSize:11,color:"#6B7280",marginTop:4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>{k.label}</div>
                  </div>
                ))}
                <div style={{gridColumn:"1 / -1",padding:"20px 24px",background:reportData.report?.net_profit>=0?"rgba(22,163,74,0.06)":"rgba(239,68,68,0.06)",borderRadius:14,border:`2px solid ${reportData.report?.net_profit>=0?"rgba(22,163,74,0.3)":"rgba(239,68,68,0.3)"}`}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Net Profit (Collected − Vendor Payments − Expenses)</div>
                  <div style={{fontSize:32,fontWeight:900,color:reportData.report?.net_profit>=0?"#16A34A":"#EF4444",fontFamily:"monospace"}}>{INR(reportData.report?.net_profit)}</div>
                  <div style={{fontSize:11,color:"#8A7A52",marginTop:4}}>Period: {reportData.period?.from} → {reportData.period?.to}</div>
                </div>
              </div>
            )}
            {!reportData && (
              <div style={{padding:"40px 0",textAlign:"center",color:"#8A7A52",fontSize:13}}>
                <IndianRupee size={28} style={{display:"block",margin:"0 auto 10px",opacity:0.4}}/>
                Select a date range and click Run to generate the report
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ MODALS ══════════════════════════════════════════════ */}

        {/* Payment Form Modal */}
        {showPayModal && (
          <div className="fn-overlay" onClick={() => setShowPayModal(false)}>
            <div className="fn-modal" onClick={(e) => e.stopPropagation()}>
              <div className="fn-modal-head">
                <h2>{payFormMode === "edit" ? "Edit Payment" : "New Payment"}</h2>
                <button onClick={() => setShowPayModal(false)}><X size={18} /></button>
              </div>
              <div className="fn-form-scroll">
                <div className="fn-form-row">
                  <div className="fn-field"><label>Payment Date *</label><input type="date" value={payForm.payment_date} onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))} /></div>
                  <div className="fn-field"><label>Amount (₹) *</label><input type="number" step="0.01" min="0" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
                </div>
                <div className="fn-form-row">
                  <div className="fn-field"><label>Customer ID</label><input type="number" value={payForm.customer_id} onChange={(e) => setPayForm((f) => ({ ...f, customer_id: e.target.value }))} placeholder="Customer ID…" /></div>
                  <div className="fn-field"><label>Vendor ID</label><input type="number" value={payForm.vendor_id} onChange={(e) => setPayForm((f) => ({ ...f, vendor_id: e.target.value }))} placeholder="Vendor ID…" /></div>
                </div>
                <div className="fn-form-row">
                  <div className="fn-field"><label>Invoice ID</label><input type="number" value={payForm.invoice_id} onChange={(e) => setPayForm((f) => ({ ...f, invoice_id: e.target.value }))} placeholder="Invoice ID…" /></div>
                  <div className="fn-field"><label>Order ID</label><input type="number" value={payForm.order_id} onChange={(e) => setPayForm((f) => ({ ...f, order_id: e.target.value }))} placeholder="Order ID…" /></div>
                </div>
                <div className="fn-field"><label>Transaction Reference</label><input value={payForm.transaction_reference} onChange={(e) => setPayForm((f) => ({ ...f, transaction_reference: e.target.value }))} placeholder="UTR / Cheque / Ref no…" /></div>
                <div className="fn-field"><label>Remarks</label><textarea value={payForm.remarks} onChange={(e) => setPayForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Remarks…" rows={2} /></div>
                {payFormError && <div className="fn-form-error"><X size={13} />{payFormError}</div>}
              </div>
              <div className="fn-modal-foot">
                <button className="fn-btn-cancel" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="fn-btn-save" onClick={handlePaySave} disabled={saving}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><CheckCircle2 size={14} /> Save</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status Modal */}
        {showPayStatus && payStatusTarget && (
          <div className="fn-overlay" onClick={() => setShowPayStatus(false)}>
            <div className="fn-modal" style={{ maxWidth:380 }} onClick={(e) => e.stopPropagation()}>
              <div className="fn-modal-head"><h2>Update Payment Status</h2><button onClick={() => setShowPayStatus(false)}><X size={18} /></button></div>
              <div style={{ padding:"20px 24px" }}>
                <p style={{ fontSize:13, marginBottom:14 }}>Payment: <strong>{payStatusTarget.payment_number}</strong></p>
                <div className="fn-field"><label>New Status</label>
                  <select value={newPayStatus} onChange={(e) => setNewPayStatus(e.target.value)}>
                    {PAY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="fn-modal-foot">
                <button className="fn-btn-cancel" onClick={() => setShowPayStatus(false)}>Cancel</button>
                <button className="fn-btn-save" onClick={handlePayStatus}><CheckCircle2 size={14} /> Update</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Delete Confirm */}
        {payDelConfirm && (
          <div className="fn-overlay" onClick={() => setPayDelConfirm(null)}>
            <div className="fn-modal" style={{ maxWidth:380 }} onClick={(e) => e.stopPropagation()}>
              <div className="fn-modal-head"><h2>Delete Payment</h2><button onClick={() => setPayDelConfirm(null)}><X size={18} /></button></div>
              <div style={{ padding:"20px 24px", fontSize:14 }}>Delete payment <strong>{payDelConfirm.payment_number}</strong>? This cannot be undone.</div>
              <div className="fn-modal-foot">
                <button className="fn-btn-cancel" onClick={() => setPayDelConfirm(null)}>Cancel</button>
                <button className="fn-btn-danger" onClick={() => handlePayDelete(payDelConfirm.id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Expense Form Modal */}
        {showExpModal && (
          <div className="fn-overlay" onClick={() => setShowExpModal(false)}>
            <div className="fn-modal" style={{ maxWidth:440 }} onClick={(e) => e.stopPropagation()}>
              <div className="fn-modal-head"><h2>Add Expense</h2><button onClick={() => setShowExpModal(false)}><X size={18} /></button></div>
              <div className="fn-form-scroll">
                <div className="fn-form-row">
                  <div className="fn-field"><label>Date *</label><input type="date" value={expForm.transaction_date} onChange={(e) => setExpForm((f) => ({ ...f, transaction_date: e.target.value }))} /></div>
                  <div className="fn-field"><label>Amount (₹) *</label><input type="number" step="0.01" min="0" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
                </div>
                <div className="fn-field"><label>Description</label><input value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} placeholder="Expense description…" /></div>
                {expFormError && <div className="fn-form-error"><X size={13} />{expFormError}</div>}
              </div>
              <div className="fn-modal-foot">
                <button className="fn-btn-cancel" onClick={() => setShowExpModal(false)}>Cancel</button>
                <button className="fn-btn-save" onClick={handleExpSave} disabled={saving}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><CheckCircle2 size={14} /> Save</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expense Delete Confirm */}
        {expDelConfirm && (
          <div className="fn-overlay" onClick={() => setExpDelConfirm(null)}>
            <div className="fn-modal" style={{ maxWidth:380 }} onClick={(e) => e.stopPropagation()}>
              <div className="fn-modal-head"><h2>Delete Expense</h2><button onClick={() => setExpDelConfirm(null)}><X size={18} /></button></div>
              <div style={{ padding:"20px 24px", fontSize:14 }}>Delete <strong>{expDelConfirm.transaction_number}</strong>? This cannot be undone.</div>
              <div className="fn-modal-foot">
                <button className="fn-btn-cancel" onClick={() => setExpDelConfirm(null)}>Cancel</button>
                <button className="fn-btn-danger" onClick={() => handleExpDelete(expDelConfirm.id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice View Modal */}
        {showInvView && viewInvoice && (
          <div className="fn-overlay" onClick={() => setShowInvView(false)}>
            <div className="fn-modal fn-modal-xl" onClick={(e) => e.stopPropagation()}>
              <div className="fn-modal-head">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <h2>{viewInvoice.invoice_number}</h2>
                  <InvBadge value={viewInvoice.status} />
                </div>
                <button onClick={() => setShowInvView(false)}><X size={18} /></button>
              </div>
              {invLoading ? (
                <div style={{ padding:40, textAlign:"center" }}><RefreshCw size={24} className="spin" /></div>
              ) : (
                <div className="fn-form-scroll">
                  <div className="fn-view-grid">
                    <div className="fn-view-field"><label>Type</label><span><span className="fn-type-badge">{viewInvoice.invoice_type}</span></span></div>
                    <div className="fn-view-field"><label>Invoice Date</label><span>{fmtDate(viewInvoice.invoice_date)}</span></div>
                    <div className="fn-view-field"><label>Due Date</label><span style={{ color: viewInvoice.status === "overdue" ? "#EF4444" : undefined }}>{fmtDate(viewInvoice.due_date)}</span></div>
                    <div className="fn-view-field"><label>Customer</label><span style={{ color:"#2563EB" }}>{safe(viewInvoice.customer_name)}</span></div>
                    <div className="fn-view-field"><label>Vendor</label><span style={{ color:"#7C3AED" }}>{safe(viewInvoice.vendor_name)}</span></div>
                    <div className="fn-view-field"><label>Subtotal</label><span className="fn-amount">{INR(viewInvoice.subtotal)}</span></div>
                    <div className="fn-view-field"><label>Discount</label><span className="fn-amount">{INR(viewInvoice.discount_amount)}</span></div>
                    <div className="fn-view-field"><label>Tax</label><span className="fn-amount">{INR(viewInvoice.tax_amount)}</span></div>
                    <div className="fn-view-field"><label>Total</label><span className="fn-amount" style={{ fontSize:15, fontWeight:900 }}>{INR(viewInvoice.total_amount)}</span></div>
                    <div className="fn-view-field"><label>Paid</label><span className="fn-amount" style={{ color:"#16A34A" }}>{INR(viewInvoice.paid_amount)}</span></div>
                    <div className="fn-view-field"><label>Balance</label><span className="fn-amount" style={{ color:"#EF4444" }}>{INR(viewInvoice.balance_amount)}</span></div>
                  </div>

                  {(viewInvoice.items || []).length > 0 && (
                    <>
                      <div className="fn-section-title"><ShoppingBag size={12} /> Line Items ({viewInvoice.items.length})</div>
                      <div className="fn-table-wrap">
                        <table className="fn-table">
                          <thead><tr><th>#</th><th>Product</th><th>Description</th><th>HSN</th><th>Qty</th><th>Unit Price</th><th>Taxable</th><th>Tax%</th><th>Tax Amt</th><th>Total</th></tr></thead>
                          <tbody>
                            {viewInvoice.items.map((it, idx) => (
                              <tr key={it.id}>
                                <td>{idx + 1}</td>
                                <td style={{ fontSize:12 }}>{safe(it.product_name)}</td>
                                <td style={{ fontSize:12 }}>{safe(it.description)}</td>
                                <td style={{ fontSize:11 }}>{safe(it.hsn_code)}</td>
                                <td>{it.quantity}</td>
                                <td className="fn-amount">{INR(it.unit_price)}</td>
                                <td className="fn-amount">{INR(it.taxable_amount)}</td>
                                <td style={{ fontSize:12 }}>{it.tax_rate}%</td>
                                <td className="fn-amount">{INR(it.tax_amount)}</td>
                                <td className="fn-amount" style={{ fontWeight:900 }}>{INR(it.total_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="fn-modal-foot">
                <button className="fn-btn-cancel" onClick={() => setShowInvView(false)}>Close</button>
                <button className="fn-btn-outline" onClick={() => { setShowInvView(false); setInvStatusTarget(viewInvoice); setNewInvStatus(viewInvoice.status); setShowInvStatus(true); }}>
                  <CheckCircle2 size={14} /> Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Status Modal */}
        {showInvStatus && invStatusTarget && (
          <div className="fn-overlay" onClick={() => setShowInvStatus(false)}>
            <div className="fn-modal" style={{ maxWidth:380 }} onClick={(e) => e.stopPropagation()}>
              <div className="fn-modal-head"><h2>Update Invoice Status</h2><button onClick={() => setShowInvStatus(false)}><X size={18} /></button></div>
              <div style={{ padding:"20px 24px" }}>
                <p style={{ fontSize:13, marginBottom:14 }}>Invoice: <strong>{invStatusTarget.invoice_number}</strong></p>
                <div className="fn-field"><label>New Status</label>
                  <select value={newInvStatus} onChange={(e) => setNewInvStatus(e.target.value)}>
                    {INV_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="fn-modal-foot">
                <button className="fn-btn-cancel" onClick={() => setShowInvStatus(false)}>Cancel</button>
                <button className="fn-btn-save" onClick={handleInvStatus}><CheckCircle2 size={14} /> Update</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
