import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Building2,
  CheckCircle2,
  Edit3,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Tags,
  Trash2,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

const initialForm = {
  vendor_id: "",
  address_type: "office",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  is_default: "0",
};

const addressTypes = [
  { value: "office", label: "Office" },
  { value: "billing", label: "Billing" },
  { value: "shipping", label: "Shipping" },
  { value: "warehouse", label: "Warehouse" },
];

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isDefaultAddress = (value) => {
  return value === true || value === 1 || value === "1" || value === "true";
};

const getAddressTypeLabel = (type) => {
  return addressTypes.find((item) => item.value === type)?.label || "Office";
};

export default function VendorAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [addressTypeFilter, setAddressTypeFilter] = useState("");
  const [defaultFilter, setDefaultFilter] = useState("");

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
      `Vendor #${vendor.id}`
    );
  };

  const fetchVendors = async () => {
    try {
      const res = await API.get("/api/vendors");

      if (res.data.success) {
        setVendors(res.data.vendors || res.data.data || []);
      }
    } catch {
      setVendors([]);
    }
  };

  const fetchVendorAddresses = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (addressTypeFilter) params.append("address_type", addressTypeFilter);
      if (defaultFilter !== "") params.append("is_default", defaultFilter);

      const res = await API.get(`/api/vendor-addresses?${params.toString()}`);

      if (res.data.success) {
        setAddresses(res.data.addresses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorAddresses();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, vendorFilter, addressTypeFilter, defaultFilter]);

  const stats = useMemo(() => {
    const total = addresses.length;
    const defaultAddress = addresses.filter((item) =>
      isDefaultAddress(item.is_default)
    ).length;
    const billing = addresses.filter((item) => item.address_type === "billing").length;
    const shipping = addresses.filter((item) => item.address_type === "shipping").length;

    return {
      total,
      defaultAddress,
      billing,
      shipping,
    };
  }, [addresses]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (address) => {
    setEditingId(address.id);
    setFormData({
      vendor_id: String(address.vendor_id || ""),
      address_type: address.address_type || "office",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      country: address.country || "India",
      pincode: address.pincode || "",
      is_default: isDefaultAddress(address.is_default) ? "1" : "0",
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

    if (!formData.address_line1.trim()) {
      setError("Address line 1 is required");
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
        address_type: formData.address_type,
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim() || "India",
        pincode: formData.pincode.trim(),
        is_default: Number(formData.is_default),
      };

      if (editingId) {
        await API.put(`/api/vendor-addresses/${editingId}`, payload);
        showSuccess("Vendor address updated successfully");
      } else {
        await API.post("/api/vendor-addresses", payload);
        showSuccess("Vendor address created successfully");
      }

      closeForm();
      fetchVendorAddresses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (address) => {
    const confirmDelete = window.confirm(
      `Delete ${getAddressTypeLabel(address.address_type)} address for ${
        address.vendor_name || "this vendor"
      }?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/vendor-addresses/${address.id}`);
      showSuccess("Vendor address deleted successfully");
      fetchVendorAddresses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor address");
    }
  };

  return (
    <AdminLayout>
      <div className="vendor-address-page">
        <style>{css}</style>

        <div className="vendor-address-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <MapPin size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Master</div>
              <h1>Vendor Addresses</h1>
              <p>
                Manage vendor office, billing, shipping and warehouse addresses with
                default address control for purchase and delivery operations.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorAddresses}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Address
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
          <StatCard title="Total Addresses" value={stats.total} icon={MapPin} />
          <StatCard title="Default Addresses" value={stats.defaultAddress} icon={Star} />
          <StatCard title="Billing Addresses" value={stats.billing} icon={Home} />
          <StatCard title="Shipping Addresses" value={stats.shipping} icon={Truck} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Vendor Address" : "Create Vendor Address"}</h2>
                <p>Select vendor and enter address details.</p>
              </div>

              <button type="button" className="close-btn" onClick={closeForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vendor</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {getVendorName(vendor)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Address Type</label>
                  <select
                    name="address_type"
                    value={formData.address_type}
                    onChange={handleChange}
                  >
                    {addressTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Address Line 1</label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    placeholder="Building / Street / Area"
                  />
                </div>

                <div className="form-group full">
                  <label>Address Line 2</label>
                  <input
                    type="text"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    placeholder="Landmark / Floor / Optional"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                  />
                </div>

                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Country"
                  />
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="Pincode"
                  />
                </div>

                <div className="form-group">
                  <label>Default Address</label>
                  <select
                    name="is_default"
                    value={formData.is_default}
                    onChange={handleChange}
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                  {saving ? "Saving..." : editingId ? "Update Address" : "Create Address"}
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
              placeholder="Search address, city, state, vendor..."
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
            value={addressTypeFilter}
            onChange={(event) => setAddressTypeFilter(event.target.value)}
          >
            <option value="">All Types</option>
            {addressTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={defaultFilter}
            onChange={(event) => setDefaultFilter(event.target.value)}
          >
            <option value="">All Addresses</option>
            <option value="1">Default Only</option>
            <option value="0">Non Default</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{addresses.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Vendor Address List</h2>
            <p>Manage all vendor addresses from one premium view.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor addresses...</h3>
              <p>Please wait while address records are loading.</p>
            </div>
          ) : addresses.length === 0 ? (
            <div className="empty-box">
              <MapPin size={34} />
              <h3>No vendor addresses found</h3>
              <p>Create your first vendor address using the New Address button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Address</th>
                    <th>Type</th>
                    <th>City / State</th>
                    <th>Pincode</th>
                    <th>Default</th>
                    <th>Created</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {addresses.map((address) => {
                    const defaultAddress = isDefaultAddress(address.is_default);

                    return (
                      <tr key={address.id}>
                        <td>
                          <div className="main-name">
                            <Building2 size={15} />
                            {address.vendor_name || "-"}
                          </div>
                          <div className="small-text">{address.vendor_code || "-"}</div>
                        </td>

                        <td>
                          <div className="address-text">
                            {address.address_line1 || "-"}
                          </div>
                          <div className="small-text">
                            {address.address_line2 || "-"}
                          </div>
                        </td>

                        <td>
                          <span className={`type-badge ${address.address_type || "office"}`}>
                            {getAddressTypeLabel(address.address_type)}
                          </span>
                        </td>

                        <td>
                          <div className="main-name">
                            <Navigation size={15} />
                            {address.city || "-"}
                          </div>
                          <div className="small-text">
                            {address.state || "-"}, {address.country || "-"}
                          </div>
                        </td>

                        <td>{address.pincode || "-"}</td>

                        <td>
                          <span className={`default-badge ${defaultAddress ? "yes" : "no"}`}>
                            {defaultAddress ? "Default" : "Normal"}
                          </span>
                        </td>

                        <td>{formatDate(address.created_at)}</td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEdit(address)}
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(address)}
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
  .vendor-address-page {
    color: #151515;
  }

  .vendor-address-hero {
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

  .vendor-address-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .vendor-address-hero p {
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
  .cancel-btn {
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

  .cancel-btn {
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

  .stat-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 22px;
    padding: 20px;
    box-shadow: 0 12px 34px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .stat-card h3 {
    margin: 0;
    font-size: 26px;
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

  .form-card,
  .toolbar,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
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
  .form-group select {
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
  }

  .form-group input:focus,
  .form-group select:focus {
    border-color: #facc15;
    background: #fff;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
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
    min-width: 170px;
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
    min-width: 1180px;
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

  .address-text {
    color: #27272a;
    font-weight: 900;
    max-width: 430px;
    line-height: 1.55;
  }

  .type-badge,
  .default-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .type-badge.office {
    background: #eff6ff;
    color: #2563eb;
  }

  .type-badge.billing {
    background: #ecfdf5;
    color: #047857;
  }

  .type-badge.shipping {
    background: #fffbeb;
    color: #b45309;
  }

  .type-badge.warehouse {
    background: #f5f3ff;
    color: #6d28d9;
  }

  .default-badge.yes {
    background: #fffbeb;
    color: #b45309;
  }

  .default-badge.no {
    background: #f4f4f5;
    color: #52525b;
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
    .vendor-address-hero,
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn {
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
  }
`;