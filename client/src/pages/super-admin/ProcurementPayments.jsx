import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  RefreshCcw,
  Search,
  Plus,
  X,
  IndianRupee,
  Wallet,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  Edit3,
  Eye,
  AlertCircle,
  ClipboardList,
  CreditCard,
  FileText,
  CalendarDays,
  Building2,
  ReceiptText,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const defaultForm = {
  vendor_id: "",
  purchase_order_id: "",
  payment_date: today,
  amount: "",
  payment_mode: "UPI",
  reference_number: "",
  status: "paid",
  remarks: "",
};

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentStatusOptions = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentModes = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "NEFT",
  "RTGS",
  "IMPS",
  "Cheque",
  "Card",
  "Other",
];

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

const getStatusClass = (status) => {
  switch (status) {
    case "paid":
      return "status paid";
    case "pending":
      return "status pending";
    case "failed":
      return "status failed";
    case "cancelled":
      return "status cancelled";
    default:
      return "status pending";
  }
};

const getErrorMessage = (error, fallback) => {
  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;
  const serverError = error.response?.data?.error;

  if (status === 401) return "Session expired or token missing. Please login again.";
  if (serverMessage && serverError) return `${serverMessage}: ${serverError}`;
  if (serverMessage) return serverMessage;
  if (error.message) return `${fallback}: ${error.message}`;
  return fallback;
};

export default function ProcurementPayments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    vendor_id: "",
    purchase_order_id: "",
    status: "",
  });

  const [form, setForm] = useState(defaultForm);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [poBalance, setPoBalance] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [apiMissing, setApiMissing] = useState(false);

  const filteredPurchaseOrders = useMemo(() => {
    if (!form.vendor_id) return purchaseOrders;

    return purchaseOrders.filter(
      (po) => String(po.vendor_id) === String(form.vendor_id)
    );
  }, [form.vendor_id, purchaseOrders]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementPaymentTimer);
    window.__procurementPaymentTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const params = {
        search: filters.search || undefined,
        vendor_id: filters.vendor_id || undefined,
        purchase_order_id: filters.purchase_order_id || undefined,
        status: filters.status || undefined,
      };

      const listRes = await API.get("/api/procurement-payments", { params });

      setPayments(
        getArray(listRes, [
          "payments",
          "procurementPayments",
          "procurement_payments",
          "data",
        ])
      );

      try {
        const summaryRes = await API.get("/api/procurement-payments/summary");

        setSummary(
          summaryRes.data?.summary ||
            summaryRes.data?.data ||
            summaryRes.data ||
            {}
        );
      } catch (summaryError) {
        console.error("Fetch procurement payment summary error:", summaryError);
        setSummary({});
      }
    } catch (error) {
      console.error("Fetch procurement payments error:", error);

      if (error.response?.status === 404) {
        setApiMissing(true);
        setPayments([]);
        setSummary({});
        return;
      }

      showMessage(
        "error",
        getErrorMessage(error, "Failed to load procurement payments")
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const [vendorRes, poRes] = await Promise.all([
        API.get("/api/vendors"),
        API.get("/api/purchase-orders"),
      ]);

      setVendors(
        getArray(vendorRes, ["vendors", "data", "vendorList", "vendor_list"])
      );

      setPurchaseOrders(
        getArray(poRes, [
          "purchaseOrders",
          "purchase_orders",
          "data",
          "orders",
        ])
      );
    } catch (error) {
      console.error("Fetch dropdowns error:", error);
      showMessage(
        "error",
        getErrorMessage(error, "Failed to load dropdown data")
      );
    } finally {
      setDropdownLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const resetForm = () => {
    setForm({
      ...defaultForm,
      payment_date: today,
    });
    setPoBalance(null);
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

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "vendor_id") {
      setForm((prev) => ({
        ...prev,
        vendor_id: value,
        purchase_order_id: "",
      }));
      setPoBalance(null);
    }
  };

  const handlePurchaseOrderSelect = async (purchaseOrderId) => {
    setForm((prev) => ({
      ...prev,
      purchase_order_id: purchaseOrderId,
    }));

    setPoBalance(null);

    if (!purchaseOrderId) return;

    const po = purchaseOrders.find(
      (item) => String(item.id) === String(purchaseOrderId)
    );

    if (po) {
      setForm((prev) => ({
        ...prev,
        purchase_order_id: purchaseOrderId,
        vendor_id: po.vendor_id || prev.vendor_id,
      }));
    }

    try {
      const res = await API.get(
        `/api/procurement-payments/purchase-order/${purchaseOrderId}/balance`
      );

      const balance = res.data?.balance || res.data?.data || null;
      setPoBalance(balance);

      if (balance?.balance_amount !== undefined) {
        setForm((prev) => ({
          ...prev,
          amount: String(Math.max(Number(balance.balance_amount || 0), 0)),
          vendor_id: balance.vendor_id || prev.vendor_id,
        }));
      }
    } catch (error) {
      console.error("PO balance fetch error:", error);

      if (po?.total_amount) {
        setForm((prev) => ({
          ...prev,
          amount: String(po.total_amount),
        }));
      }
    }
  };

  const validateForm = () => {
    if (!form.vendor_id) return "Vendor is required";

    if (!form.payment_date) return "Payment date is required";

    if (!form.amount || Number(form.amount) <= 0) {
      return "Payment amount must be greater than 0";
    }

    if (!form.payment_mode) return "Payment mode is required";

    if (!form.status) return "Payment status is required";

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      showMessage("error", validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        vendor_id: form.vendor_id,
        purchase_order_id: form.purchase_order_id || null,
        payment_date: form.payment_date,
        amount: Number(form.amount || 0),
        payment_mode: form.payment_mode,
        reference_number: form.reference_number || null,
        status: form.status,
        remarks: form.remarks || null,
      };

      const res = editId
        ? await API.put(`/api/procurement-payments/${editId}`, payload)
        : await API.post("/api/procurement-payments", payload);

      showMessage(
        "success",
        res.data?.message ||
          (editId
            ? "Procurement payment updated successfully"
            : "Procurement payment created successfully")
      );

      closeModal();
      fetchPayments();
    } catch (error) {
      console.error("Save procurement payment error:", error);
      showMessage(
        "error",
        getErrorMessage(error, "Failed to save procurement payment")
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (payment) => {
    try {
      setSaving(true);

      const res = await API.get(`/api/procurement-payments/${payment.id}`);

      const data =
        res.data?.payment ||
        res.data?.procurementPayment ||
        res.data?.procurement_payment ||
        res.data?.data ||
        payment;

      setEditId(data.id);
      setForm({
        vendor_id: data.vendor_id || "",
        purchase_order_id: data.purchase_order_id || "",
        payment_date: data.payment_date
          ? String(data.payment_date).slice(0, 10)
          : today,
        amount: data.amount || "",
        payment_mode: data.payment_mode || "UPI",
        reference_number: data.reference_number || "",
        status: data.status || "pending",
        remarks: data.remarks || "",
      });

      setModalOpen(true);

      if (data.purchase_order_id) {
        handlePurchaseOrderSelect(data.purchase_order_id);
      }
    } catch (error) {
      console.error("Open edit error:", error);
      showMessage(
        "error",
        getErrorMessage(error, "Failed to open payment")
      );
    } finally {
      setSaving(false);
    }
  };

  const openView = async (paymentId) => {
    try {
      setSaving(true);

      const res = await API.get(`/api/procurement-payments/${paymentId}`);

      const data =
        res.data?.payment ||
        res.data?.procurementPayment ||
        res.data?.procurement_payment ||
        res.data?.data ||
        res.data;

      setSelectedPayment(data);
      setViewOpen(true);
    } catch (error) {
      console.error("View payment error:", error);
      showMessage(
        "error",
        getErrorMessage(error, "Failed to open payment details")
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (paymentId, status) => {
    const ok = window.confirm(`Are you sure you want to mark as ${status}?`);

    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.patch(`/api/procurement-payments/${paymentId}/status`, {
        status,
      });

      showMessage(
        "success",
        res.data?.message || "Payment status updated successfully"
      );

      fetchPayments();
    } catch (error) {
      console.error("Update payment status error:", error);
      showMessage(
        "error",
        getErrorMessage(error, "Failed to update payment status")
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (paymentId) => {
    const ok = window.confirm("Are you sure you want to delete this payment?");

    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.delete(`/api/procurement-payments/${paymentId}`);

      showMessage(
        "success",
        res.data?.message || "Procurement payment deleted successfully"
      );

      fetchPayments();
    } catch (error) {
      console.error("Delete procurement payment error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete payment"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="payment-page">
        <style>{css}</style>

        <div className="page-head">
          <div>
            <div className="eyebrow">
              <Wallet size={15} />
              Procurement Module
            </div>

            <h1>Purchase Payments</h1>

            <p>
              Track vendor payments against purchase orders, payment modes,
              references, paid status and vendor ledger posting.
            </p>
          </div>

          <div className="head-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={fetchPayments}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={openCreateModal}
              disabled={apiMissing}
            >
              <Plus size={17} />
              New Payment
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
              Procurement Payments backend route is not connected yet. Add
              backend route /api/procurement-payments and restart server.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard
            icon={ReceiptText}
            label="Total Payments"
            value={summary.total_payments || payments.length || 0}
          />

          <SummaryCard
            icon={IndianRupee}
            label="Paid Amount"
            value={formatCurrency(summary.paid_amount || 0)}
          />

          <SummaryCard
            icon={Clock}
            label="Pending Amount"
            value={formatCurrency(summary.pending_amount || 0)}
          />

          <SummaryCard
            icon={Wallet}
            label="PO Balance"
            value={formatCurrency(summary.total_po_balance_amount || 0)}
          />
        </div>

        <div className="filter-card">
          <div className="search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search vendor, PO, reference number, payment mode..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          <select
            value={filters.vendor_id}
            onChange={(e) => handleFilterChange("vendor_id", e.target.value)}
          >
            <option value="">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.business_name || vendor.name || vendor.vendor_name}
              </option>
            ))}
          </select>

          <select
            value={filters.purchase_order_id}
            onChange={(e) =>
              handleFilterChange("purchase_order_id", e.target.value)
            }
          >
            <option value="">All Purchase Orders</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.po_number || `PO-${po.id}`}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Payment List</h2>
              <p>
                {loading
                  ? "Loading payments..."
                  : `${payments.length} payment record(s) found`}
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>PO No</th>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      Loading procurement payments...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      No procurement payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <strong>{payment.vendor_name || "-"}</strong>
                      </td>
                      <td>{payment.po_number || "-"}</td>
                      <td>{formatDate(payment.payment_date)}</td>
                      <td>
                        <span className="amount-pill">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td>{payment.payment_mode || "-"}</td>
                      <td>{payment.reference_number || "-"}</td>
                      <td>
                        <span className={getStatusClass(payment.status)}>
                          {payment.status || "pending"}
                        </span>
                      </td>
                      <td className="right">
                        <div className="action-row">
                          <button
                            type="button"
                            className="icon-btn"
                            title="View"
                            onClick={() => openView(payment.id)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit"
                            onClick={() => openEdit(payment)}
                          >
                            <Edit3 size={15} />
                          </button>

                          {payment.status !== "paid" && (
                            <button
                              type="button"
                              className="icon-btn success"
                              title="Mark Paid"
                              onClick={() => updateStatus(payment.id, "paid")}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}

                          {payment.status !== "cancelled" && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Cancel"
                              onClick={() =>
                                updateStatus(payment.id, "cancelled")
                              }
                            >
                              <Ban size={15} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Delete"
                            onClick={() => deletePayment(payment.id)}
                          >
                            <Trash2 size={15} />
                          </button>
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
            <div className="modal-card">
              <div className="modal-head">
                <div>
                  <h2>{editId ? "Edit Payment" : "Create Purchase Payment"}</h2>
                  <p>
                    Add vendor payment details and mark as paid to post vendor
                    ledger.
                  </p>
                </div>

                <button type="button" className="close-btn" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label>Vendor *</label>
                    <select
                      value={form.vendor_id}
                      onChange={(e) =>
                        handleFormChange("vendor_id", e.target.value)
                      }
                      required
                      disabled={dropdownLoading}
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.business_name || vendor.name || vendor.vendor_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Purchase Order</label>
                    <select
                      value={form.purchase_order_id}
                      onChange={(e) => handlePurchaseOrderSelect(e.target.value)}
                      disabled={dropdownLoading}
                    >
                      <option value="">Without PO / Vendor Direct Payment</option>
                      {filteredPurchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_number || `PO-${po.id}`} —{" "}
                          {formatCurrency(po.total_amount || 0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      value={form.payment_date}
                      onChange={(e) =>
                        handleFormChange("payment_date", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Amount *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => handleFormChange("amount", e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Payment Mode *</label>
                    <select
                      value={form.payment_mode}
                      onChange={(e) =>
                        handleFormChange("payment_mode", e.target.value)
                      }
                      required
                    >
                      {paymentModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Status *</label>
                    <select
                      value={form.status}
                      onChange={(e) => handleFormChange("status", e.target.value)}
                      required
                    >
                      {paymentStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      value={form.reference_number}
                      onChange={(e) =>
                        handleFormChange("reference_number", e.target.value)
                      }
                      placeholder="UPI / Bank / Cheque reference"
                    />
                  </div>
                </div>

                {poBalance && (
                  <div className="po-balance-card">
                    <div>
                      <span>PO Total</span>
                      <strong>{formatCurrency(poBalance.total_amount)}</strong>
                    </div>

                    <div>
                      <span>Already Paid</span>
                      <strong>{formatCurrency(poBalance.paid_amount)}</strong>
                    </div>

                    <div>
                      <span>Balance</span>
                      <strong>{formatCurrency(poBalance.balance_amount)}</strong>
                    </div>
                  </div>
                )}

                <div className="field remarks-field">
                  <label>Remarks</label>
                  <textarea
                    rows="4"
                    value={form.remarks}
                    onChange={(e) => handleFormChange("remarks", e.target.value)}
                    placeholder="Advance payment, balance payment, vendor settlement..."
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn secondary" onClick={closeModal}>
                    Cancel
                  </button>

                  <button type="submit" className="btn primary" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : editId
                      ? "Update Payment"
                      : "Save Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewOpen && selectedPayment && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-head">
                <div>
                  <h2>Payment Details</h2>
                  <p>
                    {selectedPayment.vendor_name || "-"} ·{" "}
                    {selectedPayment.po_number || "Direct Payment"}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setViewOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="detail-grid">
                <Detail
                  icon={Building2}
                  label="Vendor"
                  value={selectedPayment.vendor_name || "-"}
                />
                <Detail
                  icon={ClipboardList}
                  label="Purchase Order"
                  value={selectedPayment.po_number || "-"}
                />
                <Detail
                  icon={CalendarDays}
                  label="Payment Date"
                  value={formatDate(selectedPayment.payment_date)}
                />
                <Detail
                  icon={IndianRupee}
                  label="Amount"
                  value={formatCurrency(selectedPayment.amount)}
                />
                <Detail
                  icon={CreditCard}
                  label="Payment Mode"
                  value={selectedPayment.payment_mode || "-"}
                />
                <Detail
                  icon={FileText}
                  label="Reference"
                  value={selectedPayment.reference_number || "-"}
                />
                <Detail
                  icon={CheckCircle2}
                  label="Status"
                  value={selectedPayment.status || "-"}
                />
              </div>

              {selectedPayment.remarks && (
                <div className="remarks-box">
                  <strong>Remarks</strong>
                  <p>{selectedPayment.remarks}</p>
                </div>
              )}
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

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="detail-card">
      <Icon size={17} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

const css = `
  .payment-page {
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
    max-width: 720px;
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
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
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
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.5px;
  }

  .filter-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 22px;
    padding: 14px;
    display: grid;
    grid-template-columns: 1.5fr 0.8fr 0.9fr 0.6fr;
    gap: 12px;
    margin-bottom: 18px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.055);
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
  }

  .search-box input,
  .filter-card select,
  .field input,
  .field select,
  .field textarea {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: #111827;
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .filter-card select,
  .field input,
  .field select,
  .field textarea {
    height: 44px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 15px;
    padding: 0 12px;
  }

  .field textarea {
    height: auto;
    min-height: 104px;
    resize: vertical;
    padding-top: 12px;
  }

  .table-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.065);
  }

  .table-head {
    padding: 18px 20px;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
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

  .table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 980px;
  }

  th {
    background: #f8fafc;
    color: #6b7280;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.55px;
    text-align: left;
    padding: 14px 16px;
    border-bottom: 1px solid #edf0f4;
  }

  td {
    padding: 15px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #374151;
    font-size: 13px;
    font-weight: 700;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  td strong {
    color: #111827;
    font-weight: 950;
  }

  .right {
    text-align: right;
  }

  .empty {
    text-align: center;
    color: #9ca3af;
    padding: 34px 16px;
    font-weight: 850;
  }

  .amount-pill,
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

  .amount-pill {
    background: #f3f4f6;
    color: #111827;
  }

  .status.paid {
    background: #ecfdf5;
    color: #047857;
  }

  .status.pending {
    background: #fff7ed;
    color: #c2410c;
  }

  .status.failed {
    background: #fef2f2;
    color: #b91c1c;
  }

  .status.cancelled {
    background: #f3f4f6;
    color: #4b5563;
  }

  .action-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 11px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #111827;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-btn:hover {
    background: #111827;
    color: #ffd21e;
  }

  .icon-btn.success:hover {
    background: #047857;
    color: #ffffff;
  }

  .icon-btn.danger:hover {
    background: #b91c1c;
    color: #ffffff;
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
    max-width: 960px;
    max-height: 92vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,0.35);
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

  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
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

  .remarks-field {
    margin-top: 16px;
  }

  .po-balance-card {
    margin-top: 16px;
    border-radius: 20px;
    border: 1px solid #edf0f4;
    background: #111827;
    padding: 16px;
    color: #ffffff;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .po-balance-card div {
    border-right: 1px solid rgba(255,255,255,0.12);
    padding-right: 12px;
  }

  .po-balance-card div:last-child {
    border-right: none;
  }

  .po-balance-card span {
    display: block;
    color: rgba(255,255,255,0.62);
    font-size: 12px;
    font-weight: 850;
  }

  .po-balance-card strong {
    display: block;
    margin-top: 6px;
    color: #ffd21e;
    font-size: 18px;
    font-weight: 950;
  }

  .modal-actions {
    margin-top: 22px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .detail-grid {
    padding: 20px 24px 2px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .detail-card {
    background: #f8fafc;
    border: 1px solid #edf0f4;
    border-radius: 18px;
    padding: 14px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .detail-card svg {
    color: #d5a900;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .detail-card span {
    display: block;
    color: #7b8190;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-card strong {
    display: block;
    margin-top: 3px;
    color: #111827;
    font-size: 13px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .remarks-box {
    margin: 18px 24px 24px;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #edf0f4;
    padding: 15px;
  }

  .remarks-box strong {
    color: #111827;
    font-size: 13px;
    font-weight: 950;
  }

  .remarks-box p {
    margin: 6px 0 0;
    color: #4b5563;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.7;
  }

  .theme-light .payment-page {
    background: #f6f7fb;
    color: #111827;
  }

  .theme-dark .payment-page {
    background: #0b0f19;
    color: #f8fafc;
  }

  .theme-dark .page-head h1,
  .theme-dark .summary-card h3,
  .theme-dark .table-head h2,
  .theme-dark td strong,
  .theme-dark .modal-head h2,
  .theme-dark .field input,
  .theme-dark .field select,
  .theme-dark .field textarea,
  .theme-dark .filter-card select,
  .theme-dark .search-box input,
  .theme-dark .detail-card strong,
  .theme-dark .remarks-box strong {
    color: #f8fafc;
  }

  .theme-dark .page-head p,
  .theme-dark .summary-card p,
  .theme-dark .table-head p,
  .theme-dark .modal-head p,
  .theme-dark .field label,
  .theme-dark .detail-card span,
  .theme-dark .remarks-box p,
  .theme-dark td {
    color: rgba(255, 255, 255, 0.68);
  }

  .theme-dark .summary-card,
  .theme-dark .filter-card,
  .theme-dark .table-card,
  .theme-dark .modal-card,
  .theme-dark .detail-card,
  .theme-dark .remarks-box {
    background: rgba(255, 255, 255, 0.055);
    border-color: rgba(255, 255, 255, 0.09);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
  }

  .theme-dark .search-box,
  .theme-dark .filter-card select,
  .theme-dark .field input,
  .theme-dark .field select,
  .theme-dark .field textarea {
    background: rgba(255, 255, 255, 0.055);
    border-color: rgba(255, 255, 255, 0.10);
  }

  .theme-dark th,
  .theme-dark .table-head {
    background: rgba(255, 255, 255, 0.045);
    border-color: rgba(255, 255, 255, 0.09);
    color: rgba(255, 255, 255, 0.55);
  }

  .theme-dark td {
    border-color: rgba(255, 255, 255, 0.07);
  }

  .theme-dark .btn.secondary,
  .theme-dark .icon-btn,
  .theme-dark .close-btn {
    background: rgba(255, 255, 255, 0.065);
    border-color: rgba(255, 255, 255, 0.10);
    color: #f8fafc;
  }

  .theme-dark .qty-pill {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
  }

  .theme-dark select option {
    background: #0f172a;
    color: #f8fafc;
  }

  @media (max-width: 1100px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filter-card {
      grid-template-columns: 1fr 1fr;
    }

    .form-grid,
    .detail-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .payment-page {
      padding: 18px;
    }

    .page-head {
      flex-direction: column;
    }

    .head-actions {
      width: 100%;
    }

    .head-actions .btn {
      flex: 1;
    }

    .summary-grid,
    .filter-card,
    .form-grid,
    .detail-grid,
    .po-balance-card {
      grid-template-columns: 1fr;
    }

    .po-balance-card div {
      border-right: none;
      border-bottom: 1px solid rgba(255,255,255,0.12);
      padding-bottom: 12px;
    }

    .po-balance-card div:last-child {
      border-bottom: none;
      padding-bottom: 0;
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
