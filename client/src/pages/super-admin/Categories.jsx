import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import { Edit3, FolderTree, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

const initialForm = { name: "", slug: "", image: "", description: "", sort_order: 0, status: "active" };
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({});
  const [formData, setFormData] = useState(initialForm);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const fetchSummary = async () => {
    try {
      const res = await API.get("/api/categories/summary");
      if (res.data.success) setSummary(res.data.summary || {});
    } catch { setSummary({}); }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const [catRes] = await Promise.all([API.get("/api/categories"), fetchSummary()]);
      if (catRes.data.success) setCategories(catRes.data.categories || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => categories.filter((category) => {
    const text = `${category.name || ""} ${category.slug || ""} ${category.description || ""} ${category.status || ""}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (statusFilter === "all" || category.status === statusFilter);
  }), [categories, search, statusFilter]);
  const createSlug = (text) => String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      setFormData({ ...formData, name: value, slug: formData.slug ? formData.slug : createSlug(value) });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be below 5MB");
      return;
    }

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleEdit = (category) => {
    setEditingCategoryId(category.id);
    setFormData({ name: category.name || "", slug: category.slug || "", image: category.image || "", description: category.description || "", sort_order: category.sort_order || 0, status: category.status || "active" });
    setImageFile(null);
    setImagePreview(getImageUrl(category.image || ""));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setFormData(initialForm);
    setImageFile(null);
    setImagePreview("");
    setEditingCategoryId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError("Category name is required");
    try {
      setSaving(true);
      setError("");

      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("slug", formData.slug || "");
      payload.append("description", formData.description || "");
      payload.append("sort_order", formData.sort_order || 0);
      payload.append("status", formData.status || "active");

      if (imageFile) {
        payload.append("image", imageFile);
      }

      const res = editingCategoryId ? await API.put(`/api/categories/${editingCategoryId}`, payload) : await API.post("/api/categories", payload);
      if (res.data.success) {
        handleCancelForm();
        fetchCategories();
      }
    } catch (err) {
      setError(err.response?.data?.message || (editingCategoryId ? "Failed to update category" : "Failed to create category"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (category) => {
    const newStatus = category.status === "active" ? "inactive" : "active";
    if (!window.confirm(`${newStatus === "inactive" ? "Deactivate" : "Activate"} category "${category.name}"?`)) return;
    try {
      setError("");
      await API.patch(`/api/categories/${category.id}/status`, { status: newStatus });
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update category status");
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Permanently delete category "${category.name}"? This cannot be undone.`)) return;
    try {
      setError("");
      await API.delete(`/api/categories/${category.id}`);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <AdminLayout>
      <div className="category-page">
        <style>{css}</style>
        <div className="category-hero">
          <div className="hero-left"><div className="hero-icon"><FolderTree size={28} /></div><div><h1>Product Categories</h1><p>Create and manage your own product categories for Vivin Store B2B supply platform. These categories will be used in product creation and product filters.</p></div></div>
          <div className="hero-actions"><button className="secondary-btn" type="button" onClick={fetchCategories}><RefreshCw size={17} />Refresh</button><button className="primary-btn" type="button" onClick={() => setShowForm(true)}><Plus size={18} />Add Category</button></div>
        </div>

        <div className="stats-grid"><div className="stat-card"><h3>{Number(summary.total_categories) || categories.length}</h3><p>Total Categories</p></div><div className="stat-card"><h3>{Number(summary.active_categories) || categories.filter((c) => c.status === "active").length}</h3><p>Active Categories</p></div><div className="stat-card"><h3>{Number(summary.inactive_categories) || categories.filter((c) => c.status === "inactive").length}</h3><p>Inactive Categories</p></div></div>
        {error && <div className="error-box">{error}</div>}

        {showForm && <div className="form-card"><div className="form-header"><h2>{editingCategoryId ? "Edit Category" : "Add New Category"}</h2><button className="close-btn" type="button" onClick={handleCancelForm}><X size={18} /></button></div><form onSubmit={handleSubmit}><div className="form-grid"><div className="form-group"><label>Category Name *</label><input name="name" value={formData.name} onChange={handleChange} placeholder="Vegetables" required /></div><div className="form-group"><label>Slug</label><input name="slug" value={formData.slug} onChange={handleChange} placeholder="vegetables" /></div><div className="form-group"><label>Sort Order</label><input type="number" name="sort_order" value={formData.sort_order} onChange={handleChange} placeholder="1" /></div><div className="form-group"><label>Choose Image</label><input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} /></div><div className="form-group"><label>Status</label><select name="status" value={formData.status} onChange={handleChange}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>{imagePreview && <div className="form-group"><label>Image Preview</label><img src={imagePreview} alt="Category preview" className="category-image-preview" /></div>}<div className="form-group full"><label>Description</label><textarea name="description" value={formData.description} onChange={handleChange} placeholder="Fresh vegetables and daily kitchen items" /></div></div><div className="form-actions"><button type="button" className="secondary-btn" onClick={handleCancelForm}>Cancel</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving..." : editingCategoryId ? "Update Category" : "Save Category"}</button></div></form></div>}

        <div className="toolbar"><div className="search-wrap"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search category name, slug or status..." /></div><select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><div>Showing <strong>{filteredCategories.length}</strong> categories</div></div>
        <div className="table-card"><div className="table-header"><div><h2>Category List</h2><p>Product category records from MySQL database</p></div></div>{loading ? <div className="empty-box"><div><h3>Loading categories...</h3><p>Please wait while category records are loading.</p></div></div> : filteredCategories.length === 0 ? <div className="empty-box"><div><h3>No categories found</h3><p>Click Add Category to create your first product category.</p></div></div> : <div className="table-wrap"><table><thead><tr><th>Image</th><th>Category</th><th>Description</th><th>Sort Order</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredCategories.map((category) => <tr key={category.id}><td>{category.image ? <img src={getImageUrl(category.image)} alt={category.name} className="category-image" /> : <div className="image-placeholder"><FolderTree size={20} /></div>}</td><td><div className="category-name">{category.name}</div><div className="slug-text">/{category.slug}</div></td><td>{category.description || "-"}</td><td>{category.sort_order || 0}</td><td><span className={`status-badge ${category.status}`}>{category.status}</span></td><td><div className="action-buttons"><button className="edit-btn" type="button" onClick={() => handleEdit(category)} title="Edit"><Edit3 size={16} /></button><button type="button" onClick={() => handleToggleStatus(category)} title={category.status === "active" ? "Deactivate" : "Activate"} style={{height:'32px',padding:'0 10px',borderRadius:'10px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:category.status==="active"?'#fff1f1':'#effbf4',color:category.status==="active"?'#d63636':'#1c9b58'}}>{category.status === "active" ? "Deactivate" : "Activate"}</button><button className="delete-btn" type="button" onClick={() => handleDelete(category)} title="Delete permanently"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}</div>
      </div>
    </AdminLayout>
  );
}

const css = `.category-page{color:#151515}.category-hero{background:radial-gradient(circle at top right,rgba(232,119,58,.20),transparent 30%),linear-gradient(135deg,#fff,#fff8f3);border:1px solid #f1ded2;border-radius:28px;padding:30px;margin-bottom:24px;display:flex;justify-content:space-between;gap:22px;align-items:flex-start;box-shadow:0 8px 28px rgba(0,0,0,.045)}.hero-left{display:flex;gap:18px;align-items:flex-start}.hero-icon{width:58px;height:58px;border-radius:19px;background:linear-gradient(135deg,#E8773A,#FF9A62);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(232,119,58,.28);flex-shrink:0}.category-hero h1{margin:0;font-size:30px;font-weight:950;letter-spacing:-.8px;color:#111}.category-hero p{margin:9px 0 0;color:#777;font-size:14px;line-height:1.7;max-width:760px}.hero-actions{display:flex;gap:12px;flex-wrap:wrap}.primary-btn,.secondary-btn{border:none;height:46px;padding:0 18px;border-radius:15px;display:flex;align-items:center;gap:9px;font-weight:900;cursor:pointer;white-space:nowrap}.primary-btn{background:linear-gradient(135deg,#E8773A,#FF9A62);color:#fff;box-shadow:0 12px 26px rgba(232,119,58,.25)}.primary-btn:disabled{opacity:.7;cursor:not-allowed}.secondary-btn{background:#fff;color:#333;border:1px solid #e8e8e8}.stats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:22px}.stat-card{background:#fff;border:1px solid #ececec;border-radius:20px;padding:20px;box-shadow:0 8px 26px rgba(0,0,0,.04)}.stat-card h3{margin:0;font-size:28px;font-weight:950;color:#111}.stat-card p{margin:7px 0 0;color:#777;font-size:13px;font-weight:800}.error-box{background:#fff1f1;border:1px solid #ffc9c9;color:#d63636;padding:13px 15px;border-radius:16px;margin-bottom:18px;font-size:13px;font-weight:800}.form-card,.toolbar,.table-card{background:#fff;border:1px solid #ececec;border-radius:24px;box-shadow:0 8px 26px rgba(0,0,0,.04)}.form-card{padding:24px;margin-bottom:22px}.form-header,.toolbar,.table-header{display:flex;justify-content:space-between;align-items:center;gap:16px}.form-header{margin-bottom:22px}.form-header h2,.table-header h2{margin:0;font-size:20px;font-weight:950}.close-btn{width:40px;height:40px;border-radius:13px;border:none;background:#f6f6f6;cursor:pointer;display:flex;align-items:center;justify-content:center}.form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.form-group{display:flex;flex-direction:column;gap:8px}.form-group.full{grid-column:1/-1}.form-group label{font-size:13px;font-weight:900;color:#333}.form-group input,.form-group select,.form-group textarea{width:100%;border:1.5px solid #e8e8e8;border-radius:14px;padding:13px 14px;font-size:14px;font-weight:650;outline:none;box-sizing:border-box;font-family:inherit}.form-group input[type=file]{padding:10px;background:#fafafa}.form-group textarea{min-height:90px;resize:vertical}.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:#E8773A;box-shadow:0 0 0 4px rgba(232,119,58,.10)}.category-image-preview{width:92px;height:92px;border-radius:18px;object-fit:cover;background:#f5f5f5;border:1px solid #eee}.form-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:22px}.toolbar{border-radius:22px;padding:18px;margin-bottom:22px}.search-wrap{max-width:440px;width:100%;height:46px;border-radius:15px;background:#f7f7f7;border:1px solid #eee;display:flex;align-items:center;gap:10px;padding:0 14px;color:#888}.search-wrap input{width:100%;border:none;outline:none;background:transparent;font-size:13px;font-weight:700}.filter-select{height:46px;border-radius:15px;border:1px solid #eeeeee;background:#fff;padding:0 14px;font-size:13px;font-weight:800;color:#333;outline:none;cursor:pointer}.table-card{padding:22px;overflow:hidden}.table-header{margin-bottom:18px}.table-header p{margin:5px 0 0;color:#777;font-size:13px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:900px}th{background:#fafafa;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:.4px;text-align:left;padding:14px;border-bottom:1px solid #eee}td{padding:15px 14px;border-bottom:1px solid #f0f0f0;color:#333;font-size:13px;vertical-align:top}.category-name{font-weight:950;color:#111}.slug-text{color:#777;font-size:12.5px;margin-top:5px}.category-image{width:54px;height:54px;border-radius:14px;object-fit:cover;background:#f5f5f5;border:1px solid #eee}.image-placeholder{width:54px;height:54px;border-radius:14px;background:#fff4ee;color:#E8773A;display:flex;align-items:center;justify-content:center}.status-badge{display:inline-flex;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900;text-transform:capitalize}.status-badge.active{background:#effbf4;color:#1c9b58}.status-badge.inactive{background:#fff1f1;color:#d63636}.action-buttons{display:flex;gap:8px}.edit-btn,.delete-btn{width:36px;height:36px;border-radius:12px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer}.edit-btn{background:#fff4ee;color:#E8773A}.delete-btn{background:#fff1f1;color:#d63636}.empty-box{min-height:180px;border:1px dashed #ddd;border-radius:20px;background:#fafafa;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px}.empty-box h3{margin:0;font-size:18px;font-weight:950}.empty-box p{margin:8px 0 0;color:#777;font-size:13px}@media(max-width:900px){.stats-grid,.form-grid{grid-template-columns:1fr}.category-hero,.toolbar{flex-direction:column;align-items:stretch}.hero-left{flex-direction:column}.category-hero h1{font-size:25px}}`;
