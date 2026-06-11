import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Check, CheckCircle2, ChevronRight, Edit2, Eye, Key,
  Loader2, Lock, LogIn, Package, Plus, RefreshCw, Search,
  Shield, ShieldCheck, Trash2, Users, X, XCircle,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../api/axios";

/* ── CSS ──────────────────────────────────────────────────────────────── */
const CSS = `
.ac { max-width: 1200px; margin: 0 auto; padding: 24px 18px; font-family: 'Segoe UI',sans-serif; color:#151515; }
.ac-hero { background: linear-gradient(135deg,#151515 0%,#2a2a2a 100%); border-radius:16px; padding:28px 32px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px; }
.ac-hero-left h1 { color:#fff; font-size:22px; font-weight:900; margin:0 0 4px; }
.ac-hero-left p  { color:#C9B96E; font-size:13px; margin:0; }
.ac-hero-right   { display:flex; gap:10px; flex-wrap:wrap; }
.ac-btn  { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:8px; font-size:13px; font-weight:700; border:none; cursor:pointer; transition:opacity .15s; }
.ac-btn:disabled { opacity:.5; cursor:not-allowed; }
.ac-btn-gold     { background:#C9B96E; color:#fff; }
.ac-btn-gold:hover:not(:disabled){ opacity:.88; }
.ac-btn-soft     { background:#2a2a2a; color:#C9B96E; border:1px solid #3a3a3a; }
.ac-btn-soft:hover:not(:disabled){ background:#333; }
.ac-btn-red      { background:#EF4444; color:#fff; }
.ac-btn-red:hover:not(:disabled){ opacity:.88; }
.ac-btn-green    { background:#22C55E; color:#fff; }
.ac-btn-green:hover:not(:disabled){ opacity:.88; }
.ac-btn-sm { padding:5px 12px; font-size:12px; }
.ac-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:24px; }
.ac-card  { background:#fff; border:1.5px solid #E8E0C7; border-radius:12px; padding:18px; }
.ac-card span { font-size:12px; color:#8A7A52; font-weight:600; display:block; margin-bottom:6px; }
.ac-card strong { font-size:26px; font-weight:900; color:#151515; }
.ac-card.dark { background:#151515; }
.ac-card.dark span { color:#C9B96E; }
.ac-card.dark strong { color:#fff; }
.ac-alert { padding:10px 14px; border-radius:8px; font-size:12px; font-weight:600; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
.ac-alert-err { background:#FEE2E2; color:#991B1B; border:1px solid #FECACA; }
.ac-alert-ok  { background:#DCFCE7; color:#166534; border:1px solid #BBF7D0; }
.ac-tabs { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:20px; border-bottom:2px solid #E8E0C7; padding-bottom:0; }
.ac-tab  { padding:9px 16px; font-size:13px; font-weight:700; border:none; background:transparent; color:#8A7A52; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; border-radius:6px 6px 0 0; transition:all .15s; }
.ac-tab.active { color:#C9B96E; border-bottom-color:#C9B96E; background:#FFF8E6; }
.ac-tab:hover:not(.active){ background:#F5F0E8; }
.ac-toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
.ac-search { display:flex; align-items:center; gap:8px; background:#FAFAF7; border:1.5px solid #E0D8C0; border-radius:8px; padding:8px 12px; flex:1; min-width:200px; }
.ac-search input { border:none; background:transparent; font-size:13px; outline:none; width:100%; }
.ac-select { border:1.5px solid #E0D8C0; border-radius:8px; padding:8px 12px; font-size:13px; background:#FAFAF7; outline:none; }
.ac-table-wrap { overflow-x:auto; border-radius:10px; border:1.5px solid #E8E0C7; }
.ac-table { width:100%; border-collapse:collapse; font-size:13px; }
.ac-table th { background:#FAFAF7; color:#8A7A52; font-weight:700; padding:10px 14px; text-align:left; border-bottom:1.5px solid #E8E0C7; white-space:nowrap; }
.ac-table td { padding:10px 14px; border-bottom:1px solid #F5F0E8; vertical-align:middle; }
.ac-table tr:last-child td { border-bottom:none; }
.ac-table tr:hover td { background:#FAFAF7; }
.ac-empty { text-align:center; padding:40px; color:#9A8A6A; }
.ac-empty svg { opacity:.3; margin-bottom:8px; }
.ac-badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700; }
.ac-badge-active  { background:#DCFCE7; color:#166534; }
.ac-badge-inactive{ background:#F3F4F6; color:#6B7280; }
.ac-badge-blocked { background:#FEE2E2; color:#991B1B; }
.ac-badge-success { background:#DCFCE7; color:#166534; }
.ac-badge-failed  { background:#FEE2E2; color:#991B1B; }
.ac-badge-pending { background:#FEF3C7; color:#92400E; }
.ac-actions { display:flex; gap:6px; }
.ac-icon-btn { width:30px; height:30px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #E0D8C0; background:#FAFAF7; cursor:pointer; transition:background .15s; }
.ac-icon-btn:hover { background:#F0EBD8; }
.ac-icon-btn.danger:hover { background:#FEE2E2; border-color:#FECACA; }
.ac-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; color:#8A7A52; gap:10px; }
.spin { animation:spin .7s linear infinite; }
@keyframes spin { to{transform:rotate(360deg);} }
/* modal */
.ac-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.ac-modal { background:#fff; border-radius:16px; padding:28px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; }
.ac-modal h3 { font-size:17px; font-weight:900; margin:0 0 20px; color:#151515; }
.ac-modal-footer { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; padding-top:16px; border-top:1px solid #F0EBD8; }
.ac-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.ac-form-grid .full { grid-column:1/-1; }
.ac-field { display:flex; flex-direction:column; gap:5px; }
.ac-field label { font-size:12px; font-weight:700; color:#4A4A4A; }
.ac-field input, .ac-field select, .ac-field textarea { border:1.5px solid #E0D8C0; border-radius:8px; padding:9px 12px; font-size:13px; background:#FAFAF7; outline:none; width:100%; box-sizing:border-box; }
.ac-field input:focus, .ac-field select:focus, .ac-field textarea:focus { border-color:#C9B96E; background:#fff; }
.ac-field textarea { resize:vertical; min-height:68px; }
/* checkbox grid */
.ac-check-section { margin-bottom:18px; }
.ac-check-section h4 { font-size:12px; font-weight:800; color:#8A7A52; text-transform:uppercase; letter-spacing:.8px; margin:0 0 8px; }
.ac-check-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:8px; }
.ac-check-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; border:1.5px solid #E0D8C0; background:#FAFAF7; cursor:pointer; font-size:13px; transition:border-color .15s; }
.ac-check-item.checked { border-color:#C9B96E; background:#FFF8E6; }
.ac-check-item input { accent-color:#C9B96E; }
@media(max-width:680px){ .ac-form-grid{grid-template-columns:1fr;} .ac-hero{flex-direction:column;} }
`;

const TABS = [
  { key: "users",       label: "Users",            icon: Users },
  { key: "roles",       label: "Roles",            icon: Shield },
  { key: "permissions", label: "Role Permissions", icon: Key },
  { key: "outlets",     label: "Outlet Access",    icon: Package },
  { key: "modules",     label: "Module Access",    icon: Lock },
  { key: "logs",        label: "Login Logs",       icon: LogIn },
  { key: "password",    label: "Password / Status",icon: Key },
  { key: "approvals",   label: "Approvals",        icon: CheckCircle2 },
];

const USER_TYPES = ["staff","admin","vendor","customer","warehouse_staff","delivery_driver"];
const STATUS_COLORS = { active:"active", inactive:"inactive", blocked:"blocked", success:"success", failed:"failed", pending:"pending" };
const Badge = ({ v }) => <span className={`ac-badge ac-badge-${STATUS_COLORS[v]||"inactive"}`}>{v||"—"}</span>;
const fmt = (v) => v == null ? "—" : String(v);
const fmtDate = (v) => { try { return v ? new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"; } catch { return "—"; } };

/* ── Modal wrapper ── */
function Modal({ title, onClose, children, footer }) {
  return (
    <div className="ac-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ac-modal">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={20} /></button>
        </div>
        {children}
        {footer && <div className="ac-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Field helpers ── */
function Field({ label, children, full }) {
  return <div className={`ac-field${full?" full":""}`}><label>{label}</label>{children}</div>;
}

export default function AccessControl() {
  const [tab, setTab] = useState("users");
  const [summary, setSummary] = useState({ total_users:0, active_users:0, total_roles:0, pending_approvals:0 });
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [modules, setModules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logSummary, setLogSummary] = useState({ total:0, success_count:0, failed_count:0, today:0 });
  const [approvals, setApprovals] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  /* ── Modals ── */
  const [userModal, setUserModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [pwModal, setPwModal] = useState(null);
  const [permModal, setPermModal] = useState(null);
  const [outletModal, setOutletModal] = useState(null);
  const [moduleModal, setModuleModal] = useState(null);

  /* ── Form state ── */
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const showOk = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };
  const showErr = (msg) => setError(msg);

  /* ── Load summary ── */
  const loadSummary = useCallback(async () => {
    try {
      const [u, a, ls] = await Promise.allSettled([
        api.get("/api/access/users/summary"),
        api.get("/api/access/approvals/summary"),
        api.get("/api/access/login-logs/summary"),
      ]);
      const ud = u.status === "fulfilled" ? u.value.data : {};
      const ad = a.status === "fulfilled" ? a.value.data : {};
      const lsd = ls.status === "fulfilled" ? ls.value.data : {};
      setSummary({ total_users: ud.total_users||0, active_users: ud.active_users||0, total_roles: ud.total_roles||0, pending_approvals: ad.pending_approvals||0 });
      setLogSummary({ total: lsd.total||0, success_count: lsd.success_count||0, failed_count: lsd.failed_count||0, today: lsd.today||0 });
    } catch {}
  }, []);

  /* ── Load tab data ── */
  const loadTab = useCallback(async (t) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (t === "users") {
        const { data } = await api.get("/api/access/users", { params: { limit:100 } });
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else if (t === "roles") {
        const { data } = await api.get("/api/access/roles");
        setRoles(Array.isArray(data.data) ? data.data : []);
      } else if (t === "permissions") {
        const { data } = await api.get("/api/access/permissions");
        setPermissions(Array.isArray(data.data) ? data.data : []);
        const rd = await api.get("/api/access/roles");
        setRoles(Array.isArray(rd.data.data) ? rd.data.data : []);
      } else if (t === "outlets") {
        const { data } = await api.get("/api/access/outlets");
        setOutlets(Array.isArray(data.data) ? data.data : []);
        const ud = await api.get("/api/access/users", { params:{ limit:100 } });
        setUsers(Array.isArray(ud.data.data) ? ud.data.data : []);
      } else if (t === "modules") {
        const { data } = await api.get("/api/access/modules");
        setModules(Array.isArray(data.data) ? data.data : []);
        const ud = await api.get("/api/access/users", { params:{ limit:100 } });
        setUsers(Array.isArray(ud.data.data) ? ud.data.data : []);
      } else if (t === "logs") {
        const { data } = await api.get("/api/access/login-logs", { params:{ limit:100 } });
        setLogs(Array.isArray(data.data) ? data.data : []);
      } else if (t === "password") {
        const { data } = await api.get("/api/access/users", { params:{ limit:100 } });
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else if (t === "approvals") {
        const { data } = await api.get("/api/access/approvals");
        setApprovals(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadTab(tab); setSearch(""); setStatusFilter(""); }, [tab, loadTab]);

  /* ── Filtered lists ── */
  const fUsers = useMemo(() => {
    let list = Array.isArray(users) ? users : [];
    if (search) list = list.filter(u => `${u.name} ${u.email} ${u.phone||""}`.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) list = list.filter(u => u.status === statusFilter);
    return list;
  }, [users, search, statusFilter]);

  const fLogs = useMemo(() => {
    let list = Array.isArray(logs) ? logs : [];
    if (search) list = list.filter(l => `${l.email||""} ${l.ip_address||""} ${l.user_name||""}`.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) list = list.filter(l => l.status === statusFilter);
    return list;
  }, [logs, search, statusFilter]);

  /* ── User CRUD ── */
  const saveUser = async () => {
    setSaving(true);
    try {
      if (userModal?.id) {
        await api.put(`/api/access/users/${userModal.id}`, form);
        showOk("User updated");
      } else {
        await api.post("/api/access/users", form);
        showOk("User created");
      }
      setUserModal(null); loadTab("users"); loadSummary();
    } catch (e) { showErr(e?.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/api/access/users/${id}/status`, { status });
      showOk(`Status → ${status}`); loadTab(tab); loadSummary();
    } catch (e) { showErr(e?.response?.data?.message || "Failed"); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/api/access/users/${id}`);
      showOk("User deleted"); loadTab("users"); loadSummary();
    } catch (e) { showErr(e?.response?.data?.message || "Delete failed"); }
  };

  /* ── Role CRUD ── */
  const saveRole = async () => {
    setSaving(true);
    try {
      if (roleModal?.id) {
        await api.put(`/api/access/roles/${roleModal.id}`, form);
        showOk("Role updated");
      } else {
        await api.post("/api/access/roles", form);
        showOk("Role created");
      }
      setRoleModal(null); loadTab("roles");
    } catch (e) { showErr(e?.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const deleteRole = async (id) => {
    if (!window.confirm("Delete this role?")) return;
    try {
      await api.delete(`/api/access/roles/${id}`);
      showOk("Role deleted"); loadTab("roles");
    } catch (e) { showErr(e?.response?.data?.message || "Delete failed"); }
  };

  /* ── Password reset ── */
  const resetPassword = async () => {
    if (!form.password) return showErr("Enter new password");
    setSaving(true);
    try {
      await api.patch(`/api/access/users/${pwModal.id}/password`, { password: form.password });
      showOk("Password updated"); setPwModal(null); setForm({});
    } catch (e) { showErr(e?.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const forceReset = async (id) => {
    try {
      const { data } = await api.patch(`/api/access/users/${id}/force-reset`, {});
      showOk(`Force-reset done. Temp: ${data.temp_password}`);
    } catch (e) { showErr(e?.response?.data?.message || "Failed"); }
  };

  /* ── Permissions ── */
  const [selRoleId, setSelRoleId] = useState("");
  const [rolePermIds, setRolePermIds] = useState([]);
  const loadRolePerms = async (rid) => {
    setSelRoleId(rid);
    if (!rid) return setRolePermIds([]);
    try {
      const { data } = await api.get(`/api/access/roles/${rid}/permissions`);
      setRolePermIds(Array.isArray(data.permission_ids) ? data.permission_ids.map(Number) : []);
    } catch { setRolePermIds([]); }
  };
  const saveRolePerms = async () => {
    setSaving(true);
    try {
      await api.put(`/api/access/roles/${selRoleId}/permissions`, { permission_ids: rolePermIds });
      showOk("Permissions saved");
    } catch (e) { showErr(e?.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };
  const permsByModule = useMemo(() => {
    const map = {};
    (Array.isArray(permissions) ? permissions : []).forEach(p => {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    });
    return map;
  }, [permissions]);

  /* ── Outlet Access ── */
  const [selUserId, setSelUserId] = useState("");
  const [userOutletIds, setUserOutletIds] = useState([]);
  const loadUserOutlets = async (uid) => {
    setSelUserId(uid);
    if (!uid) return setUserOutletIds([]);
    try {
      const { data } = await api.get(`/api/access/users/${uid}/outlets`);
      setUserOutletIds(Array.isArray(data.outlet_ids) ? data.outlet_ids.map(Number) : []);
    } catch { setUserOutletIds([]); }
  };
  const saveUserOutlets = async () => {
    setSaving(true);
    try {
      await api.put(`/api/access/users/${selUserId}/outlets`, { outlet_ids: userOutletIds });
      showOk("Outlet access saved");
    } catch (e) { showErr(e?.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  /* ── Module Access ── */
  const [selModUserId, setSelModUserId] = useState("");
  const [userModKeys, setUserModKeys] = useState([]);
  const loadUserModules = async (uid) => {
    setSelModUserId(uid);
    if (!uid) return setUserModKeys([]);
    try {
      const { data } = await api.get(`/api/access/users/${uid}/modules`);
      setUserModKeys(Array.isArray(data.module_keys) ? data.module_keys : []);
    } catch { setUserModKeys([]); }
  };
  const saveUserModules = async () => {
    setSaving(true);
    try {
      await api.put(`/api/access/users/${selModUserId}/modules`, { module_keys: userModKeys });
      showOk("Module access saved");
    } catch (e) { showErr(e?.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  /* ── Approvals ── */
  const doApprove = async (id) => {
    try { await api.patch(`/api/access/approvals/${id}/approve`); showOk("User approved"); loadTab("approvals"); loadSummary(); }
    catch (e) { showErr(e?.response?.data?.message || "Failed"); }
  };
  const doReject = async (id) => {
    try { await api.patch(`/api/access/approvals/${id}/reject`); showOk("User rejected"); loadTab("approvals"); loadSummary(); }
    catch (e) { showErr(e?.response?.data?.message || "Failed"); }
  };

  /* ── Render ── */
  return (
    <AdminLayout>
      <style>{CSS}</style>
      <div className="ac">
        {/* Hero */}
        <div className="ac-hero">
          <div className="ac-hero-left">
            <h1>User Management &amp; Access Control</h1>
            <p>Manage users, roles, permissions, outlet access, module access and login activity</p>
          </div>
          <div className="ac-hero-right">
            <button className="ac-btn ac-btn-soft" onClick={() => { loadSummary(); loadTab(tab); }}>
              <RefreshCw size={15} /> Refresh
            </button>
            {tab === "users" && (
              <button className="ac-btn ac-btn-gold" onClick={() => { setForm({}); setUserModal({}); }}>
                <Plus size={15} /> Add User
              </button>
            )}
            {tab === "roles" && (
              <button className="ac-btn ac-btn-gold" onClick={() => { setForm({}); setRoleModal({}); }}>
                <Plus size={15} /> Add Role
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="ac-cards">
          <div className="ac-card dark"><span>Total Users</span><strong>{summary.total_users}</strong></div>
          <div className="ac-card"><span>Active Users</span><strong>{summary.active_users}</strong></div>
          <div className="ac-card"><span>Total Roles</span><strong>{summary.total_roles}</strong></div>
          <div className="ac-card"><span>Pending Approvals</span><strong>{summary.pending_approvals}</strong></div>
          <div className="ac-card"><span>Login Today</span><strong>{logSummary.today}</strong></div>
          <div className="ac-card"><span>Failed Logins</span><strong>{logSummary.failed_count}</strong></div>
        </div>

        {/* Alerts */}
        {error && <div className="ac-alert ac-alert-err"><AlertCircle size={16}/>{error}<button style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setError("")}><X size={14}/></button></div>}
        {success && <div className="ac-alert ac-alert-ok"><CheckCircle2 size={16}/>{success}</div>}

        {/* Tabs */}
        <div className="ac-tabs">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} className={`ac-tab${tab===t.key?" active":""}`} onClick={() => setTab(t.key)}>
                <Icon size={14} style={{marginRight:4,verticalAlign:"middle"}}/>{t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="ac-loading"><Loader2 size={28} className="spin"/><span>Loading…</span></div>
        ) : (
          <>
            {/* ── USERS TAB ── */}
            {tab === "users" && (
              <>
                <div className="ac-toolbar">
                  <div className="ac-search"><Search size={15}/><input placeholder="Search name, email, phone…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                  <select className="ac-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div className="ac-table-wrap">
                  <table className="ac-table">
                    <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                    <tbody>
                      {fUsers.length ? fUsers.map((u,i) => (
                        <tr key={u.id}>
                          <td>{i+1}</td>
                          <td><strong>{fmt(u.name)}</strong></td>
                          <td>{fmt(u.email)}</td>
                          <td>{fmt(u.phone)}</td>
                          <td><span style={{fontSize:11,background:"#F0EBD8",padding:"2px 8px",borderRadius:12}}>{fmt(u.user_type)}</span></td>
                          <td>{fmt(u.role_name)}</td>
                          <td><Badge v={u.status}/></td>
                          <td>{fmtDate(u.created_at)}</td>
                          <td>
                            <div className="ac-actions">
                              <button className="ac-icon-btn" title="Edit" onClick={()=>{setForm({...u});setUserModal(u);}}><Edit2 size={13}/></button>
                              <button className="ac-icon-btn" title="Reset Password" onClick={()=>{setForm({});setPwModal(u);}}><Key size={13}/></button>
                              <button className="ac-icon-btn danger" title="Delete" onClick={()=>deleteUser(u.id)}><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={9} className="ac-empty"><Users size={32}/><br/>No users found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── ROLES TAB ── */}
            {tab === "roles" && (
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead><tr><th>#</th><th>Name</th><th>Display Name</th><th>Description</th><th>Users</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {roles.length ? roles.map((r,i) => (
                      <tr key={r.id}>
                        <td>{i+1}</td>
                        <td><code style={{fontSize:12,background:"#F0EBD8",padding:"2px 6px",borderRadius:4}}>{fmt(r.name)}</code></td>
                        <td><strong>{fmt(r.display_name)}</strong></td>
                        <td>{fmt(r.description)}</td>
                        <td>{fmt(r.user_count)}</td>
                        <td><Badge v={r.status}/></td>
                        <td>
                          <div className="ac-actions">
                            <button className="ac-icon-btn" title="Edit" onClick={()=>{setForm({...r});setRoleModal(r);}}><Edit2 size={13}/></button>
                            <button className="ac-icon-btn danger" title="Delete" onClick={()=>deleteRole(r.id)}><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="ac-empty"><Shield size={32}/><br/>No roles found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PERMISSIONS TAB ── */}
            {tab === "permissions" && (
              <>
                <div className="ac-toolbar">
                  <select className="ac-select" value={selRoleId} onChange={e=>loadRolePerms(e.target.value)}>
                    <option value="">— Select Role —</option>
                    {roles.map(r=><option key={r.id} value={r.id}>{r.display_name}</option>)}
                  </select>
                  {selRoleId && <button className="ac-btn ac-btn-gold" onClick={saveRolePerms} disabled={saving}>{saving?<Loader2 size={13} className="spin"/>:<Check size={13}/>} Save Permissions</button>}
                </div>
                {selRoleId ? (
                  Object.keys(permsByModule).length ? Object.entries(permsByModule).map(([mod, perms]) => (
                    <div key={mod} className="ac-check-section">
                      <h4>{mod}</h4>
                      <div className="ac-check-grid">
                        {perms.map(p => {
                          const checked = rolePermIds.includes(p.id);
                          return (
                            <label key={p.id} className={`ac-check-item${checked?" checked":""}`}>
                              <input type="checkbox" checked={checked} onChange={e=>setRolePermIds(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id))}/>
                              {p.display_name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )) : <div className="ac-empty">No permissions defined yet</div>
                ) : <div className="ac-empty"><Key size={32}/><br/>Select a role to manage permissions</div>}
              </>
            )}

            {/* ── OUTLET ACCESS TAB ── */}
            {tab === "outlets" && (
              <>
                <div className="ac-toolbar">
                  <select className="ac-select" value={selUserId} onChange={e=>loadUserOutlets(e.target.value)}>
                    <option value="">— Select User —</option>
                    {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                  {selUserId && <button className="ac-btn ac-btn-gold" onClick={saveUserOutlets} disabled={saving}>{saving?<Loader2 size={13} className="spin"/>:<Check size={13}/>} Save Outlet Access</button>}
                </div>
                {selUserId ? (
                  outlets.length ? (
                    <div className="ac-check-section">
                      <h4>Outlet Access</h4>
                      <div className="ac-check-grid">
                        {outlets.map(o => {
                          const checked = userOutletIds.includes(o.id);
                          return (
                            <label key={o.id} className={`ac-check-item${checked?" checked":""}`}>
                              <input type="checkbox" checked={checked} onChange={e=>setUserOutletIds(prev=>e.target.checked?[...prev,o.id]:prev.filter(x=>x!==o.id))}/>
                              {o.name} {o.city ? `(${o.city})` : ""}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : <div className="ac-empty">No outlets found</div>
                ) : <div className="ac-empty"><Package size={32}/><br/>Select a user to manage outlet access</div>}
              </>
            )}

            {/* ── MODULE ACCESS TAB ── */}
            {tab === "modules" && (
              <>
                <div className="ac-toolbar">
                  <select className="ac-select" value={selModUserId} onChange={e=>loadUserModules(e.target.value)}>
                    <option value="">— Select User —</option>
                    {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                  {selModUserId && <button className="ac-btn ac-btn-gold" onClick={saveUserModules} disabled={saving}>{saving?<Loader2 size={13} className="spin"/>:<Check size={13}/>} Save Module Access</button>}
                </div>
                {selModUserId ? (
                  modules.length ? (
                    <div className="ac-check-section">
                      <h4>Module Access</h4>
                      <div className="ac-check-grid">
                        {modules.map(m => {
                          const checked = userModKeys.includes(m.module_key);
                          return (
                            <label key={m.module_key} className={`ac-check-item${checked?" checked":""}`}>
                              <input type="checkbox" checked={checked} onChange={e=>setUserModKeys(prev=>e.target.checked?[...prev,m.module_key]:prev.filter(x=>x!==m.module_key))}/>
                              {m.module_name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : <div className="ac-empty">No modules found</div>
                ) : <div className="ac-empty"><Lock size={32}/><br/>Select a user to manage module access</div>}
              </>
            )}

            {/* ── LOGIN LOGS TAB ── */}
            {tab === "logs" && (
              <>
                <div className="ac-cards" style={{marginBottom:16}}>
                  <div className="ac-card"><span>Total Logs</span><strong>{logSummary.total}</strong></div>
                  <div className="ac-card"><span>Success</span><strong style={{color:"#166534"}}>{logSummary.success_count}</strong></div>
                  <div className="ac-card"><span>Failed</span><strong style={{color:"#991B1B"}}>{logSummary.failed_count}</strong></div>
                  <div className="ac-card"><span>Today</span><strong>{logSummary.today}</strong></div>
                </div>
                <div className="ac-toolbar">
                  <div className="ac-search"><Search size={15}/><input placeholder="Search email, IP…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                  <select className="ac-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                    <option value="">All</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="ac-table-wrap">
                  <table className="ac-table">
                    <thead><tr><th>#</th><th>User</th><th>Email</th><th>IP Address</th><th>Status</th><th>Message</th><th>Time</th></tr></thead>
                    <tbody>
                      {fLogs.length ? fLogs.map((l,i) => (
                        <tr key={l.id}>
                          <td>{i+1}</td>
                          <td>{fmt(l.user_name)}</td>
                          <td>{fmt(l.email)}</td>
                          <td>{fmt(l.ip_address)}</td>
                          <td><Badge v={l.status}/></td>
                          <td>{fmt(l.message)}</td>
                          <td>{fmtDate(l.created_at)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={7} className="ac-empty"><LogIn size={32}/><br/>No login logs found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── PASSWORD / STATUS TAB ── */}
            {tab === "password" && (
              <>
                <div className="ac-toolbar">
                  <div className="ac-search"><Search size={15}/><input placeholder="Search users…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                </div>
                <div className="ac-table-wrap">
                  <table className="ac-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th>Status Actions</th><th>Password</th></tr></thead>
                    <tbody>
                      {fUsers.length ? fUsers.map(u => (
                        <tr key={u.id}>
                          <td><strong>{fmt(u.name)}</strong></td>
                          <td>{fmt(u.email)}</td>
                          <td>{fmt(u.user_type)}</td>
                          <td><Badge v={u.status}/></td>
                          <td>
                            <div className="ac-actions" style={{flexWrap:"wrap"}}>
                              {u.status !== "active"   && <button className="ac-btn ac-btn-green ac-btn-sm" onClick={()=>changeStatus(u.id,"active")}>Activate</button>}
                              {u.status !== "inactive" && u.user_type !== "super_admin" && <button className="ac-btn ac-btn-soft ac-btn-sm" onClick={()=>changeStatus(u.id,"inactive")}>Inactivate</button>}
                              {u.status !== "blocked"  && u.user_type !== "super_admin" && <button className="ac-btn ac-btn-red ac-btn-sm" onClick={()=>changeStatus(u.id,"blocked")}>Block</button>}
                            </div>
                          </td>
                          <td>
                            <div className="ac-actions">
                              <button className="ac-btn ac-btn-gold ac-btn-sm" onClick={()=>{setForm({});setPwModal(u);}}><Key size={12}/> Reset</button>
                              {u.user_type !== "super_admin" && <button className="ac-btn ac-btn-soft ac-btn-sm" onClick={()=>forceReset(u.id)}>Force Reset</button>}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="ac-empty">No users</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── APPROVALS TAB ── */}
            {tab === "approvals" && (
              <>
                <p style={{fontSize:13,color:"#8A7A52",marginBottom:14}}>Users with <strong>inactive</strong> status awaiting approval.</p>
                <div className="ac-table-wrap">
                  <table className="ac-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Role</th><th>Registered</th><th>Actions</th></tr></thead>
                    <tbody>
                      {approvals.length ? approvals.map(u => (
                        <tr key={u.id}>
                          <td><strong>{fmt(u.name)}</strong></td>
                          <td>{fmt(u.email)}</td>
                          <td>{fmt(u.phone)}</td>
                          <td>{fmt(u.user_type)}</td>
                          <td>{fmt(u.role_name)}</td>
                          <td>{fmtDate(u.created_at)}</td>
                          <td>
                            <div className="ac-actions">
                              <button className="ac-btn ac-btn-green ac-btn-sm" onClick={()=>doApprove(u.id)}><Check size={12}/> Approve</button>
                              <button className="ac-btn ac-btn-red ac-btn-sm" onClick={()=>doReject(u.id)}><XCircle size={12}/> Reject</button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={7} className="ac-empty"><CheckCircle2 size={32}/><br/>No pending approvals</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── USER MODAL ── */}
        {userModal !== null && (
          <Modal title={userModal?.id ? "Edit User" : "Create User"} onClose={()=>setUserModal(null)}
            footer={<>
              <button className="ac-btn ac-btn-soft" onClick={()=>setUserModal(null)}>Cancel</button>
              <button className="ac-btn ac-btn-gold" onClick={saveUser} disabled={saving}>{saving?<Loader2 size={13} className="spin"/>:<Check size={13}/>} {userModal?.id?"Update":"Create"}</button>
            </>}>
            <div className="ac-form-grid">
              <Field label="Full Name *"><input value={form.name||""} onChange={e=>setF("name",e.target.value)} placeholder="John Doe"/></Field>
              <Field label="Email *"><input type="email" value={form.email||""} onChange={e=>setF("email",e.target.value)} placeholder="email@example.com"/></Field>
              <Field label="Phone"><input value={form.phone||""} onChange={e=>setF("phone",e.target.value)} placeholder="+91 9876543210"/></Field>
              {!userModal?.id && <Field label="Password *"><input type="password" value={form.password||""} onChange={e=>setF("password",e.target.value)} placeholder="Min 6 chars"/></Field>}
              <Field label="User Type">
                <select value={form.user_type||"staff"} onChange={e=>setF("user_type",e.target.value)}>
                  {USER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status||"active"} onChange={e=>setF("status",e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </Field>
              <Field label="Assign Role">
                <select value={form.role_id||""} onChange={e=>setF("role_id",e.target.value)}>
                  <option value="">— No Role —</option>
                  {roles.map(r=><option key={r.id} value={r.id}>{r.display_name}</option>)}
                </select>
              </Field>
            </div>
          </Modal>
        )}

        {/* ── ROLE MODAL ── */}
        {roleModal !== null && (
          <Modal title={roleModal?.id ? "Edit Role" : "Create Role"} onClose={()=>setRoleModal(null)}
            footer={<>
              <button className="ac-btn ac-btn-soft" onClick={()=>setRoleModal(null)}>Cancel</button>
              <button className="ac-btn ac-btn-gold" onClick={saveRole} disabled={saving}>{saving?<Loader2 size={13} className="spin"/>:<Check size={13}/>} {roleModal?.id?"Update":"Create"}</button>
            </>}>
            <div className="ac-form-grid">
              <Field label="Role Key (name) *"><input value={form.name||""} onChange={e=>setF("name",e.target.value)} placeholder="e.g. outlet_manager" disabled={!!roleModal?.id}/></Field>
              <Field label="Display Name *"><input value={form.display_name||""} onChange={e=>setF("display_name",e.target.value)} placeholder="e.g. Outlet Manager"/></Field>
              <Field label="Status">
                <select value={form.status||"active"} onChange={e=>setF("status",e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Description" full><textarea value={form.description||""} onChange={e=>setF("description",e.target.value)} placeholder="Optional description"/></Field>
            </div>
          </Modal>
        )}

        {/* ── PASSWORD MODAL ── */}
        {pwModal && (
          <Modal title={`Reset Password — ${pwModal.name}`} onClose={()=>{setPwModal(null);setForm({});}}
            footer={<>
              <button className="ac-btn ac-btn-soft" onClick={()=>{setPwModal(null);setForm({});}}>Cancel</button>
              <button className="ac-btn ac-btn-gold" onClick={resetPassword} disabled={saving}>{saving?<Loader2 size={13} className="spin"/>:<Key size={13}/>} Update Password</button>
            </>}>
            <Field label="New Password"><input type="password" value={form.password||""} onChange={e=>setF("password",e.target.value)} placeholder="Min 6 characters"/></Field>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}
