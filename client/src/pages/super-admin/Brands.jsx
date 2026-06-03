import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BadgeCheck,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

const initialForm = {
  name: "",
  slug: "",
  description: "",
  status: "active",
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/brands");

      if (res.data.success) {
        setBrands(res.data.brands || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const createSlug = (text) => {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const text = `
        ${brand.name || ""}
        ${brand.slug || ""}
        ${brand.description || ""}
        ${brand.status || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || brand.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [brands, search, statusFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "name") {
      setFormData({
        ...formData,
        name: value,
        slug: formData.slug ? formData.slug : createSlug(value),
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const resetLogo = () => {
    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(null);
    setLogoPreview("");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo size should be below 5MB");
      return;
    }

    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleEdit = (brand) => {
    setEditingBrandId(brand.id);

    setFormData({
      name: brand.name || "",
      slug: brand.slug || "",
      description: brand.description || "",
      status: brand.status || "active",
    });

    setLogoFile(null);
    setLogoPreview(brand.logo ? getImageUrl(brand.logo) : "");

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingBrandId(null);
    setShowForm(false);
    resetLogo();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Brand name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = new FormData();

      payload.append("name", formData.name);
      payload.append("slug", formData.slug || "");
      payload.append("description", formData.description || "");
      payload.append("status", formData.status || "active");

      if (logoFile) {
        payload.append("logo", logoFile);
      }

      let res;

      if (editingBrandId) {
        res = await API.put(`/api/brands/${editingBrandId}`, payload);
      } else {
        res = await API.post("/api/brands", payload);
      }

      if (res.data.success) {
        setFormData(initialForm);
        setEditingBrandId(null);
        setShowForm(false);
        resetLogo();
        fetchBrands();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingBrandId ? "Failed to update brand" : "Failed to create brand")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this brand?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/brands/${id}`);
      fetchBrands();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deactivate brand");
    }
  };

  return (
    <AdminLayout>
      <div className="brand-page">
        <style>{`
          .brand-page { color: #151515; }
          .brand-hero { background: radial-gradient(circle at top right, rgba(232,119,58,0.20), transparent 30%), linear-gradient(135deg, #ffffff, #fff8f3); border: 1px solid #f1ded2; border-radius: 28px; padding: 30px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 22px; align-items: flex-start; box-shadow: 0 8px 28px rgba(0,0,0,0.045); }
          .hero-left { display: flex; gap: 18px; align-items: flex-start; }
          .hero-icon { width: 58px; height: 58px; border-radius: 19px; background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 30px rgba(232,119,58,0.28); flex-shrink: 0; }
          .brand-hero h1 { margin: 0; font-size: 30px; font-weight: 950; color: #111; }
          .brand-hero p { margin: 9px 0 0; color: #777; font-size: 14px; line-height: 1.7; max-width: 760px; }
          .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
          .primary-btn, .secondary-btn { border: none; height: 46px; padding: 0 18px; border-radius: 15px; display: flex; align-items: center; gap: 9px; font-weight: 900; cursor: pointer; white-space: nowrap; }
          .primary-btn { background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; }
          .secondary-btn { background: #fff; color: #333; border: 1px solid #e8e8e8; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 22px; }
          .stat-card { background: #fff; border: 1px solid #ececec; border-radius: 20px; padding: 20px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
          .stat-card h3 { margin: 0; font-size: 28px; font-weight: 950; color: #111; }
          .stat-card p { margin: 7px 0 0; color: #777; font-size: 13px; font-weight: 800; }
          .error-box { background: #fff1f1; border: 1px solid #ffc9c9; color: #d63636; padding: 13px 15px; border-radius: 16px; margin-bottom: 18px; font-size: 13px; font-weight: 800; }
          .form-card { background: #fff; border: 1px solid #ececec; border-radius: 24px; padding: 24px; margin-bottom: 22px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
          .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
          .form-header h2 { margin: 0; font-size: 20px; font-weight: 950; }
          .close-btn { width: 40px; height: 40px; border-radius: 13px; border: none; background: #f6f6f6; cursor: pointer; display: flex; align-items: center; justify-content: center; }
          .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
          .form-group { display: flex; flex-direction: column; gap: 8px; }
          .form-group.full { grid-column: 1 / -1; }
          .form-group label { font-size: 13px; font-weight: 900; color: #333; }
          .form-group input, .form-group select, .form-group textarea { width: 100%; border: 1.5px solid #e8e8e8; border-radius: 14px; padding: 13px 14px; font-size: 14px; font-weight: 650; outline: none; box-sizing: border-box; font-family: inherit; }
          .form-group textarea { min-height: 90px; resize: vertical; }
          .image-preview { width: 74px; height: 74px; border-radius: 16px; object-fit: cover; border: 1px solid #eeeeee; background: #f7f7f7; margin-top: 10px; }
          .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px; }
          .toolbar { background: #fff; border: 1px solid #ececec; border-radius: 22px; padding: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; gap: 16px; align-items: center; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
          .search-wrap { max-width: 440px; width: 100%; height: 46px; border-radius: 15px; background: #f7f7f7; border: 1px solid #eeeeee; display: flex; align-items: center; gap: 10px; padding: 0 14px; color: #888; }
          .search-wrap input { width: 100%; border: none; outline: none; background: transparent; font-size: 13px; font-weight: 700; }
          .filter-select { height: 46px; border-radius: 15px; border: 1px solid #eeeeee; background: #fff; padding: 0 14px; font-size: 13px; font-weight: 800; color: #333; outline: none; }
          .table-card { background: #fff; border: 1px solid #ececec; border-radius: 24px; padding: 22px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); overflow: hidden; }
          .table-header h2 { margin: 0; font-size: 20px; font-weight: 950; }
          .table-header p { margin: 5px 0 18px; color: #777; font-size: 13px; }
          .table-wrap { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; min-width: 820px; }
          th { background: #fafafa; color: #777; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; text-align: left; padding: 14px; border-bottom: 1px solid #eeeeee; }
          td { padding: 15px 14px; border-bottom: 1px solid #f0f0f0; color: #333; font-size: 13px; vertical-align: top; }
          .brand-name { font-weight: 950; color: #111; }
          .slug-text { color: #777; font-size: 12.5px; margin-top: 5px; }
          .brand-logo { width: 54px; height: 54px; border-radius: 14px; object-fit: cover; background: #f5f5f5; border: 1px solid #eeeeee; }
          .logo-placeholder { width: 54px; height: 54px; border-radius: 14px; background: #fff4ee; color: #E8773A; display: flex; align-items: center; justify-content: center; }
          .status-badge { display: inline-flex; border-radius: 999px; padding: 7px 11px; font-size: 12px; font-weight: 900; text-transform: capitalize; }
          .status-badge.active { background: #effbf4; color: #1c9b58; }
          .status-badge.inactive { background: #fff1f1; color: #d63636; }
          .action-buttons { display: flex; gap: 8px; align-items: center; }
          .edit-btn, .delete-btn { width: 36px; height: 36px; border-radius: 12px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
          .edit-btn { background: #fff4ee; color: #E8773A; }
          .delete-btn { background: #fff1f1; color: #d63636; }
          .empty-box { min-height: 180px; border: 1px dashed #ddd; border-radius: 20px; background: #fafafa; display: flex; align-items: center; justify-content: center; text-align: center; padding: 28px; }
          .empty-box h3 { margin: 0; font-size: 18px; font-weight: 950; }
          .empty-box p { margin: 8px 0 0; color: #777; font-size: 13px; }
          @media (max-width: 900px) { .stats-grid, .form-grid { grid-template-columns: 1fr; } .brand-hero, .toolbar { flex-direction: column; align-items: stretch; } .hero-left { flex-direction: column; } }
        `}</style>

        <div className="brand-hero"><div className="hero-left"><div className="hero-icon"><BadgeCheck size={28} /></div><div><h1>Product Brands</h1><p>Manage own brands and supplier brands. These brands will be used inside product creation.</p></div></div><div className="hero-actions"><button className="secondary-btn" onClick={fetchBrands}><RefreshCw size={17} />Refresh</button><button className="primary-btn" onClick={() => setShowForm(true)}><Plus size={18} />Add Brand</button></div></div>

        <div className="stats-grid"><div className="stat-card"><h3>{brands.length}</h3><p>Total Brands</p></div><div className="stat-card"><h3>{brands.filter((b) => b.status === "active").length}</h3><p>Active Brands</p></div><div className="stat-card"><h3>{brands.filter((b) => b.status === "inactive").length}</h3><p>Inactive Brands</p></div></div>

        {error && <div className="error-box">{error}</div>}

        {showForm && (<div className="form-card"><div className="form-header"><h2>{editingBrandId ? "Edit Brand" : "Add New Brand"}</h2><button className="close-btn" onClick={handleCancelForm}><X size={18} /></button></div><form onSubmit={handleSubmit}><div className="form-grid"><div className="form-group"><label>Brand Name *</label><input name="name" value={formData.name} onChange={handleChange} placeholder="Vivin Store" required /></div><div className="form-group"><label>Slug</label><input name="slug" value={formData.slug} onChange={handleChange} placeholder="vivin-store" /></div><div className="form-group"><label>Brand Logo</label><input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleLogoChange} />{logoPreview && <img src={logoPreview} alt="Brand Logo Preview" className="brand-logo" style={{ marginTop: "10px" }} />}</div><div className="form-group"><label>Status</label><select name="status" value={formData.status} onChange={handleChange}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="form-group full"><label>Description</label><textarea name="description" value={formData.description} onChange={handleChange} placeholder="Own brand products" /></div></div><div className="form-actions"><button type="button" className="secondary-btn" onClick={handleCancelForm}>Cancel</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving..." : editingBrandId ? "Update Brand" : "Save Brand"}</button></div></form></div>)}

        <div className="toolbar"><div className="search-wrap"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brand name, slug or status..." /></div><select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="active">Active Brands</option><option value="inactive">Inactive Brands</option><option value="all">All Brands</option></select><div>Showing <strong>{filteredBrands.length}</strong> brands</div></div>

        <div className="table-card"><div className="table-header"><h2>Brand List</h2><p>Product brand records from MySQL database</p></div>{loading ? (<div className="empty-box"><div><h3>Loading brands...</h3><p>Please wait while brand records are loading.</p></div></div>) : filteredBrands.length === 0 ? (<div className="empty-box"><div><h3>No brands found</h3><p>Click Add Brand to create your first product brand.</p></div></div>) : (<div className="table-wrap"><table><thead><tr><th>Logo</th><th>Brand</th><th>Description</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredBrands.map((brand) => (<tr key={brand.id}><td>{brand.logo ? (<img src={getImageUrl(brand.logo)} alt={brand.name} className="brand-logo" />) : (<div className="logo-placeholder"><BadgeCheck size={20} /></div>)}</td><td><div className="brand-name">{brand.name}</div><div className="slug-text">/{brand.slug}</div></td><td>{brand.description || "-"}</td><td><span className={`status-badge ${brand.status}`}>{brand.status}</span></td><td><div className="action-buttons"><button className="edit-btn" onClick={() => handleEdit(brand)}><Edit3 size={16} /></button>{brand.status === "active" ? (<button className="delete-btn" onClick={() => handleDeactivate(brand.id)}><Trash2 size={16} /></button>) : (<span>Deactivated</span>)}</div></td></tr>))}</tbody></table></div>)}</div>
      </div>
    </AdminLayout>
  );
}
