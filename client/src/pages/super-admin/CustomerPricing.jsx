import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BadgeCheck,
  Ban,
  Building2,
  CalendarDays,
  Edit3,
  IndianRupee,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

const initialForm = {
  customer_id: "",
  product_id: "",
  price: "",
  min_order_qty: 1,
  effective_from: "",
  effective_to: "",
  status: "active",
};

const numberFormatter = new Intl.NumberFormat("en-IN");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatNumber = (value) => numberFormatter.format(Number(value || 0));
const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const formatDate = (date) => (date ? String(date).slice(0, 10) : "-");

const getStatusKey = (status) => {
  const value = String(status || "active").toLowerCase().trim();

  if (value === "inactive") return "inactive";
  if (value === "blocked") return "blocked";
  if (value === "pending") return "pending";
  return "active";
};

const getStatusLabel = (status) => {
  const value = getStatusKey(status);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default function CustomerPricing() {
  const [pricing, setPricing] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/customer-pricing");

      if (res.data.success) {
        setPricing(res.data.pricing || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch customer pricing");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await API.get("/api/customers");

      if (res.data.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.log("Customers fetch failed:", err.response?.data?.message);
    }
  };

  useEffect(() => {
    fetchPricing();
    fetchCustomers();
  }, []);

  const filteredPricing = useMemo(() => {
    return pricing.filter((item) => {
      const text = `
        ${item.customer_name || ""}
        ${item.product_name || ""}
        ${item.product_id || ""}
        ${item.sku || ""}
        ${item.price || ""}
        ${item.min_order_qty || ""}
        ${item.status || ""}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [pricing, search]);

  const stats = useMemo(() => {
    const activePricing = pricing.filter(
      (item) => getStatusKey(item.status) === "active"
    ).length;

    const inactivePricing = pricing.filter((item) =>
      ["inactive", "blocked"].includes(getStatusKey(item.status))
    ).length;

    const totalPriceValue = pricing.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

    const avgPrice =
      pricing.length > 0 ? totalPriceValue / pricing.length : 0;

    return [
      {
        label: "Pricing Rules",
        value: formatNumber(pricing.length),
        hint: "Total special price rules",
        icon: IndianRupee,
        color: "#D9A900",
      },
      {
        label: "Active Pricing",
        value: formatNumber(activePricing),
        hint: "Currently enabled",
        icon: ShieldCheck,
        color: "#16A34A",
      },
      {
        label: "Inactive Pricing",
        value: formatNumber(inactivePricing),
        hint: "Disabled rules",
        icon: Ban,
        color: "#DC2626",
      },
      {
        label: "Average Price",
        value: formatCurrency(avgPrice),
        hint: "Average special price",
        icon: Package,
        color: "#2563EB",
      },
    ];
  }, [pricing]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openCreateForm = () => {
    setFormData(initialForm);
    setEditingPricingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (item) => {
    setEditingPricingId(item.id);

    setFormData({
      customer_id: item.customer_id || "",
      product_id: item.product_id || "",
      price: item.price || "",
      min_order_qty: item.min_order_qty || 1,
      effective_from: item.effective_from
        ? String(item.effective_from).slice(0, 10)
        : "",
      effective_to: item.effective_to
        ? String(item.effective_to).slice(0, 10)
        : "",
      status: getStatusKey(item.status),
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingPricingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id) {
      setError("Customer is required");
      return;
    }

    if (!formData.product_id) {
      setError("Product ID is required");
      return;
    }

    if (!formData.price) {
      setError("Price is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...formData,
        product_id: Number(formData.product_id || 0),
        price: Number(formData.price || 0),
        min_order_qty: Number(formData.min_order_qty || 1),
        status: getStatusKey(formData.status),
      };

      const res = editingPricingId
        ? await API.put(`/api/customer-pricing/${editingPricingId}`, payload)
        : await API.post("/api/customer-pricing", payload);

      if (res.data.success) {
        setFormData(initialForm);
        setEditingPricingId(null);
        setShowForm(false);
        fetchPricing();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingPricingId
            ? "Failed to update customer pricing"
            : "Failed to create customer pricing")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this pricing?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/customer-pricing/${id}`);
      fetchPricing();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deactivate pricing");
    }
  };

  return (
    <AdminLayout>
      <style>{css}</style>

      <div className="pricing-page pricing-command-page">
        <section className="pricing-hero">
          <div className="hero-grid-pattern" />
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-left">
            <div className="hero-icon">
              <IndianRupee size={28} />
            </div>

            <div className="hero-copy">
              <div className="hero-kicker">
                <span />
                Customer Price Control
              </div>

              <h1>Customer Pricing</h1>

              <p>
                Set customer-wise special product pricing, minimum order
                quantity and effective date range for B2B pricing control.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              className="pricing-secondary-btn"
              type="button"
              onClick={fetchPricing}
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              Refresh
            </button>

            <button
              className="pricing-primary-btn"
              type="button"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Add Pricing
            </button>
          </div>
        </section>

        <section className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="stat-card" key={stat.label}>
                <div className="stat-top">
                  <div
                    className="stat-icon"
                    style={{
                      background: `${stat.color}16`,
                      color: stat.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="stat-line" style={{ background: stat.color }} />
                </div>

                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
                <span>{stat.hint}</span>
              </div>
            );
          })}
        </section>

        {error && (
          <div className="error-box">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        {showForm && (
          <section className="form-card">
            <div className="form-header">
              <div>
                <span className="section-label">
                  {editingPricingId ? "Update Pricing Rule" : "Create Pricing Rule"}
                </span>

                <h2>{editingPricingId ? "Edit Pricing" : "Add New Pricing"}</h2>

                <p>
                  Select customer, enter product ID, special price, MOQ,
                  effective date range and active status.
                </p>
              </div>

              <button
                className="close-btn"
                type="button"
                onClick={handleCancelForm}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer *</label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Customer</option>

                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.business_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Product ID *</label>
                  <input
                    type="number"
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleChange}
                    placeholder="Enter product ID"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Special Price *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="92"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Minimum Order Qty</label>
                  <input
                    type="number"
                    name="min_order_qty"
                    value={formData.min_order_qty}
                    onChange={handleChange}
                    placeholder="5"
                  />
                </div>

                <div className="form-group">
                  <label>Effective From</label>
                  <input
                    type="date"
                    name="effective_from"
                    value={formData.effective_from}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Effective To</label>
                  <input
                    type="date"
                    name="effective_to"
                    value={formData.effective_to}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={`status-select status-select-${getStatusKey(
                      formData.status
                    )}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-note">
                <Package size={15} />
                Product dropdown will be added after Product Management module
                is completed. For now, enter product ID manually.
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="pricing-secondary-btn form-secondary"
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="pricing-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingPricingId
                    ? "Update Pricing"
                    : "Save Pricing"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, product, SKU, price or status..."
            />
          </div>

          <div className="toolbar-count">
            Showing <strong>{filteredPricing.length}</strong> of{" "}
            <strong>{pricing.length}</strong> pricing rules
          </div>
        </section>

        <section className="table-card">
          <div className="table-header">
            <div>
              <span className="section-label">Pricing Database</span>
              <h2>Customer Pricing List</h2>
              <p>Customer-wise product pricing rules from MySQL database</p>
            </div>

            <div className="table-chip">
              <Building2 size={14} />
              Live Records
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <div className="empty-icon">
                <RefreshCw size={24} className="spin" />
              </div>

              <div>
                <h3>Loading pricing...</h3>
                <p>Please wait while pricing records are loading.</p>
              </div>
            </div>
          ) : filteredPricing.length === 0 ? (
            <div className="empty-box">
              <div className="empty-icon">
                <IndianRupee size={24} />
              </div>

              <div>
                <h3>No pricing found</h3>
                <p>Click Add Pricing to create customer-wise special price.</p>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Special Price</th>
                    <th>MOQ</th>
                    <th>Effective Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPricing.map((item) => {
                    const statusKey = getStatusKey(item.status);

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="customer-main">
                            <div className="customer-avatar">
                              {(item.customer_name || "CU")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <div className="strong-text">
                                {item.customer_name ||
                                  `Customer ID: ${item.customer_id}`}
                              </div>

                              <div className="small-text">Customer Pricing</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="product-main">
                            <div className="product-icon">
                              <Package size={16} />
                            </div>

                            <div>
                              <div className="strong-text">
                                {item.product_name ||
                                  `Product ID: ${item.product_id}`}
                              </div>

                              <div className="small-text">
                                SKU: {item.sku || "-"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="price-text">
                            {formatCurrency(item.price)}
                          </div>
                        </td>

                        <td>
                          <div className="moq-pill">
                            <ShoppingCart size={13} />
                            {item.min_order_qty || 1}
                          </div>
                        </td>

                        <td>
                          <div className="date-row">
                            <CalendarDays size={14} />
                            <span>From: {formatDate(item.effective_from)}</span>
                          </div>

                          <div className="small-text">
                            To: {formatDate(item.effective_to)}
                          </div>
                        </td>

                        <td>
                          <span className={`status-badge status-${statusKey}`}>
                            {statusKey === "active" ? (
                              <BadgeCheck size={13} />
                            ) : (
                              <Ban size={13} />
                            )}
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              className="edit-btn"
                              type="button"
                              onClick={() => handleEdit(item)}
                              title="Edit Pricing"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              className="delete-btn"
                              type="button"
                              onClick={() => handleDeactivate(item.id)}
                              title="Deactivate Pricing"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  .pricing-command-page {
    --page-text: #171717;
    --page-muted: #6B7280;
    --page-soft: #8A7A52;
    --page-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.20), transparent 28%),
      radial-gradient(circle at bottom right, rgba(17, 24, 39, 0.06), transparent 30%),
      linear-gradient(135deg, #FFFDF6 0%, #FFF8E1 45%, #F7EBC5 100%);
    --card-bg: rgba(255, 255, 255, 0.96);
    --card-bg-strong: #FFFFFF;
    --card-border: rgba(232, 224, 199, 0.95);
    --input-bg: #FFFFFF;
    --input-border: rgba(17, 24, 39, 0.10);
    --table-head: #FFF9E8;
    --table-row-hover: rgba(255, 210, 30, 0.10);
    --shadow: 0 18px 48px rgba(17, 24, 39, 0.08);
    --shadow-hover: 0 24px 68px rgba(17, 24, 39, 0.13);

    min-height: 100vh;
    color: var(--page-text);
    background: var(--page-bg);
    padding: 8px;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  .theme-dark .pricing-command-page {
    --page-text: #F8FAFC;
    --page-muted: rgba(255, 255, 255, 0.62);
    --page-soft: rgba(255, 255, 255, 0.46);
    --page-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.12), transparent 32%),
      radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.05), transparent 30%),
      linear-gradient(135deg, #07090F 0%, #0F172A 48%, #111827 100%);
    --card-bg: rgba(255, 255, 255, 0.055);
    --card-bg-strong: rgba(8, 10, 18, 0.86);
    --card-border: rgba(255, 255, 255, 0.09);
    --input-bg: rgba(255, 255, 255, 0.06);
    --input-border: rgba(255, 255, 255, 0.10);
    --table-head: rgba(255, 255, 255, 0.055);
    --table-row-hover: rgba(255, 210, 30, 0.08);
    --shadow: 0 18px 52px rgba(0, 0, 0, 0.24);
    --shadow-hover: 0 28px 76px rgba(0, 0, 0, 0.34);
  }

  .pricing-hero {
    position: relative;
    overflow: hidden;
    min-height: 210px;
    border-radius: 30px;
    padding: 28px 32px;
    margin-bottom: 22px;
    background:
      linear-gradient(135deg, #121316 0%, #202126 54%, #0B0C0E 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.10) !important;
    box-shadow:
      0 20px 56px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }

  .hero-grid-pattern {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.42;
    pointer-events: none;
  }

  .pricing-hero::after {
    content: '';
    position: absolute;
    left: 32px;
    right: 32px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 210, 30, 0.75),
      transparent
    );
  }

  .hero-glow {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-glow-one {
    width: 210px;
    height: 210px;
    right: -70px;
    top: -92px;
    background: #FFD21E;
    opacity: 0.95;
    box-shadow: 0 0 80px rgba(255, 210, 30, 0.38);
  }

  .hero-glow-two {
    width: 96px;
    height: 96px;
    right: 135px;
    bottom: -38px;
    border: 18px solid rgba(255, 210, 30, 0.14);
  }

  .hero-left {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    max-width: 830px;
  }

  .hero-icon {
    width: 62px;
    height: 62px;
    border-radius: 22px;
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16px 36px rgba(255, 210, 30, 0.25);
    flex-shrink: 0;
  }

  .hero-copy {
    min-width: 0;
  }

  .hero-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(255, 210, 30, 0.25);
    background: rgba(255, 210, 30, 0.09);
    color: #FFD21E;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .hero-kicker span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #FFD21E;
    box-shadow: 0 0 0 5px rgba(255, 210, 30, 0.13);
  }

  .pricing-hero h1 {
    margin: 0;
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(29px, 3vw, 42px);
    line-height: 1.04;
    font-weight: 800;
    letter-spacing: -1px;
    color: #FFFFFF !important;
  }

  .pricing-hero p {
    max-width: 760px;
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.66) !important;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.7;
  }

  .hero-actions {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .pricing-primary-btn,
  .pricing-secondary-btn {
    min-height: 44px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0 16px;
    border: none;
    font-family: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .pricing-primary-btn {
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    box-shadow: 0 12px 28px rgba(255, 210, 30, 0.24);
  }

  .pricing-secondary-btn {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .form-secondary {
    background: var(--input-bg);
    color: var(--page-text);
    border: 1px solid var(--input-border);
  }

  .pricing-primary-btn:hover,
  .pricing-secondary-btn:hover {
    transform: translateY(-2px);
  }

  .pricing-primary-btn:disabled,
  .pricing-secondary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card {
    position: relative;
    overflow: hidden;
    min-height: 142px;
    border-radius: 24px;
    padding: 18px;
    background: var(--card-bg) !important;
    border: 1px solid var(--card-border) !important;
    box-shadow: var(--shadow) !important;
    backdrop-filter: blur(18px);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-hover) !important;
    border-color: rgba(255, 210, 30, 0.35) !important;
  }

  .stat-card::after {
    content: '';
    position: absolute;
    width: 105px;
    height: 105px;
    right: -48px;
    bottom: -48px;
    border-radius: 50%;
    background: rgba(255, 210, 30, 0.13);
  }

  .stat-top {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 17px;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-line {
    width: 36px;
    height: 6px;
    border-radius: 999px;
    margin-top: 8px;
  }

  .stat-card h3 {
    position: relative;
    z-index: 1;
    margin: 0;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.8px;
    color: var(--page-text) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-card p {
    position: relative;
    z-index: 1;
    margin: 7px 0 0;
    color: var(--page-muted) !important;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.65px;
  }

  .stat-card span {
    position: relative;
    z-index: 1;
    display: block;
    margin-top: 6px;
    color: var(--page-soft);
    font-size: 11px;
    font-weight: 700;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    padding: 13px 15px;
    border-radius: 18px;
    background: rgba(239, 68, 68, 0.10);
    border: 1px solid rgba(239, 68, 68, 0.22);
    color: #EF4444;
    font-size: 13px;
    font-weight: 800;
  }

  .theme-dark .error-box {
    color: #FCA5A5;
  }

  .form-card,
  .toolbar,
  .table-card {
    background: var(--card-bg-strong) !important;
    border: 1px solid var(--card-border) !important;
    box-shadow: var(--shadow) !important;
    backdrop-filter: blur(18px);
  }

  .form-card {
    border-radius: 28px;
    padding: 24px;
    margin-bottom: 22px;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

  .section-label {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: rgba(255, 210, 30, 0.12);
    border: 1px solid rgba(255, 210, 30, 0.24);
    color: #D9A900;
    padding: 6px 10px;
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .theme-dark .section-label {
    color: #FFD21E;
  }

  .form-header h2,
  .table-header h2 {
    margin: 0;
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: 23px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--page-text) !important;
  }

  .form-header p,
  .table-header p {
    margin: 5px 0 0;
    color: var(--page-muted) !important;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.6;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--page-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 900;
    color: var(--page-text) !important;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    min-height: 46px;
    border: 1.5px solid var(--input-border) !important;
    border-radius: 15px;
    padding: 12px 14px;
    background: var(--input-bg) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    font-weight: 750;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-group input::placeholder {
    color: var(--page-soft);
  }

  .form-group input:focus,
  .form-group select:focus {
    border-color: rgba(255, 210, 30, 0.75) !important;
    box-shadow: 0 0 0 4px rgba(255, 210, 30, 0.12);
  }

  .theme-dark .form-group select option {
    background: #0F172A;
    color: #F8FAFC;
  }

  .theme-light .form-group select option {
    background: #FFFFFF;
    color: #111827;
  }

  input[type="date"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.65;
  }

  .theme-dark input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }

  .status-select {
    font-weight: 900 !important;
  }

  .status-select-active {
    color: #16A34A !important;
  }

  .status-select-inactive,
  .status-select-blocked {
    color: #DC2626 !important;
  }

  .theme-dark .status-select-active {
    background: rgba(22, 163, 74, 0.10) !important;
    border-color: rgba(22, 163, 74, 0.28) !important;
    color: #4ADE80 !important;
  }

  .theme-dark .status-select-inactive,
  .theme-dark .status-select-blocked {
    background: rgba(220, 38, 38, 0.10) !important;
    border-color: rgba(220, 38, 38, 0.28) !important;
    color: #FCA5A5 !important;
  }

  .form-note {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 14px;
    background: rgba(255, 210, 30, 0.10);
    border: 1px solid rgba(255, 210, 30, 0.24);
    color: #8A6A00;
    padding: 12px 14px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.5;
  }

  .theme-dark .form-note {
    color: #FFD21E;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
  }

  .toolbar {
    border-radius: 24px;
    padding: 16px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .search-wrap {
    max-width: 520px;
    width: 100%;
    min-height: 46px;
    border-radius: 16px;
    background: var(--input-bg) !important;
    border: 1px solid var(--input-border) !important;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    color: var(--page-muted);
  }

  .search-wrap input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--page-text);
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .search-wrap input::placeholder {
    color: var(--page-soft);
  }

  .toolbar-count {
    color: var(--page-muted);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .toolbar-count strong {
    color: var(--page-text);
    font-weight: 900;
  }

  .table-card {
    border-radius: 28px;
    padding: 22px;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .table-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 210, 30, 0.12);
    border: 1px solid rgba(255, 210, 30, 0.24);
    color: #D9A900;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }

  .theme-dark .table-chip {
    color: #FFD21E;
  }

  .table-wrap {
    overflow-x: auto;
    border-radius: 20px;
    border: 1px solid var(--card-border);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1060px;
    background: var(--card-bg-strong) !important;
  }

  th {
    background: var(--table-head) !important;
    color: var(--page-soft) !important;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.55px;
    text-align: left;
    padding: 15px 14px;
    border-bottom: 1px solid var(--card-border) !important;
    font-weight: 900;
  }

  td {
    padding: 16px 14px;
    border-bottom: 1px solid var(--card-border) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    vertical-align: top;
    font-weight: 700;
  }

  tbody tr {
    transition: background 0.18s ease;
  }

  tbody tr:hover {
    background: var(--table-row-hover) !important;
  }

  tbody tr:last-child td {
    border-bottom: none !important;
  }

  .customer-main,
  .product-main {
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }

  .customer-avatar {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .product-icon {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: rgba(37, 99, 235, 0.12);
    color: #2563EB;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .theme-dark .product-icon {
    color: #93C5FD;
  }

  .strong-text {
    color: var(--page-text) !important;
    font-weight: 900;
  }

  .small-text {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--page-muted) !important;
    font-size: 12px;
    margin-top: 6px;
    font-weight: 700;
    line-height: 1.35;
  }

  .price-text {
    font-size: 15px;
    font-weight: 900;
    color: #16A34A;
    white-space: nowrap;
  }

  .theme-dark .price-text {
    color: #4ADE80;
  }

  .moq-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 900;
    background: rgba(37, 99, 235, 0.12);
    color: #2563EB;
    border: 1px solid rgba(37, 99, 235, 0.22);
    white-space: nowrap;
  }

  .theme-dark .moq-pill {
    color: #93C5FD;
  }

  .date-row {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--page-text);
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 900;
    text-transform: capitalize;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .status-badge.status-active {
    background: rgba(22, 163, 74, 0.12) !important;
    color: #16A34A !important;
    border-color: rgba(22, 163, 74, 0.24) !important;
  }

  .status-badge.status-inactive,
  .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.12) !important;
    color: #DC2626 !important;
    border-color: rgba(220, 38, 38, 0.24) !important;
  }

  .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.12) !important;
    color: #EA580C !important;
    border-color: rgba(234, 88, 12, 0.24) !important;
  }

  .theme-dark .status-badge.status-active {
    background: rgba(22, 163, 74, 0.16) !important;
    color: #4ADE80 !important;
    border-color: rgba(74, 222, 128, 0.28) !important;
  }

  .theme-dark .status-badge.status-inactive,
  .theme-dark .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.16) !important;
    color: #FCA5A5 !important;
    border-color: rgba(252, 165, 165, 0.28) !important;
  }

  .theme-dark .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.16) !important;
    color: #FDBA74 !important;
    border-color: rgba(251, 186, 116, 0.28) !important;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .edit-btn:hover,
  .delete-btn:hover {
    transform: translateY(-2px);
  }

  .edit-btn {
    background: rgba(255, 210, 30, 0.16);
    color: #D9A900;
  }

  .delete-btn {
    background: rgba(220, 38, 38, 0.12);
    color: #DC2626;
  }

  .theme-dark .edit-btn {
    color: #FFD21E;
  }

  .theme-dark .delete-btn {
    background: rgba(220, 38, 38, 0.18);
    color: #FCA5A5;
  }

  .empty-box {
    min-height: 210px;
    border: 1px dashed var(--card-border);
    border-radius: 22px;
    background: rgba(255, 210, 30, 0.045);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: left;
    padding: 28px;
  }

  .empty-icon {
    width: 54px;
    height: 54px;
    border-radius: 19px;
    background: rgba(255, 210, 30, 0.14);
    color: #D9A900;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .theme-dark .empty-icon {
    color: #FFD21E;
  }

  .empty-box h3 {
    margin: 0;
    color: var(--page-text);
    font-size: 18px;
    font-weight: 900;
  }

  .empty-box p {
    margin: 7px 0 0;
    color: var(--page-muted);
    font-size: 13px;
    font-weight: 700;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1180px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .pricing-hero {
      flex-direction: column;
    }

    .hero-actions {
      justify-content: flex-start;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .pricing-command-page {
      padding: 0;
    }

    .pricing-hero {
      border-radius: 24px;
      padding: 24px;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions {
      width: 100%;
    }

    .hero-actions .pricing-primary-btn,
    .hero-actions .pricing-secondary-btn {
      flex: 1;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .toolbar-count {
      white-space: normal;
    }

    .table-header {
      flex-direction: column;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .form-actions .pricing-primary-btn,
    .form-actions .pricing-secondary-btn {
      width: 100%;
    }

    .pricing-hero h1 {
      font-size: 28px;
    }

    .empty-box {
      flex-direction: column;
      text-align: center;
    }
  }
`;