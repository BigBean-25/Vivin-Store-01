import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Loader2,
  LockKeyhole,
  PackageSearch,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

const todayDate = () => new Date().toISOString().slice(0, 10);

const defaultFilters = {
  search: "",
  vendor_id: "",
  status: "",
  approval_status: "",
  from_date: "",
  to_date: "",
};

const defaultForm = {
  contract_title: "",
  vendor_id: "",
  vendor_name: "",
  contract_start_date: todayDate(),
  contract_end_date: "",
  payment_terms: "",
  delivery_terms: "",
  status: "draft",
  remarks: "",
};

const defaultItem = {
  product_id: "",
  product_name: "",
  unit_name: "",
  old_rate: "",
  contract_rate: "",
  min_order_qty: "",
  max_order_qty: "",
  tax_percent: "",
  valid_from: "",
  valid_to: "",
  remarks: "",
};

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

const approvalOptions = [
  { value: "", label: "All Approval" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatQty = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 3,
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

const toInputDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const getArray = (res, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(res?.data?.[key])) return res.data[key];
  }

  if (Array.isArray(res?.data)) return res.data;

  return [];
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

const getStatusClass = (status) => {
  if (status === "active") return "status active";
  if (status === "closed") return "status closed";
  if (status === "expired") return "status expired";
  return "status draft";
};

const getApprovalClass = (status) => {
  if (status === "approved") return "approval approved";
  if (status === "rejected") return "approval rejected";
  return "approval pending";
};

export default function VendorRateContracts() {
  const [summary, setSummary] = useState({});
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [formData, setFormData] = useState(defaultForm);
  const [items, setItems] = useState([{ ...defaultItem }]);

  const [editingId, setEditingId] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });
  const [apiMissing, setApiMissing] = useState(false);

  const estimatedContractValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.max_order_qty || item.min_order_qty || 1);
      const rate = Number(item.contract_rate || 0);
      return sum + qty * rate;
    }, 0);
  }, [items]);

  const validItemsCount = useMemo(() => {
    return items.filter((item) => item.product_name || item.product_id).length;
  }, [items]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__vendorRateContractTimer);
    window.__vendorRateContractTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchVendors = useCallback(async () => {
    try {
      const res = await API.get("/api/vendors");
      setVendors(getArray(res, ["vendors", "data", "vendorList"]));
    } catch (error) {
      console.error("Vendor dropdown error:", error.response?.data || error);
      setVendors([]);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);

      const res = await API.get("/api/vendor-rate-contracts/summary");

      setSummary(res.data?.summary || {});
      setExpiringSoon(res.data?.expiring_soon || []);
    } catch (error) {
      console.error(
        "Vendor rate contract summary error:",
        error.response?.data || error.message
      );

      setSummary({});
      setExpiringSoon([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/vendor-rate-contracts", {
        params: {
          search: filters.search || undefined,
          vendor_id: filters.vendor_id || undefined,
          status: filters.status || undefined,
          approval_status: filters.approval_status || undefined,
          from_date: filters.from_date || undefined,
          to_date: filters.to_date || undefined,
        },
      });

      setContracts(res.data?.contracts || res.data?.data || []);
    } catch (error) {
      console.error(
        "Vendor rate contract list error:",
        error.response?.data || error.message
      );

      setContracts([]);

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load vendor rate contracts"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVendors();
    fetchSummary();
  }, [fetchVendors, fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContracts();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchContracts]);

  const refreshAll = () => {
    fetchVendors();
    fetchSummary();
    fetchContracts();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setItems([{ ...defaultItem }]);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVendorChange = (value) => {
    const selectedVendor = vendors.find(
      (vendor) => String(getVendorId(vendor)) === String(value)
    );

    setFormData((prev) => ({
      ...prev,
      vendor_id: value,
      vendor_name: selectedVendor ? getVendorName(selectedVendor) : "",
    }));
  };

  const handleItemChange = (index, name, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...defaultItem }]);
  };

  const removeItem = (index) => {
    setItems((prev) => {
      if (prev.length === 1) return [{ ...defaultItem }];
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const buildPayload = () => {
    return {
      ...formData,
      vendor_id: formData.vendor_id || null,
      items: items
        .filter((item) => item.product_name || item.product_id)
        .map((item) => ({
          ...item,
          product_id: item.product_id || null,
          old_rate: Number(item.old_rate || 0),
          contract_rate: Number(item.contract_rate || 0),
          min_order_qty: Number(item.min_order_qty || 0),
          max_order_qty: Number(item.max_order_qty || 0),
          tax_percent: Number(item.tax_percent || 0),
          valid_from: item.valid_from || formData.contract_start_date,
          valid_to: item.valid_to || formData.contract_end_date,
        })),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.contract_title.trim()) {
      showMessage("error", "Contract title is required");
      return;
    }

    if (!formData.vendor_id) {
      showMessage("error", "Vendor is required");
      return;
    }

    if (!formData.contract_end_date) {
      showMessage("error", "Contract end date is required");
      return;
    }

    if (!validItemsCount) {
      showMessage("error", "At least one contract item is required");
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();

      if (editingId) {
        await API.put(`/api/vendor-rate-contracts/${editingId}`, payload);
        showMessage("success", "Vendor rate contract updated successfully");
      } else {
        await API.post("/api/vendor-rate-contracts", payload);
        showMessage("success", "Vendor rate contract created successfully");
      }

      resetForm();
      refreshAll();
    } catch (error) {
      console.error(
        "Save vendor rate contract error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to save vendor rate contract"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setActionLoading(`edit-${id}`);

      const res = await API.get(`/api/vendor-rate-contracts/${id}`);

      const contract = res.data?.contract;
      const contractItems = res.data?.items || [];

      if (!contract) return;

      setEditingId(contract.id);

      setFormData({
        contract_title: contract.contract_title || "",
        vendor_id: contract.vendor_id || "",
        vendor_name: contract.vendor_name || "",
        contract_start_date: toInputDate(contract.contract_start_date) || todayDate(),
        contract_end_date: toInputDate(contract.contract_end_date),
        payment_terms: contract.payment_terms || "",
        delivery_terms: contract.delivery_terms || "",
        status: contract.status || "draft",
        remarks: contract.remarks || "",
      });

      setItems(
        contractItems.length
          ? contractItems.map((item) => ({
              product_id: item.product_id || "",
              product_name: item.product_name || "",
              unit_name: item.unit_name || "",
              old_rate: item.old_rate || "",
              contract_rate: item.contract_rate || "",
              min_order_qty: item.min_order_qty || "",
              max_order_qty: item.max_order_qty || "",
              tax_percent: item.tax_percent || "",
              valid_from: toInputDate(item.valid_from),
              valid_to: toInputDate(item.valid_to),
              remarks: item.remarks || "",
            }))
          : [{ ...defaultItem }]
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(
        "Edit vendor rate contract error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load contract for edit"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleView = async (id) => {
    try {
      setActionLoading(`view-${id}`);

      const res = await API.get(`/api/vendor-rate-contracts/${id}`);

      setSelectedContract({
        contract: res.data?.contract || null,
        items: res.data?.items || [],
      });
    } catch (error) {
      console.error(
        "View vendor rate contract error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to open vendor rate contract"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleApprove = async (id) => {
    const confirmApprove = window.confirm(
      "Approve and activate this vendor rate contract?"
    );

    if (!confirmApprove) return;

    try {
      setActionLoading(`approve-${id}`);

      await API.post(`/api/vendor-rate-contracts/${id}/approve`);

      showMessage("success", "Vendor rate contract approved successfully");
      refreshAll();
    } catch (error) {
      console.error(
        "Approve vendor rate contract error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to approve contract"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleClose = async (id) => {
    const confirmClose = window.confirm("Close this vendor rate contract?");

    if (!confirmClose) return;

    try {
      setActionLoading(`close-${id}`);

      await API.post(`/api/vendor-rate-contracts/${id}/close`);

      showMessage("success", "Vendor rate contract closed successfully");
      refreshAll();
    } catch (error) {
      console.error(
        "Close vendor rate contract error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to close contract"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this vendor rate contract permanently?"
    );

    if (!confirmDelete) return;

    try {
      setActionLoading(`delete-${id}`);

      await API.delete(`/api/vendor-rate-contracts/${id}`);

      showMessage("success", "Vendor rate contract deleted successfully");
      refreshAll();
    } catch (error) {
      console.error(
        "Delete vendor rate contract error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete contract"
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <AdminLayout>
      <div className="rate-page">
        <style>{css}</style>

        <div className="rate-hero">
          <div>
            <div className="eyebrow">
              <LockKeyhole size={15} />
              Procurement Price Control
            </div>

            <h1>Vendor Rate Contract / Price Lock</h1>

            <p>
              Lock vendor-wise product rates for a date range and avoid purchase
              price mismatch during PO creation.
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-dark-btn"
              onClick={refreshAll}
              disabled={loading || summaryLoading}
            >
              {loading || summaryLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
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
              Vendor Rate Contract backend route is not connected yet. Add
              /api/vendor-rate-contracts and restart backend.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard
            title="Total Contracts"
            value={summary.total_contracts || 0}
            icon={FileText}
          />

          <SummaryCard
            title="Active"
            value={summary.active_count || 0}
            icon={ShieldCheck}
            success
          />

          <SummaryCard
            title="Draft"
            value={summary.draft_count || 0}
            icon={Edit3}
          />

          <SummaryCard
            title="Pending Approval"
            value={summary.pending_approval_count || 0}
            icon={AlertCircle}
            warning
          />

          <SummaryCard
            title="Contract Value"
            value={formatCurrency(summary.total_contract_value || 0)}
            icon={IndianRupee}
          />
        </div>

        {expiringSoon.length > 0 && (
          <div className="expiring-card">
            <div className="section-head">
              <div>
                <h2>Expiring Soon</h2>
                <p>Active contracts ending within next 30 days.</p>
              </div>
            </div>

            <div className="expiring-list">
              {expiringSoon.map((contract) => (
                <div className="expiring-item" key={contract.id}>
                  <CalendarDays size={17} />
                  <div>
                    <strong>{contract.contract_title}</strong>
                    <span>
                      {contract.vendor_name || "-"} · Ends{" "}
                      {formatDate(contract.contract_end_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-head">
            <div>
              <h2>{editingId ? "Update Rate Contract" : "Create Rate Contract"}</h2>
              <p>Add product-wise locked purchase rates for selected vendor.</p>
            </div>

            <div className="form-actions">
              {editingId && (
                <button type="button" className="secondary-btn" onClick={resetForm}>
                  <X size={16} />
                  Cancel Edit
                </button>
              )}

              <button type="submit" className="primary-btn light" disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>

          <div className="form-grid">
            <input
              value={formData.contract_title}
              onChange={(event) =>
                handleFormChange("contract_title", event.target.value)
              }
              placeholder="Contract title"
            />

            <select
              value={formData.vendor_id}
              onChange={(event) => handleVendorChange(event.target.value)}
            >
              <option value="">Select Vendor</option>

              {vendors.map((vendor) => (
                <option key={getVendorId(vendor)} value={getVendorId(vendor)}>
                  {getVendorName(vendor)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={formData.contract_start_date}
              onChange={(event) =>
                handleFormChange("contract_start_date", event.target.value)
              }
            />

            <input
              type="date"
              value={formData.contract_end_date}
              onChange={(event) =>
                handleFormChange("contract_end_date", event.target.value)
              }
            />

            <select
              value={formData.status}
              onChange={(event) => handleFormChange("status", event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="form-grid two">
            <input
              value={formData.payment_terms}
              onChange={(event) =>
                handleFormChange("payment_terms", event.target.value)
              }
              placeholder="Payment terms"
            />

            <input
              value={formData.delivery_terms}
              onChange={(event) =>
                handleFormChange("delivery_terms", event.target.value)
              }
              placeholder="Delivery terms"
            />

            <input
              value={formData.remarks}
              onChange={(event) => handleFormChange("remarks", event.target.value)}
              placeholder="Remarks"
            />
          </div>

          <div className="items-head">
            <div>
              <h3>Contract Items</h3>
              <p>
                Items: {validItemsCount} · Estimated Value:{" "}
                <strong>{formatCurrency(estimatedContractValue)}</strong>
              </p>
            </div>

            <button type="button" className="secondary-btn" onClick={addItem}>
              <Plus size={16} />
              Add Item
            </button>
          </div>

          <div className="item-list">
            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <input
                  value={item.product_name}
                  onChange={(event) =>
                    handleItemChange(index, "product_name", event.target.value)
                  }
                  placeholder="Product / raw material"
                />

                <input
                  value={item.unit_name}
                  onChange={(event) =>
                    handleItemChange(index, "unit_name", event.target.value)
                  }
                  placeholder="Unit"
                />

                <input
                  type="number"
                  value={item.old_rate}
                  onChange={(event) =>
                    handleItemChange(index, "old_rate", event.target.value)
                  }
                  placeholder="Old rate"
                />

                <input
                  type="number"
                  value={item.contract_rate}
                  onChange={(event) =>
                    handleItemChange(index, "contract_rate", event.target.value)
                  }
                  placeholder="Locked rate"
                />

                <input
                  type="number"
                  value={item.min_order_qty}
                  onChange={(event) =>
                    handleItemChange(index, "min_order_qty", event.target.value)
                  }
                  placeholder="Min qty"
                />

                <input
                  type="number"
                  value={item.max_order_qty}
                  onChange={(event) =>
                    handleItemChange(index, "max_order_qty", event.target.value)
                  }
                  placeholder="Max qty"
                />

                <input
                  type="number"
                  value={item.tax_percent}
                  onChange={(event) =>
                    handleItemChange(index, "tax_percent", event.target.value)
                  }
                  placeholder="Tax %"
                />

                <input
                  value={item.remarks}
                  onChange={(event) =>
                    handleItemChange(index, "remarks", event.target.value)
                  }
                  placeholder="Remarks"
                />

                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </form>

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>Contract Filters</span>
          </div>

          <div className="filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange("search", event.target.value)
                }
                placeholder="Search contract..."
              />
            </div>

            <select
              value={filters.vendor_id}
              onChange={(event) =>
                handleFilterChange("vendor_id", event.target.value)
              }
            >
              <option value="">All Vendors</option>

              {vendors.map((vendor) => (
                <option key={getVendorId(vendor)} value={getVendorId(vendor)}>
                  {getVendorName(vendor)}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.approval_status}
              onChange={(event) =>
                handleFilterChange("approval_status", event.target.value)
              }
            >
              {approvalOptions.map((approval) => (
                <option key={approval.value} value={approval.value}>
                  {approval.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.from_date}
              onChange={(event) =>
                handleFilterChange("from_date", event.target.value)
              }
            />

            <input
              type="date"
              value={filters.to_date}
              onChange={(event) =>
                handleFilterChange("to_date", event.target.value)
              }
            />

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Vendor Rate Contracts</h2>
              <p>Manage price lock contracts, approvals and active rates.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Loading contracts...</h3>
              <p>Please wait while vendor rate contracts are loading.</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="empty-box">
              <LockKeyhole size={34} />
              <h3>No rate contracts found</h3>
              <p>Create vendor-wise price lock contract from the form above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contract</th>
                    <th>Vendor</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Items</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>
                        <div className="contract-cell">
                          <strong>{contract.contract_title}</strong>
                          <span>{contract.contract_number}</span>
                        </div>
                      </td>

                      <td>
                        <div className="vendor-cell">
                          <Building2 size={15} />
                          <span>{contract.vendor_name || contract.vendor_id}</span>
                        </div>
                      </td>

                      <td>{formatDate(contract.contract_start_date)}</td>
                      <td>{formatDate(contract.contract_end_date)}</td>
                      <td>{contract.total_items || 0}</td>
                      <td>{formatCurrency(contract.estimated_contract_value || 0)}</td>

                      <td>
                        <span className={getStatusClass(contract.status)}>
                          {contract.status || "draft"}
                        </span>
                      </td>

                      <td>
                        <span className={getApprovalClass(contract.approval_status)}>
                          {contract.approval_status || "pending"}
                        </span>
                      </td>

                      <td className="right">
                        <div className="action-group">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleView(contract.id)}
                          >
                            {actionLoading === `view-${contract.id}` ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Eye size={15} />
                            )}
                          </button>

                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => handleEdit(contract.id)}
                          >
                            {actionLoading === `edit-${contract.id}` ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Edit3 size={15} />
                            )}
                          </button>

                          {contract.approval_status !== "approved" && (
                            <button
                              type="button"
                              className="icon-btn approve"
                              onClick={() => handleApprove(contract.id)}
                            >
                              {actionLoading === `approve-${contract.id}` ? (
                                <Loader2 size={15} className="spin" />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                            </button>
                          )}

                          {contract.status === "active" && (
                            <button
                              type="button"
                              className="icon-btn close"
                              onClick={() => handleClose(contract.id)}
                            >
                              {actionLoading === `close-${contract.id}` ? (
                                <Loader2 size={15} className="spin" />
                              ) : (
                                <XCircle size={15} />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleDelete(contract.id)}
                          >
                            {actionLoading === `delete-${contract.id}` ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedContract && (
          <div className="modal-overlay" onClick={() => setSelectedContract(null)}>
            <div className="rate-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <h2>{selectedContract.contract?.contract_title}</h2>
                  <p>{selectedContract.contract?.contract_number}</p>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setSelectedContract(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="detail-grid">
                <DetailItem
                  label="Vendor"
                  value={selectedContract.contract?.vendor_name || "-"}
                />
                <DetailItem
                  label="Start"
                  value={formatDate(selectedContract.contract?.contract_start_date)}
                />
                <DetailItem
                  label="End"
                  value={formatDate(selectedContract.contract?.contract_end_date)}
                />
                <DetailItem
                  label="Status"
                  value={selectedContract.contract?.status || "-"}
                />
                <DetailItem
                  label="Approval"
                  value={selectedContract.contract?.approval_status || "-"}
                />
                <DetailItem
                  label="Value"
                  value={formatCurrency(
                    selectedContract.contract?.estimated_contract_value || 0
                  )}
                />
              </div>

              <div className="terms-grid">
                <div>
                  <h3>Payment Terms</h3>
                  <p>{selectedContract.contract?.payment_terms || "-"}</p>
                </div>

                <div>
                  <h3>Delivery Terms</h3>
                  <p>{selectedContract.contract?.delivery_terms || "-"}</p>
                </div>
              </div>

              <div className="modal-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Unit</th>
                      <th>Old Rate</th>
                      <th>Locked Rate</th>
                      <th>Min Qty</th>
                      <th>Max Qty</th>
                      <th>Tax %</th>
                      <th>Validity</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedContract.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.product_name || "-"}</strong>
                        </td>
                        <td>{item.unit_name || "-"}</td>
                        <td>{formatCurrency(item.old_rate || 0)}</td>
                        <td>
                          <strong className="rate-highlight">
                            {formatCurrency(item.contract_rate || 0)}
                          </strong>
                        </td>
                        <td>{formatQty(item.min_order_qty || 0)}</td>
                        <td>{formatQty(item.max_order_qty || 0)}</td>
                        <td>{Number(item.tax_percent || 0)}%</td>
                        <td>
                          {formatDate(item.valid_from)} - {formatDate(item.valid_to)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, value, icon: Icon, success, warning }) {
  return (
    <div
      className={`summary-card ${success ? "success" : ""} ${
        warning ? "warning" : ""
      }`}
    >
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>

      <div className="summary-icon">
        <Icon size={20} />
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const css = `
  .rate-page {
    color: #111827;
  }

  .rate-hero {
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

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #facc15;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 9px;
  }

  .rate-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .rate-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 780px;
  }

  .hero-actions,
  .form-actions,
  .action-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .primary-btn,
  .secondary-btn,
  .secondary-dark-btn {
    border: none;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }

  .primary-btn {
    background: #facc15;
    color: #111;
    box-shadow: 0 14px 30px rgba(250,204,21,0.22);
  }

  .primary-btn.light {
    background: #111;
    color: #facc15;
  }

  .secondary-btn {
    background: #f4f4f5;
    color: #111;
    border: 1px solid #e5e7eb;
  }

  .secondary-dark-btn {
    background: rgba(255,255,255,0.1);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .primary-btn:disabled,
  .secondary-dark-btn:disabled {
    opacity: 0.58;
    cursor: not-allowed;
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
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .summary-card,
  .form-card,
  .filter-card,
  .table-card,
  .expiring-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .summary-card {
    border-radius: 22px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .summary-card h3 {
    margin: 0;
    color: #111;
    font-size: 20px;
    font-weight: 950;
  }

  .summary-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    background: #111;
    color: #facc15;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-card.success .summary-icon {
    background: #ecfdf5;
    color: #047857;
  }

  .summary-card.warning .summary-icon {
    background: #fffbeb;
    color: #b45309;
  }

  .form-card,
  .filter-card,
  .table-card,
  .expiring-card {
    padding: 22px;
    margin-bottom: 22px;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .section-head h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .section-head p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .expiring-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .expiring-item {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    border-radius: 18px;
    padding: 14px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .expiring-item strong {
    display: block;
    color: #111;
    font-size: 13px;
    font-weight: 950;
  }

  .expiring-item span {
    display: block;
    color: #92400e;
    font-size: 12px;
    font-weight: 800;
    margin-top: 4px;
  }

  .form-grid,
  .filter-grid {
    display: grid;
    gap: 12px;
    align-items: center;
  }

  .form-grid {
    grid-template-columns: 1.4fr 1fr 0.8fr 0.8fr 0.7fr;
    margin-bottom: 12px;
  }

  .form-grid.two {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .filter-grid {
    grid-template-columns: 1.4fr 1fr 0.8fr 0.9fr 0.8fr 0.8fr auto;
  }

  .filter-title,
  .items-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .filter-title {
    justify-content: flex-start;
    color: #111827;
    font-size: 14px;
    font-weight: 950;
  }

  .items-head {
    margin-top: 18px;
  }

  .items-head h3 {
    margin: 0;
    color: #111;
    font-size: 18px;
    font-weight: 950;
  }

  .items-head p {
    margin: 5px 0 0;
    color: #777;
    font-size: 13px;
  }

  .search-wrap {
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

  input,
  select {
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
  }

  .search-wrap input {
    border: none;
    background: transparent;
    padding: 0;
  }

  .item-list {
    display: grid;
    gap: 10px;
  }

  .item-row {
    display: grid;
    grid-template-columns: 1.4fr 0.5fr 0.65fr 0.65fr 0.65fr 0.65fr 0.55fr 1fr auto;
    gap: 10px;
    align-items: center;
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 18px;
    padding: 12px;
  }

  .remove-btn {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    border: none;
    background: #fff1f2;
    color: #e11d48;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .table-wrap,
  .modal-table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1200px;
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

  .contract-cell strong {
    display: block;
    color: #111;
    font-weight: 950;
  }

  .contract-cell span {
    display: block;
    color: #777;
    font-size: 12px;
    margin-top: 4px;
  }

  .vendor-cell {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #111;
    font-weight: 900;
  }

  .status,
  .approval {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status.draft {
    background: #fffbeb;
    color: #b45309;
  }

  .status.active,
  .approval.approved {
    background: #ecfdf5;
    color: #047857;
  }

  .status.closed {
    background: #eff6ff;
    color: #2563eb;
  }

  .status.expired,
  .approval.rejected {
    background: #fff1f2;
    color: #e11d48;
  }

  .approval.pending {
    background: #fffbeb;
    color: #b45309;
  }

  .right {
    text-align: right;
  }

  .icon-btn,
  .close-btn {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    border: none;
    background: #111;
    color: #facc15;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-btn.edit {
    background: #eff6ff;
    color: #2563eb;
  }

  .icon-btn.approve {
    background: #ecfdf5;
    color: #047857;
  }

  .icon-btn.close,
  .icon-btn.danger {
    background: #fff1f2;
    color: #e11d48;
  }

  .close-btn {
    background: #f4f4f5;
    color: #111;
  }

  .empty-box {
    min-height: 220px;
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

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.58);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .rate-modal {
    width: min(1120px, 96vw);
    max-height: 88vh;
    overflow-y: auto;
    background: #fff;
    border-radius: 26px;
    padding: 24px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.35);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .modal-head h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 950;
    color: #111;
  }

  .modal-head p {
    margin: 6px 0 0;
    color: #777;
    font-weight: 800;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .detail-item,
  .terms-grid > div {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 16px;
    padding: 14px;
  }

  .detail-item span {
    display: block;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .detail-item strong {
    color: #111;
    font-size: 13px;
  }

  .terms-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .terms-grid h3 {
    margin: 0 0 7px;
    font-size: 13px;
    font-weight: 950;
    color: #111;
  }

  .terms-grid p {
    margin: 0;
    color: #52525b;
    font-size: 13px;
    line-height: 1.6;
  }

  .rate-highlight {
    color: #047857;
    font-size: 14px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1300px) {
    .summary-grid,
    .form-grid,
    .form-grid.two,
    .filter-grid,
    .item-row,
    .detail-grid,
    .terms-grid,
    .expiring-list {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .rate-hero,
    .section-head,
    .items-head {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-actions,
    .form-actions,
    .primary-btn,
    .secondary-btn,
    .secondary-dark-btn {
      width: 100%;
    }
  }
`;
