import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  BarChart3,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Eye,
  IndianRupee,
  Loader2,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";

const VALID_NEXT = {
  pending:    ["assigned", "failed", "cancelled"],
  assigned:   ["picked",   "failed", "cancelled"],
  picked:     ["in_transit", "failed"],
  in_transit: ["delivered", "failed"],
  delivered:  [],
  failed:     [],
  cancelled:  [],
};

const STATUS_COLOR = {
  pending:    { bg: "rgba(234,179,8,0.13)",  color: "#CA8A04" },
  assigned:   { bg: "rgba(37,99,235,0.12)",  color: "#2563EB" },
  picked:     { bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  in_transit: { bg: "rgba(234,88,12,0.12)",  color: "#EA580C" },
  delivered:  { bg: "rgba(22,163,74,0.13)",  color: "#16A34A" },
  failed:     { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
  cancelled:  { bg: "rgba(107,114,128,0.12)",color: "#6B7280" },
};

const DRIVER_STATUS_COLOR = {
  available: { bg: "rgba(22,163,74,0.13)",  color: "#16A34A" },
  busy:      { bg: "rgba(234,88,12,0.12)",  color: "#EA580C" },
  offline:   { bg: "rgba(107,114,128,0.12)",color: "#6B7280" },
  inactive:  { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
};

const PROOF_TYPES = ["signature", "photo", "otp", "document"];

const StatusBadge = ({ value, map }) => {
  const s = (map || STATUS_COLOR)[value] || { bg: "rgba(107,114,128,0.1)", color: "#6B7280" };
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {value ? value.replace(/_/g, " ") : "—"}
    </span>
  );
};

const fmt = (v) => Number(v || 0).toLocaleString("en-IN");
const fmtDate = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const safe = (v, fb = "—") => (v !== null && v !== undefined && v !== "" ? String(v) : fb);
const fmtDatetime = (v) => v ? new Date(v).toLocaleString("en-IN", { hour12: true }) : "—";

// ─── Live GPS Tracking Section (used inside View Modal) ─────────────────────
function LiveTrackingSection({ deliveryId, driverId }) {
  const mapContainerRef = useRef(null);
  const mapInstance     = useRef(null);
  const markerInstance  = useRef(null);
  const intervalRef     = useRef(null);

  const [livePoint,  setLivePoint]  = useState(null);
  const [history,    setHistory]    = useState([]);
  const [mapsLoaded, setMapsLoaded] = useState(!!window.google?.maps);
  const [mapsError,  setMapsError]  = useState(false);
  const [viewMode,   setViewMode]   = useState("map");
  const [driverLink, setDriverLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [genError,   setGenError]   = useState("");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (window.google?.maps) { setMapsLoaded(true); return; }
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") { setMapsError(true); return; }
    if (document.getElementById("gmap-script")) {
      const t = setInterval(() => { if (window.google?.maps) { setMapsLoaded(true); clearInterval(t); } }, 250);
      return () => clearInterval(t);
    }
    const s = document.createElement("script");
    s.id = "gmap-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    s.async = true;
    s.onload  = () => setMapsLoaded(true);
    s.onerror = () => setMapsError(true);
    document.head.appendChild(s);
  }, [apiKey]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await API.get(`/api/delivery/${deliveryId}/tracking/live`);
      if (res.data.success) setLivePoint(res.data.point);
    } catch {}
  }, [deliveryId]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await API.get(`/api/delivery/${deliveryId}/tracking/history`);
      if (res.data.success) setHistory(res.data.history || []);
    } catch {}
  }, [deliveryId]);

  useEffect(() => {
    fetchLive();
    fetchHistory();
    intervalRef.current = setInterval(fetchLive, 10000);
    return () => clearInterval(intervalRef.current);
  }, [fetchLive, fetchHistory]);

  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || !livePoint) return;
    const lat = parseFloat(livePoint.latitude);
    const lng = parseFloat(livePoint.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat, lng }, zoom: 15, mapTypeId: "roadmap",
        streetViewControl: false, fullscreenControl: false,
      });
      markerInstance.current = new window.google.maps.Marker({
        position: { lat, lng }, map: mapInstance.current, title: "Driver",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png" },
        animation: window.google.maps.Animation.BOUNCE,
      });
    } else {
      const pos = { lat, lng };
      markerInstance.current.setPosition(pos);
      mapInstance.current.panTo(pos);
    }
  }, [mapsLoaded, livePoint]);

  const generateLink = async () => {
    if (!driverId) { setGenError("No driver assigned to this delivery."); return; }
    setGenError("");
    try {
      const res = await API.post(`/api/delivery/drivers/${driverId}/tracking-token`);
      if (res.data.success) {
        const link = `${window.location.origin}/driver/delivery/${deliveryId}/tracking?token=${res.data.token}`;
        setDriverLink(link);
        navigator.clipboard.writeText(link)
          .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); })
          .catch(() => {});
      }
    } catch (err) { setGenError(err.response?.data?.message || "Failed to generate link"); }
  };

  return (
    <div style={{ padding: "0 24px 8px" }}>
      <div className="dv-section-title" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingRight:0 }}>
        <span><MapPin size={13} style={{ marginRight:6 }} />Live GPS Tracking</span>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button
            className="dv-btn-sm"
            style={{ fontSize:11, background: linkCopied ? "#16A34A" : undefined, color: linkCopied ? "#fff" : undefined }}
            onClick={generateLink}
            title="Generate 24h driver tracking link"
          >
            <Navigation size={11} /> {linkCopied ? "Copied!" : "Driver Link"}
          </button>
          <button className="dv-btn-sm" style={{ fontSize:11, background: viewMode==="map" ? "#FFD21E" : undefined }} onClick={() => setViewMode("map")}>Map</button>
          <button className="dv-btn-sm" style={{ fontSize:11, background: viewMode==="history" ? "#FFD21E" : undefined }} onClick={() => setViewMode("history")}>History ({history.length})</button>
        </div>
      </div>

      {genError && <div style={{ fontSize:12, color:"#EF4444", marginBottom:6 }}>{genError}</div>}

      {driverLink && (
        <div style={{ padding:"8px 12px", background:"rgba(22,163,74,0.08)", border:"1px solid rgba(22,163,74,0.2)", borderRadius:8, fontSize:11, color:"#16A34A", wordBreak:"break-all", marginBottom:10 }}>
          🔗 {driverLink}
        </div>
      )}

      {viewMode === "map" && (
        <>
          {livePoint ? (
            <>
              <div style={{ display:"flex", gap:12, fontSize:12, color:"#6B7280", marginBottom:8, flexWrap:"wrap" }}>
                <span>🕐 {fmtDatetime(livePoint.tracked_at)}</span>
                {livePoint.location_text && <span>📍 {livePoint.location_text}</span>}
                {livePoint.status && <span>· {livePoint.status}</span>}
                {livePoint.accuracy && <span>· ±{Math.round(livePoint.accuracy)}m</span>}
              </div>
              {mapsError ? (
                <div style={{ padding:"12px 16px", background:"rgba(255,210,30,0.08)", border:"1.5px solid rgba(255,210,30,0.3)", borderRadius:10, fontSize:13 }}>
                  <strong>Coordinates:</strong> {livePoint.latitude}, {livePoint.longitude}
                  <br /><span style={{ fontSize:11, color:"#8A7A52" }}>Configure VITE_GOOGLE_MAPS_API_KEY in client/.env to show map</span>
                </div>
              ) : (
                <div ref={mapContainerRef} style={{ width:"100%", height:280, borderRadius:12, background:"#e5e7eb", overflow:"hidden" }} />
              )}
            </>
          ) : (
            <div style={{ padding:"24px 0", textAlign:"center", color:"#8A7A52", fontSize:13 }}>
              <MapPin size={28} style={{ display:"block", margin:"0 auto 8px", opacity:0.4 }} />
              No live location available yet<br />
              <span style={{ fontSize:11 }}>Refreshes every 10s · Generate driver link to start tracking</span>
            </div>
          )}
        </>
      )}

      {viewMode === "history" && (
        <div style={{ maxHeight:260, overflowY:"auto" }}>
          {history.length === 0 && (
            <p style={{ fontSize:13, color:"#8A7A52", textAlign:"center", padding:"20px 0", margin:0 }}>No tracking history</p>
          )}
          {history.map((h, i) => (
            <div key={h.id} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid rgba(232,224,199,0.5)", fontSize:12, alignItems:"flex-start" }}>
              <div style={{ width:22, textAlign:"right", color:"#C9B96E", fontWeight:700, flexShrink:0, lineHeight:"18px" }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700 }}>{Number(h.latitude).toFixed(6)}, {Number(h.longitude).toFixed(6)}</div>
                {h.location_text && <div style={{ color:"#6B7280", fontSize:11 }}>{h.location_text}</div>}
                {h.status && <div style={{ color:"#2563EB", fontWeight:700, fontSize:11 }}>{h.status}</div>}
              </div>
              <div style={{ color:"#8A7A52", flexShrink:0, fontSize:10, textAlign:"right", lineHeight:1.4 }}>{fmtDatetime(h.tracked_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Delivery() {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [summary, setSummary]   = useState({});
  const [deliveries, setDeliveries] = useState([]);
  const [total, setTotal]       = useState(0);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom]     = useState("");
  const [filterTo, setFilterTo]         = useState("");

  const [viewDelivery, setViewDelivery] = useState(null);
  const [showView, setShowView]         = useState(false);

  const [statusTarget, setStatusTarget]   = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus]         = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusError, setStatusError]     = useState("");

  const [drivers, setDrivers]           = useState([]);
  const [assignTarget, setAssignTarget] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignDriverId, setAssignDriverId]   = useState("");
  const [assignError, setAssignError]         = useState("");

  const [proofTarget, setProofTarget]   = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofForm, setProofForm]       = useState({ proof_type: "signature", proof_value: "", received_by: "", received_phone: "" });
  const [proofError, setProofError]     = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]     = useState({ customer_id: "", order_id: "", driver_id: "", pickup_address: "", delivery_address: "", delivery_date: "" });
  const [createError, setCreateError]   = useState("");

  const [delConfirm, setDelConfirm] = useState(null);

  const [activeTab, setActiveTab] = useState("deliveries");

  const [routes, setRoutes]           = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeForm, setRouteForm]     = useState({ driver_id: "", route_date: "", start_location: "", end_location: "", total_distance_km: "" });
  const [routeFormMode, setRouteFormMode] = useState("create");
  const [editRouteId, setEditRouteId] = useState(null);
  const [routeFormError, setRouteFormError] = useState("");
  const [routeDelConfirm, setRouteDelConfirm] = useState(null);

  const [charges, setCharges]         = useState([]);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeForm, setChargeForm]   = useState({ label: "", base_charge: "", per_km_charge: "", min_distance_km: "", max_distance_km: "", minimum_order_amount: "" });
  const [chargeFormMode, setChargeFormMode] = useState("create");
  const [editChargeId, setEditChargeId] = useState(null);
  const [chargeFormError, setChargeFormError] = useState("");
  const [chargeDelConfirm, setChargeDelConfirm] = useState(null);

  /* ── Drivers full CRUD ── */
  const [driversFull, setDriversFull]       = useState([]);
  const [driverFullLoading, setDriverFullLoading] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({ name: "", phone: "", email: "", vehicle_type: "", vehicle_number: "", license_number: "" });
  const [driverFormMode, setDriverFormMode] = useState("create");
  const [editDriverId, setEditDriverId]     = useState(null);
  const [driverFormError, setDriverFormError] = useState("");
  const [driverDelConfirm, setDriverDelConfirm] = useState(null);

  /* ── Assignments ── */
  const [assignments, setAssignments]       = useState([]);
  const [assignLoading, setAssignLoading]   = useState(false);

  /* ── Tracking global ── */
  const [trackingAll, setTrackingAll]       = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  /* ── Status Logs global ── */
  const [statusLogsAll, setStatusLogsAll]   = useState([]);
  const [slLoading, setSlLoading]           = useState(false);

  /* ── Proofs global ── */
  const [proofsAll, setProofsAll]           = useState([]);
  const [proofListLoading, setProofListLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("delivery_status", filterStatus);
      if (filterFrom)   params.set("from_date", filterFrom);
      if (filterTo)     params.set("to_date", filterTo);
      const [sumRes, listRes] = await Promise.all([
        API.get("/api/delivery/summary"),
        API.get(`/api/delivery?${params}`),
      ]);
      if (sumRes.data.success)  setSummary(sumRes.data.summary || {});
      if (listRes.data.success) { setDeliveries(listRes.data.deliveries || []); setTotal(listRes.data.total || 0); }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterFrom, filterTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openView = async (id) => {
    try {
      const res = await API.get(`/api/delivery/${id}`);
      if (res.data.success) { setViewDelivery(res.data.delivery); setShowView(true); }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load delivery");
    }
  };

  const openStatusModal = (del) => {
    const first = (VALID_NEXT[del.delivery_status] || [])[0] || "";
    setStatusTarget(del);
    setNewStatus(first);
    setStatusRemarks("");
    setStatusError("");
    setShowStatusModal(true);
  };

  const handleStatusSave = async () => {
    setStatusError("");
    setSaving(true);
    try {
      await API.patch(`/api/delivery/${statusTarget.id}/status`, { delivery_status: newStatus, remarks: statusRemarks });
      setShowStatusModal(false);
      if (showView && viewDelivery?.id === statusTarget.id) {
        const res = await API.get(`/api/delivery/${statusTarget.id}`);
        if (res.data.success) setViewDelivery(res.data.delivery);
      }
      fetchAll();
    } catch (err) {
      setStatusError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const fetchDriversAndOpenAssign = async (del) => {
    setAssignError("");
    try {
      const res = await API.get("/api/delivery/drivers");
      if (res.data.success) setDrivers(res.data.drivers || []);
    } catch { setDrivers([]); }
    setAssignTarget(del);
    setAssignDriverId(del.driver_id ? String(del.driver_id) : "");
    setShowAssignModal(true);
  };

  const handleAssignSave = async () => {
    setAssignError("");
    setSaving(true);
    try {
      await API.patch(`/api/delivery/${assignTarget.id}/assign-driver`, { driver_id: Number(assignDriverId) });
      setShowAssignModal(false);
      if (showView && viewDelivery?.id === assignTarget.id) {
        const res = await API.get(`/api/delivery/${assignTarget.id}`);
        if (res.data.success) setViewDelivery(res.data.delivery);
      }
      fetchAll();
    } catch (err) {
      setAssignError(err.response?.data?.message || "Failed to assign driver");
    } finally {
      setSaving(false);
    }
  };

  const openProofModal = (del) => {
    setProofTarget(del);
    setProofForm({ proof_type: "signature", proof_value: "", received_by: "", received_phone: "" });
    setProofError("");
    setShowProofModal(true);
  };

  const handleProofSave = async () => {
    setProofError("");
    setSaving(true);
    try {
      await API.post(`/api/delivery/${proofTarget.id}/proof`, proofForm);
      setShowProofModal(false);
      if (showView && viewDelivery?.id === proofTarget.id) {
        const res = await API.get(`/api/delivery/${proofTarget.id}`);
        if (res.data.success) setViewDelivery(res.data.delivery);
      }
    } catch (err) {
      setProofError(err.response?.data?.message || "Failed to save proof");
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = async () => {
    setCreateForm({ customer_id: "", order_id: "", driver_id: "", pickup_address: "", delivery_address: "", delivery_date: "" });
    setCreateError("");
    try {
      const res = await API.get("/api/delivery/drivers");
      if (res.data.success) setDrivers(res.data.drivers || []);
    } catch { setDrivers([]); }
    setShowCreateModal(true);
  };

  const handleCreateSave = async () => {
    setCreateError("");
    if (!createForm.customer_id) { setCreateError("Customer ID is required"); return; }
    setSaving(true);
    try {
      await API.post("/api/delivery", { ...createForm, customer_id: Number(createForm.customer_id), driver_id: createForm.driver_id ? Number(createForm.driver_id) : undefined });
      setShowCreateModal(false);
      fetchAll();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create delivery");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/api/delivery/${id}`);
      setDelConfirm(null);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  const fetchDriversFull = useCallback(async () => {
    setDriverFullLoading(true);
    try {
      const res = await API.get("/api/delivery/drivers");
      if (res.data.success) setDriversFull(res.data.drivers || []);
    } catch { setDriversFull([]); }
    finally { setDriverFullLoading(false); }
  }, []);

  const openDriverModal = (drv) => {
    if (drv) {
      setDriverForm({ name: drv.name || "", phone: drv.phone || "", email: drv.email || "", vehicle_type: drv.vehicle_type || "", vehicle_number: drv.vehicle_number || "", license_number: drv.license_number || "" });
      setDriverFormMode("edit"); setEditDriverId(drv.id);
    } else {
      setDriverForm({ name: "", phone: "", email: "", vehicle_type: "", vehicle_number: "", license_number: "" });
      setDriverFormMode("create"); setEditDriverId(null);
    }
    setDriverFormError(""); setShowDriverModal(true);
  };

  const handleDriverSave = async () => {
    setDriverFormError(""); setSaving(true);
    try {
      if (!driverForm.name) { setDriverFormError("Name is required"); setSaving(false); return; }
      if (driverFormMode === "edit") await API.put(`/api/delivery/drivers/${editDriverId}`, driverForm);
      else await API.post("/api/delivery/drivers", driverForm);
      setShowDriverModal(false); fetchDriversFull();
      const res = await API.get("/api/delivery/drivers");
      if (res.data.success) setDrivers(res.data.drivers || []);
    } catch (err) { setDriverFormError(err.response?.data?.message || "Failed to save driver"); }
    finally { setSaving(false); }
  };

  const handleDriverDelete = async (id) => {
    try { await API.delete(`/api/delivery/drivers/${id}`); setDriverDelConfirm(null); fetchDriversFull(); }
    catch (err) { setError(err.response?.data?.message || "Failed to delete driver"); }
  };

  const fetchAssignments = useCallback(async () => {
    setAssignLoading(true);
    try {
      const res = await API.get("/api/delivery/assignments");
      if (res.data.success) setAssignments(res.data.assignments || []);
    } catch { setAssignments([]); }
    finally { setAssignLoading(false); }
  }, []);

  const fetchTrackingAll = useCallback(async () => {
    setTrackingLoading(true);
    try {
      const res = await API.get("/api/delivery/tracking");
      if (res.data.success) setTrackingAll(res.data.tracking || []);
    } catch { setTrackingAll([]); }
    finally { setTrackingLoading(false); }
  }, []);

  const fetchStatusLogsAll = useCallback(async () => {
    setSlLoading(true);
    try {
      const res = await API.get("/api/delivery/status-logs");
      if (res.data.success) setStatusLogsAll(res.data.logs || []);
    } catch { setStatusLogsAll([]); }
    finally { setSlLoading(false); }
  }, []);

  const fetchProofsAll = useCallback(async () => {
    setProofListLoading(true);
    try {
      const res = await API.get("/api/delivery/proofs");
      if (res.data.success) setProofsAll(res.data.proofs || []);
    } catch { setProofsAll([]); }
    finally { setProofListLoading(false); }
  }, []);

  const fetchRoutes = useCallback(async () => {
    setRouteLoading(true);
    try {
      const res = await API.get("/api/delivery/routes");
      if (res.data.success) setRoutes(res.data.routes || []);
    } catch { setRoutes([]); }
    finally { setRouteLoading(false); }
  }, []);

  const openRouteModal = (route) => {
    if (route) {
      setRouteForm({ driver_id: route.driver_id || "", route_date: route.route_date?.slice(0,10) || "", start_location: route.start_location || "", end_location: route.end_location || "", total_distance_km: route.total_distance_km || "" });
      setRouteFormMode("edit"); setEditRouteId(route.id);
    } else {
      setRouteForm({ driver_id: "", route_date: "", start_location: "", end_location: "", total_distance_km: "" });
      setRouteFormMode("create"); setEditRouteId(null);
    }
    setRouteFormError(""); setShowRouteModal(true);
  };

  const handleRouteSave = async () => {
    setRouteFormError(""); setSaving(true);
    try {
      const body = { ...routeForm, driver_id: routeForm.driver_id ? Number(routeForm.driver_id) : undefined, total_distance_km: routeForm.total_distance_km || 0 };
      if (routeFormMode === "edit") await API.put(`/api/delivery/routes/${editRouteId}`, body);
      else await API.post("/api/delivery/routes", body);
      setShowRouteModal(false); fetchRoutes();
    } catch (err) { setRouteFormError(err.response?.data?.message || "Failed to save route"); }
    finally { setSaving(false); }
  };

  const handleRouteDelete = async (id) => {
    try { await API.delete(`/api/delivery/routes/${id}`); setRouteDelConfirm(null); fetchRoutes(); }
    catch (err) { setError(err.response?.data?.message || "Failed to delete route"); }
  };

  const fetchCharges = useCallback(async () => {
    setChargeLoading(true);
    try {
      const res = await API.get("/api/delivery/charges");
      if (res.data.success) setCharges(res.data.charges || []);
    } catch { setCharges([]); }
    finally { setChargeLoading(false); }
  }, []);

  const openChargeModal = (charge) => {
    if (charge) {
      setChargeForm({ label: charge.label || "", base_charge: charge.base_charge || "", per_km_charge: charge.per_km_charge || "", min_distance_km: charge.min_distance_km || "", max_distance_km: charge.max_distance_km || "", minimum_order_amount: charge.minimum_order_amount || "" });
      setChargeFormMode("edit"); setEditChargeId(charge.id);
    } else {
      setChargeForm({ label: "", base_charge: "", per_km_charge: "", min_distance_km: "", max_distance_km: "", minimum_order_amount: "" });
      setChargeFormMode("create"); setEditChargeId(null);
    }
    setChargeFormError(""); setShowChargeModal(true);
  };

  const handleChargeSave = async () => {
    setChargeFormError(""); setSaving(true);
    try {
      const body = { ...chargeForm };
      if (chargeFormMode === "edit") await API.put(`/api/delivery/charges/${editChargeId}`, body);
      else await API.post("/api/delivery/charges", body);
      setShowChargeModal(false); fetchCharges();
    } catch (err) { setChargeFormError(err.response?.data?.message || "Failed to save charge"); }
    finally { setSaving(false); }
  };

  const handleChargeToggle = async (id) => {
    try { await API.patch(`/api/delivery/charges/${id}/status`); fetchCharges(); }
    catch (err) { setError(err.response?.data?.message || "Failed to toggle"); }
  };

  const handleChargeDelete = async (id) => {
    try { await API.delete(`/api/delivery/charges/${id}`); setChargeDelConfirm(null); fetchCharges(); }
    catch (err) { setError(err.response?.data?.message || "Failed to delete charge"); }
  };

  const s = summary;
  const statCards = [
    { label: "Total",      value: fmt(s.total),      color: "#FFD21E", icon: Truck },
    { label: "Pending",    value: fmt(s.pending),    color: "#CA8A04", icon: CircleDot },
    { label: "Assigned",   value: fmt(s.assigned),   color: "#2563EB", icon: User },
    { label: "In Transit", value: fmt(s.in_transit), color: "#EA580C", icon: Loader2 },
    { label: "Delivered",  value: fmt(s.delivered),  color: "#16A34A", icon: PackageCheck },
    { label: "Failed",     value: fmt(s.failed),     color: "#EF4444", icon: Ban },
  ];

  return (
    <AdminLayout>
      <style>{css}</style>
      <div className="dv-page">

        {/* Header */}
        <div className="dv-hero">
          <div className="dv-hero-info">
            <h1 className="dv-title">Deliveries</h1>
            <p className="dv-sub">Track and manage all delivery operations</p>
          </div>
          <div className="dv-hero-actions">
            <button className="dv-btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> New Delivery
            </button>
            <button className="dv-btn-refresh" onClick={fetchAll} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="dv-stats">
          {statCards.map((c) => (
            <div key={c.label} className="dv-stat-card">
              <div className="dv-stat-icon" style={{ background: `${c.color}1a`, color: c.color }}>
                <c.icon size={18} />
              </div>
              <div>
                <div className="dv-stat-val">{c.value}</div>
                <div className="dv-stat-label">{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="dv-tabs">
          <button className={`dv-tab${activeTab === "deliveries"  ? " active" : ""}`} onClick={() => setActiveTab("deliveries")}><Truck size={13} /> Deliveries</button>
          <button className={`dv-tab${activeTab === "drivers"     ? " active" : ""}`} onClick={() => { setActiveTab("drivers");     fetchDriversFull(); }}><User size={13} /> Drivers</button>
          <button className={`dv-tab${activeTab === "assignments" ? " active" : ""}`} onClick={() => { setActiveTab("assignments"); fetchAssignments(); }}><ClipboardList size={13} /> Assignments</button>
          <button className={`dv-tab${activeTab === "routes"      ? " active" : ""}`} onClick={() => { setActiveTab("routes");      fetchRoutes();      }}><Navigation size={13} /> Routes</button>
          <button className={`dv-tab${activeTab === "tracking"    ? " active" : ""}`} onClick={() => { setActiveTab("tracking");    fetchTrackingAll(); }}><MapPin size={13} /> Tracking</button>
          <button className={`dv-tab${activeTab === "statuslogs"  ? " active" : ""}`} onClick={() => { setActiveTab("statuslogs");  fetchStatusLogsAll(); }}><ArrowLeftRight size={13} /> Status Logs</button>
          <button className={`dv-tab${activeTab === "proofs"      ? " active" : ""}`} onClick={() => { setActiveTab("proofs");      fetchProofsAll(); }}><ShieldCheck size={13} /> Proofs</button>
          <button className={`dv-tab${activeTab === "charges"     ? " active" : ""}`} onClick={() => { setActiveTab("charges");     fetchCharges(); }}><IndianRupee size={13} /> Charges</button>
        </div>

        {error && <div className="dv-alert"><X size={14} />{error}<button onClick={() => setError("")}><X size={12} /></button></div>}

        {activeTab === "deliveries" && (<>
        {/* Filters */}
        <div className="dv-filters">
          <div className="dv-search-wrap">
            <Search size={14} className="dv-search-icon" />
            <select className="dv-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {["pending","assigned","picked","in_transit","delivered","failed","cancelled"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <input type="date" className="dv-date-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          <input type="date" className="dv-date-input" value={filterTo}   onChange={(e) => setFilterTo(e.target.value)} />
          <button className="dv-btn-sm" onClick={fetchAll}>Apply</button>
          <span className="dv-count">{fmt(total)} records</span>
        </div>

        {/* Table */}
        <div className="dv-table-wrap">
          <table className="dv-table">
            <thead>
              <tr>
                <th>Delivery #</th>
                <th>Order #</th>
                <th>Customer</th>
                <th>Driver</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td><span className="dv-code">{d.delivery_number}</span></td>
                  <td><span className="dv-code">{safe(d.order_number)}</span></td>
                  <td>
                    <div className="dv-cell-main">{safe(d.customer_name)}</div>
                    {d.customer_code && <div className="dv-cell-sub">{d.customer_code}</div>}
                  </td>
                  <td>
                    {d.driver_name
                      ? <><div className="dv-cell-main">{d.driver_name}</div><div className="dv-cell-sub">{safe(d.driver_phone)}</div></>
                      : <span className="dv-unassigned">Unassigned</span>}
                  </td>
                  <td>{fmtDate(d.delivery_date)}</td>
                  <td><StatusBadge value={d.delivery_status} /></td>
                  <td>
                    <div className="dv-actions">
                      <button className="dv-act-btn" title="View" onClick={() => openView(d.id)}><Eye size={13} /></button>
                      {!["delivered","cancelled","failed"].includes(d.delivery_status) && (
                        <>
                          <button className="dv-act-btn" title="Update Status" onClick={() => openStatusModal(d)}><CheckCircle2 size={13} /></button>
                          <button className="dv-act-btn" title="Assign Driver" onClick={() => fetchDriversAndOpenAssign(d)}><User size={13} /></button>
                        </>
                      )}
                      {d.delivery_status === "delivered" && (
                        <button className="dv-act-btn" title="Add POD" onClick={() => openProofModal(d)}><ShieldCheck size={13} /></button>
                      )}
                      {["pending","cancelled","failed"].includes(d.delivery_status) && (
                        <button className="dv-act-btn dv-act-del" title="Delete" onClick={() => setDelConfirm(d)}><Trash2 size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && !loading && (
                <tr><td colSpan={7} className="dv-empty"><Truck size={28} /><br />No deliveries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>)}

        {/* ── Routes Tab ── */}
        {activeTab === "routes" && (
          <div className="dv-tab-panel">
            <div className="dv-panel-head">
              <span className="dv-count">{routes.length} routes</span>
              <button className="dv-btn-primary" style={{ height:34, fontSize:12 }} onClick={() => openRouteModal(null)}>
                <Plus size={13} /> New Route
              </button>
            </div>
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead><tr><th>Code</th><th>Driver</th><th>Date</th><th>From</th><th>To</th><th>km</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id}>
                      <td><span className="dv-code">{r.route_code}</span></td>
                      <td>{safe(r.driver_name)}</td>
                      <td>{fmtDate(r.route_date)}</td>
                      <td>{safe(r.start_location)}</td>
                      <td>{safe(r.end_location)}</td>
                      <td>{r.total_distance_km}</td>
                      <td><StatusBadge value={r.status} map={{ planned:{bg:"rgba(37,99,235,0.12)",color:"#2563EB"}, started:{bg:"rgba(234,88,12,0.12)",color:"#EA580C"}, completed:{bg:"rgba(22,163,74,0.13)",color:"#16A34A"}, cancelled:{bg:"rgba(107,114,128,0.12)",color:"#6B7280"} }} /></td>
                      <td><div className="dv-actions">
                        {!["completed","cancelled"].includes(r.status) && <button className="dv-act-btn" title="Edit" onClick={() => openRouteModal(r)}><Pencil size={13} /></button>}
                        {["planned","cancelled"].includes(r.status) && <button className="dv-act-btn dv-act-del" title="Delete" onClick={() => setRouteDelConfirm(r)}><Trash2 size={13} /></button>}
                      </div></td>
                    </tr>
                  ))}
                  {routes.length === 0 && !routeLoading && <tr><td colSpan={8} className="dv-empty"><Navigation size={24} /><br />No routes found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Charges Tab ── */}
        {activeTab === "charges" && (
          <div className="dv-tab-panel">
            <div className="dv-panel-head">
              <span className="dv-count">{charges.length} charge rules</span>
              <button className="dv-btn-primary" style={{ height:34, fontSize:12 }} onClick={() => openChargeModal(null)}>
                <Plus size={13} /> New Charge
              </button>
            </div>
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead><tr><th>Code</th><th>Label</th><th className="right">Base (₹)</th><th className="right">/km (₹)</th><th>Min km</th><th>Max km</th><th>Min Order</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id}>
                      <td><span className="dv-code">{c.charge_code}</span></td>
                      <td><strong>{c.label}</strong></td>
                      <td className="right">{Number(c.base_charge).toFixed(2)}</td>
                      <td className="right">{Number(c.per_km_charge).toFixed(2)}</td>
                      <td>{c.min_distance_km}</td>
                      <td>{safe(c.max_distance_km)}</td>
                      <td>{c.minimum_order_amount}</td>
                      <td><span style={{ padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, background: c.is_active ? "rgba(22,163,74,0.13)" : "rgba(107,114,128,0.12)", color: c.is_active ? "#16A34A" : "#6B7280" }}>{c.is_active ? "Active" : "Inactive"}</span></td>
                      <td><div className="dv-actions">
                        <button className="dv-act-btn" title="Edit" onClick={() => openChargeModal(c)}><Pencil size={13} /></button>
                        <button className="dv-act-btn" title={c.is_active ? "Deactivate" : "Activate"} onClick={() => handleChargeToggle(c.id)}><CheckCircle2 size={13} /></button>
                        <button className="dv-act-btn dv-act-del" title="Delete" onClick={() => setChargeDelConfirm(c)}><Trash2 size={13} /></button>
                      </div></td>
                    </tr>
                  ))}
                  {charges.length === 0 && !chargeLoading && <tr><td colSpan={9} className="dv-empty"><IndianRupee size={24} /><br />No charge rules found<br /><span style={{fontSize:11}}>Run the SQL to create delivery_charges table first</span></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Drivers Tab ── */}
        {activeTab === "drivers" && (
          <div className="dv-tab-panel">
            <div className="dv-panel-head">
              <span className="dv-count">{driversFull.length} drivers</span>
              <button className="dv-btn-primary" style={{ height:34, fontSize:12 }} onClick={() => openDriverModal(null)}><Plus size={13} /> New Driver</button>
            </div>
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Email</th><th>Vehicle</th><th>Plate</th><th>License</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {driversFull.map((d) => (
                    <tr key={d.id}>
                      <td><span className="dv-code">{d.driver_code}</span></td>
                      <td><strong>{d.name}</strong></td>
                      <td>{safe(d.phone)}</td>
                      <td style={{ fontSize:11 }}>{safe(d.email)}</td>
                      <td>{safe(d.vehicle_type)}</td>
                      <td>{safe(d.vehicle_number)}</td>
                      <td style={{ fontSize:11 }}>{safe(d.license_number)}</td>
                      <td><StatusBadge value={d.status} /></td>
                      <td><div className="dv-actions">
                        <button className="dv-act-btn" title="Edit" onClick={() => openDriverModal(d)}><Pencil size={13} /></button>
                        {d.status !== "busy" && <button className="dv-act-btn dv-act-del" title="Delete" onClick={() => setDriverDelConfirm(d)}><Trash2 size={13} /></button>}
                      </div></td>
                    </tr>
                  ))}
                  {driversFull.length === 0 && !driverFullLoading && <tr><td colSpan={9} className="dv-empty"><User size={24} /><br />No drivers found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Assignments Tab ── */}
        {activeTab === "assignments" && (
          <div className="dv-tab-panel">
            <div className="dv-panel-head"><span className="dv-count">{assignments.length} assignments</span></div>
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead><tr><th>ID</th><th>Delivery #</th><th>Driver</th><th>Assigned At</th><th>Status</th><th>Delivery Status</th></tr></thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td><span className="dv-code">#{a.id}</span></td>
                      <td><span className="dv-code">{safe(a.delivery_number)}</span></td>
                      <td><div className="dv-cell-main">{safe(a.driver_name)}</div><div className="dv-cell-sub">{safe(a.driver_code)}</div></td>
                      <td style={{ fontSize:12 }}>{fmtDate(a.assigned_at)}</td>
                      <td><span className="dv-badge">{a.status}</span></td>
                      <td><StatusBadge value={a.delivery_status} /></td>
                    </tr>
                  ))}
                  {assignments.length === 0 && !assignLoading && <tr><td colSpan={6} className="dv-empty"><ClipboardList size={24} /><br />No assignments found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tracking Tab ── */}
        {activeTab === "tracking" && (
          <div className="dv-tab-panel">
            <div className="dv-panel-head"><span className="dv-count">{trackingAll.length} tracking points</span></div>
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead><tr><th>ID</th><th>Delivery #</th><th>Status</th><th>Lat</th><th>Lng</th><th>Remarks</th><th>Tracked At</th></tr></thead>
                <tbody>
                  {trackingAll.map((t) => (
                    <tr key={t.id}>
                      <td><span className="dv-code">#{t.id}</span></td>
                      <td><span className="dv-code">{safe(t.delivery_number)}</span></td>
                      <td>{safe(t.status)}</td>
                      <td style={{ fontSize:11, fontFamily:"monospace" }}>{safe(t.latitude)}</td>
                      <td style={{ fontSize:11, fontFamily:"monospace" }}>{safe(t.longitude)}</td>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{safe(t.remarks)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(t.tracked_at)}</td>
                    </tr>
                  ))}
                  {trackingAll.length === 0 && !trackingLoading && <tr><td colSpan={7} className="dv-empty"><MapPin size={24} /><br />No tracking data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Status Logs Tab ── */}
        {activeTab === "statuslogs" && (
          <div className="dv-tab-panel">
            <div className="dv-panel-head"><span className="dv-count">{statusLogsAll.length} log entries</span></div>
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead><tr><th>ID</th><th>Delivery #</th><th>From</th><th>To</th><th>Remarks</th><th>Changed At</th></tr></thead>
                <tbody>
                  {statusLogsAll.map((s) => (
                    <tr key={s.id}>
                      <td><span className="dv-code">#{s.id}</span></td>
                      <td><span className="dv-code">{safe(s.delivery_number)}</span></td>
                      <td><StatusBadge value={s.old_status} /></td>
                      <td><StatusBadge value={s.new_status} /></td>
                      <td style={{ fontSize:11, color:"#8A7A52" }}>{safe(s.remarks)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(s.changed_at)}</td>
                    </tr>
                  ))}
                  {statusLogsAll.length === 0 && !slLoading && <tr><td colSpan={6} className="dv-empty"><ArrowLeftRight size={24} /><br />No status logs</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Proofs Tab ── */}
        {activeTab === "proofs" && (
          <div className="dv-tab-panel">
            <div className="dv-panel-head"><span className="dv-count">{proofsAll.length} proof records</span></div>
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead><tr><th>ID</th><th>Delivery #</th><th>Type</th><th>Received By</th><th>Phone</th><th>Captured At</th></tr></thead>
                <tbody>
                  {proofsAll.map((p) => (
                    <tr key={p.id}>
                      <td><span className="dv-code">#{p.id}</span></td>
                      <td><span className="dv-code">{safe(p.delivery_number)}</span></td>
                      <td><span className="dv-badge">{p.proof_type}</span></td>
                      <td>{safe(p.received_by)}</td>
                      <td>{safe(p.received_phone)}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(p.captured_at)}</td>
                    </tr>
                  ))}
                  {proofsAll.length === 0 && !proofListLoading && <tr><td colSpan={6} className="dv-empty"><ShieldCheck size={24} /><br />No proof records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── View Modal ── */}
        {showView && viewDelivery && (
          <div className="dv-overlay" onClick={() => setShowView(false)}>
            <div className="dv-modal dv-modal-xl" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head">
                <div>
                  <h2>{viewDelivery.delivery_number}</h2>
                  <StatusBadge value={viewDelivery.delivery_status} />
                </div>
                <button onClick={() => setShowView(false)}><X size={18} /></button>
              </div>

              <div className="dv-form-scroll">
                {/* Meta Grid */}
                <div className="dv-view-grid">
                  <div className="dv-view-field"><label>Order</label><span className="dv-code">{safe(viewDelivery.order_number)}</span></div>
                  <div className="dv-view-field"><label>Customer</label><span>{safe(viewDelivery.customer_name)}</span></div>
                  <div className="dv-view-field"><label>Customer Phone</label><span>{safe(viewDelivery.customer_phone)}</span></div>
                  <div className="dv-view-field"><label>Delivery Date</label><span>{fmtDate(viewDelivery.delivery_date)}</span></div>
                  <div className="dv-view-field"><label>Proof Required</label><span>{viewDelivery.proof_required ? "Yes" : "No"}</span></div>
                  <div className="dv-view-field"><label>Created</label><span>{fmtDate(viewDelivery.created_at)}</span></div>
                </div>

                {/* Addresses */}
                <div className="dv-section-title"><MapPin size={13} /> Addresses</div>
                <div className="dv-view-grid">
                  <div className="dv-view-field" style={{ gridColumn: "1 / -1" }}><label>Pickup Address</label><span>{safe(viewDelivery.pickup_address)}</span></div>
                  <div className="dv-view-field" style={{ gridColumn: "1 / -1" }}><label>Delivery Address</label><span>{safe(viewDelivery.delivery_address)}</span></div>
                </div>

                {/* Driver */}
                <div className="dv-section-title"><User size={13} /> Driver</div>
                {viewDelivery.driver_name ? (
                  <div className="dv-view-grid">
                    <div className="dv-view-field"><label>Name</label><span>{viewDelivery.driver_name}</span></div>
                    <div className="dv-view-field"><label>Code</label><span className="dv-code">{safe(viewDelivery.driver_code)}</span></div>
                    <div className="dv-view-field"><label>Phone</label><span>{safe(viewDelivery.driver_phone)}</span></div>
                    <div className="dv-view-field"><label>Vehicle</label><span>{safe(viewDelivery.vehicle_type)} {safe(viewDelivery.vehicle_number)}</span></div>
                  </div>
                ) : (
                  <p className="dv-empty-inline">No driver assigned</p>
                )}

                {/* Status Logs */}
                <div className="dv-section-title"><BarChart3 size={13} /> Status History ({(viewDelivery.status_logs || []).length})</div>
                {(viewDelivery.status_logs || []).length > 0 ? (
                  <div className="dv-log-list">
                    {viewDelivery.status_logs.map((log) => (
                      <div className="dv-log-row" key={log.id}>
                        <StatusBadge value={log.old_status} />
                        <span className="dv-arrow">→</span>
                        <StatusBadge value={log.new_status} />
                        <span className="dv-log-time">{fmtDate(log.changed_at)}</span>
                        {log.remarks && <span className="dv-log-note">{log.remarks}</span>}
                      </div>
                    ))}
                  </div>
                ) : <p className="dv-empty-inline">No status history</p>}

                {/* POD / Proof */}
                <div className="dv-section-title" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingRight:24 }}>
                  <span><ShieldCheck size={13} style={{ marginRight:6 }} />Proof of Delivery ({(viewDelivery.proofs || []).length})</span>
                  {viewDelivery.delivery_status === "delivered" && (
                    <button className="dv-btn-sm" style={{ height:26, fontSize:11 }} onClick={() => { setShowView(false); openProofModal(viewDelivery); }}>
                      <Plus size={12} /> Add POD
                    </button>
                  )}
                </div>
                {(viewDelivery.proofs || []).length > 0 ? (
                  <div className="dv-proof-list">
                    {viewDelivery.proofs.map((p) => (
                      <div className="dv-proof-row" key={p.id}>
                        <span className="dv-proof-type">{p.proof_type}</span>
                        {p.received_by && <span><User size={11} /> {p.received_by}</span>}
                        {p.received_phone && <span><Phone size={11} /> {p.received_phone}</span>}
                        {p.proof_value && <span className="dv-log-note">{p.proof_value}</span>}
                        <span className="dv-log-time">{fmtDate(p.captured_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="dv-empty-inline">No proof recorded</p>}

                {/* Live GPS Tracking */}
                <LiveTrackingSection
                  deliveryId={viewDelivery.id}
                  driverId={viewDelivery.driver_id}
                />
              </div>

              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowView(false)}>Close</button>
                {!["delivered","cancelled","failed"].includes(viewDelivery.delivery_status) && (
                  <>
                    <button className="dv-btn-outline" onClick={() => { setShowView(false); fetchDriversAndOpenAssign(viewDelivery); }}>
                      <User size={14} /> Assign Driver
                    </button>
                    <button className="dv-btn-save" onClick={() => { setShowView(false); openStatusModal(viewDelivery); }}>
                      <CheckCircle2 size={14} /> Update Status
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Status Modal ── */}
        {showStatusModal && statusTarget && (
          <div className="dv-overlay" onClick={() => setShowStatusModal(false)}>
            <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head">
                <h2>Update Status</h2>
                <button onClick={() => setShowStatusModal(false)}><X size={18} /></button>
              </div>
              <div className="dv-form-scroll" style={{ padding: "20px 24px" }}>
                <div className="dv-field">
                  <label>Delivery</label>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{safe(statusTarget.delivery_number)}</span>
                </div>
                <div className="dv-field">
                  <label>Current Status</label>
                  <StatusBadge value={statusTarget.delivery_status} />
                </div>
                <div className="dv-field">
                  <label>New Status *</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="">— Select —</option>
                    {(VALID_NEXT[statusTarget.delivery_status] || []).map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="dv-field">
                  <label>Remarks</label>
                  <textarea rows={2} value={statusRemarks} onChange={(e) => setStatusRemarks(e.target.value)} placeholder="Optional remarks…" />
                </div>
                {statusError && <div className="dv-form-error"><X size={13} />{statusError}</div>}
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button className="dv-btn-save" onClick={handleStatusSave} disabled={saving || !newStatus}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><CheckCircle2 size={14} /> Update</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Assign Driver Modal ── */}
        {showAssignModal && assignTarget && (
          <div className="dv-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head">
                <h2>Assign Driver</h2>
                <button onClick={() => setShowAssignModal(false)}><X size={18} /></button>
              </div>
              <div className="dv-form-scroll" style={{ padding: "20px 24px" }}>
                <div className="dv-field">
                  <label>Delivery</label>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{safe(assignTarget.delivery_number)}</span>
                </div>
                <div className="dv-field">
                  <label>Select Driver *</label>
                  <select value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}>
                    <option value="">— Select Driver —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({safe(d.driver_code)}) — {d.status} {d.vehicle_type ? `· ${d.vehicle_type}` : ""}
                      </option>
                    ))}
                  </select>
                  {drivers.length === 0 && <span className="dv-hint">No drivers found. Add drivers first.</span>}
                </div>
                {assignDriverId && (
                  <div className="dv-driver-preview">
                    {(() => {
                      const dr = drivers.find((d) => String(d.id) === String(assignDriverId));
                      return dr ? (
                        <>
                          <User size={14} /> <strong>{dr.name}</strong>
                          {dr.phone && <span><Phone size={11} /> {dr.phone}</span>}
                          <StatusBadge value={dr.status} map={DRIVER_STATUS_COLOR} />
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
                {assignError && <div className="dv-form-error"><X size={13} />{assignError}</div>}
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button className="dv-btn-save" onClick={handleAssignSave} disabled={saving || !assignDriverId}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><User size={14} /> Assign</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── POD / Proof Modal ── */}
        {showProofModal && proofTarget && (
          <div className="dv-overlay" onClick={() => setShowProofModal(false)}>
            <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head">
                <h2>Add Proof of Delivery</h2>
                <button onClick={() => setShowProofModal(false)}><X size={18} /></button>
              </div>
              <div className="dv-form-scroll" style={{ padding: "20px 24px" }}>
                <div className="dv-field">
                  <label>Delivery</label>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{safe(proofTarget.delivery_number)}</span>
                </div>
                <div className="dv-field">
                  <label>Proof Type</label>
                  <select value={proofForm.proof_type} onChange={(e) => setProofForm((f) => ({ ...f, proof_type: e.target.value }))}>
                    {PROOF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="dv-field">
                  <label>Proof Value</label>
                  <textarea rows={2} value={proofForm.proof_value}
                    onChange={(e) => setProofForm((f) => ({ ...f, proof_value: e.target.value }))}
                    placeholder="OTP / signature text / document ref…" />
                </div>
                <div className="dv-field">
                  <label>Received By</label>
                  <input value={proofForm.received_by}
                    onChange={(e) => setProofForm((f) => ({ ...f, received_by: e.target.value }))}
                    placeholder="Receiver name…" />
                </div>
                <div className="dv-field">
                  <label>Receiver Phone</label>
                  <input value={proofForm.received_phone}
                    onChange={(e) => setProofForm((f) => ({ ...f, received_phone: e.target.value }))}
                    placeholder="Receiver phone…" />
                </div>
                {proofError && <div className="dv-form-error"><X size={13} />{proofError}</div>}
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowProofModal(false)}>Cancel</button>
                <button className="dv-btn-save" onClick={handleProofSave} disabled={saving}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><ShieldCheck size={14} /> Save POD</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Create Delivery Modal ── */}
        {showCreateModal && (
          <div className="dv-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head">
                <h2>New Delivery</h2>
                <button onClick={() => setShowCreateModal(false)}><X size={18} /></button>
              </div>
              <div className="dv-form-scroll" style={{ padding: "20px 24px" }}>
                <div className="dv-form-row">
                  <div className="dv-field">
                    <label>Customer ID *</label>
                    <input type="number" value={createForm.customer_id}
                      onChange={(e) => setCreateForm((f) => ({ ...f, customer_id: e.target.value }))}
                      placeholder="Customer ID…" />
                  </div>
                  <div className="dv-field">
                    <label>Order ID</label>
                    <input type="number" value={createForm.order_id}
                      onChange={(e) => setCreateForm((f) => ({ ...f, order_id: e.target.value }))}
                      placeholder="Optional…" />
                  </div>
                </div>
                <div className="dv-form-row">
                  <div className="dv-field">
                    <label>Delivery Date</label>
                    <input type="date" value={createForm.delivery_date}
                      onChange={(e) => setCreateForm((f) => ({ ...f, delivery_date: e.target.value }))} />
                  </div>
                  <div className="dv-field">
                    <label>Driver</label>
                    <select value={createForm.driver_id} onChange={(e) => setCreateForm((f) => ({ ...f, driver_id: e.target.value }))}>
                      <option value="">— No Driver —</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="dv-field">
                  <label>Pickup Address</label>
                  <input value={createForm.pickup_address}
                    onChange={(e) => setCreateForm((f) => ({ ...f, pickup_address: e.target.value }))}
                    placeholder="Warehouse / pickup location…" />
                </div>
                <div className="dv-field">
                  <label>Delivery Address</label>
                  <textarea rows={2} value={createForm.delivery_address}
                    onChange={(e) => setCreateForm((f) => ({ ...f, delivery_address: e.target.value }))}
                    placeholder="Customer delivery address…" />
                </div>
                {createError && <div className="dv-form-error"><X size={13} />{createError}</div>}
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="dv-btn-save" onClick={handleCreateSave} disabled={saving}>
                  {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><Plus size={14} /> Create</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Route Form Modal ── */}
        {showRouteModal && (
          <div className="dv-overlay" onClick={() => setShowRouteModal(false)}>
            <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head"><h2>{routeFormMode === "edit" ? "Edit Route" : "New Route"}</h2><button onClick={() => setShowRouteModal(false)}><X size={18} /></button></div>
              <div className="dv-form-scroll" style={{ padding:"20px 24px" }}>
                <div className="dv-form-row">
                  <div className="dv-field"><label>Driver ID</label><input type="number" value={routeForm.driver_id} onChange={(e) => setRouteForm((f) => ({...f, driver_id: e.target.value}))} placeholder="Driver ID…" /></div>
                  <div className="dv-field"><label>Route Date</label><input type="date" value={routeForm.route_date} onChange={(e) => setRouteForm((f) => ({...f, route_date: e.target.value}))} /></div>
                </div>
                <div className="dv-field"><label>Start Location</label><input value={routeForm.start_location} onChange={(e) => setRouteForm((f) => ({...f, start_location: e.target.value}))} placeholder="Pickup / warehouse…" /></div>
                <div className="dv-field"><label>End Location</label><input value={routeForm.end_location} onChange={(e) => setRouteForm((f) => ({...f, end_location: e.target.value}))} placeholder="Delivery area / zone…" /></div>
                <div className="dv-field"><label>Total Distance (km)</label><input type="number" step="0.01" value={routeForm.total_distance_km} onChange={(e) => setRouteForm((f) => ({...f, total_distance_km: e.target.value}))} placeholder="0.00" /></div>
                {routeFormError && <div className="dv-form-error"><X size={13} />{routeFormError}</div>}
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowRouteModal(false)}>Cancel</button>
                <button className="dv-btn-save" onClick={handleRouteSave} disabled={saving}>{saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><Navigation size={14} /> Save</>}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Route Delete Confirm ── */}
        {routeDelConfirm && (
          <div className="dv-overlay" onClick={() => setRouteDelConfirm(null)}>
            <div className="dv-modal" style={{ maxWidth:400 }} onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head"><h2>Delete Route</h2><button onClick={() => setRouteDelConfirm(null)}><X size={18} /></button></div>
              <div style={{ padding:"20px 24px", fontSize:14 }}>Delete route <strong>{routeDelConfirm.route_code}</strong>? This cannot be undone.</div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setRouteDelConfirm(null)}>Cancel</button>
                <button className="dv-btn-danger" onClick={() => handleRouteDelete(routeDelConfirm.id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Charge Form Modal ── */}
        {showChargeModal && (
          <div className="dv-overlay" onClick={() => setShowChargeModal(false)}>
            <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head"><h2>{chargeFormMode === "edit" ? "Edit Charge" : "New Charge Rule"}</h2><button onClick={() => setShowChargeModal(false)}><X size={18} /></button></div>
              <div className="dv-form-scroll" style={{ padding:"20px 24px" }}>
                <div className="dv-field"><label>Label *</label><input value={chargeForm.label} onChange={(e) => setChargeForm((f) => ({...f, label: e.target.value}))} placeholder="e.g. Local Delivery, Express…" /></div>
                <div className="dv-form-row">
                  <div className="dv-field"><label>Base Charge (₹)</label><input type="number" step="0.01" value={chargeForm.base_charge} onChange={(e) => setChargeForm((f) => ({...f, base_charge: e.target.value}))} placeholder="0.00" /></div>
                  <div className="dv-field"><label>Per km Charge (₹)</label><input type="number" step="0.01" value={chargeForm.per_km_charge} onChange={(e) => setChargeForm((f) => ({...f, per_km_charge: e.target.value}))} placeholder="0.00" /></div>
                </div>
                <div className="dv-form-row">
                  <div className="dv-field"><label>Min Distance (km)</label><input type="number" step="0.01" value={chargeForm.min_distance_km} onChange={(e) => setChargeForm((f) => ({...f, min_distance_km: e.target.value}))} placeholder="0" /></div>
                  <div className="dv-field"><label>Max Distance (km)</label><input type="number" step="0.01" value={chargeForm.max_distance_km} onChange={(e) => setChargeForm((f) => ({...f, max_distance_km: e.target.value}))} placeholder="optional" /></div>
                </div>
                <div className="dv-field"><label>Min Order Amount (₹)</label><input type="number" step="0.01" value={chargeForm.minimum_order_amount} onChange={(e) => setChargeForm((f) => ({...f, minimum_order_amount: e.target.value}))} placeholder="0.00" /></div>
                {chargeFormError && <div className="dv-form-error"><X size={13} />{chargeFormError}</div>}
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowChargeModal(false)}>Cancel</button>
                <button className="dv-btn-save" onClick={handleChargeSave} disabled={saving}>{saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><IndianRupee size={14} /> Save</>}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Charge Delete Confirm ── */}
        {chargeDelConfirm && (
          <div className="dv-overlay" onClick={() => setChargeDelConfirm(null)}>
            <div className="dv-modal" style={{ maxWidth:400 }} onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head"><h2>Delete Charge</h2><button onClick={() => setChargeDelConfirm(null)}><X size={18} /></button></div>
              <div style={{ padding:"20px 24px", fontSize:14 }}>Delete charge rule <strong>{chargeDelConfirm.label}</strong>? This cannot be undone.</div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setChargeDelConfirm(null)}>Cancel</button>
                <button className="dv-btn-danger" onClick={() => handleChargeDelete(chargeDelConfirm.id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Driver Form Modal ── */}
        {showDriverModal && (
          <div className="dv-overlay" onClick={() => setShowDriverModal(false)}>
            <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head"><h2>{driverFormMode === "edit" ? "Edit Driver" : "New Driver"}</h2><button onClick={() => setShowDriverModal(false)}><X size={18} /></button></div>
              <div className="dv-form-scroll" style={{ padding:"20px 24px" }}>
                <div className="dv-form-row">
                  <div className="dv-field"><label>Full Name *</label><input value={driverForm.name} onChange={(e) => setDriverForm((f) => ({...f, name: e.target.value}))} placeholder="Driver full name…" /></div>
                  <div className="dv-field"><label>Phone</label><input value={driverForm.phone} onChange={(e) => setDriverForm((f) => ({...f, phone: e.target.value}))} placeholder="Mobile number…" /></div>
                </div>
                <div className="dv-field"><label>Email</label><input type="email" value={driverForm.email} onChange={(e) => setDriverForm((f) => ({...f, email: e.target.value}))} placeholder="Email address…" /></div>
                <div className="dv-form-row">
                  <div className="dv-field"><label>Vehicle Type</label><input value={driverForm.vehicle_type} onChange={(e) => setDriverForm((f) => ({...f, vehicle_type: e.target.value}))} placeholder="Bike / Van / Truck…" /></div>
                  <div className="dv-field"><label>Vehicle Number</label><input value={driverForm.vehicle_number} onChange={(e) => setDriverForm((f) => ({...f, vehicle_number: e.target.value}))} placeholder="Plate number…" /></div>
                </div>
                <div className="dv-field"><label>License Number</label><input value={driverForm.license_number} onChange={(e) => setDriverForm((f) => ({...f, license_number: e.target.value}))} placeholder="Driving license…" /></div>
                {driverFormError && <div className="dv-form-error"><X size={13} />{driverFormError}</div>}
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setShowDriverModal(false)}>Cancel</button>
                <button className="dv-btn-save" onClick={handleDriverSave} disabled={saving}>{saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><User size={14} /> Save</>}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Driver Delete Confirm ── */}
        {driverDelConfirm && (
          <div className="dv-overlay" onClick={() => setDriverDelConfirm(null)}>
            <div className="dv-modal" style={{ maxWidth:400 }} onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head"><h2>Delete Driver</h2><button onClick={() => setDriverDelConfirm(null)}><X size={18} /></button></div>
              <div style={{ padding:"20px 24px", fontSize:14 }}>Delete driver <strong>{driverDelConfirm.name}</strong>? This cannot be undone.</div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setDriverDelConfirm(null)}>Cancel</button>
                <button className="dv-btn-danger" onClick={() => handleDriverDelete(driverDelConfirm.id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirm ── */}
        {delConfirm && (
          <div className="dv-overlay" onClick={() => setDelConfirm(null)}>
            <div className="dv-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
              <div className="dv-modal-head">
                <h2>Delete Delivery</h2>
                <button onClick={() => setDelConfirm(null)}><X size={18} /></button>
              </div>
              <div style={{ padding: "20px 24px", fontSize: 14 }}>
                Delete <strong>{delConfirm.delivery_number}</strong>? This cannot be undone.
              </div>
              <div className="dv-modal-foot">
                <button className="dv-btn-cancel" onClick={() => setDelConfirm(null)}>Cancel</button>
                <button className="dv-btn-danger" onClick={() => handleDelete(delConfirm.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const css = `
  .dv-page {
    --dv-bg: linear-gradient(135deg,#FFFDF6 0%,#FFF8E1 45%,#F7EBC5 100%);
    --dv-card: rgba(255,255,255,0.96);
    --dv-border: rgba(232,224,199,0.95);
    --dv-text: #171717;
    --dv-muted: #6B7280;
    min-height:100vh; padding:24px 24px 60px; background:var(--dv-bg);
    font-family:inherit; color:var(--dv-text);
  }
  .theme-dark .dv-page { --dv-bg:linear-gradient(135deg,#18150A 0%,#1C1A0F 100%); --dv-card:rgba(30,28,18,0.98); --dv-border:rgba(255,210,30,0.12); --dv-text:#F8FAFC; --dv-muted:rgba(255,255,255,0.5); }

  .dv-hero { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:20px; }
  .dv-title { font-size:22px; font-weight:900; margin:0 0 4px; }
  .dv-sub   { font-size:13px; color:var(--dv-muted); margin:0; }
  .dv-hero-actions { display:flex; gap:8px; align-items:center; }
  .dv-btn-primary { display:inline-flex; align-items:center; gap:6px; padding:0 18px; height:38px; border-radius:10px; background:#FFD21E; color:#171717; font-weight:800; font-size:13px; border:none; cursor:pointer; }
  .dv-btn-primary:hover { background:#F5C400; }
  .dv-btn-refresh { width:38px; height:38px; border-radius:10px; border:1.5px solid var(--dv-border); background:var(--dv-card); color:var(--dv-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; }

  .dv-stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }
  .dv-stat-card { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:12px; background:var(--dv-card); border:1.5px solid var(--dv-border); }
  .dv-stat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .dv-stat-val   { font-size:18px; font-weight:900; line-height:1; }
  .dv-stat-label { font-size:11px; font-weight:700; color:var(--dv-muted); margin-top:2px; }

  .dv-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; background:rgba(239,68,68,0.1); color:#EF4444; font-size:13px; margin-bottom:14px; }
  .dv-alert button { margin-left:auto; background:none; border:none; cursor:pointer; color:#EF4444; }

  .dv-filters { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
  .dv-search-wrap { position:relative; }
  .dv-search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--dv-muted); pointer-events:none; }
  .dv-select, .dv-date-input { height:36px; padding:0 12px 0 32px; border-radius:10px; border:1.5px solid var(--dv-border); background:var(--dv-card); color:var(--dv-text); font-size:13px; outline:none; }
  .dv-date-input { padding:0 12px; }
  .dv-select:focus, .dv-date-input:focus { border-color:#FFD21E; }
  .dv-btn-sm { display:inline-flex; align-items:center; gap:6px; padding:0 14px; height:36px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; border:1.5px solid var(--dv-border); background:var(--dv-card); color:var(--dv-text); }
  .dv-btn-sm:hover { background:rgba(255,210,30,0.1); border-color:#FFD21E; }
  .dv-count { font-size:12px; font-weight:700; color:var(--dv-muted); margin-left:auto; }

  .dv-table-wrap { border-radius:14px; border:1.5px solid var(--dv-border); overflow:auto; }
  .dv-table { width:100%; border-collapse:collapse; font-size:13px; }
  .dv-table thead tr { background:rgba(255,210,30,0.08); }
  .dv-table th { padding:10px 14px; text-align:left; font-size:11px; font-weight:800; color:var(--dv-muted); white-space:nowrap; letter-spacing:.04em; }
  .dv-table td { padding:10px 14px; border-top:1px solid var(--dv-border); vertical-align:middle; }
  .dv-table tr:hover td { background:rgba(255,210,30,0.04); }
  .dv-code { font-family:monospace; font-size:11.5px; font-weight:700; background:rgba(255,210,30,0.12); padding:2px 8px; border-radius:6px; }
  .dv-cell-main { font-weight:700; font-size:13px; }
  .dv-cell-sub  { font-size:11px; color:var(--dv-muted); margin-top:1px; }
  .dv-unassigned { font-size:11px; color:var(--dv-muted); font-style:italic; }
  .dv-empty { text-align:center; padding:40px; color:var(--dv-muted); font-size:13px; }

  .dv-actions { display:flex; gap:4px; }
  .dv-act-btn { width:28px; height:28px; border-radius:7px; border:1.5px solid var(--dv-border); background:var(--dv-card); cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--dv-muted); transition:all .15s; }
  .dv-act-btn:hover { background:rgba(255,210,30,0.15); border-color:#FFD21E; color:#171717; }
  .dv-act-del:hover { background:rgba(239,68,68,0.1); border-color:#EF4444; color:#EF4444; }

  .dv-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; }
  .dv-modal { background:var(--dv-card); border-radius:18px; border:1.5px solid var(--dv-border); width:100%; max-width:560px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; }
  .dv-modal-xl { max-width:760px; }
  .dv-modal-head { display:flex; align-items:flex-start; justify-content:space-between; padding:18px 24px 14px; border-bottom:1px solid var(--dv-border); gap:12px; }
  .dv-modal-head h2 { font-size:16px; font-weight:900; margin:0 0 4px; }
  .dv-modal-head button { background:none; border:none; cursor:pointer; color:var(--dv-muted); padding:4px; border-radius:6px; }
  .dv-form-scroll { overflow-y:auto; flex:1; }
  .dv-modal-foot { display:flex; gap:10px; justify-content:flex-end; padding:14px 24px; border-top:1px solid var(--dv-border); flex-wrap:wrap; }

  .dv-view-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px 24px; }
  .dv-view-field { display:flex; flex-direction:column; gap:3px; }
  .dv-view-field label { font-size:11px; font-weight:700; color:var(--dv-muted); }
  .dv-view-field span  { font-size:13px; font-weight:600; }

  .dv-section-title { font-size:12px; font-weight:800; color:var(--dv-muted); padding:10px 24px 6px; letter-spacing:.05em; text-transform:uppercase; display:flex; align-items:center; gap:6px; }
  .dv-empty-inline  { color:var(--dv-muted); font-size:12px; padding:0 24px 12px; margin:0; }

  .dv-log-list { padding:0 24px 14px; display:flex; flex-direction:column; gap:6px; }
  .dv-log-row  { display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:9px; background:rgba(255,210,30,0.05); border:1px solid var(--dv-border); flex-wrap:wrap; font-size:12px; }
  .dv-arrow    { font-weight:900; color:var(--dv-muted); }
  .dv-log-time { font-size:11px; color:var(--dv-muted); margin-left:auto; }
  .dv-log-note { font-size:11px; color:#8A7A52; font-style:italic; }

  .dv-proof-list { padding:0 24px 14px; display:flex; flex-direction:column; gap:6px; }
  .dv-proof-row  { display:flex; align-items:center; gap:10px; padding:7px 12px; border-radius:9px; background:rgba(22,163,74,0.05); border:1px solid rgba(22,163,74,0.15); flex-wrap:wrap; font-size:12px; }
  .dv-proof-type { font-weight:800; font-size:11px; text-transform:uppercase; background:rgba(22,163,74,0.13); color:#16A34A; padding:2px 8px; border-radius:6px; }

  .dv-field { display:flex; flex-direction:column; gap:4px; margin-bottom:14px; }
  .dv-field label { font-size:12px; font-weight:700; color:var(--dv-muted); }
  .dv-field input, .dv-field select, .dv-field textarea { padding:8px 12px; border-radius:9px; border:1.5px solid var(--dv-border); background:var(--dv-card); color:var(--dv-text); font-size:13px; outline:none; font-family:inherit; resize:vertical; }
  .dv-field input:focus, .dv-field select:focus, .dv-field textarea:focus { border-color:#FFD21E; }
  .dv-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .dv-hint     { font-size:11px; color:var(--dv-muted); font-style:italic; margin-top:2px; }

  .dv-driver-preview { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:9px; background:rgba(37,99,235,0.06); border:1px solid rgba(37,99,235,0.15); font-size:13px; flex-wrap:wrap; margin-top:-6px; }

  .dv-form-error { display:flex; align-items:center; gap:6px; padding:8px 12px; border-radius:9px; background:rgba(239,68,68,0.1); color:#EF4444; font-size:13px; margin-top:4px; }

  .dv-btn-cancel { padding:0 18px; height:38px; border-radius:10px; border:1.5px solid var(--dv-border); background:transparent; color:var(--dv-muted); font-weight:700; font-size:13px; cursor:pointer; }
  .dv-btn-save   { display:inline-flex; align-items:center; gap:6px; padding:0 20px; height:38px; border-radius:10px; background:#FFD21E; color:#171717; font-weight:800; font-size:13px; border:none; cursor:pointer; }
  .dv-btn-save:disabled { opacity:.6; cursor:not-allowed; }
  .dv-btn-save:hover:not(:disabled) { background:#F5C400; }
  .dv-btn-outline { display:inline-flex; align-items:center; gap:6px; padding:0 16px; height:38px; border-radius:10px; border:1.5px solid var(--dv-border); background:transparent; color:var(--dv-text); font-weight:700; font-size:13px; cursor:pointer; }
  .dv-btn-outline:hover { background:rgba(255,210,30,0.1); border-color:#FFD21E; }
  .dv-btn-danger  { display:inline-flex; align-items:center; gap:6px; padding:0 18px; height:38px; border-radius:10px; background:#EF4444; color:#fff; font-weight:800; font-size:13px; border:none; cursor:pointer; }

  .dv-tabs { display:flex; gap:6px; margin-bottom:16px; border-bottom:2px solid var(--dv-border); padding-bottom:0; }
  .dv-tab  { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; font-size:13px; font-weight:700; border:none; background:transparent; cursor:pointer; color:var(--dv-muted); border-bottom:2px solid transparent; margin-bottom:-2px; border-radius:8px 8px 0 0; }
  .dv-tab.active { color:#171717; border-bottom-color:#FFD21E; background:rgba(255,210,30,0.08); }
  .dv-tab:hover:not(.active) { background:rgba(255,210,30,0.05); color:var(--dv-text); }
  .theme-dark .dv-tab.active { color:#F8FAFC; }
  .dv-tab-panel { }
  .dv-panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .dv-table td.right { text-align:right; font-family:monospace; }
  .dv-badge { font-size:11px; font-weight:700; text-transform:uppercase; background:rgba(37,99,235,0.1); color:#2563EB; padding:2px 8px; border-radius:6px; }
  @keyframes dv-spin { to { transform:rotate(360deg); } }
  .spin { animation:dv-spin .8s linear infinite; }
  @media(max-width:600px){ .dv-form-row{grid-template-columns:1fr;} .dv-view-grid{grid-template-columns:1fr;} .dv-stats{grid-template-columns:repeat(2,1fr);} }
`;
