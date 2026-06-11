import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  BarChart3,
  BookOpen,
  Building2,
  CreditCard,
  IndianRupee,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const safeStr = (value, fallback = "-") =>
  value !== null && value !== undefined && value !== "" ? String(value) : fallback;

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "customers", label: "Customers", icon: Users },
  { key: "wallets", label: "Wallets", icon: Wallet },
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { key: "ledgers", label: "Ledgers", icon: BookOpen },
  { key: "credit-limits", label: "Credit Limits", icon: CreditCard },
  { key: "pricing", label: "Pricing", icon: IndianRupee },
  { key: "performance", label: "Performance", icon: TrendingUp },
];

export default function CustomerReports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({});
  const [loadingTab, setLoadingTab] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setError("");
      const res = await API.get("/api/customer-reports/summary");
      if (res.data.success) setSummary(res.data.summary);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchTab = useCallback(async (tab) => {
    if (tab === "overview") return;
    if (data[tab]) return;
    try {
      setLoadingTab(tab);
      setError("");
      const res = await API.get(`/api/customer-reports/${tab}`);
      if (res.data.success) {
        const key = Object.keys(res.data).find((k) => Array.isArray(res.data[k]));
        setData((prev) => ({ ...prev, [tab]: key ? res.data[key] : [] }));
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to fetch ${tab} data`);
    } finally {
      setLoadingTab("");
    }
  }, [data]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTab(activeTab);
    setSearch("");
  }, [activeTab]);

  const handleRetry = () => {
    if (activeTab === "overview") {
      fetchSummary();
    } else {
      setData((prev) => { const n = { ...prev }; delete n[activeTab]; return n; });
      fetchTab(activeTab);
    }
  };

  const tableRows = useMemo(() => {
    const rows = data[activeTab] || [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [data, activeTab, search]);

  const s = summary || {};
  const c = s.customers || {};
  const w = s.wallets || {};
  const t = s.transactions || {};
  const cl = s.credit_limits || {};

  const summaryCards = [
    {
      label: "Total Customers",
      value: formatNumber(c.total),
      hint: `${formatNumber(c.active)} active`,
      icon: Users,
      color: "#FFD21E",
    },
    {
      label: "Active Customers",
      value: formatNumber(c.active),
      hint: `${formatNumber(c.inactive)} inactive`,
      icon: BadgeCheck,
      color: "#16A34A",
    },
    {
      label: "Total Wallet Balance",
      value: formatCurrency(w.total_wallet_balance),
      hint: `${formatCurrency(w.total_credit_balance)} credit balance`,
      icon: Wallet,
      color: "#2563EB",
    },
    {
      label: "Total Credit Used",
      value: formatCurrency(cl.total_used_credit),
      hint: `of ${formatCurrency(cl.total_credit_limit)} limit`,
      icon: CreditCard,
      color: "#EA580C",
    },
    {
      label: "Total Transactions",
      value: formatNumber(t.total),
      hint: `${formatCurrency(t.total_credited)} credited`,
      icon: ArrowLeftRight,
      color: "#7C3AED",
    },
    {
      label: "Total Debited",
      value: formatCurrency(t.total_debited),
      hint: "All time debit total",
      icon: TrendingUp,
      color: "#DB2777",
    },
    {
      label: "Available Credit",
      value: formatCurrency(cl.total_available),
      hint: "Remaining credit limits",
      icon: ShieldCheck,
      color: "#0891B2",
    },
    {
      label: "Total Wallets",
      value: formatNumber(w.total),
      hint: "Customer wallet accounts",
      icon: Building2,
      color: "#D9A900",
    },
  ];

  const isTabLoading = loadingTab === activeTab;
  const tabRows = data[activeTab];

  const getStatusKey = (status) => {
    const v = String(status || "").toLowerCase().trim();
    if (v === "inactive") return "inactive";
    if (v === "blocked") return "blocked";
    if (v === "pending") return "pending";
    return "active";
  };

  return (
    <AdminLayout>
      <style>{css}</style>

      <div className="cr-page">
        <section className="cr-hero">
          <div className="cr-hero-grid" />
          <div className="cr-hero-glow cr-hero-glow-1" />
          <div className="cr-hero-glow cr-hero-glow-2" />

          <div className="cr-hero-left">
            <div className="cr-hero-icon">
              <BarChart3 size={26} />
            </div>
            <div className="cr-hero-copy">
              <div className="cr-kicker">
                <span />
                Customer Intelligence
              </div>
              <h1>Customer Reports</h1>
              <p>
                Full-spectrum view of customer data — wallets, transactions,
                ledgers, credit limits, pricing and performance analytics.
              </p>
            </div>
          </div>

          <div className="cr-hero-actions">
            <button
              className="cr-btn-secondary"
              type="button"
              onClick={handleRetry}
              disabled={summaryLoading || !!loadingTab}
            >
              <RefreshCw
                size={16}
                className={summaryLoading || loadingTab ? "spin" : ""}
              />
              Refresh
            </button>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="cr-stats-grid">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div className="cr-stat-card" key={card.label}>
                <div className="cr-stat-top">
                  <div
                    className="cr-stat-icon"
                    style={{ background: `${card.color}18`, color: card.color }}
                  >
                    <Icon size={19} />
                  </div>
                  <div className="cr-stat-bar" style={{ background: card.color }} />
                </div>
                <h3>{summaryLoading ? "—" : card.value}</h3>
                <p>{card.label}</p>
                <span>{card.hint}</span>
              </div>
            );
          })}
        </section>

        {/* Error */}
        {error && (
          <div className="cr-error">
            <X size={15} />
            <span>{error}</span>
            <button type="button" onClick={handleRetry}>Retry</button>
          </div>
        )}

        {/* Tabs */}
        <section className="cr-tabs-wrap">
          <div className="cr-tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`cr-tab ${activeTab === tab.key ? "cr-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tab Content */}
        <section className="cr-content-card">
          {activeTab === "overview" ? (
            <OverviewSection summary={s} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          ) : (
            <>
              <div className="cr-toolbar">
                <div className="cr-search-wrap">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${activeTab}…`}
                  />
                  {search && (
                    <button type="button" className="cr-clear-search" onClick={() => setSearch("")}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="cr-count">
                  Showing <strong>{tableRows.length}</strong>
                  {tabRows && tabRows.length !== tableRows.length && (
                    <> of <strong>{tabRows.length}</strong></>
                  )} records
                </div>
              </div>

              {isTabLoading ? (
                <div className="cr-empty">
                  <RefreshCw size={22} className="spin" />
                  <p>Loading {activeTab} data…</p>
                </div>
              ) : !tabRows ? (
                <div className="cr-empty">
                  <Package size={22} />
                  <p>No data loaded yet.</p>
                </div>
              ) : tableRows.length === 0 ? (
                <div className="cr-empty">
                  <Package size={22} />
                  <p>No records found{search ? " matching your search" : ""}.</p>
                </div>
              ) : (
                <div className="cr-table-wrap">
                  {activeTab === "customers" && (
                    <CustomersTable rows={tableRows} getStatusKey={getStatusKey} />
                  )}
                  {activeTab === "wallets" && (
                    <WalletsTable rows={tableRows} formatCurrency={formatCurrency} getStatusKey={getStatusKey} />
                  )}
                  {activeTab === "transactions" && (
                    <TransactionsTable rows={tableRows} formatCurrency={formatCurrency} formatDate={formatDate} />
                  )}
                  {activeTab === "ledgers" && (
                    <LedgersTable rows={tableRows} formatCurrency={formatCurrency} formatDate={formatDate} />
                  )}
                  {activeTab === "credit-limits" && (
                    <CreditLimitsTable rows={tableRows} formatCurrency={formatCurrency} formatDate={formatDate} getStatusKey={getStatusKey} />
                  )}
                  {activeTab === "pricing" && (
                    <PricingTable rows={tableRows} formatCurrency={formatCurrency} formatDate={formatDate} getStatusKey={getStatusKey} />
                  )}
                  {activeTab === "performance" && (
                    <PerformanceTable rows={tableRows} formatCurrency={formatCurrency} formatNumber={formatNumber} />
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function OverviewSection({ summary, formatCurrency, formatNumber }) {
  const c = summary.customers || {};
  const w = summary.wallets || {};
  const t = summary.transactions || {};
  const cl = summary.credit_limits || {};

  const groups = [
    {
      title: "Customers",
      icon: Users,
      color: "#FFD21E",
      items: [
        { label: "Total", value: formatNumber(c.total) },
        { label: "Active", value: formatNumber(c.active) },
        { label: "Inactive", value: formatNumber(c.inactive) },
        { label: "Blocked", value: formatNumber(c.blocked) },
      ],
    },
    {
      title: "Wallets",
      icon: Wallet,
      color: "#16A34A",
      items: [
        { label: "Total Wallets", value: formatNumber(w.total) },
        { label: "Wallet Balance", value: formatCurrency(w.total_wallet_balance) },
        { label: "Credit Balance", value: formatCurrency(w.total_credit_balance) },
      ],
    },
    {
      title: "Transactions",
      icon: ArrowLeftRight,
      color: "#7C3AED",
      items: [
        { label: "Total", value: formatNumber(t.total) },
        { label: "Total Credited", value: formatCurrency(t.total_credited) },
        { label: "Total Debited", value: formatCurrency(t.total_debited) },
      ],
    },
    {
      title: "Credit Limits",
      icon: CreditCard,
      color: "#EA580C",
      items: [
        { label: "Total Limit", value: formatCurrency(cl.total_credit_limit) },
        { label: "Used Credit", value: formatCurrency(cl.total_used_credit) },
        { label: "Available", value: formatCurrency(cl.total_available) },
      ],
    },
  ];

  return (
    <div className="cr-overview-grid">
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <div className="cr-overview-card" key={group.title}>
            <div className="cr-ov-header">
              <div className="cr-ov-icon" style={{ background: `${group.color}18`, color: group.color }}>
                <Icon size={18} />
              </div>
              <h3>{group.title}</h3>
            </div>
            <ul className="cr-ov-list">
              {group.items.map((item) => (
                <li key={item.label}>
                  <span className="cr-ov-label">{item.label}</span>
                  <span className="cr-ov-value">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const v = String(status || "").toLowerCase().trim();
  return (
    <span className={`cr-badge cr-badge-${v === "inactive" ? "inactive" : v === "blocked" ? "blocked" : v === "pending" ? "pending" : "active"}`}>
      {v === "active" || v === "inactive" || v === "blocked" || v === "pending" ? (
        v === "active" ? <BadgeCheck size={11} /> : <Ban size={11} />
      ) : null}
      {v.charAt(0).toUpperCase() + v.slice(1) || "Active"}
    </span>
  );
}

function TypeBadge({ type, colorMap }) {
  const v = String(type || "").toLowerCase().trim();
  const color = colorMap?.[v] || "#6B7280";
  return (
    <span className="cr-type-badge" style={{ background: `${color}18`, color }}>
      {v.charAt(0).toUpperCase() + v.slice(1)}
    </span>
  );
}

function CustomersTable({ rows, getStatusKey }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Customer Code</th>
          <th>Business Name</th>
          <th>Contact Person</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Group</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td><span className="cr-code">{safeStr(row.customer_code)}</span></td>
            <td><strong>{safeStr(row.business_name)}</strong></td>
            <td>{safeStr(row.contact_person)}</td>
            <td>{safeStr(row.phone)}</td>
            <td>{safeStr(row.email)}</td>
            <td>{safeStr(row.group_name)}</td>
            <td><StatusBadge status={row.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WalletsTable({ rows, formatCurrency, getStatusKey }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Code</th>
          <th>Balance</th>
          <th>Credit Balance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td><strong>{safeStr(row.customer_name || row.business_name)}</strong></td>
            <td><span className="cr-code">{safeStr(row.customer_code)}</span></td>
            <td><span className="cr-amount-green">{formatCurrency(row.balance)}</span></td>
            <td><span className="cr-amount-blue">{formatCurrency(row.credit_balance)}</span></td>
            <td><StatusBadge status={row.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransactionsTable({ rows, formatCurrency, formatDate }) {
  const colorMap = { credit: "#16A34A", debit: "#EA580C" };
  return (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Reference Type</th>
          <th>Description</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <strong>{safeStr(row.customer_name || row.business_name)}</strong>
              <div className="cr-sub">{safeStr(row.customer_code)}</div>
            </td>
            <td><TypeBadge type={row.transaction_type} colorMap={colorMap} /></td>
            <td>
              <span className={row.transaction_type === "credit" ? "cr-amount-green" : "cr-amount-red"}>
                {formatCurrency(row.amount)}
              </span>
            </td>
            <td>{safeStr(row.reference_type)}</td>
            <td>{safeStr(row.description)}</td>
            <td>{formatDate(row.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LedgersTable({ rows, formatCurrency, formatDate }) {
  const colorMap = { debit: "#EA580C", credit: "#16A34A" };
  return (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Entry Date</th>
          <th>Entry Type</th>
          <th>Amount</th>
          <th>Balance After</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <strong>{safeStr(row.customer_name || row.business_name)}</strong>
              <div className="cr-sub">{safeStr(row.customer_code)}</div>
            </td>
            <td>{formatDate(row.entry_date)}</td>
            <td><TypeBadge type={row.entry_type} colorMap={colorMap} /></td>
            <td>
              <span className={row.entry_type === "credit" ? "cr-amount-green" : "cr-amount-red"}>
                {formatCurrency(row.amount)}
              </span>
            </td>
            <td><span className="cr-amount-blue">{formatCurrency(row.balance_after)}</span></td>
            <td>{safeStr(row.description)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CreditLimitsTable({ rows, formatCurrency, formatDate, getStatusKey }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Limit Amount</th>
          <th>Used Amount</th>
          <th>Available</th>
          <th>Effective From</th>
          <th>Effective To</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const available = Number(row.available_amount || (Number(row.limit_amount || 0) - Number(row.used_amount || 0)));
          return (
            <tr key={row.id}>
              <td>
                <strong>{safeStr(row.customer_name || row.business_name)}</strong>
                <div className="cr-sub">{safeStr(row.customer_code)}</div>
              </td>
              <td><span className="cr-amount-green">{formatCurrency(row.limit_amount)}</span></td>
              <td><span className="cr-amount-red">{formatCurrency(row.used_amount)}</span></td>
              <td>
                <span className={available >= 0 ? "cr-amount-blue" : "cr-amount-red"}>
                  {formatCurrency(available)}
                </span>
              </td>
              <td>{formatDate(row.effective_from)}</td>
              <td>{formatDate(row.effective_to)}</td>
              <td><StatusBadge status={row.status} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PricingTable({ rows, formatCurrency, formatDate, getStatusKey }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Product</th>
          <th>SKU</th>
          <th>Price</th>
          <th>Min Qty</th>
          <th>Effective From</th>
          <th>Effective To</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <strong>{safeStr(row.customer_name || row.business_name)}</strong>
              <div className="cr-sub">{safeStr(row.customer_code)}</div>
            </td>
            <td>{safeStr(row.product_name)}</td>
            <td><span className="cr-code">{safeStr(row.sku)}</span></td>
            <td><span className="cr-amount-green">{formatCurrency(row.price)}</span></td>
            <td>{safeStr(row.min_order_qty)}</td>
            <td>{formatDate(row.effective_from)}</td>
            <td>{formatDate(row.effective_to)}</td>
            <td><StatusBadge status={row.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PerformanceTable({ rows, formatCurrency, formatNumber }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Status</th>
          <th>Total Txns</th>
          <th>Total Credited</th>
          <th>Total Debited</th>
          <th>Wallet Balance</th>
          <th>Credit Used</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <strong>{safeStr(row.business_name || row.customer_name)}</strong>
              <div className="cr-sub">{safeStr(row.customer_code)}</div>
            </td>
            <td><StatusBadge status={row.status} /></td>
            <td>{formatNumber(row.transaction_count)}</td>
            <td><span className="cr-amount-green">{formatCurrency(row.total_credited)}</span></td>
            <td><span className="cr-amount-red">{formatCurrency(row.total_debited)}</span></td>
            <td><span className="cr-amount-blue">{formatCurrency(row.wallet_balance)}</span></td>
            <td>{formatCurrency(row.credit_used)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  .cr-page {
    --cr-text: #171717;
    --cr-muted: #6B7280;
    --cr-soft: #8A7A52;
    --cr-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.18), transparent 28%),
      radial-gradient(circle at bottom right, rgba(17, 24, 39, 0.05), transparent 28%),
      linear-gradient(135deg, #FFFDF6 0%, #FFF8E1 45%, #F7EBC5 100%);
    --cr-card-bg: rgba(255, 255, 255, 0.96);
    --cr-card-border: rgba(232, 224, 199, 0.95);
    --cr-input-bg: #FFFFFF;
    --cr-input-border: rgba(17, 24, 39, 0.10);
    --cr-thead-bg: #FFF9E8;
    --cr-row-hover: rgba(255, 210, 30, 0.08);
    --cr-shadow: 0 18px 48px rgba(17, 24, 39, 0.07);
    --cr-shadow-hover: 0 24px 68px rgba(17, 24, 39, 0.12);
    min-height: 100vh;
    background: var(--cr-bg);
    color: var(--cr-text);
    padding: 8px;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  .theme-dark .cr-page {
    --cr-text: #F8FAFC;
    --cr-muted: rgba(255,255,255,0.60);
    --cr-soft: rgba(255,255,255,0.44);
    --cr-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.10), transparent 32%),
      linear-gradient(135deg, #07090F 0%, #0F172A 48%, #111827 100%);
    --cr-card-bg: rgba(255,255,255,0.055);
    --cr-card-border: rgba(255,255,255,0.09);
    --cr-input-bg: rgba(255,255,255,0.06);
    --cr-input-border: rgba(255,255,255,0.10);
    --cr-thead-bg: rgba(255,255,255,0.055);
    --cr-row-hover: rgba(255,210,30,0.07);
    --cr-shadow: 0 18px 52px rgba(0,0,0,0.22);
    --cr-shadow-hover: 0 28px 76px rgba(0,0,0,0.32);
  }

  /* Hero */
  .cr-hero {
    position: relative;
    overflow: hidden;
    min-height: 200px;
    border-radius: 28px;
    padding: 26px 30px;
    margin-bottom: 22px;
    background: linear-gradient(135deg, #121316 0%, #202126 54%, #0B0C0E 100%) !important;
    border: 1px solid rgba(255,255,255,0.10) !important;
    box-shadow: 0 20px 56px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07) !important;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }
  .cr-hero-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.4; pointer-events: none;
  }
  .cr-hero-glow { position: absolute; border-radius: 50%; pointer-events: none; }
  .cr-hero-glow-1 { width: 200px; height: 200px; right: -60px; top: -88px; background: #FFD21E; opacity: 0.92; box-shadow: 0 0 80px rgba(255,210,30,0.35); }
  .cr-hero-glow-2 { width: 88px; height: 88px; right: 130px; bottom: -36px; border: 16px solid rgba(255,210,30,0.13); }
  .cr-hero::after { content:''; position:absolute; left:28px; right:28px; bottom:0; height:1px; background: linear-gradient(90deg, transparent, rgba(255,210,30,0.7), transparent); }
  .cr-hero-left { position: relative; z-index: 2; display: flex; gap: 16px; align-items: flex-start; max-width: 820px; }
  .cr-hero-icon { width: 58px; height: 58px; border-radius: 20px; background: linear-gradient(135deg,#FFD21E,#D9A900); color: #121316; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 32px rgba(255,210,30,0.22); flex-shrink: 0; }
  .cr-kicker { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,210,30,0.24); background: rgba(255,210,30,0.09); color: #FFD21E; border-radius: 999px; padding: 6px 11px; font-size: 9.5px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .cr-kicker span { width: 6px; height: 6px; border-radius: 50%; background: #FFD21E; box-shadow: 0 0 0 4px rgba(255,210,30,0.13); }
  .cr-hero h1 { margin: 0; font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(26px, 2.8vw, 38px); font-weight: 800; letter-spacing: -1px; color: #FFFFFF !important; line-height: 1.06; }
  .cr-hero p { margin: 8px 0 0; color: rgba(255,255,255,0.62) !important; font-size: 12.5px; font-weight: 600; line-height: 1.68; max-width: 720px; }
  .cr-hero-actions { position: relative; z-index: 2; display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }

  /* Buttons */
  .cr-btn-secondary { min-height: 42px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 15px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.82); font-family: inherit; font-size: 12px; font-weight: 900; cursor: pointer; white-space: nowrap; transition: transform 0.16s ease; }
  .cr-btn-secondary:hover { transform: translateY(-2px); }
  .cr-btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  /* Stats grid */
  .cr-stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 13px; margin-bottom: 20px; }
  @media (max-width: 1100px) { .cr-stats-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .cr-stats-grid { grid-template-columns: 1fr 1fr; } }

  .cr-stat-card { position: relative; overflow: hidden; min-height: 136px; border-radius: 22px; padding: 17px; background: var(--cr-card-bg) !important; border: 1px solid var(--cr-card-border) !important; box-shadow: var(--cr-shadow) !important; backdrop-filter: blur(16px); transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }
  .cr-stat-card:hover { transform: translateY(-3px); box-shadow: var(--cr-shadow-hover) !important; border-color: rgba(255,210,30,0.32) !important; }
  .cr-stat-card::after { content:''; position:absolute; width:100px; height:100px; right:-44px; bottom:-44px; border-radius:50%; background: rgba(255,210,30,0.10); }
  .cr-stat-top { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
  .cr-stat-icon { width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
  .cr-stat-bar { width: 32px; height: 5px; border-radius: 999px; margin-top: 7px; }
  .cr-stat-card h3 { position: relative; z-index: 1; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.7px; color: var(--cr-text) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cr-stat-card p { position: relative; z-index: 1; margin: 5px 0 0; color: var(--cr-muted) !important; font-size: 11.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.55px; }
  .cr-stat-card span { position: relative; z-index: 1; display: block; margin-top: 4px; color: var(--cr-soft); font-size: 10.5px; font-weight: 700; }

  /* Error */
  .cr-error { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.20); color: #EF4444; font-size: 12.5px; font-weight: 800; margin-bottom: 18px; }
  .theme-dark .cr-error { color: #FCA5A5; }
  .cr-error button { margin-left: auto; background: rgba(239,68,68,0.14); border: none; border-radius: 8px; padding: 5px 11px; color: inherit; font-size: 11px; font-weight: 900; cursor: pointer; }

  /* Tabs */
  .cr-tabs-wrap { margin-bottom: 18px; overflow-x: auto; }
  .cr-tabs { display: flex; gap: 6px; min-width: max-content; padding-bottom: 2px; }
  .cr-tab { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px; border: 1px solid var(--cr-card-border); background: var(--cr-card-bg); color: var(--cr-muted); font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; }
  .cr-tab:hover { color: var(--cr-text); border-color: rgba(255,210,30,0.3); }
  .cr-tab-active { background: linear-gradient(135deg,#FFD21E,#D9A900) !important; color: #121316 !important; border-color: transparent !important; box-shadow: 0 8px 20px rgba(255,210,30,0.22); }

  /* Content card */
  .cr-content-card { background: var(--cr-card-bg) !important; border: 1px solid var(--cr-card-border) !important; box-shadow: var(--cr-shadow) !important; border-radius: 26px; overflow: hidden; }

  /* Toolbar */
  .cr-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--cr-card-border); flex-wrap: wrap; }
  .cr-search-wrap { display: flex; align-items: center; gap: 8px; background: var(--cr-input-bg); border: 1px solid var(--cr-input-border); border-radius: 12px; padding: 8px 12px; min-width: 220px; color: var(--cr-muted); }
  .cr-search-wrap input { background: transparent; border: none; outline: none; font-family: inherit; font-size: 12px; color: var(--cr-text); width: 100%; }
  .cr-clear-search { background: none; border: none; cursor: pointer; color: var(--cr-muted); display: flex; align-items: center; padding: 0; }
  .cr-count { font-size: 12px; font-weight: 700; color: var(--cr-muted); }
  .cr-count strong { color: var(--cr-text); }

  /* Empty */
  .cr-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 52px 20px; color: var(--cr-muted); }
  .cr-empty p { margin: 0; font-size: 13px; font-weight: 700; }

  /* Table */
  .cr-table-wrap { overflow-x: auto; }
  .cr-table-wrap table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .cr-table-wrap thead { background: var(--cr-thead-bg); }
  .cr-table-wrap th { padding: 11px 16px; text-align: left; font-size: 10.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.55px; color: var(--cr-muted); white-space: nowrap; border-bottom: 1px solid var(--cr-card-border); }
  .cr-table-wrap td { padding: 11px 16px; border-bottom: 1px solid var(--cr-card-border); color: var(--cr-text); vertical-align: middle; }
  .cr-table-wrap tr:last-child td { border-bottom: none; }
  .cr-table-wrap tr:hover td { background: var(--cr-row-hover); }
  .cr-code { font-family: monospace; font-size: 11px; background: rgba(255,210,30,0.10); border: 1px solid rgba(255,210,30,0.20); border-radius: 6px; padding: 2px 7px; color: #D9A900; font-weight: 700; }
  .theme-dark .cr-code { color: #FFD21E; }
  .cr-sub { font-size: 10.5px; color: var(--cr-muted); margin-top: 2px; font-weight: 600; }
  .cr-amount-green { color: #16A34A; font-weight: 800; }
  .cr-amount-blue { color: #2563EB; font-weight: 800; }
  .cr-amount-red { color: #EA580C; font-weight: 800; }
  .theme-dark .cr-amount-green { color: #4ADE80; }
  .theme-dark .cr-amount-blue { color: #60A5FA; }
  .theme-dark .cr-amount-red { color: #FB923C; }

  /* Badges */
  .cr-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 900; }
  .cr-badge-active { background: rgba(22,163,74,0.12); color: #16A34A; }
  .cr-badge-inactive { background: rgba(107,114,128,0.12); color: #6B7280; }
  .cr-badge-blocked { background: rgba(239,68,68,0.12); color: #EF4444; }
  .cr-badge-pending { background: rgba(234,179,8,0.12); color: #CA8A04; }
  .theme-dark .cr-badge-active { background: rgba(74,222,128,0.12); color: #4ADE80; }
  .theme-dark .cr-badge-inactive { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.55); }
  .theme-dark .cr-badge-blocked { background: rgba(252,165,165,0.12); color: #FCA5A5; }
  .cr-type-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 900; }

  /* Overview */
  .cr-overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; padding: 24px; }
  @media (max-width: 700px) { .cr-overview-grid { grid-template-columns: 1fr; } }
  .cr-overview-card { border-radius: 20px; padding: 20px; background: var(--cr-card-bg); border: 1px solid var(--cr-card-border); }
  .cr-ov-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .cr-ov-icon { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cr-ov-header h3 { margin: 0; font-size: 14px; font-weight: 900; color: var(--cr-text); }
  .cr-ov-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .cr-ov-list li { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding-bottom: 8px; border-bottom: 1px solid var(--cr-card-border); }
  .cr-ov-list li:last-child { border-bottom: none; padding-bottom: 0; }
  .cr-ov-label { color: var(--cr-muted); font-weight: 700; }
  .cr-ov-value { font-weight: 900; color: var(--cr-text); }

  /* Spin */
  @keyframes cr-spin { to { transform: rotate(360deg); } }
  .spin { animation: cr-spin 0.8s linear infinite; }

  @media (max-width: 600px) {
    .cr-hero { flex-direction: column; min-height: unset; }
    .cr-hero-actions { width: 100%; justify-content: flex-start; }
    .cr-toolbar { flex-direction: column; align-items: flex-start; }
    .cr-search-wrap { width: 100%; }
  }
`;
