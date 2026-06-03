import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  ClipboardList,
  FileText,
  ShoppingCart,
  PackageCheck,
  Wallet,
  RotateCcw,
  IndianRupee,
  ArrowRight,
  Clock,
  Building2,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

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

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export default function ProcurementDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const summary = dashboard?.summary || {};
  const cards = dashboard?.cards || {};
  const recent = dashboard?.recent || {};
  const finance = summary.finance || {};

  const pendingActions = recent.pending_actions || [];
  const recentPOs = recent.purchase_orders || [];
  const recentQuotations = recent.quotations || [];

  const financeProgress = useMemo(() => {
    const total = Number(finance.total_po_value || 0);
    const paid = Number(finance.paid_value || 0);

    if (!total) return 0;

    return Math.min(Math.round((paid / total) * 100), 100);
  }, [finance]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementDashboardTimer);
    window.__procurementDashboardTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const res = await API.get("/api/procurement-dashboard/summary");

      setDashboard(res.data || null);
    } catch (error) {
      console.error("Procurement dashboard error:", error);

      if (error.response?.status === 404) {
        setApiMissing(true);
        setDashboard(null);
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load procurement dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <AdminLayout>
      <div className="procurement-dashboard">
        <style>{css}</style>

        <div className="page-head">
          <div>
            <div className="eyebrow">
              <LayoutDashboard size={15} />
              Procurement Command Center
            </div>

            <h1>Procurement Dashboard</h1>

            <p>
              Track full procurement flow from RFQ, vendor quotations, purchase
              orders, goods receipts, vendor payments and purchase returns.
            </p>
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCcw size={16} />
            {loading ? "Refreshing..." : "Refresh Dashboard"}
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
              Procurement Dashboard backend route is not connected yet. Add
              /api/procurement-dashboard/summary and restart server.
            </span>
          </div>
        )}

        <div className="hero-grid">
          <div className="hero-card">
            <div className="hero-top">
              <div>
                <span>Total PO Value</span>
                <h2>{formatCurrency(finance.total_po_value || 0)}</h2>
              </div>

              <div className="hero-icon">
                <IndianRupee size={24} />
              </div>
            </div>

            <div className="finance-row">
              <div>
                <p>Paid</p>
                <strong>{formatCurrency(finance.paid_value || 0)}</strong>
              </div>

              <div>
                <p>Outstanding</p>
                <strong>{formatCurrency(finance.outstanding_value || 0)}</strong>
              </div>
            </div>

            <div className="progress-wrap">
              <div className="progress-top">
                <span>Payment Progress</span>
                <b>{financeProgress}%</b>
              </div>

              <div className="progress-bar">
                <div style={{ width: `${financeProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <QuickAction
              icon={ClipboardList}
              title="RFQs"
              text="Create purchase request"
              onClick={() => navigate("/super-admin/rfqs")}
            />

            <QuickAction
              icon={FileText}
              title="Quotations"
              text="Vendor quote entry"
              onClick={() => navigate("/super-admin/quotations")}
            />

            <QuickAction
              icon={TrendingUp}
              title="Compare"
              text="Best vendor pricing"
              onClick={() => navigate("/super-admin/quotation-comparison")}
            />

            <QuickAction
              icon={ShoppingCart}
              title="Purchase Orders"
              text="Approved orders"
              onClick={() => navigate("/super-admin/purchase-orders")}
            />
          </div>
        </div>

        <div className="metrics-grid">
          <MetricCard
            icon={ClipboardList}
            label="RFQs"
            value={cards.rfqs?.count || 0}
            subText={`${formatNumber(cards.rfqs?.pending || 0)} pending`}
            onClick={() => navigate("/super-admin/rfqs")}
          />

          <MetricCard
            icon={FileText}
            label="Vendor Quotations"
            value={cards.quotations?.count || 0}
            subText={formatCurrency(cards.quotations?.amount || 0)}
            onClick={() => navigate("/super-admin/quotations")}
          />

          <MetricCard
            icon={ShoppingCart}
            label="Purchase Orders"
            value={cards.purchase_orders?.count || 0}
            subText={formatCurrency(cards.purchase_orders?.amount || 0)}
            onClick={() => navigate("/super-admin/purchase-orders")}
          />

          <MetricCard
            icon={PackageCheck}
            label="Goods Receipts"
            value={cards.goods_receipts?.count || 0}
            subText={`${formatNumber(cards.goods_receipts?.posted || 0)} posted`}
            onClick={() => navigate("/super-admin/purchase-receipts")}
          />

          <MetricCard
            icon={Wallet}
            label="Payments"
            value={cards.payments?.count || 0}
            subText={`${formatCurrency(cards.payments?.paid || 0)} paid`}
            onClick={() => navigate("/super-admin/procurement-payments")}
          />

          <MetricCard
            icon={RotateCcw}
            label="Returns"
            value={cards.returns?.count || 0}
            subText={`${formatNumber(cards.returns?.qty || 0)} qty returned`}
            onClick={() => navigate("/super-admin/procurement-returns")}
          />
        </div>

        <div className="status-section">
          <StatusPanel
            title="RFQ Status"
            icon={ClipboardList}
            rows={[
              ["Draft", summary.rfq?.draft_rfqs || 0],
              ["Sent", summary.rfq?.sent_rfqs || 0],
              ["Quoted", summary.rfq?.quoted_rfqs || 0],
              ["Closed", summary.rfq?.closed_rfqs || 0],
            ]}
          />

          <StatusPanel
            title="Quotation Status"
            icon={FileText}
            rows={[
              ["Pending", summary.quotation?.pending_quotations || 0],
              ["Accepted", summary.quotation?.accepted_quotations || 0],
              ["Rejected", summary.quotation?.rejected_quotations || 0],
              ["Expired", summary.quotation?.expired_quotations || 0],
            ]}
          />

          <StatusPanel
            title="PO Status"
            icon={ShoppingCart}
            rows={[
              ["Pending", summary.purchase_order?.pending_purchase_orders || 0],
              ["Approved", summary.purchase_order?.approved_purchase_orders || 0],
              ["Sent", summary.purchase_order?.sent_purchase_orders || 0],
              ["Received", summary.purchase_order?.received_purchase_orders || 0],
            ]}
          />

          <StatusPanel
            title="GRN Status"
            icon={PackageCheck}
            rows={[
              ["Draft", summary.goods_receipt?.draft_grns || 0],
              ["Verified", summary.goods_receipt?.verified_grns || 0],
              ["Posted", summary.goods_receipt?.posted_grns || 0],
              ["Cancelled", summary.goods_receipt?.cancelled_grns || 0],
            ]}
          />
        </div>

        <div className="content-grid">
          <div className="table-card">
            <div className="table-head">
              <div>
                <h2>Pending Actions</h2>
                <p>Items requiring admin attention</p>
              </div>
            </div>

            <div className="list-wrap">
              {loading ? (
                <div className="empty">Loading pending actions...</div>
              ) : pendingActions.length === 0 ? (
                <div className="empty">No pending actions found</div>
              ) : (
                pendingActions.map((item, index) => (
                  <div className="action-item" key={`${item.action_type}-${item.id}-${index}`}>
                    <div className="action-icon">
                      <Clock size={17} />
                    </div>

                    <div>
                      <h3>{item.reference_number || "-"}</h3>
                      <p>{item.action_type || "-"} · {item.title || "-"}</p>
                    </div>

                    <div className="action-right">
                      <span>{formatDate(item.action_date)}</span>
                      <b className={getStatusClass(item.status)}>
                        {item.status || "-"}
                      </b>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="table-card">
            <div className="table-head">
              <div>
                <h2>Recent Purchase Orders</h2>
                <p>Latest vendor purchase orders</p>
              </div>

              <button
                type="button"
                className="link-btn"
                onClick={() => navigate("/super-admin/purchase-orders")}
              >
                View All
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="list-wrap">
              {loading ? (
                <div className="empty">Loading purchase orders...</div>
              ) : recentPOs.length === 0 ? (
                <div className="empty">No purchase orders found</div>
              ) : (
                recentPOs.map((po) => (
                  <div className="po-item" key={po.id}>
                    <div>
                      <h3>{po.po_number || `PO-${po.id}`}</h3>
                      <p>
                        <Building2 size={13} />
                        {po.vendor_name || "-"}
                      </p>
                    </div>

                    <div className="po-right">
                      <strong>{formatCurrency(po.total_amount)}</strong>
                      <span className={getStatusClass(po.status)}>
                        {po.status || "-"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Recent Vendor Quotations</h2>
              <p>Latest quotations received from vendors</p>
            </div>

            <button
              type="button"
              className="link-btn"
              onClick={() => navigate("/super-admin/quotations")}
            >
              View All
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="quote-table">
            <table>
              <thead>
                <tr>
                  <th>Quotation No</th>
                  <th>RFQ</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-table">
                      Loading quotations...
                    </td>
                  </tr>
                ) : recentQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-table">
                      No quotations found
                    </td>
                  </tr>
                ) : (
                  recentQuotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td>
                        <strong>
                          {quotation.quotation_number || `QT-${quotation.id}`}
                        </strong>
                      </td>
                      <td>{quotation.rfq_number || "-"}</td>
                      <td>{quotation.vendor_name || "-"}</td>
                      <td>{formatDate(quotation.quotation_date)}</td>
                      <td>{formatCurrency(quotation.total_amount)}</td>
                      <td>
                        <span className={getStatusClass(quotation.status)}>
                          {quotation.status || "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function QuickAction({ icon: Icon, title, text, onClick }) {
  return (
    <button type="button" className="quick-action" onClick={onClick}>
      <div>
        <Icon size={19} />
      </div>

      <span>{title}</span>
      <p>{text}</p>
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, subText, onClick }) {
  return (
    <button type="button" className="metric-card" onClick={onClick}>
      <div className="metric-icon">
        <Icon size={21} />
      </div>

      <div>
        <p>{label}</p>
        <h3>{value}</h3>
        <span>{subText}</span>
      </div>
    </button>
  );
}

function StatusPanel({ title, icon: Icon, rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row[1] || 0), 0);

  return (
    <div className="status-panel">
      <div className="status-panel-head">
        <div>
          <Icon size={18} />
        </div>

        <h3>{title}</h3>
      </div>

      <div className="status-rows">
        {rows.map(([label, value]) => {
          const percent = total ? Math.round((Number(value || 0) / total) * 100) : 0;

          return (
            <div className="status-row" key={label}>
              <div className="status-row-top">
                <span>{label}</span>
                <b>{formatNumber(value)}</b>
              </div>

              <div className="mini-progress">
                <div style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const css = `
  .procurement-dashboard {
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
    max-width: 800px;
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

  .hero-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 18px;
    margin-bottom: 18px;
  }

  .hero-card {
    background: linear-gradient(135deg, #111827, #05070a);
    color: #ffffff;
    border-radius: 28px;
    padding: 24px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
    overflow: hidden;
    position: relative;
  }

  .hero-card::after {
    content: "";
    position: absolute;
    right: -80px;
    top: -80px;
    width: 220px;
    height: 220px;
    border-radius: 999px;
    background: rgba(255, 210, 30, 0.12);
  }

  .hero-top {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .hero-top span,
  .finance-row p,
  .progress-top span {
    display: block;
    color: rgba(255, 255, 255, 0.62);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }

  .hero-top h2 {
    margin: 8px 0 0;
    color: #ffd21e;
    font-size: 36px;
    font-weight: 950;
    letter-spacing: -1px;
  }

  .hero-icon {
    width: 54px;
    height: 54px;
    border-radius: 20px;
    background: rgba(255, 210, 30, 0.14);
    color: #ffd21e;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .finance-row {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 26px;
  }

  .finance-row div {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px;
    padding: 15px;
  }

  .finance-row strong {
    display: block;
    margin-top: 5px;
    color: #ffffff;
    font-size: 18px;
    font-weight: 950;
  }

  .progress-wrap {
    position: relative;
    z-index: 1;
    margin-top: 20px;
  }

  .progress-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .progress-top b {
    color: #ffd21e;
    font-size: 12px;
    font-weight: 950;
  }

  .progress-bar {
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .progress-bar div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, #ffd21e, #e7b900);
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .quick-action {
    border: 1px solid #edf0f4;
    background: #ffffff;
    border-radius: 24px;
    padding: 18px;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .quick-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 22px 50px rgba(15, 23, 42, 0.1);
  }

  .quick-action div {
    width: 42px;
    height: 42px;
    border-radius: 16px;
    background: #111827;
    color: #ffd21e;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 13px;
  }

  .quick-action span {
    color: #111827;
    font-size: 15px;
    font-weight: 950;
  }

  .quick-action p {
    margin: 5px 0 0;
    color: #7b8190;
    font-size: 12px;
    font-weight: 750;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .metric-card {
    border: 1px solid #edf0f4;
    background: #ffffff;
    border-radius: 22px;
    padding: 17px;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.055);
    transition: transform 0.18s ease;
  }

  .metric-card:hover {
    transform: translateY(-2px);
  }

  .metric-icon {
    width: 43px;
    height: 43px;
    border-radius: 16px;
    background: rgba(255, 210, 30, 0.16);
    color: #9a7600;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 13px;
  }

  .metric-card p {
    margin: 0;
    color: #7b8190;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.45px;
  }

  .metric-card h3 {
    margin: 5px 0 0;
    color: #111827;
    font-size: 24px;
    font-weight: 950;
  }

  .metric-card span {
    display: block;
    margin-top: 5px;
    color: #6b7280;
    font-size: 12px;
    font-weight: 800;
  }

  .status-section {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .status-panel {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 24px;
    padding: 17px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.055);
  }

  .status-panel-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .status-panel-head div {
    width: 36px;
    height: 36px;
    border-radius: 14px;
    background: #111827;
    color: #ffd21e;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-panel-head h3 {
    margin: 0;
    color: #111827;
    font-size: 15px;
    font-weight: 950;
  }

  .status-rows {
    display: grid;
    gap: 12px;
  }

  .status-row-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 7px;
  }

  .status-row-top span {
    color: #6b7280;
    font-size: 12px;
    font-weight: 850;
  }

  .status-row-top b {
    color: #111827;
    font-size: 12px;
    font-weight: 950;
  }

  .mini-progress {
    height: 8px;
    border-radius: 999px;
    background: #f3f4f6;
    overflow: hidden;
  }

  .mini-progress div {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, #ffd21e, #e7b900);
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 18px;
  }

  .table-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.065);
  }

  .table-head {
    padding: 18px 20px;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .table-head h2 {
    margin: 0;
    color: #0b0d12;
    font-size: 18px;
    font-weight: 950;
  }

  .table-head p {
    margin: 4px 0 0;
    color: #7b8190;
    font-size: 12px;
    font-weight: 750;
  }

  .link-btn {
    border: none;
    background: #111827;
    color: #ffd21e;
    border-radius: 12px;
    min-height: 34px;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .list-wrap {
    padding: 14px;
    display: grid;
    gap: 11px;
  }

  .action-item,
  .po-item {
    border: 1px solid #edf0f4;
    background: #f8fafc;
    border-radius: 18px;
    padding: 13px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
  }

  .po-item {
    grid-template-columns: 1fr auto;
  }

  .action-icon {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: #111827;
    color: #ffd21e;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-item h3,
  .po-item h3 {
    margin: 0;
    color: #111827;
    font-size: 14px;
    font-weight: 950;
  }

  .action-item p,
  .po-item p {
    margin: 4px 0 0;
    color: #6b7280;
    font-size: 12px;
    font-weight: 750;
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .action-right,
  .po-right {
    text-align: right;
    display: grid;
    justify-items: end;
    gap: 5px;
  }

  .action-right span {
    color: #6b7280;
    font-size: 11px;
    font-weight: 850;
  }

  .po-right strong {
    color: #111827;
    font-size: 13px;
    font-weight: 950;
  }

  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 26px;
    padding: 0 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 950;
    text-transform: capitalize;
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

  .quote-table {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 900px;
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

  .empty,
  .empty-table {
    text-align: center;
    color: #9ca3af;
    padding: 30px 16px;
    font-weight: 850;
  }

  @media (max-width: 1250px) {
    .metrics-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .status-section {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-grid,
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .procurement-dashboard {
      padding: 18px;
    }

    .page-head {
      flex-direction: column;
    }

    .btn.primary {
      width: 100%;
    }

    .quick-actions,
    .metrics-grid,
    .status-section,
    .finance-row {
      grid-template-columns: 1fr;
    }

    .hero-top h2 {
      font-size: 28px;
    }

    .table-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .link-btn {
      width: 100%;
      justify-content: center;
    }

    .action-item {
      grid-template-columns: auto 1fr;
    }

    .action-right {
      grid-column: 1 / -1;
      justify-items: start;
      text-align: left;
      padding-left: 50px;
    }
  }
`;
