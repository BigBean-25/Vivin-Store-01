import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  CheckCircle2,
  GitBranch,
  Loader2,
  RefreshCw,
  Send,
  ShoppingCart,
} from "lucide-react";
import "./procurementFinalPages.css";

export default function ProcurementRequisitionConversion() {
  const [summary, setSummary] = useState({});
  const [requisitions, setRequisitions] = useState([]);
  const [history, setHistory] = useState([]);
  const [preview, setPreview] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3500);
  };

  const fetchSummary = useCallback(async () => {
    const res = await API.get("/api/procurement-requisition-conversions/summary");
    setSummary(res.data?.summary || {});
  }, []);

  const fetchRequisitions = useCallback(async () => {
    const res = await API.get("/api/procurement-requisitions", {
      params: { approval_status: "approved" },
    });

    const rows = res.data?.requisitions || res.data?.data || [];
    setRequisitions(rows);

    if (!selectedId && rows[0]?.id) {
      setSelectedId(String(rows[0].id));
    }
  }, [selectedId]);

  const fetchHistory = useCallback(async () => {
    const res = await API.get("/api/procurement-requisition-conversions/history");
    setHistory(res.data?.conversions || res.data?.data || []);
  }, []);

  const fetchPreview = useCallback(async () => {
    if (!selectedId) {
      setPreview(null);
      return;
    }

    try {
      setLoading(true);
      const res = await API.get("/api/procurement-requisition-conversions/preview", {
        params: { requisition_id: selectedId },
      });
      setPreview(res.data || null);
    } catch (error) {
      setPreview(null);
      showMessage("error", error.response?.data?.message || "Failed to preview requisition");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchSummary().catch(console.error);
    fetchRequisitions().catch(console.error);
    fetchHistory().catch(console.error);
  }, [fetchSummary, fetchRequisitions, fetchHistory]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const refreshAll = () => {
    fetchSummary().catch(console.error);
    fetchRequisitions().catch(console.error);
    fetchHistory().catch(console.error);
    fetchPreview();
  };

  const convert = async (type) => {
    if (!selectedId) {
      showMessage("error", "Select approved requisition first");
      return;
    }

    const confirmText =
      type === "rfq"
        ? "Convert this approved requisition to RFQ?"
        : "Convert this approved requisition to PO?";

    if (!window.confirm(confirmText)) return;

    try {
      setActionLoading(type);

      const endpoint =
        type === "rfq"
          ? `/api/procurement-requisition-conversions/${selectedId}/to-rfq`
          : `/api/procurement-requisition-conversions/${selectedId}/to-po`;

      const body =
        type === "rfq"
          ? {
              rfq_title: `RFQ from Requisition #${selectedId}`,
              status: "draft",
              remarks: "Converted from approved requisition",
            }
          : {
              status: "draft",
              remarks: "PO created from approved requisition",
            };

      const res = await API.post(endpoint, body);

      showMessage("success", res.data?.message || "Conversion completed");
      refreshAll();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Conversion failed");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <AdminLayout>
      <div className="final-proc-page">
        <div className="final-hero">
          <div>
            <div className="final-eyebrow">
              <GitBranch size={15} />
              Requisition Conversion
            </div>
            <h1>Requisition to RFQ / PO Conversion</h1>
            <p>Convert approved indent requests into RFQ or vendor-wise purchase order.</p>
          </div>

          <div className="final-actions">
            <button className="final-btn secondary" onClick={refreshAll}>
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`final-message ${message.type}`}>
            {message.type === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
            {message.text}
          </div>
        )}

        <div className="final-grid three" style={{ marginBottom: 22 }}>
          <SummaryCard title="Total Conversions" value={summary.total_conversions || 0} icon={GitBranch} />
          <SummaryCard title="RFQ Created" value={summary.rfq_count || 0} icon={Send} />
          <SummaryCard title="PO Created" value={summary.po_count || 0} icon={ShoppingCart} />
        </div>

        <div className="final-card">
          <div className="final-section-head">
            <div>
              <h2>Select Approved Requisition</h2>
              <p>Only approved requisitions are eligible for conversion.</p>
            </div>
            <div className="final-actions">
              <button className="final-btn dark" onClick={() => convert("rfq")} disabled={actionLoading === "rfq"}>
                {actionLoading === "rfq" ? <Loader2 size={16} className="final-spin" /> : <Send size={16} />}
                Convert RFQ
              </button>
              <button className="final-btn primary" onClick={() => convert("po")} disabled={actionLoading === "po"}>
                {actionLoading === "po" ? <Loader2 size={16} className="final-spin" /> : <ShoppingCart size={16} />}
                Convert PO
              </button>
            </div>
          </div>

          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Select approved requisition</option>
            {requisitions.map((req) => (
              <option key={req.id} value={req.id}>
                {req.requisition_number} - {req.request_title}
              </option>
            ))}
          </select>
        </div>

        <div className="final-grid two">
          <div className="final-card">
            <div className="final-section-head">
              <div>
                <h2>Preview</h2>
                <p>Items and vendor groups before conversion.</p>
              </div>
            </div>

            {loading ? (
              <Empty text="Loading preview..." />
            ) : !preview ? (
              <Empty text="No preview available" />
            ) : (
              <>
                <div className="final-grid three" style={{ marginBottom: 16 }}>
                  <SummaryCard title="Items" value={preview.summary?.total_items || 0} icon={GitBranch} />
                  <SummaryCard title="Vendor Groups" value={preview.summary?.vendor_groups || 0} icon={GitBranch} />
                  <SummaryCard title="PO Ready" value={preview.summary?.po_ready_vendors || 0} icon={CheckCircle2} />
                </div>

                <div className="final-table-wrap">
                  <table className="final-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Vendor</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(preview.items || []).map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{item.required_qty}</td>
                          <td>{item.unit_name}</td>
                          <td>{item.preferred_vendor_name || "-"}</td>
                          <td>₹{Number(item.estimated_value || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="final-card">
            <div className="final-section-head">
              <div>
                <h2>Conversion History</h2>
                <p>RFQ and PO conversions already created.</p>
              </div>
            </div>

            {history.length === 0 ? (
              <Empty text="No conversion history" />
            ) : (
              <div className="final-table-wrap">
                <table className="final-table">
                  <thead>
                    <tr>
                      <th>Requisition</th>
                      <th>Type</th>
                      <th>RFQ</th>
                      <th>PO</th>
                      <th>Vendor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td>{row.requisition_number || row.requisition_id}</td>
                        <td><span className="final-badge good">{row.conversion_type}</span></td>
                        <td>{row.rfq_id || "-"}</td>
                        <td>{row.purchase_order_id || "-"}</td>
                        <td>{row.vendor_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <div className="final-summary-card">
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="final-summary-icon">
        <Icon size={20} />
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="final-empty">
      <GitBranch size={28} />
      <h3>{text}</h3>
      <p>Approved requisition conversion data will appear here.</p>
    </div>
  );
}
