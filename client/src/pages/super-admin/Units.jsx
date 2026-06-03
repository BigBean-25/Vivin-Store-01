import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  Edit3,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Trash2,
  X,
} from "lucide-react";

const initialForm = {
  name: "",
  short_name: "",
  type: "count",
  status: "active",
};

export default function Units() {
  const [units, setUnits] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/units");

      if (res.data.success) {
        setUnits(res.data.units || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const text = `
        ${unit.name || ""}
        ${unit.short_name || ""}
        ${unit.type || ""}
        ${unit.status || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || unit.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [units, search, statusFilter]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = (unit) => {
    setEditingUnitId(unit.id);

    setFormData({
      name: unit.name || "",
      short_name: unit.short_name || "",
      type: unit.type || "count",
      status: unit.status || "active",
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingUnitId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Unit name is required");
      return;
    }

    if (!formData.short_name.trim()) {
      setError("Short name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      let res;

      if (editingUnitId) {
        res = await API.put(`/api/units/${editingUnitId}`, formData);
      } else {
        res = await API.post("/api/units", formData);
      }

      if (res.data.success) {
        setFormData(initialForm);
        setEditingUnitId(null);
        setShowForm(false);
        fetchUnits();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingUnitId ? "Failed to update unit" : "Failed to create unit")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this unit?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/units/${id}`);
      fetchUnits();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deactivate unit");
    }
  };

  return (
    <AdminLayout>
      <div className="unit-page">
        <style>{`
          .unit-page { color: #151515; }
          .unit-hero { background: radial-gradient(circle at top right, rgba(232,119,58,0.20), transparent 30%), linear-gradient(135deg, #ffffff, #fff8f3); border: 1px solid #f1ded2; border-radius: 28px; padding: 30px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 22px; align-items: flex-start; box-shadow: 0 8px 28px rgba(0,0,0,0.045); }
          .hero-left { display: flex; gap: 18px; align-items: flex-start; }
          .hero-icon { width: 58px; height: 58px; border-radius: 19px; background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 30px rgba(232,119,58,0.28); flex-shrink: 0; }
          .unit-hero h1 { margin: 0; font-size: 30px; font-weight: 950; color: #111; }
          .unit-hero p { margin: 9px 0 0; color: #777; font-size: 14px; line-height: 1.7; max-width: 760px; }
          .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
          .primary-btn, .secondary-btn { border: none; height: 46px; padding: 0 18px; border-radius: 15px; display: flex; align-items: center; gap: 9px; font-weight: 900; cursor: pointer; white-space: nowrap; }
          .primary-btn { background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; }
          .secondary-btn { background: #fff; color: #333; border: 1px solid #e8e8e8; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 22px; }
          .stat-card { background: #fff; border: 1px solid #ececec; border-radius: 20px; padding: 20px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
          .stat-card h3 { margin: 0; font-size: 26px; font-weight: 950; color: #111; }
          .stat-card p { margin: 7px 0 0; color: #777; font-size: 13px; font-weight: 800; }
          .error-box { background: #fff1f1; border: 1px solid #ffc9c9; color: #d63636; padding: 13px 15px; border-radius: 16px; margin-bottom: 18px; font-size: 13px; font-weight: 800; }
          .form-card { background: #fff; border: 1px solid #ececec; border-radius: 24px; padding: 24px; margin-bottom: 22px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
          .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
          .form-header h2 { margin: 0; font-size: 20px; font-weight: 950; }
          .close-btn { width: 40px; height: 40px; border-radius: 13px; border: none; background: #f6f6f6; cursor: pointer; display: flex; align-items: center; justify-content: center; }
          .form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
          .form-group { display: flex; flex-direction: column; gap: 8px; }
          .form-group label { font-size: 13px; font-weight: 900; color: #333; }
          .form-group input, .form-group select { width: 100%; border: 1.5px solid #e8e8e8; border-radius: 14px; padding: 13px 14px; font-size: 14px; font-weight: 650; outline: none; box-sizing: border-box; font-family: inherit; }
          .form-group input:focus, .form-group select:focus { border-color: #E8773A; box-shadow: 0 0 0 4px rgba(232,119,58,0.10); }
          .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px; }
          .toolbar { background: #fff; border: 1px solid #ececec; border-radius: 22px; padding: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; gap: 16px; align-items: center; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
          .search-wrap { max-width: 440px; width: 100%; height: 46px; border-radius: 15px; background: #f7f7f7; border: 1px solid #eeeeee; display: flex; align-items: center; gap: 10px; padding: 0 14px; color: #888; }
          .search-wrap input { width: 100%; border: none; outline: none; background: transparent; font-size: 13px; font-weight: 700; }
          .filter-select { height: 46px; border-radius: 15px; border: 1px solid #eeeeee; background: #fff; padding: 0 14px; font-size: 13px; font-weight: 800; color: #333; outline: none; }
          .table-card { background: #fff; border: 1px solid #ececec; border-radius: 24px; padding: 22px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); overflow: hidden; }
          .table-header h2 { margin: 0; font-size: 20px; font-weight: 950; }
          .table-header p { margin: 5px 0 18px; color: #777; font-size: 13px; }
          .table-wrap { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; min-width: 760px; }
          th { background: #fafafa; color: #777; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; text-align: left; padding: 14px; border-bottom: 1px solid #eeeeee; }
          td { padding: 15px 14px; border-bottom: 1px solid #f0f0f0; color: #333; font-size: 13px; vertical-align: top; }
          .unit-name { font-weight: 950; color: #111; }
          .short-name { color: #E8773A; font-weight: 950; }
          .type-badge { display: inline-flex; border-radius: 999px; padding: 7px 11px; font-size: 12px; font-weight: 900; text-transform: capitalize; background: #fff4ee; color: #E8773A; }
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
          @media (max-width: 1100px) { .stats-grid, .form-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 900px) { .stats-grid, .form-grid { grid-template-columns: 1fr; } .unit-hero, .toolbar { flex-direction: column; align-items: stretch; } .hero-left { flex-direction: column; } }
        `}</style>

        <div className="unit-hero"><div className="hero-left"><div className="hero-icon"><Ruler size={28} /></div><div><h1>Product Units</h1><p>Manage units like KG, Gram, Litre, ML, Piece, Box, Packet and Dozen. These units will be used in product creation.</p></div></div><div className="hero-actions"><button className="secondary-btn" onClick={fetchUnits}><RefreshCw size={17} />Refresh</button><button className="primary-btn" onClick={() => setShowForm(true)}><Plus size={18} />Add Unit</button></div></div>

        <div className="stats-grid"><div className="stat-card"><h3>{units.length}</h3><p>Total Units</p></div><div className="stat-card"><h3>{units.filter((u) => u.status === "active").length}</h3><p>Active Units</p></div><div className="stat-card"><h3>{units.filter((u) => u.type === "weight").length}</h3><p>Weight Units</p></div><div className="stat-card"><h3>{units.filter((u) => u.type === "count").length}</h3><p>Count Units</p></div></div>

        {error && <div className="error-box">{error}</div>}

        {showForm && (<div className="form-card"><div className="form-header"><h2>{editingUnitId ? "Edit Unit" : "Add New Unit"}</h2><button className="close-btn" onClick={handleCancelForm}><X size={18} /></button></div><form onSubmit={handleSubmit}><div className="form-grid"><div className="form-group"><label>Unit Name *</label><input name="name" value={formData.name} onChange={handleChange} placeholder="Kilogram" required /></div><div className="form-group"><label>Short Name *</label><input name="short_name" value={formData.short_name} onChange={handleChange} placeholder="kg" required /></div><div className="form-group"><label>Type</label><select name="type" value={formData.type} onChange={handleChange}><option value="weight">Weight</option><option value="volume">Volume</option><option value="count">Count</option><option value="length">Length</option><option value="other">Other</option></select></div><div className="form-group"><label>Status</label><select name="status" value={formData.status} onChange={handleChange}><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div><div className="form-actions"><button type="button" className="secondary-btn" onClick={handleCancelForm}>Cancel</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving..." : editingUnitId ? "Update Unit" : "Save Unit"}</button></div></form></div>)}

        <div className="toolbar"><div className="search-wrap"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search unit name, short name or type..." /></div><select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="active">Active Units</option><option value="inactive">Inactive Units</option><option value="all">All Units</option></select><div>Showing <strong>{filteredUnits.length}</strong> units</div></div>

        <div className="table-card"><div className="table-header"><h2>Unit List</h2><p>Product unit records from MySQL database</p></div>{loading ? (<div className="empty-box"><div><h3>Loading units...</h3><p>Please wait while unit records are loading.</p></div></div>) : filteredUnits.length === 0 ? (<div className="empty-box"><div><h3>No units found</h3><p>Click Add Unit to create your first product unit.</p></div></div>) : (<div className="table-wrap"><table><thead><tr><th>Unit Name</th><th>Short Name</th><th>Type</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredUnits.map((unit) => (<tr key={unit.id}><td><div className="unit-name">{unit.name}</div></td><td><span className="short-name">{unit.short_name}</span></td><td><span className="type-badge">{unit.type}</span></td><td><span className={`status-badge ${unit.status}`}>{unit.status}</span></td><td><div className="action-buttons"><button className="edit-btn" onClick={() => handleEdit(unit)}><Edit3 size={16} /></button>{unit.status === "active" ? (<button className="delete-btn" onClick={() => handleDeactivate(unit.id)}><Trash2 size={16} /></button>) : (<span>Deactivated</span>)}</div></td></tr>))}</tbody></table></div>)}</div>
      </div>
    </AdminLayout>
  );
}
