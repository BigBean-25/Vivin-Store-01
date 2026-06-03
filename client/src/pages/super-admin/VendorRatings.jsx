import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  StarHalf,
  Trash2,
  X,
} from "lucide-react";

const initialForm = {
  vendor_id: "",
  rating: "",
  quality_rating: "",
  delivery_rating: "",
  price_rating: "",
  service_rating: "",
  review: "",
  rated_by: "",
  rating_date: "",
  status: "active",
};

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "inactive", label: "Inactive" },
];

const todayDate = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const makeRating = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 5) return 5;
  return number;
};

const getRatingLabel = (rating) => {
  const value = Number(rating || 0);

  if (value >= 4.5) return "Excellent";
  if (value >= 4) return "Very Good";
  if (value >= 3) return "Good";
  if (value >= 2) return "Average";
  if (value > 0) return "Poor";

  return "Not Rated";
};

export default function VendorRatings() {
  const [ratings, setRatings] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState({
    ...initialForm,
    rating_date: todayDate(),
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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

  const fetchVendorRatings = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (minRating) params.append("min_rating", minRating);
      if (maxRating) params.append("max_rating", maxRating);

      const res = await API.get(`/api/vendor-ratings?${params.toString()}`);

      if (res.data.success) {
        setRatings(res.data.ratings || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor ratings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorRatings();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, vendorFilter, statusFilter, minRating, maxRating]);

  const stats = useMemo(() => {
    const total = ratings.length;

    const active = ratings.filter((item) => item.status === "active").length;

    const averageRating =
      total > 0
        ? ratings.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total
        : 0;

    const excellent = ratings.filter((item) => Number(item.rating || 0) >= 4.5).length;

    return {
      total,
      active,
      averageRating,
      excellent,
    };
  }, [ratings]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      rating_date: todayDate(),
    });
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      rating_date: todayDate(),
    });
    setShowForm(false);
    setError("");
  };

  const calculateOverallRating = (data) => {
    const values = [
      makeRating(data.quality_rating),
      makeRating(data.delivery_rating),
      makeRating(data.price_rating),
      makeRating(data.service_rating),
    ].filter((value) => value > 0);

    if (!values.length) return data.rating;

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return average.toFixed(1);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (
        ["quality_rating", "delivery_rating", "price_rating", "service_rating"].includes(
          name
        )
      ) {
        next.rating = calculateOverallRating(next);
      }

      return next;
    });
  };

  const handleEdit = (rating) => {
    setEditingId(rating.id);

    setFormData({
      vendor_id: String(rating.vendor_id || ""),
      rating: rating.rating ?? "",
      quality_rating: rating.quality_rating ?? "",
      delivery_rating: rating.delivery_rating ?? "",
      price_rating: rating.price_rating ?? "",
      service_rating: rating.service_rating ?? "",
      review: rating.review || "",
      rated_by: rating.rated_by || "",
      rating_date: rating.rating_date ? String(rating.rating_date).slice(0, 10) : todayDate(),
      status: rating.status || "active",
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

    if (!formData.rating || Number(formData.rating) <= 0) {
      setError("Overall rating must be greater than 0");
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
        rating: makeRating(formData.rating),
        quality_rating: makeRating(formData.quality_rating),
        delivery_rating: makeRating(formData.delivery_rating),
        price_rating: makeRating(formData.price_rating),
        service_rating: makeRating(formData.service_rating),
        review: formData.review.trim(),
        rated_by: formData.rated_by.trim(),
        rating_date: formData.rating_date,
        status: formData.status,
      };

      if (editingId) {
        await API.put(`/api/vendor-ratings/${editingId}`, payload);
        showSuccess("Vendor rating updated successfully");
      } else {
        await API.post("/api/vendor-ratings", payload);
        showSuccess("Vendor rating created successfully");
      }

      closeForm();
      fetchVendorRatings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor rating");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rating) => {
    const confirmDelete = window.confirm(
      `Delete rating for ${rating.vendor_name || "this vendor"}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/vendor-ratings/${rating.id}`);
      showSuccess("Vendor rating deleted successfully");
      fetchVendorRatings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor rating");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setVendorFilter("");
    setStatusFilter("");
    setMinRating("");
    setMaxRating("");
  };

  return (
    <AdminLayout>
      <div className="vendor-rating-page">
        <style>{css}</style>

        <div className="rating-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <BadgeCheck size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Performance</div>
              <h1>Vendor Ratings</h1>
              <p>
                Rate vendors based on product quality, delivery performance, price
                competitiveness, service support and overall supplier reliability.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorRatings}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Rating
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
          <StatCard title="Total Ratings" value={stats.total} icon={BadgeCheck} />
          <StatCard title="Active Ratings" value={stats.active} icon={CheckCircle2} />
          <StatCard
            title="Average Rating"
            value={stats.averageRating.toFixed(1)}
            icon={Star}
          />
          <StatCard title="Excellent Vendors" value={stats.excellent} icon={StarHalf} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Vendor Rating" : "Create Vendor Rating"}</h2>
                <p>Enter vendor performance score from 1 to 5.</p>
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

                <RatingInput
                  label="Overall Rating"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                />

                <RatingInput
                  label="Quality Rating"
                  name="quality_rating"
                  value={formData.quality_rating}
                  onChange={handleChange}
                />

                <RatingInput
                  label="Delivery Rating"
                  name="delivery_rating"
                  value={formData.delivery_rating}
                  onChange={handleChange}
                />

                <RatingInput
                  label="Price Rating"
                  name="price_rating"
                  value={formData.price_rating}
                  onChange={handleChange}
                />

                <RatingInput
                  label="Service Rating"
                  name="service_rating"
                  value={formData.service_rating}
                  onChange={handleChange}
                />

                <div className="form-group">
                  <label>Rated By</label>
                  <input
                    type="text"
                    name="rated_by"
                    value={formData.rated_by}
                    onChange={handleChange}
                    placeholder="Super Admin / Manager"
                  />
                </div>

                <div className="form-group">
                  <label>Rating Date</label>
                  <input
                    type="date"
                    name="rating_date"
                    value={formData.rating_date}
                    onChange={handleChange}
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
                  <label>Review / Feedback</label>
                  <textarea
                    name="review"
                    value={formData.review}
                    onChange={handleChange}
                    placeholder="Example: Good delivery timing and quality consistency."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <div className="rating-preview">
                  Current Rating: <strong>{makeRating(formData.rating).toFixed(1)}</strong> ·{" "}
                  {getRatingLabel(formData.rating)}
                </div>

                <div className="form-action-buttons">
                  <button type="button" className="cancel-btn" onClick={closeForm}>
                    Cancel
                  </button>

                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                    {saving ? "Saving..." : editingId ? "Update Rating" : "Create Rating"}
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
              placeholder="Search vendor, review, rated by..."
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

          <select
            className="filter-select"
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
          >
            <option value="">Min Rating</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5</option>
          </select>

          <select
            className="filter-select"
            value={maxRating}
            onChange={(event) => setMaxRating(event.target.value)}
          >
            <option value="">Max Rating</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <button type="button" className="clear-btn" onClick={resetFilters}>
            Clear
          </button>

          <div className="api-chip">
            API Connected · <strong>{ratings.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Vendor Rating List</h2>
            <p>Review vendor score, quality, delivery, price and service ratings.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor ratings...</h3>
              <p>Please wait while rating records are loading.</p>
            </div>
          ) : ratings.length === 0 ? (
            <div className="empty-box">
              <BadgeCheck size={34} />
              <h3>No vendor ratings found</h3>
              <p>Create your first vendor rating using the New Rating button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Overall</th>
                    <th>Quality</th>
                    <th>Delivery</th>
                    <th>Price</th>
                    <th>Service</th>
                    <th>Rated By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Review</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {ratings.map((rating) => (
                    <tr key={rating.id}>
                      <td>
                        <div className="main-name">
                          <Building2 size={15} />
                          {rating.vendor_name || "-"}
                        </div>
                        <div className="small-text">{rating.vendor_code || "-"}</div>
                      </td>

                      <td>
                        <RatingBadge value={rating.rating} strong />
                        <div className="small-text">{getRatingLabel(rating.rating)}</div>
                      </td>

                      <td>
                        <RatingBadge value={rating.quality_rating} />
                      </td>

                      <td>
                        <RatingBadge value={rating.delivery_rating} />
                      </td>

                      <td>
                        <RatingBadge value={rating.price_rating} />
                      </td>

                      <td>
                        <RatingBadge value={rating.service_rating} />
                      </td>

                      <td>{rating.rated_by || "-"}</td>

                      <td>{formatDate(rating.rating_date || rating.created_at)}</td>

                      <td>
                        <span className={`status-badge ${rating.status || "active"}`}>
                          {rating.status || "active"}
                        </span>
                      </td>

                      <td>
                        <div className="review-text">{rating.review || "-"}</div>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(rating)}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(rating)}
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

function RatingInput({ label, name, value, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder="0.0"
        min="0"
        max="5"
        step="0.1"
      />
    </div>
  );
}

function RatingBadge({ value, strong = false }) {
  const rating = makeRating(value);

  return (
    <span className={`rating-badge ${strong ? "strong" : ""}`}>
      <Star size={13} />
      {rating.toFixed(1)}
    </span>
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
  .vendor-rating-page {
    color: #151515;
  }

  .rating-hero {
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

  .rating-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .rating-hero p {
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

  .rating-preview {
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
    min-width: 1350px;
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

  .rating-badge {
    background: #fffbeb;
    color: #b45309;
    border: 1px solid #fde68a;
    border-radius: 999px;
    padding: 7px 10px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 950;
  }

  .rating-badge.strong {
    background: #111;
    color: #facc15;
    border-color: #111;
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

  .status-badge.pending {
    background: #fffbeb;
    color: #b45309;
  }

  .status-badge.rejected,
  .status-badge.inactive {
    background: #fff1f2;
    color: #e11d48;
  }

  .review-text {
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
    .rating-hero,
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

    .form-actions {
      align-items: stretch;
    }

    .form-action-buttons {
      flex-direction: column;
    }
  }
`;