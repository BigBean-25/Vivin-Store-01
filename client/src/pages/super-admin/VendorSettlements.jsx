import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  IndianRupee,
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Loader2,
  RefreshCw,
  X,
  Building2,
  ArrowUpRight,
} from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getVendorName = (vendor) => {
  return (
    vendor?.vendor_name ||
    vendor?.business_name ||
    vendor?.name ||
    vendor?.company_name ||
    "-"
  );
};

const getVendorId = (vendor) => {
  return vendor?.vendor_id || vendor?.id || "";
};

const todayDate = () => {
  return new Date().toISOString().slice(0, 10);
};

const PAYMENT_MODES = [
  "cash",
  "bank_transfer",
  "upi",
  "cheque",
  "rtgs",
  "neft",
];

export default function VendorSettlements() {
  const [summary, setSummary] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [allVendors, setAllVendors] = useState([]);
  const [allVendorsLoading, setAllVendorsLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);

  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);

  const [formData, setFormData] = useState({
    vendor_id: "",
    purchase_order_id: "",
    settlement_date: todayDate(),
    amount: "",
    payment_mode: "bank_transfer",
    reference_no: "",
    remarks: "",
  });

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2800);
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await API.get("/api/vendor-settlements/summary");
      setSummary(res.data?.summary || {});
      setVendors(res.data?.vendors || res.data?.data || []);
    } catch (err) {
      console.error("Fetch summary error:", err);
      setSummary({});
      setVendors([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchSettlements = async () => {
    try {
      setSettlementsLoading(true);
      const params = {};
      if (vendorFilter) params.vendor_id = vendorFilter;
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (search) params.search = search;

      const res = await API.get("/api/vendor-settlements", { params });
      setSettlements(res.data?.settlements || res.data?.data || []);
    } catch (err) {
      console.error("Fetch settlements error:", err);
      setSettlements([]);
    } finally {
      setSettlementsLoading(false);
    }
  };

  const fetchPurchaseOrders = async (vendorId) => {
    try {
      const params = vendorId ? { vendor_id: vendorId } : {};
      const res = await API.get("/api/purchase-orders", { params });
      setPurchaseOrders(
        res.data?.purchaseOrders ||
          res.data?.purchase_orders ||
          res.data?.orders ||
          res.data?.data ||
          []
      );
    } catch (err) {
      console.error("Fetch purchase orders error:", err);
      setPurchaseOrders([]);
    }
  };

  const fetchAllVendors = async () => {
    try {
      setAllVendorsLoading(true);
      const res = await API.get("/api/vendors");
      setAllVendors(
        res.data?.vendors ||
          res.data?.data ||
          res.data?.vendorList ||
          res.data?.vendor_list ||
          []
      );
    } catch (err) {
      console.error("Fetch all vendors error:", err);
      setAllVendors([]);
    } finally {
      setAllVendorsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingSettlement) {
        await API.put(`/api/vendor-settlements/${editingSettlement.id}`, payload);
        showSuccess("Settlement updated successfully");
      } else {
        await API.post("/api/vendor-settlements", payload);
        showSuccess("Vendor settlement completed successfully");
      }

      closeForm();
      fetchSettlements();
      fetchSummary();
    } catch (err) {
      console.error("Submit settlement error:", err);
      setError(err.response?.data?.message || "Failed to save settlement");
    }
  };

  const handleQuickSettle = (vendor) => {
    const vendorId = getVendorId(vendor);

    setFormData((prev) => ({
      ...prev,
      vendor_id: vendorId,
      amount: vendor.outstanding_value,
    }));

    fetchPurchaseOrders(vendorId);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setShowSettlementForm(true);
  };

  const handleEdit = (settlement) => {
    setEditingSettlement(settlement);
    setFormData({
      vendor_id: settlement.vendor_id,
      purchase_order_id: settlement.purchase_order_id || "",
      settlement_date: settlement.settlement_date,
      amount: settlement.amount,
      payment_mode: settlement.payment_mode || "bank_transfer",
      reference_no: settlement.reference_no || "",
      remarks: settlement.remarks || "",
    });
    setShowSettlementForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this settlement?")) return;

    try {
      await API.delete(`/api/vendor-settlements/${id}`);
      showSuccess("Settlement deleted successfully");
      fetchSettlements();
      fetchSummary();
    } catch (err) {
      console.error("Delete settlement error:", err);
      setError(err.response?.data?.message || "Failed to delete settlement");
    }
  };

  const closeForm = () => {
    setShowSettlementForm(false);
    setEditingSettlement(null);
    setFormData({
      vendor_id: "",
      purchase_order_id: "",
      settlement_date: todayDate(),
      amount: "",
      payment_mode: "bank_transfer",
      reference_no: "",
      remarks: "",
    });
    setPurchaseOrders([]);
  };

  const handleVendorChange = (vendorId) => {
    setFormData((prev) => ({ ...prev, vendor_id, purchase_order_id: "" }));
    fetchPurchaseOrders(vendorId);
  };

  const handleVendorSelect = (vendorId) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAllVendors = () => {
    const outstandingVendors = vendors
      .filter((v) => Number(v.outstanding_value || 0) > 0)
      .map((v) => getVendorId(v))
      .filter(Boolean);

    setSelectedVendors(
      selectedVendors.length === outstandingVendors.length
        ? []
        : outstandingVendors
    );
  };

  const handleBulkSettle = () => {
    if (selectedVendors.length === 0) return;
    // Open settlement form with first selected vendor
    const firstVendorId = selectedVendors[0];
    handleVendorChange(firstVendorId);
    setShowSettlementForm(true);
  };

  useEffect(() => {
    fetchSummary();
    fetchSettlements();
    fetchAllVendors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSettlements();
    }, 350);
    return () => clearTimeout(timer);
  }, [search, vendorFilter, statusFilter, fromDate, toDate]);

  const css = `
    .settlement-page {
      padding: 20px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 950;
      color: #111;
    }

    .page-header p {
      margin: 0;
      color: #777;
      font-size: 14px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: #fff;
      border: 1px solid #ececec;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }

    .summary-card h3 {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 850;
      color: #777;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-card .value {
      font-size: 26px;
      font-weight: 950;
      color: #111;
    }

    .summary-card .value.danger {
      color: #e11d48;
    }

    .summary-card .value.success {
      color: #047857;
    }

    .summary-card .icon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: #111;
      color: #facc15;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }

    .settlement-form-card {
      background: #fff;
      border: 1px solid #ececec;
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }

    .settlement-form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .settlement-form-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 950;
      color: #111;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 850;
      color: #333;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      height: 44px;
      border: 1.5px solid #e8e8e8;
      border-radius: 12px;
      padding: 0 14px;
      font-size: 13px;
      font-weight: 850;
      outline: none;
      font-family: inherit;
      background: #fbfbfb;
    }

    .form-group textarea {
      height: 80px;
      resize: vertical;
      padding-top: 12px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .toolbar input,
    .toolbar select {
      height: 44px;
      border: 1.5px solid #e8e8e8;
      border-radius: 14px;
      padding: 0 14px;
      font-size: 13px;
      font-weight: 850;
      outline: none;
      font-family: inherit;
      background: #fbfbfb;
    }

    .toolbar input {
      flex: 1;
      min-width: 200px;
    }

    .toolbar select {
      min-width: 140px;
    }

    .toolbar button {
      height: 44px;
      border: none;
      border-radius: 14px;
      padding: 0 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 950;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
    }

    .btn-primary {
      background: #111;
      color: #facc15;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #111;
    }

    .btn-secondary:hover {
      background: #e8e8e8;
    }

    .table-container {
      background: #fff;
      border: 1px solid #ececec;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      margin-bottom: 24px;
    }

    .table-header {
      padding: 20px;
      border-bottom: 1px solid #ececec;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .table-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 950;
      color: #111;
    }

    .bulk-action-panel {
      padding: 16px 20px;
      background: #fffbeb;
      border-bottom: 1px solid #fcd34d;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      position: relative;
      z-index: 10;
    }

    .bulk-action-panel span {
      font-size: 14px;
      font-weight: 950;
      color: #111;
    }

    .bulk-action-panel .btn-primary {
      background: #facc15;
      color: #111;
      border: none;
      padding: 10px 16px;
      border-radius: 12px;
      font-weight: 950;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(250, 204, 21, 0.2);
    }

    .bulk-action-panel .btn-primary:hover {
      background: #eab308;
    }

    .bulk-action-panel .btn-secondary {
      background: #f4f4f5;
      color: #111;
      border: 1px solid #e5e7eb;
      padding: 10px 16px;
      border-radius: 12px;
      font-weight: 950;
      font-size: 13px;
      cursor: pointer;
    }

    .bulk-action-panel .btn-secondary:hover {
      background: #e5e7eb;
    }

    .table-container table {
      width: 100%;
      border-collapse: collapse;
    }

    .table-container th {
      background: #fafafa;
      padding: 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #555;
      border-bottom: 1px solid #ececec;
    }

    .table-container td {
      padding: 16px;
      border-bottom: 1px solid #f5f5f5;
      font-size: 13px;
      color: #333;
    }

    .table-container tr:last-child td {
      border-bottom: none;
    }

    .status-badge {
      display: inline-flex;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 950;
      text-transform: uppercase;
    }

    .status-badge.completed {
      background: #ecfdf5;
      color: #047857;
    }

    .status-badge.pending {
      background: #fffbeb;
      color: #b45309;
    }

    .status-badge.cancelled {
      background: #fff1f2;
      color: #e11d48;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background: #f5f5f5;
      color: #111;
    }

    .action-btn:hover {
      background: #e8e8e8;
    }

    .action-btn.delete:hover {
      background: #fff1f2;
      color: #e11d48;
    }

    .settle-btn {
      height: 36px;
      border: none;
      border-radius: 10px;
      padding: 0 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 950;
      cursor: pointer;
      background: #111;
      color: #facc15;
    }

    .settle-btn:hover {
      transform: translateY(-1px);
    }

    .error-message {
      background: #fff1f2;
      color: #e11d48;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      font-weight: 850;
    }

    .success-message {
      background: #ecfdf5;
      color: #047857;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      font-weight: 850;
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 950;
      color: #111;
    }

    .empty-state p {
      margin: 0;
      color: #777;
      font-size: 14px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1200px) {
      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 768px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .toolbar input,
      .toolbar select,
      .toolbar button {
        width: 100%;
      }
    }
  `;

  return (
    <AdminLayout>
      <div className="settlement-page">
        <style>{css}</style>

        <div className="page-header">
          <h1>Vendor Settlement Center</h1>
          <p>Manage vendor payments, settlements, and track outstanding balances</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="summary-grid">
          <div className="summary-card">
            <div className="icon">
              <Wallet size={22} />
            </div>
            <h3>Total Outstanding</h3>
            <div className="value danger">
              {formatCurrency(summary.total_outstanding || 0)}
            </div>
          </div>

          <div className="summary-card">
            <div className="icon">
              <IndianRupee size={22} />
            </div>
            <h3>Paid This Month</h3>
            <div className="value success">
              {formatCurrency(summary.paid_this_month || 0)}
            </div>
          </div>

          <div className="summary-card">
            <div className="icon">
              <AlertTriangle size={22} />
            </div>
            <h3>Outstanding Vendors</h3>
            <div className="value danger">
              {summary.outstanding_vendors || 0}
            </div>
          </div>

          <div className="summary-card">
            <div className="icon">
              <CheckCircle2 size={22} />
            </div>
            <h3>Settlements This Month</h3>
            <div className="value success">
              {summary.settlements_this_month || 0}
            </div>
          </div>
        </div>

        {showSettlementForm && (
          <div className="settlement-form-card">
            <div className="settlement-form-header">
              <h2>
                {editingSettlement ? "Edit Settlement" : "New Settlement"}
              </h2>
              <button type="button" className="action-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vendor *</label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => handleVendorChange(e.target.value)}
                    required
                  >
                    <option value="">Select Vendor</option>
                    {allVendors.map((vendor) => (
                      <option key={getVendorId(vendor)} value={getVendorId(vendor)}>
                        {getVendorName(vendor)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Purchase Order</label>
                  <select
                    value={formData.purchase_order_id}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_order_id: e.target.value })
                    }
                  >
                    <option value="">Select PO (Optional)</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_number || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Settlement Date *</label>
                  <input
                    type="date"
                    value={formData.settlement_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settlement_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_mode: e.target.value,
                      })
                    }
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.replace(/_/g, " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Reference No</label>
                  <input
                    type="text"
                    value={formData.reference_no}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reference_no: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingSettlement ? "Update" : "Create"} Settlement
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          <div className="table-header">
            <h2>Vendor Outstanding</h2>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowSettlementForm(true)}
            >
              <Plus size={16} />
              New Settlement
            </button>
          </div>

          {selectedVendors.length > 0 && (
            <div className="bulk-action-panel">
              <span>{selectedVendors.length} vendor(s) selected</span>
              <button
                type="button"
                className="btn-primary"
                onClick={handleBulkSettle}
              >
                <ArrowUpRight size={14} />
                Settle Selected
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedVendors([])}
              >
                Clear Selection
              </button>
            </div>
          )}

          {summaryLoading ? (
            <div className="empty-state">
              <Loader2 size={32} className="spin" />
              <h3>Loading vendor outstanding...</h3>
            </div>
          ) : vendors.length === 0 ? (
            <div className="empty-state">
              <Wallet size={32} />
              <h3>No vendor outstanding found</h3>
              <p>Create purchase orders to track vendor payments</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={
                        vendors.filter((v) => Number(v.outstanding_value || 0) > 0).length > 0 &&
                        selectedVendors.length ===
                          vendors.filter((v) => Number(v.outstanding_value || 0) > 0).length
                      }
                      onChange={handleSelectAllVendors}
                    />
                  </th>
                  <th>Vendor</th>
                  <th>Purchase Value</th>
                  <th>Paid Value</th>
                  <th>Outstanding</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={getVendorId(vendor)}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedVendors.includes(getVendorId(vendor))}
                        onChange={() => handleVendorSelect(getVendorId(vendor))}
                        disabled={vendor.outstanding_value <= 0}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Building2 size={14} />
                        {getVendorName(vendor)}
                      </div>
                    </td>
                    <td>{formatCurrency(vendor.total_purchase_value || 0)}</td>
                    <td>{formatCurrency(vendor.paid_value || 0)}</td>
                    <td>
                      <div style={{ color: vendor.outstanding_value > 0 ? "#e11d48" : "#047857", fontWeight: 950 }}>
                        {formatCurrency(vendor.outstanding_value || 0)}
                      </div>
                    </td>
                    <td className="right">
                      {vendor.outstanding_value > 0 && (
                        <button
                          type="button"
                          className="settle-btn"
                          onClick={() => handleQuickSettle(vendor)}
                        >
                          <ArrowUpRight size={14} />
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-container">
          <div className="table-header">
            <h2>Settlement History</h2>
          </div>

          <div className="toolbar" style={{ padding: "0 20px 20px 20px", marginTop: 0 }}>
            <input
              type="text"
              placeholder="Search settlements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="">All Vendors</option>
              {allVendors.map((vendor) => (
                <option key={getVendorId(vendor)} value={getVendorId(vendor)}>
                  {getVendorName(vendor)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

            <button type="button" className="btn-secondary" onClick={fetchSettlements}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {settlementsLoading ? (
            <div className="empty-state">
              <Loader2 size={32} className="spin" />
              <h3>Loading settlements...</h3>
            </div>
          ) : settlements.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <h3>No settlements found</h3>
              <p>Create your first vendor settlement to get started</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id}>
                    <td>{formatDate(settlement.settlement_date)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Building2 size={14} />
                        {getVendorName(settlement)}
                      </div>
                    </td>
                    <td>{formatCurrency(settlement.amount)}</td>
                    <td>{settlement.payment_mode || "-"}</td>
                    <td>{settlement.reference_no || settlement.po_number || "-"}</td>
                    <td>
                      <span className={`status-badge ${settlement.status}`}>
                        {settlement.status}
                      </span>
                    </td>
                    <td className="right">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleEdit(settlement)}
                          title="Edit"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn delete"
                          onClick={() => handleDelete(settlement.id)}
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
