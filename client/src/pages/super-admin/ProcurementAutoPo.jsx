import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

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

const poStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "ordered", label: "Ordered" },
];

const defaultFilters = {
  plan_year: String(currentYear),
  plan_month: String(currentMonth),
  reorder_plan_id: "",
  search: "",
  expected_delivery_date: "",
  status: "draft",
  remarks: "",
};

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

const getPoStatusClass = (status) => {
  if (status === "approved") return "status approved";
  if (status === "ordered") return "status ordered";
  if (status === "pending_approval") return "status pending";
  return "status draft";
};

const exportCsv = (vendors, fileName) => {
  if (!vendors.length) return;

  const headers = [
    "Vendor",
    "Can Create PO",
    "Total Items",
    "Total Amount",
    "Product",
    "Required Qty",
    "Unit Price",
    "Estimated Value",
  ];

  const rows = [];

  vendors.forEach((vendor) => {
    vendor.items.forEach((item) => {
      rows.push([
        vendor.vendor_name,
        vendor.can_create_po ? "Yes" : "No",
        vendor.total_items,
        vendor.total_amount,
        item.product_name,
        item.required_qty,
        item.average_unit_price,
        item.estimated_value,
      ]);
    });
  });

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export default function ProcurementAutoPo() {
  const [plans, setPlans] = useState([]);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [previewVendors, setPreviewVendors] = useState([]);
  const [summary, setSummary] = useState({});
  const [history, setHistory] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [planLoading, setPlanLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const selectedMonthLabel = useMemo(() => {
    return (
      monthOptions.find((month) => month.value === String(filters.plan_month))
        ?.label || filters.plan_month
    );
  }, [filters.plan_month]);

  const vendorChartData = useMemo(() => {
    return previewVendors.slice(0, 10).map((vendor) => ({
      vendor: vendor.vendor_name || "-",
      amount: Number(vendor.total_amount || 0),
      items: Number(vendor.total_items || 0),
    }));
  }, [previewVendors]);

  const canCreateVendors = useMemo(() => {
    return previewVendors.filter((vendor) => vendor.can_create_po);
  }, [previewVendors]);

  const missingVendorItems = useMemo(() => {
    return previewVendors
      .filter((vendor) => !vendor.can_create_po)
      .reduce((sum, vendor) => sum + Number(vendor.total_items || 0), 0);
  }, [previewVendors]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementAutoPoTimer);
    window.__procurementAutoPoTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchPlans = useCallback(async () => {
    try {
      setPlanLoading(true);

      const res = await API.get("/api/procurement-reorder-plans", {
        params: {
          plan_year: filters.plan_year || undefined,
          plan_month: filters.plan_month || undefined,
          search: filters.search || undefined,
        },
      });

      const rows = res.data?.plans || res.data?.data || [];
      setPlans(rows);

      setFilters((prev) => {
        const existing = rows.some(
          (plan) => String(plan.id) === String(prev.reorder_plan_id)
        );

        if (!prev.reorder_plan_id || !existing) {
          return {
            ...prev,
            reorder_plan_id: rows[0]?.id ? String(rows[0].id) : "",
          };
        }

        return prev;
      });
    } catch (error) {
      console.error("Fetch reorder plans error:", error.response?.data || error);
      setPlans([]);
    } finally {
      setPlanLoading(false);
    }
  }, [filters.plan_year, filters.plan_month, filters.search]);

  const fetchPreview = useCallback(async () => {
    if (!filters.reorder_plan_id) {
      setPreviewPlan(null);
      setPreviewVendors([]);
      setSummary({});
      return;
    }

    try {
      setPreviewLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-auto-po/preview", {
        params: {
          reorder_plan_id: filters.reorder_plan_id,
        },
      });

      setPreviewPlan(res.data?.plan || null);
      setPreviewVendors(res.data?.vendors || res.data?.data || []);
      setSummary(res.data?.summary || {});
    } catch (error) {
      console.error("Auto PO preview error:", error.response?.data || error);

      setPreviewPlan(null);
      setPreviewVendors([]);
      setSummary({});

      if (error.response?.status === 404) {
        setApiMissing(true);
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load auto PO preview"
      );
    } finally {
      setPreviewLoading(false);
    }
  }, [filters.reorder_plan_id]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);

      const res = await API.get("/api/procurement-auto-po/history", {
        params: {
          reorder_plan_id: filters.reorder_plan_id || undefined,
        },
      });

      setHistory(res.data?.history || res.data?.data || []);
    } catch (error) {
      console.error("Auto PO history error:", error.response?.data || error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [filters.reorder_plan_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlans();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchPlans]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const refreshAll = () => {
    fetchPlans();
    fetchPreview();
    fetchHistory();
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleCreatePO = async () => {
    if (!filters.reorder_plan_id) {
      showMessage("error", "Please select reorder plan first");
      return;
    }

    if (!canCreateVendors.length) {
      showMessage("error", "No valid vendor found for PO creation");
      return;
    }

    const confirmCreate = window.confirm(
      `Create ${canCreateVendors.length} vendor-wise purchase order(s) from this reorder plan?` 
    );

    if (!confirmCreate) return;

    try {
      setCreateLoading(true);

      const res = await API.post("/api/procurement-auto-po/create", {
        reorder_plan_id: filters.reorder_plan_id,
        expected_delivery_date: filters.expected_delivery_date || "",
        status: filters.status || "draft",
        remarks: filters.remarks || "",
      });

      showMessage(
        "success",
        res.data?.message || "Purchase orders created successfully"
      );

      fetchHistory();
      fetchPreview();
    } catch (error) {
      console.error("Create auto PO error:", error.response?.data || error);

      showMessage(
        "error",
        error.response?.data?.message ||
          "Failed to create purchase orders from reorder plan"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExport = () => {
    if (!previewVendors.length) {
      showMessage("error", "No auto PO preview data available to export");
      return;
    }

    exportCsv(
      previewVendors,
      `auto-po-preview-${filters.plan_year}-${filters.plan_month}.csv` 
    );
  };

  return (
    <AdminLayout>
      <div className="auto-po-page">
        <style>{css}</style>

        <div className="auto-po-hero">
          <div>
            <div className="eyebrow">
              <ShoppingCart size={15} />
              Procurement Automation
            </div>

            <h1>PO Auto Creation</h1>

            <p>
              Convert approved reorder plan items into vendor-wise purchase
              order drafts automatically without entering items one by one.
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-dark-btn"
              onClick={handleExport}
            >
              <Download size={17} />
              Export Preview
            </button>

            <button
              type="button"
              className="secondary-dark-btn"
              onClick={refreshAll}
              disabled={planLoading || previewLoading || historyLoading}
            >
              {planLoading || previewLoading || historyLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={handleCreatePO}
              disabled={createLoading || previewLoading || !filters.reorder_plan_id}
            >
              {createLoading ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <Truck size={17} />
              )}
              Create PO
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
              Auto PO backend route is not connected yet. Add
              /api/procurement-auto-po and restart backend.
            </span>
          </div>
        )}

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>
              Auto PO Settings · {selectedMonthLabel} {filters.plan_year}
            </span>
          </div>

          <div className="filter-grid">
            <input
              type="number"
              value={filters.plan_year}
              onChange={(event) =>
                handleFilterChange("plan_year", event.target.value)
              }
              placeholder="Year"
            />

            <select
              value={filters.plan_month}
              onChange={(event) =>
                handleFilterChange("plan_month", event.target.value)
              }
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={filters.reorder_plan_id}
              onChange={(event) =>
                handleFilterChange("reorder_plan_id", event.target.value)
              }
            >
              <option value="">Select Reorder Plan</option>

              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.plan_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.expected_delivery_date}
              onChange={(event) =>
                handleFilterChange("expected_delivery_date", event.target.value)
              }
            />

            <select
              value={filters.status}
              onChange={(event) =>
                handleFilterChange("status", event.target.value)
              }
            >
              {poStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>

          <div className="search-grid">
            <div className="search-wrap">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange("search", event.target.value)
                }
                placeholder="Search reorder plan..."
              />
            </div>

            <input
              value={filters.remarks}
              onChange={(event) =>
                handleFilterChange("remarks", event.target.value)
              }
              placeholder="PO remarks"
            />
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard
            title="Vendor Groups"
            value={summary.total_vendors || 0}
            icon={Building2}
          />

          <SummaryCard
            title="Total Items"
            value={summary.total_items || 0}
            icon={PackageSearch}
          />

          <SummaryCard
            title="PO Value"
            value={formatCurrency(summary.total_po_value || 0)}
            icon={IndianRupee}
            success
          />

          <SummaryCard
            title="Can Create PO"
            value={canCreateVendors.length}
            icon={CheckCircle2}
            success
          />

          <SummaryCard
            title="Vendor Missing"
            value={missingVendorItems}
            icon={AlertCircle}
            danger
          />
        </div>

        {previewPlan && (
          <div className="plan-info">
            <CalendarDays size={18} />
            <div>
              <strong>{previewPlan.plan_name}</strong>
              <span>
                Reorder Plan ID: {previewPlan.id} · Items:{" "}
                {previewPlan.total_items || 0} · Value:{" "}
                {formatCurrency(previewPlan.total_estimated_value || 0)}
              </span>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="chart-card">
            <div className="section-head">
              <div>
                <h2>Vendor-wise PO Value</h2>
                <p>Auto purchase order value grouped by vendor.</p>
              </div>
            </div>

            {previewLoading ? (
              <EmptySmall loading text="Loading PO preview chart..." />
            ) : vendorChartData.length === 0 ? (
              <EmptySmall text="No vendor-wise PO preview found" />
            ) : (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={vendorChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="vendor" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar
                      dataKey="amount"
                      name="PO Value"
                      fill="#facc15"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="table-card small">
            <div className="section-head">
              <div>
                <h2>Vendor PO Preview</h2>
                <p>Vendor-wise PO groups ready to create.</p>
              </div>
            </div>

            {previewLoading ? (
              <EmptySmall loading text="Loading preview..." />
            ) : previewVendors.length === 0 ? (
              <EmptySmall text="No preview data found" />
            ) : (
              <div className="vendor-preview-list">
                {previewVendors.map((vendor, index) => (
                  <div
                    className={`vendor-preview ${
                      vendor.can_create_po ? "" : "blocked"
                    }`}
                    key={`${vendor.vendor_id || "missing"}-${index}`}
                  >
                    <div>
                      <h3>{vendor.vendor_name || "Vendor Missing"}</h3>
                      <p>
                        {vendor.total_items} items ·{" "}
                        {formatCurrency(vendor.total_amount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setSelectedVendor(vendor)}
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="section-head">
            <div>
              <h2>Auto PO History</h2>
              <p>Purchase orders already created from reorder plans.</p>
            </div>
          </div>

          {historyLoading ? (
            <div className="empty-box">
              <Loader2 size={32} className="spin" />
              <h3>Loading auto PO history...</h3>
              <p>Please wait while purchase order links are loading.</p>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-box">
              <FileText size={34} />
              <h3>No auto PO history found</h3>
              <p>Create PO from reorder plan to see history here.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Product</th>
                    <th>PO Qty</th>
                    <th>Value</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.plan_name || "-"}</td>

                      <td>
                        <strong>{row.po_number || row.purchase_order_id}</strong>
                      </td>

                      <td>{row.vendor_name || "-"}</td>
                      <td>{row.product_name || "-"}</td>
                      <td>{formatQty(row.po_qty)}</td>

                      <td>
                        <strong className="amount-highlight">
                          {formatCurrency(row.estimated_value)}
                        </strong>
                      </td>

                      <td>
                        <span className={getPoStatusClass(row.po_status)}>
                          {row.po_status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedVendor && (
          <div className="modal-overlay" onClick={() => setSelectedVendor(null)}>
            <div
              className="vendor-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h2>{selectedVendor.vendor_name || "Vendor Missing"}</h2>
                  <p>
                    {selectedVendor.total_items} items ·{" "}
                    {formatCurrency(selectedVendor.total_amount)}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setSelectedVendor(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Required Qty</th>
                      <th>Unit Price</th>
                      <th>Estimated Value</th>
                      <th>Priority</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedVendor.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name || "-"}</td>
                        <td>{formatQty(item.required_qty)}</td>
                        <td>{formatCurrency(item.average_unit_price)}</td>
                        <td>{formatCurrency(item.estimated_value)}</td>
                        <td>{item.priority || "-"}</td>
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

function SummaryCard({ title, value, icon: Icon, success, danger }) {
  return (
    <div
      className={`summary-card ${success ? "success" : ""} ${
        danger ? "danger" : ""
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

function EmptySmall({ text, loading }) {
  return (
    <div className="empty-small">
      {loading ? (
        <Loader2 size={28} className="spin" />
      ) : (
        <BarChart3 size={28} />
      )}
      <p>{text}</p>
    </div>
  );
}

const css = `
  .auto-po-page {
    color: #111827;
  }

  .auto-po-hero {
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

  .auto-po-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .auto-po-hero p {
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

  .filter-card,
  .summary-card,
  .chart-card,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .filter-card,
  .chart-card,
  .table-card {
    padding: 22px;
    margin-bottom: 22px;
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
    grid-template-columns: 0.8fr 1fr 1.6fr 1fr 1fr auto;
    gap: 12px;
    align-items: center;
  }

  .search-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 12px;
    margin-top: 13px;
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

  .search-wrap input,
  .filter-grid input,
  .filter-grid select,
  .search-grid input {
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

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
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
  }

  .summary-card.success .summary-icon {
    background: #ecfdf5;
    color: #047857;
  }

  .summary-card.danger .summary-icon {
    background: #fff1f2;
    color: #e11d48;
  }

  .plan-info {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    border-radius: 20px;
    padding: 15px;
    margin-bottom: 22px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .plan-info strong {
    display: block;
    color: #111;
    font-size: 14px;
    font-weight: 950;
  }

  .plan-info span {
    display: block;
    color: #92400e;
    font-size: 12px;
    font-weight: 800;
    margin-top: 4px;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 0.8fr;
    gap: 22px;
  }

  .section-head {
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

  .chart-box {
    width: 100%;
    min-height: 320px;
  }

  .vendor-preview-list {
    display: grid;
    gap: 12px;
  }

  .vendor-preview {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 18px;
    padding: 14px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .vendor-preview.blocked {
    background: #fff1f2;
    border-color: #fecdd3;
  }

  .vendor-preview h3 {
    margin: 0;
    color: #111;
    font-size: 14px;
    font-weight: 950;
  }

  .vendor-preview p {
    margin: 5px 0 0;
    color: #777;
    font-size: 12px;
    font-weight: 800;
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

  .close-btn {
    background: #f4f4f5;
    color: #111;
  }

  .table-wrap,
  .modal-table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1120px;
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

  .amount-highlight {
    color: #b45309;
    font-size: 14px;
  }

  .status {
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

  .status.pending {
    background: #eff6ff;
    color: #2563eb;
  }

  .status.approved {
    background: #ecfdf5;
    color: #047857;
  }

  .status.ordered {
    background: #f0fdf4;
    color: #16a34a;
  }

  .empty-box,
  .empty-small {
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

  .empty-small {
    min-height: 260px;
  }

  .empty-box h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    color: #111;
  }

  .empty-box p,
  .empty-small p {
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

  .vendor-modal {
    width: min(980px, 96vw);
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
    .dashboard-grid,
    .filter-grid,
    .search-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .auto-po-hero {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .secondary-dark-btn {
      width: 100%;
    }
  }
`;
