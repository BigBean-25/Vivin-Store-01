import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Building2,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

const BRAND = {
  yellow: "#FFD21E",
  yellowDark: "#E7B900",
  yellowSoft: "#FFF7C2",
  black: "#111214",
  blackSoft: "#1F2226",
  grey: "#6B7280",
  white: "#FFFFFF",
};

const initialForm = {
  business_name: "",
  contact_person: "",
  email: "",
  phone: "",
  gst_number: "",
  pan_number: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  credit_days: 0,
  status: "active",
};

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/vendors");

      if (res.data.success) {
        setVendors(res.data.vendors || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const text = `
        ${vendor.business_name || ""}
        ${vendor.contact_person || ""}
        ${vendor.email || ""}
        ${vendor.phone || ""}
        ${vendor.city || ""}
        ${vendor.state || ""}
        ${vendor.gst_number || ""}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [vendors, search]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = (vendor) => {
    setEditingVendorId(vendor.id);

    setFormData({
      business_name: vendor.business_name || "",
      contact_person: vendor.contact_person || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      gst_number: vendor.gst_number || "",
      pan_number: vendor.pan_number || "",
      address: vendor.address || "",
      city: vendor.city || "",
      state: vendor.state || "",
      pincode: vendor.pincode || "",
      credit_days: vendor.credit_days || 0,
      status: vendor.status || "active",
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingVendorId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.business_name.trim()) {
      setError("Business name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      let res;

      if (editingVendorId) {
        res = await API.put(`/api/vendors/${editingVendorId}`, formData);
      } else {
        res = await API.post("/api/vendors", formData);
      }

      if (res.data.success) {
        setFormData(initialForm);
        setEditingVendorId(null);
        setShowForm(false);
        fetchVendors();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingVendorId ? "Failed to update vendor" : "Failed to create vendor")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to deactivate this vendor?");

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/vendors/${id}`);
      fetchVendors();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deactivate vendor");
    }
  };

  return (
    <AdminLayout>
      <div className="vendor-page">
        <style>{css}</style>

        <div className="vendor-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <Building2 size={28} />
            </div>

            <div>
              <h1>Vendor Management</h1>
              <p>
                Add and manage suppliers, GST/PAN details, contact information,
                payment terms and vendor status for procurement workflow.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button className="secondary-btn" type="button" onClick={fetchVendors}>
              <RefreshCw size={17} />
              Refresh
            </button>

            <button className="primary-btn" type="button" onClick={() => setShowForm(true)}>
              <Plus size={18} />
              Add Vendor
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>{vendors.length}</h3>
            <p>Total Vendors</p>
          </div>

          <div className="stat-card">
            <h3>{vendors.filter((v) => v.status === "active").length}</h3>
            <p>Active Vendors</p>
          </div>

          <div className="stat-card">
            <h3>{vendors.filter((v) => v.status === "pending").length}</h3>
            <p>Pending Vendors</p>
          </div>

          <div className="stat-card">
            <h3>{vendors.filter((v) => v.status === "inactive").length}</h3>
            <p>Inactive Vendors</p>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <h2>{editingVendorId ? "Edit Vendor" : "Add New Vendor"}</h2>

              <button className="close-btn" type="button" onClick={handleCancelForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Business Name *</label>
                  <input
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    placeholder="ABC Traders"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                    placeholder="Ramesh"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="abc@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                  />
                </div>

                <div className="form-group">
                  <label>GST Number</label>
                  <input
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>

                <div className="form-group">
                  <label>PAN Number</label>
                  <input
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleChange}
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Bangalore"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Karnataka"
                  />
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="560001"
                  />
                </div>

                <div className="form-group">
                  <label>Credit Days</label>
                  <input
                    type="number"
                    name="credit_days"
                    value={formData.credit_days}
                    onChange={handleChange}
                    placeholder="15"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter vendor address"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={handleCancelForm}>
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Saving..." : editingVendorId ? "Update Vendor" : "Save Vendor"}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors by name, phone, email, GST..."
            />
          </div>

          <div>
            Showing <strong>{filteredVendors.length}</strong> vendors
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <h2>Vendor List</h2>
              <p>Supplier records from MySQL database</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <div>
                <h3>Loading vendors...</h3>
                <p>Please wait while vendor records are loading.</p>
              </div>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="empty-box">
              <div>
                <h3>No vendors found</h3>
                <p>Click Add Vendor to create your first supplier.</p>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Contact</th>
                    <th>GST / PAN</th>
                    <th>Location</th>
                    <th>Credit</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>
                        <div className="vendor-name">{vendor.business_name}</div>
                        <div className="small-text">Code: {vendor.vendor_code || "-"}</div>
                      </td>

                      <td>
                        <div>{vendor.contact_person || "-"}</div>

                        {vendor.phone && (
                          <div className="small-text">
                            <Phone size={13} />
                            {vendor.phone}
                          </div>
                        )}

                        {vendor.email && (
                          <div className="small-text">
                            <Mail size={13} />
                            {vendor.email}
                          </div>
                        )}
                      </td>

                      <td>
                        <div>GST: {vendor.gst_number || "-"}</div>
                        <div className="small-text">PAN: {vendor.pan_number || "-"}</div>
                      </td>

                      <td>
                        <div className="small-text">
                          <MapPin size={13} />
                          {[vendor.city, vendor.state].filter(Boolean).join(", ") || "-"}
                        </div>

                        <div className="small-text">PIN: {vendor.pincode || "-"}</div>
                      </td>

                      <td>{vendor.credit_days || 0} days</td>

                      <td>
                        <span className={`status-badge ${vendor.status}`}>
                          {vendor.status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-btn"
                            type="button"
                            onClick={() => handleEdit(vendor)}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            className="delete-btn"
                            type="button"
                            onClick={() => handleDeactivate(vendor.id)}
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

const css = `
  .vendor-page {
    color: ${BRAND.black};
    position: relative;
  }

  .vendor-page::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 20% 0%, rgba(255,210,30,0.12), transparent 28%),
      radial-gradient(circle at 90% 18%, rgba(255,210,30,0.10), transparent 24%);
    z-index: -1;
  }

  .vendor-hero {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top right, rgba(255,210,30,0.26), transparent 34%),
      linear-gradient(135deg, #090909 0%, #171717 56%, #2A2A2A 100%);
    border: 1px solid rgba(255,210,30,0.20);
    border-radius: 32px;
    padding: 34px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    gap: 22px;
    align-items: flex-start;
    box-shadow: 0 28px 70px rgba(20,20,20,0.22);
  }

  .vendor-hero::after {
    content: "";
    position: absolute;
    width: 280px;
    height: 280px;
    right: -90px;
    top: -110px;
    border-radius: 999px;
    background: rgba(255,210,30,0.22);
    filter: blur(4px);
  }

  .hero-left {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }

  .hero-left,
  .hero-actions {
    position: relative;
    z-index: 1;
  }

  .hero-icon {
    width: 62px;
    height: 62px;
    border-radius: 21px;
    background: linear-gradient(135deg, ${BRAND.yellow}, ${BRAND.yellowDark});
    color: ${BRAND.black};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 18px 40px rgba(255,210,30,0.26);
    flex-shrink: 0;
  }

  .vendor-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    letter-spacing: -1px;
    color: #fff;
  }

  .vendor-hero p {
    margin: 10px 0 0;
    color: rgba(255,255,255,0.64);
    font-size: 14px;
    line-height: 1.75;
    max-width: 760px;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .primary-btn,
  .secondary-btn {
    border: none;
    height: 46px;
    padding: 0 18px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }

  .primary-btn:hover,
  .secondary-btn:hover,
  .edit-btn:hover,
  .delete-btn:hover,
  .close-btn:hover {
    transform: translateY(-1px);
  }

  .primary-btn {
    background: linear-gradient(135deg, ${BRAND.yellow}, ${BRAND.yellowDark});
    color: ${BRAND.black};
    box-shadow: 0 14px 30px rgba(255,210,30,0.25);
  }

  .primary-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .secondary-btn {
    background: rgba(255,255,255,0.94);
    color: ${BRAND.black};
    border: 1px solid rgba(255,255,255,0.58);
    box-shadow: 0 12px 28px rgba(20,20,20,0.08);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 22px;
  }

  .stat-card {
    position: relative;
    overflow: hidden;
    background: rgba(255,255,255,0.94);
    border: 1px solid rgba(236,236,236,0.9);
    border-radius: 22px;
    padding: 22px;
    box-shadow: 0 14px 36px rgba(20,20,20,0.06);
    backdrop-filter: blur(10px);
  }

  .stat-card::after {
    content: "";
    position: absolute;
    inset: auto 18px 0 18px;
    height: 3px;
    border-radius: 999px 999px 0 0;
    background: linear-gradient(90deg, ${BRAND.yellow}, ${BRAND.yellowDark});
  }

  .stat-card h3 {
    margin: 0;
    font-size: 28px;
    font-weight: 950;
    color: #111;
  }

  .stat-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 13px;
    font-weight: 800;
  }

  .toolbar {
    background: rgba(255,255,255,0.96);
    border: 1px solid #ececec;
    border-radius: 24px;
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    box-shadow: 0 14px 36px rgba(20,20,20,0.055);
    backdrop-filter: blur(10px);
  }

  .search-wrap {
    max-width: 440px;
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

  .search-wrap:focus-within {
    border-color: ${BRAND.yellow};
    box-shadow: 0 0 0 4px rgba(255,210,30,0.14);
  }

  .search-wrap input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    font-weight: 700;
  }

  .error-box {
    background: #fffbe6;
    border: 1px solid #f6d94d;
    color: #7a5c00;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 800;
  }

  .form-card {
    background: rgba(255,255,255,0.96);
    border: 1px solid #ececec;
    border-radius: 28px;
    padding: 26px;
    margin-bottom: 22px;
    box-shadow: 0 18px 46px rgba(20,20,20,0.075);
    backdrop-filter: blur(10px);
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 22px;
  }

  .form-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 950;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 13px;
    border: none;
    background: #f6f6f6;
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

  .form-group.full {
    grid-column: 1 / -1;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 900;
    color: #333;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    border: 1.5px solid #e8e8e8;
    border-radius: 14px;
    padding: 13px 14px;
    font-size: 14px;
    font-weight: 650;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-group textarea {
    min-height: 90px;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    border-color: ${BRAND.yellow};
    box-shadow: 0 0 0 4px rgba(255,210,30,0.14);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
  }

  .table-card {
    background: rgba(255,255,255,0.96);
    border: 1px solid #ececec;
    border-radius: 28px;
    padding: 22px;
    box-shadow: 0 18px 46px rgba(20,20,20,0.065);
    overflow: hidden;
    backdrop-filter: blur(10px);
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    margin-bottom: 18px;
  }

  .table-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 950;
  }

  .table-header p {
    margin: 5px 0 0;
    color: #777;
    font-size: 13px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 980px;
  }

  th {
    background: linear-gradient(180deg, #fffbe6, #f8f5df);
    color: #5f5f5f;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    text-align: left;
    padding: 14px;
    border-bottom: 1px solid #eeeeee;
  }

  td {
    padding: 15px 14px;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
    font-size: 13px;
    vertical-align: top;
  }

  tbody tr {
    transition: background .18s ease;
  }

  tbody tr:hover {
    background: #fffdf0;
  }

  .vendor-name {
    font-weight: 950;
    color: #111;
  }

  .small-text {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #777;
    font-size: 12.5px;
    margin-top: 5px;
  }

  .status-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 900;
    text-transform: capitalize;
  }

  .status-badge.active {
    background: #effbf4;
    color: #1c9b58;
  }

  .status-badge.pending {
    background: #fffbe6;
    color: #9a7400;
  }

  .status-badge.inactive,
  .status-badge.blocked {
    background: #fff1f1;
    color: #d63636;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  .edit-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: none;
    background: #fffbe6;
    color: #9a7400;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .delete-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: none;
    background: #fff1f1;
    color: #d63636;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .empty-box {
    min-height: 180px;
    border: 1px dashed #ddd;
    border-radius: 20px;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 28px;
  }

  .empty-box h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
  }

  .empty-box p {
    margin: 8px 0 0;
    color: #777;
    font-size: 13px;
  }

  @media (max-width: 1100px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .form-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .vendor-hero {
      flex-direction: column;
    }
  }

  @media (max-width: 640px) {
    .stats-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .vendor-hero h1 {
      font-size: 25px;
    }
  }
`;