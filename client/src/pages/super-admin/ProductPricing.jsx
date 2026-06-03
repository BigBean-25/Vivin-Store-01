import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BadgeCheck,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Edit3,
  IndianRupee,
  Layers3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";

const initialForm = {
  product_id: "",
  variant_id: "",
  price_type: "retail",
  customer_group_id: "",
  mrp: "",
  selling_price: "",
  purchase_price: "",
  wholesale_price: "",
  min_qty: "",
  max_qty: "",
  discount_type: "",
  discount_value: "",
  tax_percent: "",
  effective_from: "",
  effective_to: "",
  description: "",
  status: "active",
};

const priceTypeOptions = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "bulk", label: "Bulk" },
  { value: "customer_group", label: "Customer Group" },
  { value: "special", label: "Special" },
  { value: "offer", label: "Offer" },
];

const discountTypeOptions = [
  { value: "", label: "No Discount" },
  { value: "percentage", label: "Percentage" },
  { value: "fixed", label: "Fixed Amount" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dateInputValue = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const makeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getProductName = (product) => {
  return (
    product.product_name ||
    product.name ||
    product.title ||
    product.item_name ||
    `Product #${product.id}`
  );
};

const getVariantName = (variant) => {
  return (
    variant.variant_name ||
    variant.name ||
    variant.title ||
    variant.variant_title ||
    `Variant #${variant.id}`
  );
};

const getCustomerGroupName = (group) => {
  return (
    group.group_name ||
    group.customer_group_name ||
    group.name ||
    group.title ||
    `Group #${group.id}`
  );
};

const getListFromResponse = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

export default function ProductPricing() {
  const [pricing, setPricing] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [priceTypeFilter, setPriceTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2800);
  };

  const fetchProducts = async () => {
    try {
      const res = await API.get("/api/products");
      setProducts(getListFromResponse(res.data, "products"));
    } catch (err) {
      console.error("Fetch products error:", err.response?.data || err.message);
      setProducts([]);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await API.get("/api/product-variants");
      setVariants(getListFromResponse(res.data, "variants"));
    } catch (err) {
      console.error("Fetch variants error:", err.response?.data || err.message);
      setVariants([]);
    }
  };

  const fetchCustomerGroups = async () => {
    try {
      const res = await API.get("/api/customer-groups");
      setCustomerGroups(getListFromResponse(res.data, "groups"));
    } catch (err) {
      console.error("Fetch customer groups error:", err.response?.data || err.message);
      setCustomerGroups([]);
    }
  };

  const fetchProductPricing = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (productFilter) params.append("product_id", productFilter);
      if (variantFilter) params.append("variant_id", variantFilter);
      if (priceTypeFilter) params.append("price_type", priceTypeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await API.get(`/api/product-pricing?${params.toString()}`);

      if (res.data.success) {
        setPricing(res.data.pricing || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch product pricing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchVariants();
    fetchCustomerGroups();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductPricing();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, productFilter, variantFilter, priceTypeFilter, statusFilter]);

  const filteredVariantsForForm = useMemo(() => {
    if (!formData.product_id) return variants;

    return variants.filter(
      (variant) => String(variant.product_id || "") === String(formData.product_id)
    );
  }, [variants, formData.product_id]);

  const filteredVariantsForFilter = useMemo(() => {
    if (!productFilter) return variants;

    return variants.filter(
      (variant) => String(variant.product_id || "") === String(productFilter)
    );
  }, [variants, productFilter]);

  const stats = useMemo(() => {
    const total = pricing.length;
    const active = pricing.filter((item) => item.status === "active").length;

    const totalRetailValue = pricing.reduce(
      (sum, item) => sum + Number(item.selling_price || 0),
      0
    );

    const totalWholesaleValue = pricing.reduce(
      (sum, item) => sum + Number(item.wholesale_price || 0),
      0
    );

    return {
      total,
      active,
      retailValue: totalRetailValue,
      wholesaleValue: totalWholesaleValue,
    };
  }, [pricing]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowForm(false);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "product_id" ? { variant_id: "" } : {}),
    }));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);

    setFormData({
      product_id: String(item.product_id || ""),
      variant_id: String(item.variant_id || ""),
      price_type: item.price_type || "retail",
      customer_group_id: String(item.customer_group_id || ""),
      mrp: item.mrp ?? "",
      selling_price: item.selling_price ?? "",
      purchase_price: item.purchase_price ?? "",
      wholesale_price: item.wholesale_price ?? "",
      min_qty: item.min_qty ?? "",
      max_qty: item.max_qty ?? "",
      discount_type: item.discount_type || "",
      discount_value: item.discount_value ?? "",
      tax_percent: item.tax_percent ?? "",
      effective_from: dateInputValue(item.effective_from),
      effective_to: dateInputValue(item.effective_to),
      description: item.description || "",
      status: item.status || "active",
    });

    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (!formData.product_id) {
      setError("Product is required");
      return false;
    }

    if (!formData.selling_price && Number(formData.selling_price || 0) <= 0) {
      setError("Selling price is required");
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
        product_id: formData.product_id,
        variant_id: formData.variant_id,
        price_type: formData.price_type,
        customer_group_id: formData.customer_group_id,
        mrp: makeNumber(formData.mrp),
        selling_price: makeNumber(formData.selling_price),
        purchase_price: makeNumber(formData.purchase_price),
        wholesale_price: makeNumber(formData.wholesale_price),
        min_qty: makeNumber(formData.min_qty),
        max_qty: makeNumber(formData.max_qty),
        discount_type: formData.discount_type,
        discount_value: makeNumber(formData.discount_value),
        tax_percent: makeNumber(formData.tax_percent),
        effective_from: formData.effective_from,
        effective_to: formData.effective_to,
        description: formData.description.trim(),
        status: formData.status,
      };

      if (editingId) {
        await API.put(`/api/product-pricing/${editingId}`, payload);
        showSuccess("Product pricing updated successfully");
      } else {
        await API.post("/api/product-pricing", payload);
        showSuccess("Product pricing created successfully");
      }

      closeForm();
      fetchProductPricing();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `Delete pricing for ${item.product_name || `#${item.id}`}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/product-pricing/${item.id}`);
      showSuccess("Product pricing deleted successfully");
      fetchProductPricing();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product pricing");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setProductFilter("");
    setVariantFilter("");
    setPriceTypeFilter("");
    setStatusFilter("");
  };

  return (
    <AdminLayout>
      <div className="product-pricing-page">
        <style>{css}</style>

        <div className="pricing-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <IndianRupee size={30} />
            </div>

            <div>
              <div className="eyebrow">Product Master</div>
              <h1>Product Pricing</h1>
              <p>
                Manage retail, wholesale, bulk, customer group, offer and special
                pricing for products and variants.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchProductPricing}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Pricing
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
          <StatCard title="Total Pricing" value={stats.total} icon={Tags} />
          <StatCard title="Active Pricing" value={stats.active} icon={BadgeCheck} />
          <StatCard title="Retail Value" value={formatCurrency(stats.retailValue)} icon={IndianRupee} />
          <StatCard title="Wholesale Value" value={formatCurrency(stats.wholesaleValue)} icon={Boxes} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Product Pricing" : "Create Product Pricing"}</h2>
                <p>Configure price, offer validity, tax and quantity slab.</p>
              </div>

              <button type="button" className="close-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Product</label>
                  <select name="product_id" value={formData.product_id} onChange={handleChange}>
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {getProductName(product)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Variant</label>
                  <select name="variant_id" value={formData.variant_id} onChange={handleChange}>
                    <option value="">No Variant / Main Product</option>
                    {filteredVariantsForForm.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {getVariantName(variant)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Price Type</label>
                  <select name="price_type" value={formData.price_type} onChange={handleChange}>
                    {priceTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Customer Group</label>
                  <select
                    name="customer_group_id"
                    value={formData.customer_group_id}
                    onChange={handleChange}
                  >
                    <option value="">Not Applicable</option>
                    {customerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {getCustomerGroupName(group)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>MRP</label>
                  <input
                    type="number"
                    name="mrp"
                    value={formData.mrp}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price</label>
                  <input
                    type="number"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Purchase Price</label>
                  <input
                    type="number"
                    name="purchase_price"
                    value={formData.purchase_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Wholesale Price</label>
                  <input
                    type="number"
                    name="wholesale_price"
                    value={formData.wholesale_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Minimum Qty</label>
                  <input
                    type="number"
                    name="min_qty"
                    value={formData.min_qty}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Maximum Qty</label>
                  <input
                    type="number"
                    name="max_qty"
                    value={formData.max_qty}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Discount Type</label>
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleChange}
                  >
                    {discountTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Discount Value</label>
                  <input
                    type="number"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>GST / Tax %</label>
                  <input
                    type="number"
                    name="tax_percent"
                    value={formData.tax_percent}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
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

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional pricing notes / offer description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                  {saving ? "Saving..." : editingId ? "Update Pricing" : "Create Pricing"}
                </button>
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
              placeholder="Search product, variant, SKU..."
            />
          </div>

          <select
            className="filter-select"
            value={productFilter}
            onChange={(event) => {
              setProductFilter(event.target.value);
              setVariantFilter("");
            }}
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {getProductName(product)}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={variantFilter}
            onChange={(event) => setVariantFilter(event.target.value)}
          >
            <option value="">All Variants</option>
            {filteredVariantsForFilter.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {getVariantName(variant)}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={priceTypeFilter}
            onChange={(event) => setPriceTypeFilter(event.target.value)}
          >
            <option value="">All Price Types</option>
            {priceTypeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
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

          <button type="button" className="clear-btn" onClick={resetFilters}>
            Clear
          </button>

          <div className="api-chip">
            API Connected · <strong>{pricing.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Product Pricing List</h2>
            <p>Manage product-wise and variant-wise price slabs.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading product pricing...</h3>
              <p>Please wait while pricing records are loading.</p>
            </div>
          ) : pricing.length === 0 ? (
            <div className="empty-box">
              <IndianRupee size={34} />
              <h3>No product pricing found</h3>
              <p>Create your first pricing entry using the New Pricing button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Type</th>
                    <th>MRP</th>
                    <th>Selling</th>
                    <th>Purchase</th>
                    <th>Wholesale</th>
                    <th>Qty Slab</th>
                    <th>Discount</th>
                    <th>Tax</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pricing.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="main-name">
                          <Package size={15} />
                          {item.product_name || "-"}
                        </div>
                        <div className="small-text">{item.product_sku || "-"}</div>
                      </td>

                      <td>
                        <div className="variant-name">
                          <Layers3 size={15} />
                          {item.variant_name || "Main Product"}
                        </div>
                        <div className="small-text">{item.variant_sku || "-"}</div>
                      </td>

                      <td>
                        <span className={`type-badge ${item.price_type || "retail"}`}>
                          {String(item.price_type || "retail").replace("_", " ")}
                        </span>
                      </td>

                      <td>{formatCurrency(item.mrp)}</td>
                      <td className="strong">{formatCurrency(item.selling_price)}</td>
                      <td>{formatCurrency(item.purchase_price)}</td>
                      <td>{formatCurrency(item.wholesale_price)}</td>

                      <td>
                        <span className="qty-badge">
                          {formatNumber(item.min_qty)} - {formatNumber(item.max_qty)}
                        </span>
                      </td>

                      <td>
                        <div className="strong">
                          {item.discount_type || "-"}
                        </div>
                        <div className="small-text">
                          {formatNumber(item.discount_value)}
                        </div>
                      </td>

                      <td>{formatNumber(item.tax_percent)}%</td>

                      <td>
                        <div className="date-line">
                          <CalendarDays size={14} />
                          {formatDate(item.effective_from)}
                        </div>
                        <div className="small-text">To: {formatDate(item.effective_to)}</div>
                      </td>

                      <td>
                        <span className={`status-badge ${item.status || "active"}`}>
                          {item.status || "active"}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(item)}
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
  .product-pricing-page {
    color: #151515;
  }

  .pricing-hero {
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

  .pricing-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .pricing-hero p {
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
    font-size: 22px;
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
  .form-group textarea {
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
  .form-group textarea:focus {
    border-color: #facc15;
    background: #fff;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
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
    max-width: 360px;
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
    min-width: 150px;
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
    min-width: 1500px;
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

  .main-name,
  .variant-name {
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
    max-width: 230px;
    line-height: 1.45;
  }

  .strong {
    color: #111;
    font-weight: 950;
  }

  .date-line {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #111;
    font-weight: 950;
  }

  .type-badge,
  .qty-badge,
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .type-badge {
    background: #eff6ff;
    color: #2563eb;
  }

  .type-badge.wholesale,
  .type-badge.bulk,
  .type-badge.customer_group {
    background: #fffbeb;
    color: #b45309;
  }

  .type-badge.offer,
  .type-badge.special {
    background: #fdf2f8;
    color: #be185d;
  }

  .qty-badge {
    background: #f4f4f5;
    color: #111;
  }

  .status-badge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.inactive,
  .status-badge.expired {
    background: #fff1f2;
    color: #e11d48;
  }

  .status-badge.draft {
    background: #fffbeb;
    color: #b45309;
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
    .pricing-hero,
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

    .form-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
`;