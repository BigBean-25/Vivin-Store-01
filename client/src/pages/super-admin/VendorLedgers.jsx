import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Building2,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

const initialForm = {
  vendor_id: "",
  transaction_id: "",
  entry_type: "debit",
  ledger_date: "",
  opening_balance: "",
  debit_amount: "",
  credit_amount: "",
  closing_balance: "",
  reference_type: "",
  reference_id: "",
  reference_no: "",
  description: "",
  status: "active",
};

const entryTypes = [
  { value: "debit", label: "Debit (Purchase / Expense)" },
  { value: "credit", label: "Credit (Payment / Refund)" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "inactive", label: "Inactive" },
];

const todayDate = () => new Date().toISOString().slice(0, 10);

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

const getEntryLabel = (value) => {
  return entryTypes.find((item) => item.value === value)?.label || value || "-";
};

const makeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

export default function VendorLedgers() {
  const [ledgers, setLedgers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [formData, setFormData] = useState({
    ...initialForm,
    ledger_date: todayDate(),
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [statementOpen, setStatementOpen] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementVendorId, setStatementVendorId] = useState("");
  const [statementFromDate, setStatementFromDate] = useState("");
  const [statementToDate, setStatementToDate] = useState("");

  const [autoSyncing, setAutoSyncing] = useState(false);

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [vendorOverview, setVendorOverview] = useState([]);
  const [overviewSummary, setOverviewSummary] = useState({});

  const [ageingLoading, setAgeingLoading] = useState(false);
  const [ageingData, setAgeingData] = useState([]);
  const [ageingSummary, setAgeingSummary] = useState({});
  const [ageingAsOnDate, setAgeingAsOnDate] = useState(todayDate());

  const [recalculating, setRecalculating] = useState(false);

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

  const fetchTransactions = async () => {
    try {
      const res = await API.get("/api/vendor-transactions");
      setTransactions(res.data?.transactions || []);
    } catch (err) {
      console.error("Fetch transactions error:", err.response?.data || err.message);
      setTransactions([]);
    }
  };

  const fetchVendorLedgers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (entryTypeFilter) params.append("entry_type", entryTypeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const res = await API.get(`/api/vendor-ledgers?${params.toString()}`);

      if (res.data.success) {
        setLedgers(res.data.ledgers || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor ledgers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchTransactions();
    fetchVendorLedgerOverview();
    fetchVendorAgeingReport();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorLedgers();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, vendorFilter, entryTypeFilter, statusFilter, fromDate, toDate]);

  const filteredTransactions = useMemo(() => {
    if (!formData.vendor_id) return transactions;

    return transactions.filter(
      (transaction) => String(transaction.vendor_id) === String(formData.vendor_id)
    );
  }, [transactions, formData.vendor_id]);

  const calculatedClosing = useMemo(() => {
    const opening = makeNumber(formData.opening_balance);
    const debit = makeNumber(formData.debit_amount);
    const credit = makeNumber(formData.credit_amount);

    return opening + debit - credit;
  }, [formData.opening_balance, formData.debit_amount, formData.credit_amount]);

  const stats = useMemo(() => {
    const total = ledgers.length;

    const totalDebit = ledgers.reduce(
      (sum, item) => sum + Number(item.debit_amount || 0),
      0
    );

    const totalCredit = ledgers.reduce(
      (sum, item) => sum + Number(item.credit_amount || 0),
      0
    );

    const finalBalance =
      ledgers.length > 0 ? Number(ledgers[0]?.closing_balance || 0) : 0;

    return {
      total,
      totalDebit,
      totalCredit,
      finalBalance,
    };
  }, [ledgers]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      ledger_date: todayDate(),
    });
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      ledger_date: todayDate(),
    });
    setShowForm(false);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "vendor_id") {
        next.transaction_id = "";
      }

      if (name === "transaction_id") {
        const selectedTransaction = transactions.find(
          (item) => String(item.id) === String(value)
        );

        if (selectedTransaction) {
          const txType = selectedTransaction.transaction_type === "credit" ? "credit" : "debit";
          next.entry_type = txType;
          next.debit_amount = txType === "debit" ? selectedTransaction.amount || "" : "";
          next.credit_amount = txType === "credit" ? selectedTransaction.amount || "" : "";

          next.reference_no = selectedTransaction.reference_no || "";
          next.description = selectedTransaction.description || "";
          next.ledger_date = selectedTransaction.transaction_date
            ? String(selectedTransaction.transaction_date).slice(0, 10)
            : todayDate();
        }
      }

      return next;
    });
  };

  const handleEdit = (ledger) => {
    setEditingId(ledger.id);

    setFormData({
      vendor_id: String(ledger.vendor_id || ""),
      transaction_id: String(ledger.transaction_id || ""),
      entry_type: ledger.entry_type || "debit",
      ledger_date: ledger.ledger_date ? String(ledger.ledger_date).slice(0, 10) : todayDate(),
      opening_balance: ledger.opening_balance ?? "",
      debit_amount: ledger.debit_amount ?? "",
      credit_amount: ledger.credit_amount ?? "",
      closing_balance: ledger.closing_balance ?? "",
      reference_no: ledger.reference_no || "",
      description: ledger.description || "",
      status: ledger.status || "active",
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

    if (!formData.ledger_date) {
      setError("Ledger date is required");
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
        transaction_id: formData.transaction_id,
        entry_type: formData.entry_type,
        ledger_date: formData.ledger_date,
        opening_balance: makeNumber(formData.opening_balance),
        debit_amount: makeNumber(formData.debit_amount),
        credit_amount: makeNumber(formData.credit_amount),
        closing_balance:
          formData.closing_balance === ""
            ? calculatedClosing
            : makeNumber(formData.closing_balance),
        reference_no: formData.reference_no.trim(),
        description: formData.description.trim(),
        status: formData.status,
      };

      if (editingId) {
        await API.put(`/api/vendor-ledgers/${editingId}`, payload);
        showSuccess("Vendor ledger updated successfully");
      } else {
        await API.post("/api/vendor-ledgers", payload);
        showSuccess("Vendor ledger created successfully");
      }

      closeForm();
      fetchVendorLedgers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor ledger");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ledger) => {
    const confirmDelete = window.confirm(
      `Delete ledger entry ${ledger.reference_no || `#${ledger.id}`}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/vendor-ledgers/${ledger.id}`);
      showSuccess("Vendor ledger deleted successfully");
      fetchVendorLedgers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor ledger");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setVendorFilter("");
    setEntryTypeFilter("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
  };

  const openStatement = async (vendorId) => {
    if (!vendorId) {
      setError("Please select a vendor to view statement");
      return;
    }

    try {
      setStatementOpen(true);
      setStatementLoading(true);
      setStatementVendorId(String(vendorId));
      setError("");

      const params = new URLSearchParams();

      if (statementFromDate) params.append("from_date", statementFromDate);
      if (statementToDate) params.append("to_date", statementToDate);

      const res = await API.get(
        `/api/vendor-ledgers/${vendorId}/statement?${params.toString()}`
      );

      setStatementData(res.data || null);
    } catch (err) {
      console.error("Vendor statement error:", err.response?.data || err.message);
      setStatementData(null);
      setError(err.response?.data?.message || "Failed to load vendor statement");
    } finally {
      setStatementLoading(false);
    }
  };

  const refreshStatement = () => {
    if (!statementVendorId) return;
    openStatement(statementVendorId);
  };

  const closeStatement = () => {
    setStatementOpen(false);
    setStatementData(null);
    setStatementVendorId("");
    setStatementFromDate("");
    setStatementToDate("");
  };

  const getStatementTypeLabel = (type) => {
    if (type === "purchase_order") return "Purchase Order";
    if (type === "payment") return "Payment";
    if (type === "purchase_return") return "Purchase Return";
    return type || "-";
  };

  const downloadStatementCsv = () => {
    const rows = statementData?.export_ready?.rows || [];

    if (!rows.length) {
      setError("No statement rows available to download");
      return;
    }

    const columns = statementData?.export_ready?.columns || Object.keys(rows[0]);

    const csvRows = [
      columns.join(","),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const value = row[column] ?? "";
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      statementData?.export_ready?.file_name?.replace(".xlsx", ".csv") ||
      "vendor-statement.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const handleAutoSync = async () => {
    const syncText = vendorFilter ? "selected vendor" : "all vendors";

    const confirmSync = window.confirm(
      `Sync auto vendor ledger for ${syncText}? This will create ledger entries from Purchase Orders, Payments and Purchase Returns.`
    );

    if (!confirmSync) return;

    try {
      setAutoSyncing(true);
      setError("");

      const endpoint = vendorFilter
        ? `/api/vendor-ledgers/${vendorFilter}/sync-auto`
        : "/api/vendor-ledgers/sync-auto";

      const res = await API.post(endpoint);

      const result = res.data?.result || {};

      showSuccess(
        `Auto ledger sync completed. Inserted: ${
          result.inserted || 0
        }, Skipped: ${result.skipped || 0}`
      );

      fetchVendorLedgers();
      fetchVendorLedgerOverview();
    } catch (err) {
      console.error("Auto ledger sync error:", err.response?.data || err.message);

      setError(
        err.response?.data?.message || "Failed to sync auto vendor ledgers"
      );
    } finally {
      setAutoSyncing(false);
    }
  };

  const fetchVendorLedgerOverview = async () => {
    try {
      setOverviewLoading(true);

      const res = await API.get("/api/vendor-ledgers/summary");

      setVendorOverview(res.data?.vendors || res.data?.data || []);
      setOverviewSummary(res.data?.summary || {});
    } catch (err) {
      console.error(
        "Vendor ledger overview error:",
        err.response?.data || err.message
      );

      setVendorOverview([]);
      setOverviewSummary({});
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchVendorAgeingReport = async () => {
    try {
      setAgeingLoading(true);

      const endpoint = vendorFilter
        ? `/api/vendor-ledgers/${vendorFilter}/ageing`
        : "/api/vendor-ledgers/ageing";

      const res = await API.get(endpoint, {
        params: {
          as_on_date: ageingAsOnDate || todayDate(),
        },
      });

      setAgeingData(res.data?.ageing || res.data?.data || []);
      setAgeingSummary(res.data?.summary || {});
    } catch (err) {
      console.error(
        "Vendor ageing report error:",
        err.response?.data || err.message
      );

      setAgeingData([]);
      setAgeingSummary({});
    } finally {
      setAgeingLoading(false);
    }
  };

  const handleRecalculateBalances = async () => {
    const recalcText = vendorFilter ? "selected vendor" : "all vendors";

    const confirmRecalculate = window.confirm(
      `Recalculate ledger opening and closing balances for ${recalcText}?`
    );

    if (!confirmRecalculate) return;

    try {
      setRecalculating(true);
      setError("");

      const endpoint = vendorFilter
        ? `/api/vendor-ledgers/${vendorFilter}/recalculate-balances`
        : "/api/vendor-ledgers/recalculate-balances";

      const res = await API.post(endpoint);

      showSuccess(
        res.data?.message || "Vendor ledger balances recalculated successfully"
      );

      fetchVendorLedgers();

      if (typeof fetchVendorLedgerOverview === "function") {
        fetchVendorLedgerOverview();
      }

      if (typeof fetchVendorAgeingReport === "function") {
        fetchVendorAgeingReport();
      }
    } catch (err) {
      console.error(
        "Recalculate vendor ledger error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message || "Failed to recalculate vendor ledger balances"
      );
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="vendor-ledger-page">
        <style>{css}</style>

        <div className="ledger-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <BookOpen size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Finance</div>
              <h1>Vendor Ledgers</h1>
              <p>
                Maintain vendor-wise debit, credit, opening balance, closing balance
                and reference-wise ledger history for purchase and payment tracking.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorLedgers}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Ledger
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
          <StatCard title="Total Entries" value={stats.total} icon={BookOpen} />
          <StatCard
            title="Total Debit"
            value={formatCurrency(stats.totalDebit)}
            icon={ArrowDownCircle}
          />
          <StatCard
            title="Total Credit"
            value={formatCurrency(stats.totalCredit)}
            icon={ArrowUpCircle}
          />
          <StatCard
            title="Closing Balance"
            value={formatCurrency(stats.finalBalance)}
            icon={Calculator}
          />
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <div>
              <h2>Vendor Outstanding Summary</h2>
              <p>
                Auto summary from purchase orders, vendor payments and purchase returns.
              </p>
            </div>

            <button
              type="button"
              className="secondary-overview-btn"
              onClick={fetchVendorLedgerOverview}
              disabled={overviewLoading}
            >
              {overviewLoading ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh Summary
            </button>
          </div>

          <div className="overview-summary-grid">
            <div>
              <span>Total Vendors</span>
              <strong>{overviewSummary.total_vendors || 0}</strong>
            </div>

            <div>
              <span>Purchase Value</span>
              <strong>{formatCurrency(overviewSummary.total_purchase_value || 0)}</strong>
            </div>

            <div>
              <span>Paid Value</span>
              <strong>{formatCurrency(overviewSummary.paid_value || 0)}</strong>
            </div>

            <div>
              <span>Return Value</span>
              <strong>{formatCurrency(overviewSummary.return_value || 0)}</strong>
            </div>

            <div>
              <span>Outstanding</span>
              <strong className="danger-text">
                {formatCurrency(overviewSummary.outstanding_value || 0)}
              </strong>
            </div>
          </div>

          {overviewLoading ? (
            <div className="empty-box small-overview-empty">
              <Loader2 size={26} className="spin" />
              <h3>Loading vendor summary...</h3>
            </div>
          ) : vendorOverview.length === 0 ? (
            <div className="empty-box small-overview-empty">
              <BookOpen size={28} />
              <h3>No vendor summary found</h3>
              <p>Sync auto ledger or create purchase orders and payments.</p>
            </div>
          ) : (
            <div className="overview-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Purchase Orders</th>
                    <th>Purchase Value</th>
                    <th>Paid Value</th>
                    <th>Return Value</th>
                    <th>Outstanding</th>
                    <th className="right">Statement</th>
                  </tr>
                </thead>

                <tbody>
                  {vendorOverview.map((vendor) => (
                    <tr key={vendor.vendor_id}>
                      <td>
                        <div className="main-name">
                          <Building2 size={15} />
                          {vendor.vendor_name || "-"}
                        </div>
                      </td>

                      <td>{vendor.total_purchase_orders || 0}</td>

                      <td>{formatCurrency(vendor.total_purchase_value || 0)}</td>

                      <td>
                        <div className="amount-positive">
                          {formatCurrency(vendor.paid_value || 0)}
                        </div>
                      </td>

                      <td>{formatCurrency(vendor.return_value || 0)}</td>

                      <td>
                        <div className="amount-danger">
                          {formatCurrency(vendor.outstanding_value || 0)}
                        </div>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="statement-icon-btn"
                            onClick={() => openStatement(vendor.vendor_id)}
                            title="View Vendor Statement"
                          >
                            <Eye size={16} />
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

        <div className="ageing-card">
          <div className="ageing-header">
            <div>
              <h2>Vendor Payment Ageing Report</h2>
              <p>
                Outstanding purchase orders grouped by due ageing buckets based on
                expected delivery date or PO date.
              </p>
            </div>

            <div className="ageing-actions">
              <input
                type="date"
                value={ageingAsOnDate}
                onChange={(event) => setAgeingAsOnDate(event.target.value)}
              />

              <button
                type="button"
                className="secondary-overview-btn"
                onClick={fetchVendorAgeingReport}
                disabled={ageingLoading}
              >
                {ageingLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Refresh Ageing
              </button>
            </div>
          </div>

          <div className="ageing-bucket-grid">
            <AgeingBucket
              title="Not Due"
              count={ageingSummary.buckets?.not_due?.count || 0}
              amount={ageingSummary.buckets?.not_due?.amount || 0}
              icon={CheckCircle2}
            />

            <AgeingBucket
              title="0 - 30 Days"
              count={ageingSummary.buckets?.["0_30"]?.count || 0}
              amount={ageingSummary.buckets?.["0_30"]?.amount || 0}
              icon={Clock3}
            />

            <AgeingBucket
              title="31 - 60 Days"
              count={ageingSummary.buckets?.["31_60"]?.count || 0}
              amount={ageingSummary.buckets?.["31_60"]?.amount || 0}
              icon={Clock3}
            />

            <AgeingBucket
              title="61 - 90 Days"
              count={ageingSummary.buckets?.["61_90"]?.count || 0}
              amount={ageingSummary.buckets?.["61_90"]?.amount || 0}
              icon={AlertTriangle}
            />

            <AgeingBucket
              title="90+ Days"
              count={ageingSummary.buckets?.["90_plus"]?.count || 0}
              amount={ageingSummary.buckets?.["90_plus"]?.amount || 0}
              icon={AlertTriangle}
              danger
            />
          </div>

          <div className="ageing-total-box">
            <div>
              <span>Total Outstanding</span>
              <strong>{formatCurrency(ageingSummary.total_outstanding || 0)}</strong>
            </div>

            <div>
              <span>Total Pending POs</span>
              <strong>{ageingSummary.total_purchase_orders || 0}</strong>
            </div>
          </div>

          {ageingLoading ? (
            <div className="empty-box small-overview-empty">
              <Loader2 size={26} className="spin" />
              <h3>Loading ageing report...</h3>
            </div>
          ) : ageingData.length === 0 ? (
            <div className="empty-box small-overview-empty">
              <Clock3 size={28} />
              <h3>No ageing outstanding found</h3>
              <p>No pending vendor payable found for selected date.</p>
            </div>
          ) : (
            <div className="ageing-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>PO Number</th>
                    <th>PO Date</th>
                    <th>Expected Date</th>
                    <th>Total Amount</th>
                    <th>Paid</th>
                    <th>Return</th>
                    <th>Outstanding</th>
                    <th>Ageing Days</th>
                    <th>Bucket</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {ageingData.map((row) => (
                    <tr key={row.purchase_order_id}>
                      <td>
                        <div className="main-name">
                          <Building2 size={15} />
                          {row.vendor_name || "-"}
                        </div>
                      </td>

                      <td>{row.po_number || "-"}</td>
                      <td>{formatDate(row.po_date)}</td>
                      <td>{formatDate(row.expected_delivery_date)}</td>
                      <td>{formatCurrency(row.total_amount || 0)}</td>

                      <td>
                        <div className="amount-positive">
                          {formatCurrency(row.paid_amount || 0)}
                        </div>
                      </td>

                      <td>{formatCurrency(row.return_value || 0)}</td>

                      <td>
                        <div className="amount-danger">
                          {formatCurrency(row.outstanding_amount || 0)}
                        </div>
                      </td>

                      <td>{row.ageing_days || 0}</td>

                      <td>
                        <span className={`ageing-badge ${row.ageing_bucket}`}>
                          {getAgeingBucketLabel(row.ageing_bucket)}
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge ${row.status || "active"}`}>
                          {row.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Vendor Ledger" : "Create Vendor Ledger"}</h2>
                <p>Select vendor and enter debit / credit ledger information.</p>
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
                  <label>Linked Transaction</label>
                  <select
                    name="transaction_id"
                    value={formData.transaction_id}
                    onChange={handleChange}
                  >
                    <option value="">No Transaction / Manual Entry</option>
                    {filteredTransactions.map((transaction) => (
                      <option key={transaction.id} value={transaction.id}>
                        #{transaction.id} · {transaction.vendor_name || "Vendor"} ·{" "}
                        {formatCurrency(transaction.amount)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Entry Type</label>
                  <select
                    name="entry_type"
                    value={formData.entry_type}
                    onChange={handleChange}
                  >
                    {entryTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ledger Date</label>
                  <input
                    type="date"
                    name="ledger_date"
                    value={formData.ledger_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Opening Balance</label>
                  <input
                    type="number"
                    name="opening_balance"
                    value={formData.opening_balance}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Debit Amount</label>
                  <input
                    type="number"
                    name="debit_amount"
                    value={formData.debit_amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Credit Amount</label>
                  <input
                    type="number"
                    name="credit_amount"
                    value={formData.credit_amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Closing Balance</label>
                  <input
                    type="number"
                    name="closing_balance"
                    value={formData.closing_balance}
                    onChange={handleChange}
                    placeholder={`Auto: ${calculatedClosing.toFixed(2)}`}
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Reference No.</label>
                  <input
                    type="text"
                    name="reference_no"
                    value={formData.reference_no}
                    onChange={handleChange}
                    placeholder="Bill / Invoice / Payment Ref"
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
                <div className="auto-balance">
                  Auto Closing: <strong>{formatCurrency(calculatedClosing)}</strong>
                </div>

                <div className="form-action-buttons">
                  <button type="button" className="cancel-btn" onClick={closeForm}>
                    Cancel
                  </button>

                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                    {saving ? "Saving..." : editingId ? "Update Ledger" : "Create Ledger"}
                  </button>
                </div>
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
              placeholder="Search vendor, reference, description..."
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
            value={entryTypeFilter}
            onChange={(event) => setEntryTypeFilter(event.target.value)}
          >
            <option value="">All Types</option>
            {entryTypes.map((type) => (
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

          <button
            type="button"
            className="sync-btn"
            onClick={handleAutoSync}
            disabled={autoSyncing}
          >
            {autoSyncing ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {autoSyncing
              ? "Syncing..."
              : vendorFilter
              ? "Sync Vendor Ledger"
              : "Sync Auto Ledger"}
          </button>

          <button
            type="button"
            className="recalculate-btn"
            onClick={handleRecalculateBalances}
            disabled={recalculating}
          >
            {recalculating ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Calculator size={16} />
            )}
            {recalculating ? "Recalculating..." : "Recalculate Balance"}
          </button>

          <button
            type="button"
            className="statement-btn"
            onClick={() => openStatement(vendorFilter)}
            disabled={!vendorFilter}
          >
            <FileSpreadsheet size={16} />
            View Statement
          </button>

          <div className="api-chip">
            API Connected · <strong>{ledgers.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Vendor Ledger List</h2>
            <p>Review vendor-wise opening, debit, credit and closing balances.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor ledgers...</h3>
              <p>Please wait while ledger records are loading.</p>
            </div>
          ) : ledgers.length === 0 ? (
            <div className="empty-box">
              <BookOpen size={34} />
              <h3>No vendor ledgers found</h3>
              <p>Create your first vendor ledger using the New Ledger button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Entry Type</th>
                    <th>Date</th>
                    <th>Opening</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Closing</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {ledgers.map((ledger) => (
                    <tr key={ledger.id}>
                      <td>
                        <div className="main-name">
                          <Building2 size={15} />
                          {ledger.vendor_name || "-"}
                        </div>
                        <div className="small-text">{ledger.vendor_code || "-"}</div>
                      </td>

                      <td>
                        <span className={`type-badge ${ledger.entry_type || "purchase"}`}>
                          {getEntryLabel(ledger.entry_type)}
                        </span>
                      </td>

                      <td>{formatDate(ledger.ledger_date || ledger.created_at)}</td>

                      <td>{formatCurrency(ledger.opening_balance)}</td>

                      <td>
                        <div className="amount-danger">
                          <IndianRupee size={13} />
                          {formatCurrency(ledger.debit_amount)}
                        </div>
                      </td>

                      <td>
                        <div className="amount-positive">
                          <IndianRupee size={13} />
                          {formatCurrency(ledger.credit_amount)}
                        </div>
                      </td>

                      <td>
                        <div className="amount-neutral">
                          {formatCurrency(ledger.closing_balance)}
                        </div>
                      </td>

                      <td>{ledger.reference_no || "-"}</td>

                      <td>
                        <span className={`status-badge ${ledger.status || "active"}`}>
                          {ledger.status || "active"}
                        </span>
                      </td>

                      <td>
                        <div className="description-text">
                          {ledger.description || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="statement-icon-btn"
                            onClick={() => openStatement(ledger.vendor_id)}
                            title="Vendor Statement"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(ledger)}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(ledger)}
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

      {statementOpen && (
        <div className="statement-overlay">
          <div className="statement-modal">
            <div className="statement-header">
              <div>
                <div className="eyebrow dark">Vendor Statement</div>
                <h2>{statementData?.vendor?.business_name || "Vendor Statement"}</h2>
                <p>
                  Debit, credit, purchase orders, payments, returns and running
                  outstanding balance.
                </p>
              </div>

              <button type="button" className="close-btn" onClick={closeStatement}>
                <X size={18} />
              </button>
            </div>

            <div className="statement-filters">
              <div className="statement-date">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={statementFromDate}
                  onChange={(event) => setStatementFromDate(event.target.value)}
                />
              </div>

              <div className="statement-date">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={statementToDate}
                  onChange={(event) => setStatementToDate(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="secondary-light-btn"
                onClick={refreshStatement}
                disabled={statementLoading}
              >
                {statementLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Apply
              </button>

              <button
                type="button"
                className="download-btn"
                onClick={downloadStatementCsv}
                disabled={!statementData?.ledger?.length}
              >
                <Download size={16} />
                Download CSV
              </button>
            </div>

            {statementLoading ? (
              <div className="empty-box statement-empty">
                <Loader2 size={30} className="spin" />
                <h3>Loading vendor statement...</h3>
                <p>Please wait while statement is loading.</p>
              </div>
            ) : (
              <>
                <div className="statement-summary-grid">
                  <StatCard
                    title="Opening Balance"
                    value={formatCurrency(statementData?.summary?.opening_balance || 0)}
                    icon={Calculator}
                  />

                  <StatCard
                    title="Period Debit"
                    value={formatCurrency(statementData?.summary?.period_debit || 0)}
                    icon={ArrowDownCircle}
                  />

                  <StatCard
                    title="Period Credit"
                    value={formatCurrency(statementData?.summary?.period_credit || 0)}
                    icon={ArrowUpCircle}
                  />

                  <StatCard
                    title="Outstanding"
                    value={formatCurrency(
                      statementData?.summary?.outstanding_balance || 0
                    )}
                    icon={IndianRupee}
                  />
                </div>

                <div className="statement-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Reference</th>
                        <th>Description</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Qty</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {!statementData?.ledger?.length ? (
                        <tr>
                          <td colSpan={9} className="statement-no-data">
                            No statement records found
                          </td>
                        </tr>
                      ) : (
                        statementData.ledger.map((row, index) => (
                          <tr key={`${row.transaction_type}-${row.id}-${index}`}>
                            <td>{formatDate(row.transaction_date)}</td>

                            <td>
                              <span className={`type-badge ${row.transaction_type}`}>
                                {getStatementTypeLabel(row.transaction_type)}
                              </span>
                            </td>

                            <td>{row.reference_number || "-"}</td>

                            <td>
                              <div className="description-text">
                                {row.description || "-"}
                              </div>
                            </td>

                            <td>
                              <div className="amount-danger">
                                {formatCurrency(row.debit)}
                              </div>
                            </td>

                            <td>
                              <div className="amount-positive">
                                {formatCurrency(row.credit)}
                              </div>
                            </td>

                            <td>{row.quantity || 0}</td>

                            <td>
                              <div className="amount-neutral">
                                {formatCurrency(row.balance)}
                              </div>
                            </td>

                            <td>
                              <span className={`status-badge ${row.status || "active"}`}>
                                {row.status || "-"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function getAgeingBucketLabel(bucket) {
  if (bucket === "not_due") return "Not Due";
  if (bucket === "0_30") return "0 - 30";
  if (bucket === "31_60") return "31 - 60";
  if (bucket === "61_90") return "61 - 90";
  if (bucket === "90_plus") return "90+";
  return bucket || "-";
}

function AgeingBucket({ title, count, amount, icon: Icon, danger = false }) {
  return (
    <div className={`ageing-bucket ${danger ? "danger" : ""}`}>
      <div>
        <span>{title}</span>
        <h3>{formatCurrency(amount)}</h3>
        <p>{count} purchase orders</p>
      </div>

      <div className="ageing-bucket-icon">
        <Icon size={19} />
      </div>
    </div>
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
  .vendor-ledger-page {
    color: #151515;
  }

  .ledger-hero {
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

  .ledger-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .ledger-hero p {
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
    font-size: 21px;
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
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .form-action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .auto-balance {
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
    border-radius: 999px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 950;
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
    min-width: 1450px;
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

  .amount-neutral {
    color: #111827;
    font-weight: 950;
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

  .type-badge.opening,
  .type-badge.closing {
    background: #eff6ff;
    color: #2563eb;
  }

  .type-badge.purchase,
  .type-badge.debit {
    background: #fff1f2;
    color: #e11d48;
  }

  .type-badge.payment,
  .type-badge.credit {
    background: #ecfdf5;
    color: #047857;
  }

  .type-badge.adjustment {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.pending {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.cancelled,
  .status-badge.inactive {
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
    .ledger-hero,
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
    .clear-btn,
    .form-action-buttons,
    .save-btn,
    .cancel-btn {
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

    .form-actions {
      align-items: stretch;
    }

    .form-action-buttons {
      flex-direction: column;
    }
  }

  .statement-btn {
    height: 46px;
    border: none;
    border-radius: 15px;
    background: #111;
    color: #facc15;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
  }

  .statement-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .statement-icon-btn {
    width: 37px;
    height: 37px;
    border-radius: 13px;
    border: none;
    background: #111;
    color: #facc15;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .statement-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.62);
    z-index: 9999;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .statement-modal {
    width: min(1240px, 96vw);
    max-height: 92vh;
    overflow: auto;
    background: #fff;
    border-radius: 28px;
    box-shadow: 0 30px 90px rgba(0,0,0,0.3);
    padding: 24px;
  }

  .statement-header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .eyebrow.dark {
    color: #b45309;
  }

  .statement-header h2 {
    margin: 0;
    color: #111;
    font-size: 25px;
    font-weight: 950;
  }

  .statement-header p {
    margin: 7px 0 0;
    color: #71717a;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.6;
  }

  .statement-filters {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 20px;
    padding: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 18px;
  }

  .statement-date {
    height: 44px;
    border: 1px solid #e8e8e8;
    background: #fff;
    border-radius: 15px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #777;
  }

  .statement-date input {
    border: none;
    outline: none;
    font-weight: 850;
    font-family: inherit;
    color: #111;
  }

  .secondary-light-btn,
  .download-btn {
    height: 44px;
    border: none;
    border-radius: 15px;
    padding: 0 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
  }

  .secondary-light-btn {
    background: #111;
    color: #facc15;
  }

  .download-btn {
    background: #facc15;
    color: #111;
  }

  .download-btn:disabled,
  .secondary-light-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .statement-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .statement-table-wrap {
    overflow-x: auto;
    border: 1px solid #eeeeee;
    border-radius: 20px;
  }

  .statement-table-wrap table {
    min-width: 1150px;
  }

  .statement-no-data {
    text-align: center;
    color: #888;
    font-weight: 900;
    padding: 34px;
  }

  .statement-empty {
    margin-top: 12px;
  }

  .type-badge.purchase_order {
    background: #fff1f2;
    color: #e11d48;
  }

  .type-badge.purchase_return {
    background: #fffbeb;
    color: #b45309;
  }

  @media (max-width: 900px) {
    .statement-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .statement-modal {
      padding: 18px;
    }
  }

  @media (max-width: 640px) {
    .statement-summary-grid {
      grid-template-columns: 1fr;
    }

    .statement-overlay {
      padding: 12px;
    }

    .statement-filters,
    .statement-date,
    .secondary-light-btn,
    .download-btn {
      width: 100%;
    }
  }

  .sync-btn {
    height: 46px;
    border: none;
    border-radius: 15px;
    background: #111;
    color: #facc15;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    box-shadow: 0 12px 26px rgba(0,0,0,0.12);
  }

  .sync-btn:hover {
    transform: translateY(-1px);
  }

  .sync-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  .overview-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
    padding: 22px;
    margin-bottom: 22px;
    overflow: hidden;
  }

  .overview-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .overview-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .overview-header p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .secondary-overview-btn {
    height: 42px;
    border: none;
    border-radius: 15px;
    background: #111;
    color: #facc15;
    padding: 0 15px;
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

  .secondary-overview-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .overview-summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .overview-summary-grid div {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 18px;
    padding: 14px;
  }

  .overview-summary-grid span {
    display: block;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .overview-summary-grid strong {
    display: block;
    color: #111;
    font-size: 17px;
    font-weight: 950;
  }

  .danger-text {
    color: #e11d48 !important;
  }

  .overview-table-wrap {
    overflow-x: auto;
    border: 1px solid #eeeeee;
    border-radius: 20px;
  }

  .overview-table-wrap table {
    min-width: 1050px;
  }

  .small-overview-empty {
    min-height: 130px;
  }

  @media (max-width: 1100px) {
    .overview-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .overview-header {
      flex-direction: column;
    }

    .secondary-overview-btn {
      width: 100%;
    }

    .overview-summary-grid {
      grid-template-columns: 1fr;
    }
  }

  .ageing-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
    padding: 22px;
    margin-bottom: 22px;
    overflow: hidden;
  }

  .ageing-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .ageing-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .ageing-header p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .ageing-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .ageing-actions input {
    height: 42px;
    border: 1.5px solid #e8e8e8;
    border-radius: 15px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 850;
    outline: none;
    font-family: inherit;
    background: #fbfbfb;
  }

  .ageing-bucket-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .ageing-bucket {
    background: #fafafa;
    border: 1px solid #eeeeee;
    border-radius: 19px;
    padding: 15px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .ageing-bucket.danger {
    background: #fff1f2;
    border-color: #fecdd3;
  }

  .ageing-bucket span {
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ageing-bucket h3 {
    margin: 7px 0 0;
    color: #111;
    font-size: 17px;
    font-weight: 950;
  }

  .ageing-bucket p {
    margin: 6px 0 0;
    color: #777;
    font-size: 12px;
    font-weight: 850;
  }

  .ageing-bucket-icon {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: #111;
    color: #facc15;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ageing-total-box {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .ageing-total-box div {
    background: #111;
    color: #fff;
    border-radius: 18px;
    padding: 16px;
  }

  .ageing-total-box span {
    display: block;
    color: rgba(255,255,255,0.62);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .ageing-total-box strong {
    color: #facc15;
    font-size: 20px;
    font-weight: 950;
  }

  .ageing-table-wrap {
    overflow-x: auto;
    border: 1px solid #eeeeee;
    border-radius: 20px;
  }

  .ageing-table-wrap table {
    min-width: 1350px;
  }

  .ageing-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    background: #eff6ff;
    color: #2563eb;
  }

  .ageing-badge.not_due {
    background: #ecfdf5;
    color: #047857;
  }

  .ageing-badge[class~="0_30"] {
    background: #eff6ff;
    color: #2563eb;
  }

  .ageing-badge[class~="31_60"] {
    background: #fffbeb;
    color: #b45309;
  }

  .ageing-badge[class~="61_90"],
  .ageing-badge[class~="90_plus"] {
    background: #fff1f2;
    color: #e11d48;
  }

  @media (max-width: 1200px) {
    .ageing-bucket-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .ageing-header {
      flex-direction: column;
    }

    .ageing-actions,
    .ageing-actions input,
    .ageing-actions button {
      width: 100%;
    }

    .ageing-bucket-grid,
    .ageing-total-box {
      grid-template-columns: 1fr;
    }
  }

  .recalculate-btn {
    height: 46px;
    border: none;
    border-radius: 15px;
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
    padding: 0 16px;
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

  .recalculate-btn:hover {
    transform: translateY(-1px);
  }

  .recalculate-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;