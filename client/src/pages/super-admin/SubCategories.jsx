import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import { Edit3, FolderTree, Layers3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

const initialForm = { category_id: "", name: "", slug: "", description: "", sort_order: 0, status: "active" };
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function SubCategories() {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const fetchSubCategories = async () => {
    try { setLoading(true); setError(""); const res = await API.get("/api/sub-categories"); if (res.data.success) setSubCategories(res.data.subCategories || []); }
    catch (err) { setError(err.response?.data?.message || "Failed to fetch sub categories"); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try { const res = await API.get("/api/categories"); if (res.data.success) setCategories(res.data.categories || []); }
    catch (err) { console.log("Categories fetch failed:", err.response?.data?.message); }
  };

  useEffect(() => { fetchSubCategories(); fetchCategories(); }, []);

  const createSlug = (text) => String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const filteredSubCategories = useMemo(() => subCategories.filter((item) => {
    const text = `${item.name || ""} ${item.slug || ""} ${item.category_name || ""} ${item.description || ""} ${item.status || ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [subCategories, search, statusFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") { setFormData({ ...formData, name: value, slug: formData.slug ? formData.slug : createSlug(value) }); return; }
    setFormData({ ...formData, [name]: value });
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const resetImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");
  };

  const handleImageChange = (e) => {
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

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ category_id: item.category_id || "", name: item.name || "", slug: item.slug || "", description: item.description || "", sort_order: item.sort_order || 0, status: item.status || "active" });
    setImageFile(null);
    setImagePreview(item.image ? getImageUrl(item.image) : "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => { setFormData(initialForm); setEditingId(null); setShowForm(false); resetImage(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id) return setError("Category is required");
    if (!formData.name.trim()) return setError("Sub category name is required");
    try {
      setSaving(true); setError("");
      const payload = new FormData();
      payload.append("category_id", formData.category_id);
      payload.append("name", formData.name);
      payload.append("slug", formData.slug || "");
      payload.append("description", formData.description || "");
      payload.append("sort_order", formData.sort_order || 0);
      payload.append("status", formData.status || "active");
      if (imageFile) payload.append("image", imageFile);
      const res = editingId ? await API.put(`/api/sub-categories/${editingId}`, payload) : await API.post("/api/sub-categories", payload);
      if (res.data.success) { setFormData(initialForm); setEditingId(null); setShowForm(false); resetImage(); fetchSubCategories(); }
    } catch (err) { setError(err.response?.data?.message || (editingId ? "Failed to update sub category" : "Failed to create sub category")); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this sub category?")) return;
    try { await API.delete(`/api/sub-categories/${id}`); fetchSubCategories(); }
    catch (err) { setError(err.response?.data?.message || "Failed to deactivate sub category"); }
  };

  return (
    <AdminLayout>
      <div className="sub-category-page">
        <style>{css}</style>
        <div className="sub-category-hero"><div className="hero-left"><div className="hero-icon"><Layers3 size={28} /></div><div><h1>Sub Categories</h1><p>Create sub categories under main product categories. Example: Vegetables → Fresh Vegetables, Leafy Vegetables, Root Vegetables.</p></div></div><div className="hero-actions"><button className="secondary-btn" onClick={fetchSubCategories}><RefreshCw size={17} />Refresh</button><button className="primary-btn" onClick={() => setShowForm(true)}><Plus size={18} />Add Sub Category</button></div></div>
        <div className="stats-grid"><div className="stat-card"><h3>{subCategories.length}</h3><p>Total Sub Categories</p></div><div className="stat-card"><h3>{subCategories.filter((s) => s.status === "active").length}</h3><p>Active Sub Categories</p></div><div className="stat-card"><h3>{subCategories.filter((s) => s.status === "inactive").length}</h3><p>Inactive Sub Categories</p></div><div className="stat-card"><h3>{categories.length}</h3><p>Main Categories</p></div></div>
        {error && <div className="error-box">{error}</div>}
        {showForm && <div className="form-card"><div className="form-header"><h2>{editingId ? "Edit Sub Category" : "Add New Sub Category"}</h2><button className="close-btn" onClick={handleCancelForm}><X size={18} /></button></div><form onSubmit={handleSubmit}><div className="form-grid"><div className="form-group"><label>Main Category *</label><select name="category_id" value={formData.category_id} onChange={handleChange} required><option value="">Select Category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="form-group"><label>Sub Category Name *</label><input name="name" value={formData.name} onChange={handleChange} placeholder="Fresh Vegetables" required /></div><div className="form-group"><label>Slug</label><input name="slug" value={formData.slug} onChange={handleChange} placeholder="fresh-vegetables" /></div><div className="form-group"><label>Sub Category Image</label><input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageChange} />{imagePreview && <img src={imagePreview} alt="Sub Category Preview" className="sub-image" style={{ marginTop: "10px" }} />}</div><div className="form-group"><label>Sort Order</label><input type="number" name="sort_order" value={formData.sort_order} onChange={handleChange} placeholder="1" /></div><div className="form-group"><label>Status</label><select name="status" value={formData.status} onChange={handleChange}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="form-group full"><label>Description</label><textarea name="description" value={formData.description} onChange={handleChange} placeholder="Daily fresh vegetables" /></div></div><div className="form-actions"><button type="button" className="secondary-btn" onClick={handleCancelForm}>Cancel</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Sub Category" : "Save Sub Category"}</button></div></form></div>}
        <div className="toolbar"><div className="search-wrap"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sub category, category or status..." /></div><select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="active">Active Sub Categories</option><option value="inactive">Inactive Sub Categories</option><option value="all">All Sub Categories</option></select><div>Showing <strong>{filteredSubCategories.length}</strong> sub categories</div></div>
        <div className="table-card"><div className="table-header"><h2>Sub Category List</h2><p>Sub category records from MySQL database</p></div>{loading ? <div className="empty-box"><div><h3>Loading sub categories...</h3><p>Please wait while records are loading.</p></div></div> : filteredSubCategories.length === 0 ? <div className="empty-box"><div><h3>No sub categories found</h3><p>Click Add Sub Category to create your first sub category.</p></div></div> : <div className="table-wrap"><table><thead><tr><th>Image</th><th>Sub Category</th><th>Main Category</th><th>Description</th><th>Sort</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredSubCategories.map((item) => <tr key={item.id}><td>{item.image ? <img src={getImageUrl(item.image)} alt={item.name} className="sub-image" /> : <div className="image-placeholder"><Layers3 size={20} /></div>}</td><td><div className="sub-name">{item.name}</div><div className="small-text">/{item.slug}</div></td><td><span className="category-badge"><FolderTree size={13} />{item.category_name || "-"}</span></td><td>{item.description || "-"}</td><td>{item.sort_order || 0}</td><td><span className={`status-badge ${item.status}`}>{item.status}</span></td><td><div className="action-buttons"><button className="edit-btn" onClick={() => handleEdit(item)}><Edit3 size={16} /></button>{item.status === "active" ? <button className="delete-btn" onClick={() => handleDeactivate(item.id)}><Trash2 size={16} /></button> : <span>Deactivated</span>}</div></td></tr>)}</tbody></table></div>}</div>
      </div>
    </AdminLayout>
  );
}

const css = `.sub-category-page{color:#151515}.sub-category-hero{background:radial-gradient(circle at top right,rgba(232,119,58,.20),transparent 30%),linear-gradient(135deg,#fff,#fff8f3);border:1px solid #f1ded2;border-radius:28px;padding:30px;margin-bottom:24px;display:flex;justify-content:space-between;gap:22px;align-items:flex-start;box-shadow:0 8px 28px rgba(0,0,0,.045)}.hero-left{display:flex;gap:18px;align-items:flex-start}.hero-icon{width:58px;height:58px;border-radius:19px;background:linear-gradient(135deg,#E8773A,#FF9A62);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(232,119,58,.28);flex-shrink:0}.sub-category-hero h1{margin:0;font-size:30px;font-weight:950;color:#111}.sub-category-hero p{margin:9px 0 0;color:#777;font-size:14px;line-height:1.7;max-width:760px}.hero-actions{display:flex;gap:12px;flex-wrap:wrap}.primary-btn,.secondary-btn{border:none;height:46px;padding:0 18px;border-radius:15px;display:flex;align-items:center;gap:9px;font-weight:900;cursor:pointer;white-space:nowrap}.primary-btn{background:linear-gradient(135deg,#E8773A,#FF9A62);color:#fff}.secondary-btn{background:#fff;color:#333;border:1px solid #e8e8e8}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:22px}.stat-card{background:#fff;border:1px solid #ececec;border-radius:20px;padding:20px;box-shadow:0 8px 26px rgba(0,0,0,.04)}.stat-card h3{margin:0;font-size:26px;font-weight:950;color:#111}.stat-card p{margin:7px 0 0;color:#777;font-size:13px;font-weight:800}.error-box{background:#fff1f1;border:1px solid #ffc9c9;color:#d63636;padding:13px 15px;border-radius:16px;margin-bottom:18px;font-size:13px;font-weight:800}.form-card,.toolbar,.table-card{background:#fff;border:1px solid #ececec;box-shadow:0 8px 26px rgba(0,0,0,.04)}.form-card{border-radius:24px;padding:24px;margin-bottom:22px}.form-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.form-header h2{margin:0;font-size:20px;font-weight:950}.close-btn{width:40px;height:40px;border-radius:13px;border:none;background:#f6f6f6;cursor:pointer;display:flex;align-items:center;justify-content:center}.form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.form-group{display:flex;flex-direction:column;gap:8px}.form-group.full{grid-column:1/-1}.form-group label{font-size:13px;font-weight:900;color:#333}.form-group input,.form-group select,.form-group textarea{width:100%;border:1.5px solid #e8e8e8;border-radius:14px;padding:13px 14px;font-size:14px;font-weight:650;outline:none;box-sizing:border-box;font-family:inherit}.form-group textarea{min-height:90px;resize:vertical}.sub-image-preview{width:74px;height:74px;border-radius:16px;object-fit:cover;border:1px solid #eee;background:#f7f7f7}.form-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:22px}.toolbar{border-radius:22px;padding:18px;margin-bottom:22px;display:flex;justify-content:space-between;gap:16px;align-items:center}.search-wrap{max-width:440px;width:100%;height:46px;border-radius:15px;background:#f7f7f7;border:1px solid #eee;display:flex;align-items:center;gap:10px;padding:0 14px;color:#888}.search-wrap input{width:100%;border:none;outline:none;background:transparent;font-size:13px;font-weight:700}.filter-select{height:46px;border-radius:15px;border:1px solid #eee;background:#fff;padding:0 14px;font-size:13px;font-weight:800;color:#333;outline:none}.table-card{border-radius:24px;padding:22px;overflow:hidden}.table-header h2{margin:0;font-size:20px;font-weight:950}.table-header p{margin:5px 0 18px;color:#777;font-size:13px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:980px}th{background:#fafafa;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:.4px;text-align:left;padding:14px;border-bottom:1px solid #eee}td{padding:15px 14px;border-bottom:1px solid #f0f0f0;color:#333;font-size:13px;vertical-align:top}.sub-name{font-weight:950;color:#111}.small-text{color:#777;font-size:12.5px;margin-top:5px}.category-badge{display:inline-flex;align-items:center;gap:6px;background:#fff4ee;color:#E8773A;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900}.sub-image,.image-placeholder{width:54px;height:54px;border-radius:14px}.sub-image{object-fit:cover;background:#f5f5f5;border:1px solid #eee}.image-placeholder{background:#fff4ee;color:#E8773A;display:flex;align-items:center;justify-content:center}.status-badge{display:inline-flex;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900;text-transform:capitalize}.status-badge.active{background:#effbf4;color:#1c9b58}.status-badge.inactive{background:#fff1f1;color:#d63636}.action-buttons{display:flex;gap:8px;align-items:center}.edit-btn,.delete-btn{width:36px;height:36px;border-radius:12px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer}.edit-btn{background:#fff4ee;color:#E8773A}.delete-btn{background:#fff1f1;color:#d63636}.empty-box{min-height:180px;border:1px dashed #ddd;border-radius:20px;background:#fafafa;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px}.empty-box h3{margin:0;font-size:18px;font-weight:950}.empty-box p{margin:8px 0 0;color:#777;font-size:13px}@media(max-width:1100px){.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:900px){.stats-grid,.form-grid{grid-template-columns:1fr}.sub-category-hero,.toolbar{flex-direction:column;align-items:stretch}.hero-left{flex-direction:column}}`;
