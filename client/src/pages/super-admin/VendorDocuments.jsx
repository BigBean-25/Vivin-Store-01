import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const initialForm = {
  vendor_id: "",
  document_type: "GST Certificate",
  document_name: "",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  status: "active",
  notes: "",
};

const documentTypes = [
  "GST Certificate",
  "PAN Card",
  "FSSAI License",
  "Trade License",
  "Agreement",
  "Bank Proof",
  "MSME Certificate",
  "Other",
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
  { value: "rejected", label: "Rejected" },
];

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatFileSize = (size) => {
  if (!size) return "-";

  const number = Number(size);

  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;

  return `${(number / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileUrl = (filePath) => {
  if (!filePath) return "#";
  if (filePath.startsWith("http")) return filePath;

  const baseURL = (API.defaults.baseURL || "http://localhost:5000")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  return `${baseURL}${filePath.startsWith("/") ? filePath : `/${filePath}`}`;
};

const isExpiredDocument = (document) => {
  if (document.status === "expired") return true;
  if (!document.expiry_date) return false;

  const expiry = new Date(document.expiry_date);
  const today = new Date();

  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return expiry < today;
};

const isExpiringSoon = (document) => {
  if (!document.expiry_date || isExpiredDocument(document)) return false;

  const expiry = new Date(document.expiry_date);
  const today = new Date();
  const difference = expiry.getTime() - today.getTime();
  const days = difference / (1000 * 60 * 60 * 24);

  return days >= 0 && days <= 30;
};

export default function VendorDocuments() {
  const [documents, setDocuments] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFilePath, setExistingFilePath] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const fetchVendorDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (vendorFilter) params.append("vendor_id", vendorFilter);
      if (documentTypeFilter) params.append("document_type", documentTypeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await API.get(`/api/vendor-documents?${params.toString()}`);

      if (res.data.success) {
        setDocuments(res.data.documents || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vendor documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendorDocuments();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, vendorFilter, documentTypeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = documents.length;
    const active = documents.filter(
      (item) => item.status === "active" && !isExpiredDocument(item)
    ).length;
    const expired = documents.filter((item) => isExpiredDocument(item)).length;
    const expiring = documents.filter((item) => isExpiringSoon(item)).length;

    return {
      total,
      active,
      expired,
      expiring,
    };
  }, [documents]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setSelectedFile(null);
    setExistingFilePath("");
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setSelectedFile(null);
    setExistingFilePath("");
    setShowForm(false);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      setSelectedFile(null);
      setError("File size should be below 8 MB");
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const handleEdit = (document) => {
    setEditingId(document.id);

    setFormData({
      vendor_id: String(document.vendor_id || ""),
      document_type: document.document_type || "GST Certificate",
      document_name: document.document_name || "",
      document_number: document.document_number || "",
      issue_date: document.issue_date ? String(document.issue_date).slice(0, 10) : "",
      expiry_date: document.expiry_date ? String(document.expiry_date).slice(0, 10) : "",
      status: document.status || "active",
      notes: document.notes || "",
    });

    setSelectedFile(null);
    setExistingFilePath(document.file_path || "");
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (!formData.vendor_id) {
      setError("Vendor is required");
      return false;
    }

    if (!formData.document_type.trim()) {
      setError("Document type is required");
      return false;
    }

    if (!editingId && !selectedFile) {
      setError("Document file is required");
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

      const payload = new FormData();

      payload.append("vendor_id", formData.vendor_id);
      payload.append("document_type", formData.document_type.trim());
      payload.append("document_name", formData.document_name.trim());
      payload.append("document_number", formData.document_number.trim());
      payload.append("issue_date", formData.issue_date);
      payload.append("expiry_date", formData.expiry_date);
      payload.append("status", formData.status);
      payload.append("notes", formData.notes.trim());

      if (selectedFile) {
        payload.append("document", selectedFile);
      }

      if (editingId) {
        await API.put(`/api/vendor-documents/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        showSuccess("Vendor document updated successfully");
      } else {
        await API.post("/api/vendor-documents", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        showSuccess("Vendor document uploaded successfully");
      }

      closeForm();
      fetchVendorDocuments();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vendor document");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (document) => {
    const confirmDelete = window.confirm(
      `Delete ${document.document_name || document.document_type || "this document"}?`
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/vendor-documents/${document.id}`);
      showSuccess("Vendor document deleted successfully");
      fetchVendorDocuments();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor document");
    }
  };

  const handleView = (document) => {
    if (!document.file_path) return;
    window.open(getFileUrl(document.file_path), "_blank", "noopener,noreferrer");
  };

  return (
    <AdminLayout>
      <div className="vendor-doc-page">
        <style>{css}</style>

        <div className="vendor-doc-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <FileText size={30} />
            </div>

            <div>
              <div className="eyebrow">Vendor Compliance</div>
              <h1>Vendor Documents</h1>
              <p>
                Upload and manage vendor GST, PAN, FSSAI, trade license, agreement,
                bank proof and other compliance documents in one secure place.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchVendorDocuments}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={openCreateForm}>
              <Plus size={18} />
              New Document
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
          <StatCard title="Total Documents" value={stats.total} icon={FileText} />
          <StatCard title="Active Documents" value={stats.active} icon={ShieldCheck} />
          <StatCard title="Expired Documents" value={stats.expired} icon={AlertTriangle} />
          <StatCard title="Expiring Soon" value={stats.expiring} icon={CalendarDays} />
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <div>
                <h2>{editingId ? "Edit Vendor Document" : "Upload Vendor Document"}</h2>
                <p>Select vendor, document type and upload the file.</p>
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
                  <label>Document Type</label>
                  <select
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleChange}
                  >
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Document Name</label>
                  <input
                    type="text"
                    name="document_name"
                    value={formData.document_name}
                    onChange={handleChange}
                    placeholder="Example: GST Certificate 2026"
                  />
                </div>

                <div className="form-group">
                  <label>Document Number</label>
                  <input
                    type="text"
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleChange}
                    placeholder="GST / PAN / License number"
                  />
                </div>

                <div className="form-group">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    name="issue_date"
                    value={formData.issue_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
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

                <div className="form-group">
                  <label>Upload File {editingId ? "(Optional)" : ""}</label>
                  <label className="file-upload-box">
                    <Upload size={18} />
                    <span>
                      {selectedFile
                        ? selectedFile.name
                        : editingId && existingFilePath
                        ? "Replace existing file"
                        : "Choose PDF / Image / DOC"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={handleFileChange}
                    />
                  </label>

                  {editingId && existingFilePath && (
                    <button
                      type="button"
                      className="existing-file-btn"
                      onClick={() => window.open(getFileUrl(existingFilePath), "_blank")}
                    >
                      <Eye size={14} />
                      View Existing File
                    </button>
                  )}
                </div>

                <div className="form-group full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Optional remarks"
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
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Document"
                    : "Upload Document"}
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
              placeholder="Search document, vendor, file name..."
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
            value={documentTypeFilter}
            onChange={(event) => setDocumentTypeFilter(event.target.value)}
          >
            <option value="">All Types</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
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

          <div className="api-chip">
            API Connected · <strong>{documents.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Vendor Document List</h2>
            <p>View, download, update and delete vendor compliance files.</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading vendor documents...</h3>
              <p>Please wait while document records are loading.</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-box">
              <FileText size={34} />
              <h3>No vendor documents found</h3>
              <p>Upload your first vendor document using the New Document button.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Document</th>
                    <th>Document No.</th>
                    <th>Validity</th>
                    <th>File</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => {
                    const expired = isExpiredDocument(document);
                    const expiringSoon = isExpiringSoon(document);
                    const finalStatus = expired ? "expired" : document.status || "active";

                    return (
                      <tr key={document.id}>
                        <td>
                          <div className="main-name">
                            <Building2 size={15} />
                            {document.vendor_name || "-"}
                          </div>
                          <div className="small-text">{document.vendor_code || "-"}</div>
                        </td>

                        <td>
                          <div className="main-name">
                            <FileText size={15} />
                            {document.document_name || document.file_name || "-"}
                          </div>
                          <div className="small-text">
                            {document.document_type || "-"}
                          </div>
                        </td>

                        <td>{document.document_number || "-"}</td>

                        <td>
                          <div className="validity-text">
                            Issue: {formatDate(document.issue_date)}
                          </div>
                          <div className={expiringSoon ? "warning-text" : "small-text"}>
                            Expiry: {formatDate(document.expiry_date)}
                          </div>
                        </td>

                        <td>
                          <div className="file-info">{document.file_name || "-"}</div>
                          <div className="small-text">
                            {formatFileSize(document.file_size)}
                          </div>
                        </td>

                        <td>
                          <span className={`status-badge ${finalStatus}`}>
                            {expired
                              ? "Expired"
                              : expiringSoon
                              ? "Expiring Soon"
                              : finalStatus}
                          </span>
                        </td>

                        <td>{formatDate(document.created_at)}</td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="view-btn"
                              onClick={() => handleView(document)}
                              title="View"
                              disabled={!document.file_path}
                            >
                              <Eye size={16} />
                            </button>

                            {document.file_path && (
                              <a
                                className="download-btn"
                                href={getFileUrl(document.file_path)}
                                download
                                title="Download"
                              >
                                <Download size={16} />
                              </a>
                            )}

                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleEdit(document)}
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(document)}
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
  .vendor-doc-page {
    color: #151515;
  }

  .vendor-doc-hero {
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

  .vendor-doc-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .vendor-doc-hero p {
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

  .file-upload-box {
    min-height: 46px;
    border: 1.5px dashed #d4d4d8;
    border-radius: 15px;
    background: #fafafa;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 13px;
    cursor: pointer;
    color: #52525b;
  }

  .file-upload-box input {
    display: none;
  }

  .existing-file-btn {
    width: fit-content;
    border: none;
    background: #eff6ff;
    color: #2563eb;
    border-radius: 999px;
    padding: 8px 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
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
    min-width: 1280px;
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

  .warning-text {
    color: #b45309;
    font-size: 12px;
    margin-top: 6px;
    font-weight: 950;
  }

  .validity-text,
  .file-info {
    color: #27272a;
    font-weight: 900;
    max-width: 240px;
    line-height: 1.5;
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

  .status-badge.expired,
  .status-badge.rejected {
    background: #fff1f2;
    color: #e11d48;
  }

  .status-badge.inactive {
    background: #f4f4f5;
    color: #52525b;
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .view-btn,
  .download-btn,
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
    text-decoration: none;
  }

  .view-btn {
    background: #f5f3ff;
    color: #6d28d9;
  }

  .download-btn {
    background: #ecfdf5;
    color: #047857;
  }

  .edit-btn {
    background: #eff6ff;
    color: #2563eb;
  }

  .delete-btn {
    background: #fff1f2;
    color: #e11d48;
  }

  .view-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
    .vendor-doc-hero,
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