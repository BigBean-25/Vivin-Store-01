import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  CalendarDays,
  Building2,
  Package,
  Wallet,
  ShoppingCart,
  IndianRupee,
  Search,
  Filter,
  FileText,
  RotateCcw,
} from "lucide-react";

const currentYear = new Date().getFullYear();

const defaultFilters = {
  from_date: "",
  to_date: "",
  year: String(currentYear),
  vendor_id: "",
  product_id: "",
};

const tabs = [
  { key: "monthly", label: "Monthly", icon: CalendarDays },
  { key: "vendors", label: "Vendor Wise", icon: Building2 },
  { key: "products", label: "Product Wise", icon: Package },
  { key: "outstanding", label: "Outstanding", icon: Wallet },
  { key: "status", label: "Status", icon: BarChart3 },
];

const getArray = (res, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(res?.data?.[key])) return res.data[key];
  }

  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const formatNumber = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getStatusClass = (status) => {
  switch (status) {
    case "approved":
    case "accepted":
    case "posted":
    case "paid":
    case "closed":
    case "received":
      return "status success";

    case "sent":
    case "verified":
    case "quoted":
      return "status info";

    case "cancelled":
    case "rejected":
    case "expired":
      return "status danger";

    default:
      return "status warning";
  }
};

export default function ProcurementReports() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [filters, setFilters] = useState(defaultFilters);

  const [summary, setSummary] = useState({});
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [vendorReport, setVendorReport] = useState([]);
  const [productReport, setProductReport] = useState([]);
  const [outstandingReport, setOutstandingReport] = useState([]);
  const [statusReport, setStatusReport] = useState({});

  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const finance = summary.finance || {};
  const poSummary = summary.purchase_orders || {};
  const grnSummary = summary.goods_receipts || {};
  const paymentSummary = summary.payments || {};
  const returnSummary = summary.returns || {};

  const statusBlocks = useMemo(() => {
    return [
      {
        title: "RFQs",
        rows: statusReport.rfqs || [],
      },
      {
        title: "Quotations",
        rows: statusReport.quotations || [],
      },
      {
        title: "Purchase Orders",
        rows: statusReport.purchase_orders || [],
      },
      {
        title: "Goods Receipts",
        rows: statusReport.goods_receipts || [],
      },
      {
        title: "Payments",
        rows: statusReport.payments || [],
      },
      {
        title: "Returns",
        rows: statusReport.returns || [],
      },
    ];
  }, [statusReport]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementReportsTimer);
    window.__procurementReportsTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const [vendorRes, productRes] = await Promise.allSettled([
        API.get("/api/vendors"),
        API.get("/api/products"),
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

      if (productRes.status === "fulfilled") {
        setProducts(
          getArray(productRes.value, [
            "products",
            "data",
            "productList",
            "product_list",
          ])
        );
      }
    } catch (error) {
      console.error("Report dropdown error:", error);
    } finally {
      setDropdownLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const commonParams = {
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      };

      const results = await Promise.allSettled([
        API.get("/api/procurement-reports/summary", {
          params: commonParams,
        }),

        API.get("/api/procurement-reports/monthly", {
          params: {
            year: filters.year || currentYear,
          },
        }),

        API.get("/api/procurement-reports/vendors", {
          params: {
            ...commonParams,
            vendor_id: filters.vendor_id || undefined,
          },
        }),

        API.get("/api/procurement-reports/products", {
          params: {
            ...commonParams,
            vendor_id: filters.vendor_id || undefined,
            product_id: filters.product_id || undefined,
          },
        }),

        API.get("/api/procurement-reports/outstanding-payments", {
          params: {
            vendor_id: filters.vendor_id || undefined,
          },
        }),

        API.get("/api/procurement-reports/status"),
      ]);

    const [
      summaryRes,
      monthlyRes,
      vendorRes,
      productRes,
      outstandingRes,
      statusRes,
    ] = results;

    if (summaryRes.status === "fulfilled") {
      setSummary(summaryRes.value.data?.summary || {});
    } else {
      console.error("Summary report API failed:", summaryRes.reason);
      setSummary({});
    }

    if (monthlyRes.status === "fulfilled") {
      setMonthlyReport(getArray(monthlyRes.value, ["report", "data"]));
    } else {
      console.error("Monthly report API failed:", monthlyRes.reason);
      setMonthlyReport([]);
    }

    if (vendorRes.status === "fulfilled") {
      setVendorReport(getArray(vendorRes.value, ["report", "data"]));
    } else {
      console.error("Vendor report API failed:", vendorRes.reason);
      setVendorReport([]);
    }

    if (productRes.status === "fulfilled") {
      setProductReport(getArray(productRes.value, ["report", "data"]));
    } else {
      console.error("Product report API failed:", productRes.reason);
      setProductReport([]);
    }

    if (outstandingRes.status === "fulfilled") {
      setOutstandingReport(getArray(outstandingRes.value, ["report", "data"]));
    } else {
      console.error("Outstanding payment API failed:", outstandingRes.reason);
      setOutstandingReport([]);
    }

    if (statusRes.status === "fulfilled") {
      setStatusReport(statusRes.value.data?.report || {});
    } else {
      console.error("Status report API failed:", statusRes.reason);
      setStatusReport({});
    }

    const failedApis = results.filter((item) => item.status === "rejected");

    if (failedApis.length > 0) {
      showMessage(
        "error",
        `${failedApis.length} report API failed. Check backend terminal for exact SQL error.` 
      );
    }
  } catch (error) {
    console.error("Procurement reports error:", error);

    if (error.response?.status === 404) {
      setApiMissing(true);
      return;
    }

    showMessage(
      "error",
      error.response?.data?.message || "Failed to load procurement reports"
    );
  } finally {
    setLoading(false);
  }
  }, [filters]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <AdminLayout>
      <div className="procurement-reports">
        <style>{css}</style>

        <div className="page-head">
          <div>
            <div className="eyebrow">
              <BarChart3 size={15} />
              Procurement Analytics
            </div>

            <h1>Procurement Reports</h1>

            <p>
              View monthly procurement, vendor-wise purchase, product-wise
              purchase, outstanding vendor payments and complete procurement
              status reports.
            </p>
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCcw size={16} />
            {loading ? "Refreshing..." : "Refresh Reports"}
          </button>
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
              Procurement Reports backend route is not connected yet. Add
              /api/procurement-reports routes and restart server.
            </span>
          </div>
        )}

        <div className="filter-card">
          <div className="filter-title">
            <Filter size={17} />
            <span>Report Filters</span>
          </div>

          <div className="filter-grid">
            <div className="field">
              <label>From Date</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) =>
                  handleFilterChange("from_date", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>To Date</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange("to_date", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Year</label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => handleFilterChange("year", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Vendor</label>
              <select
                value={filters.vendor_id}
                onChange={(e) =>
                  handleFilterChange("vendor_id", e.target.value)
                }
                disabled={dropdownLoading}
              >
                <option value="">All Vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.business_name || vendor.name || vendor.vendor_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Product</label>
              <select
                value={filters.product_id}
                onChange={(e) =>
                  handleFilterChange("product_id", e.target.value)
                }
                disabled={dropdownLoading}
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name || product.product_name || product.title}
                    {product.sku ? ` (${product.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={resetFilters}
              >
                <RotateCcw size={15} />
                Reset
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={fetchReports}
                disabled={loading}
              >
                <Search size={15} />
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard
            icon={ShoppingCart}
            label="Total PO Value"
            value={formatCurrency(finance.total_po_value || 0)}
            subText={`${formatNumber(
              poSummary.total_purchase_orders || 0
            )} purchase orders`}
          />

          <SummaryCard
            icon={Wallet}
            label="Paid Value"
            value={formatCurrency(finance.paid_value || 0)}
            subText={`${formatNumber(paymentSummary.total_payments || 0)} payments`}
          />

          <SummaryCard
            icon={IndianRupee}
            label="Outstanding"
            value={formatCurrency(finance.outstanding_value || 0)}
            subText="Vendor payable balance"
          />

          <SummaryCard
            icon={FileText}
            label="GRN Value"
            value={formatCurrency(finance.total_grn_value || 0)}
            subText={`${formatNumber(grnSummary.total_grns || 0)} receipts`}
          />

          <SummaryCard
            icon={RotateCcw}
            label="Return Qty"
            value={formatNumber(finance.total_return_qty || 0)}
            subText={`${formatNumber(returnSummary.total_returns || 0)} returns`}
          />
        </div>

        <div className="tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "monthly" && (
          <ReportCard
            title="Monthly Procurement Report"
            subtitle={`Year ${filters.year || currentYear}`}
          >
            <Table
              columns={[
                "Month",
                "PO Count",
                "PO Value",
                "Received Value",
                "Cancelled Value",
                "Paid",
                "Outstanding",
              ]}
              empty="No monthly report found"
              loading={loading}
            >
              {monthlyReport.map((row) => (
                <tr key={row.month_key}>
                  <td>
                    <strong>{row.month_name || row.month_key}</strong>
                  </td>
                  <td>{formatNumber(row.total_purchase_orders)}</td>
                  <td>{formatCurrency(row.total_po_value)}</td>
                  <td>{formatCurrency(row.received_po_value)}</td>
                  <td>{formatCurrency(row.cancelled_po_value)}</td>
                  <td>{formatCurrency(row.paid_value)}</td>
                  <td>
                    <span className="amount-pill">
                      {formatCurrency(row.outstanding_value)}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          </ReportCard>
        )}

        {activeTab === "vendors" && (
          <ReportCard
            title="Vendor-wise Procurement Report"
            subtitle="Purchase value, paid value, outstanding and returns by vendor"
          >
            <Table
              columns={[
                "Vendor",
                "PO Count",
                "PO Value",
                "Received",
                "Cancelled",
                "Paid",
                "Outstanding",
                "Return Qty",
              ]}
              empty="No vendor report found"
              loading={loading}
            >
              {vendorReport.map((row) => (
                <tr key={row.vendor_id}>
                  <td>
                    <strong>{row.vendor_name || "-"}</strong>
                  </td>
                  <td>{formatNumber(row.total_purchase_orders)}</td>
                  <td>{formatCurrency(row.total_po_value)}</td>
                  <td>{formatCurrency(row.received_value)}</td>
                  <td>{formatCurrency(row.cancelled_value)}</td>
                  <td>{formatCurrency(row.paid_value)}</td>
                  <td>
                    <span className="amount-pill">
                      {formatCurrency(row.outstanding_value)}
                    </span>
                  </td>
                  <td>{formatNumber(row.return_qty)}</td>
                </tr>
              ))}
            </Table>
          </ReportCard>
        )}

        {activeTab === "products" && (
          <ReportCard
            title="Product-wise Procurement Report"
            subtitle="Ordered quantity, received quantity and purchase value by product"
          >
            <Table
              columns={[
                "Product",
                "Code",
                "SKU",
                "PO Count",
                "Ordered Qty",
                "Received Qty",
                "Purchase Value",
                "Avg Price",
                "Min Price",
                "Max Price",
              ]}
              empty="No product report found"
              loading={loading}
            >
              {productReport.map((row) => (
                <tr key={row.product_id}>
                  <td>
                    <strong>{row.product_name || "-"}</strong>
                  </td>
                  <td>{row.product_code || "-"}</td>
                  <td>{row.sku || "-"}</td>
                  <td>{formatNumber(row.total_purchase_orders)}</td>
                  <td>{formatNumber(row.total_ordered_qty)}</td>
                  <td>{formatNumber(row.total_received_qty)}</td>
                  <td>{formatCurrency(row.total_purchase_value)}</td>
                  <td>{formatCurrency(row.avg_unit_price)}</td>
                  <td>{formatCurrency(row.min_unit_price)}</td>
                  <td>{formatCurrency(row.max_unit_price)}</td>
                </tr>
              ))}
            </Table>
          </ReportCard>
        )}

        {activeTab === "outstanding" && (
          <ReportCard
            title="Outstanding Vendor Payments"
            subtitle="Vendors with pending payable amount"
          >
            <Table
              columns={[
                "Vendor",
                "PO Count",
                "Total PO Value",
                "Paid Value",
                "Outstanding",
              ]}
              empty="No outstanding payments found"
              loading={loading}
            >
              {outstandingReport.map((row) => (
                <tr key={row.vendor_id}>
                  <td>
                    <strong>{row.vendor_name || "-"}</strong>
                  </td>
                  <td>{formatNumber(row.total_purchase_orders)}</td>
                  <td>{formatCurrency(row.total_po_value)}</td>
                  <td>{formatCurrency(row.paid_value)}</td>
                  <td>
                    <span className="danger-pill">
                      {formatCurrency(row.outstanding_value)}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          </ReportCard>
        )}

        {activeTab === "status" && (
          <div className="status-grid">
            {statusBlocks.map((block) => (
              <div className="status-card" key={block.title}>
                <div className="status-card-head">
                  <h3>{block.title}</h3>
                  <span>{formatNumber(block.rows.length)} status</span>
                </div>

                {block.rows.length === 0 ? (
                  <div className="empty small">No status data</div>
                ) : (
                  <div className="status-list">
                    {block.rows.map((row) => (
                      <div className="status-row" key={row.status || "empty"}>
                        <span className={getStatusClass(row.status)}>
                          {row.status || "unknown"}
                        </span>

                        <strong>{formatNumber(row.total)}</strong>

                        {row.amount !== undefined && (
                          <b>{formatCurrency(row.amount)}</b>
                        )}

                        {row.quantity !== undefined && (
                          <b>{formatNumber(row.quantity)} qty</b>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, subText }) {
  return (
    <div className="summary-card">
      <div className="summary-icon">
        <Icon size={20} />
      </div>

      <div>
        <p>{label}</p>
        <h3>{value}</h3>
        <span>{subText}</span>
      </div>
    </div>
  );
}

function ReportCard({ title, subtitle, children }) {
  return (
    <div className="report-card">
      <div className="report-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function Table({ columns, children, empty, loading }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="empty-table">
                Loading report...
              </td>
            </tr>
          ) : hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={columns.length} className="empty-table">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const css = `
  .procurement-reports {
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
    max-width: 820px;
    color: #6b7280;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.7;
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
    transition: transform 0.18s ease, opacity 0.18s ease;
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

  .filter-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 24px;
    padding: 16px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.055);
    margin-bottom: 18px;
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
    grid-template-columns: 0.8fr 0.8fr 0.55fr 1fr 1fr auto;
    gap: 12px;
    align-items: end;
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

  .field input,
  .field select {
    width: 100%;
    height: 44px;
    border: 1px solid #e5e7eb;
    outline: none;
    background: #f8fafc;
    border-radius: 15px;
    padding: 0 12px;
    color: #111827;
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .filter-actions {
    display: flex;
    gap: 8px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .summary-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 22px;
    padding: 17px;
    display: flex;
    gap: 13px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.055);
  }

  .summary-icon {
    width: 43px;
    height: 43px;
    border-radius: 16px;
    background: #111827;
    color: #ffd21e;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-card p {
    margin: 0;
    color: #7b8190;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.45px;
  }

  .summary-card h3 {
    margin: 5px 0 0;
    color: #111827;
    font-size: 19px;
    font-weight: 950;
  }

  .summary-card span {
    display: block;
    margin-top: 5px;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .tabs {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 20px;
    padding: 8px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 18px;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.045);
  }

  .tabs button {
    min-height: 38px;
    border: none;
    border-radius: 14px;
    background: transparent;
    color: #6b7280;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 13px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .tabs button.active {
    background: #111827;
    color: #ffd21e;
  }

  .report-card,
  .status-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.065);
  }

  .report-head {
    padding: 18px 20px;
    border-bottom: 1px solid #edf0f4;
  }

  .report-head h2,
  .status-card-head h3 {
    margin: 0;
    color: #0b0d12;
    font-size: 18px;
    font-weight: 950;
  }

  .report-head p,
  .status-card-head span {
    display: block;
    margin-top: 4px;
    color: #7b8190;
    font-size: 12px;
    font-weight: 750;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1050px;
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

  .amount-pill,
  .danger-pill,
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

  .danger-pill {
    background: #fef2f2;
    color: #b91c1c;
  }

  .status.success {
    background: #ecfdf5;
    color: #047857;
  }

  .status.info {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .status.warning {
    background: #fff7ed;
    color: #c2410c;
  }

  .status.danger {
    background: #fef2f2;
    color: #b91c1c;
  }

  .empty-table,
  .empty {
    text-align: center;
    color: #9ca3af;
    padding: 32px 16px;
    font-weight: 850;
  }

  .empty.small {
    padding: 20px 12px;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .status-card {
    padding: 17px;
  }

  .status-card-head {
    margin-bottom: 14px;
  }

  .status-list {
    display: grid;
    gap: 10px;
  }

  .status-row {
    background: #f8fafc;
    border: 1px solid #edf0f4;
    border-radius: 16px;
    padding: 12px;
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    align-items: center;
  }

  .status-row strong {
    color: #111827;
    font-size: 13px;
    font-weight: 950;
  }

  .status-row b {
    color: #6b7280;
    font-size: 12px;
    font-weight: 850;
  }

  @media (max-width: 1250px) {
    .filter-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .status-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .procurement-reports {
      padding: 18px;
    }

    .page-head {
      flex-direction: column;
    }

    .btn.primary {
      width: 100%;
    }

    .filter-grid,
    .summary-grid,
    .status-grid {
      grid-template-columns: 1fr;
    }

    .filter-actions {
      flex-direction: column;
    }

    .filter-actions .btn {
      width: 100%;
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr;
    }

    .tabs button {
      justify-content: center;
    }

    .status-row {
      grid-template-columns: 1fr;
      justify-items: start;
    }
  }
`;
