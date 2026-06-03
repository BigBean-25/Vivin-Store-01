import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import { AlertCircle, CheckCircle2, Edit3, Eye, FileText, Plus, RefreshCcw, Search, ShoppingCart, Trash2, Warehouse, X } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const emptyItem = () => ({ product_id: "", quantity: "", unit_price: "", tax_rate: "0" });
const defaultForm = { rfq_id: "", vendor_id: "", quotation_date: today, valid_until: "", status: "pending", remarks: "", items: [emptyItem()] };
const defaultPoForm = { warehouse_id: "", po_date: today, expected_delivery_date: "", status: "approved", remarks: "" };

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

const getArray = (res, keys = []) => {
  for (const key of keys) if (Array.isArray(res?.data?.[key])) return res.data[key];
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const formatCurrency = (value) => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const getStatusClass = (status) => `status ${status || "pending"}`;
const getVendorName = (vendor) => vendor?.business_name || vendor?.vendor_name || vendor?.company_name || vendor?.name || `Vendor #${vendor?.id || "-"}`;

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [summary, setSummary] = useState({});
  const [vendors, setVendors] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poQuotation, setPoQuotation] = useState(null);
  const [poForm, setPoForm] = useState(defaultPoForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const totals = useMemo(() => {
    return form.items.reduce((acc, item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unit_price || 0);
      const taxRate = Number(item.tax_rate || 0);
      const subtotal = qty * price;
      const tax = (subtotal * taxRate) / 100;
      acc.subtotal += subtotal;
      acc.tax += tax;
      acc.total += subtotal + tax;
      return acc;
    }, { subtotal: 0, tax: 0, total: 0 });
  }, [form.items]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(window.__quotationTimer);
    window.__quotationTimer = window.setTimeout(() => setMessage({ type: "", text: "" }), 3500);
  };

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);
      const params = { search: filters.search || undefined, status: filters.status || undefined };
      const [listRes, summaryRes] = await Promise.all([API.get("/api/quotations", { params }), API.get("/api/quotations/summary")]);
      setQuotations(getArray(listRes, ["quotations", "data"]));
      setSummary(summaryRes.data?.summary || {});
    } catch (error) {
      if (error.response?.status === 404) {
        setApiMissing(true);
        setQuotations([]);
        setSummary({});
        return;
      }
      showMessage("error", error.response?.data?.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchDropdowns = useCallback(async () => {
    const [vendorRes, rfqRes, productRes, warehouseRes] = await Promise.allSettled([API.get("/api/vendors"), API.get("/api/rfqs"), API.get("/api/products"), API.get("/api/warehouses")]);
    if (vendorRes.status === "fulfilled") setVendors(getArray(vendorRes.value, ["vendors", "data", "vendorList"]));
    if (rfqRes.status === "fulfilled") setRfqs(getArray(rfqRes.value, ["rfqs", "data"]));
    if (productRes.status === "fulfilled") setProducts(getArray(productRes.value, ["products", "data", "productList", "product_list"]));
    if (warehouseRes.status === "fulfilled") setWarehouses(getArray(warehouseRes.value, ["warehouses", "data", "warehouseList", "warehouse_list"]));
  }, []);

  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);
  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  const resetForm = () => { setForm({ ...defaultForm, quotation_date: today, items: [emptyItem()] }); setEditId(null); };
  const closeModal = () => { setModalOpen(false); resetForm(); };
  const openCreate = () => { resetForm(); setModalOpen(true); };
  const handleFormChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const handleItemChange = (index, name, value) => setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, [name]: value } : item) }));
  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (index) => setForm((prev) => prev.items.length === 1 ? prev : { ...prev, items: prev.items.filter((_, i) => i !== index) });

  const openPoModal = (quotation) => {
    setPoQuotation(quotation);
    setPoForm({
      ...defaultPoForm,
      po_date: today,
      remarks: `PO created from quotation ${quotation.quotation_number || quotation.id}`,
    });
    setPoModalOpen(true);
  };

  const closePoModal = () => {
    setPoModalOpen(false);
    setPoQuotation(null);
    setPoForm(defaultPoForm);
  };

  const handlePoFormChange = (name, value) => {
    setPoForm((prev) => ({ ...prev, [name]: value }));
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
      const res = await API.post(`/api/quotations/${poQuotation.id}/create-purchase-order`, payload);
      showMessage("success", res.data?.message || "Purchase order created successfully");
      closePoModal();
      fetchQuotations();
    } catch (error) {
      console.error("Create PO from quotation error:", error);
      showMessage("error", error.response?.data?.message || "Failed to create purchase order from quotation");
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    if (!form.vendor_id) return "Vendor is required";
    for (let i = 0; i < form.items.length; i += 1) {
      if (!form.items[i].product_id) return `Product is required in item ${i + 1}`;
      if (Number(form.items[i].quantity || 0) <= 0) return `Quantity must be greater than 0 in item ${i + 1}`;
    }
    return "";
  };

  const payload = () => ({ ...form, rfq_id: form.rfq_id || null, valid_until: form.valid_until || null, remarks: form.remarks || null, items: form.items.map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity || 0), unit_price: Number(item.unit_price || 0), tax_rate: Number(item.tax_rate || 0) })) });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateForm();
    if (error) return showMessage("error", error);
    try {
      setSaving(true);
      const res = editId ? await API.put(`/api/quotations/${editId}`, payload()) : await API.post("/api/quotations", payload());
      showMessage("success", res.data?.message || "Quotation saved successfully");
      closeModal();
      fetchQuotations();
    } catch (err) {
      showMessage("error", err.response?.data?.message || "Failed to save quotation");
    } finally { setSaving(false); }
  };

  const openEdit = async (quotation) => {
    try {
      setSaving(true);
      const res = await API.get(`/api/quotations/${quotation.id}`);
      const data = res.data?.quotation || res.data?.data || quotation;
      setEditId(data.id);
      setForm({ rfq_id: data.rfq_id || "", vendor_id: data.vendor_id || "", quotation_date: data.quotation_date ? String(data.quotation_date).slice(0, 10) : today, valid_until: data.valid_until ? String(data.valid_until).slice(0, 10) : "", status: data.status || "pending", remarks: data.remarks || "", items: data.items?.length ? data.items.map((item) => ({ product_id: item.product_id || "", quantity: item.quantity || "", unit_price: item.unit_price || "", tax_rate: item.tax_rate || "0" })) : [emptyItem()] });
      setModalOpen(true);
    } catch (err) { showMessage("error", err.response?.data?.message || "Failed to open quotation"); }
    finally { setSaving(false); }
  };

  const openView = async (id) => {
    try {
      setSaving(true);
      const res = await API.get(`/api/quotations/${id}`);
      setSelected(res.data?.quotation || res.data?.data || res.data);
      setViewOpen(true);
    } catch (err) { showMessage("error", err.response?.data?.message || "Failed to open quotation"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    if (!window.confirm(`Mark quotation as ${status}?`)) return;
    try { setSaving(true); const res = await API.patch(`/api/quotations/${id}/status`, { status }); showMessage("success", res.data?.message || "Status updated"); fetchQuotations(); }
    catch (err) { showMessage("error", err.response?.data?.message || "Failed to update status"); }
    finally { setSaving(false); }
  };

  const deleteQuotation = async (id) => {
    if (!window.confirm("Delete this quotation?")) return;
    try { setSaving(true); const res = await API.delete(`/api/quotations/${id}`); showMessage("success", res.data?.message || "Quotation deleted"); fetchQuotations(); }
    catch (err) { showMessage("error", err.response?.data?.message || "Failed to delete quotation"); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="quotation-page">
        <style>{css}</style>
        <div className="page-head">
          <div><div className="eyebrow"><FileText size={15} /> Procurement Module</div><h1>Quotations</h1><p>Capture vendor quotations, compare totals, and accept or reject supplier offers.</p></div>
          <div className="head-actions"><button className="btn secondary" onClick={fetchQuotations} disabled={loading}><RefreshCcw size={16} />Refresh</button><button className="btn primary" onClick={openCreate} disabled={apiMissing}><Plus size={17} />New Quotation</button></div>
        </div>
        {message.text && <div className={`message ${message.type}`}>{message.type === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{message.text}</span></div>}
        {apiMissing && <div className="message error"><AlertCircle size={17} /><span>Quotation backend route is not connected yet. Add backend route /api/quotations and restart server.</span></div>}
        <div className="summary-grid"><SummaryCard label="Total Quotations" value={summary.total_quotations || quotations.length || 0} /><SummaryCard label="Total Value" value={formatCurrency(summary.total_amount || 0)} /><SummaryCard label="Accepted" value={summary.accepted_count || 0} /><SummaryCard label="Pending" value={summary.pending_count || 0} /></div>
        <div className="filter-card"><div className="search-box"><Search size={17} /><input placeholder="Search quotation, vendor, RFQ..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} /></div><select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>{statusOptions.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}</select></div>
        <div className="table-card"><div className="table-head"><div><h2>Quotation List</h2><p>{loading ? "Loading quotations..." : `${quotations.length} quotation record(s) found`}</p></div></div><div className="table-wrap"><table><thead><tr><th>Quotation No</th><th>Vendor</th><th>RFQ</th><th>Date</th><th>Valid Until</th><th>Items</th><th>Total</th><th>Status</th><th className="right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="9" className="empty">Loading quotations...</td></tr> : quotations.length === 0 ? <tr><td colSpan="9" className="empty">No quotations found</td></tr> : quotations.map((q) => <tr key={q.id}><td><strong>{q.quotation_number || `QT-${q.id}`}</strong></td><td>{q.vendor_name || `Vendor #${q.vendor_id}`}</td><td>{q.rfq_number || "-"}</td><td>{formatDate(q.quotation_date)}</td><td>{formatDate(q.valid_until)}</td><td>{q.item_count || 0}</td><td><strong>{formatCurrency(q.total_amount)}</strong></td><td><span className={getStatusClass(q.status)}>{q.status}</span></td><td className="right"><div className="action-row"><button className="icon-btn" onClick={() => openView(q.id)}><Eye size={15} /></button>{!q.purchase_order_id && q.status !== "rejected" && q.status !== "expired" && <button className="icon-btn success" title="Create Purchase Order" onClick={() => openPoModal(q)}><ShoppingCart size={15} /></button>}{q.status === "pending" && <button className="icon-btn" onClick={() => openEdit(q)}><Edit3 size={15} /></button>}{q.status === "pending" && <button className="icon-btn success" onClick={() => updateStatus(q.id, "accepted")}>✓</button>}{q.status === "pending" && <button className="icon-btn danger" onClick={() => deleteQuotation(q.id)}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div></div>
        {modalOpen && <div className="modal-backdrop"><div className="modal-card large"><div className="modal-head"><div><h2>{editId ? "Edit Quotation" : "Create Quotation"}</h2><p>Add vendor, optional RFQ, products, prices and tax rates.</p></div><button className="close-btn" onClick={closeModal}><X size={18} /></button></div><form onSubmit={handleSubmit}><div className="form-grid"><div className="field"><label>Vendor *</label><select value={form.vendor_id} onChange={(e) => handleFormChange("vendor_id", e.target.value)} required><option value="">Select Vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{getVendorName(v)}</option>)}</select></div><div className="field"><label>RFQ</label><select value={form.rfq_id} onChange={(e) => handleFormChange("rfq_id", e.target.value)}><option value="">No RFQ</option>{rfqs.map((r) => <option key={r.id} value={r.id}>{r.rfq_number || `RFQ-${r.id}`} - {r.title}</option>)}</select></div><div className="field"><label>Quotation Date</label><input type="date" value={form.quotation_date} onChange={(e) => handleFormChange("quotation_date", e.target.value)} /></div><div className="field"><label>Valid Until</label><input type="date" value={form.valid_until} onChange={(e) => handleFormChange("valid_until", e.target.value)} /></div></div><div className="field main-reason"><label>Remarks</label><textarea rows="3" value={form.remarks} onChange={(e) => handleFormChange("remarks", e.target.value)} /></div><div className="items-section"><div className="items-head"><div><h3>Quotation Items</h3><p>Subtotal {formatCurrency(totals.subtotal)} · Tax {formatCurrency(totals.tax)} · Total {formatCurrency(totals.total)}</p></div><button type="button" className="mini-btn" onClick={addItem}><Plus size={15} />Add Item</button></div><div className="items-list">{form.items.map((item, index) => <div className="item-card" key={index}><div className="item-title"><strong>Item {index + 1}</strong>{form.items.length > 1 && <button type="button" className="remove-btn" onClick={() => removeItem(index)}><X size={15} /></button>}</div><div className="item-grid"><div className="field"><label>Product *</label><select value={item.product_id} onChange={(e) => handleItemChange(index, "product_id", e.target.value)} required><option value="">Select Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name || p.product_name || p.title} {p.sku ? `(${p.sku})` : ""}</option>)}</select></div><div className="field"><label>Qty *</label><input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} required /></div><div className="field"><label>Unit Price</label><input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(index, "unit_price", e.target.value)} /></div><div className="field"><label>Tax %</label><input type="number" min="0" step="0.01" value={item.tax_rate} onChange={(e) => handleItemChange(index, "tax_rate", e.target.value)} /></div></div></div>)}</div></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={closeModal}>Cancel</button><button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving..." : "Save Quotation"}</button></div></form></div></div>}
        {viewOpen && selected && <div className="modal-backdrop"><div className="modal-card large"><div className="modal-head"><div><h2>{selected.quotation_number}</h2><p>{selected.vendor_name || "-"} · {selected.status}</p></div><button className="close-btn" onClick={() => setViewOpen(false)}><X size={18} /></button></div><div className="detail-strip"><strong>Total: {formatCurrency(selected.total_amount)}</strong><span>Subtotal: {formatCurrency(selected.subtotal)}</span><span>Tax: {formatCurrency(selected.tax_amount)}</span></div>{selected.remarks && <div className="remarks-box"><strong>Remarks</strong><p>{selected.remarks}</p></div>}<div className="table-card inner"><div className="table-head"><div><h2>Items</h2><p>Quotation product details</p></div></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Code</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Total</th></tr></thead><tbody>{selected.items?.length ? selected.items.map((item) => <tr key={item.id}><td><strong>{item.product_name || `Product #${item.product_id}`}</strong></td><td>{item.product_code || "-"}</td><td>{item.sku || "-"}</td><td>{formatNumber(item.quantity)}</td><td>{formatCurrency(item.unit_price)}</td><td>{formatNumber(item.tax_rate)}</td><td><strong>{formatCurrency(item.total_amount)}</strong></td></tr>) : <tr><td colSpan="7" className="empty">No items found</td></tr>}</tbody></table></div></div></div></div>}
        {poModalOpen && poQuotation && <div className="modal-backdrop"><div className="modal-card small"><div className="modal-head"><div><h2>Create Purchase Order</h2><p>Convert quotation <strong>{poQuotation.quotation_number || `QT-${poQuotation.id}`}</strong> into purchase order.</p></div><button type="button" className="close-btn" onClick={closePoModal}><X size={18} /></button></div><form onSubmit={handleCreatePurchaseOrder}><div className="po-note"><div><span>Vendor</span><strong>{poQuotation.vendor_name || "-"}</strong></div><div><span>Quotation Total</span><strong>{formatCurrency(poQuotation.total_amount)}</strong></div></div><div className="form-grid po-form-grid"><div className="field"><label>Warehouse</label><select value={poForm.warehouse_id} onChange={(e) => handlePoFormChange("warehouse_id", e.target.value)}><option value="">Select Warehouse</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.warehouse_name || warehouse.title || `Warehouse ${warehouse.id}`}</option>)}</select></div><div className="field"><label>PO Date</label><input type="date" value={poForm.po_date} onChange={(e) => handlePoFormChange("po_date", e.target.value)} /></div><div className="field"><label>Expected Delivery Date</label><input type="date" value={poForm.expected_delivery_date} onChange={(e) => handlePoFormChange("expected_delivery_date", e.target.value)} /></div><div className="field"><label>Status</label><select value={poForm.status} onChange={(e) => handlePoFormChange("status", e.target.value)}><option value="draft">Draft</option><option value="approved">Approved</option><option value="sent">Sent</option></select></div></div><div className="field remarks-field"><label>Remarks</label><textarea rows="3" value={poForm.remarks} onChange={(e) => handlePoFormChange("remarks", e.target.value)} placeholder="PO created from accepted vendor quotation" /></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={closePoModal}>Cancel</button><button type="submit" className="btn primary" disabled={saving}>{saving ? "Creating..." : "Create Purchase Order"}</button></div></form></div></div>}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value }) {
  return <div className="summary-card"><div className="summary-icon"><FileText size={20} /></div><div><p>{label}</p><h3>{value}</h3></div></div>;
}

const css = `
  .quotation-page { min-height: 100vh; padding: 26px; color: #111827; }
  .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 22px; margin-bottom: 20px; }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: rgba(255,210,30,.16); color: #8a6b00; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
  .page-head h1 { margin: 0; font-size: 34px; line-height: 1.08; font-weight: 900; letter-spacing: -1px; color: #0b0d12; }
  .page-head p { margin: 10px 0 0; max-width: 740px; color: #6b7280; font-size: 14px; font-weight: 650; line-height: 1.7; }
  .head-actions, .action-row, .modal-actions { display: flex; align-items: center; gap: 10px; }
  .modal-actions { justify-content: flex-end; margin-top: 22px; }
  .btn { height: 42px; padding: 0 15px; border: none; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 900; cursor: pointer; white-space: nowrap; }
  .btn:disabled { opacity: .62; cursor: not-allowed; }
  .btn.primary { background: linear-gradient(135deg, #ffd21e, #e7b900); color: #111827; box-shadow: 0 14px 28px rgba(231,185,0,.28); }
  .btn.secondary { background: #fff; color: #111827; border: 1px solid #e5e7eb; box-shadow: 0 10px 24px rgba(15,23,42,.06); }
  .message { display: flex; align-items: center; gap: 9px; padding: 13px 15px; border-radius: 16px; margin-bottom: 18px; font-size: 13px; font-weight: 850; }
  .message.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #047857; }
  .message.error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
  .summary-card, .filter-card, .table-card, .modal-card, .items-section, .item-card, .remarks-box, .detail-strip { background: #fff; border: 1px solid #edf0f4; box-shadow: 0 16px 40px rgba(15,23,42,.06); }
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
  table { width: 100%; border-collapse: collapse; min-width: 1080px; }
  th { background: #f8fafc; color: #6b7280; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .55px; text-align: left; padding: 14px 16px; border-bottom: 1px solid #edf0f4; }
  td { padding: 15px 16px; border-bottom: 1px solid #f1f5f9; color: #374151; font-size: 13px; font-weight: 700; vertical-align: middle; }
  td strong { color: #111827; font-weight: 950; }
  .right { text-align: right; }
  .empty { text-align: center; color: #9ca3af; padding: 34px 16px; font-weight: 850; }
  .status { display: inline-flex; align-items: center; justify-content: center; min-height: 28px; padding: 0 10px; border-radius: 999px; font-size: 11px; font-weight: 950; text-transform: capitalize; }
  .status.accepted { background: #ecfdf5; color: #047857; }
  .status.rejected, .status.expired { background: #fef2f2; color: #b91c1c; }
  .status.pending { background: #fff7ed; color: #c2410c; }
  .icon-btn, .close-btn { border-radius: 11px; border: 1px solid #e5e7eb; background: #fff; color: #111827; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .icon-btn { width: 32px; height: 32px; }
  .close-btn { width: 38px; height: 38px; border-radius: 14px; }
  .icon-btn:hover { background: #111827; color: #ffd21e; }
  .icon-btn.danger:hover { background: #b91c1c; color: #fff; }
  .icon-btn.success:hover { background: #047857; color: #fff; }
  .modal-backdrop { position: fixed; inset: 0; z-index: 999; background: rgba(7,8,11,.62); backdrop-filter: blur(7px); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal-card { width: 100%; max-height: 92vh; overflow-y: auto; border-radius: 28px; box-shadow: 0 38px 120px rgba(0,0,0,.35); }
  .modal-card.large { max-width: 1120px; }
  .modal-card.small { max-width: 620px; }
  .po-note { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .po-note div { background: #111827; border-radius: 18px; padding: 15px; }
  .po-note span { display: block; color: rgba(255,255,255,.62); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; }
  .po-note strong { display: block; margin-top: 5px; color: #ffd21e; font-size: 16px; font-weight: 950; }
  .po-form-grid { grid-template-columns: 1fr 1fr; }
  .modal-head { padding: 22px 24px; border-bottom: 1px solid #edf0f4; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .modal-head h2 { margin: 0; color: #0b0d12; font-size: 23px; font-weight: 950; }
  .modal-head p { margin: 6px 0 0; color: #6b7280; font-size: 13px; font-weight: 700; }
  .modal-card form { padding: 22px 24px 24px; }
  .form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
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
  .item-grid { display: grid; grid-template-columns: 1.4fr .5fr .6fr .45fr; gap: 12px; }
  .detail-strip { margin: 18px 24px 0; border-radius: 18px; padding: 15px; display: flex; flex-wrap: wrap; gap: 14px; color: #111827; font-weight: 850; }
  .remarks-box { margin: 18px 24px 0; border-radius: 18px; padding: 15px; box-shadow: none; }
  .remarks-box strong { color: #111827; font-size: 13px; font-weight: 950; }
  .remarks-box p { margin: 6px 0 0; color: #4b5563; font-size: 13px; font-weight: 700; line-height: 1.7; }
  .theme-light .quotation-page { background: #f6f7fb; color: #111827; }
  .theme-dark .quotation-page { background: #0b0f19; color: #f8fafc; }
  .theme-dark .page-head h1, .theme-dark .summary-card h3, .theme-dark .table-head h2, .theme-dark td strong, .theme-dark .modal-head h2, .theme-dark .field input, .theme-dark .field select, .theme-dark .field textarea, .theme-dark .filter-card select, .theme-dark .search-box input, .theme-dark .items-head h3, .theme-dark .item-title strong, .theme-dark .remarks-box strong, .theme-dark .detail-strip { color: #f8fafc; }
  .theme-dark .page-head p, .theme-dark .summary-card p, .theme-dark .table-head p, .theme-dark .modal-head p, .theme-dark .field label, .theme-dark .items-head p, .theme-dark .remarks-box p, .theme-dark td { color: rgba(255,255,255,.68); }
  .theme-dark .summary-card, .theme-dark .filter-card, .theme-dark .table-card, .theme-dark .modal-card, .theme-dark .items-section, .theme-dark .item-card, .theme-dark .remarks-box, .theme-dark .detail-strip { background: rgba(255,255,255,.055); border-color: rgba(255,255,255,.09); box-shadow: 0 18px 48px rgba(0,0,0,.24); }
  .theme-dark .items-head, .theme-dark th, .theme-dark .table-head { background: rgba(255,255,255,.045); border-color: rgba(255,255,255,.09); color: rgba(255,255,255,.55); }
  .theme-dark .search-box, .theme-dark .filter-card select, .theme-dark .field input, .theme-dark .field select, .theme-dark .field textarea { background: rgba(255,255,255,.055); border-color: rgba(255,255,255,.10); }
  .theme-dark td { border-color: rgba(255,255,255,.07); }
  .theme-dark .btn.secondary, .theme-dark .icon-btn, .theme-dark .close-btn { background: rgba(255,255,255,.065); border-color: rgba(255,255,255,.10); color: #f8fafc; }
  .theme-dark select option { background: #0f172a; color: #f8fafc; }
  @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filter-card, .form-grid, .item-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 700px) { .quotation-page { padding: 18px; } .page-head { flex-direction: column; } .head-actions { width: 100%; } .head-actions .btn { flex: 1; } .summary-grid, .filter-card, .form-grid, .item-grid, .po-note, .po-form-grid { grid-template-columns: 1fr; } .modal-backdrop { padding: 12px; } .modal-head, .modal-card form { padding: 18px; } }
`;
