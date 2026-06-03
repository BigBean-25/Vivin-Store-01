import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Edit3,
  Filter,
  IndianRupee,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const defaultFilters = {
  search: "",
  budget_scope: "",
  budget_year: String(currentYear),
  budget_month: String(currentMonth),
  vendor_id: "",
  warehouse_id: "",
  status: "",
};

const defaultForm = {
  budget_name: "",
  budget_scope: "overall",
  budget_year: String(currentYear),
  budget_month: String(currentMonth),
  vendor_id: "",
  warehouse_id: "",
  budget_amount: "",
  warning_limit_percent: "80",
  block_limit_percent: "100",
  remarks: "",
  status: "active",
};

const budgetScopes = [
  { value: "overall", label: "Overall Budget" },
  { value: "vendor", label: "Vendor-wise Budget" },
  { value: "warehouse", label: "Warehouse-wise Budget" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatNumber = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getArray = (res, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(res?.data?.[key])) return res.data[key];
  }

  if (Array.isArray(res?.data)) return res.data;

  return [];
};

const getScopeLabel = (value) => {
  return budgetScopes.find((item) => item.value === value)?.label || value || "-";
};

const getBudgetStatusClass = (status) => {
  if (status === "over_budget") return "budget-status danger";
  if (status === "warning") return "budget-status warning";
  return "budget-status safe";
};

const getBudgetStatusLabel = (status) => {
  if (status === "over_budget") return "Over Budget";
  if (status === "warning") return "Warning";
  return "Safe";
};

export default function ProcurementBudgets() {
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState({});
  const [summaryBudgets, setSummaryBudgets] = useState([]);

  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [formData, setFormData] = useState(defaultForm);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState({ type: "", text: "" });
  const [apiMissing, setApiMissing] = useState(false);

  const summaryUsagePercent = useMemo(() => {
    const totalBudget = Number(summary.total_budget_amount || 0);
    const used = Number(summary.total_used_amount || 0);

    if (!totalBudget) return 0;

    return Math.min(Number(((used / totalBudget) * 100).toFixed(2)), 999);
  }, [summary]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementBudgetTimer);
    window.__procurementBudgetTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const [vendorRes, warehouseRes] = await Promise.allSettled([
        API.get("/api/vendors"),
        API.get("/api/warehouses"),
      ]);

      if (vendorRes.status === "fulfilled") {
        setVendors(
          getArray(vendorRes.value, [
            "vendors",
            "data",
            "vendorList",
            "vendor_list",
          ])
        );
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
      console.error("Budget dropdown error:", error);
    } finally {
      setDropdownLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);

      const res = await API.get("/api/procurement-budgets/summary", {
        params: {
          budget_year: filters.budget_year || currentYear,
          budget_month: filters.budget_month || currentMonth,
        },
      });

      setSummary(res.data?.summary || {});
      setSummaryBudgets(res.data?.budgets || []);
    } catch (error) {
      console.error(
        "Procurement budget summary error:",
        error.response?.data || error.message
      );

      setSummary({});
      setSummaryBudgets([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.budget_year, filters.budget_month]);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-budgets", {
        params: {
          search: filters.search || undefined,
          budget_scope: filters.budget_scope || undefined,
          budget_year: filters.budget_year || undefined,
          budget_month: filters.budget_month || undefined,
          vendor_id: filters.vendor_id || undefined,
          warehouse_id: filters.warehouse_id || undefined,
          status: filters.status || undefined,
        },
      });

      setBudgets(res.data?.budgets || res.data?.data || []);
    } catch (error) {
      console.error(
        "Procurement budgets error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 404) {
        setApiMissing(true);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load procurement budgets"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBudgets();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchBudgets]);

  const refreshAll = () => {
    fetchSummary();
    fetchBudgets();
    fetchDropdowns();
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "budget_scope"
        ? {
            vendor_id: value === "vendor" ? prev.vendor_id : "",
            warehouse_id: value === "warehouse" ? prev.warehouse_id : "",
          }
        : {}),
    }));
  };

  const handleFormChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "budget_scope"
        ? {
            vendor_id: value === "vendor" ? prev.vendor_id : "",
            warehouse_id: value === "warehouse" ? prev.warehouse_id : "",
          }
        : {}),
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (budget) => {
    setEditingId(budget.id);

    setFormData({
      budget_name: budget.budget_name || "",
      budget_scope: budget.budget_scope || "overall",
      budget_year: String(budget.budget_year || currentYear),
      budget_month: String(budget.budget_month || currentMonth),
      vendor_id: String(budget.vendor_id || ""),
      warehouse_id: String(budget.warehouse_id || ""),
      budget_amount: String(budget.budget_amount || ""),
      warning_limit_percent: String(budget.warning_limit_percent || 80),
      block_limit_percent: String(budget.block_limit_percent || 100),
      remarks: budget.remarks || "",
      status: budget.status || "active",
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (!formData.budget_name.trim()) {
      showMessage("error", "Budget name is required");
      return false;
    }

    if (Number(formData.budget_amount || 0) <= 0) {
      showMessage("error", "Budget amount must be greater than 0");
      return false;
    }

    if (formData.budget_scope === "vendor" && !formData.vendor_id) {
      showMessage("error", "Vendor is required for vendor-wise budget");
      return false;
    }

    if (formData.budget_scope === "warehouse" && !formData.warehouse_id) {
      showMessage("error", "Warehouse is required for warehouse-wise budget");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        ...formData,
        budget_year: Number(formData.budget_year),
        budget_month: Number(formData.budget_month),
        budget_amount: Number(formData.budget_amount || 0),
        warning_limit_percent: Number(formData.warning_limit_percent || 80),
        block_limit_percent: Number(formData.block_limit_percent || 100),
        vendor_id: formData.budget_scope === "vendor" ? formData.vendor_id : "",
        warehouse_id:
          formData.budget_scope === "warehouse" ? formData.warehouse_id : "",
      };

      if (editingId) {
        await API.put(`/api/procurement-budgets/${editingId}`, payload);
        showMessage("success", "Procurement budget updated successfully");
      } else {
        await API.post("/api/procurement-budgets", payload);
        showMessage("success", "Procurement budget created successfully");
      }

      resetForm();
      refreshAll();
    } catch (error) {
      console.error(
        "Save procurement budget error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to save procurement budget"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budget) => {
    const confirmDelete = window.confirm(
      `Delete budget "${budget.budget_name}"?` 
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/procurement-budgets/${budget.id}`);
      showMessage("success", "Procurement budget deleted successfully");
      refreshAll();
    } catch (error) {
      console.error(
        "Delete procurement budget error:",
        error.response?.data || error.message
      );

      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete procurement budget"
      );
    }
  };

  return (
    <AdminLayout>
      <div className="budget-page">
        <style>{css}</style>

        <div className="budget-hero">
          <div>
            <div className="eyebrow">
              <Wallet size={15} />
              Procurement Control
            </div>

            <h1>Procurement Budget Control</h1>

            <p>
              Create monthly purchase budgets, track usage against purchase
              orders and monitor warning or over-budget alerts vendor-wise,
              warehouse-wise or overall.
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

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Budget
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
              Procurement Budget backend route is not connected yet. Add
              /api/procurement-budgets and restart backend.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard
            title="Total Budget"
            value={formatCurrency(summary.total_budget_amount || 0)}
            icon={Wallet}
          />

          <SummaryCard
            title="Used Amount"
            value={formatCurrency(summary.total_used_amount || 0)}
            icon={IndianRupee}
          />

          <SummaryCard
            title="Remaining"
            value={formatCurrency(summary.total_remaining_amount || 0)}
            icon={BarChart3}
            success
          />

          <SummaryCard
            title="Warning Budgets"
            value={summary.warning_budgets || 0}
            icon={ShieldAlert}
            warning
          />

          <SummaryCard
            title="Over Budgets"
            value={summary.over_budgets || 0}
            icon={AlertCircle}
            danger
          />
        </div>

        <div className="usage-card">
          <div className="usage-head">
            <div>
              <h2>
                Budget Usage ·{" "}
                {monthOptions.find(
                  (item) => item.value === String(filters.budget_month)
                )?.label || filters.budget_month}{" "}
                {filters.budget_year}
              </h2>
              <p>
                {summary.total_budgets || 0} active budgets found for selected
                period.
              </p>
            </div>

            <strong>{formatNumber(summaryUsagePercent)}%</strong>
          </div>

          <div className="usage-bar">
            <div
              style={{
                width: `${Math.min(summaryUsagePercent, 100)}%`,
              }}
            />
          </div>

          {summaryBudgets.length > 0 && (
            <div className="mini-budget-grid">
              {summaryBudgets.slice(0, 4).map((budget) => (
                <div className="mini-budget" key={budget.id}>
                  <span>{budget.budget_name}</span>
                  <strong>{formatCurrency(budget.used_amount || 0)}</strong>
                  <p>
                    Used from {formatCurrency(budget.budget_amount || 0)} ·{" "}
                    {formatNumber(budget.usage_percent || 0)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="form-card">
            <div className="section-head">
              <div>
                <h2>{editingId ? "Edit Budget" : "Create Procurement Budget"}</h2>
                <p>
                  Define budget limit for monthly procurement spending control.
                </p>
              </div>

              <button type="button" className="close-btn" onClick={resetForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Budget Name</label>
                  <input
                    value={formData.budget_name}
                    onChange={(event) =>
                      handleFormChange("budget_name", event.target.value)
                    }
                    placeholder="May 2026 Overall Procurement Budget"
                  />
                </div>

                <div className="field">
                  <label>Budget Scope</label>
                  <select
                    value={formData.budget_scope}
                    onChange={(event) =>
                      handleFormChange("budget_scope", event.target.value)
                    }
                  >
                    {budgetScopes.map((scope) => (
                      <option key={scope.value} value={scope.value}>
                        {scope.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.budget_year}
                    onChange={(event) =>
                      handleFormChange("budget_year", event.target.value)
                    }
                  />
                </div>

                <div className="field">
                  <label>Month</label>
                  <select
                    value={formData.budget_month}
                    onChange={(event) =>
                      handleFormChange("budget_month", event.target.value)
                    }
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.budget_scope === "vendor" && (
                  <div className="field">
                    <label>Vendor</label>
                    <select
                      value={formData.vendor_id}
                      onChange={(event) =>
                        handleFormChange("vendor_id", event.target.value)
                      }
                      disabled={dropdownLoading}
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.business_name ||
                            vendor.vendor_name ||
                            vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.budget_scope === "warehouse" && (
                  <div className="field">
                    <label>Warehouse</label>
                    <select
                      value={formData.warehouse_id}
                      onChange={(event) =>
                        handleFormChange("warehouse_id", event.target.value)
                      }
                      disabled={dropdownLoading}
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name || warehouse.warehouse_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label>Budget Amount</label>
                  <input
                    type="number"
                    value={formData.budget_amount}
                    onChange={(event) =>
                      handleFormChange("budget_amount", event.target.value)
                    }
                    placeholder="500000"
                    step="0.01"
                  />
                </div>

                <div className="field">
                  <label>Warning Limit %</label>
                  <input
                    type="number"
                    value={formData.warning_limit_percent}
                    onChange={(event) =>
                      handleFormChange(
                        "warning_limit_percent",
                        event.target.value
                      )
                    }
                    step="0.01"
                  />
                </div>

                <div className="field">
                  <label>Block Limit %</label>
                  <input
                    type="number"
                    value={formData.block_limit_percent}
                    onChange={(event) =>
                      handleFormChange(
                        "block_limit_percent",
                        event.target.value
                      )
                    }
                    step="0.01"
                  />
                </div>

                <div className="field">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      handleFormChange("status", event.target.value)
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field full">
                  <label>Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(event) =>
                      handleFormChange("remarks", event.target.value)
                    }
                    rows={3}
                    placeholder="Monthly procurement budget remarks..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={resetForm}>
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? (
                    <Loader2 size={17} className="spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {saving ? "Saving..." : editingId ? "Update Budget" : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>Budget Filters</span>
          </div>

          <div className="filter-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange("search", event.target.value)
                }
                placeholder="Search budget name..."
              />
            </div>

            <select
              value={filters.budget_scope}
              onChange={(event) =>
                handleFilterChange("budget_scope", event.target.value)
              }
            >
              <option value="">All Scopes</option>
              {budgetScopes.map((scope) => (
                <option key={scope.value} value={scope.value}>
                  {scope.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={filters.budget_year}
              onChange={(event) =>
                handleFilterChange("budget_year", event.target.value)
              }
            />

            <select
              value={filters.budget_month}
              onChange={(event) =>
                handleFilterChange("budget_month", event.target.value)
              }
            >
              <option value="">All Months</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            {filters.budget_scope === "vendor" && (
              <select
                value={filters.vendor_id}
                onChange={(event) =>
                  handleFilterChange("vendor_id", event.target.value)
                }
              >
                <option value="">All Vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.business_name || vendor.vendor_name || vendor.name}
                  </option>
                ))}
              </select>
            )}

            {filters.budget_scope === "warehouse" && (
              <select
                value={filters.warehouse_id}
                onChange={(event) =>
                  handleFilterChange("warehouse_id", event.target.value)
                }
              >
                <option value="">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name || warehouse.warehouse_name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filters.status}
              onChange={(event) =>
                handleFilterChange("status", event.target.value)
              }
            >
              <option value="">All Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Budget List</h2>
              <p>
                Manage monthly procurement budgets with live usage from purchase
                orders.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading procurement budgets...</h3>
              <p>Please wait while budgets are loading.</p>
            </div>
          ) : budgets.length === 0 ? (
            <div className="empty-box">
              <Wallet size={34} />
              <h3>No procurement budgets found</h3>
              <p>Create your first monthly procurement budget.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Budget</th>
                    <th>Scope</th>
                    <th>Period</th>
                    <th>Vendor / Warehouse</th>
                    <th>Budget Amount</th>
                    <th>Used</th>
                    <th>Remaining</th>
                    <th>Usage</th>
                    <th>Status</th>
                    <th>Budget Health</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {budgets.map((budget) => (
                    <tr key={budget.id}>
                      <td>
                        <strong>{budget.budget_name}</strong>
                        <div className="small-text">{budget.remarks || "-"}</div>
                      </td>

                      <td>
                        <span className="scope-pill">
                          {getScopeLabel(budget.budget_scope)}
                        </span>
                      </td>

                      <td>
                        {
                          monthOptions.find(
                            (item) =>
                              item.value === String(budget.budget_month)
                          )?.label
                        }{" "}
                        {budget.budget_year}
                      </td>

                      <td>
                        <div className="scope-name">
                          {budget.budget_scope === "vendor" && (
                            <>
                              <Building2 size={15} />
                              {budget.vendor_name || "-"}
                            </>
                          )}

                          {budget.budget_scope === "warehouse" && (
                            <>
                              <Warehouse size={15} />
                              {budget.warehouse_name || "-"}
                            </>
                          )}

                          {budget.budget_scope === "overall" && (
                            <>
                              <Wallet size={15} />
                              Overall Procurement
                            </>
                          )}
                        </div>
                      </td>

                      <td>{formatCurrency(budget.budget_amount)}</td>

                      <td>
                        <div className="amount-danger">
                          {formatCurrency(budget.used_amount)}
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            Number(budget.remaining_amount || 0) < 0
                              ? "amount-danger"
                              : "amount-positive"
                          }
                        >
                          {formatCurrency(budget.remaining_amount)}
                        </div>
                      </td>

                      <td>
                        <div className="table-progress">
                          <div
                            style={{
                              width: `${Math.min(
                                Number(budget.usage_percent || 0),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="usage-text">
                          {formatNumber(budget.usage_percent || 0)}%
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge ${budget.status || "active"}`}>
                          {budget.status || "active"}
                        </span>
                      </td>

                      <td>
                        <span className={getBudgetStatusClass(budget.budget_status)}>
                          {getBudgetStatusLabel(budget.budget_status)}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(budget)}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(budget)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
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
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, value, icon: Icon, success, warning, danger }) {
  return (
    <div
      className={`summary-card ${success ? "success" : ""} ${
        warning ? "warning" : ""
      } ${danger ? "danger" : ""}`}
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

const css = `
  .budget-page {
    color: #111827;
  }

  .budget-hero {
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

  .budget-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .budget-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    line-height: 1.7;
    max-width: 780px;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
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
  .secondary-btn:disabled,
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
  .usage-card,
  .form-card,
  .filter-card,
  .table-card {
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

  .summary-card.danger .summary-icon {
    background: #fff1f2;
    color: #e11d48;
  }

  .usage-card {
    padding: 22px;
    margin-bottom: 22px;
  }

  .usage-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .usage-head h2,
  .section-head h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .usage-head p,
  .section-head p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .usage-head strong {
    color: #111;
    font-size: 25px;
    font-weight: 950;
  }

  .usage-bar {
    height: 13px;
    border-radius: 999px;
    background: #f4f4f5;
    overflow: hidden;
  }

  .usage-bar div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, #facc15, #eab308);
  }

  .mini-budget-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .mini-budget {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 18px;
    padding: 14px;
  }

  .mini-budget span {
    display: block;
    color: #111;
    font-size: 13px;
    font-weight: 950;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mini-budget strong {
    display: block;
    margin-top: 7px;
    color: #111;
    font-size: 17px;
    font-weight: 950;
  }

  .mini-budget p {
    margin: 6px 0 0;
    color: #777;
    font-size: 12px;
    font-weight: 800;
  }

  .form-card,
  .filter-card,
  .table-card {
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
    margin-bottom: 16px;
  }

  .field.full {
    grid-column: span 2;
  }

  .field label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-size: 13px;
    font-weight: 950;
  }

  .field input,
  .field select,
  .field textarea,
  .filter-grid select,
  .filter-grid input {
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

  .field textarea {
    resize: vertical;
  }

  .field input:focus,
  .field select:focus,
  .field textarea:focus,
  .filter-grid select:focus,
  .filter-grid input:focus {
    border-color: #facc15;
    background: #fff;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
  }

  .filter-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #111827;
    font-size: 14px;
    font-weight: 950;
    margin-bottom: 14px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 0.7fr 1fr 1fr auto;
    gap: 12px;
    align-items: center;
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

  .search-wrap input {
    border: none;
    outline: none;
    background: transparent;
    padding: 0;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1350px;
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

  td strong {
    color: #111;
    font-weight: 950;
  }

  .small-text {
    color: #777;
    font-size: 12px;
    margin-top: 6px;
    max-width: 260px;
    line-height: 1.5;
  }

  .scope-pill,
  .status-badge,
  .budget-status {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .scope-pill {
    background: #eff6ff;
    color: #2563eb;
  }

  .status-badge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.inactive {
    background: #fff1f2;
    color: #e11d48;
  }

  .budget-status.safe {
    background: #ecfdf5;
    color: #047857;
  }

  .budget-status.warning {
    background: #fffbeb;
    color: #b45309;
  }

  .budget-status.danger {
    background: #fff1f2;
    color: #e11d48;
  }

  .scope-name {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #111;
    font-weight: 900;
  }

  .amount-positive {
    color: #047857;
    font-weight: 950;
  }

  .amount-danger {
    color: #e11d48;
    font-weight: 950;
  }

  .table-progress {
    height: 8px;
    width: 120px;
    border-radius: 999px;
    background: #f3f4f6;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .table-progress div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, #facc15, #eab308);
  }

  .usage-text {
    color: #777;
    font-size: 11px;
    font-weight: 950;
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

  @media (max-width: 1300px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .mini-budget-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filter-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .budget-hero {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .secondary-dark-btn {
      width: 100%;
    }

    .summary-grid,
    .mini-budget-grid,
    .form-grid,
    .filter-grid {
      grid-template-columns: 1fr;
    }

    .field.full {
      grid-column: span 1;
    }

    .form-actions {
      flex-direction: column;
    }
  }
`;
