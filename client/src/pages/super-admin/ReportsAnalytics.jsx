import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertCircle, BarChart3, Download, FileSpreadsheet, FileText,
  Package, RefreshCw, Search, ShoppingCart, TrendingUp, Truck, Users, Warehouse,
} from "lucide-react";

// ── Formatters ────────────────────────────────────────────────────────────────
const INR = (v) =>
  "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
.ra-page { padding: 24px; max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif; }
.ra-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.ra-title { font-size: 26px; font-weight: 900; color: #171717; letter-spacing: -0.5px; margin: 0 0 4px; }
.ra-sub { font-size: 13px; color: #8A7A52; margin: 0; }
.ra-btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 18px; border-radius: 10px; background: #FFD21E; border: none; cursor: pointer; font-size: 13px; font-weight: 800; color: #171717; }
.ra-btn:hover { background: #f5c800; }

.ra-kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 22px; }
@media (max-width: 1100px) { .ra-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .ra-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
.ra-kpi { background: #fff; border: 1.5px solid #E8E0C7; border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 12px; }
.ra-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ra-kpi-val { font-size: 20px; font-weight: 900; color: #171717; line-height: 1; font-family: monospace; }
.ra-kpi-lbl { font-size: 11px; color: #8A7A52; font-weight: 600; margin-top: 3px; }

.ra-filters { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; align-items: center; }
.ra-input { height: 36px; border: 1.5px solid #E8E0C7; border-radius: 8px; padding: 0 12px; font-size: 13px; background: #fff; color: #171717; outline: none; }
.ra-input:focus { border-color: #C9B96E; }
.ra-search-wrap { position: relative; }
.ra-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #8A7A52; pointer-events: none; }
.ra-search-wrap input { padding-left: 32px; min-width: 200px; }

.ra-tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
.ra-tab { height: 36px; padding: 0 16px; border-radius: 8px; border: 1.5px solid #E8E0C7; background: #fff; font-size: 13px; font-weight: 600; color: #8A7A52; cursor: pointer; }
.ra-tab.active { background: #171717; border-color: #171717; color: #FFD21E; }

.ra-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
@media (max-width: 900px) { .ra-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .ra-stats { grid-template-columns: 1fr 1fr; } }
.ra-stat { background: #fff; border: 1.5px solid #E8E0C7; border-radius: 14px; padding: 16px; }
.ra-stat-val { font-size: 20px; font-weight: 900; font-family: monospace; color: #171717; }
.ra-stat-lbl { font-size: 11px; color: #8A7A52; font-weight: 600; margin-top: 4px; }

.ra-panel { background: #fff; border: 1.5px solid #E8E0C7; border-radius: 14px; overflow: hidden; }
.ra-panel-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #E8E0C7; background: #FAFAF7; }
.ra-count { font-size: 12px; font-weight: 700; color: #8A7A52; background: #F0EBD8; padding: 3px 10px; border-radius: 20px; }
.ra-table-wrap { overflow-x: auto; }
table.ra-table { width: 100%; border-collapse: collapse; font-size: 13px; }
table.ra-table th { background: #F5F0E8; color: #8A7A52; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; padding: 10px 14px; text-align: left; white-space: nowrap; }
table.ra-table td { padding: 10px 14px; border-bottom: 1px solid #F0EBD8; color: #171717; vertical-align: middle; }
table.ra-table tr:last-child td { border-bottom: none; }
table.ra-table tr:hover td { background: #FAFAF7; }
.ra-amt { font-family: monospace; font-weight: 700; }

.ra-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.ra-badge-active, .ra-badge-paid, .ra-badge-received, .ra-badge-success { background: #DCFCE7; color: #16A34A; }
.ra-badge-pending, .ra-badge-pending_approval, .ra-badge-partial { background: #FEF9C3; color: #854D0E; }
.ra-badge-draft { background: #F1F5F9; color: #475569; }
.ra-badge-inactive, .ra-badge-cancelled, .ra-badge-failed { background: #FEE2E2; color: #DC2626; }
.ra-badge-approved, .ra-badge-sent { background: #DBEAFE; color: #2563EB; }
.ra-badge-blocked, .ra-badge-overdue { background: #FCE7F3; color: #DB2777; }
.ra-badge-in_transit, .ra-badge-picked { background: #EDE9FE; color: #7C3AED; }
.ra-badge-available { background: #DCFCE7; color: #16A34A; }
.ra-badge-busy { background: #FEF9C3; color: #854D0E; }
.ra-badge-offline { background: #F1F5F9; color: #475569; }
.ra-badge-generated { background: #DBEAFE; color: #2563EB; }
.ra-badge-filed { background: #DCFCE7; color: #16A34A; }
.ra-badge-matched { background: #DCFCE7; color: #16A34A; }
.ra-badge-mismatch { background: #FEE2E2; color: #DC2626; }
.ra-export-row { display:flex; gap:8px; margin-left:auto; }
.ra-btn-outline { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 14px; border-radius:8px; background:#fff; border:1.5px solid #E8E0C7; cursor:pointer; font-size:12px; font-weight:700; color:#171717; }
.ra-btn-outline:hover { background:#F5F0E8; border-color:#C9B96E; }

.ra-empty { text-align: center; padding: 48px 20px; color: #8A7A52; font-size: 14px; }
.ra-error { display: flex; align-items: center; gap: 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 14px 18px; color: #DC2626; font-size: 13px; margin-bottom: 18px; }
.ra-loading { text-align: center; padding: 40px; color: #8A7A52; font-size: 13px; }

.ra-dash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 800px) { .ra-dash-grid { grid-template-columns: 1fr; } }
.ra-dash-section { background: #fff; border: 1.5px solid #E8E0C7; border-radius: 14px; padding: 18px; }
.ra-section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #8A7A52; margin-bottom: 12px; }
.ra-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(232,224,199,0.4); font-size: 13px; }
.ra-row:last-child { border-bottom: none; }

.ra-monthly-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 700px) { .ra-monthly-grid { grid-template-columns: repeat(2, 1fr); } }
.ra-month-card { background: #FAFAF7; border: 1px solid #E8E0C7; border-radius: 10px; padding: 12px; }
.ra-month-label { font-size: 11px; color: #8A7A52; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
.ra-month-rev { font-size: 16px; font-weight: 900; font-family: monospace; color: #171717; }
.ra-month-count { font-size: 11px; color: #8A7A52; margin-top: 2px; }
`;

const TABS = [
  { key: "dashboard",   label: "Dashboard",   icon: BarChart3 },
  { key: "sales",       label: "Sales",       icon: ShoppingCart },
  { key: "procurement", label: "Procurement", icon: Truck },
  { key: "inventory",   label: "Inventory",   icon: Package },
  { key: "vendors",     label: "Vendors",     icon: Users },
  { key: "customers",   label: "Customers",   icon: Users },
  { key: "warehouses",  label: "Warehouses",  icon: Warehouse },
  { key: "delivery",    label: "Delivery",    icon: Truck },
  { key: "finance",     label: "Finance",     icon: TrendingUp },
  { key: "tax",         label: "GST / Tax",   icon: FileText },
];

const Badge = ({ s }) => <span className={`ra-badge ra-badge-${(s||"draft").toLowerCase().replace(/\s+/g,"_")}`}>{s || "—"}</span>;

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab]   = useState("dashboard");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [search, setSearch]         = useState("");

  // ── Data state per tab ────────────────────────────────────────────────────
  const [kpis, setKpis]             = useState({});
  const [dashboard, setDashboard]   = useState({});
  const [salesSum, setSalesSum]     = useState({});
  const [salesList, setSalesList]   = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [procSum, setProcSum]       = useState({});
  const [procList, setProcList]     = useState([]);
  const [invSum, setInvSum]         = useState({});
  const [invList, setInvList]       = useState([]);
  const [lowStock, setLowStock]     = useState([]);
  const [vendorSum, setVendorSum]   = useState({});
  const [vendorList, setVendorList] = useState([]);
  // ── New module states ────────────────────────────────────────────────────
  const [custSum, setCustSum]       = useState({});
  const [custList, setCustList]     = useState([]);
  const [topCust, setTopCust]       = useState([]);
  const [whSum, setWhSum]           = useState({});
  const [whList, setWhList]         = useState([]);
  const [whMoves, setWhMoves]       = useState([]);
  const [delSum, setDelSum]         = useState({});
  const [delList, setDelList]       = useState([]);
  const [delDrivers, setDelDrivers] = useState([]);
  const [finSum, setFinSum]         = useState({});
  const [finPL, setFinPL]           = useState([]);
  const [taxSum, setTaxSum]         = useState({});
  const [taxTxns, setTaxTxns]       = useState([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadTab = useCallback(async (tab, fd, td) => {
    setLoading(true); setError("");
    const dq = fd && td ? `?from_date=${fd}&to_date=${td}` : "";
    try {
      if (tab === "dashboard") {
        const [r1, r2] = await Promise.all([
          API.get("/api/reports/kpis"),
          API.get("/api/reports/dashboard"),
        ]);
        if (r1.data.success) setKpis(r1.data.kpis || {});
        if (r2.data.success) setDashboard(r2.data.dashboard || {});
      } else if (tab === "sales") {
        const [r1, r2, r3] = await Promise.all([
          API.get(`/api/reports/sales/summary${dq}`),
          API.get(`/api/reports/sales${dq}`),
          API.get(`/api/reports/sales/top-products${dq}`),
        ]);
        if (r1.data.success) setSalesSum(r1.data.summary || {});
        if (r2.data.success) setSalesList(Array.isArray(r2.data.sales) ? r2.data.sales : []);
        if (r3.data.success) setTopProducts(Array.isArray(r3.data.top_products) ? r3.data.top_products : []);
      } else if (tab === "procurement") {
        const [r1, r2] = await Promise.all([
          API.get(`/api/reports/procurement/summary`),
          API.get(`/api/reports/procurement${dq}`),
        ]);
        if (r1.data.success) setProcSum(r1.data.summary || {});
        if (r2.data.success) setProcList(Array.isArray(r2.data.purchase_orders) ? r2.data.purchase_orders : []);
      } else if (tab === "inventory") {
        const [r1, r2, r3] = await Promise.all([
          API.get("/api/reports/inventory/summary"),
          API.get("/api/reports/inventory"),
          API.get("/api/reports/inventory/low-stock"),
        ]);
        if (r1.data.success) setInvSum(r1.data.summary || {});
        if (r2.data.success) setInvList(Array.isArray(r2.data.inventory) ? r2.data.inventory : []);
        if (r3.data.success) setLowStock(Array.isArray(r3.data.low_stock) ? r3.data.low_stock : []);
      } else if (tab === "vendors") {
        const [r1, r2] = await Promise.all([
          API.get("/api/reports/vendors/summary"),
          API.get("/api/reports/vendors"),
        ]);
        if (r1.data.success) setVendorSum(r1.data.summary || {});
        if (r2.data.success) setVendorList(Array.isArray(r2.data.vendors) ? r2.data.vendors : []);
      } else if (tab === "customers") {
        const [r1, r2, r3] = await Promise.all([
          API.get("/api/reports/customers/summary"),
          API.get(`/api/reports/customers${dq}`),
          API.get(`/api/reports/customers/top-customers${dq}`),
        ]);
        if (r1.data.success) setCustSum(r1.data.summary || {});
        if (r2.data.success) setCustList(Array.isArray(r2.data.customers) ? r2.data.customers : []);
        if (r3.data.success) setTopCust(Array.isArray(r3.data.top_customers) ? r3.data.top_customers : []);
      } else if (tab === "warehouses") {
        const [r1, r2, r3] = await Promise.all([
          API.get("/api/reports/warehouses/summary"),
          API.get("/api/reports/warehouses"),
          API.get(`/api/reports/warehouses/movements${dq}`),
        ]);
        if (r1.data.success) setWhSum(r1.data.summary || {});
        if (r2.data.success) setWhList(Array.isArray(r2.data.warehouses) ? r2.data.warehouses : []);
        if (r3.data.success) setWhMoves(Array.isArray(r3.data.movements) ? r3.data.movements : []);
      } else if (tab === "delivery") {
        const [r1, r2, r3] = await Promise.all([
          API.get("/api/reports/delivery/summary"),
          API.get(`/api/reports/delivery${dq}`),
          API.get("/api/reports/delivery/drivers"),
        ]);
        if (r1.data.success) setDelSum(r1.data.summary || {});
        if (r2.data.success) setDelList(Array.isArray(r2.data.deliveries) ? r2.data.deliveries : []);
        if (r3.data.success) setDelDrivers(Array.isArray(r3.data.drivers) ? r3.data.drivers : []);
      } else if (tab === "finance") {
        const [r1, r2] = await Promise.all([
          API.get("/api/reports/finance/summary"),
          API.get(`/api/reports/finance/profit-loss${dq}`),
        ]);
        if (r1.data.success) setFinSum(r1.data.summary || {});
        if (r2.data.success) setFinPL(Array.isArray(r2.data.pl) ? r2.data.pl : []);
      } else if (tab === "tax") {
        const [r1, r2] = await Promise.all([
          API.get("/api/reports/tax/summary"),
          API.get(`/api/reports/tax/transactions${dq}`),
        ]);
        if (r1.data.success) setTaxSum(r1.data.summary || {});
        if (r2.data.success) setTaxTxns(Array.isArray(r2.data.transactions) ? r2.data.transactions : []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTab("dashboard", "", ""); }, [loadTab]);

  const switchTab = (key) => {
    setActiveTab(key); setSearch(""); loadTab(key, fromDate, toDate);
  };

  const applyFilter = () => loadTab(activeTab, fromDate, toDate);

  // ── Export helpers ────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const getTableData = () => {
    switch (activeTab) {
      case "sales":       return { name:"sales",       headers:["Order#","Date","Customer","Total","Payment","Status"],        rows: fSales.map(r=>[r.order_number,String(r.order_date||"").slice(0,10),r.customer_name,r.total_amount,r.payment_status,r.order_status]) };
      case "procurement": return { name:"procurement", headers:["PO#","Date","Vendor","Subtotal","Tax","Total","Status"],       rows: fProc.map(r=>[r.po_number,String(r.po_date||"").slice(0,10),r.vendor_name,r.subtotal,r.tax_amount,r.total_amount,r.status]) };
      case "inventory":   return { name:"inventory",   headers:["Product","SKU","Warehouse","Available","Reserved","Avg Cost","Stock Value"], rows: fInv.map(r=>[r.product_name,r.sku,r.warehouse_name,r.available_qty,r.reserved_qty,r.average_cost,r.stock_value]) };
      case "vendors":     return { name:"vendors",     headers:["Vendor","Code","City","Status","Rating","POs","PO Value","Paid"], rows: fVend.map(r=>[r.business_name,r.vendor_code,r.city,r.status,r.rating,r.total_po,r.total_po_value,r.total_paid]) };
      case "customers":   return { name:"customers",   headers:["Customer","Code","City","Phone","Status","Orders","Order Value","Outstanding"], rows: fCust.map(r=>[r.business_name,r.customer_code,r.city,r.phone,r.status,r.total_orders,r.total_order_value,r.outstanding]) };
      case "warehouses":  return { name:"warehouses",  headers:["Warehouse","Code","City","Status","SKUs","Qty","Stock Value"],  rows: fWh.map(r=>[r.warehouse_name,r.warehouse_code,r.city,r.status,r.product_count,r.total_qty,r.stock_value]) };
      case "delivery":    return { name:"delivery",    headers:["Delivery#","Date","Status","Driver","Customer","Order#"],       rows: fDel.map(r=>[r.delivery_number,String(r.delivery_date||"").slice(0,10),r.delivery_status,r.driver_name,r.customer_name,r.order_number]) };
      case "finance":     return { name:"finance",     headers:["Type","Year","Month","Count","Total"],                          rows: fPL.map(r=>[r.transaction_type,r.year,r.month,r.count,r.total]) };
      case "tax":         return { name:"gst-tax",     headers:["Date","Ref Type","Ref ID","Taxable","CGST","SGST","IGST","Total Tax"], rows: fTax.map(r=>[String(r.transaction_date||"").slice(0,10),r.reference_type,r.reference_id,r.taxable_value,r.cgst_amount,r.sgst_amount,r.igst_amount,r.total_tax]) };
      default:            return { name:"dashboard",   headers:[], rows:[] };
    }
  };

  const exportCSV = () => {
    const { name, headers, rows } = getTableData();
    if (!headers.length) return;
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `vivin-store-${name}-${today}.xlsx`);
  };

  const exportPDF = () => {
    const { name, headers, rows } = getTableData();
    if (!headers.length) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Vivin Store — ${name.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase())} Report`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${today}`, 14, 22);
    autoTable(doc, { head: [headers], body: rows, startY: 26, styles: { fontSize: 8 }, headStyles: { fillColor: [23,23,23], textColor: [255,210,30] } });
    doc.save(`vivin-store-${name}-${today}.pdf`);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const po  = procSum.purchase_orders || {};
  const pp  = procSum.payments        || {};
  const inv = invSum.totals           || {};
  const ls  = invSum.low_stock        || {};
  const prd = invSum.products         || {};
  const vs  = vendorSum.vendors       || {};
  const vpo = vendorSum.purchase_orders || {};
  const vpy = vendorSum.payments      || {};
  const dO  = dashboard.orders        || {};
  const dP  = dashboard.purchases     || {};
  const dV  = dashboard.vendors       || {};
  const dI  = dashboard.inventory     || {};
  const monthly = Array.isArray(dashboard.monthly_sales) ? dashboard.monthly_sales : [];

  const q = search.toLowerCase();
  const fSales  = salesList.filter((r) => !q || [r.order_number, r.customer_name, r.order_status].some((v) => String(v||"").toLowerCase().includes(q)));
  const fProc   = procList.filter((r) => !q || [r.po_number, r.vendor_name, r.status].some((v) => String(v||"").toLowerCase().includes(q)));
  const fInv    = invList.filter((r) => !q || [r.product_name, r.sku, r.warehouse_name].some((v) => String(v||"").toLowerCase().includes(q)));
  const fLow    = lowStock.filter((r) => !q || [r.product_name, r.sku].some((v) => String(v||"").toLowerCase().includes(q)));
  const fVend   = vendorList.filter((r) => !q || [r.business_name, r.vendor_code, r.city].some((v) => String(v||"").toLowerCase().includes(q)));
  const fTop    = topProducts.filter((r) => !q || [r.product_name, r.sku].some((v) => String(v||"").toLowerCase().includes(q)));
  // New module filtered lists
  const fCust   = custList.filter((r)    => !q || [r.business_name, r.customer_code, r.city, r.phone].some((v) => String(v||"").toLowerCase().includes(q)));
  const fTopC   = topCust.filter((r)     => !q || [r.customer_name, r.customer_code, r.city].some((v) => String(v||"").toLowerCase().includes(q)));
  const fWh     = whList.filter((r)      => !q || [r.warehouse_name, r.warehouse_code, r.city].some((v) => String(v||"").toLowerCase().includes(q)));
  const fMoves  = whMoves.filter((r)     => !q || [r.warehouse_name, r.movement_type].some((v) => String(v||"").toLowerCase().includes(q)));
  const fDel    = delList.filter((r)     => !q || [r.delivery_number, r.driver_name, r.customer_name, r.delivery_status].some((v) => String(v||"").toLowerCase().includes(q)));
  const fDrv    = delDrivers.filter((r)  => !q || [r.driver_name, r.driver_code, r.vehicle_type].some((v) => String(v||"").toLowerCase().includes(q)));
  const fPL     = finPL.filter((r)       => !q || [r.transaction_type].some((v) => String(v||"").toLowerCase().includes(q)));
  const fTax    = taxTxns.filter((r)     => !q || [r.reference_type, r.reference_id].some((v) => String(v||"").toLowerCase().includes(q)));
  // New module summary shortcuts
  const cs  = custSum.customers         || {};
  const co  = custSum.orders            || {};
  const ci  = custSum.invoices          || {};
  const whs = whSum.warehouses          || {};
  const wst = whSum.stock               || {};
  const wmv = whSum.movements           || {};
  const ds  = delSum.deliveries         || {};
  const dd  = delSum.drivers            || {};
  const fi  = finSum.invoices           || {};
  const fp  = finSum.payments           || {};
  const fvp = finSum.vendor_payments    || {};
  const fic = finSum.income             || {};
  const fex = finSum.expense            || {};
  const tg  = taxSum.gst               || {};
  const tr1 = taxSum.gstr1             || {};
  const tr3 = taxSum.gstr3b            || {};
  const tr2 = taxSum.gstr2b            || {};

  const KPI_CARDS = [
    { label: "Sales This Month",      value: INR(kpis.sales_this_month),        icon: TrendingUp,  color: "#16A34A" },
    { label: "Customer Outstanding",  value: INR(kpis.customer_outstanding),    icon: ShoppingCart,color: "#2563EB" },
    { label: "Pending Vendor Pay",    value: INR(kpis.pending_vendor_payments), icon: Truck,       color: "#EA580C" },
    { label: "Low Stock Products",    value: fmt(kpis.low_stock_count),         icon: Package,     color: "#DC2626" },
    { label: "Pending POs",           value: fmt(kpis.pending_po),              icon: Warehouse,   color: "#7C3AED" },
  ];

  return (
    <AdminLayout>
      <style>{css}</style>
      <div className="ra-page">

        {/* Header */}
        <div className="ra-header">
          <div>
            <h1 className="ra-title">Reports &amp; Analytics</h1>
            <p className="ra-sub">Sales · Procurement · Inventory · Vendors · Customers · Warehouses · Delivery · Finance · GST</p>
          </div>
          <button className="ra-btn" onClick={() => loadTab(activeTab, fromDate, toDate)}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="ra-kpi-grid">
          {KPI_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <div className="ra-kpi" key={c.label}>
                <div className="ra-kpi-icon" style={{ background: `${c.color}18`, color: c.color }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="ra-kpi-val">{c.value}</div>
                  <div className="ra-kpi-lbl">{c.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="ra-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`ra-tab${activeTab === t.key ? " active" : ""}`} onClick={() => switchTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="ra-filters">
          <div className="ra-search-wrap">
            <Search size={14} />
            <input className="ra-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <input className="ra-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="ra-input" type="date" value={toDate}   onChange={(e) => setToDate(e.target.value)} />
          <button className="ra-btn" onClick={applyFilter}>Apply</button>
          {(fromDate || toDate) && (
            <button className="ra-btn" style={{ background: "#F1F5F9", color: "#475569" }}
              onClick={() => { setFromDate(""); setToDate(""); loadTab(activeTab, "", ""); }}>Clear</button>
          )}
          <div className="ra-export-row">
            <button className="ra-btn-outline" onClick={exportCSV} title="Export Excel">
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button className="ra-btn-outline" onClick={exportPDF} title="Export PDF">
              <Download size={14} /> PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="ra-error"><AlertCircle size={16} />{error}</div>
        )}

        {loading && <div className="ra-loading">Loading…</div>}

        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && !loading && (
          <div className="ra-dash-grid">
            <div className="ra-dash-section">
              <div className="ra-section-title">Orders Overview</div>
              {[
                ["Total Orders",    fmt(dO.total),  "#171717"],
                ["Gross Revenue",   INR(dO.gross),  "#16A34A"],
              ].map(([l,v,c]) => (
                <div className="ra-row" key={l}>
                  <span style={{ color:"#6B7280" }}>{l}</span>
                  <span style={{ fontWeight:800, fontFamily:"monospace", color:c }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="ra-dash-section">
              <div className="ra-section-title">Procurement Overview</div>
              {[
                ["Total POs",          fmt(dP.total),        "#171717"],
                ["Total PO Value",     INR(dP.total_value),  "#EA580C"],
                ["Active Vendors",     fmt(dV.active),       "#2563EB"],
                ["Total Vendors",      fmt(dV.total),        "#171717"],
              ].map(([l,v,c]) => (
                <div className="ra-row" key={l}>
                  <span style={{ color:"#6B7280" }}>{l}</span>
                  <span style={{ fontWeight:800, fontFamily:"monospace", color:c }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="ra-dash-section">
              <div className="ra-section-title">Inventory Overview</div>
              {[
                ["Total SKUs",      fmt(dI.skus),   "#171717"],
                ["Stock Value",     INR(dI.value),  "#7C3AED"],
              ].map(([l,v,c]) => (
                <div className="ra-row" key={l}>
                  <span style={{ color:"#6B7280" }}>{l}</span>
                  <span style={{ fontWeight:800, fontFamily:"monospace", color:c }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="ra-dash-section">
              <div className="ra-section-title">Monthly Sales (Last 6 Months)</div>
              {monthly.length === 0
                ? <div className="ra-empty">No monthly data</div>
                : (
                  <div className="ra-monthly-grid">
                    {monthly.map((m) => (
                      <div className="ra-month-card" key={`${m.year}-${m.month}`}>
                        <div className="ra-month-label">{MONTHS[m.month]} {m.year}</div>
                        <div className="ra-month-rev">{INR(m.revenue)}</div>
                        <div className="ra-month-count">{fmt(m.order_count)} orders</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ── SALES ── */}
        {activeTab === "sales" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Orders",          v:fmt(salesSum.orders?.order_count),           c:"#171717" },
                { l:"Gross Sales",     v:INR(salesSum.orders?.gross_sales),           c:"#16A34A" },
                { l:"Invoiced",        v:INR(salesSum.invoices?.invoiced_amount),     c:"#2563EB" },
                { l:"Outstanding",     v:INR(salesSum.invoices?.outstanding),         c:"#DC2626" },
              ].map(({ l, v, c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color: c }}>{v || "—"}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div className="ra-panel" style={{ marginBottom: 18 }}>
              <div className="ra-panel-head">
                <span style={{ fontWeight: 800, fontSize: 13 }}>Order List</span>
                <span className="ra-count">{fSales.length} records</span>
              </div>
              <div className="ra-table-wrap">
                {fSales.length === 0
                  ? <div className="ra-empty">No orders found</div>
                  : (
                    <table className="ra-table">
                      <thead><tr>
                        <th>Order #</th><th>Date</th><th>Customer</th>
                        <th>Total</th><th>Payment</th><th>Status</th>
                      </tr></thead>
                      <tbody>
                        {fSales.map((r) => (
                          <tr key={r.id}>
                            <td style={{ fontWeight:700 }}>{r.order_number || "—"}</td>
                            <td>{r.order_date ? String(r.order_date).slice(0,10) : "—"}</td>
                            <td>{r.customer_name || "—"}</td>
                            <td className="ra-amt">{INR(r.total_amount)}</td>
                            <td><Badge s={r.payment_status} /></td>
                            <td><Badge s={r.order_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight: 800, fontSize: 13 }}>Top Products by Revenue</span>
                <span className="ra-count">{fTop.length} products</span>
              </div>
              <div className="ra-table-wrap">
                {fTop.length === 0
                  ? <div className="ra-empty">No product data</div>
                  : (
                    <table className="ra-table">
                      <thead><tr>
                        <th>#</th><th>Product</th><th>SKU</th>
                        <th>Orders</th><th>Qty Sold</th><th>Revenue</th>
                      </tr></thead>
                      <tbody>
                        {fTop.map((r, i) => (
                          <tr key={r.product_id || i}>
                            <td style={{ color:"#8A7A52", fontWeight:700 }}>{i + 1}</td>
                            <td style={{ fontWeight:700 }}>{r.product_name || "—"}</td>
                            <td style={{ color:"#8A7A52" }}>{r.sku || "—"}</td>
                            <td>{fmt(r.order_count)}</td>
                            <td>{fmt(r.total_qty)}</td>
                            <td className="ra-amt" style={{ color:"#16A34A" }}>{INR(r.total_revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>
          </>
        )}

        {/* ── PROCUREMENT ── */}
        {activeTab === "procurement" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Total POs",         v:fmt(po.total_po),          c:"#171717" },
                { l:"PO Value",          v:INR(po.total_po_value),    c:"#EA580C" },
                { l:"Vendor Paid",       v:INR(pp.paid_amount),       c:"#16A34A" },
                { l:"Pending Payment",   v:INR(pp.pending_amount),    c:"#DC2626" },
              ].map(({ l, v, c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color: c }}>{v || "—"}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
              {[
                ["Draft",             po.draft,            "#475569"],
                ["Pending Approval",  po.pending_approval, "#854D0E"],
                ["Approved",          po.approved,         "#2563EB"],
                ["Received",          po.received,         "#16A34A"],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace", color:c }}>{fmt(v)}</div>
                  <div style={{ fontSize:11, color:"#8A7A52", fontWeight:600 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight: 800, fontSize: 13 }}>Purchase Orders</span>
                <span className="ra-count">{fProc.length} records</span>
              </div>
              <div className="ra-table-wrap">
                {fProc.length === 0
                  ? <div className="ra-empty">No purchase orders found</div>
                  : (
                    <table className="ra-table">
                      <thead><tr>
                        <th>PO #</th><th>Date</th><th>Vendor</th>
                        <th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th>
                      </tr></thead>
                      <tbody>
                        {fProc.map((r) => (
                          <tr key={r.id}>
                            <td style={{ fontWeight:700 }}>{r.po_number || "—"}</td>
                            <td>{r.po_date ? String(r.po_date).slice(0,10) : "—"}</td>
                            <td>{r.vendor_name || "—"}</td>
                            <td className="ra-amt">{INR(r.subtotal)}</td>
                            <td className="ra-amt">{INR(r.tax_amount)}</td>
                            <td className="ra-amt" style={{ fontWeight:900 }}>{INR(r.total_amount)}</td>
                            <td><Badge s={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>
          </>
        )}

        {/* ── INVENTORY ── */}
        {activeTab === "inventory" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Total SKUs",     v:fmt(inv.total_skus),     c:"#171717" },
                { l:"Available Qty",  v:fmt(inv.total_available),c:"#16A34A" },
                { l:"Stock Value",    v:INR(inv.stock_value),    c:"#7C3AED" },
                { l:"Low Stock",      v:fmt(ls.count),           c:"#DC2626" },
              ].map(({ l, v, c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color: c }}>{v || "—"}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            {fLow.length > 0 && (
              <div className="ra-panel" style={{ marginBottom: 18, border:"1.5px solid #FECACA" }}>
                <div className="ra-panel-head" style={{ background:"#FEF2F2" }}>
                  <span style={{ fontWeight:800, fontSize:13, color:"#DC2626" }}>⚠ Low Stock Alert</span>
                  <span className="ra-count">{fLow.length} products</span>
                </div>
                <div className="ra-table-wrap">
                  <table className="ra-table">
                    <thead><tr>
                      <th>Product</th><th>SKU</th><th>Reorder Level</th><th>Available</th><th>Gap</th>
                    </tr></thead>
                    <tbody>
                      {fLow.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight:700 }}>{r.product_name || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{r.sku || "—"}</td>
                          <td className="ra-amt">{fmt(r.reorder_level)}</td>
                          <td className="ra-amt" style={{ color:"#DC2626" }}>{fmt(r.available_qty)}</td>
                          <td className="ra-amt" style={{ color:"#DC2626", fontWeight:900 }}>
                            {fmt(Number(r.reorder_level || 0) - Number(r.available_qty || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight: 800, fontSize: 13 }}>Inventory List</span>
                <span className="ra-count">{fInv.length} records</span>
              </div>
              <div className="ra-table-wrap">
                {fInv.length === 0
                  ? <div className="ra-empty">No inventory data found</div>
                  : (
                    <table className="ra-table">
                      <thead><tr>
                        <th>Product</th><th>SKU</th><th>Warehouse</th>
                        <th>Available</th><th>Reserved</th><th>Avg Cost</th><th>Stock Value</th>
                      </tr></thead>
                      <tbody>
                        {fInv.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight:700 }}>{r.product_name || "—"}</td>
                            <td style={{ color:"#8A7A52" }}>{r.sku || "—"}</td>
                            <td>{r.warehouse_name || "—"}</td>
                            <td className="ra-amt">{fmt(r.available_qty)}</td>
                            <td className="ra-amt" style={{ color:"#8A7A52" }}>{fmt(r.reserved_qty)}</td>
                            <td className="ra-amt">{INR(r.average_cost)}</td>
                            <td className="ra-amt" style={{ color:"#7C3AED", fontWeight:900 }}>{INR(r.stock_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>
          </>
        )}

        {/* ── VENDORS ── */}
        {activeTab === "vendors" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Total Vendors",    v:fmt(vs.total_vendors),        c:"#171717" },
                { l:"Active Vendors",   v:fmt(vs.active),               c:"#16A34A" },
                { l:"Purchase Value",   v:INR(vpo.total_purchase_value),c:"#EA580C" },
                { l:"Total Paid",       v:INR(vpy.total_paid),          c:"#2563EB" },
              ].map(({ l, v, c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color: c }}>{v || "—"}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                ["Pending",  vs.pending,  "#854D0E"],
                ["Active",   vs.active,   "#16A34A"],
                ["Inactive", vs.inactive, "#475569"],
                ["Blocked",  vs.blocked,  "#DC2626"],
              ].map(([l,v,c]) => (
                <div key={l} style={{ flex:1, background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace", color:c }}>{fmt(v)}</div>
                  <div style={{ fontSize:11, color:"#8A7A52", fontWeight:600 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight: 800, fontSize: 13 }}>Vendor List</span>
                <span className="ra-count">{fVend.length} vendors</span>
              </div>
              <div className="ra-table-wrap">
                {fVend.length === 0
                  ? <div className="ra-empty">No vendors found</div>
                  : (
                    <table className="ra-table">
                      <thead><tr>
                        <th>Vendor</th><th>Code</th><th>City</th><th>Status</th>
                        <th>Rating</th><th>POs</th><th>PO Value</th><th>Paid</th>
                      </tr></thead>
                      <tbody>
                        {fVend.map((r) => (
                          <tr key={r.id}>
                            <td style={{ fontWeight:700 }}>{r.business_name || "—"}</td>
                            <td style={{ color:"#8A7A52" }}>{r.vendor_code || "—"}</td>
                            <td>{r.city || "—"}</td>
                            <td><Badge s={r.status} /></td>
                            <td style={{ fontWeight:700 }}>{Number(r.rating || 0).toFixed(1)} ★</td>
                            <td>{fmt(r.total_po)}</td>
                            <td className="ra-amt">{INR(r.total_po_value)}</td>
                            <td className="ra-amt" style={{ color:"#16A34A" }}>{INR(r.total_paid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>
          </>
        )}

        {/* ── CUSTOMERS ── */}
        {activeTab === "customers" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Total Customers",    v:fmt(cs.total),                  c:"#171717" },
                { l:"Active Customers",   v:fmt(cs.active),                 c:"#16A34A" },
                { l:"Total Order Value",  v:INR(co.total_order_value),      c:"#2563EB" },
                { l:"Outstanding",        v:INR(ci.total_outstanding),      c:"#DC2626" },
              ].map(({ l,v,c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color:c }}>{v}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                ["Pending",  cs.pending,  "#854D0E"],
                ["Active",   cs.active,   "#16A34A"],
                ["Inactive", cs.inactive, "#475569"],
                ["Blocked",  cs.blocked,  "#DC2626"],
              ].map(([l,v,c]) => (
                <div key={l} style={{ flex:1, background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace", color:c }}>{fmt(v)}</div>
                  <div style={{ fontSize:11, color:"#8A7A52", fontWeight:600 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="ra-panel" style={{ marginBottom:18 }}>
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>Customer List</span>
                <span className="ra-count">{fCust.length} customers</span>
              </div>
              <div className="ra-table-wrap">
                {fCust.length === 0 ? <div className="ra-empty">No customers found</div> : (
                  <table className="ra-table">
                    <thead><tr><th>Customer</th><th>Code</th><th>City</th><th>Phone</th><th>Status</th><th>Orders</th><th>Order Value</th><th>Outstanding</th></tr></thead>
                    <tbody>
                      {fCust.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight:700 }}>{r.business_name || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{r.customer_code || "—"}</td>
                          <td>{r.city || "—"}</td>
                          <td>{r.phone || "—"}</td>
                          <td><Badge s={r.status} /></td>
                          <td>{fmt(r.total_orders)}</td>
                          <td className="ra-amt">{INR(r.total_order_value)}</td>
                          <td className="ra-amt" style={{ color: Number(r.outstanding||0) > 0 ? "#DC2626" : "#16A34A" }}>{INR(r.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>Top Customers by Order Value</span>
                <span className="ra-count">{fTopC.length}</span>
              </div>
              <div className="ra-table-wrap">
                {fTopC.length === 0 ? <div className="ra-empty">No data</div> : (
                  <table className="ra-table">
                    <thead><tr><th>#</th><th>Customer</th><th>Code</th><th>City</th><th>Orders</th><th>Total Value</th></tr></thead>
                    <tbody>
                      {fTopC.map((r, i) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight:900, color:"#C9B96E" }}>{i + 1}</td>
                          <td style={{ fontWeight:700 }}>{r.customer_name || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{r.customer_code || "—"}</td>
                          <td>{r.city || "—"}</td>
                          <td>{fmt(r.order_count)}</td>
                          <td className="ra-amt" style={{ color:"#2563EB" }}>{INR(r.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── WAREHOUSES ── */}
        {activeTab === "warehouses" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Total Warehouses",  v:fmt(whs.total),        c:"#171717" },
                { l:"Active",            v:fmt(whs.active),        c:"#16A34A" },
                { l:"Total Stock Qty",   v:fmt(wst.total_qty),     c:"#2563EB" },
                { l:"Total Stock Value", v:INR(wst.total_value),   c:"#7C3AED" },
              ].map(({ l,v,c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color:c }}>{v}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                ["Total Movements", wmv.total_movements, "#171717"],
                ["Inward",          wmv.inward,          "#16A34A"],
                ["Outward",         wmv.outward,         "#DC2626"],
                ["Unique SKUs",     wst.total_skus,      "#7C3AED"],
              ].map(([l,v,c]) => (
                <div key={l} style={{ flex:1, background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace", color:c }}>{fmt(v)}</div>
                  <div style={{ fontSize:11, color:"#8A7A52", fontWeight:600 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="ra-panel" style={{ marginBottom:18 }}>
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>Warehouse Stock Summary</span>
                <span className="ra-count">{fWh.length} warehouses</span>
              </div>
              <div className="ra-table-wrap">
                {fWh.length === 0 ? <div className="ra-empty">No warehouses found</div> : (
                  <table className="ra-table">
                    <thead><tr><th>Warehouse</th><th>Code</th><th>City</th><th>Status</th><th>SKUs</th><th>Total Qty</th><th>Stock Value</th></tr></thead>
                    <tbody>
                      {fWh.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight:700 }}>{r.warehouse_name || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{r.warehouse_code || "—"}</td>
                          <td>{r.city || "—"}</td>
                          <td><Badge s={r.status} /></td>
                          <td>{fmt(r.product_count)}</td>
                          <td>{fmt(r.total_qty)}</td>
                          <td className="ra-amt" style={{ color:"#7C3AED" }}>{INR(r.stock_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>Stock Movements by Type</span>
                <span className="ra-count">{fMoves.length} rows</span>
              </div>
              <div className="ra-table-wrap">
                {fMoves.length === 0 ? <div className="ra-empty">No movement data</div> : (
                  <table className="ra-table">
                    <thead><tr><th>Warehouse</th><th>Movement Type</th><th>Count</th><th>Total Qty</th></tr></thead>
                    <tbody>
                      {fMoves.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:700 }}>{r.warehouse_name || "—"}</td>
                          <td><Badge s={r.movement_type} /></td>
                          <td>{fmt(r.movement_count)}</td>
                          <td className="ra-amt">{fmt(r.total_qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── DELIVERY ── */}
        {activeTab === "delivery" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Total Deliveries", v:fmt(ds.total),     c:"#171717" },
                { l:"Delivered",        v:fmt(ds.delivered), c:"#16A34A" },
                { l:"In Transit",       v:fmt(ds.in_transit),c:"#7C3AED" },
                { l:"Failed",           v:fmt(ds.failed),    c:"#DC2626" },
              ].map(({ l,v,c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color:c }}>{v}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                ["Pending",   ds.pending,   "#854D0E"],
                ["Assigned",  ds.assigned,  "#2563EB"],
                ["Picked",    ds.picked,    "#7C3AED"],
                ["Cancelled", ds.cancelled, "#DC2626"],
                ["Drivers",   dd.total_drivers, "#171717"],
                ["Available", dd.available, "#16A34A"],
              ].map(([l,v,c]) => (
                <div key={l} style={{ flex:1, background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:16, fontWeight:900, fontFamily:"monospace", color:c }}>{fmt(v)}</div>
                  <div style={{ fontSize:11, color:"#8A7A52", fontWeight:600 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="ra-panel" style={{ marginBottom:18 }}>
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>Delivery List</span>
                <span className="ra-count">{fDel.length} deliveries</span>
              </div>
              <div className="ra-table-wrap">
                {fDel.length === 0 ? <div className="ra-empty">No deliveries found</div> : (
                  <table className="ra-table">
                    <thead><tr><th>Delivery#</th><th>Date</th><th>Status</th><th>Driver</th><th>Customer</th><th>Order#</th></tr></thead>
                    <tbody>
                      {fDel.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight:700 }}>{r.delivery_number || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{String(r.delivery_date||"").slice(0,10) || "—"}</td>
                          <td><Badge s={r.delivery_status} /></td>
                          <td>{r.driver_name || <span style={{ color:"#8A7A52" }}>Unassigned</span>}</td>
                          <td>{r.customer_name || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{r.order_number || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>Driver Performance</span>
                <span className="ra-count">{fDrv.length} drivers</span>
              </div>
              <div className="ra-table-wrap">
                {fDrv.length === 0 ? <div className="ra-empty">No drivers found</div> : (
                  <table className="ra-table">
                    <thead><tr><th>Driver</th><th>Code</th><th>Vehicle</th><th>Status</th><th>Total</th><th>Delivered</th><th>Failed</th></tr></thead>
                    <tbody>
                      {fDrv.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight:700 }}>{r.driver_name || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{r.driver_code || "—"}</td>
                          <td>{r.vehicle_type || "—"}</td>
                          <td><Badge s={r.status} /></td>
                          <td>{fmt(r.total_deliveries)}</td>
                          <td style={{ fontWeight:700, color:"#16A34A" }}>{fmt(r.delivered)}</td>
                          <td style={{ fontWeight:700, color:"#DC2626" }}>{fmt(r.failed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── FINANCE ── */}
        {activeTab === "finance" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"Total Invoiced",   v:INR(fi.total_invoiced),   c:"#171717" },
                { l:"Collected",        v:INR(fi.total_collected),  c:"#16A34A" },
                { l:"Outstanding",      v:INR(fi.total_outstanding),c:"#DC2626" },
                { l:"Net Profit (P&L)", v:INR(finSum.net_profit),   c: Number(finSum.net_profit||0) >= 0 ? "#16A34A" : "#DC2626" },
              ].map(({ l,v,c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color:c }}>{v}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                ["Total Income",        fic.total_income,  "#16A34A"],
                ["Total Expense",       fex.total_expense, "#DC2626"],
                ["Vendor Paid",         fvp.vendor_paid,   "#EA580C"],
                ["Customer Payments",   fp.total_received, "#2563EB"],
              ].map(([l,v,c]) => (
                <div key={l} style={{ flex:1, background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:16, fontWeight:900, fontFamily:"monospace", color:c }}>{INR(v)}</div>
                  <div style={{ fontSize:11, color:"#8A7A52", fontWeight:600 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>P&amp;L — Transactions by Month</span>
                <span className="ra-count">{fPL.length} rows</span>
              </div>
              <div className="ra-table-wrap">
                {fPL.length === 0 ? <div className="ra-empty">No transaction data</div> : (
                  <table className="ra-table">
                    <thead><tr><th>Type</th><th>Year</th><th>Month</th><th>Count</th><th>Total Amount</th></tr></thead>
                    <tbody>
                      {fPL.map((r, i) => (
                        <tr key={i}>
                          <td><Badge s={r.transaction_type} /></td>
                          <td style={{ fontWeight:700 }}>{r.year}</td>
                          <td>{MONTHS[r.month] || r.month}</td>
                          <td>{fmt(r.count)}</td>
                          <td className="ra-amt" style={{ color: r.transaction_type === "income" ? "#16A34A" : r.transaction_type === "expense" ? "#DC2626" : "#171717" }}>{INR(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── GST / TAX ── */}
        {activeTab === "tax" && !loading && (
          <>
            <div className="ra-stats">
              {[
                { l:"GST Invoices",   v:fmt(tg.total_gst_invoices), c:"#171717" },
                { l:"Total Taxable",  v:INR(tg.total_taxable),      c:"#2563EB" },
                { l:"Output GST",     v:INR(taxSum.output_gst),     c:"#EA580C" },
                { l:"Tax Payable",    v:INR(tr3.total_tax_payable), c:"#DC2626" },
              ].map(({ l,v,c }) => (
                <div className="ra-stat" key={l}>
                  <div className="ra-stat-val" style={{ color:c }}>{v}</div>
                  <div className="ra-stat-lbl">{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {[
                ["CGST",        tg.total_cgst,       "#EA580C"],
                ["SGST",        tg.total_sgst,       "#EA580C"],
                ["IGST",        tg.total_igst,       "#7C3AED"],
                ["CESS",        tg.total_cess,       "#854D0E"],
                ["GSTR-1",      tr1.count,           "#2563EB"],
                ["GSTR-3B",     tr3.count,           "#2563EB"],
                ["GSTR-2B",     tr2.count,           "#2563EB"],
              ].map(([l,v,c]) => (
                <div key={l} style={{ flex:1, background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:14, fontWeight:900, fontFamily:"monospace", color:c }}>{typeof v === "number" && v > 1000 ? INR(v) : fmt(v)}</div>
                  <div style={{ fontSize:11, color:"#8A7A52", fontWeight:600 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:14, marginBottom:18 }}>
              {[
                { label:"GSTR-1", count:tr1.count, filed:tr1.filed, color:"#2563EB" },
                { label:"GSTR-3B", count:tr3.count, filed:tr3.filed, color:"#7C3AED" },
                { label:"GSTR-2B", count:tr2.count, filed:"-",       color:"#EA580C" },
              ].map(({ label, count, filed, color }) => (
                <div key={label} style={{ flex:1, background:"#fff", border:"1.5px solid #E8E0C7", borderRadius:14, padding:16 }}>
                  <div style={{ fontSize:13, fontWeight:800, color, marginBottom:8 }}>{label}</div>
                  <div className="ra-row"><span style={{ color:"#8A7A52" }}>Total Records</span><strong>{fmt(count)}</strong></div>
                  <div className="ra-row"><span style={{ color:"#8A7A52" }}>Filed</span><strong style={{ color:"#16A34A" }}>{fmt(filed)}</strong></div>
                </div>
              ))}
            </div>

            <div className="ra-panel">
              <div className="ra-panel-head">
                <span style={{ fontWeight:800, fontSize:13 }}>Tax Transactions</span>
                <span className="ra-count">{fTax.length} records</span>
              </div>
              <div className="ra-table-wrap">
                {fTax.length === 0 ? <div className="ra-empty">No tax transaction data</div> : (
                  <table className="ra-table">
                    <thead><tr><th>Date</th><th>Ref Type</th><th>Ref ID</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total Tax</th></tr></thead>
                    <tbody>
                      {fTax.map((r) => (
                        <tr key={r.id}>
                          <td style={{ color:"#8A7A52" }}>{String(r.transaction_date||"").slice(0,10) || "—"}</td>
                          <td>{r.reference_type || "—"}</td>
                          <td style={{ color:"#8A7A52" }}>{r.reference_id || "—"}</td>
                          <td className="ra-amt">{INR(r.taxable_value)}</td>
                          <td className="ra-amt">{INR(r.cgst_amount)}</td>
                          <td className="ra-amt">{INR(r.sgst_amount)}</td>
                          <td className="ra-amt">{INR(r.igst_amount)}</td>
                          <td className="ra-amt" style={{ color:"#EA580C", fontWeight:900 }}>{INR(r.total_tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </AdminLayout>
  );
}
