import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString("en-IN");
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

const monthStartDate = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

export default function VendorReports() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({});
  const [vendors, setVendors] = useState([]);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [fromDate, setFromDate] = useState(monthStartDate());
  const [toDate, setToDate] = useState(todayDate());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const fetchVendorReports = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const res = await API.get(`/api/vendor-reports?${params.toString()}`);

      if (res.data.success) {
        setReports(res.data.reports || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchVendorReports();
  }, [vendorFilter, fromDate, toDate]);

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;

    const keyword = search.toLowerCase();

    return reports.filter((item) => {
      return (
        String(item.vendor_name || "").toLowerCase().includes(keyword) ||
        String(item.vendor_code || "").toLowerCase().includes(keyword) ||
        String(item.status || "").toLowerCase().includes(keyword)
      );
    });
  }, [reports, search]);

  const resetFilters = () => {
    setSearch("");
    setVendorFilter("");
    setFromDate(monthStartDate());
    setToDate(todayDate());
  };

  const exportExcel = () => {
    const rows = filteredReports.map((item, index) => ({
      "S.No": index + 1,
      "Vendor Name": item.vendor_name || "-",
      "Vendor Code": item.vendor_code || "-",
      Status: item.status || "-",
      "Total Transactions": Number(item.total_transactions || 0),
      "Transaction Value": Number(item.transaction_value || 0),
      "Debit Amount": Number(item.debit_amount || 0),
      "Credit Amount": Number(item.credit_amount || 0),
      "Closing Balance": Number(item.closing_balance || 0),
      "Wallet Balance": Number(item.wallet_balance || 0),
      "Average Rating": Number(item.average_rating || 0),
      "Created Date": formatDate(item.created_at),
    }));

    const header = Object.keys(rows[0] || {
      "S.No": "",
      "Vendor Name": "",
      "Vendor Code": "",
      Status: "",
      "Total Transactions": "",
      "Transaction Value": "",
      "Debit Amount": "",
      "Credit Amount": "",
      "Closing Balance": "",
      "Wallet Balance": "",
      "Average Rating": "",
      "Created Date": "",
    });

    const tableRows = [
      header,
      ...rows.map((row) => header.map((key) => row[key])),
    ];

    const csvContent = tableRows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Vendor_Report_${fromDate || "start"}_to_${toDate || "end"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printRows = filteredReports
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.vendor_name || "-"}</td>
            <td>${item.vendor_code || "-"}</td>
            <td>${item.status || "-"}</td>
            <td>${formatNumber(item.total_transactions)}</td>
            <td>${formatCurrency(item.transaction_value)}</td>
            <td>${formatCurrency(item.debit_amount)}</td>
            <td>${formatCurrency(item.credit_amount)}</td>
            <td>${formatCurrency(item.closing_balance)}</td>
            <td>${formatCurrency(item.wallet_balance)}</td>
            <td>${Number(item.average_rating || 0).toFixed(1)}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vendor Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #111;
              padding: 24px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #111;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }

            h1 {
              margin: 0;
              font-size: 26px;
            }

            .sub {
              margin-top: 6px;
              color: #555;
              font-size: 12px;
            }

            .brand {
              text-align: right;
              font-size: 13px;
              font-weight: 700;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 18px;
            }

            .box {
              border: 1px solid #ddd;
              border-radius: 10px;
              padding: 10px;
              background: #fafafa;
            }

            .box span {
              display: block;
              font-size: 11px;
              color: #666;
              margin-bottom: 5px;
            }

            .box strong {
              font-size: 15px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }

            th {
              background: #111;
              color: #facc15;
              padding: 8px;
              border: 1px solid #111;
              text-align: left;
            }

            td {
              padding: 7px;
              border: 1px solid #ddd;
              vertical-align: top;
            }

            .footer {
              margin-top: 18px;
              font-size: 11px;
              color: #666;
              text-align: right;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Vendor Report</h1>
              <div class="sub">Period: ${fromDate || "-"} to ${toDate || "-"}</div>
            </div>
            <div class="brand">
              Vivin Store<br />
              B2B Supply Chain
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>Total Vendors</span><strong>${formatNumber(summary.total_vendors)}</strong></div>
            <div class="box"><span>Active Vendors</span><strong>${formatNumber(summary.active_vendors)}</strong></div>
            <div class="box"><span>Total Transactions</span><strong>${formatNumber(summary.total_transactions)}</strong></div>
            <div class="box"><span>Transaction Value</span><strong>${formatCurrency(summary.total_transaction_value)}</strong></div>
            <div class="box"><span>Total Debit</span><strong>${formatCurrency(summary.total_debit)}</strong></div>
            <div class="box"><span>Total Credit</span><strong>${formatCurrency(summary.total_credit)}</strong></div>
            <div class="box"><span>Closing Balance</span><strong>${formatCurrency(summary.closing_balance)}</strong></div>
            <div class="box"><span>Average Rating</span><strong>${Number(summary.average_rating || 0).toFixed(1)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Vendor</th>
                <th>Code</th>
                <th>Status</th>
                <th>Txn</th>
                <th>Txn Value</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Closing</th>
                <th>Wallet</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              ${printRows || `<tr><td colspan="11">No records found</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            Generated on ${new Date().toLocaleString("en-IN")}
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <AdminLayout>
      <div className="vendor-report-page">
        <style>{css}</style>

        <div className="report-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <BarChart3 size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Analytics</div>
              <h1>Vendor Reports</h1>
              <p>
                View vendor-wise transactions, ledger balance, wallet balance,
                ratings and export reports in PDF or Excel format.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="pdf-btn" onClick={exportPDF}>
              <FileText size={18} />
              PDF Download
            </button>

            <button type="button" className="excel-btn" onClick={exportExcel}>
              <FileSpreadsheet size={18} />
              Excel Download
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorReports}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}

        <div className="stats-grid">
          <StatCard title="Total Vendors" value={formatNumber(summary.total_vendors)} icon={Users} />
          <StatCard title="Active Vendors" value={formatNumber(summary.active_vendors)} icon={Building2} />
          <StatCard title="Transaction Value" value={formatCurrency(summary.total_transaction_value)} icon={IndianRupee} />
          <StatCard title="Wallet Balance" value={formatCurrency(summary.wallet_balance)} icon={Wallet} />
          <StatCard title="Total Debit" value={formatCurrency(summary.total_debit)} icon={Download} />
          <StatCard title="Total Credit" value={formatCurrency(summary.total_credit)} icon={IndianRupee} />
          <StatCard title="Closing Balance" value={formatCurrency(summary.closing_balance)} icon={BarChart3} />
          <StatCard title="Average Rating" value={Number(summary.average_rating || 0).toFixed(1)} icon={Star} />
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, code, status..."
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

          <div className="date-wrap">
            <CalendarDays size={16} />
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>

          <div className="date-wrap">
            <CalendarDays size={16} />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>

          <button type="button" className="clear-btn" onClick={resetFilters}>
            Clear
          </button>

          <div className="api-chip">
            API Connected · <strong>{filteredReports.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <h2>Vendor Report List</h2>
              <p>Vendor-wise financial, wallet and performance report.</p>
            </div>

            <div className="mini-export">
              <button type="button" onClick={exportPDF}>
                <FileText size={16} />
                PDF
              </button>

              <button type="button" onClick={exportExcel}>
                <FileSpreadsheet size={16} />
                Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor reports...</h3>
              <p>Please wait while report data is loading.</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-box">
              <BarChart3 size={34} />
              <h3>No vendor report found</h3>
              <p>Try changing date range or vendor filter.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Status</th>
                    <th>Total Txn</th>
                    <th>Txn Value</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Closing</th>
                    <th>Wallet</th>
                    <th>Rating</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="main-name">
                          <Building2 size={15} />
                          {item.vendor_name || "-"}
                        </div>
                        <div className="small-text">{item.vendor_code || "-"}</div>
                      </td>

                      <td>
                        <span className={`status-badge ${item.status || "active"}`}>
                          {item.status || "active"}
                        </span>
                      </td>

                      <td>{formatNumber(item.total_transactions)}</td>
                      <td>{formatCurrency(item.transaction_value)}</td>
                      <td className="danger">{formatCurrency(item.debit_amount)}</td>
                      <td className="success">{formatCurrency(item.credit_amount)}</td>
                      <td className="strong">{formatCurrency(item.closing_balance)}</td>
                      <td>{formatCurrency(item.wallet_balance)}</td>

                      <td>
                        <span className="rating-badge">
                          <Star size={13} />
                          {Number(item.average_rating || 0).toFixed(1)}
                        </span>
                      </td>

                      <td>{formatDate(item.created_at)}</td>
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
  .vendor-report-page {
    color: #151515;
  }

  .report-hero {
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

  .report-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .report-hero p {
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
    justify-content: flex-end;
  }

  .pdf-btn,
  .excel-btn,
  .secondary-btn,
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

  .pdf-btn {
    background: #fff1f2;
    color: #be123c;
    box-shadow: 0 14px 30px rgba(225,29,72,0.15);
  }

  .excel-btn {
    background: #ecfdf5;
    color: #047857;
    box-shadow: 0 14px 30px rgba(4,120,87,0.14);
  }

  .secondary-btn {
    background: rgba(255,255,255,0.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .clear-btn {
    background: #f4f4f5;
    color: #111;
  }

  .error-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 900;
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
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
    font-size: 20px;
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

  .toolbar {
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-wrap {
    max-width: 350px;
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

  .filter-select,
  .date-wrap {
    height: 46px;
    border-radius: 15px;
    border: 1px solid #eeeeee;
    background: #fff;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 900;
    color: #333;
    outline: none;
    min-width: 150px;
  }

  .date-wrap {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #777;
  }

  .date-wrap input {
    border: none;
    outline: none;
    font-family: inherit;
    font-weight: 900;
    color: #333;
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
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .table-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .table-header p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .mini-export {
    display: flex;
    gap: 8px;
  }

  .mini-export button {
    border: 1px solid #eee;
    background: #fafafa;
    border-radius: 13px;
    height: 40px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-weight: 950;
    cursor: pointer;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1180px;
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

  .status-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status-badge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.inactive,
  .status-badge.blocked {
    background: #fff1f2;
    color: #e11d48;
  }

  .strong {
    color: #111;
    font-weight: 950;
  }

  .danger {
    color: #e11d48;
    font-weight: 950;
  }

  .success {
    color: #047857;
    font-weight: 950;
  }

  .rating-badge {
    background: #111;
    color: #facc15;
    border-radius: 999px;
    padding: 7px 10px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 950;
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
    .report-hero,
    .toolbar,
    .table-header {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions,
    .pdf-btn,
    .excel-btn,
    .secondary-btn,
    .clear-btn {
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .api-chip {
      margin-left: 0;
    }

    .mini-export {
      width: 100%;
    }

    .mini-export button {
      flex: 1;
      justify-content: center;
    }
  }
`;