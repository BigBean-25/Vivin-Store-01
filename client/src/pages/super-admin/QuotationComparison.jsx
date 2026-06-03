import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  RefreshCcw,
  Search,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Package,
  Building2,
  CalendarDays,
  ShoppingCart,
  X,
  Warehouse,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const defaultPoForm = {
  warehouse_id: "",
  po_date: today,
  expected_delivery_date: "",
  status: "approved",
  remarks: "",
};

const getArray = (res, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(res?.data?.[key])) return res.data[key];
  }

  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const formatNumber = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getStatusClass = (status) => {
  switch (status) {
    case "accepted":
      return "status accepted";
    case "rejected":
      return "status rejected";
    case "expired":
      return "status expired";
    case "closed":
      return "status accepted";
    case "quoted":
      return "status quoted";
    default:
      return "status pending";
  }
};

export default function QuotationComparison() {
  const [rfqs, setRfqs] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState("");
  const [comparison, setComparison] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poQuotation, setPoQuotation] = useState(null);
  const [poForm, setPoForm] = useState(defaultPoForm);

  const filteredItems = useMemo(() => {
    const items = comparison?.comparison_items || [];

    if (!search.trim()) return items;

    const term = search.toLowerCase();

    return items.filter((item) => {
      return (
        item.product_name?.toLowerCase().includes(term) ||
        item.product_code?.toLowerCase().includes(term) ||
        item.sku?.toLowerCase().includes(term)
      );
    });
  }, [comparison, search]);

  const quotations = comparison?.quotations || [];
  const summary = comparison?.summary || {};
  const bestQuotation = comparison?.best_overall_quotation || null;

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__quotationComparisonTimer);
    window.__quotationComparisonTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const [rfqRes, warehouseRes] = await Promise.allSettled([
        API.get("/api/rfqs"),
        API.get("/api/warehouses"),
      ]);

      if (rfqRes.status === "fulfilled") {
        const rfqList = getArray(rfqRes.value, ["rfqs", "data"]);
        setRfqs(rfqList);

        if (!selectedRfqId && rfqList.length > 0) {
          setSelectedRfqId(String(rfqList[0].id));
        }
      }

      if (warehouseRes.status === "fulfilled") {
        setWarehouses(
          getArray(warehouseRes.value, [
            "warehouses",
            "data",
            "warehouseList",
            "warehouse_list",
          ])
        );
      }
    } catch (error) {
      console.error("Fetch comparison dropdowns error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to load dropdown data"
      );
    } finally {
      setDropdownLoading(false);
    }
  }, [selectedRfqId]);

  const fetchComparison = useCallback(async () => {
    if (!selectedRfqId) {
      setComparison(null);
      return;
    }

    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get(
        `/api/quotations/rfq/${selectedRfqId}/comparison`
      );

      setComparison(res.data || null);
    } catch (error) {
      console.error("Fetch quotation comparison error:", error);

      if (error.response?.status === 404) {
        setApiMissing(true);
        setComparison(null);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message ||
          "Failed to load quotation comparison"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRfqId]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const handleAcceptQuotation = async (quotationId) => {
    const ok = window.confirm("Are you sure you want to accept this quotation?");

    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.patch(`/api/quotations/${quotationId}/status`, {
        status: "accepted",
      });

      showMessage(
        "success",
        res.data?.message || "Quotation accepted successfully"
      );

      fetchComparison();
    } catch (error) {
      console.error("Accept quotation error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to accept quotation"
      );
    } finally {
      setSaving(false);
    }
  };

  const openPoModal = (quotation) => {
    setPoQuotation(quotation);
    setPoForm({
      ...defaultPoForm,
      po_date: today,
      remarks: `PO created from quotation ${
        quotation.quotation_number || quotation.id
      }`,
    });
    setPoModalOpen(true);
  };

  const closePoModal = () => {
    setPoModalOpen(false);
    setPoQuotation(null);
    setPoForm(defaultPoForm);
  };

  const handlePoFormChange = (name, value) => {
    setPoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreatePurchaseOrder = async (e) => {
    e.preventDefault();

    if (!poQuotation?.id) {
      showMessage("error", "Quotation is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        warehouse_id: poForm.warehouse_id || null,
        po_date: poForm.po_date || today,
        expected_delivery_date: poForm.expected_delivery_date || null,
        status: poForm.status || "approved",
        remarks: poForm.remarks || null,
      };

      const res = await API.post(
        `/api/quotations/${poQuotation.id}/create-purchase-order`,
        payload
      );

      showMessage(
        "success",
        res.data?.message || "Purchase order created successfully"
      );

      closePoModal();
      fetchComparison();
    } catch (error) {
      console.error("Create PO from comparison error:", error);
      showMessage(
        "error",
        error.response?.data?.message ||
          "Failed to create purchase order from quotation"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="comparison-page">
        <style>{css}</style>

        <div className="page-head">
          <div>
            <div className="eyebrow">
              <BarChart3 size={15} />
              Procurement Module
            </div>

            <h1>Quotation Comparison</h1>

            <p>
              Compare all vendor quotations under one RFQ, check lowest price,
              product-wise vendor rates, accept best quote and create purchase
              order.
            </p>
          </div>

          <div className="head-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={fetchComparison}
              disabled={loading || !selectedRfqId}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle2 size={17} />
            ) : (
              <AlertCircle size={17} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {apiMissing && (
          <div className="message error">
            <AlertCircle size={17} />
            <span>
              Quotation Comparison backend route is not connected yet. Add
              /api/quotations/rfq/:rfq_id/comparison and restart server.
            </span>
          </div>
        )}

        <div className="control-card">
          <div className="field">
            <label>Select RFQ</label>
            <select
              value={selectedRfqId}
              onChange={(e) => setSelectedRfqId(e.target.value)}
              disabled={dropdownLoading}
            >
              <option value="">Select RFQ</option>
              {rfqs.map((rfq) => (
                <option key={rfq.id} value={rfq.id}>
                  {rfq.rfq_number || `RFQ-${rfq.id}`} — {rfq.title || ""}
                </option>
              ))}
            </select>
          </div>

          <div className="search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search product, code, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard
            icon={FileText}
            label="Total Quotations"
            value={summary.total_quotations || quotations.length || 0}
          />

          <SummaryCard
            icon={Package}
            label="RFQ Items"
            value={summary.total_items || filteredItems.length || 0}
          />

          <SummaryCard
            icon={IndianRupee}
            label="Lowest Value"
            value={formatCurrency(summary.lowest_quotation_value || 0)}
          />

          <SummaryCard
            icon={Building2}
            label="Lowest Vendor"
            value={summary.lowest_vendor_name || "-"}
          />
        </div>

        {comparison?.rfq && (
          <div className="rfq-card">
            <div>
              <span>RFQ</span>
              <strong>{comparison.rfq.rfq_number || `RFQ-${comparison.rfq.id}`}</strong>
            </div>

            <div>
              <span>Title</span>
              <strong>{comparison.rfq.title || "-"}</strong>
            </div>

            <div>
              <span>Required Date</span>
              <strong>{formatDate(comparison.rfq.required_date)}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong className={getStatusClass(comparison.rfq.status)}>
                {comparison.rfq.status || "-"}
              </strong>
            </div>
          </div>
        )}

        {bestQuotation && (
          <div className="best-card">
            <div>
              <span>Best Overall Quotation</span>
              <h2>{bestQuotation.quotation_number || `QT-${bestQuotation.id}`}</h2>
              <p>
                {bestQuotation.vendor_name || "-"} ·{" "}
                {formatCurrency(bestQuotation.total_amount)}
              </p>
            </div>

            <div className="best-actions">
              {bestQuotation.status !== "accepted" && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => handleAcceptQuotation(bestQuotation.id)}
                  disabled={saving}
                >
                  <CheckCircle2 size={16} />
                  Accept Quote
                </button>
              )}

              {!bestQuotation.purchase_order_id && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => openPoModal(bestQuotation)}
                  disabled={saving}
                >
                  <ShoppingCart size={16} />
                  Create PO
                </button>
              )}

              {bestQuotation.purchase_order_id && (
                <span className="po-created">
                  PO Created: {bestQuotation.po_number || bestQuotation.purchase_order_id}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Vendor Quotations</h2>
              <p>
                {loading
                  ? "Loading quotations..."
                  : `${quotations.length} quotation(s) for selected RFQ`}
              </p>
            </div>
          </div>

          <div className="quote-grid">
            {loading ? (
              <div className="empty">Loading quotation comparison...</div>
            ) : quotations.length === 0 ? (
              <div className="empty">No quotations found for this RFQ</div>
            ) : (
              quotations.map((quotation) => (
                <div className="quote-card" key={quotation.id}>
                  <div className="quote-top">
                    <div>
                      <h3>{quotation.quotation_number || `QT-${quotation.id}`}</h3>
                      <p>{quotation.vendor_name || "-"}</p>
                    </div>

                    <span className={getStatusClass(quotation.status)}>
                      {quotation.status || "pending"}
                    </span>
                  </div>

                  <div className="quote-stats">
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatCurrency(quotation.subtotal)}</strong>
                    </div>

                    <div>
                      <span>Tax</span>
                      <strong>{formatCurrency(quotation.tax_amount)}</strong>
                    </div>

                    <div>
                      <span>Total</span>
                      <strong>{formatCurrency(quotation.total_amount)}</strong>
                    </div>

                    <div>
                      <span>Valid Until</span>
                      <strong>{formatDate(quotation.valid_until)}</strong>
                    </div>
                  </div>

                  <div className="quote-actions">
                    {quotation.status !== "accepted" && (
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => handleAcceptQuotation(quotation.id)}
                        disabled={saving}
                      >
                        <CheckCircle2 size={14} />
                        Accept
                      </button>
                    )}

                    {!quotation.purchase_order_id && (
                      <button
                        type="button"
                        className="mini-btn dark"
                        onClick={() => openPoModal(quotation)}
                        disabled={saving}
                      >
                        <ShoppingCart size={14} />
                        Create PO
                      </button>
                    )}

                    {quotation.purchase_order_id && (
                      <span className="po-created small">
                        {quotation.po_number || "PO Created"}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Product-wise Comparison</h2>
              <p>Lowest quote is highlighted product-wise</p>
            </div>
          </div>

          <div className="comparison-list">
            {loading ? (
              <div className="empty">Loading product comparison...</div>
            ) : filteredItems.length === 0 ? (
              <div className="empty">No comparison items found</div>
            ) : (
              filteredItems.map((item) => (
                <div className="product-card" key={item.product_id}>
                  <div className="product-head">
                    <div>
                      <h3>{item.product_name || `Product #${item.product_id}`}</h3>
                      <p>
                        Code: {item.product_code || "-"} · SKU: {item.sku || "-"}
                      </p>
                    </div>

                    <div className="request-box">
                      <span>Requested Qty</span>
                      <strong>
                        {formatNumber(item.requested_quantity)}{" "}
                        {item.unit_short_name || item.unit_name || ""}
                      </strong>
                    </div>
                  </div>

                  <div className="vendor-rate-grid">
                    {item.vendor_quotes?.length ? (
                      item.vendor_quotes.map((quote) => {
                        const isBest =
                          item.best_quote &&
                          String(item.best_quote.quotation_id) ===
                            String(quote.quotation_id);

                        return (
                          <div
                            className={`vendor-rate-card ${isBest ? "best" : ""}`}
                            key={`${item.product_id}-${quote.quotation_id}`}
                          >
                            <div className="vendor-rate-head">
                              <strong>{quote.vendor_name || "-"}</strong>
                              {isBest && <span>Best</span>}
                            </div>

                            <div className="rate-row">
                              <span>Qty</span>
                              <b>{formatNumber(quote.quantity)}</b>
                            </div>

                            <div className="rate-row">
                              <span>Unit Price</span>
                              <b>{formatCurrency(quote.unit_price)}</b>
            </div>

                            <div className="rate-row">
                              <span>Tax</span>
                              <b>{formatNumber(quote.tax_rate)}%</b>
                            </div>

                            <div className="rate-total">
                              <span>Total</span>
                              <strong>{formatCurrency(quote.total_amount)}</strong>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty small-empty">
                        No vendor quote available for this product
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {poModalOpen && poQuotation && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-head">
                <div>
                  <h2>Create Purchase Order</h2>
                  <p>
                    Convert quotation{" "}
                    <strong>
                      {poQuotation.quotation_number || `QT-${poQuotation.id}`}
                    </strong>{" "}
                    into purchase order.
                  </p>
                </div>

                <button type="button" className="close-btn" onClick={closePoModal}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePurchaseOrder}>
                <div className="po-note">
                  <div>
                    <span>Vendor</span>
                    <strong>{poQuotation.vendor_name || "-"}</strong>
                  </div>

                  <div>
                    <span>Quotation Total</span>
                    <strong>{formatCurrency(poQuotation.total_amount)}</strong>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label>Warehouse</label>
                    <select
                      value={poForm.warehouse_id}
                      onChange={(e) =>
                        handlePoFormChange("warehouse_id", e.target.value)
                      }
                      disabled={dropdownLoading}
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name ||
                            warehouse.warehouse_name ||
                            warehouse.title ||
                            `Warehouse ${warehouse.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>PO Date</label>
                    <input
                      type="date"
                      value={poForm.po_date}
                      onChange={(e) =>
                        handlePoFormChange("po_date", e.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Expected Delivery</label>
                    <input
                      type="date"
                      value={poForm.expected_delivery_date}
                      onChange={(e) =>
                        handlePoFormChange(
                          "expected_delivery_date",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Status</label>
                    <select
                      value={poForm.status}
                      onChange={(e) =>
                        handlePoFormChange("status", e.target.value)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="approved">Approved</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>
                </div>

                <div className="field remarks-field">
                  <label>Remarks</label>
                  <textarea
                    rows="3"
                    value={poForm.remarks}
                    onChange={(e) =>
                      handlePoFormChange("remarks", e.target.value)
                    }
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={closePoModal}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="btn primary" disabled={saving}>
                    {saving ? "Creating..." : "Create Purchase Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-icon">
        <Icon size={20} />
      </div>

      <div>
        <p>{label}</p>
        <h3>{value}</h3>
      </div>
    </div>
  );
}

const css = `
  .comparison-page {
    min-height: 100vh;
    padding: 26px;
    color: #111827;
  }

  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 22px;
    margin-bottom: 20px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 210, 30, 0.16);
    color: #8a6b00;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  .page-head h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1.08;
    font-weight: 900;
    letter-spacing: -1px;
    color: #0b0d12;
  }

  .page-head p {
    margin: 10px 0 0;
    max-width: 780px;
    color: #6b7280;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.7;
  }

  .head-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn {
    height: 42px;
    padding: 0 15px;
    border: none;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.18s ease, opacity 0.18s ease;
    white-space: nowrap;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }

  .btn.primary {
    background: linear-gradient(135deg, #ffd21e, #e7b900);
    color: #111827;
    box-shadow: 0 14px 28px rgba(231, 185, 0, 0.28);
  }

  .btn.secondary {
    background: #ffffff;
    color: #111827;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  }

  .message {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 850;
  }

  .message.success {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
  }

  .message.error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
  }

  .control-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 22px;
    padding: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 18px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.055);
  }

  .field label {
    display: block;
    margin-bottom: 8px;
    color: #6b7280;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .field input,
  .field select,
  .field textarea {
    width: 100%;
    height: 44px;
    border: 1px solid #e5e7eb;
    outline: none;
    background: #f8fafc;
    border-radius: 15px;
    padding: 0 12px;
    color: #111827;
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .field textarea {
    height: auto;
    min-height: 92px;
    resize: vertical;
    padding-top: 12px;
  }

  .search-box {
    height: 44px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 15px;
    padding: 0 13px;
    align-self: end;
  }

  .search-box input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: #111827;
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .summary-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 22px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
  }

  .summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111827;
    color: #ffd21e;
    flex-shrink: 0;
  }

  .summary-card p {
    margin: 0;
    color: #7b8190;
    font-size: 12px;
    font-weight: 850;
  }

  .summary-card h3 {
    margin: 5px 0 0;
    color: #0b0d12;
    font-size: 21px;
    font-weight: 950;
    letter-spacing: -0.5px;
  }

  .rfq-card,
  .best-card,
  .table-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 24px;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.065);
    margin-bottom: 18px;
  }

  .rfq-card {
    padding: 18px;
    display: grid;
    grid-template-columns: 0.7fr 1.4fr 0.7fr 0.5fr;
    gap: 14px;
  }

  .rfq-card span,
  .best-card span,
  .quote-stats span,
  .request-box span,
  .po-note span {
    display: block;
    color: #7b8190;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .rfq-card strong,
  .quote-stats strong,
  .request-box strong {
    display: inline-flex;
    margin-top: 5px;
    color: #111827;
    font-size: 13px;
    font-weight: 950;
  }

  .best-card {
    padding: 20px;
    background: linear-gradient(135deg, #111827, #05070a);
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .best-card span {
    color: rgba(255,255,255,0.62);
  }

  .best-card h2 {
    margin: 5px 0 4px;
    color: #ffd21e;
    font-size: 24px;
    font-weight: 950;
  }

  .best-card p {
    margin: 0;
    color: rgba(255,255,255,0.82);
    font-size: 13px;
    font-weight: 800;
  }

  .best-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .po-created {
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    border-radius: 999px;
    padding: 0 12px;
    background: #ecfdf5;
    color: #047857;
    font-size: 12px;
    font-weight: 950;
  }

  .po-created.small {
    min-height: 30px;
  }

  .table-card {
    overflow: hidden;
  }

  .table-head {
    padding: 18px 20px;
    border-bottom: 1px solid #edf0f4;
  }

  .table-head h2 {
    margin: 0;
    color: #0b0d12;
    font-size: 18px;
    font-weight: 950;
  }

  .table-head p {
    margin: 4px 0 0;
    color: #7b8190;
    font-size: 12px;
    font-weight: 750;
  }

  .quote-grid {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .quote-card {
    border: 1px solid #edf0f4;
    border-radius: 20px;
    padding: 15px;
    background: #ffffff;
  }

  .quote-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }

  .quote-top h3 {
    margin: 0;
    color: #111827;
    font-size: 16px;
    font-weight: 950;
  }

  .quote-top p {
    margin: 4px 0 0;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .quote-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .quote-stats div {
    background: #f8fafc;
    border: 1px solid #edf0f4;
    border-radius: 15px;
    padding: 10px;
  }

  .quote-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 14px;
  }

  .mini-btn {
    min-height: 34px;
    border: none;
    border-radius: 12px;
    background: #ecfdf5;
    color: #047857;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .mini-btn.dark {
    background: #111827;
    color: #ffd21e;
  }

  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status.accepted {
    background: #ecfdf5;
    color: #047857;
  }

  .status.pending {
    background: #fff7ed;
    color: #c2410c;
  }

  .status.quoted {
    background: #fefce8;
    color: #a16207;
  }

  .status.rejected {
    background: #fef2f2;
    color: #b91c1c;
  }

  .status.expired {
    background: #f3f4f6;
    color: #4b5563;
  }

  .comparison-list {
    padding: 16px;
    display: grid;
    gap: 14px;
  }

  .product-card {
    border: 1px solid #edf0f4;
    border-radius: 22px;
    padding: 16px;
    background: #ffffff;
  }

  .product-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .product-head h3 {
    margin: 0;
    color: #111827;
    font-size: 17px;
    font-weight: 950;
  }

  .product-head p {
    margin: 5px 0 0;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .request-box {
    min-width: 160px;
    border-radius: 16px;
    background: #111827;
    padding: 12px;
  }

  .request-box span {
    color: rgba(255,255,255,0.62);
  }

  .request-box strong {
    color: #ffd21e;
  }

  .vendor-rate-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .vendor-rate-card {
    border: 1px solid #edf0f4;
    background: #f8fafc;
    border-radius: 18px;
    padding: 13px;
  }

  .vendor-rate-card.best {
    border-color: #ffd21e;
    background: #fffbe8;
    box-shadow: 0 12px 28px rgba(231, 185, 0, 0.14);
  }

  .vendor-rate-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .vendor-rate-head strong {
    color: #111827;
    font-size: 13px;
    font-weight: 950;
  }

  .vendor-rate-head span {
    background: #111827;
    color: #ffd21e;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 950;
  }

  .rate-row,
  .rate-total {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 0;
    font-size: 12px;
  }

  .rate-row span,
  .rate-total span {
    color: #6b7280;
    font-weight: 850;
  }

  .rate-row b {
    color: #111827;
    font-weight: 950;
  }

  .rate-total {
    border-top: 1px solid #e5e7eb;
    margin-top: 5px;
    padding-top: 10px;
  }

  .rate-total strong {
    color: #111827;
    font-size: 14px;
    font-weight: 950;
  }

  .empty {
    padding: 28px;
    text-align: center;
    color: #9ca3af;
    font-size: 13px;
    font-weight: 850;
  }

  .small-empty {
    grid-column: 1 / -1;
    background: #f8fafc;
    border-radius: 16px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(7, 8, 11, 0.62);
    backdrop-filter: blur(7px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .modal-card {
    width: 100%;
    max-width: 620px;
    max-height: 92vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 28px;
    box-shadow: 0 38px 120px rgba(0,0,0,0.35);
  }

  .modal-head {
    padding: 22px 24px;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .modal-head h2 {
    margin: 0;
    color: #0b0d12;
    font-size: 23px;
    font-weight: 950;
    letter-spacing: -0.5px;
  }

  .modal-head p {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 13px;
    font-weight: 700;
  }

  .close-btn {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #111827;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-card form {
    padding: 22px 24px 24px;
  }

  .po-note {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 18px;
  }

  .po-note div {
    background: #111827;
    border-radius: 18px;
    padding: 15px;
  }

  .po-note span {
    color: rgba(255,255,255,0.62);
  }

  .po-note strong {
    display: block;
    margin-top: 5px;
    color: #ffd21e;
    font-size: 16px;
    font-weight: 950;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .remarks-field {
    margin-top: 14px;
  }

  .modal-actions {
    margin-top: 22px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  @media (max-width: 1200px) {
    .summary-grid,
    .quote-grid,
    .vendor-rate-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rfq-card {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .comparison-page {
      padding: 18px;
    }

    .page-head,
    .best-card,
    .product-head {
      flex-direction: column;
    }

    .summary-grid,
    .control-card,
    .quote-grid,
    .vendor-rate-grid,
    .rfq-card,
    .form-grid,
    .po-note {
      grid-template-columns: 1fr;
    }

    .modal-backdrop {
      padding: 12px;
    }

    .modal-head,
    .modal-card form {
      padding: 18px;
    }
  }
`;
