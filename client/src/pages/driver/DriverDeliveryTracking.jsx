import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const apiPost = (url, data, token) =>
  axios.post(`${API_BASE}${url}`, data, {
    headers: { "x-tracking-token": token, "Content-Type": "application/json" },
  });

const apiGet = (url, token) =>
  axios.get(`${API_BASE}${url}`, {
    headers: { "x-tracking-token": token },
  });

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString("en-IN", { hour12: true }) : "—";

export default function DriverDeliveryTracking() {
  const { deliveryId }         = useParams();
  const [searchParams]         = useSearchParams();
  const token                  = searchParams.get("token") || "";

  const [delivery, setDelivery] = useState(null);
  const [error, setError]       = useState("");
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [tracking, setTracking]   = useState(false);
  const [lastSent, setLastSent]   = useState(null);
  const [pointsSent, setPointsSent] = useState(0);
  const [currentPos, setCurrentPos] = useState(null);

  const watchIdRef   = useRef(null);
  const intervalRef  = useRef(null);
  const pendingPos   = useRef(null);

  const fetchDelivery = useCallback(async () => {
    if (!token) { setError("No tracking token in URL. Request a new link from admin."); return; }
    try {
      const res = await apiGet(`/api/delivery/${deliveryId}/tracking/live`, token);
      if (res.data.success !== undefined) {
        setDelivery({ id: deliveryId });
        setError("");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Tracking token is invalid or expired. Ask admin for a new link.");
      } else {
        setError("Could not connect to server. Check your connection.");
      }
    }
  }, [deliveryId, token]);

  useEffect(() => { fetchDelivery(); }, [fetchDelivery]);

  const sendLocation = useCallback(async (pos) => {
    try {
      await apiPost(`/api/delivery/${deliveryId}/tracking/location`, {
        latitude:      pos.coords.latitude,
        longitude:     pos.coords.longitude,
        accuracy:      pos.coords.accuracy,
        status:        "active",
      }, token);
      setLastSent(new Date());
      setPointsSent((n) => n + 1);
    } catch {}
  }, [deliveryId, token]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsStatus("unsupported");
      setError("GPS is not supported on this device.");
      return;
    }
    setGpsStatus("acquiring");
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus("active");
        setCurrentPos(pos);
        pendingPos.current = pos;
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("denied");
          setError("Location permission denied. Please allow GPS in browser settings.");
          stopTracking();
        } else {
          setGpsStatus("error");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    intervalRef.current = setInterval(() => {
      if (pendingPos.current) {
        sendLocation(pendingPos.current);
      }
    }, 15000);

    if (pendingPos.current) sendLocation(pendingPos.current);
  };

  const stopTracking = () => {
    setTracking(false);
    setGpsStatus("stopped");
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopTracking(), []);

  const GPS_LABEL = {
    idle:        { text: "Not started",        color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
    acquiring:   { text: "Acquiring GPS…",     color: "#CA8A04", bg: "rgba(234,179,8,0.1)"  },
    active:      { text: "GPS Active",         color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
    denied:      { text: "Permission Denied",  color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
    unsupported: { text: "GPS Unsupported",    color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
    error:       { text: "GPS Error",          color: "#EA580C", bg: "rgba(234,88,12,0.1)"  },
    stopped:     { text: "Stopped",            color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
  };
  const gs = GPS_LABEL[gpsStatus] || GPS_LABEL.idle;

  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>📦 Vivin Store</div>
          <div style={{ ...styles.badge, background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
            Invalid Link
          </div>
          <p style={styles.note}>No tracking token found in the URL.<br />Request a new tracking link from admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>📦 Vivin Delivery</div>
        <h2 style={styles.heading}>Driver Tracking</h2>
        <p style={styles.sub}>Delivery #{deliveryId}</p>

        {error && (
          <div style={{ ...styles.alert, background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
            {error}
          </div>
        )}

        {/* GPS Status */}
        <div style={{ ...styles.badge, background: gs.bg, color: gs.color }}>
          {gpsStatus === "active" && <span style={{ marginRight: 6 }}>●</span>}
          {gs.text}
        </div>

        {/* Current coordinates */}
        {currentPos && (
          <div style={styles.coordBox}>
            <div style={styles.coordLabel}>Current Location</div>
            <div style={styles.coordVal}>
              {currentPos.coords.latitude.toFixed(6)}, {currentPos.coords.longitude.toFixed(6)}
            </div>
            {currentPos.coords.accuracy && (
              <div style={styles.coordSub}>Accuracy: ±{Math.round(currentPos.coords.accuracy)}m</div>
            )}
          </div>
        )}

        {/* Stats */}
        {(pointsSent > 0 || lastSent) && (
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <div style={styles.statVal}>{pointsSent}</div>
              <div style={styles.statLabel}>Points Sent</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statVal}>{lastSent ? fmtDate(lastSent) : "—"}</div>
              <div style={styles.statLabel}>Last Update</div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={styles.btnRow}>
          {!tracking ? (
            <button
              style={styles.btnStart}
              onClick={startTracking}
              disabled={gpsStatus === "denied" || gpsStatus === "unsupported"}
            >
              ▶ Start Tracking
            </button>
          ) : (
            <button style={styles.btnStop} onClick={stopTracking}>
              ■ Stop Tracking
            </button>
          )}
        </div>

        <div style={styles.note}>
          Location is sent every 15 seconds while tracking is active.<br />
          Keep this page open and allow GPS when prompted.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(135deg,#1A1A0A 0%,#2C2800 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
  card: {
    background: "rgba(255,255,255,0.97)",
    borderRadius: 20,
    padding: "28px 24px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    textAlign: "center",
  },
  logo: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.5px",
  },
  heading: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    color: "#171717",
  },
  sub: {
    margin: 0,
    fontSize: 13,
    color: "#6B7280",
  },
  alert: {
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
    textAlign: "left",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 18px",
    borderRadius: 50,
    fontSize: 13,
    fontWeight: 700,
    alignSelf: "center",
  },
  coordBox: {
    background: "rgba(255,210,30,0.08)",
    border: "1.5px solid rgba(255,210,30,0.3)",
    borderRadius: 12,
    padding: "12px 16px",
    textAlign: "left",
  },
  coordLabel: { fontSize: 10, fontWeight: 800, color: "#8A7A52", textTransform: "uppercase", letterSpacing: "0.05em" },
  coordVal:   { fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#171717", marginTop: 4 },
  coordSub:   { fontSize: 11, color: "#8A7A52", marginTop: 3 },
  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  statItem: {
    background: "#F9FAFB",
    borderRadius: 10,
    padding: "10px 12px",
    textAlign: "center",
  },
  statVal:   { fontSize: 16, fontWeight: 900, color: "#171717" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  btnRow: {
    display: "flex",
    gap: 10,
  },
  btnStart: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    background: "#FFD21E",
    color: "#171717",
    fontWeight: 900,
    fontSize: 15,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(255,210,30,0.4)",
  },
  btnStop: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    background: "#EF4444",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
  },
  note: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 1.5,
    margin: 0,
  },
};
