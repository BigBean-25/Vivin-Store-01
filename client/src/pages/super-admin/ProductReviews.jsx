import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  MessageSquareText,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";

const initialForm = {
  product_id: "",
  variant_id: "",
  customer_id: "",
  order_id: "",
  rating: "",
  review_title: "",
  review: "",
  review_date: "",
  is_approved: "0",
  status: "pending",
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const approvalOptions = [
  { value: "0", label: "Not Approved" },
  { value: "1", label: "Approved" },
];

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

const getListFromResponse = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
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

const getCustomerName = (customer) => {
  return (
    customer.customer_name ||
    customer.name ||
    customer.full_name ||
    customer.business_name ||
    customer.company_name ||
    customer.contact_person ||
    `Customer #${customer.id}`
  );
};

const RatingStars = ({ rating }) => {
  const value = Number(rating || 0);

  return (
    <div className="rating-stars">
      {[1, 2, 3, 4, 5].map((item) => (
        <Star
          key={item}
          size={15}
          className={item <= value ? "filled" : ""}
          fill={item <= value ? "currentColor" : "none"}
        />
      ))}
      <span>{value.toFixed(1)}</span>
    </div>
  );
};

export default function ProductReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minRatingFilter, setMinRatingFilter] = useState("");
  const [maxRatingFilter, setMaxRatingFilter] = useState("");

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

  const fetchCustomers = async () => {
    try {
      const res = await API.get("/api/customers");
      setCustomers(getListFromResponse(res.data, "customers"));
    } catch (err) {
      console.error("Fetch customers error:", err.response?.data || err.message);
      setCustomers([]);
    }
  };

  const fetchProductReviews = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (productFilter) params.append("product_id", productFilter);
      if (variantFilter) params.append("variant_id", variantFilter);
      if (customerFilter) params.append("customer_id", customerFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (minRatingFilter) params.append("min_rating", minRatingFilter);
      if (maxRatingFilter) params.append("max_rating", maxRatingFilter);

      const res = await API.get(`/api/product-reviews?${params.toString()}`);

      if (res.data.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch product reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchVariants();
    fetchCustomers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductReviews();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    search,
    productFilter,
    variantFilter,
    customerFilter,
    statusFilter,
    minRatingFilter,
    maxRatingFilter,
  ]);

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
    const total = reviews.length;
    const approved = reviews.filter(
      (item) => Number(item.is_approved || 0) === 1 || item.status === "approved"
    ).length;
    const pending = reviews.filter((item) => item.status === "pending").length;

    const averageRating =
      total > 0
        ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total
        : 0;

    return {
      total,
      approved,
      pending,
      averageRating,
    };
  }, [reviews]);

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
      customer_id: String(item.customer_id || ""),
      order_id: String(item.order_id || ""),
      rating: item.rating ?? "",
      review_title: item.review_title || "",
      review: item.review || "",
      review_date: dateInputValue(item.review_date),
      is_approved: String(item.is_approved || "0"),
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

    if (!formData.rating || Number(formData.rating) <= 0) {
      setError("Rating is required");
      return false;
    }

    if (Number(formData.rating) > 5) {
      setError("Rating cannot be above 5");
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
        customer_id: formData.customer_id,
        order_id: formData.order_id,
        rating: Number(formData.rating || 0),
        review_title: formData.review_title.trim(),
        review: formData.review.trim(),
        review_date: formData.review_date,
        is_approved: Number(formData.is_approved || 0),
        status: formData.status,
      };

      if (editingId) {
        await API.put(`/api/product-reviews/${editingId}`, payload);
        showSuccess("Product review updated successfully");
      } else {
        await API.post("/api/product-reviews", payload);
        showSuccess("Product review created successfully");
      }

      closeForm();
      fetchProductReviews();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product review");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (item, newStatus) => {
    const label = newStatus === "approved" ? "Approve" : newStatus === "rejected" ? "Reject" : "Reset to Pending";
    if (!window.confirm(`${label} review for "${item.product_name || `#${item.id}`}"?`)) return;
    try {
      setError("");
      await API.patch(`/api/product-reviews/${item.id}/status`, { status: newStatus });
      showSuccess(`Review ${newStatus} successfully`);
      fetchProductReviews();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update review status");
    }
  };

  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `Delete review for ${item.product_name || `#${item.id}`}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/product-reviews/${item.id}`);
      showSuccess("Product review deleted successfully");
      fetchProductReviews();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product review");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setProductFilter("");
    setVariantFilter("");
    setCustomerFilter("");
    setStatusFilter("");
    setMinRatingFilter("");
    setMaxRatingFilter("");
  };

  return (
    <AdminLayout>
      <div className="product-reviews-page">
        <style>{css}</style>

        <div className="reviews-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <MessageSquareText size={30} />
            </div>

            <div>
              <div className="eyebrow">Product Master</div>
              <h1>Product Reviews</h1>
              <p>
                Manage customer ratings, review approvals, feedback status and
                product-wise review performance.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchProductReviews}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Review
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
          <StatCard title="Total Reviews" value={stats.total} icon={MessageSquareText} />
          <StatCard title="Approved Reviews" value={stats.approved} icon={BadgeCheck} />
          <StatCard title="Pending Reviews" value={stats.pending} icon={CalendarDays} />
          <StatCard
            title="Average Rating"
            value={stats.averageRating.toFixed(1)}
            icon={Star}
          />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Product Review" : "Create Product Review"}</h2>
                <p>Add rating, review content, approval status and customer details.</p>
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
                  <label>Customer</label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Customer / Optional</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {getCustomerName(customer)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Order ID</label>
                  <input
                    type="text"
                    name="order_id"
                    value={formData.order_id}
                    onChange={handleChange}
                    placeholder="Optional order / invoice id"
                  />
                </div>

                <div className="form-group">
                  <label>Rating</label>
                  <select name="rating" value={formData.rating} onChange={handleChange}>
                    <option value="">Select Rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Very Good</option>
                    <option value="3">3 - Good</option>
                    <option value="2">2 - Average</option>
                    <option value="1">1 - Poor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Review Date</label>
                  <input
                    type="date"
                    name="review_date"
                    value={formData.review_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Approval</label>
                  <select
                    name="is_approved"
                    value={formData.is_approved}
                    onChange={handleChange}
                  >
                    {approvalOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
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
                  <label>Review Title</label>
                  <input
                    type="text"
                    name="review_title"
                    value={formData.review_title}
                    onChange={handleChange}
                    placeholder="Example: Good quality product"
                  />
                </div>

                <div className="form-group full">
                  <label>Review / Feedback</label>
                  <textarea
                    name="review"
                    value={formData.review}
                    onChange={handleChange}
                    placeholder="Write customer review or internal feedback"
                    rows={4}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                  {saving ? "Saving..." : editingId ? "Update Review" : "Create Review"}
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
              placeholder="Search product, customer, review..."
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
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {getCustomerName(customer)}
              </option>
            ))}
          </select>

          <select
            className="filter-select small"
            value={minRatingFilter}
            onChange={(event) => setMinRatingFilter(event.target.value)}
          >
            <option value="">Min Rating</option>
            <option value="1">1 Star</option>
            <option value="2">2 Star</option>
            <option value="3">3 Star</option>
            <option value="4">4 Star</option>
            <option value="5">5 Star</option>
          </select>

          <select
            className="filter-select small"
            value={maxRatingFilter}
            onChange={(event) => setMaxRatingFilter(event.target.value)}
          >
            <option value="">Max Rating</option>
            <option value="5">5 Star</option>
            <option value="4">4 Star</option>
            <option value="3">3 Star</option>
            <option value="2">2 Star</option>
            <option value="1">1 Star</option>
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
            API Connected · <strong>{reviews.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Product Review List</h2>
            <p>Review, approve and track customer product feedback.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading product reviews...</h3>
              <p>Please wait while review records are loading.</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="empty-box">
              <MessageSquareText size={34} />
              <h3>No product reviews found</h3>
              <p>Create your first product review using the New Review button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Approval</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {reviews.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="main-name">
                          <Package size={15} />
                          {item.product_name || "-"}
                        </div>
                        <div className="small-text">
                          {item.variant_name || "Main Product"} · {item.product_sku || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="main-name">
                          <User size={15} />
                          {item.customer_name || "Customer not linked"}
                        </div>
                        <div className="small-text">
                          {item.customer_phone || item.customer_email || "-"}
                        </div>
                      </td>

                      <td>
                        <RatingStars rating={item.rating} />
                      </td>

                      <td>
                        <div className="review-title">
                          {item.review_title || "No title"}
                        </div>
                        <div className="review-text">
                          {item.review || "-"}
                        </div>
                      </td>

                      <td>{item.order_id || "-"}</td>

                      <td>
                        <div className="date-line">
                          <CalendarDays size={14} />
                          {formatDate(item.review_date)}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`approval-badge ${
                            Number(item.is_approved || 0) === 1 ? "approved" : "pending"
                          }`}
                        >
                          {Number(item.is_approved || 0) === 1
                            ? "Approved"
                            : "Not Approved"}
                        </span>
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

                          {item.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item, "approved")}
                              title="Approve"
                              style={{height:'37px',padding:'0 10px',borderRadius:'13px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:'#ecfdf5',color:'#047857'}}
                            >
                              Approve
                            </button>
                          )}

                          {item.status !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item, "rejected")}
                              title="Reject"
                              style={{height:'37px',padding:'0 10px',borderRadius:'13px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:'#fff1f2',color:'#e11d48'}}
                            >
                              Reject
                            </button>
                          )}

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(item)}
                            title="Delete permanently"
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
  .product-reviews-page {
    color: #151515;
  }

  .reviews-hero {
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

  .reviews-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .reviews-hero p {
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
    max-width: 340px;
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
    min-width: 145px;
  }

  .filter-select.small {
    min-width: 120px;
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
    min-width: 1300px;
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
    max-width: 230px;
    line-height: 1.45;
  }

  .review-title {
    color: #111;
    font-size: 14px;
    font-weight: 950;
    max-width: 320px;
  }

  .review-text {
    margin-top: 6px;
    color: #777;
    font-size: 12px;
    line-height: 1.5;
    max-width: 360px;
  }

  .rating-stars {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #d1d5db;
    font-weight: 950;
  }

  .rating-stars .filled {
    color: #facc15;
  }

  .rating-stars span {
    color: #111;
    margin-left: 6px;
    font-size: 13px;
  }

  .date-line {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #111;
    font-weight: 950;
  }

  .approval-badge,
  .status-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .approval-badge.approved,
  .status-badge.active,
  .status-badge.approved {
    background: #ecfdf5;
    color: #047857;
  }

  .approval-badge.pending,
  .status-badge.pending {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.rejected,
  .status-badge.inactive {
    background: #fff1f2;
    color: #e11d48;
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
    .reviews-hero,
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