import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Building2,
  CheckCircle2,
  Edit3,
  IndianRupee,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

const initialForm = {
  vendor_id: "",
  wallet_id: "",
  transaction_type: "debit",
  amount: "",
  payment_mode: "Cash",
  reference_no: "",
  reference_type: "",
  reference_id: "",
  transaction_date: "",
  status: "completed",
  description: "",
};

const transactionTypes = [
  { value: "debit", label: "Debit (Purchase / Expense)" },
  { value: "credit", label: "Credit (Payment / Refund)" },
];

const paymentModes = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Wallet", "Other"];

const statusOptions = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const getTypeLabel = (value) => {
  return transactionTypes.find((item) => item.value === value)?.label || value || "-";
};

export default function VendorTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [wallets, setWallets] = useState([]);

  const [formData, setFormData] = useState({
    ...initialForm,
    transaction_date: todayDate(),
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2800);
  };

  const getVendorName = (vendor) => {
    return (
      vendor.business_name ||
      vendor.vendor_name ||
      vendor.name ||
      vendor.company_name ||
      `Vendor #${vendor.id}`
    );
  };

  const getVendorListFromResponse = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.vendors)) return data.vendors;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.vendors)) return data.data.vendors;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
  };

  const fetchVendors = async () => {
    try {
      const res = await API.get("/api/vendors");
      setVendors(getVendorListFromResponse(res.data));
    } catch (err) {
      console.error("Fetch vendors error:", err.response?.data || err.message);
      setVendors([]);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await API.get("/api/vendor-wallets");
      setWallets(res.data?.wallets || []);
    } catch (err) {
      console.error("Fetch wallets error:", err.response?.data || err.message);
      setWallets([]);
    }
  };

  const fetchVendorTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (typeFilter) params.append("transaction_type", typeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const res = await API.get(`/api/vendor-transactions?${params.toString()}`);

      if (res.data.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchWallets();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorTransactions();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, vendorFilter, typeFilter, statusFilter, fromDate, toDate]);

  const filteredWallets = useMemo(() => {
    if (!formData.vendor_id) return wallets;
    return wallets.filter((wallet) => String(wallet.vendor_id) === String(formData.vendor_id));
  }, [wallets, formData.vendor_id]);

  const stats = useMemo(() => {
    const total = transactions.length;

    const totalCredit = transactions.reduce((sum, item) => {
      return item.transaction_type === "credit"
        ? sum + Number(item.amount || 0)
        : sum;
    }, 0);

    const totalDebit = transactions.reduce((sum, item) => {
      return item.transaction_type === "debit"
        ? sum + Number(item.amount || 0)
        : sum;
    }, 0);

    const completed = transactions.filter((item) => item.status === "completed").length;

    return {
      total,
      completed,
      totalCredit,
      totalDebit,
    };
  }, [transactions]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      transaction_date: todayDate(),
    });
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      transaction_date: todayDate(),
    });
    setShowForm(false);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "vendor_id") {
        const wallet = wallets.find((item) => String(item.vendor_id) === String(value));
        next.wallet_id = wallet?.id ? String(wallet.id) : "";
      }

      return next;
    });
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);

    setFormData({
      vendor_id: String(transaction.vendor_id || ""),
      wallet_id: String(transaction.wallet_id || ""),
      transaction_type: transaction.transaction_type || "debit",
      amount: transaction.amount ?? "",
      payment_mode: transaction.payment_mode || "Cash",
      reference_no: transaction.reference_no || "",
      transaction_date: transaction.transaction_date
        ? String(transaction.transaction_date).slice(0, 10)
        : todayDate(),
      status: transaction.status || "completed",
      description: transaction.description || "",
    });

    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (!formData.vendor_id) {
      setError("Vendor is required");
      return false;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError("Amount must be greater than 0");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        vendor_id: formData.vendor_id,
        wallet_id: formData.wallet_id,
        transaction_type: formData.transaction_type,
        amount: Number(formData.amount || 0),
        payment_mode: formData.payment_mode,
        reference_no: formData.reference_no.trim(),
        transaction_date: formData.transaction_date,
        status: formData.status,
        description: formData.description.trim(),
      };

      if (editingId) {
        await API.put(`/api/vendor-transactions/${editingId}`, payload);
        showSuccess("Vendor transaction updated successfully");
      } else {
        await API.post("/api/vendor-transactions", payload);
        showSuccess("Vendor transaction created successfully");
      }

      closeForm();
      fetchVendorTransactions();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor transaction");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transaction) => {
    const confirmDelete = window.confirm(
      `Delete transaction ${transaction.reference_no || `#${transaction.id}`}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/vendor-transactions/${transaction.id}`);
      showSuccess("Vendor transaction deleted successfully");
      fetchVendorTransactions();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor transaction");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setVendorFilter("");
    setTypeFilter("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
  };

  return (
    <AdminLayout>
      <div className="vendor-transaction-page">
        <style>{css}</style>

        <div className="transaction-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <ArrowLeftRight size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Finance</div>
              <h1>Vendor Transactions</h1>
              <p>
                Track vendor purchases, payments, advances, debits, credits, refunds and
                settlement references with date-wise transaction history.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorTransactions}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Transaction
            </button>
          </div>
        </div>

        {success && (
          <div className="success-box">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {error && (
          <div className="error-box">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}

        <div className="stats-grid">
          <StatCard title="Total Transactions" value={stats.total} icon={ReceiptText} />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} />
          <StatCard
            title="Total Credit"
            value={formatCurrency(stats.totalCredit)}
            icon={ArrowUpCircle}
          />
          <StatCard
            title="Total Debit"
            value={formatCurrency(stats.totalDebit)}
            icon={ArrowDownCircle}
          />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Vendor Transaction" : "Create Vendor Transaction"}</h2>
                <p>Select vendor, transaction type, amount and payment reference.</p>
              </div>

              <button type="button" className="close-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vendor</label>
                  <select name="vendor_id" value={formData.vendor_id} onChange={handleChange}>
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {getVendorName(vendor)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Wallet</label>
                  <select name="wallet_id" value={formData.wallet_id} onChange={handleChange}>
                    <option value="">No Wallet / Optional</option>
                    {filteredWallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.vendor_name || `Vendor #${wallet.vendor_id}`} ·{" "}
                        {formatCurrency(wallet.wallet_balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Transaction Type</label>
                  <select
                    name="transaction_type"
                    value={formData.transaction_type}
                    onChange={handleChange}
                  >
                    {transactionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Payment Mode</label>
                  <select
                    name="payment_mode"
                    value={formData.payment_mode}
                    onChange={handleChange}
                  >
                    {paymentModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Reference No.</label>
                  <input
                    type="text"
                    name="reference_no"
                    value={formData.reference_no}
                    onChange={handleChange}
                    placeholder="UTR / Cheque / Bill / Payment Ref"
                  />
                </div>

                <div className="form-group">
                  <label>Transaction Date</label>
                  <input
                    type="date"
                    name="transaction_date"
                    value={formData.transaction_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    {statusOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional narration / remarks"
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Transaction"
                    : "Create Transaction"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, reference, mode, description..."
            />
          </div>

          <select
            className="filter-select"
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
          >
            <option value="">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {getVendorName(vendor)}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All Types</option>
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All Status</option>
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            className="date-filter"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />

          <input
            className="date-filter"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />

          <button type="button" className="clear-btn" onClick={resetFilters}>
            Clear
          </button>

          <div className="api-chip">
            API Connected · <strong>{transactions.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Vendor Transaction List</h2>
            <p>Review transaction type, amount, payment mode and reference details.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor transactions...</h3>
              <p>Please wait while transaction records are loading.</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-box">
              <ArrowLeftRight size={34} />
              <h3>No vendor transactions found</h3>
              <p>Create your first vendor transaction using the New Transaction button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const type = transaction.transaction_type || "debit";
                    const isCredit = type === "credit";

                    return (
                      <tr key={transaction.id}>
                        <td>
                          <div className="main-name">
                            <Building2 size={15} />
                            {transaction.vendor_name || "-"}
                          </div>
                          <div className="small-text">{transaction.vendor_code || "-"}</div>
                        </td>

                        <td>
                          <span className={`type-badge ${type}`}>
                            {getTypeLabel(type)}
                          </span>
                        </td>

                        <td>
                          <div className={isCredit ? "amount-positive" : "amount-danger"}>
                            <IndianRupee size={13} />
                            {formatCurrency(transaction.amount)}
                          </div>
                        </td>

                        <td>
                          <div className="main-name">
                            <Wallet size={14} />
                            {transaction.payment_mode || "-"}
                          </div>
                        </td>

                        <td>{transaction.reference_no || "-"}</td>

                        <td>{formatDate(transaction.transaction_date || transaction.created_at)}</td>

                        <td>
                          <span className={`status-badge ${transaction.status || "completed"}`}>
                            {transaction.status || "completed"}
                          </span>
                        </td>

                        <td>
                          <div className="description-text">
                            {transaction.description || "-"}
                          </div>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEdit(transaction)}
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(transaction)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="stat-card">
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>

      <div className="stat-icon">
        <Icon size={20} />
      </div>

      <div className="stat-mark" />
    </div>
  );
}

const css = `
  .vendor-transaction-page {
    color: #151515;
  }

  .transaction-hero {
    background:
      radial-gradient(circle at top right, rgba(250,204,21,0.24), transparent 34%),
      linear-gradient(135deg, #080808, #171717 55%, #050505);
    border: 1px solid rgba(250,204,21,0.18);
    border-radius: 30px;
    padding: 32px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 22px;
    align-items: flex-start;
    box-shadow: 0 24px 70px rgba(0,0,0,0.22);
    color: #fff;
  }

  .hero-left {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }

  .hero-icon {
    width: 60px;
    height: 60px;
    border-radius: 20px;
    background: #facc15;
    color: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 18px 36px rgba(250,204,21,0.25);
    flex-shrink: 0;
  }

  .eyebrow {
    color: #facc15;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 9px;
  }

  .transaction-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .transaction-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 760px;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .primary-btn,
  .secondary-btn,
  .save-btn,
  .cancel-btn,
  .clear-btn {
    border: none;
    height: 46px;
    padding: 0 18px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }

  .primary-btn,
  .save-btn {
    background: #facc15;
    color: #111;
    box-shadow: 0 14px 30px rgba(250,204,21,0.22);
  }

  .secondary-btn {
    background: rgba(255,255,255,0.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .cancel-btn,
  .clear-btn {
    background: #f4f4f5;
    color: #111;
  }

  .success-box,
  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 900;
  }

  .success-box {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
  }

  .error-box {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
    justify-content: space-between;
  }

  .error-box button {
    border: none;
    background: transparent;
    color: #be123c;
    cursor: pointer;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card,
  .form-card,
  .toolbar,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .stat-card {
    border-radius: 22px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .stat-card h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .stat-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    background: #fffbeb;
    color: #b45309;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-mark {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: #facc15;
  }

  .form-card {
    padding: 24px;
    margin-bottom: 22px;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 22px;
  }

  .form-header h2,
  .table-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .form-header p,
  .table-header p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: none;
    background: #f6f6f6;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group.full {
    grid-column: span 2;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 950;
    color: #333;
  }

  .form-group input,
  .form-group select,
  .form-group textarea,
  .date-filter {
    width: 100%;
    border: 1.5px solid #e8e8e8;
    border-radius: 15px;
    padding: 12px 13px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
    background: #fbfbfb;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus,
  .date-filter:focus {
    border-color: #facc15;
    background: #fff;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .toolbar {
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-wrap {
    max-width: 380px;
    width: 100%;
    height: 46px;
    border-radius: 15px;
    background: #f7f7f7;
    border: 1px solid #eeeeee;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    color: #888;
  }

  .search-wrap input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    font-weight: 800;
  }

  .filter-select {
    height: 46px;
    border-radius: 15px;
    border: 1px solid #eeeeee;
    background: #fff;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 900;
    color: #333;
    outline: none;
    min-width: 155px;
  }

  .date-filter {
    height: 46px;
    width: 150px;
  }

  .api-chip {
    background: #ecfdf5;
    color: #047857;
    border-radius: 999px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
    margin-left: auto;
  }

  .table-card {
    padding: 22px;
    overflow: hidden;
  }

  .table-header {
    margin-bottom: 18px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1320px;
  }

  th {
    background: #111;
    color: #facc15;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 15px 14px;
  }

  td {
    padding: 16px 14px;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
    font-size: 13px;
    vertical-align: top;
    font-weight: 700;
  }

  tr:hover td {
    background: #fffbeb;
  }

  .main-name {
    font-weight: 950;
    color: #111;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .small-text {
    color: #777;
    font-size: 12px;
    margin-top: 6px;
  }

  .amount-positive,
  .amount-danger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 950;
  }

  .amount-positive {
    color: #047857;
  }

  .amount-danger {
    color: #e11d48;
  }

  .type-badge,
  .status-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .type-badge.purchase,
  .type-badge.debit {
    background: #fff1f2;
    color: #e11d48;
  }

  .type-badge.payment,
  .type-badge.advance,
  .type-badge.credit,
  .type-badge.refund {
    background: #ecfdf5;
    color: #047857;
  }

  .type-badge.adjustment {
    background: #eff6ff;
    color: #2563eb;
  }

  .status-badge.completed {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.pending {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.failed,
  .status-badge.cancelled {
    background: #fff1f2;
    color: #e11d48;
  }

  .description-text {
    max-width: 260px;
    color: #52525b;
    line-height: 1.5;
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .edit-btn,
  .delete-btn {
    width: 37px;
    height: 37px;
    border-radius: 13px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .edit-btn {
    background: #eff6ff;
    color: #2563eb;
  }

  .delete-btn {
    background: #fff1f2;
    color: #e11d48;
  }

  .right {
    text-align: right;
  }

  .empty-box {
    min-height: 190px;
    border: 1px dashed #ddd;
    border-radius: 22px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 28px;
    color: #777;
  }

  .empty-box h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    color: #111;
  }

  .empty-box p {
    margin: 0;
    color: #777;
    font-size: 13px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1200px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 800px) {
    .transaction-hero,
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .clear-btn {
      width: 100%;
    }

    .stats-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full {
      grid-column: span 1;
    }

    .api-chip {
      margin-left: 0;
    }

    .date-filter {
      width: 100%;
    }
  }
`;