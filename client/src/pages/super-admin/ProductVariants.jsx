import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BadgeCheck,
  Barcode,
  Boxes,
  Building2,
  CheckCircle2,
  Edit3,
  IndianRupee,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

const initialForm = {
  product_id: "",
  variant_name: "",
  sku: "",
  barcode: "",
  variant_type: "",
  size: "",
  color: "",
  weight: "",
  mrp: "",
  selling_price: "",
  purchase_price: "",
  stock_qty: "",
  min_stock_qty: "",
  is_default: 0,
  description: "",
  status: "active",
};

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
  { value: "out_of_stock", label: "Out of Stock" },
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

const getProductName = (product) => {
  return (
    product.product_name ||
    product.name ||
    product.title ||
    product.item_name ||
    `Product #${product.id}`
  );
};

const getProductListFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const makeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

export default function ProductVariants() {
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

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
      setProducts(getProductListFromResponse(res.data));
    } catch (err) {
      console.error("Fetch products error:", err.response?.data || err.message);
      setProducts([]);
    }
  };

  const fetchProductVariants = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (productFilter) params.append("product_id", productFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (lowStockOnly) params.append("low_stock", "true");

      const res = await API.get(`/api/product-variants?${params.toString()}`);

      if (res.data.success) {
        setVariants(res.data.variants || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch product variants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductVariants();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, productFilter, statusFilter, lowStockOnly]);

  const stats = useMemo(() => {
    const total = variants.length;
    const active = variants.filter((item) => item.status === "active").length;
    const defaultVariants = variants.filter((item) => Number(item.is_default || 0) === 1).length;

    const lowStock = variants.filter(
      (item) => Number(item.stock_qty || 0) <= Number(item.min_stock_qty || 0)
    ).length;

    return {
      total,
      active,
      defaultVariants,
      lowStock,
    };
  }, [variants]);

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
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  const handleEdit = (variant) => {
    setEditingId(variant.id);

    setFormData({
      product_id: String(variant.product_id || ""),
      variant_name: variant.variant_name || "",
      sku: variant.sku || "",
      barcode: variant.barcode || "",
      variant_type: variant.variant_type || "",
      size: variant.size || "",
      color: variant.color || "",
      weight: variant.weight || "",
      mrp: variant.mrp ?? "",
      selling_price: variant.selling_price ?? "",
      purchase_price: variant.purchase_price ?? "",
      stock_qty: variant.stock_qty ?? "",
      min_stock_qty: variant.min_stock_qty ?? "",
      is_default: Number(variant.is_default || 0),
      description: variant.description || "",
      status: variant.status || "active",
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

    if (!formData.variant_name.trim()) {
      setError("Variant name is required");
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
        variant_name: formData.variant_name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        variant_type: formData.variant_type.trim(),
        size: formData.size.trim(),
        color: formData.color.trim(),
        weight: formData.weight.trim(),
        mrp: makeNumber(formData.mrp),
        selling_price: makeNumber(formData.selling_price),
        purchase_price: makeNumber(formData.purchase_price),
        stock_qty: makeNumber(formData.stock_qty),
        min_stock_qty: makeNumber(formData.min_stock_qty),
        is_default: Number(formData.is_default || 0),
        description: formData.description.trim(),
        status: formData.status,
      };

      if (editingId) {
        await API.put(`/api/product-variants/${editingId}`, payload);
        showSuccess("Product variant updated successfully");
      } else {
        await API.post("/api/product-variants", payload);
        showSuccess("Product variant created successfully");
      }

      closeForm();
      fetchProductVariants();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product variant");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variant) => {
    const confirmDelete = window.confirm(
      `Delete variant ${variant.variant_name || `#${variant.id}`}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/product-variants/${variant.id}`);
      showSuccess("Product variant deleted successfully");
      fetchProductVariants();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product variant");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setProductFilter("");
    setStatusFilter("");
    setLowStockOnly(false);
  };

  return (
    <AdminLayout>
      <div className="product-variant-page">
        <style>{css}</style>

        <div className="variant-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <Boxes size={30} />
            </div>

            <div>
              <div className="eyebrow">Product Master</div>
              <h1>Product Variants</h1>
              <p>
                Manage product sizes, colors, SKU, barcode, MRP, selling price,
                purchase price and stock level for each product variant.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchProductVariants}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Variant
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
          <StatCard title="Total Variants" value={stats.total} icon={Boxes} />
          <StatCard title="Active Variants" value={stats.active} icon={BadgeCheck} />
          <StatCard title="Default Variants" value={stats.defaultVariants} icon={Star} />
          <StatCard title="Low Stock" value={stats.lowStock} icon={PackageSearch} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Product Variant" : "Create Product Variant"}</h2>
                <p>Enter variant details, price and stock configuration.</p>
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
                  <label>Variant Name</label>
                  <input
                    type="text"
                    name="variant_name"
                    value={formData.variant_name}
                    onChange={handleChange}
                    placeholder="Example: 1 KG Pack / Large / Red"
                  />
                </div>

                <div className="form-group">
                  <label>SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="Variant SKU"
                  />
                </div>

                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Barcode"
                  />
                </div>

                <div className="form-group">
                  <label>Variant Type</label>
                  <input
                    type="text"
                    name="variant_type"
                    value={formData.variant_type}
                    onChange={handleChange}
                    placeholder="Size / Color / Weight"
                  />
                </div>

                <div className="form-group">
                  <label>Size</label>
                  <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    placeholder="Example: 500g / Large"
                  />
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="Example: Red / Black"
                  />
                </div>

                <div className="form-group">
                  <label>Weight</label>
                  <input
                    type="text"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="Example: 1 KG"
                  />
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
                  <label>Stock Qty</label>
                  <input
                    type="number"
                    name="stock_qty"
                    value={formData.stock_qty}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Min Stock Qty</label>
                  <input
                    type="number"
                    name="min_stock_qty"
                    value={formData.min_stock_qty}
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

                <div className="form-group checkbox-group">
                  <label>Default Variant</label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={Number(formData.is_default || 0) === 1}
                      onChange={handleChange}
                    />
                    <span>Set this as default product variant</span>
                  </label>
                </div>

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional variant notes / description"
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
                  {saving ? "Saving..." : editingId ? "Update Variant" : "Create Variant"}
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
              placeholder="Search product, variant, SKU, barcode..."
            />
          </div>

          <select
            className="filter-select"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
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

          <label className="low-stock-check">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => setLowStockOnly(event.target.checked)}
            />
            Low Stock Only
          </label>

          <button type="button" className="clear-btn" onClick={resetFilters}>
            Clear
          </button>

          <div className="api-chip">
            API Connected · <strong>{variants.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Product Variant List</h2>
            <p>Manage SKU, barcode, price and stock details for each product variant.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading product variants...</h3>
              <p>Please wait while variant records are loading.</p>
            </div>
          ) : variants.length === 0 ? (
            <div className="empty-box">
              <Boxes size={34} />
              <h3>No product variants found</h3>
              <p>Create your first product variant using the New Variant button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>SKU / Barcode</th>
                    <th>Type</th>
                    <th>Size / Color</th>
                    <th>MRP</th>
                    <th>Selling</th>
                    <th>Purchase</th>
                    <th>Stock</th>
                    <th>Default</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {variants.map((variant) => {
                    const isLowStock =
                      Number(variant.stock_qty || 0) <= Number(variant.min_stock_qty || 0);

                    return (
                      <tr key={variant.id}>
                        <td>
                          <div className="main-name">
                            <Building2 size={15} />
                            {variant.product_name || "-"}
                          </div>
                          <div className="small-text">{variant.product_sku || "-"}</div>
                        </td>

                        <td>
                          <div className="variant-name">{variant.variant_name || "-"}</div>
                          <div className="small-text">{variant.description || "-"}</div>
                        </td>

                        <td>
                          <div className="sku-line">
                            <PackageSearch size={14} />
                            {variant.sku || "-"}
                          </div>
                          <div className="sku-line muted">
                            <Barcode size={14} />
                            {variant.barcode || "-"}
                          </div>
                        </td>

                        <td>{variant.variant_type || "-"}</td>

                        <td>
                          <div>{variant.size || "-"}</div>
                          <div className="color-line">
                            {variant.color ? (
                              <span className="color-dot" style={{ background: variant.color }} />
                            ) : null}
                            {variant.color || "-"}
                          </div>
                          <div className="small-text">{variant.weight || "-"}</div>
                        </td>

                        <td>{formatCurrency(variant.mrp)}</td>
                        <td className="strong">{formatCurrency(variant.selling_price)}</td>
                        <td>{formatCurrency(variant.purchase_price)}</td>

                        <td>
                          <span className={isLowStock ? "stock-badge low" : "stock-badge"}>
                            {formatNumber(variant.stock_qty)}
                          </span>
                          <div className="small-text">
                            Min: {formatNumber(variant.min_stock_qty)}
                          </div>
                        </td>

                        <td>
                          {Number(variant.is_default || 0) === 1 ? (
                            <span className="default-badge">
                              <Star size={13} />
                              Default
                            </span>
                          ) : (
                            <span className="normal-badge">No</span>
                          )}
                        </td>

                        <td>
                          <span className={`status-badge ${variant.status || "active"}`}>
                            {variant.status || "active"}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEdit(variant)}
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(variant)}
                              title="Delete"
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
  .product-variant-page {
    color: #151515;
  }

  .variant-hero {
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

  .variant-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .variant-hero p {
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
    font-size: 24px;
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

  .checkbox-group {
    justify-content: flex-end;
  }

  .toggle-row {
    min-height: 46px;
    border: 1.5px solid #e8e8e8;
    border-radius: 15px;
    padding: 0 13px;
    background: #fbfbfb;
    display: flex !important;
    flex-direction: row !important;
    align-items: center;
    gap: 10px !important;
    font-size: 13px !important;
    font-weight: 850 !important;
    color: #444 !important;
  }

  .toggle-row input {
    width: 16px !important;
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
    min-width: 160px;
  }

  .low-stock-check {
    height: 46px;
    border-radius: 15px;
    border: 1px solid #eeeeee;
    background: #fff;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    font-weight: 950;
    color: #333;
    cursor: pointer;
  }

  .low-stock-check input {
    width: 16px;
    height: 16px;
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

  .variant-name {
    font-weight: 950;
    color: #111;
    font-size: 14px;
  }

  .small-text {
    color: #777;
    font-size: 12px;
    margin-top: 6px;
    max-width: 230px;
    line-height: 1.45;
  }

  .sku-line {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 950;
    color: #111;
  }

  .sku-line.muted {
    margin-top: 7px;
    color: #777;
    font-weight: 800;
  }

  .color-line {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    color: #555;
  }

  .color-dot {
    width: 13px;
    height: 13px;
    border-radius: 999px;
    border: 1px solid #ddd;
    display: inline-block;
  }

  .strong {
    color: #111;
    font-weight: 950;
  }

  .stock-badge,
  .default-badge,
  .normal-badge,
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

  .stock-badge {
    background: #ecfdf5;
    color: #047857;
  }

  .stock-badge.low {
    background: #fff1f2;
    color: #e11d48;
  }

  .default-badge {
    background: #111;
    color: #facc15;
  }

  .normal-badge {
    background: #f4f4f5;
    color: #555;
  }

  .status-badge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.inactive,
  .status-badge.out_of_stock {
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
    .variant-hero,
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