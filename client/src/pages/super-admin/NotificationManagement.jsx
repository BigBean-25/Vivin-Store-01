import { useState, useCallback, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Bell, Send, Users, Shield, Store, BookOpen, BarChart3,
  Plus, Edit2, Trash2, Eye, CheckCircle, XCircle, RefreshCw,
  CheckCheck, AlertTriangle, Info, Search, Filter, X
} from "lucide-react";

const TABS = [
  { id:"all",      label:"All Notifications", icon:Bell },
  { id:"send",     label:"Send",              icon:Send },
  { id:"users",    label:"User-wise",         icon:Users },
  { id:"roles",    label:"Role-wise",         icon:Shield },
  { id:"outlets",  label:"Outlet-wise",       icon:Store },
  { id:"tracking", label:"Read Tracking",     icon:BookOpen },
  { id:"reports",  label:"Reports",           icon:BarChart3 },
];

const TYPE_COLORS = { info:"#3B82F6", success:"#22C55E", warning:"#F59E0B", danger:"#EF4444" };
const PRI_COLORS  = { low:"#6B7280", medium:"#3B82F6", high:"#F59E0B", urgent:"#EF4444" };
const STATUS_COLORS = { active:"#22C55E", inactive:"#6B7280" };

const Badge = ({ val, map, fallback="#6B7280" }) => (
  <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:600, background: (map[val]||fallback)+"22", color: map[val]||fallback, border:`1px solid ${map[val]||fallback}44` }}>
    {val||"-"}
  </span>
);

const SCard = ({ label, value, color="#F8C400" }) => (
  <div style={{ background:"#1a1d2e", border:"1px solid #2a2d3e", borderRadius:10, padding:"16px 20px", minWidth:130 }}>
    <div style={{ fontSize:22, fontWeight:700, color }}>{value??0}</div>
    <div style={{ fontSize:12, color:"#9ca3af", marginTop:4 }}>{label}</div>
  </div>
);

const emptyForm = { title:"", message:"", type:"info", priority:"medium", target_type:"all", target_id:"", status:"active", module:"" };

export default function NotificationManagement() {
  const [tab, setTab]               = useState("all");
  const [summary, setSummary]       = useState({});
  const [notifications, setNotifs]  = useState([]);
  const [userList, setUserList]     = useState([]);
  const [roleList, setRoleList]     = useState([]);
  const [outletList, setOutletList] = useState([]);
  const [tracking, setTracking]     = useState([]);
  const [trackSummary, setTrackSum] = useState({});
  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState("");
  const [selUser, setSelUser]       = useState("");
  const [selRole, setSelRole]       = useState("");
  const [selOutlet, setSelOutlet]   = useState("");
  const [subNotifs, setSubNotifs]   = useState([]);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPri, setFilterPri]   = useState("");

  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [actionId, setActionId]     = useState(null);

  const notify = (msg, isErr=false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const loadSummary = useCallback(async () => {
    try {
      const r = await API.get("/api/notifications/summary");
      setSummary(r.data?.data || {});
    } catch {}
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)      params.set("search", search);
      if (filterType)  params.set("type", filterType);
      if (filterStatus)params.set("status", filterStatus);
      if (filterPri)   params.set("priority", filterPri);
      const r = await API.get("/api/notifications?" + params.toString());
      setNotifs(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch(e) { notify(e.response?.data?.message || "Failed to load", true); }
    finally { setLoading(false); }
  }, [search, filterType, filterStatus, filterPri]);

  const loadUsers = useCallback(async () => {
    try { const r = await API.get("/api/notifications/users"); setUserList(Array.isArray(r.data?.data)?r.data.data:[]); } catch {}
  }, []);

  const loadRoles = useCallback(async () => {
    try { const r = await API.get("/api/notifications/roles"); setRoleList(Array.isArray(r.data?.data)?r.data.data:[]); } catch {}
  }, []);

  const loadOutlets = useCallback(async () => {
    try { const r = await API.get("/api/notifications/outlets"); setOutletList(Array.isArray(r.data?.data)?r.data.data:[]); } catch {}
  }, []);

  const loadTracking = useCallback(async () => {
    try {
      const [rt, rs] = await Promise.allSettled([
        API.get("/api/notifications/read-tracking"),
        API.get("/api/notifications/read-tracking/summary"),
      ]);
      if (rt.status==="fulfilled") setTracking(Array.isArray(rt.value.data?.data)?rt.value.data.data:[]);
      if (rs.status==="fulfilled") setTrackSum(rs.value.data?.data||{});
    } catch {}
  }, []);

  const loadSubNotifs = useCallback(async (type, id) => {
    if (!id) return setSubNotifs([]);
    try {
      const r = await API.get(`/api/notifications/${type}/${id}`);
      setSubNotifs(Array.isArray(r.data?.data)?r.data.data:[]);
    } catch { setSubNotifs([]); }
  }, []);

  const loadReport = async (type) => {
    setReportType(type);
    try {
      const r = await API.get(`/api/notifications/reports/${type}`);
      setReportData(Array.isArray(r.data?.data)?r.data.data:[]);
    } catch { setReportData([]); }
  };

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    if (tab==="all")      { loadNotifications(); }
    if (tab==="users")    { loadUsers(); }
    if (tab==="roles")    { loadRoles(); }
    if (tab==="outlets")  { loadOutlets(); }
    if (tab==="tracking") { loadTracking(); }
    if (tab==="reports")  { loadReport("summary"); }
  }, [tab]);

  useEffect(() => { if (tab==="all") loadNotifications(); }, [search, filterType, filterStatus, filterPri]);

  useEffect(() => { if (selUser)   loadSubNotifs("users",   selUser);   }, [selUser]);
  useEffect(() => { if (selRole)   loadSubNotifs("roles",   selRole);   }, [selRole]);
  useEffect(() => { if (selOutlet) loadSubNotifs("outlets", selOutlet); }, [selOutlet]);

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (item) => {
    setEditItem(item);
    setForm({ title:item.title||"", message:item.message||"", type:item.type||"info", priority:item.priority||"medium", target_type:item.target_type||"all", target_id:item.target_id||"", status:item.status||"active", module:item.module||"" });
    setShowModal(true);
  };

  const saveNotif = async () => {
    if (!form.title.trim()) return notify("Title is required", true);
    setSaving(true);
    try {
      if (editItem) {
        await API.put(`/api/notifications/${editItem.id}`, form);
        notify("Notification updated");
      } else {
        await API.post("/api/notifications", form);
        notify("Notification created");
      }
      setShowModal(false);
      loadNotifications();
      loadSummary();
    } catch(e) { notify(e.response?.data?.message || "Save failed", true); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (item) => {
    const ns = item.status === "active" ? "inactive" : "active";
    setActionId(item.id);
    try {
      await API.patch(`/api/notifications/${item.id}/status`, { status:ns });
      notify(`Status set to ${ns}`);
      loadNotifications();
      loadSummary();
    } catch(e) { notify(e.response?.data?.message || "Failed", true); }
    finally { setActionId(null); }
  };

  const deleteNotif = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    setActionId(id);
    try {
      await API.delete(`/api/notifications/${id}`);
      notify("Deleted");
      loadNotifications();
      loadSummary();
    } catch(e) { notify(e.response?.data?.message || "Delete failed", true); }
    finally { setActionId(null); }
  };

  const markRead   = async (id) => { try { await API.patch(`/api/notifications/${id}/read`);   notify("Marked as read");   loadTracking(); } catch {} };
  const markUnread = async (id) => { try { await API.patch(`/api/notifications/${id}/unread`); notify("Marked as unread"); loadTracking(); } catch {} };
  const markAllRead = async () => {
    try { await API.patch("/api/notifications/mark-all-read"); notify("All marked as read"); loadTracking(); loadSummary(); } catch {}
  };

  const sendForm = emptyForm;
  const [sf, setSf] = useState({ title:"", message:"", type:"info", priority:"medium", target_type:"all", target_id:"" });
  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    if (!sf.title.trim()) return notify("Title is required", true);
    setSending(true);
    try {
      const r = await API.post("/api/notifications/send", sf);
      notify(r.data?.message || "Sent");
      setSf({ title:"", message:"", type:"info", priority:"medium", target_type:"all", target_id:"" });
      loadSummary();
    } catch(e) { notify(e.response?.data?.message || "Send failed", true); }
    finally { setSending(false); }
  };

  const inp  = { width:"100%", padding:"8px 12px", borderRadius:6, border:"1px solid #2a2d3e", background:"#111318", color:"#fff", fontSize:13, boxSizing:"border-box" };
  const lbl  = { display:"flex", flexDirection:"column", gap:4 };
  const lbl_s= { fontSize:12, color:"#9ca3af", fontWeight:500 };
  const tbl  = { width:"100%", borderCollapse:"collapse", fontSize:13 };
  const th   = { padding:"10px 12px", textAlign:"left", borderBottom:"1px solid #2a2d3e", color:"#9ca3af", fontWeight:600, fontSize:12 };
  const td_s = { padding:"10px 12px", borderBottom:"1px solid #1a1d2e", color:"#e5e7eb", verticalAlign:"middle" };

  const NotiTable = ({ data, showUser=false, showRead=false }) => (
    <div style={{ overflowX:"auto" }}>
      {data.length===0 ? (
        <div style={{ padding:40, textAlign:"center", color:"#6b7280" }}>
          <Bell size={32} style={{ margin:"0 auto 8px", display:"block", opacity:0.4 }} />
          <p>No notifications found</p>
        </div>
      ) : (
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Type</th>
              <th style={th}>Priority</th>
              {showUser && <th style={th}>User</th>}
              {showRead && <th style={th}>Read</th>}
              <th style={th}>Status</th>
              <th style={th}>Created</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(n => (
              <tr key={n.id} style={{ background: actionId===n.id?"#1e2030":"transparent" }}>
                <td style={td_s}>
                  <div style={{ fontWeight:500 }}>{n.title||"-"}</div>
                  {n.message && <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{n.message.slice(0,60)}{n.message.length>60?"":""}</div>}
                </td>
                <td style={td_s}><Badge val={n.type} map={TYPE_COLORS} /></td>
                <td style={td_s}><Badge val={n.priority||"-"} map={PRI_COLORS} /></td>
                {showUser && <td style={td_s}>{n.user_name||"-"}<br/><span style={{ fontSize:11, color:"#6b7280" }}>{n.user_email||""}</span></td>}
                {showRead && <td style={td_s}>{n.is_read ? <span style={{ color:"#22C55E" }}> Read</span> : <span style={{ color:"#F59E0B" }}>Unread</span>}</td>}
                <td style={td_s}><Badge val={n.status||"active"} map={STATUS_COLORS} /></td>
                <td style={td_s} nowrap="true">{n.created_at ? new Date(n.created_at).toLocaleDateString() : "-"}</td>
                <td style={td_s}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => openEdit(n)} style={{ background:"none", border:"none", color:"#3B82F6", cursor:"pointer", padding:2 }} title="Edit"><Edit2 size={14}/></button>
                    {n.status ? (
                      <button onClick={() => toggleStatus(n)} style={{ background:"none", border:"none", color: n.status==="active"?"#F59E0B":"#22C55E", cursor:"pointer", padding:2 }} title="Toggle Status">
                        {n.status==="active" ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                      </button>
                    ) : null}
                    {showRead && (
                      n.is_read
                        ? <button onClick={() => markUnread(n.id)} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", padding:2 }} title="Mark Unread"><BookOpen size={14}/></button>
                        : <button onClick={() => markRead(n.id)}   style={{ background:"none", border:"none", color:"#22C55E", cursor:"pointer", padding:2 }} title="Mark Read"><CheckCheck size={14}/></button>
                    )}
                    <button onClick={() => deleteNotif(n.id)} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", padding:2 }} title="Delete"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div style={{ padding:"24px", background:"#0d0f1a", minHeight:"100vh", color:"#fff" }}>

        {/*  HEADER  */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <Bell size={28} color="#F8C400" />
            <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Notification Management</h1>
          </div>
          <p style={{ margin:0, color:"#6b7280", fontSize:14 }}>Manage system-wide notifications across users, roles, and outlets</p>
        </div>

        {/*  ALERTS  */}
        {error   && <div style={{ background:"#EF444422", border:"1px solid #EF4444", borderRadius:8, padding:"10px 16px", marginBottom:16, color:"#EF4444", fontSize:13 }}>{error}</div>}
        {success && <div style={{ background:"#22C55E22", border:"1px solid #22C55E", borderRadius:8, padding:"10px 16px", marginBottom:16, color:"#22C55E", fontSize:13 }}>{success}</div>}

        {/*  SUMMARY CARDS  */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:28 }}>
          <SCard label="Total"       value={summary.total_notifications}  color="#F8C400" />
          <SCard label="Today"       value={summary.today_notifications}   color="#3B82F6" />
          <SCard label="Read Events" value={summary.total_reads}           color="#22C55E" />
          <SCard label="Active"      value={summary.active_notifications}  color="#22C55E" />
          <SCard label="Inactive"    value={summary.inactive_notifications} color="#6b7280" />
          <SCard label="High Pri"    value={summary.high_priority}          color="#F59E0B" />
          <SCard label="Urgent"      value={summary.urgent_priority}        color="#EF4444" />
          <SCard label="User-wise"   value={summary.user_wise}              color="#8B5CF6" />
          <SCard label="Role-wise"   value={summary.role_wise}              color="#06B6D4" />
          <SCard label="Outlet-wise" value={summary.outlet_wise}            color="#F97316" />
        </div>

        {/*  TABS  */}
        <div style={{ display:"flex", gap:4, marginBottom:20, flexWrap:"wrap", borderBottom:"1px solid #2a2d3e", paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"none", border:"none", borderBottom: tab===t.id ? "2px solid #F8C400":"2px solid transparent", color: tab===t.id?"#F8C400":"#9ca3af", cursor:"pointer", fontSize:13, fontWeight: tab===t.id?600:400, marginBottom:-1 }}>
              <t.icon size={14}/> {t.label}
            </button>
          ))}
        </div>

        {/*  */}
        {/* TAB: ALL NOTIFICATIONS                                           */}
        {/*  */}
        {tab==="all" && (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              <div style={{ position:"relative", flex:1, minWidth:200 }}>
                <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#6b7280" }} />
                <input style={{ ...inp, paddingLeft:30 }} placeholder="Search notifications..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <select style={{ ...inp, width:"auto" }} value={filterType} onChange={e=>setFilterType(e.target.value)}>
                <option value="">All Types</option>
                {["info","success","warning","danger"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <select style={{ ...inp, width:"auto" }} value={filterPri} onChange={e=>setFilterPri(e.target.value)}>
                <option value="">All Priorities</option>
                {["low","medium","high","urgent"].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <select style={{ ...inp, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button onClick={openCreate} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#F8C400", color:"#000", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                <Plus size={14}/> New
              </button>
              <button onClick={loadNotifications} style={{ padding:"8px 12px", background:"#1a1d2e", border:"1px solid #2a2d3e", borderRadius:6, color:"#9ca3af", cursor:"pointer" }}>
                <RefreshCw size={14}/>
              </button>
            </div>
            {loading ? (
              <div style={{ textAlign:"center", padding:40, color:"#6b7280" }}><RefreshCw size={24} style={{ animation:"spin 1s linear infinite" }}/></div>
            ) : (
              <div style={{ background:"#111318", borderRadius:10, border:"1px solid #2a2d3e", overflow:"hidden" }}>
                <NotiTable data={notifications} />
              </div>
            )}
          </div>
        )}

        {/*  */}
        {/* TAB: SEND NOTIFICATION                                           */}
        {/*  */}
        {tab==="send" && (
          <div style={{ maxWidth:640 }}>
            <h3 style={{ margin:"0 0 20px", color:"#F8C400" }}>Send Notification</h3>
            <div style={{ background:"#111318", border:"1px solid #2a2d3e", borderRadius:10, padding:24, display:"flex", flexDirection:"column", gap:16 }}>
              <label style={lbl}><span style={lbl_s}>Title *</span>
                <input style={inp} value={sf.title} onChange={e=>setSf(p=>({...p,title:e.target.value}))} placeholder="Notification title" />
              </label>
              <label style={lbl}><span style={lbl_s}>Message</span>
                <textarea style={{ ...inp, height:80, resize:"vertical" }} value={sf.message} onChange={e=>setSf(p=>({...p,message:e.target.value}))} placeholder="Notification message" />
              </label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <label style={lbl}><span style={lbl_s}>Type</span>
                  <select style={inp} value={sf.type} onChange={e=>setSf(p=>({...p,type:e.target.value}))}>
                    {["info","success","warning","danger"].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label style={lbl}><span style={lbl_s}>Priority</span>
                  <select style={inp} value={sf.priority} onChange={e=>setSf(p=>({...p,priority:e.target.value}))}>
                    {["low","medium","high","urgent"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              <label style={lbl}><span style={lbl_s}>Target Type</span>
                <select style={inp} value={sf.target_type} onChange={e=>setSf(p=>({...p,target_type:e.target.value,target_id:""}))}>
                  <option value="all">All Users</option>
                  <option value="user">Specific User</option>
                  <option value="role">Role-wise</option>
                  <option value="outlet">Outlet-wise</option>
                </select>
              </label>
              {sf.target_type==="user" && (
                <label style={lbl}><span style={lbl_s}>Select User</span>
                  <select style={inp} value={sf.target_id} onChange={e=>setSf(p=>({...p,target_id:e.target.value}))}>
                    <option value="">-- Select User --</option>
                    {userList.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </label>
              )}
              {sf.target_type==="role" && (
                <label style={lbl}><span style={lbl_s}>Select Role</span>
                  <select style={inp} value={sf.target_id} onChange={e=>setSf(p=>({...p,target_id:e.target.value}))}>
                    <option value="">-- Select Role --</option>
                    {roleList.map(r=><option key={r.id} value={r.id}>{r.display_name} ({r.user_count} users)</option>)}
                  </select>
                </label>
              )}
              {sf.target_type==="outlet" && (
                <label style={lbl}><span style={lbl_s}>Select Outlet</span>
                  <select style={inp} value={sf.target_id} onChange={e=>setSf(p=>({...p,target_id:e.target.value}))}>
                    <option value="">-- Select Outlet --</option>
                    {outletList.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </label>
              )}
              <button onClick={handleSend} disabled={sending}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 24px", background:"#F8C400", color:"#000", border:"none", borderRadius:6, cursor:sending?"not-allowed":"pointer", fontWeight:700, fontSize:14, opacity:sending?0.7:1 }}>
                <Send size={16}/> {sending ? "Sending" : "Send Notification"}
              </button>
            </div>
          </div>
        )}

        {/*  */}
        {/* TAB: USER-WISE                                                   */}
        {/*  */}
        {tab==="users" && (
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              <label style={{ ...lbl, flex:1, maxWidth:340 }}>
                <span style={lbl_s}>Select User</span>
                <select style={inp} value={selUser} onChange={e=>setSelUser(e.target.value)}>
                  <option value="">-- Select a User --</option>
                  {userList.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.read_count} reads</option>)}
                </select>
              </label>
            </div>
            <div style={{ background:"#111318", borderRadius:10, border:"1px solid #2a2d3e", overflow:"hidden" }}>
              <NotiTable data={subNotifs} showRead={true} />
            </div>
          </div>
        )}

        {/*  */}
        {/* TAB: ROLE-WISE                                                   */}
        {/*  */}
        {tab==="roles" && (
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              <label style={{ ...lbl, flex:1, maxWidth:340 }}>
                <span style={lbl_s}>Select Role</span>
                <select style={inp} value={selRole} onChange={e=>setSelRole(e.target.value)}>
                  <option value="">-- Select a Role --</option>
                  {roleList.map(r=><option key={r.id} value={r.id}>{r.display_name} ({r.user_count} users)</option>)}
                </select>
              </label>
            </div>
            <div style={{ background:"#111318", borderRadius:10, border:"1px solid #2a2d3e", overflow:"hidden" }}>
              <NotiTable data={subNotifs} />
            </div>
          </div>
        )}

        {/*  */}
        {/* TAB: OUTLET-WISE                                                 */}
        {/*  */}
        {tab==="outlets" && (
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              <label style={{ ...lbl, flex:1, maxWidth:340 }}>
                <span style={lbl_s}>Select Outlet</span>
                <select style={inp} value={selOutlet} onChange={e=>setSelOutlet(e.target.value)}>
                  <option value="">-- Select an Outlet --</option>
                  {outletList.map(o=><option key={o.id} value={o.id}>{o.outlet_code ? o.outlet_code+" - " : ""}{o.name}</option>)}
                </select>
              </label>
            </div>
            {outletList.length===0 && (
              <div style={{ padding:16, color:"#F59E0B", fontSize:13, background:"#F59E0B11", borderRadius:8, border:"1px solid #F59E0B44", marginBottom:16 }}>
                <AlertTriangle size={14} style={{ display:"inline", marginRight:6 }}/>No outlets found. Please create outlets first.
              </div>
            )}
            <div style={{ background:"#111318", borderRadius:10, border:"1px solid #2a2d3e", overflow:"hidden" }}>
              <NotiTable data={subNotifs} />
            </div>
          </div>
        )}

        {/*  */}
        {/* TAB: READ TRACKING                                               */}
        {/*  */}
        {tab==="tracking" && (
          <div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
              <SCard label="Total Notifications" value={trackSummary.total_notifications}  color="#F8C400" />
              <SCard label="Read Events"         value={trackSummary.total_read_events}    color="#22C55E" />
              <SCard label="My Reads"            value={trackSummary.my_reads}             color="#3B82F6" />
              <SCard label="Users with Reads"    value={trackSummary.users_with_reads}     color="#8B5CF6" />
              <SCard label="My Unread"           value={trackSummary.my_unread}            color="#EF4444" />
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              <button onClick={markAllRead} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#22C55E22", border:"1px solid #22C55E44", borderRadius:6, color:"#22C55E", cursor:"pointer", fontSize:13 }}>
                <CheckCheck size={14}/> Mark All Read (for me)
              </button>
              <button onClick={loadTracking} style={{ padding:"8px 12px", background:"#1a1d2e", border:"1px solid #2a2d3e", borderRadius:6, color:"#9ca3af", cursor:"pointer" }}>
                <RefreshCw size={14}/>
              </button>
            </div>
            <div style={{ background:"#111318", borderRadius:10, border:"1px solid #2a2d3e", overflow:"hidden" }}>
              {tracking.length===0 ? (
                <div style={{ padding:40, textAlign:"center", color:"#6b7280" }}>
                  <BookOpen size={32} style={{ margin:"0 auto 8px", display:"block", opacity:0.4 }}/><p>No read tracking data yet</p>
                </div>
              ) : (
                <table style={tbl}>
                  <thead><tr>
                    <th style={th}>Notification Title</th>
                    <th style={th}>User</th>
                    <th style={th}>Read At</th>
                    <th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {tracking.map((t,i) => (
                      <tr key={i}>
                        <td style={td_s}>{t.title||"-"}<br/><span style={{ fontSize:11, color:"#6b7280" }}>{t.type||""}</span></td>
                        <td style={td_s}>{t.user_name||"-"}<br/><span style={{ fontSize:11, color:"#6b7280" }}>{t.user_email||""}</span></td>
                        <td style={td_s}>{t.read_at ? new Date(t.read_at).toLocaleString() : "-"}</td>
                        <td style={td_s}>
                          <button onClick={() => markUnread(t.id)} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:12 }} title="Mark Unread">Unread</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/*  */}
        {/* TAB: REPORTS                                                     */}
        {/*  */}
        {tab==="reports" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {[
                { key:"by-type",     label:"By Type" },
                { key:"by-priority", label:"By Priority" },
                { key:"by-user",     label:"By User" },
                { key:"read-status", label:"Read Status" },
                { key:"target-wise", label:"Target Wise" },
              ].map(btn => (
                <button key={btn.key} onClick={() => loadReport(btn.key)}
                  style={{ padding:"8px 16px", background: reportType===btn.key?"#F8C400":"#1a1d2e", color: reportType===btn.key?"#000":"#9ca3af", border:`1px solid ${reportType===btn.key?"#F8C400":"#2a2d3e"}`, borderRadius:6, cursor:"pointer", fontSize:13, fontWeight: reportType===btn.key?600:400 }}>
                  {btn.label}
                </button>
              ))}
            </div>
            <div style={{ background:"#111318", borderRadius:10, border:"1px solid #2a2d3e", overflow:"hidden" }}>
              {reportData.length===0 ? (
                <div style={{ padding:40, textAlign:"center", color:"#6b7280" }}>
                  <BarChart3 size={32} style={{ margin:"0 auto 8px", display:"block", opacity:0.4 }}/><p>Select a report type above</p>
                </div>
              ) : (
                <table style={tbl}>
                  <thead><tr>{Object.keys(reportData[0]).map(k=><th key={k} style={th}>{k.replace(/_/g," ").toUpperCase()}</th>)}</tr></thead>
                  <tbody>
                    {reportData.map((row,i)=>(
                      <tr key={i}>
                        {Object.values(row).map((v,j)=>(
                          <td key={j} style={td_s}>{v===null||v===undefined?"-":String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/*  CREATE / EDIT MODAL  */}
        {showModal && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
            <div style={{ background:"#111318", border:"1px solid #2a2d3e", borderRadius:12, padding:28, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h3 style={{ margin:0, color:"#F8C400" }}>{editItem ? "Edit Notification" : "New Notification"}</h3>
                <button onClick={() => setShowModal(false)} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer" }}><X size={18}/></button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <label style={lbl}><span style={lbl_s}>Title *</span>
                  <input style={inp} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Notification title" />
                </label>
                <label style={lbl}><span style={lbl_s}>Message</span>
                  <textarea style={{ ...inp, height:70, resize:"vertical" }} value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} placeholder="Message body" />
                </label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <label style={lbl}><span style={lbl_s}>Type</span>
                    <select style={inp} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                      {["info","success","warning","danger"].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={lbl}><span style={lbl_s}>Priority</span>
                    <select style={inp} value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
                      {["low","medium","high","urgent"].map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label style={lbl}><span style={lbl_s}>Target Type</span>
                    <select style={inp} value={form.target_type} onChange={e=>setForm(p=>({...p,target_type:e.target.value}))}>
                      {["all","user","role","outlet"].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={lbl}><span style={lbl_s}>Status</span>
                    <select style={inp} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
                <label style={lbl}><span style={lbl_s}>Module</span>
                  <input style={inp} value={form.module} onChange={e=>setForm(p=>({...p,module:e.target.value}))} placeholder="e.g. stock, order, payment" />
                </label>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                  <button onClick={() => setShowModal(false)} style={{ padding:"8px 20px", background:"#1a1d2e", border:"1px solid #2a2d3e", borderRadius:6, color:"#9ca3af", cursor:"pointer", fontSize:13 }}>Cancel</button>
                  <button onClick={saveNotif} disabled={saving} style={{ padding:"8px 20px", background:"#F8C400", border:"none", borderRadius:6, color:"#000", cursor:saving?"not-allowed":"pointer", fontWeight:700, fontSize:13 }}>
                    {saving ? "Saving" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
