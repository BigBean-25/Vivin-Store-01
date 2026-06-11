import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Ban,
  CheckCircle2,
  Edit3,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

const initialForm = {
  vendor_id: "",
  contact_name: "",
  designation: "",
  department: "",
  phone: "",
  alternate_phone: "",
  email: "",
  whatsapp_number: "",
  is_primary: "0",
  status: "active",
  notes: "",
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isActiveStatus = (status) => {
  return status === "active" || status === 1 || status === "1" || status === true;
};

const isPrimaryContact = (value) => {
  return value === true || value === 1 || value === "1" || value === "true";
};

export default function VendorContacts() {
  const [contacts, setContacts] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [primaryFilter, setPrimaryFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2800);
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

  const fetchVendorContacts = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (primaryFilter !== "") params.append("is_primary", primaryFilter);

      const res = await API.get(`/api/vendor-contacts?${params.toString()}`);

      if (res.data.success) {
        setContacts(res.data.contacts || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorContacts();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, vendorFilter, statusFilter, primaryFilter]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const active = contacts.filter((item) => isActiveStatus(item.status)).length;
    const inactive = contacts.filter((item) => !isActiveStatus(item.status)).length;
    const primary = contacts.filter((item) => isPrimaryContact(item.is_primary)).length;

    return {
      total,
      active,
      inactive,
      primary,
    };
  }, [contacts]);

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

  const handleEdit = (contact) => {
    setEditingId(contact.id);
    setFormData({
      vendor_id: String(contact.vendor_id || ""),
      contact_name: contact.contact_name || "",
      designation: contact.designation || "",
      department: contact.department || "",
      phone: contact.phone || "",
      alternate_phone: contact.alternate_phone || "",
      email: contact.email || "",
      whatsapp_number: contact.whatsapp_number || "",
      is_primary: isPrimaryContact(contact.is_primary) ? "1" : "0",
      status: isActiveStatus(contact.status) ? "active" : "inactive",
      notes: contact.notes || "",
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

    if (!formData.contact_name.trim()) {
      setError("Contact name is required");
      return false;
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      setError("Phone or email is required");
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
        contact_name: formData.contact_name.trim(),
        designation: formData.designation.trim(),
        department: formData.department.trim(),
        phone: formData.phone.trim(),
        alternate_phone: formData.alternate_phone.trim(),
        email: formData.email.trim(),
        whatsapp_number: formData.whatsapp_number.trim(),
        is_primary: Number(formData.is_primary),
        status: formData.status,
        notes: formData.notes.trim(),
      };

      if (editingId) {
        await API.put(`/api/vendor-contacts/${editingId}`, payload);
        showSuccess("Vendor contact updated successfully");
      } else {
        await API.post("/api/vendor-contacts", payload);
        showSuccess("Vendor contact created successfully");
      }

      closeForm();
      fetchVendorContacts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contact) => {
    const confirmDelete = window.confirm(
      `Delete vendor contact "${contact.contact_name}"?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/vendor-contacts/${contact.id}`);
      showSuccess("Vendor contact deleted successfully");
      fetchVendorContacts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor contact");
    }
  };

  return (
    <AdminLayout>
      <div className="vendor-contact-page">
        <style>{css}</style>

        <div className="vendor-contact-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <UserRound size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Master</div>
              <h1>Vendor Contacts</h1>
              <p>
                Manage vendor contact persons, phone numbers, email, WhatsApp,
                department, designation and primary contact information.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorContacts}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Contact
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
          <StatCard title="Total Contacts" value={stats.total} icon={Users} />
          <StatCard title="Active Contacts" value={stats.active} icon={ShieldCheck} />
          <StatCard title="Inactive Contacts" value={stats.inactive} icon={Ban} />
          <StatCard title="Primary Contacts" value={stats.primary} icon={Star} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Vendor Contact" : "Create Vendor Contact"}</h2>
                <p>Select vendor and enter contact person details.</p>
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
                        {vendor.business_name || `Vendor #${vendor.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    placeholder="Example: Raj Kumar"
                  />
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="Example: Sales Manager"
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Example: Sales"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Mobile number"
                  />
                </div>

                <div className="form-group">
                  <label>Alternate Phone</label>
                  <input
                    type="text"
                    name="alternate_phone"
                    value={formData.alternate_phone}
                    onChange={handleChange}
                    placeholder="Alternate number"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contact@vendor.com"
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Number</label>
                  <input
                    type="text"
                    name="whatsapp_number"
                    value={formData.whatsapp_number}
                    onChange={handleChange}
                    placeholder="WhatsApp number"
                  />
                </div>

                <div className="form-group">
                  <label>Primary Contact</label>
                  <select
                    name="is_primary"
                    value={formData.is_primary}
                    onChange={handleChange}
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Write contact notes..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
                  {saving ? "Saving..." : editingId ? "Update Contact" : "Create Contact"}
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
              placeholder="Search contact, phone, email, vendor..."
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
                {vendor.business_name || `Vendor #${vendor.id}`}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="filter-select"
            value={primaryFilter}
            onChange={(event) => setPrimaryFilter(event.target.value)}
          >
            <option value="">All Contacts</option>
            <option value="1">Primary Only</option>
            <option value="0">Non Primary</option>
          </select>

          <div className="api-chip">
            API Connected · <strong>{contacts.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Vendor Contact List</h2>
            <p>Manage all supplier contact persons from one premium view.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor contacts...</h3>
              <p>Please wait while contact records are loading.</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="empty-box">
              <UserRound size={34} />
              <h3>No vendor contacts found</h3>
              <p>Create your first vendor contact using the New Contact button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Vendor</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Designation</th>
                    <th>Primary</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {contacts.map((contact) => {
                    const active = isActiveStatus(contact.status);
                    const primary = isPrimaryContact(contact.is_primary);

                    return (
                      <tr key={contact.id}>
                        <td>
                          <div className="main-name">
                            <UserRound size={15} />
                            {contact.contact_name || "-"}
                          </div>
                          <div className="small-text">Contact ID: #{contact.id}</div>
                        </td>

                        <td>
                          <div className="main-name">
                            <Tags size={15} />
                            {contact.vendor_name || "-"}
                          </div>
                          <div className="small-text">{contact.vendor_code || "-"}</div>
                        </td>

                        <td>
                          <div className="contact-line">
                            <Phone size={14} />
                            {contact.phone || "-"}
                          </div>
                          <div className="small-text">
                            Alt: {contact.alternate_phone || "-"}
                          </div>
                        </td>

                        <td>
                          <div className="contact-line">
                            <Mail size={14} />
                            {contact.email || "-"}
                          </div>
                          <div className="small-text">
                            WhatsApp: {contact.whatsapp_number || "-"}
                          </div>
                        </td>

                        <td>
                          <div>{contact.designation || "-"}</div>
                          <div className="small-text">{contact.department || "-"}</div>
                        </td>

                        <td>
                          <span className={`primary-badge ${primary ? "yes" : "no"}`}>
                            {primary ? "Primary" : "Normal"}
                          </span>
                        </td>

                        <td>
                          <span className={`status-badge ${active ? "active" : "inactive"}`}>
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>{formatDate(contact.created_at)}</td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEdit(contact)}
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(contact)}
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
  .vendor-contact-page {
    color: #151515;
  }

  .vendor-contact-hero {
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

  .vendor-contact-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .vendor-contact-hero p {
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
  }

  .form-group textarea {
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
    min-width: 1250px;
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

  .contact-line {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #27272a;
    font-weight: 900;
  }

  .status-badge,
  .primary-badge {
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

  .status-badge.inactive {
    background: #fff1f2;
    color: #be123c;
  }

  .primary-badge.yes {
    background: #fffbeb;
    color: #b45309;
  }

  .primary-badge.no {
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
    .vendor-contact-hero,
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