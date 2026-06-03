import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import API from "../../api/axios";
import AdminLayout from "../../components/layout/AdminLayout";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

const moduleMap = {
  vendors: {
    type: "vendors",
    title: "Vendors",
    subtitle: "Manage supplier onboarding, documents and performance.",
    description: "Create and manage vendor profiles, GST details, bank accounts, contact persons and procurement relationships.",
    features: [
      { title: "Vendor Profiles", text: "Store business details, contact information, GST, PAN and location data." },
      { title: "Documents", text: "Track document uploads, verification status and approval notes." },
      { title: "Performance", text: "Review ratings, purchase history, wallet balance and ledger activity." },
    ],
  },
  customers: {
    type: "customers",
    title: "Customers",
    subtitle: "Manage B2B accounts, pricing and credit limits.",
    description: "Centralize customer businesses, address books, custom pricing, credit limits and account status.",
    features: [
      { title: "Customer Accounts", text: "Maintain customer business profiles, GST details and primary contacts." },
      { title: "Credit Control", text: "Configure customer credit limits, credit days and approval workflows." },
      { title: "Pricing", text: "Manage customer-wise product pricing and group discounts." },
    ],
  },
  products: {
    type: "products",
    title: "Products",
    subtitle: "Manage catalogue, categories, units and variants.",
    description: "Build a clean product master with categories, brands, units, HSN codes, tax rates and pricing.",
    features: [
      { title: "Product Master", text: "Create products with SKU, barcode, HSN, base price and purchase price." },
      { title: "Categories", text: "Organize products using categories, subcategories, brands and units." },
      { title: "Variants", text: "Prepare product variants for inventory and order workflows." },
    ],
  },
  procurement: {
    type: "procurement",
    title: "Procurement",
    subtitle: "Manage purchase orders and receiving workflows.",
    description: "Track vendor quotations, purchase orders, GRN entries and procurement approval stages.",
    features: [
      { title: "Purchase Orders", text: "Create and monitor vendor purchase orders from draft to completion." },
      { title: "GRN", text: "Record received goods, accepted quantities, rejected stock and remarks." },
      { title: "Approvals", text: "Prepare procurement review and approval workflows for your team." },
    ],
  },
  warehouse: {
    type: "warehouse",
    title: "Warehouse",
    subtitle: "Manage stock, batches, locations and expiry.",
    description: "Control warehouses, zones, racks, bins, stock quantities, batches, movements and low-stock alerts.",
    features: [
      { title: "Locations", text: "Maintain warehouses, zones, racks, bins and staff assignments." },
      { title: "Inventory", text: "Track available, reserved and damaged stock across locations." },
      { title: "Batches", text: "Monitor batch numbers, expiry dates, cost price and stock status." },
    ],
  },
  orders: {
    type: "orders",
    title: "Orders",
    subtitle: "Manage order processing and fulfillment.",
    description: "Handle customer orders, split fulfillment, payment status, packing, dispatch, delivery and returns.",
    features: [
      { title: "Order Lifecycle", text: "Track orders from pending to delivered, cancelled or returned." },
      { title: "Items", text: "Manage item quantities, unit prices, taxes and fulfillment status." },
      { title: "Returns", text: "Prepare return, refund and status history workflows." },
    ],
  },
  delivery: {
    type: "delivery",
    title: "Delivery",
    subtitle: "Manage dispatch, tracking and delivery proof.",
    description: "Assign drivers, plan delivery routes, track statuses and capture signatures, photos, OTP or documents.",
    features: [
      { title: "Driver Assignment", text: "Assign deliveries to available drivers and track acceptance." },
      { title: "Routes", text: "Plan route dates, locations, distance and completion status." },
      { title: "Proof", text: "Capture proof of delivery with recipient details and attachments." },
    ],
  },
  finance: {
    type: "finance",
    title: "Finance",
    subtitle: "Manage invoices, payments and ledger entries.",
    description: "Review sales and purchase invoices, payments, outstanding balances, customer ledgers and vendor ledgers.",
    features: [
      { title: "Invoices", text: "Create and monitor invoice totals, tax, paid amount and balance." },
      { title: "Payments", text: "Track payment mode, transaction reference and payment status." },
      { title: "Ledgers", text: "Prepare customer and vendor debit-credit ledger views." },
    ],
  },
  gst: {
    type: "gst",
    title: "GST Reports",
    subtitle: "Manage GST invoices and return reports.",
    description: "Prepare GST invoice data, GST rates, GSTR-1, GSTR-3B, GSTR-2B and tax settings.",
    features: [
      { title: "GST Invoices", text: "Connect sales invoices with GST invoice numbers and tax breakup." },
      { title: "Returns", text: "Prepare GSTR report periods, filing status and summaries." },
      { title: "Settings", text: "Maintain legal name, GST number and tax configuration." },
    ],
  },
  analytics: {
    type: "analytics",
    title: "Analytics",
    subtitle: "View operational and business insights.",
    description: "Track sales, inventory, vendor, customer and delivery performance with dashboard-ready insights.",
    features: [
      { title: "Sales Insights", text: "Analyze revenue, orders, customers and product movement." },
      { title: "Inventory Reports", text: "Monitor stock value, low stock, expiry and warehouse trends." },
      { title: "Operations", text: "Review vendor, delivery and fulfillment performance metrics." },
    ],
  },
  settings: {
    type: "settings",
    title: "Settings",
    subtitle: "Manage system configuration and access.",
    description: "Configure company profile, roles, permissions, notifications, GST settings and platform preferences.",
    features: [
      { title: "Company Profile", text: "Maintain business identity, address, tax and contact settings." },
      { title: "Access Control", text: "Prepare role, permission and staff access management." },
      { title: "Preferences", text: "Manage notifications, security and module-level settings." },
    ],
  },
};

const iconMap = {
  vendors: Building2,
  customers: Users,
  products: Package,
  procurement: ClipboardList,
  warehouse: Warehouse,
  orders: ShoppingCart,
  delivery: Truck,
  finance: ReceiptText,
  gst: FileText,
  analytics: BarChart3,
  settings: Settings,
};

const defaultFormData = {
  name: "",
  email: "",
  phone: "",
  status: "active",
  notes: "",
};

const vendorFormData = {
  user_id: "",
  vendor_code: "",
  business_name: "",
  contact_person: "",
  email: "",
  phone: "",
  gst_number: "",
  pan_number: "",
  category_id: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  credit_days: "",
  rating: "",
  status: "pending",
};

export default function ModulePage() {
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const config = useMemo(() => {
    const moduleKey = location.pathname.split("/").filter(Boolean).pop();
    return moduleMap[moduleKey] || moduleMap.vendors;
  }, [location.pathname]);

  const isVendorModule = config.type === "vendors";
  const initialFormData = isVendorModule ? vendorFormData : defaultFormData;
  const [formData, setFormData] = useState(initialFormData);
  const Icon = iconMap[config.type] || Building2;

  const loadVendors = async () => {
    if (!isVendorModule) return;

    try {
      setLoadingRecords(true);
      const res = await API.get("/api/vendors");
      if (res.data.success) {
        setRecords(res.data.vendors || []);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    setRecords([]);
    setFormData(initialFormData);
    setShowForm(false);
    setMessage("");
    loadVendors();
  }, [config.type]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveRecord();
  };

  const saveRecord = async () => {
    try {
      setSaving(true);
      setMessage("");

      if (isVendorModule) {
        const res = await API.post("/api/vendors", formData);
        if (res.data.success) {
          setMessage("Vendor saved successfully");
          await loadVendors();
        }
      } else {
        setRecords([{ ...formData, id: Date.now() }, ...records]);
      }

      setFormData(initialFormData);
      setShowForm(false);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="module-page">
        <style>{css}</style>

        <div className="module-hero">
          <div className="module-title-wrap">
            <div className="module-icon">
              <Icon size={28} />
            </div>

            <div>
              <h1>{config.title}</h1>
              <p>{config.description}</p>
            </div>
          </div>

          <button className="primary-btn" type="button" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            Add New
          </button>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input placeholder={`Search ${config.title.toLowerCase()}...`} />
          </div>

          <div className={isVendorModule ? "status-chip connected" : "status-chip"}>
            {isVendorModule ? "API Connected" : "Backend API Pending"}
          </div>
        </div>

        {message && <div className="message-box">{message}</div>}

        {showForm && (
          <form className="module-form" onSubmit={handleSubmit}>
            <div className="form-head">
              <div>
                <h2>Add {config.title}</h2>
                <p>{isVendorModule ? "This form saves directly to the vendors backend API." : "This form is frontend-ready. Backend save API can be connected next."}</p>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>

            {isVendorModule ? (
              <div className="form-grid">
                <label>User ID<input name="user_id" type="number" value={formData.user_id} onChange={handleChange} placeholder="Optional user ID" /></label>
                <label>Vendor Code<input name="vendor_code" value={formData.vendor_code} onChange={handleChange} placeholder="VEN-001" /></label>
                <label>Business Name<input name="business_name" value={formData.business_name} onChange={handleChange} placeholder="Business name" required /></label>
                <label>Contact Person<input name="contact_person" value={formData.contact_person} onChange={handleChange} placeholder="Contact person" /></label>
                <label>Email<input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="vendor@example.com" /></label>
                <label>Phone<input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" /></label>
                <label>GST Number<input name="gst_number" value={formData.gst_number} onChange={handleChange} placeholder="GST number" /></label>
                <label>PAN Number<input name="pan_number" value={formData.pan_number} onChange={handleChange} placeholder="PAN number" /></label>
                <label>Category ID<input name="category_id" type="number" value={formData.category_id} onChange={handleChange} placeholder="Category ID" /></label>
                <label>City<input name="city" value={formData.city} onChange={handleChange} placeholder="City" /></label>
                <label>State<input name="state" value={formData.state} onChange={handleChange} placeholder="State" /></label>
                <label>Pincode<input name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Pincode" /></label>
                <label>Credit Days<input name="credit_days" type="number" value={formData.credit_days} onChange={handleChange} placeholder="0" /></label>
                <label>Rating<input name="rating" type="number" step="0.01" min="0" max="5" value={formData.rating} onChange={handleChange} placeholder="0.00" /></label>
                <label>
                  Status
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </label>
                <label className="wide-field">Address<textarea name="address" value={formData.address} onChange={handleChange} placeholder="Vendor address" rows="3" /></label>
              </div>
            ) : (
              <div className="form-grid">
                <label>Name<input name="name" value={formData.name} onChange={handleChange} placeholder={`${config.title} name`} required /></label>
                <label>Email<input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" /></label>
                <label>Phone<input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" /></label>
                <label>
                  Status
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="wide-field">Notes<textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Add short notes..." rows="3" /></label>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? "Saving..." : `Save ${config.title}`}
              </button>
            </div>
          </form>
        )}

        <div className="feature-grid">
          {config.features.map((item) => (
            <div className="feature-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>

        <div className="empty-table">
          <div className="table-header">
            <div>
              <h2>{config.title} List</h2>
              <p>{config.subtitle}</p>
            </div>

            <ArrowUpRight size={20} color="#999" />
          </div>

          <div className="empty-box">
            <div>
              {loadingRecords ? (
                <>
                  <h3>Loading records...</h3>
                  <p>Please wait while vendor data is fetched from backend.</p>
                </>
              ) : records.length ? (
                <div className="record-list">
                  {records.map((record) => (
                    <div className="record-row" key={record.id}>
                      <div>
                        <h3>{record.business_name || record.name}</h3>
                        <p>
                          {record.vendor_code ? `${record.vendor_code} · ` : ""}
                          {record.contact_person || record.email || "No contact"} · {record.phone || "No phone"}
                        </p>
                      </div>
                      <span>{record.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <h3>No records available</h3>
                  <p>
                    Click Add New to open the form. Backend API integration can be connected next.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const css = `
  .module-page { color: #151515; }
  .module-hero { background: radial-gradient(circle at top right, rgba(232,119,58,0.18), transparent 32%), linear-gradient(135deg, #ffffff, #fff8f3); border: 1px solid #f1ded2; border-radius: 28px; padding: 30px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 22px; align-items: flex-start; box-shadow: 0 8px 28px rgba(0,0,0,0.045); }
  .module-title-wrap { display: flex; gap: 18px; align-items: flex-start; }
  .module-icon { width: 58px; height: 58px; border-radius: 19px; background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 30px rgba(232,119,58,0.28); flex-shrink: 0; }
  .module-hero h1 { margin: 0; font-size: 30px; font-weight: 950; letter-spacing: -0.8px; color: #111; }
  .module-hero p { margin: 9px 0 0; color: #777; font-size: 14px; line-height: 1.7; max-width: 760px; }
  .primary-btn { border: none; background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; height: 46px; padding: 0 18px; border-radius: 15px; display: flex; align-items: center; gap: 9px; font-weight: 900; cursor: pointer; box-shadow: 0 12px 26px rgba(232,119,58,0.25); white-space: nowrap; }
  .toolbar { background: #fff; border: 1px solid #ececec; border-radius: 22px; padding: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; gap: 16px; align-items: center; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
  .search-wrap { max-width: 420px; width: 100%; height: 46px; border-radius: 15px; background: #f7f7f7; border: 1px solid #eeeeee; display: flex; align-items: center; gap: 10px; padding: 0 14px; color: #888; }
  .search-wrap input { width: 100%; border: none; outline: none; background: transparent; font-size: 13px; font-weight: 700; }
  .status-chip { background: #fff4ee; color: #E8773A; border-radius: 999px; padding: 10px 14px; font-size: 13px; font-weight: 900; }
  .status-chip.connected { background: #ecfdf5; color: #059669; }
  .message-box { margin: -6px 0 18px; background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; border-radius: 14px; padding: 12px 14px; font-size: 13px; font-weight: 800; }
  .module-form { background: #fff; border: 1px solid #ececec; border-radius: 24px; padding: 24px; margin-bottom: 22px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
  .form-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
  .form-head h2 { margin: 0; font-size: 20px; font-weight: 950; color: #111; }
  .form-head p { margin: 5px 0 0; color: #777; font-size: 13px; }
  .ghost-btn { border: 1px solid #eeeeee; background: #fafafa; color: #555; height: 40px; padding: 0 14px; border-radius: 13px; font-weight: 900; cursor: pointer; }
  .form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .form-grid label { display: flex; flex-direction: column; gap: 8px; color: #555; font-size: 12px; font-weight: 900; }
  .form-grid input, .form-grid select, .form-grid textarea { border: 1px solid #eeeeee; background: #fafafa; border-radius: 14px; min-height: 46px; padding: 0 13px; outline: none; color: #151515; font: inherit; font-size: 13px; font-weight: 700; }
  .form-grid textarea { padding: 13px; resize: vertical; }
  .wide-field { grid-column: 1 / -1; }
  .form-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
  .feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-bottom: 24px; }
  .feature-card { background: #fff; border: 1px solid #ececec; border-radius: 22px; padding: 22px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
  .feature-card h3 { margin: 0; font-size: 16px; font-weight: 950; color: #111; }
  .feature-card p { margin: 8px 0 0; color: #777; font-size: 13px; line-height: 1.6; }
  .empty-table { background: #fff; border: 1px solid #ececec; border-radius: 24px; padding: 28px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
  .table-header { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 18px; }
  .table-header h2 { margin: 0; font-size: 20px; font-weight: 950; color: #111; }
  .table-header p { margin: 5px 0 0; color: #777; font-size: 13px; }
  .empty-box { min-height: 210px; border: 1px dashed #dddddd; border-radius: 20px; background: #fafafa; display: flex; align-items: center; justify-content: center; text-align: center; padding: 28px; }
  .empty-box h3 { margin: 0; font-size: 18px; font-weight: 950; color: #111; }
  .empty-box p { margin: 9px 0 0; color: #777; font-size: 13px; line-height: 1.6; }
  .record-list { width: min(100%, 920px); display: grid; gap: 10px; }
  .record-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; text-align: left; background: #fff; border: 1px solid #eeeeee; border-radius: 16px; padding: 14px 16px; }
  .record-row h3 { font-size: 15px; }
  .record-row p { margin-top: 4px; }
  .record-row span { text-transform: capitalize; background: #ecfdf5; color: #059669; border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 900; }
  @media (max-width: 1000px) { .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .module-hero { flex-direction: column; } }
  @media (max-width: 640px) { .feature-grid, .form-grid { grid-template-columns: 1fr; } .toolbar, .form-head { flex-direction: column; align-items: stretch; } .module-title-wrap { flex-direction: column; } .module-hero h1 { font-size: 25px; } }
`;
