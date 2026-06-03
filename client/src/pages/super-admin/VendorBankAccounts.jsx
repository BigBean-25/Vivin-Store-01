import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Edit3,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

const initialForm = {
  vendor_id: "",
  account_holder_name: "",
  bank_name: "",
  branch_name: "",
  account_number: "",
  ifsc_code: "",
  account_type: "current",
  upi_id: "",
  is_default: "0",
  status: "active",
  notes: "",
};

const accountTypes = [
  { value: "current", label: "Current Account" },
  { value: "savings", label: "Savings Account" },
  { value: "cash_credit", label: "Cash Credit" },
  { value: "overdraft", label: "Overdraft" },
];

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isDefaultAccount = (value) => {
  return value === true || value === 1 || value === "1" || value === "true";
};

const isActiveStatus = (value) => {
  return value === "active" || value === 1 || value === "1" || value === true;
};

const getAccountTypeLabel = (type) => {
  return accountTypes.find((item) => item.value === type)?.label || "Current Account";
};

const maskAccountNumber = (value) => {
  if (!value) return "-";
  const text = String(value);
  if (text.length <= 4) return text;
  return `XXXX XXXX ${text.slice(-4)}`;
};

export default function VendorBankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [defaultFilter, setDefaultFilter] = useState("");

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

  const fetchVendorBankAccounts = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (accountTypeFilter) params.append("account_type", accountTypeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (defaultFilter !== "") params.append("is_default", defaultFilter);

      const res = await API.get(`/api/vendor-bank-accounts?${params.toString()}`);

      if (res.data.success) {
        setAccounts(res.data.accounts || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor bank accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorBankAccounts();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, vendorFilter, accountTypeFilter, statusFilter, defaultFilter]);

  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((item) => isActiveStatus(item.status)).length;
    const defaultAccounts = accounts.filter((item) =>
      isDefaultAccount(item.is_default)
    ).length;
    const banks = new Set(accounts.map((item) => item.bank_name).filter(Boolean)).size;

    return {
      total,
      active,
      defaultAccounts,
      banks,
    };
  }, [accounts]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(false);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "ifsc_code" ? value.toUpperCase() : value,
    }));
  };

  const handleEdit = (account) => {
    setEditingId(account.id);

    setFormData({
      vendor_id: String(account.vendor_id || ""),
      account_holder_name: account.account_holder_name || "",
      bank_name: account.bank_name || "",
      branch_name: account.branch_name || "",
      account_number: account.account_number || "",
      ifsc_code: account.ifsc_code || "",
      account_type: account.account_type || "current",
      upi_id: account.upi_id || "",
      is_default: isDefaultAccount(account.is_default) ? "1" : "0",
      status: isActiveStatus(account.status) ? "active" : "inactive",
      notes: account.notes || "",
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

    if (!formData.account_holder_name.trim()) {
      setError("Account holder name is required");
      return false;
    }

    if (!formData.bank_name.trim()) {
      setError("Bank name is required");
      return false;
    }

    if (!formData.account_number.trim()) {
      setError("Account number is required");
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
        account_holder_name: formData.account_holder_name.trim(),
        bank_name: formData.bank_name.trim(),
        branch_name: formData.branch_name.trim(),
        account_number: formData.account_number.trim(),
        ifsc_code: formData.ifsc_code.trim().toUpperCase(),
        account_type: formData.account_type,
        upi_id: formData.upi_id.trim(),
        is_default: Number(formData.is_default),
        status: formData.status,
        notes: formData.notes.trim(),
      };

      if (editingId) {
        await API.put(`/api/vendor-bank-accounts/${editingId}`, payload);
        showSuccess("Vendor bank account updated successfully");
      } else {
        await API.post("/api/vendor-bank-accounts", payload);
        showSuccess("Vendor bank account created successfully");
      }

      closeForm();
      fetchVendorBankAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor bank account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account) => {
    const confirmDelete = window.confirm(
      `Delete ${account.bank_name || "this bank account"} for ${
        account.vendor_name || "this vendor"
      }?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/vendor-bank-accounts/${account.id}`);
      showSuccess("Vendor bank account deleted successfully");
      fetchVendorBankAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor bank account");
    }
  };

  return (
    <AdminLayout>
      <div className="vendor-bank-page">
        <style>{css}</style>

        <div className="vendor-bank-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <CreditCard size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Finance</div>
              <h1>Vendor Bank Accounts</h1>
              <p>
                Manage vendor banking details, default payout account, IFSC, UPI and
                account status for purchase payments and supplier settlements.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorBankAccounts}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Bank Account
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
          <StatCard title="Total Accounts" value={stats.total} icon={CreditCard} />
          <StatCard title="Active Accounts" value={stats.active} icon={ShieldCheck} />
          <StatCard title="Default Accounts" value={stats.defaultAccounts} icon={Star} />
          <StatCard title="Bank Names" value={stats.banks} icon={Landmark} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>
                  {editingId ? "Edit Vendor Bank Account" : "Create Vendor Bank Account"}
                </h2>
                <p>Select vendor and enter bank account details.</p>
              </div>

              <button type="button" className="close-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vendor</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {getVendorName(vendor)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Type</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                  >
                    {accountTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    name="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={handleChange}
                    placeholder="Account holder name"
                  />
                </div>

                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    placeholder="Bank name"
                  />
                </div>

                <div className="form-group">
                  <label>Branch Name</label>
                  <input
                    type="text"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    placeholder="Branch name"
                  />
                </div>

                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    placeholder="Account number"
                  />
                </div>

                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    name="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={handleChange}
                    placeholder="IFSC code"
                  />
                </div>

                <div className="form-group">
                  <label>UPI ID</label>
                  <input
                    type="text"
                    name="upi_id"
                    value={formData.upi_id}
                    onChange={handleChange}
                    placeholder="UPI ID"
                  />
                </div>

                <div className="form-group">
                  <label>Default Account</label>
                  <select
                    name="is_default"
                    value={formData.is_default}
                    onChange={handleChange}
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Optional notes"
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
                    ? "Update Bank Account"
                    : "Create Bank Account"}
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
              placeholder="Search bank, account, IFSC, vendor..."
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
            value={accountTypeFilter}
            onChange={(event) => setAccountTypeFilter(event.target.value)}
          >
            <option value="">All Types</option>
            {accountTypes.map((type) => (
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="filter-select"
            value={defaultFilter}
            onChange={(event) => setDefaultFilter(event.target.value)}
          >
            <option value="">All Accounts</option>
            <option value="1">Default Only</option>
            <option value="0">Non Default</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{accounts.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Vendor Bank Account List</h2>
            <p>Manage all vendor payout accounts from one premium view.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor bank accounts...</h3>
              <p>Please wait while bank records are loading.</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="empty-box">
              <CreditCard size={34} />
              <h3>No vendor bank accounts found</h3>
              <p>Create your first vendor bank account using the New Bank Account button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Bank Details</th>
                    <th>Account</th>
                    <th>IFSC / UPI</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map((account) => {
                    const defaultAccount = isDefaultAccount(account.is_default);
                    const active = isActiveStatus(account.status);

                    return (
                      <tr key={account.id}>
                        <td>
                          <div className="main-name">
                            <Building2 size={15} />
                            {account.vendor_name || "-"}
                          </div>
                          <div className="small-text">{account.vendor_code || "-"}</div>
                        </td>

                        <td>
                          <div className="main-name">
                            <Landmark size={15} />
                            {account.bank_name || "-"}
                          </div>
                          <div className="small-text">{account.branch_name || "-"}</div>
                        </td>

                        <td>
                          <div className="account-holder">
                            {account.account_holder_name || "-"}
                          </div>
                          <div className="small-text">
                            {maskAccountNumber(account.account_number)}
                          </div>
                        </td>

                        <td>
                          <div className="main-name">{account.ifsc_code || "-"}</div>
                          <div className="small-text">{account.upi_id || "-"}</div>
                        </td>

                        <td>
                          <span className={`type-badge ${account.account_type || "current"}`}>
                            {getAccountTypeLabel(account.account_type)}
                          </span>
                        </td>

                        <td>
                          <span className={`default-badge ${defaultAccount ? "yes" : "no"}`}>
                            {defaultAccount ? "Default" : "Normal"}
                          </span>
                        </td>

                        <td>
                          <span className={`status-badge ${active ? "active" : "inactive"}`}>
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>{formatDate(account.created_at)}</td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEdit(account)}
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(account)}
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
  .vendor-bank-page {
    color: #151515;
  }

  .vendor-bank-hero {
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

  .vendor-bank-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .vendor-bank-hero p {
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
  .cancel-btn {
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

  .cancel-btn {
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

  .stat-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 20px;
    box-shadow: 0 12px 34px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .stat-card h3 {
    margin: 0;
    font-size: 26px;
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

  .form-card,
  .toolbar,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
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
  .form-group textarea {
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
  .form-group textarea:focus {
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
    min-width: 170px;
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
    min-width: 1280px;
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

  .account-holder {
    color: #27272a;
    font-weight: 950;
    max-width: 260px;
    line-height: 1.5;
  }

  .type-badge,
  .default-badge,
  .status-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .type-badge.current {
    background: #eff6ff;
    color: #2563eb;
  }

  .type-badge.savings {
    background: #ecfdf5;
    color: #047857;
  }

  .type-badge.cash_credit {
    background: #fffbeb;
    color: #b45309;
  }

  .type-badge.overdraft {
    background: #f5f3ff;
    color: #6d28d9;
  }

  .default-badge.yes {
    background: #fffbeb;
    color: #b45309;
  }

  .default-badge.no {
    background: #f4f4f5;
    color: #52525b;
  }

  .status-badge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.inactive {
    background: #fff1f2;
    color: #e11d48;
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
    .vendor-bank-hero,
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn {
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
  }
`;