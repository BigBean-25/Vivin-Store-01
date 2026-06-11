import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardList,
  IndianRupee,
  Loader2,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";

const fmt = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const fmtNum = (v) => Number(v || 0).toLocaleString("en-IN");

const fmtDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtDateTime = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const safe = (v) => (v !== null && v !== undefined && v !== "" ? String(v) : "-");

const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "dispatched", "delivered", "cancelled", "returned"];
const VALID_NEXT = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed:     ["dispatched", "cancelled"],
  dispatched: ["delivered"],
  delivered:  [],
  cancelled:  [],
  returned:   [],
};
const PAYMENT_STATUSES = ["pending", "partial", "paid", "failed", "refunded"];

const DELIVERY_STATUS_COLOR = {
  pending:    { bg: "rgba(234,179,8,0.13)",  color: "#CA8A04" },
  assigned:   { bg: "rgba(37,99,235,0.12)",  color: "#2563EB" },
  picked:     { bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  in_transit: { bg: "rgba(234,88,12,0.12)",  color: "#EA580C" },
  delivered:  { bg: "rgba(22,163,74,0.13)",  color: "#16A34A" },
  failed:     { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
  cancelled:  { bg: "rgba(107,114,128,0.12)",color: "#6B7280" },
};

const RETURN_STATUS_COLOR = {
  requested: { bg: "rgba(234,179,8,0.13)",  color: "#CA8A04" },
  approved:  { bg: "rgba(37,99,235,0.12)",  color: "#2563EB" },
  picked:    { bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  received:  { bg: "rgba(6,182,212,0.12)",  color: "#0891B2" },
  refunded:  { bg: "rgba(22,163,74,0.13)",  color: "#16A34A" },
  rejected:  { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
};

const ORDER_STATUS_COLOR = {
  pending:    { bg: "rgba(234,179,8,0.13)",  color: "#CA8A04" },
  confirmed:  { bg: "rgba(37,99,235,0.12)",  color: "#2563EB" },
  processing: { bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  packed:     { bg: "rgba(6,182,212,0.12)",  color: "#0891B2" },
  dispatched: { bg: "rgba(234,88,12,0.12)",  color: "#EA580C" },
  delivered:  { bg: "rgba(22,163,74,0.13)",  color: "#16A34A" },
  cancelled:  { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
  returned:   { bg: "rgba(107,114,128,0.12)",color: "#6B7280" },
};

const PAYMENT_STATUS_COLOR = {
  pending:  { bg: "rgba(234,179,8,0.13)",  color: "#CA8A04" },
  partial:  { bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  paid:     { bg: "rgba(22,163,74,0.13)",  color: "#16A34A" },
  failed:   { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
  refunded: { bg: "rgba(107,114,128,0.12)",color: "#6B7280" },
};

function StatusBadge({ value, map }) {
  const style = map[value] || { bg: "rgba(107,114,128,0.1)", color: "#6B7280" };
  return (
    <span style={{ background: style.bg, color: style.color, padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 900, display: "inline-block" }}>
      {value ? value.charAt(0).toUpperCase() + value.slice(1) : "-"}
    </span>
  );
}

const emptyItem = () => ({ product_id: "", product_name: "", quantity: 1, unit_price: 0, tax_rate: 0, total_amount: 0 });

const emptyForm = {
  customer_id: "",
  source_type: "warehouse",
  order_date: new Date().toISOString().slice(0, 10),
  delivery_date: "",
  discount_amount: 0,
  shipping_amount: 0,
  billing_address: "",
  shipping_address: "",
  remarks: "",
  items: [emptyItem()],
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [formMode, setFormMode] = useState("create");
  const [editId, setEditId] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [paymentData, setPaymentData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_date: new Date().toISOString().slice(0, 10), transaction_reference: "", remarks: "" });
  const [paymentError, setPaymentError] = useState("");

  const [invoiceData, setInvoiceData] = useState(null);
  const [deliveryData, setDeliveryData] = useState(null);
  const [returnsData, setReturnsData] = useState([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ delivery_address: "", delivery_date: "", pickup_address: "" });
  const [dispatchError, setDispatchError] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({ reason: "" });
  const [returnError, setReturnError] = useState("");

  const [custSearch, setCustSearch] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [prodSearches, setProdSearches] = useState({});

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (filterStatus) params.set("order_status", filterStatus);
      if (filterPayment) params.set("payment_status", filterPayment);
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);

      const [ordersRes, summaryRes] = await Promise.all([
        API.get(`/api/orders?${params}`),
        API.get("/api/orders/summary"),
      ]);

      if (ordersRes.data.success) setOrders(ordersRes.data.orders || []);
      if (summaryRes.data.success) setSummary(summaryRes.data.summary || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPayment, fromDate, toDate]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        API.get("/api/customers"),
        API.get("/api/products"),
      ]);
      setCustomers(Array.isArray(cRes.data?.customers) ? cRes.data.customers : Array.isArray(cRes.data) ? cRes.data : []);
      setProducts(Array.isArray(pRes.data?.products) ? pRes.data.products : Array.isArray(pRes.data) ? pRes.data : []);
    } catch {
      setCustomers([]);
      setProducts([]);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        String(o.order_number || "").toLowerCase().includes(q) ||
        String(o.customer_name || "").toLowerCase().includes(q) ||
        String(o.customer_code || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const calcTotals = (items, discount, shipping) => {
    let subtotal = 0, taxAmount = 0;
    for (const it of items) {
      const lineSub = Number(it.quantity || 0) * Number(it.unit_price || 0);
      const lineTax = (lineSub * Number(it.tax_rate || 0)) / 100;
      subtotal += lineSub;
      taxAmount += lineTax;
    }
    const total = subtotal + taxAmount - Number(discount || 0) + Number(shipping || 0);
    return { subtotal: subtotal.toFixed(2), tax_amount: taxAmount.toFixed(2), total: Math.max(0, total).toFixed(2) };
  };

  const totals = useMemo(
    () => calcTotals(form.items, form.discount_amount, form.shipping_amount),
    [form.items, form.discount_amount, form.shipping_amount]
  );

  const handleItemChange = (idx, field, val) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      if (field === "product_id") {
        const prod = products.find((p) => String(p.id) === String(val));
        updated.product_name = prod?.name || "";
        updated.unit_price = prod?.base_price || 0;
      }
      const lineSub = Number(updated.quantity || 0) * Number(updated.unit_price || 0);
      const lineTax = (lineSub * Number(updated.tax_rate || 0)) / 100;
      updated.total_amount = (lineSub + lineTax).toFixed(2);
      return updated;
    });
    setForm((f) => ({ ...f, items }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormMode("create");
    setEditId(null);
    setFormError("");
    setCustSearch("");
    setCustOpen(false);
    setProdSearches({});
    setShowForm(true);
  };

  const openEdit = (order) => {
    setForm({
      customer_id: order.customer_id || "",
      source_type: order.source_type || "warehouse",
      order_date: order.order_date ? String(order.order_date).slice(0, 10) : "",
      delivery_date: order.delivery_date ? String(order.delivery_date).slice(0, 10) : "",
      discount_amount: order.discount_amount || 0,
      shipping_amount: order.shipping_amount || 0,
      billing_address: order.billing_address || "",
      shipping_address: order.shipping_address || "",
      remarks: order.remarks || "",
      items: [emptyItem()],
    });
    setFormMode("edit");
    setEditId(order.id);
    setFormError("");
    setShowForm(true);
  };

  const openView = async (id) => {
    try {
      const [orderRes, payRes, invRes, delRes, retRes] = await Promise.all([
        API.get(`/api/orders/${id}`),
        API.get(`/api/orders/${id}/payments`).catch(() => ({ data: { success: false } })),
        API.get(`/api/orders/${id}/invoice`).catch(() => ({ data: { success: false } })),
        API.get(`/api/orders/${id}/delivery`).catch(() => ({ data: { success: false } })),
        API.get(`/api/orders/${id}/returns`).catch(() => ({ data: { success: false } })),
      ]);
      if (orderRes.data.success) {
        setViewOrder(orderRes.data.order);
        setPaymentData(payRes.data?.success ? payRes.data : null);
        setInvoiceData(invRes.data?.success ? invRes.data.invoice : null);
        setDeliveryData(delRes.data?.success ? delRes.data.delivery : null);
        setReturnsData(retRes.data?.success ? retRes.data.returns : []);
        setShowView(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load order");
    }
  };

  const openStatusModal = (order) => {
    const firstNext = (VALID_NEXT[order.order_status] || [])[0] || "";
    setStatusTarget(order);
    setNewStatus(firstNext);
    setStatusRemarks("");
    setShowStatusModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    setSaving(true);
    try {
      if (formMode === "create") {
        const payload = {
          ...form,
          items: form.items.map((it) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate,
            total_amount: it.total_amount,
          })),
        };
        await API.post("/api/orders", payload);
      } else {
        await API.put(`/api/orders/${editId}`, {
          delivery_date: form.delivery_date,
          discount_amount: form.discount_amount,
          shipping_amount: form.shipping_amount,
          billing_address: form.billing_address,
          shipping_address: form.shipping_address,
          remarks: form.remarks,
        });
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSave = async () => {
    setSaving(true);
    try {
      await API.patch(`/api/orders/${statusTarget.id}/status`, {
        order_status: newStatus,
        remarks: statusRemarks,
      });
      setShowStatusModal(false);
      fetchAll();
      if (showView && viewOrder?.id === statusTarget.id) openView(statusTarget.id);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Delete order ${order.order_number}? This cannot be undone.`)) return;
    try {
      await API.delete(`/api/orders/${order.id}`);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete order");
    }
  };

  const openPaymentModal = (order) => {
    setPaymentTarget(order);
    setPaymentForm({ amount: "", payment_date: new Date().toISOString().slice(0, 10), transaction_reference: "", remarks: "" });
    setPaymentError("");
    setShowPaymentModal(true);
  };

  const handlePaymentSave = async () => {
    setPaymentError("");
    setSaving(true);
    try {
      await API.post(`/api/orders/${paymentTarget.id}/payments`, paymentForm);
      setShowPaymentModal(false);
      fetchAll();
      if (showView && viewOrder?.id === paymentTarget.id) {
        const payRes = await API.get(`/api/orders/${paymentTarget.id}/payments`);
        if (payRes.data.success) setPaymentData(payRes.data);
      }
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setSaving(true);
    try {
      await API.post(`/api/orders/${viewOrder.id}/invoice`);
      const invRes = await API.get(`/api/orders/${viewOrder.id}/invoice`);
      if (invRes.data.success) setInvoiceData(invRes.data.invoice);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate invoice");
    } finally {
      setSaving(false);
    }
  };

  const openDispatchModal = () => {
    setDispatchForm({ delivery_address: viewOrder?.shipping_address || "", delivery_date: "", pickup_address: "" });
    setDispatchError("");
    setShowDispatchModal(true);
  };

  const handleDispatchSave = async () => {
    setDispatchError("");
    setSaving(true);
    try {
      await API.post(`/api/orders/${viewOrder.id}/dispatch`, dispatchForm);
      setShowDispatchModal(false);
      const [orderRes, delRes] = await Promise.all([
        API.get(`/api/orders/${viewOrder.id}`),
        API.get(`/api/orders/${viewOrder.id}/delivery`),
      ]);
      if (orderRes.data.success) setViewOrder(orderRes.data.order);
      if (delRes.data.success)   setDeliveryData(delRes.data.delivery);
      fetchAll();
    } catch (err) {
      setDispatchError(err.response?.data?.message || "Failed to dispatch order");
    } finally {
      setSaving(false);
    }
  };

  const openReturnModal = () => {
    setReturnForm({ reason: "" });
    setReturnError("");
    setShowReturnModal(true);
  };

  const handleReturnSave = async () => {
    setReturnError("");
    setSaving(true);
    try {
      await API.post(`/api/orders/${viewOrder.id}/return`, returnForm);
      setShowReturnModal(false);
      const [orderRes, retRes] = await Promise.all([
        API.get(`/api/orders/${viewOrder.id}`),
        API.get(`/api/orders/${viewOrder.id}/returns`),
      ]);
      if (orderRes.data.success) setViewOrder(orderRes.data.order);
      if (retRes.data.success)   setReturnsData(retRes.data.returns);
      fetchAll();
    } catch (err) {
      setReturnError(err.response?.data?.message || "Failed to create return");
    } finally {
      setSaving(false);
    }
  };

  const s = summary;

  const statCards = [
    { label: "Total Orders", value: fmtNum(s.total_orders), hint: "All time", color: "#FFD21E", icon: ShoppingCart },
    { label: "Pending", value: fmtNum(s.pending), hint: "Awaiting action", color: "#CA8A04", icon: CircleDot },
    { label: "Processing", value: fmtNum(s.processing), hint: `+ ${fmtNum(s.confirmed)} confirmed`, color: "#7C3AED", icon: Loader2 },
    { label: "Delivered", value: fmtNum(s.delivered), hint: `${fmtNum(s.dispatched)} dispatched`, color: "#16A34A", icon: PackageCheck },
    { label: "Cancelled", value: fmtNum(s.cancelled), hint: `${fmtNum(s.returned)} returned`, color: "#EF4444", icon: Ban },
    { label: "Paid Orders", value: fmtNum(s.paid_orders), hint: `${fmtNum(s.unpaid_orders)} unpaid`, color: "#2563EB", icon: BadgeCheck },
    { label: "Active Revenue", value: fmt(s.active_revenue), hint: "Excl. cancelled/returned", color: "#16A34A", icon: IndianRupee },
    { label: "Total Revenue", value: fmt(s.total_revenue), hint: "All orders", color: "#FFD21E", icon: ArrowLeftRight },
  ];

  return (
    <AdminLayout>
      <style>{css}</style>
      <div className="or-page">

        {/* Hero */}
        <section className="or-hero">
          <div className="or-hero-grid" />
          <div className="or-glow-1" />
          <div className="or-glow-2" />
          <div className="or-hero-left">
            <div className="or-hero-icon"><ShoppingCart size={26} /></div>
            <div>
              <div className="or-kicker"><span />Customer Orders</div>
              <h1>Orders</h1>
              <p>Create and manage customer sales orders, track status, payments and fulfilment.</p>
            </div>
          </div>
          <div className="or-hero-actions">
            <button className="or-btn-outline" onClick={fetchAll} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
            </button>
            <button className="or-btn-primary" onClick={openCreate}>
              <Plus size={15} /> New Order
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="or-stats">
          {statCards.map((c) => {
            const Icon = c.icon;
            return (
              <div className="or-stat" key={c.label}>
                <div className="or-stat-top">
                  <div className="or-stat-icon" style={{ background: `${c.color}18`, color: c.color }}><Icon size={18} /></div>
                  <div className="or-stat-bar" style={{ background: c.color }} />
                </div>
                <h3>{c.value}</h3>
                <p>{c.label}</p>
                <span>{c.hint}</span>
              </div>
            );
          })}
        </section>

        {error && (
          <div className="or-error">
            <X size={14} /><span>{error}</span>
            <button onClick={() => { setError(""); fetchAll(); }}>Retry</button>
          </div>
        )}

        {/* Filters */}
        <section className="or-filters">
          <div className="or-search">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer…" />
            {search && <button className="or-clear" onClick={() => setSearch("")}><X size={12} /></button>}
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="or-select">
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="or-select">
            <option value="">All Payments</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="or-select" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="or-select" />
        </section>

        {/* Table */}
        <section className="or-card">
          <div className="or-card-header">
            <strong>Orders</strong>
            <span className="or-count">{filtered.length} records</span>
          </div>

          {loading ? (
            <div className="or-empty"><RefreshCw size={20} className="spin" /><p>Loading orders…</p></div>
          ) : filtered.length === 0 ? (
            <div className="or-empty"><Package size={20} /><p>No orders found</p></div>
          ) : (
            <div className="or-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Order No.</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th>Order Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, idx) => (
                    <tr key={o.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <button className="or-link" onClick={() => openView(o.id)}>{safe(o.order_number)}</button>
                      </td>
                      <td>
                        <strong>{safe(o.customer_name)}</strong>
                        <div className="or-sub">{safe(o.customer_code)}</div>
                      </td>
                      <td><span className="or-pill">{fmtNum(o.item_count)} items</span></td>
                      <td><span className="or-amount">{fmt(o.total_amount)}</span></td>
                      <td><StatusBadge value={o.order_status} map={ORDER_STATUS_COLOR} /></td>
                      <td><StatusBadge value={o.payment_status} map={PAYMENT_STATUS_COLOR} /></td>
                      <td>{fmtDate(o.order_date)}</td>
                      <td>
                        <div className="or-actions">
                          <button className="or-act-btn" title="Update Status" onClick={() => openStatusModal(o)}><ChevronDown size={14} /></button>
                          {["pending", "confirmed"].includes(o.order_status) && (
                            <button className="or-act-btn" title="Edit" onClick={() => openEdit(o)}><ClipboardList size={14} /></button>
                          )}
                          {["pending", "cancelled"].includes(o.order_status) && (
                            <button className="or-act-btn or-act-del" title="Delete" onClick={() => handleDelete(o)}><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* ── Create / Edit Modal ── */}
      {showForm && (
        <div className="or-overlay" onClick={() => setShowForm(false)}>
          <div className="or-modal or-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-head">
              <h2>{formMode === "create" ? "New Order" : "Edit Order"}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            {formError && <div className="or-form-error"><X size={13} />{formError}</div>}

            <div className="or-form-scroll">
              <div className="or-form-grid">
                {formMode === "create" && (
                  <>
                    <div className="or-field or-field-full">
                      <label>Customer *</label>
                      <div className="or-combo" style={{ position: "relative" }}>
                        <input
                          className="or-combo-input"
                          placeholder="Type to search customer…"
                          value={custSearch}
                          autoComplete="off"
                          onFocus={() => setCustOpen(true)}
                          onBlur={() => setTimeout(() => setCustOpen(false), 160)}
                          onChange={(e) => {
                            setCustSearch(e.target.value);
                            setForm((f) => ({ ...f, customer_id: "" }));
                            setCustOpen(true);
                          }}
                        />
                        {form.customer_id && (
                          <span className="or-combo-selected">
                            {customers.find((c) => String(c.id) === String(form.customer_id))?.business_name || ""}
                          </span>
                        )}
                        {custOpen && (
                          <div className="or-combo-dropdown">
                            {customers
                              .filter((c) => {
                                const q = custSearch.toLowerCase();
                                return !q ||
                                  String(c.business_name || "").toLowerCase().includes(q) ||
                                  String(c.customer_code || "").toLowerCase().includes(q) ||
                                  String(c.phone || "").includes(q);
                              })
                              .slice(0, 40)
                              .map((c) => (
                                <div
                                  key={c.id}
                                  className={`or-combo-item ${String(form.customer_id) === String(c.id) ? "or-combo-item-active" : ""}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setForm((f) => ({ ...f, customer_id: c.id }));
                                    setCustSearch(c.business_name);
                                    setCustOpen(false);
                                  }}
                                >
                                  <span className="or-combo-name">{c.business_name}</span>
                                  <span className="or-combo-code">{c.customer_code}</span>
                                </div>
                              ))}
                            {customers.filter((c) => {
                              const q = custSearch.toLowerCase();
                              return !q || String(c.business_name || "").toLowerCase().includes(q) || String(c.customer_code || "").toLowerCase().includes(q);
                            }).length === 0 && (
                              <div className="or-combo-empty">No customers found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="or-field">
                      <label>Source Type</label>
                      <select value={form.source_type} onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value }))}>
                        <option value="warehouse">Warehouse</option>
                        <option value="marketplace">Marketplace</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div className="or-field">
                      <label>Order Date</label>
                      <input type="date" value={form.order_date} onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))} />
                    </div>
                  </>
                )}
                <div className="or-field">
                  <label>Delivery Date</label>
                  <input type="date" value={form.delivery_date} onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))} />
                </div>
                <div className="or-field">
                  <label>Discount (₹)</label>
                  <input type="number" min="0" value={form.discount_amount} onChange={(e) => setForm((f) => ({ ...f, discount_amount: e.target.value }))} />
                </div>
                <div className="or-field">
                  <label>Shipping (₹)</label>
                  <input type="number" min="0" value={form.shipping_amount} onChange={(e) => setForm((f) => ({ ...f, shipping_amount: e.target.value }))} />
                </div>
                <div className="or-field or-field-full">
                  <label>Billing Address</label>
                  <textarea rows={2} value={form.billing_address} onChange={(e) => setForm((f) => ({ ...f, billing_address: e.target.value }))} />
                </div>
                <div className="or-field or-field-full">
                  <label>Shipping Address</label>
                  <textarea rows={2} value={form.shipping_address} onChange={(e) => setForm((f) => ({ ...f, shipping_address: e.target.value }))} />
                </div>
                <div className="or-field or-field-full">
                  <label>Remarks</label>
                  <textarea rows={2} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
                </div>
              </div>

              {/* Items — only for create */}
              {formMode === "create" && (
                <div className="or-items-section">
                  <div className="or-items-header">
                    <strong>Order Items *</strong>
                    <button className="or-btn-sm" onClick={addItem}><Plus size={13} /> Add Item</button>
                  </div>

                  {form.items.map((item, idx) => (
                    <div className="or-item-row" key={idx}>
                      <div className="or-field or-item-prod" style={{ position: "relative" }}>
                        <label>Product *</label>
                        <input
                          className="or-combo-input"
                          placeholder="Search product…"
                          autoComplete="off"
                          value={prodSearches[idx] !== undefined ? prodSearches[idx] : (item.product_name || "")}
                          onFocus={() => setProdSearches((ps) => ({ ...ps, [idx]: ps[idx] !== undefined ? ps[idx] : (item.product_name || "") }))}
                          onChange={(e) => {
                            setProdSearches((ps) => ({ ...ps, [idx]: e.target.value }));
                            handleItemChange(idx, "product_id", "");
                          }}
                        />
                        {(prodSearches[idx] !== undefined || !item.product_id) && (
                          <div className="or-combo-dropdown" style={{ display: prodSearches[idx] !== undefined ? "block" : "none" }}>
                            {products
                              .filter((p) => {
                                const q = (prodSearches[idx] || "").toLowerCase();
                                return !q || String(p.name || "").toLowerCase().includes(q) || String(p.sku || "").toLowerCase().includes(q);
                              })
                              .slice(0, 30)
                              .map((p) => (
                                <div
                                  key={p.id}
                                  className={`or-combo-item ${String(item.product_id) === String(p.id) ? "or-combo-item-active" : ""}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleItemChange(idx, "product_id", p.id);
                                    setProdSearches((ps) => { const n = { ...ps }; delete n[idx]; return n; });
                                  }}
                                >
                                  <span className="or-combo-name">{p.name}</span>
                                  {p.sku && <span className="or-combo-code">{p.sku}</span>}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="or-field or-item-sm">
                        <label>Qty *</label>
                        <input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => handleItemChange(idx, "quantity", e.target.value)} />
                      </div>
                      <div className="or-field or-item-sm">
                        <label>Unit Price</label>
                        <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)} />
                      </div>
                      <div className="or-field or-item-sm">
                        <label>Tax %</label>
                        <input type="number" min="0" max="100" step="0.01" value={item.tax_rate} onChange={(e) => handleItemChange(idx, "tax_rate", e.target.value)} />
                      </div>
                      <div className="or-field or-item-sm">
                        <label>Total</label>
                        <input readOnly value={Number(item.total_amount || 0).toFixed(2)} />
                      </div>
                      {form.items.length > 1 && (
                        <button className="or-item-del" onClick={() => removeItem(idx)}><X size={13} /></button>
                      )}
                    </div>
                  ))}

                  <div className="or-totals">
                    <div><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
                    <div><span>Tax</span><span>{fmt(totals.tax_amount)}</span></div>
                    <div><span>Discount</span><span>- {fmt(form.discount_amount)}</span></div>
                    <div><span>Shipping</span><span>+ {fmt(form.shipping_amount)}</span></div>
                    <div className="or-totals-grand"><span>Grand Total</span><span>{fmt(totals.total)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="or-modal-foot">
              <button className="or-btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="or-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><CheckCircle2 size={14} /> {formMode === "create" ? "Create Order" : "Save Changes"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {showView && viewOrder && (
        <div className="or-overlay" onClick={() => setShowView(false)}>
          <div className="or-modal or-modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-head">
              <div>
                <h2>{safe(viewOrder.order_number)}</h2>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <StatusBadge value={viewOrder.order_status} map={ORDER_STATUS_COLOR} />
                  <StatusBadge value={viewOrder.payment_status} map={PAYMENT_STATUS_COLOR} />
                </div>
              </div>
              <button onClick={() => setShowView(false)}><X size={18} /></button>
            </div>

            <div className="or-form-scroll">
              {/* Order meta */}
              <div className="or-view-meta">
                <div><label>Customer</label><span>{safe(viewOrder.customer_name)} <em>({safe(viewOrder.customer_code)})</em></span></div>
                <div><label>Phone</label><span>{safe(viewOrder.customer_phone)}</span></div>
                <div><label>Order Date</label><span>{fmtDateTime(viewOrder.order_date)}</span></div>
                <div><label>Delivery Date</label><span>{fmtDate(viewOrder.delivery_date)}</span></div>
                <div><label>Source</label><span>{safe(viewOrder.source_type)}</span></div>
                <div><label>Remarks</label><span>{safe(viewOrder.remarks)}</span></div>
              </div>

              {/* Totals */}
              <div className="or-view-totals">
                <div><span>Subtotal</span><span>{fmt(viewOrder.subtotal)}</span></div>
                <div><span>Tax</span><span>{fmt(viewOrder.tax_amount)}</span></div>
                <div><span>Discount</span><span>- {fmt(viewOrder.discount_amount)}</span></div>
                <div><span>Shipping</span><span>+ {fmt(viewOrder.shipping_amount)}</span></div>
                <div className="or-totals-grand"><span>Total</span><span>{fmt(viewOrder.total_amount)}</span></div>
              </div>

              {/* Items */}
              <div className="or-section-title">Order Items ({(viewOrder.items || []).length})</div>
              {(viewOrder.items || []).length > 0 ? (
                <div className="or-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Tax %</th>
                        <th>Total</th>
                        <th>Fulfilment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewOrder.items.map((it, i) => (
                        <tr key={it.id}>
                          <td>{i + 1}</td>
                          <td><strong>{safe(it.product_name)}</strong></td>
                          <td><span className="or-code">{safe(it.sku)}</span></td>
                          <td>{fmtNum(it.quantity)}</td>
                          <td>{fmt(it.unit_price)}</td>
                          <td>{it.tax_rate}%</td>
                          <td><span className="or-amount">{fmt(it.total_amount)}</span></td>
                          <td><StatusBadge value={it.fulfillment_status} map={ORDER_STATUS_COLOR} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="or-empty-inline">No items</p>}

              {/* Status history */}
              <div className="or-section-title">Status History</div>
              {(viewOrder.history || []).length > 0 ? (
                <div className="or-history">
                  {viewOrder.history.map((h) => (
                    <div className="or-history-row" key={h.id}>
                      <div className="or-history-dot" />
                      <div>
                        <div className="or-history-title">
                          {h.old_status ? <><span>{h.old_status}</span> → </> : "Created: "}
                          <strong>{h.new_status}</strong>
                        </div>
                        <div className="or-history-meta">{safe(h.changed_by_name)} · {fmtDateTime(h.changed_at)}</div>
                        {h.remarks && <div className="or-history-note">{h.remarks}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="or-empty-inline">No history</p>}

              {/* Payments */}
              <div className="or-section-title" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingRight:24 }}>
                <span>Payments ({(paymentData?.payments || []).length})</span>
                {paymentData && (
                  <span className="or-pay-summary">Paid: <strong>{fmt(paymentData.paid_amount)}</strong> &middot; Balance: <strong style={{ color: paymentData.balance_amount > 0 ? "#EF4444" : "#16A34A" }}>{fmt(paymentData.balance_amount)}</strong></span>
                )}
              </div>
              {(paymentData?.payments || []).length > 0 ? (
                <div className="or-pay-list">
                  {paymentData.payments.map((p) => (
                    <div className="or-pay-row" key={p.id}>
                      <span className="or-code">{p.payment_number}</span>
                      <span>{fmtDate(p.payment_date)}</span>
                      <span className="or-amount">{fmt(p.amount)}</span>
                      {p.transaction_reference && <span className="or-sub">{p.transaction_reference}</span>}
                    </div>
                  ))}
                </div>
              ) : <p className="or-empty-inline">No payments recorded</p>}

              {/* Invoice */}
              <div className="or-section-title">Invoice</div>
              {invoiceData ? (
                <div className="or-pay-row" style={{ margin: "0 24px 16px" }}>
                  <span className="or-code">{invoiceData.invoice_number}</span>
                  <span>{fmtDate(invoiceData.invoice_date)}</span>
                  <span className="or-amount">{fmt(invoiceData.total_amount)}</span>
                  <StatusBadge value={invoiceData.status} map={PAYMENT_STATUS_COLOR} />
                </div>
              ) : viewOrder && !["cancelled", "returned"].includes(viewOrder.order_status) ? (
                <div style={{ padding: "0 24px 12px" }}>
                  <button className="or-btn-sm" onClick={handleGenerateInvoice} disabled={saving}>
                    <ClipboardList size={13} /> Generate Invoice
                  </button>
                </div>
              ) : <p className="or-empty-inline">No invoice</p>}

              {/* Delivery */}
              <div className="or-section-title">Delivery</div>
              {deliveryData ? (
                <div className="or-pay-row" style={{ margin: "0 24px 16px" }}>
                  <span className="or-code">{deliveryData.delivery_number}</span>
                  <StatusBadge value={deliveryData.delivery_status} map={DELIVERY_STATUS_COLOR} />
                  {deliveryData.delivery_date && <span>{fmtDate(deliveryData.delivery_date)}</span>}
                  {deliveryData.driver_name && <span className="or-sub">{deliveryData.driver_name}</span>}
                </div>
              ) : viewOrder?.order_status === "packed" ? (
                <div style={{ padding: "0 24px 12px" }}>
                  <button className="or-btn-sm" onClick={openDispatchModal}>
                    <Truck size={13} /> Dispatch Order
                  </button>
                </div>
              ) : <p className="or-empty-inline">No delivery record</p>}

              {/* Returns */}
              <div className="or-section-title" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingRight:24 }}>
                <span>Returns ({returnsData.length})</span>
                {viewOrder?.order_status === "delivered" && (
                  <button className="or-btn-sm" style={{ height:26, fontSize:11 }} onClick={openReturnModal}>
                    <ArrowLeftRight size={12} /> Create Return
                  </button>
                )}
              </div>
              {returnsData.length > 0 ? (
                <div className="or-pay-list">
                  {returnsData.map((r) => (
                    <div className="or-pay-row" key={r.id}>
                      <span className="or-code">{r.return_number}</span>
                      <span>{fmtDate(r.return_date)}</span>
                      <StatusBadge value={r.status} map={RETURN_STATUS_COLOR} />
                      {r.reason && <span className="or-sub">{r.reason}</span>}
                    </div>
                  ))}
                </div>
              ) : <p className="or-empty-inline">No returns</p>}
            </div>

            <div className="or-modal-foot">
              <button className="or-btn-cancel" onClick={() => setShowView(false)}>Close</button>
              {viewOrder && !["cancelled", "returned"].includes(viewOrder.order_status) && (paymentData?.balance_amount || 0) > 0 && (
                <button className="or-btn-outline" style={{ borderColor:"#16A34A", color:"#16A34A", background:"rgba(22,163,74,0.08)" }} onClick={() => { setShowView(false); openPaymentModal(viewOrder); }}>
                  <IndianRupee size={14} /> Add Payment
                </button>
              )}
              <button className="or-btn-save" onClick={() => { setShowView(false); openStatusModal(viewOrder); }}>
                <ChevronDown size={14} /> Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Modal ── */}
      {showStatusModal && statusTarget && (
        <div className="or-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="or-modal" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-head">
              <h2>Update Order Status</h2>
              <button onClick={() => setShowStatusModal(false)}><X size={18} /></button>
            </div>
            <div className="or-form-scroll" style={{ padding: "20px 24px" }}>
              <div className="or-field">
                <label>Order: <strong>{safe(statusTarget.order_number)}</strong></label>
              </div>
              <div className="or-field">
                <label>Current Status</label>
                <div><StatusBadge value={statusTarget.order_status} map={ORDER_STATUS_COLOR} /></div>
              </div>
              <div className="or-field">
                <label>New Status *</label>
                {(VALID_NEXT[statusTarget.order_status] || []).length === 0 ? (
                  <div className="or-form-error" style={{ marginTop:0 }}><X size={13} />No further transitions available for <strong>{statusTarget.order_status}</strong></div>
                ) : (
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="">Select next status…</option>
                    {(VALID_NEXT[statusTarget.order_status] || []).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                )}
              </div>
              <div className="or-field">
                <label>Remarks</label>
                <textarea rows={3} value={statusRemarks} onChange={(e) => setStatusRemarks(e.target.value)} placeholder="Optional note…" />
              </div>
              {formError && <div className="or-form-error"><X size={13} />{formError}</div>}
            </div>
            <div className="or-modal-foot">
              <button className="or-btn-cancel" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button className="or-btn-save" onClick={handleStatusSave} disabled={saving || !newStatus}>
                {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><CheckCircle2 size={14} /> Update</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Dispatch Modal ── */}
      {showDispatchModal && viewOrder && (
        <div className="or-overlay" onClick={() => setShowDispatchModal(false)}>
          <div className="or-modal" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-head">
              <h2>Dispatch Order</h2>
              <button onClick={() => setShowDispatchModal(false)}><X size={18} /></button>
            </div>
            <div className="or-form-scroll" style={{ padding: "20px 24px" }}>
              <div className="or-field">
                <label>Order</label>
                <span style={{ fontWeight:800, fontSize:13 }}>{safe(viewOrder.order_number)}</span>
              </div>
              <div className="or-field">
                <label>Delivery Address</label>
                <textarea rows={2} value={dispatchForm.delivery_address}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, delivery_address: e.target.value }))} />
              </div>
              <div className="or-field">
                <label>Pickup Address</label>
                <input value={dispatchForm.pickup_address}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, pickup_address: e.target.value }))} placeholder="Warehouse / pickup point…" />
              </div>
              <div className="or-field">
                <label>Expected Delivery Date</label>
                <input type="date" value={dispatchForm.delivery_date}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, delivery_date: e.target.value }))} />
              </div>
              {dispatchError && <div className="or-form-error"><X size={13} />{dispatchError}</div>}
            </div>
            <div className="or-modal-foot">
              <button className="or-btn-cancel" onClick={() => setShowDispatchModal(false)}>Cancel</button>
              <button className="or-btn-save" onClick={handleDispatchSave} disabled={saving}>
                {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><Truck size={14} /> Confirm Dispatch</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Modal ── */}
      {showReturnModal && viewOrder && (
        <div className="or-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="or-modal" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-head">
              <h2>Create Return</h2>
              <button onClick={() => setShowReturnModal(false)}><X size={18} /></button>
            </div>
            <div className="or-form-scroll" style={{ padding: "20px 24px" }}>
              <div className="or-field">
                <label>Order</label>
                <span style={{ fontWeight:800, fontSize:13 }}>{safe(viewOrder.order_number)}</span>
              </div>
              <div className="or-field">
                <label>Return Reason *</label>
                <textarea rows={3} value={returnForm.reason}
                  onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Describe the reason for return…" />
              </div>
              {returnError && <div className="or-form-error"><X size={13} />{returnError}</div>}
            </div>
            <div className="or-modal-foot">
              <button className="or-btn-cancel" onClick={() => setShowReturnModal(false)}>Cancel</button>
              <button className="or-btn-save" onClick={handleReturnSave} disabled={saving || !returnForm.reason.trim()}>
                {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><ArrowLeftRight size={14} /> Submit Return</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPaymentModal && paymentTarget && (
        <div className="or-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="or-modal" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-head">
              <h2>Add Payment</h2>
              <button onClick={() => setShowPaymentModal(false)}><X size={18} /></button>
            </div>
            <div className="or-form-scroll" style={{ padding: "20px 24px" }}>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:14 }}>
                <div className="or-field" style={{ flex:1 }}>
                  <label>Order</label>
                  <span style={{ fontWeight:800, fontSize:13 }}>{safe(paymentTarget.order_number)}</span>
                </div>
                <div className="or-field" style={{ flex:1 }}>
                  <label>Balance Due</label>
                  <span style={{ fontWeight:900, color:"#EF4444", fontSize:14 }}>{fmt(paymentData?.balance_amount || 0)}</span>
                </div>
              </div>
              <div className="or-field">
                <label>Amount (₹) *</label>
                <input type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="or-field">
                <label>Payment Date</label>
                <input type="date" value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="or-field">
                <label>Transaction Reference</label>
                <input placeholder="UPI / Cheque / NEFT ref…"
                  value={paymentForm.transaction_reference}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, transaction_reference: e.target.value }))} />
              </div>
              <div className="or-field">
                <label>Remarks</label>
                <textarea rows={2} value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, remarks: e.target.value }))} />
              </div>
              {paymentError && <div className="or-form-error"><X size={13} />{paymentError}</div>}
            </div>
            <div className="or-modal-foot">
              <button className="or-btn-cancel" onClick={() => setShowPaymentModal(false)}>Cancel</button>
              <button className="or-btn-save" onClick={handlePaymentSave} disabled={saving}>
                {saving ? <><RefreshCw size={14} className="spin" /> Saving…</> : <><CheckCircle2 size={14} /> Record Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}

const css = `
  .or-page {
    --or-text: #171717; --or-muted: #6B7280; --or-soft: #8A7A52;
    --or-bg: linear-gradient(135deg,#FFFDF6 0%,#FFF8E1 45%,#F7EBC5 100%);
    --or-card: rgba(255,255,255,0.96); --or-border: rgba(232,224,199,0.95);
    --or-input: #FFFFFF; --or-input-border: rgba(17,24,39,0.10);
    --or-thead: #FFF9E8; --or-row-hover: rgba(255,210,30,0.07);
    --or-shadow: 0 18px 48px rgba(17,24,39,0.07);
    min-height: 100vh; background: var(--or-bg); color: var(--or-text);
    padding: 8px; font-family: 'Plus Jakarta Sans',system-ui,sans-serif;
  }
  .theme-dark .or-page {
    --or-text: #F8FAFC; --or-muted: rgba(255,255,255,0.60); --or-soft: rgba(255,255,255,0.44);
    --or-bg: linear-gradient(135deg,#07090F 0%,#0F172A 48%,#111827 100%);
    --or-card: rgba(255,255,255,0.055); --or-border: rgba(255,255,255,0.09);
    --or-input: rgba(255,255,255,0.06); --or-input-border: rgba(255,255,255,0.10);
    --or-thead: rgba(255,255,255,0.055); --or-row-hover: rgba(255,210,30,0.06);
    --or-shadow: 0 18px 52px rgba(0,0,0,0.22);
  }

  /* Hero */
  .or-hero { position:relative; overflow:hidden; border-radius:28px; padding:26px 30px; margin-bottom:20px;
    background:linear-gradient(135deg,#121316 0%,#202126 54%,#0B0C0E 100%) !important;
    border:1px solid rgba(255,255,255,0.10) !important; box-shadow:0 20px 56px rgba(0,0,0,0.20) !important;
    display:flex; justify-content:space-between; align-items:flex-start; gap:20px; min-height:180px; }
  .or-hero-grid { position:absolute;inset:0; background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px); background-size:30px 30px; opacity:.4; pointer-events:none; }
  .or-glow-1 { position:absolute; width:200px; height:200px; right:-60px; top:-88px; border-radius:50%; background:#FFD21E; opacity:.92; box-shadow:0 0 80px rgba(255,210,30,.35); pointer-events:none; }
  .or-glow-2 { position:absolute; width:88px; height:88px; right:130px; bottom:-36px; border-radius:50%; border:16px solid rgba(255,210,30,.13); pointer-events:none; }
  .or-hero::after { content:'';position:absolute;left:28px;right:28px;bottom:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,210,30,.7),transparent); }
  .or-hero-left { position:relative;z-index:2; display:flex; gap:16px; align-items:flex-start; }
  .or-hero-icon { width:58px;height:58px;border-radius:20px;background:linear-gradient(135deg,#FFD21E,#D9A900);color:#121316;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 32px rgba(255,210,30,.22);flex-shrink:0; }
  .or-kicker { display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,210,30,.24);background:rgba(255,210,30,.09);color:#FFD21E;border-radius:999px;padding:6px 11px;font-size:9.5px;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px; }
  .or-kicker span { width:6px;height:6px;border-radius:50%;background:#FFD21E;box-shadow:0 0 0 4px rgba(255,210,30,.13); }
  .or-hero h1 { margin:0;font-size:clamp(26px,2.8vw,38px);font-weight:800;letter-spacing:-1px;color:#FFF !important;line-height:1.06; }
  .or-hero p { margin:8px 0 0;color:rgba(255,255,255,.62) !important;font-size:12.5px;font-weight:600;line-height:1.68; }
  .or-hero-actions { position:relative;z-index:2;display:flex;gap:10px;flex-shrink:0; }

  .or-btn-outline { min-height:42px;border-radius:13px;padding:0 15px;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:rgba(255,255,255,.82);font-family:inherit;font-size:12px;font-weight:900;cursor:pointer;transition:transform .16s; }
  .or-btn-outline:hover { transform:translateY(-2px); }
  .or-btn-primary { min-height:42px;border-radius:13px;padding:0 18px;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#FFD21E,#D9A900);color:#121316;font-family:inherit;font-size:12px;font-weight:900;border:none;cursor:pointer;box-shadow:0 8px 20px rgba(255,210,30,.22);transition:transform .16s; }
  .or-btn-primary:hover { transform:translateY(-2px); }

  /* Stats */
  .or-stats { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:20px; }
  @media(max-width:1100px){.or-stats{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:600px){.or-stats{grid-template-columns:1fr 1fr;}}
  .or-stat { position:relative;overflow:hidden;min-height:130px;border-radius:22px;padding:17px;background:var(--or-card) !important;border:1px solid var(--or-border) !important;box-shadow:var(--or-shadow) !important;backdrop-filter:blur(16px);transition:transform .16s,box-shadow .16s; }
  .or-stat:hover { transform:translateY(-3px);box-shadow:0 24px 68px rgba(17,24,39,.12) !important;border-color:rgba(255,210,30,.32) !important; }
  .or-stat::after { content:'';position:absolute;width:90px;height:90px;right:-38px;bottom:-38px;border-radius:50%;background:rgba(255,210,30,.10); }
  .or-stat-top { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;position:relative;z-index:1; }
  .or-stat-icon { width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center; }
  .or-stat-bar { width:30px;height:5px;border-radius:999px;margin-top:7px; }
  .or-stat h3 { position:relative;z-index:1;margin:0;font-size:19px;font-weight:900;letter-spacing:-.7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .or-stat p { position:relative;z-index:1;margin:5px 0 0;color:var(--or-muted) !important;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.55px; }
  .or-stat span { position:relative;z-index:1;display:block;margin-top:3px;color:var(--or-soft);font-size:10.5px;font-weight:700; }

  /* Error */
  .or-error { display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.20);color:#EF4444;font-size:12.5px;font-weight:800;margin-bottom:16px; }
  .or-error button { margin-left:auto;background:rgba(239,68,68,.14);border:none;border-radius:8px;padding:4px 10px;color:inherit;font-size:11px;font-weight:900;cursor:pointer; }

  /* Filters */
  .or-filters { display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px; }
  .or-search { display:flex;align-items:center;gap:8px;background:var(--or-card);border:1px solid var(--or-border);border-radius:13px;padding:9px 13px;min-width:220px;color:var(--or-muted); }
  .or-search input { background:transparent;border:none;outline:none;font-family:inherit;font-size:12px;color:var(--or-text);width:100%; }
  .or-clear { background:none;border:none;cursor:pointer;color:var(--or-muted);display:flex; }
  .or-select { background:var(--or-card);border:1px solid var(--or-border);border-radius:13px;padding:9px 13px;font-family:inherit;font-size:12px;color:var(--or-text);outline:none;cursor:pointer; }

  /* Card */
  .or-card { background:var(--or-card) !important;border:1px solid var(--or-border) !important;box-shadow:var(--or-shadow) !important;border-radius:26px;overflow:hidden; }
  .or-card-header { display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--or-border); }
  .or-card-header strong { font-size:14px;font-weight:900; }
  .or-count { font-size:12px;font-weight:700;color:var(--or-muted);background:rgba(255,210,30,.12);padding:4px 10px;border-radius:999px; }

  /* Empty */
  .or-empty { display:flex;flex-direction:column;align-items:center;gap:10px;padding:52px 20px;color:var(--or-muted); }
  .or-empty p { margin:0;font-size:13px;font-weight:700; }
  .or-empty-inline { color:var(--or-muted);font-size:12px;padding:8px 0;margin:0; }

  /* Table */
  .or-table-wrap { overflow-x:auto; }
  .or-table-wrap table { width:100%;border-collapse:collapse;font-size:12.5px; }
  .or-table-wrap thead { background:var(--or-thead); }
  .or-table-wrap th { padding:11px 14px;text-align:left;font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.55px;color:var(--or-muted);white-space:nowrap;border-bottom:1px solid var(--or-border); }
  .or-table-wrap td { padding:11px 14px;border-bottom:1px solid var(--or-border);vertical-align:middle; }
  .or-table-wrap tr:last-child td { border-bottom:none; }
  .or-table-wrap tr:hover td { background:var(--or-row-hover); }
  .or-sub { font-size:10.5px;color:var(--or-muted);margin-top:2px; }
  .or-code { font-family:monospace;font-size:11px;background:rgba(255,210,30,.10);border:1px solid rgba(255,210,30,.20);border-radius:6px;padding:2px 7px;color:#D9A900;font-weight:700; }
  .theme-dark .or-code { color:#FFD21E; }
  .or-amount { color:#16A34A;font-weight:800; }
  .theme-dark .or-amount { color:#4ADE80; }
  .or-pill { background:rgba(255,210,30,.13);color:#CA8A04;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:800; }
  .or-link { background:none;border:none;color:#2563EB;font-weight:800;font-size:12.5px;cursor:pointer;padding:0;text-decoration:underline;font-family:inherit; }
  .theme-dark .or-link { color:#60A5FA; }

  .or-actions { display:flex;gap:6px; }
  .or-act-btn { width:30px;height:30px;border-radius:9px;border:1px solid var(--or-border);background:var(--or-card);color:var(--or-muted);display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .or-act-btn:hover { border-color:#FFD21E;color:#D9A900; }
  .or-act-del:hover { border-color:#EF4444;color:#EF4444; }

  /* Modal */
  .or-overlay { position:fixed;inset:0;background:rgba(0,0,0,.60);backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px; }
  .or-modal { background:#FFFFFF;border:1px solid rgba(232,224,199,0.95);border-radius:26px;width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 32px 88px rgba(0,0,0,.28); }
  .theme-dark .or-modal { background:#1C2032;border-color:rgba(255,255,255,0.10); }
  .or-modal-lg { max-width:760px; }
  .or-modal-xl { max-width:900px; }
  .or-modal-head { display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(232,224,199,0.95);flex-shrink:0;background:#FAFAF7;border-radius:26px 26px 0 0; }
  .theme-dark .or-modal-head { background:#232640;border-bottom-color:rgba(255,255,255,0.10); }
  .or-modal-head h2 { margin:0;font-size:17px;font-weight:900;color:#171717; }
  .theme-dark .or-modal-head h2 { color:#F8FAFC; }
  .or-modal-head button { background:none;border:none;color:#6B7280;cursor:pointer;display:flex; }
  .theme-dark .or-modal-head button { color:rgba(255,255,255,0.55); }
  .or-form-scroll { overflow-y:auto;flex:1;background:#FFFFFF; }
  .theme-dark .or-form-scroll { background:#1C2032; }
  .or-modal-foot { display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid rgba(232,224,199,0.95);flex-shrink:0;background:#FAFAF7;border-radius:0 0 26px 26px; }
  .theme-dark .or-modal-foot { background:#232640;border-top-color:rgba(255,255,255,0.10); }
  .or-btn-cancel { height:40px;border-radius:12px;padding:0 16px;border:1px solid rgba(17,24,39,0.14);background:transparent;color:#171717;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer; }
  .theme-dark .or-btn-cancel { border-color:rgba(255,255,255,0.15);color:#F8FAFC; }
  .or-btn-save { height:40px;border-radius:12px;padding:0 18px;display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#FFD21E,#D9A900);color:#121316;font-family:inherit;font-size:12px;font-weight:900;border:none;cursor:pointer; }
  .or-btn-save:disabled { opacity:.6;cursor:not-allowed; }
  .or-form-error { display:flex;align-items:center;gap:8px;margin:12px 24px 0;padding:10px 13px;border-radius:12px;background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.20);color:#EF4444;font-size:12px;font-weight:800; }

  /* Form */
  .or-form-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px 24px; }
  .or-field { display:flex;flex-direction:column;gap:6px; }
  .or-field-full { grid-column:1/-1; }
  .or-field label { font-size:11px;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.5px; }
  .theme-dark .or-field label { color:rgba(255,255,255,0.55); }
  .or-field input,.or-field select,.or-field textarea { background:#F7F5F0;border:1.5px solid rgba(17,24,39,0.12);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:12.5px;color:#171717;outline:none;transition:border-color .15s; }
  .theme-dark .or-field input,.theme-dark .or-field select,.theme-dark .or-field textarea { background:#2A2E45;border-color:rgba(255,255,255,0.12);color:#F8FAFC; }
  .or-field input::placeholder,.or-field textarea::placeholder { color:#9CA3AF; }
  .theme-dark .or-field input::placeholder,.theme-dark .or-field textarea::placeholder { color:rgba(255,255,255,0.35); }
  .or-field input:focus,.or-field select:focus,.or-field textarea:focus { border-color:#FFD21E;box-shadow:0 0 0 3px rgba(255,210,30,0.12); }
  .or-field textarea { resize:vertical; }
  .or-field select option { background:#FFFFFF;color:#171717; }
  .theme-dark .or-field select option { background:#2A2E45;color:#F8FAFC; }

  /* Items */
  .or-items-section { padding:0 24px 20px; }
  .or-items-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px; }
  .or-items-header strong { font-size:13px;font-weight:900;color:#171717; }
  .theme-dark .or-items-header strong { color:#F8FAFC; }
  /* Combobox */
  .or-combo { position:relative; }
  .or-combo-input { width:100%;background:#F7F5F0;border:1.5px solid rgba(17,24,39,0.12);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:12.5px;color:#171717;outline:none;transition:border-color .15s;box-sizing:border-box; }
  .theme-dark .or-combo-input { background:#2A2E45;border-color:rgba(255,255,255,0.12);color:#F8FAFC; }
  .or-combo-input:focus { border-color:#FFD21E;box-shadow:0 0 0 3px rgba(255,210,30,0.12); }
  .or-combo-input::placeholder { color:#9CA3AF; }
  .theme-dark .or-combo-input::placeholder { color:rgba(255,255,255,0.35); }
  .or-combo-selected { display:block;margin-top:5px;padding:6px 10px;border-radius:8px;background:rgba(255,210,30,0.12);border:1px solid rgba(255,210,30,0.25);font-size:11.5px;font-weight:800;color:#D9A900; }
  .theme-dark .or-combo-selected { color:#FFD21E;background:rgba(255,210,30,0.10); }
  .or-combo-dropdown { position:absolute;left:0;right:0;top:calc(100% + 4px);background:#FFFFFF;border:1.5px solid rgba(255,210,30,0.35);border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,0.14);z-index:2000;max-height:220px;overflow-y:auto; }
  .theme-dark .or-combo-dropdown { background:#232640;border-color:rgba(255,210,30,0.25);box-shadow:0 16px 52px rgba(0,0,0,0.40); }
  .or-combo-item { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 14px;cursor:pointer;transition:background .12s; }
  .or-combo-item:hover { background:rgba(255,210,30,0.10); }
  .or-combo-item-active { background:rgba(255,210,30,0.16) !important; }
  .or-combo-name { font-size:12.5px;font-weight:700;color:#171717;flex:1; }
  .theme-dark .or-combo-name { color:#F8FAFC; }
  .or-combo-code { font-size:10.5px;font-weight:800;font-family:monospace;background:rgba(255,210,30,0.12);color:#D9A900;border-radius:6px;padding:2px 7px;white-space:nowrap; }
  .theme-dark .or-combo-code { color:#FFD21E;background:rgba(255,210,30,0.10); }
  .or-combo-empty { padding:14px;text-align:center;color:#9CA3AF;font-size:12px;font-weight:700; }
  .theme-dark .or-combo-empty { color:rgba(255,255,255,0.38); }

  .or-btn-sm { height:32px;border-radius:9px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;background:rgba(255,210,30,.15);border:1px solid rgba(255,210,30,.30);color:#D9A900;font-family:inherit;font-size:11.5px;font-weight:900;cursor:pointer; }
  .or-item-row { display:flex;gap:10px;align-items:flex-end;margin-bottom:10px;flex-wrap:wrap; }
  .or-item-prod { flex:2;min-width:180px; }
  .or-item-sm { flex:1;min-width:80px; }
  .or-item-del { height:38px;width:34px;border-radius:9px;border:1px solid rgba(239,68,68,.25);background:rgba(239,68,68,.08);color:#EF4444;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-bottom:0;align-self:flex-end; }

  .or-totals { margin-top:14px;padding:14px 16px;background:rgba(255,210,30,.07);border-radius:14px;border:1px solid rgba(255,210,30,.18); }
  .or-totals div { display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0; }
  .or-totals div span:first-child { color:var(--or-muted);font-weight:700; }
  .or-totals div span:last-child { font-weight:800; }
  .or-totals-grand { border-top:1px solid rgba(255,210,30,.30);margin-top:6px;padding-top:10px !important; }
  .or-totals-grand span { font-size:14px !important;font-weight:900 !important;color:var(--or-text) !important; }

  /* View */
  .or-view-meta { display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:18px 24px;border-bottom:1px solid rgba(232,224,199,0.95); }
  .theme-dark .or-view-meta { border-bottom-color:rgba(255,255,255,0.10); }
  .or-view-meta div { display:flex;flex-direction:column;gap:4px; }
  .or-view-meta label { font-size:10.5px;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.5px; }
  .theme-dark .or-view-meta label { color:rgba(255,255,255,0.50); }
  .or-view-meta span { font-size:13px;font-weight:700;color:#171717; }
  .theme-dark .or-view-meta span { color:#F8FAFC; }
  .or-view-meta em { font-style:normal;color:#6B7280;font-size:11px; }
  .theme-dark .or-view-meta em { color:rgba(255,255,255,0.45); }
  .or-view-totals { display:flex;gap:16px;flex-wrap:wrap;padding:14px 24px;border-bottom:1px solid rgba(232,224,199,0.95); }
  .theme-dark .or-view-totals { border-bottom-color:rgba(255,255,255,0.10); }
  .or-view-totals div { display:flex;flex-direction:column;align-items:center;gap:3px;min-width:80px; }
  .or-view-totals span:first-child { font-size:10px;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.5px; }
  .theme-dark .or-view-totals span:first-child { color:rgba(255,255,255,0.50); }
  .or-view-totals span:last-child { font-size:14px;font-weight:900;color:#171717; }
  .theme-dark .or-view-totals span:last-child { color:#F8FAFC; }
  .or-view-totals .or-totals-grand span { color:#16A34A !important; }
  .theme-dark .or-view-totals .or-totals-grand span { color:#4ADE80 !important; }
  .or-section-title { padding:14px 24px 8px;font-size:12px;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.6px; }
  .theme-dark .or-section-title { color:rgba(255,255,255,0.50); }

  /* History */
  .or-history { padding:0 24px 16px; display:flex;flex-direction:column;gap:10px; }
  .or-history-row { display:flex;gap:12px;align-items:flex-start; }
  .or-history-dot { width:10px;height:10px;border-radius:50%;background:#FFD21E;margin-top:5px;flex-shrink:0; }
  .or-history-title { font-size:12.5px;font-weight:700;color:#171717; }
  .theme-dark .or-history-title { color:#F8FAFC; }
  .or-history-title span { color:#6B7280; }
  .theme-dark .or-history-title span { color:rgba(255,255,255,0.45); }
  .or-history-meta { font-size:11px;color:#6B7280;margin-top:2px; }
  .theme-dark .or-history-meta { color:rgba(255,255,255,0.45); }
  .or-history-note { font-size:11.5px;color:#8A7A52;margin-top:3px;font-style:italic; }
  .theme-dark .or-history-note { color:rgba(255,255,255,0.40); }

  .or-pay-summary { font-size:11px;font-weight:700;color:var(--or-muted); }
  .or-pay-list { padding:0 24px 16px;display:flex;flex-direction:column;gap:8px; }
  .or-pay-row { display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:10px;background:rgba(255,210,30,0.06);border:1px solid rgba(255,210,30,0.14);font-size:12px;flex-wrap:wrap; }
  .or-btn-sm { display:inline-flex;align-items:center;gap:6px;padding:0 14px;height:30px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid var(--or-border);background:var(--or-card);color:var(--or-text);transition:all .15s; }
  .or-btn-sm:hover { background:rgba(255,210,30,0.12);border-color:#FFD21E; }

  @keyframes or-spin { to { transform:rotate(360deg); } }
  .spin { animation:or-spin .8s linear infinite; }
  @media(max-width:600px){.or-hero{flex-direction:column;min-height:unset;}.or-hero-actions{width:100%;}.or-form-grid{grid-template-columns:1fr;}.or-view-meta{grid-template-columns:1fr;}}
`;
