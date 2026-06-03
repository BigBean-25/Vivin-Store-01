import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Eye,
  FileQuestion,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const emptyItem = () => ({
  product_id: "",
  quantity: "",
  unit_id: "",
  remarks: "",
});

const defaultForm = {
  title: "",
  required_date: today,
  status: "draft",
  remarks: "",
  items: [emptyItem()],
};

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "quoted", label: "Quoted" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const createStatusOptions = statusOptions.filter((item) => item.value);

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

const formatNumber = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getStatusClass = (status) => `status ${status || "draft"}`;

export default function Rfqs() {
  const [rfqs, setRfqs] = useState([]);
  const [summary, setSummary] = useState({});
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);

  const [filters, setFilters] = useState({ search: "", status: "" });
  const [form, setForm] = useState(defaultForm);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [editId, setEditId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const totalQuantity = useMemo(() => {
    return form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [form.items]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__rfqTimer);
    window.__rfqTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchRfqs = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const params = {
        search: filters.search || undefined,
        status: filters.status || undefined,
      };

      const [listRes, summaryRes] = await Promise.all([
        API.get("/api/rfqs", { params }),
        API.get("/api/rfqs/summary"),
      ]);

      setRfqs(getArray(listRes, ["rfqs", "data"]));
      setSummary(summaryRes.data?.summary || summaryRes.data?.data || summaryRes.data || {});
    } catch (error) {
      console.error("Fetch RFQs error:", error);

      if (error.response?.status === 404) {
        setApiMissing(true);
        setRfqs([]);
        setSummary({});
        return;
      }

      showMessage("error", error.response?.data?.message || "Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const [productRes, unitRes] = await Promise.allSettled([
        API.get("/api/products"),
        API.get("/api/units"),
      ]);

      if (productRes.status === "fulfilled") {
        setProducts(getArray(productRes.value, ["products", "data", "productList", "product_list"]));
      }

      if (unitRes.status === "fulfilled") {
        setUnits(getArray(unitRes.value, ["units", "data", "unitList", "unit_list"]));
      }
    } catch (error) {
      console.error("Fetch RFQ dropdowns error:", error);
      showMessage("error", error.response?.data?.message || "Failed to load dropdown data");
    } finally {
      setDropdownLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    fetchRfqs();
  }, [fetchRfqs]);

  const resetForm = () => {
    setForm({ ...defaultForm, required_date: today, items: [emptyItem()] });
    setEditId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleFormChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, name, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [name]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
    });
  };

  const validateForm = () => {
    if (!form.title.trim()) return "RFQ title is required";
    if (!Array.isArray(form.items) || form.items.length === 0) return "At least one RFQ item is required";

    for (let index = 0; index < form.items.length; index += 1) {
      const item = form.items[index];
      if (!item.product_id) return `Product is required in item ${index + 1}`;
      if (!item.quantity || Number(item.quantity) <= 0) return `Quantity must be greater than 0 in item ${index + 1}`;
    }

    return "";
  };

  const buildPayload = () => ({
    title: form.title,
    required_date: form.required_date || null,
    status: form.status || "draft",
    remarks: form.remarks || null,
    items: form.items.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      unit_id: item.unit_id || null,
      remarks: item.remarks || null,
    })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showMessage("error", validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();
      const res = editId
        ? await API.put(`/api/rfqs/${editId}`, payload)
        : await API.post("/api/rfqs", payload);

      showMessage("success", res.data?.message || (editId ? "RFQ updated successfully" : "RFQ created successfully"));
      closeModal();
      fetchRfqs();
    } catch (error) {
      console.error("Save RFQ error:", error);
      showMessage("error", error.response?.data?.message || "Failed to save RFQ");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (rfq) => {
    try {
      setSaving(true);

      const res = await API.get(`/api/rfqs/${rfq.id}`);
      const data = res.data?.rfq || res.data?.data || rfq;

      setEditId(data.id);
      setForm({
        title: data.title || "",
        required_date: data.required_date ? String(data.required_date).slice(0, 10) : today,
        status: data.status || "draft",
        remarks: data.remarks || "",
        items: Array.isArray(data.items) && data.items.length
          ? data.items.map((item) => ({
              product_id: item.product_id || "",
              quantity: item.quantity || "",
              unit_id: item.unit_id || "",
              remarks: item.remarks || "",
            }))
          : [emptyItem()],
      });
      setModalOpen(true);
    } catch (error) {
      console.error("Open RFQ edit error:", error);
      showMessage("error", error.response?.data?.message || "Failed to open RFQ");
    } finally {
      setSaving(false);
    }
  };

  const openView = async (id) => {
    try {
      setSaving(true);

      const res = await API.get(`/api/rfqs/${id}`);
      setSelectedRfq(res.data?.rfq || res.data?.data || res.data);
      setViewOpen(true);
    } catch (error) {
      console.error("View RFQ error:", error);
      showMessage("error", error.response?.data?.message || "Failed to open RFQ");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    const ok = window.confirm(`Are you sure you want to mark this RFQ as ${status}?`);
    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.patch(`/api/rfqs/${id}/status`, { status });
      showMessage("success", res.data?.message || "RFQ status updated successfully");
      fetchRfqs();
    } catch (error) {
      console.error("Update RFQ status error:", error);
      showMessage("error", error.response?.data?.message || "Failed to update RFQ status");
    } finally {
      setSaving(false);
    }
  };

  const deleteRfq = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this RFQ?");
    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.delete(`/api/rfqs/${id}`);
      showMessage("success", res.data?.message || "RFQ deleted successfully");
      fetchRfqs();
    } catch (error) {
      console.error("Delete RFQ error:", error);
      showMessage("error", error.response?.data?.message || "Failed to delete RFQ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="rfq-page">
        <style>{css}</style>

        <div className="page-head">
          <div>
            <div className="eyebrow">
              <FileQuestion size={15} />
              Procurement Module
            </div>
            <h1>RFQs</h1>
            <p>Create request for quotations, track supplier quote status, and prepare procurement sourcing.</p>
          </div>

          <div className="head-actions">
            <button type="button" className="btn secondary" onClick={fetchRfqs} disabled={loading}>
              <RefreshCcw size={16} />
              Refresh
            </button>
            <button type="button" className="btn primary" onClick={openCreateModal} disabled={apiMissing}>
              <Plus size={17} />
              New RFQ
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
            <span>{message.text}</span>
          </div>
        )}

        {apiMissing && (
          <div className="message error">
            <AlertCircle size={17} />
            <span>RFQ backend route is not connected yet. Add backend route /api/rfqs and restart server.</span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard icon={FileQuestion} label="Total RFQs" value={summary.total_rfqs || rfqs.length || 0} />
          <SummaryCard icon={Send} label="Sent" value={summary.sent_count || 0} />
          <SummaryCard icon={CheckCircle2} label="Quoted" value={summary.quoted_count || 0} />
          <SummaryCard icon={ClipboardList} label="Total Qty" value={formatNumber(summary.total_quantity || 0)} />
        </div>

        <div className="filter-card">
          <div className="search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search RFQ number, title, remarks..."
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </div>

          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>RFQ List</h2>
              <p>{loading ? "Loading RFQs..." : `${rfqs.length} RFQ record(s) found`}</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>RFQ No</th>
                  <th>Title</th>
                  <th>Required Date</th>
                  <th>Items</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="empty">Loading RFQs...</td></tr>
                ) : rfqs.length === 0 ? (
                  <tr><td colSpan="7" className="empty">No RFQs found</td></tr>
                ) : (
                  rfqs.map((rfq) => (
                    <tr key={rfq.id}>
                      <td><strong>{rfq.rfq_number || `RFQ-${rfq.id}`}</strong></td>
                      <td>{rfq.title || "-"}</td>
                      <td>{formatDate(rfq.required_date)}</td>
                      <td>{rfq.item_count || 0}</td>
                      <td><span className="qty-pill">{formatNumber(rfq.total_quantity || 0)}</span></td>
                      <td><span className={getStatusClass(rfq.status)}>{rfq.status || "draft"}</span></td>
                      <td className="right">
                        <div className="action-row">
                          <button type="button" className="icon-btn" title="View" onClick={() => openView(rfq.id)}><Eye size={15} /></button>
                          {!(["closed", "cancelled"].includes(rfq.status)) && (
                            <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(rfq)}><Edit3 size={15} /></button>
                          )}
                          {rfq.status === "draft" && (
                            <button type="button" className="icon-btn success" title="Send" onClick={() => updateStatus(rfq.id, "sent")}><Send size={15} /></button>
                          )}
                          {!(["closed", "cancelled"].includes(rfq.status)) && (
                            <button type="button" className="icon-btn" title="Close" onClick={() => updateStatus(rfq.id, "closed")}><CheckCircle2 size={15} /></button>
                          )}
                          {!(["closed", "quoted"].includes(rfq.status)) && (
                            <button type="button" className="icon-btn danger" title="Delete" onClick={() => deleteRfq(rfq.id)}><Trash2 size={15} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card large">
              <div className="modal-head">
                <div>
                  <h2>{editId ? "Edit RFQ" : "Create RFQ"}</h2>
                  <p>Add products, quantities, unit and remarks for supplier quotation request.</p>
                </div>
                <button type="button" className="close-btn" onClick={closeModal}><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field wide">
                    <label>RFQ Title *</label>
                    <input value={form.title} onChange={(event) => handleFormChange("title", event.target.value)} required />
                  </div>
                  <div className="field">
                    <label>Required Date</label>
                    <input type="date" value={form.required_date} onChange={(event) => handleFormChange("required_date", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select value={form.status} onChange={(event) => handleFormChange("status", event.target.value)}>
                      {createStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field main-reason">
                  <label>Remarks</label>
                  <textarea rows="3" value={form.remarks} onChange={(event) => handleFormChange("remarks", event.target.value)} />
                </div>

                <div className="items-section">
                  <div className="items-head">
                    <div>
                      <h3>RFQ Items</h3>
                      <p>Total quantity: {formatNumber(totalQuantity)}</p>
                    </div>
                    <button type="button" className="mini-btn" onClick={addItem}><Plus size={15} />Add Item</button>
                  </div>

                  <div className="items-list">
                    {form.items.map((item, index) => (
                      <div className="item-card" key={`${index}-${item.product_id}`}>
                        <div className="item-title">
                          <strong>Item {index + 1}</strong>
                          {form.items.length > 1 && <button type="button" className="remove-btn" onClick={() => removeItem(index)}><X size={15} /></button>}
                        </div>
                        <div className="item-grid">
                          <div className="field">
                            <label>Product *</label>
                            <select value={item.product_id} onChange={(event) => handleItemChange(index, "product_id", event.target.value)} required disabled={dropdownLoading}>
                              <option value="">Select Product</option>
                              {products.map((product) => <option key={product.id} value={product.id}>{product.name || product.product_name || product.title} {product.sku ? `(${product.sku})` : ""}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label>Quantity *</label>
                            <input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => handleItemChange(index, "quantity", event.target.value)} required />
                          </div>
                          <div className="field">
                            <label>Unit</label>
                            <select value={item.unit_id} onChange={(event) => handleItemChange(index, "unit_id", event.target.value)} disabled={dropdownLoading}>
                              <option value="">Select Unit</option>
                              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name || unit.unit_name || unit.symbol}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label>Remarks</label>
                            <input value={item.remarks} onChange={(event) => handleItemChange(index, "remarks", event.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving..." : editId ? "Update RFQ" : "Save RFQ"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewOpen && selectedRfq && (
          <div className="modal-backdrop">
            <div className="modal-card large">
              <div className="modal-head">
                <div>
                  <h2>{selectedRfq.rfq_number || "RFQ Details"}</h2>
                  <p>{selectedRfq.title || "-"} · {selectedRfq.status || "draft"}</p>
                </div>
                <button type="button" className="close-btn" onClick={() => setViewOpen(false)}><X size={18} /></button>
              </div>

              {selectedRfq.remarks && <div className="remarks-box"><strong>Remarks</strong><p>{selectedRfq.remarks}</p></div>}

              <div className="table-card inner">
                <div className="table-head"><div><h2>RFQ Items</h2><p>Products requested for quotation</p></div></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Product</th><th>Code</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Remarks</th></tr></thead>
                    <tbody>
                      {selectedRfq.items?.length ? selectedRfq.items.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.product_name || `Product #${item.product_id}`}</strong></td>
                          <td>{item.product_code || "-"}</td>
                          <td>{item.sku || "-"}</td>
                          <td><span className="qty-pill">{formatNumber(item.quantity)}</span></td>
                          <td>{item.unit_name || "-"}</td>
                          <td>{item.remarks || "-"}</td>
                        </tr>
                      )) : <tr><td colSpan="6" className="empty">No RFQ items found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
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
      <div className="summary-icon"><Icon size={20} /></div>
      <div><p>{label}</p><h3>{value}</h3></div>
    </div>
  );
}

const css = `
  .rfq-page { min-height: 100vh; padding: 26px; color: #111827; }
  .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 22px; margin-bottom: 20px; }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: rgba(255,210,30,.16); color: #8a6b00; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
  .page-head h1 { margin: 0; font-size: 34px; line-height: 1.08; font-weight: 900; letter-spacing: -1px; color: #0b0d12; }
  .page-head p { margin: 10px 0 0; max-width: 740px; color: #6b7280; font-size: 14px; font-weight: 650; line-height: 1.7; }
  .head-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn { height: 42px; padding: 0 15px; border: none; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 900; cursor: pointer; white-space: nowrap; }
  .btn:disabled { opacity: .62; cursor: not-allowed; }
  .btn.primary { background: linear-gradient(135deg, #ffd21e, #e7b900); color: #111827; box-shadow: 0 14px 28px rgba(231,185,0,.28); }
  .btn.secondary { background: #fff; color: #111827; border: 1px solid #e5e7eb; box-shadow: 0 10px 24px rgba(15,23,42,.06); }
  .message { display: flex; align-items: center; gap: 9px; padding: 13px 15px; border-radius: 16px; margin-bottom: 18px; font-size: 13px; font-weight: 850; }
  .message.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #047857; }
  .message.error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
  .summary-card, .filter-card, .table-card, .modal-card, .items-section, .item-card, .remarks-box { background: #fff; border: 1px solid #edf0f4; box-shadow: 0 16px 40px rgba(15,23,42,.06); }
  .summary-card { border-radius: 22px; padding: 18px; display: flex; align-items: center; gap: 14px; }
  .summary-icon { width: 46px; height: 46px; border-radius: 17px; display: flex; align-items: center; justify-content: center; background: #111827; color: #ffd21e; flex-shrink: 0; }
  .summary-card p { margin: 0; color: #7b8190; font-size: 12px; font-weight: 850; }
  .summary-card h3 { margin: 5px 0 0; color: #0b0d12; font-size: 22px; font-weight: 950; }
  .filter-card { border-radius: 22px; padding: 14px; display: grid; grid-template-columns: 1fr 260px; gap: 12px; margin-bottom: 18px; }
  .search-box { height: 44px; display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 15px; padding: 0 13px; }
  .search-box input, .filter-card select, .field input, .field select, .field textarea { width: 100%; border: none; outline: none; background: transparent; color: #111827; font-size: 13px; font-weight: 750; font-family: inherit; }
  .filter-card select, .field input, .field select, .field textarea { height: 44px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 15px; padding: 0 12px; }
  .field textarea { height: auto; min-height: 92px; resize: vertical; padding-top: 12px; }
  .table-card { border-radius: 24px; overflow: hidden; }
  .table-card.inner { box-shadow: none; margin: 18px 24px 24px; }
  .table-head { padding: 18px 20px; border-bottom: 1px solid #edf0f4; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .table-head h2 { margin: 0; color: #0b0d12; font-size: 18px; font-weight: 950; }
  .table-head p { margin: 4px 0 0; color: #7b8190; font-size: 12px; font-weight: 750; }
  .table-wrap { width: 100%; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; min-width: 980px; }
  th { background: #f8fafc; color: #6b7280; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .55px; text-align: left; padding: 14px 16px; border-bottom: 1px solid #edf0f4; }
  td { padding: 15px 16px; border-bottom: 1px solid #f1f5f9; color: #374151; font-size: 13px; font-weight: 700; vertical-align: middle; }
  td strong { color: #111827; font-weight: 950; }
  .right { text-align: right; }
  .empty { text-align: center; color: #9ca3af; padding: 34px 16px; font-weight: 850; }
  .qty-pill, .status { display: inline-flex; align-items: center; justify-content: center; min-height: 28px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 950; text-transform: capitalize; }
  .qty-pill { background: #f3f4f6; color: #111827; }
  .status.closed, .status.quoted { background: #ecfdf5; color: #047857; }
  .status.sent { background: #eff6ff; color: #1d4ed8; }
  .status.cancelled { background: #fef2f2; color: #b91c1c; }
  .status.draft { background: #fff7ed; color: #c2410c; }
  .action-row { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
  .icon-btn, .close-btn { border-radius: 11px; border: 1px solid #e5e7eb; background: #fff; color: #111827; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .icon-btn { width: 32px; height: 32px; }
  .close-btn { width: 38px; height: 38px; border-radius: 14px; }
  .icon-btn:hover { background: #111827; color: #ffd21e; }
  .icon-btn.danger:hover { background: #b91c1c; color: #fff; }
  .icon-btn.success:hover { background: #047857; color: #fff; }
  .modal-backdrop { position: fixed; inset: 0; z-index: 999; background: rgba(7,8,11,.62); backdrop-filter: blur(7px); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal-card { width: 100%; max-height: 92vh; overflow-y: auto; border-radius: 28px; box-shadow: 0 38px 120px rgba(0,0,0,.35); }
  .modal-card.large { max-width: 1100px; }
  .modal-head { padding: 22px 24px; border-bottom: 1px solid #edf0f4; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .modal-head h2 { margin: 0; color: #0b0d12; font-size: 23px; font-weight: 950; }
  .modal-head p { margin: 6px 0 0; color: #6b7280; font-size: 13px; font-weight: 700; }
  .modal-card form { padding: 22px 24px 24px; }
  .form-grid { display: grid; grid-template-columns: 1.4fr .7fr .7fr; gap: 14px; }
  .field label { display: block; margin-bottom: 8px; color: #6b7280; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .6px; }
  .main-reason { margin-top: 14px; }
  .items-section { margin-top: 20px; border-radius: 22px; overflow: hidden; }
  .items-head { padding: 16px; background: #f8fafc; border-bottom: 1px solid #edf0f4; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .items-head h3 { margin: 0; font-size: 16px; font-weight: 950; color: #111827; }
  .items-head p { margin: 4px 0 0; color: #7b8190; font-size: 12px; font-weight: 750; }
  .mini-btn { height: 36px; border: none; border-radius: 13px; background: #111827; color: #ffd21e; display: inline-flex; align-items: center; gap: 7px; padding: 0 12px; font-weight: 900; cursor: pointer; }
  .items-list { padding: 14px; display: grid; gap: 12px; }
  .item-card { border-radius: 19px; padding: 14px; box-shadow: none; }
  .item-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .item-title strong { color: #111827; font-size: 13px; font-weight: 950; }
  .remove-btn { width: 30px; height: 30px; border-radius: 11px; border: none; background: #fef2f2; color: #b91c1c; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .item-grid { display: grid; grid-template-columns: 1.4fr .55fr .55fr 1fr; gap: 12px; }
  .modal-actions { margin-top: 22px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
  .remarks-box { margin: 18px 24px 0; border-radius: 18px; padding: 15px; box-shadow: none; }
  .remarks-box strong { color: #111827; font-size: 13px; font-weight: 950; }
  .remarks-box p { margin: 6px 0 0; color: #4b5563; font-size: 13px; font-weight: 700; line-height: 1.7; }
  .theme-light .rfq-page { background: #f6f7fb; color: #111827; }
  .theme-dark .rfq-page { background: #0b0f19; color: #f8fafc; }
  .theme-dark .page-head h1, .theme-dark .summary-card h3, .theme-dark .table-head h2, .theme-dark td strong, .theme-dark .modal-head h2, .theme-dark .field input, .theme-dark .field select, .theme-dark .field textarea, .theme-dark .filter-card select, .theme-dark .search-box input, .theme-dark .items-head h3, .theme-dark .item-title strong, .theme-dark .remarks-box strong { color: #f8fafc; }
  .theme-dark .page-head p, .theme-dark .summary-card p, .theme-dark .table-head p, .theme-dark .modal-head p, .theme-dark .field label, .theme-dark .items-head p, .theme-dark .remarks-box p, .theme-dark td { color: rgba(255,255,255,.68); }
  .theme-dark .summary-card, .theme-dark .filter-card, .theme-dark .table-card, .theme-dark .modal-card, .theme-dark .items-section, .theme-dark .item-card, .theme-dark .remarks-box { background: rgba(255,255,255,.055); border-color: rgba(255,255,255,.09); box-shadow: 0 18px 48px rgba(0,0,0,.24); }
  .theme-dark .items-head, .theme-dark th, .theme-dark .table-head { background: rgba(255,255,255,.045); border-color: rgba(255,255,255,.09); color: rgba(255,255,255,.55); }
  .theme-dark .search-box, .theme-dark .filter-card select, .theme-dark .field input, .theme-dark .field select, .theme-dark .field textarea { background: rgba(255,255,255,.055); border-color: rgba(255,255,255,.10); }
  .theme-dark td { border-color: rgba(255,255,255,.07); }
  .theme-dark .btn.secondary, .theme-dark .icon-btn, .theme-dark .close-btn { background: rgba(255,255,255,.065); border-color: rgba(255,255,255,.10); color: #f8fafc; }
  .theme-dark .qty-pill { background: rgba(255,255,255,.08); color: #f8fafc; }
  .theme-dark select option { background: #0f172a; color: #f8fafc; }
  @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filter-card, .form-grid, .item-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 700px) { .rfq-page { padding: 18px; } .page-head { flex-direction: column; } .head-actions { width: 100%; } .head-actions .btn { flex: 1; } .summary-grid, .filter-card, .form-grid, .item-grid { grid-template-columns: 1fr; } .modal-backdrop { padding: 12px; } .modal-head, .modal-card form { padding: 18px; } }
`;
