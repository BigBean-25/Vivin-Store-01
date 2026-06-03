import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import "./procurementFinalPages.css";

const defaultForm = {
  module_name: "purchase_orders",
  record_id: "",
  reference_number: "",
  document_title: "",
  document_type: "invoice",
  remarks: "",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const formatSize = (bytes) => {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProcurementDocuments() {
  const [summary, setSummary] = useState({});
  const [documents, setDocuments] = useState([]);
  const [formData, setFormData] = useState(defaultForm);
  const [file, setFile] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    module_name: "",
    document_type: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3500);
  };

  const fetchSummary = useCallback(async () => {
    try {
      const res = await API.get("/api/procurement-documents/summary");
      setSummary(res.data?.summary || {});
    } catch (error) {
      console.error("Document summary error:", error.response?.data || error);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/procurement-documents", {
        params: {
          search: filters.search || undefined,
          module_name: filters.module_name || undefined,
          document_type: filters.document_type || undefined,
        },
      });
      setDocuments(res.data?.documents || res.data?.data || []);
    } catch (error) {
      console.error("Document list error:", error.response?.data || error);
      showMessage("error", error.response?.data?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setTimeout(fetchDocuments, 300);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const refreshAll = () => {
    fetchSummary();
    fetchDocuments();
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!formData.module_name || !formData.record_id) {
      showMessage("error", "Module name and Record ID required");
      return;
    }

    if (!file) {
      showMessage("error", "Please select document file");
      return;
    }

    try {
      setUploading(true);

      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => body.append(key, value));
      body.append("document", file);

      await API.post("/api/procurement-documents", body);

      showMessage("success", "Document uploaded successfully");
      setFormData(defaultForm);
      setFile(null);
      event.target.reset();
      refreshAll();
    } catch (error) {
      console.error("Upload document error:", error.response?.data || error);
      showMessage("error", error.response?.data?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (id) => {
    window.open(`${API.defaults.baseURL}/api/procurement-documents/${id}/download`, "_blank");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;

    try {
      await API.delete(`/api/procurement-documents/${id}`);
      showMessage("success", "Document deleted successfully");
      refreshAll();
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Failed to delete document");
    }
  };

  return (
    <AdminLayout>
      <div className="final-proc-page">
        <div className="final-hero">
          <div>
            <div className="final-eyebrow">
              <FileText size={15} />
              Procurement Documents
            </div>
            <h1>Procurement Documents / Attachments</h1>
            <p>Upload invoice, quotation, delivery challan, GRN proof and payment proof.</p>
          </div>

          <div className="final-actions">
            <button className="final-btn secondary" onClick={refreshAll}>
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`final-message ${message.type}`}>
            {message.type === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
            {message.text}
          </div>
        )}

        <div className="final-grid five" style={{ marginBottom: 22 }}>
          <SummaryCard title="Total Docs" value={summary.total_documents || 0} icon={FileText} />
          <SummaryCard title="Invoices" value={summary.invoice_count || 0} icon={FileText} />
          <SummaryCard title="Quotations" value={summary.quotation_count || 0} icon={FileText} />
          <SummaryCard title="GRN Proof" value={summary.grn_proof_count || 0} icon={FileText} />
          <SummaryCard title="File Size" value={formatSize(summary.total_file_size)} icon={Upload} />
        </div>

        <form className="final-card" onSubmit={handleUpload}>
          <div className="final-section-head">
            <div>
              <h2>Upload Document</h2>
              <p>Attach procurement related files against any module record.</p>
            </div>
            <button className="final-btn dark" disabled={uploading}>
              {uploading ? <Loader2 size={16} className="final-spin" /> : <Upload size={16} />}
              Upload
            </button>
          </div>

          <div className="final-grid four">
            <select
              value={formData.module_name}
              onChange={(e) => setFormData((p) => ({ ...p, module_name: e.target.value }))}
            >
              <option value="purchase_orders">Purchase Orders</option>
              <option value="goods_receipts">Goods Receipts / GRN</option>
              <option value="procurement_payments">Payments</option>
              <option value="procurement_returns">Returns</option>
              <option value="vendor_quotations">Vendor Quotations</option>
            </select>

            <input
              value={formData.record_id}
              onChange={(e) => setFormData((p) => ({ ...p, record_id: e.target.value }))}
              placeholder="Record ID"
            />

            <input
              value={formData.reference_number}
              onChange={(e) => setFormData((p) => ({ ...p, reference_number: e.target.value }))}
              placeholder="Reference Number"
            />

            <select
              value={formData.document_type}
              onChange={(e) => setFormData((p) => ({ ...p, document_type: e.target.value }))}
            >
              <option value="invoice">Invoice</option>
              <option value="quotation">Quotation</option>
              <option value="delivery_challan">Delivery Challan</option>
              <option value="grn_proof">GRN Proof</option>
              <option value="payment_proof">Payment Proof</option>
              <option value="other">Other</option>
            </select>

            <input
              value={formData.document_title}
              onChange={(e) => setFormData((p) => ({ ...p, document_title: e.target.value }))}
              placeholder="Document Title"
            />

            <input
              value={formData.remarks}
              onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
              placeholder="Remarks"
            />

            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        </form>

        <div className="final-card">
          <div className="final-section-head">
            <div>
              <h2>Document List</h2>
              <p>View and download uploaded procurement documents.</p>
            </div>
          </div>

          <div className="final-grid three" style={{ marginBottom: 16 }}>
            <input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search document..."
            />
            <select
              value={filters.module_name}
              onChange={(e) => setFilters((p) => ({ ...p, module_name: e.target.value }))}
            >
              <option value="">All Modules</option>
              <option value="purchase_orders">Purchase Orders</option>
              <option value="goods_receipts">GRN</option>
              <option value="procurement_payments">Payments</option>
              <option value="procurement_returns">Returns</option>
            </select>
            <select
              value={filters.document_type}
              onChange={(e) => setFilters((p) => ({ ...p, document_type: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="quotation">Quotation</option>
              <option value="delivery_challan">Delivery Challan</option>
              <option value="grn_proof">GRN Proof</option>
              <option value="payment_proof">Payment Proof</option>
            </select>
          </div>

          {loading ? (
            <Empty text="Loading documents..." loading />
          ) : documents.length === 0 ? (
            <Empty text="No documents found" />
          ) : (
            <div className="final-table-wrap">
              <table className="final-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Module</th>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>File</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td><strong>{doc.document_title}</strong></td>
                      <td>{doc.module_name}</td>
                      <td>{doc.reference_number || doc.record_id}</td>
                      <td><span className="final-badge">{doc.document_type}</span></td>
                      <td>{doc.original_name || doc.file_name}</td>
                      <td>{formatSize(doc.file_size)}</td>
                      <td>{formatDate(doc.uploaded_at)}</td>
                      <td>
                        <div className="final-actions">
                          <button className="final-icon-btn good" onClick={() => handleDownload(doc.id)}>
                            <Download size={15} />
                          </button>
                          <button className="final-icon-btn danger" onClick={() => handleDelete(doc.id)}>
                            <Trash2 size={15} />
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

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <div className="final-summary-card">
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="final-summary-icon">
        <Icon size={20} />
      </div>
    </div>
  );
}

function Empty({ text, loading }) {
  return (
    <div className="final-empty">
      {loading ? <Loader2 size={28} className="final-spin" /> : <Search size={28} />}
      <h3>{text}</h3>
      <p>Procurement document records will appear here.</p>
    </div>
  );
}
