import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  BadgeCheck,
  Ban,
  Building2,
  Edit3,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  Users,
  X,
} from "lucide-react";

const initialForm = {
  name: "",
  description: "",
  discount_percentage: 0,
  status: "active",
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const getStatusKey = (status) => {
  const value = String(status || "active").toLowerCase().trim();

  if (value === "inactive") return "inactive";
  if (value === "blocked") return "blocked";
  if (value === "pending") return "pending";
  return "active";
};

const getStatusLabel = (status) => {
  const value = getStatusKey(status);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default function CustomerGroups() {
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/customer-groups");

      if (res.data.success) {
        setGroups(res.data.groups || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch customer groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const text = `
        ${group.name || ""}
        ${group.description || ""}
        ${group.discount_percentage || ""}
        ${group.status || ""}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [groups, search]);

  const stats = useMemo(() => {
    const activeGroups = groups.filter(
      (group) => getStatusKey(group.status) === "active"
    ).length;

    const inactiveGroups = groups.filter((group) =>
      ["inactive", "blocked"].includes(getStatusKey(group.status))
    ).length;

    const totalDiscount = groups.reduce(
      (sum, group) => sum + Number(group.discount_percentage || 0),
      0
    );

    const avgDiscount =
      groups.length > 0 ? (totalDiscount / groups.length).toFixed(1) : "0";

    return [
      {
        label: "Total Groups",
        value: formatNumber(groups.length),
        hint: "All customer categories",
        icon: Tags,
        color: "#D9A900",
      },
      {
        label: "Active Groups",
        value: formatNumber(activeGroups),
        hint: "Available for pricing",
        icon: ShieldCheck,
        color: "#16A34A",
      },
      {
        label: "Inactive Groups",
        value: formatNumber(inactiveGroups),
        hint: "Temporarily disabled",
        icon: Ban,
        color: "#DC2626",
      },
      {
        label: "Avg Discount",
        value: `${avgDiscount}%`,
        hint: "Average group discount",
        icon: Percent,
        color: "#2563EB",
      },
    ];
  }, [groups]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openCreateForm = () => {
    setFormData(initialForm);
    setEditingGroupId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (group) => {
    setEditingGroupId(group.id);

    setFormData({
      name: group.name || "",
      description: group.description || "",
      discount_percentage: group.discount_percentage || 0,
      status: getStatusKey(group.status),
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingGroupId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Group name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...formData,
        discount_percentage: Number(formData.discount_percentage || 0),
        status: getStatusKey(formData.status),
      };

      const res = editingGroupId
        ? await API.put(`/api/customer-groups/${editingGroupId}`, payload)
        : await API.post("/api/customer-groups", payload);

      if (res.data.success) {
        setFormData(initialForm);
        setEditingGroupId(null);
        setShowForm(false);
        fetchGroups();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingGroupId
            ? "Failed to update customer group"
            : "Failed to create customer group")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this customer group?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/customer-groups/${id}`);
      fetchGroups();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to deactivate customer group"
      );
    }
  };

  return (
    <AdminLayout>
      <style>{css}</style>

      <div className="group-page group-command-page">
        <section className="group-hero">
          <div className="hero-grid-pattern" />
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-left">
            <div className="hero-icon">
              <Tags size={28} />
            </div>

            <div className="hero-copy">
              <div className="hero-kicker">
                <span />
                Customer Segmentation
              </div>

              <h1>Customer Groups</h1>

              <p>
                Create customer categories like Hotels, Cafes, Restaurants,
                Retail Shops and Premium Customers. Use these groups for
                customer forms, pricing rules and discount controls.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              className="group-secondary-btn"
              type="button"
              onClick={fetchGroups}
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              Refresh
            </button>

            <button
              className="group-primary-btn"
              type="button"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Add Group
            </button>
          </div>
        </section>

        <section className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="stat-card" key={stat.label}>
                <div className="stat-top">
                  <div
                    className="stat-icon"
                    style={{
                      background: `${stat.color}16`,
                      color: stat.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="stat-line" style={{ background: stat.color }} />
                </div>

                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
                <span>{stat.hint}</span>
              </div>
            );
          })}
        </section>

        {error && (
          <div className="error-box">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        {showForm && (
          <section className="form-card">
            <div className="form-header">
              <div>
                <span className="section-label">
                  {editingGroupId ? "Update Group" : "Create Group"}
                </span>

                <h2>{editingGroupId ? "Edit Group" : "Add New Group"}</h2>

                <p>
                  Set group name, discount percentage, description and active
                  status for pricing control.
                </p>
              </div>

              <button
                className="close-btn"
                type="button"
                onClick={handleCancelForm}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Group Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Hotels"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Discount Percentage</label>
                  <input
                    type="number"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleChange}
                    placeholder="5"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={`status-select status-select-${getStatusKey(
                      formData.status
                    )}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Hotel and hospitality customers"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="group-secondary-btn form-secondary"
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="group-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingGroupId
                    ? "Update Group"
                    : "Save Group"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search group name, description, discount or status..."
            />
          </div>

          <div className="toolbar-count">
            Showing <strong>{filteredGroups.length}</strong> of{" "}
            <strong>{groups.length}</strong> groups
          </div>
        </section>

        <section className="table-card">
          <div className="table-header">
            <div>
              <span className="section-label">Group Database</span>
              <h2>Customer Group List</h2>
              <p>Customer group records from MySQL database</p>
            </div>

            <div className="table-chip">
              <Building2 size={14} />
              Live Records
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <div className="empty-icon">
                <RefreshCw size={24} className="spin" />
              </div>

              <div>
                <h3>Loading groups...</h3>
                <p>Please wait while customer groups are loading.</p>
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="empty-box">
              <div className="empty-icon">
                <Users size={24} />
              </div>

              <div>
                <h3>No customer groups found</h3>
                <p>Click Add Group to create your first customer group.</p>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Group Name</th>
                    <th>Description</th>
                    <th>Discount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredGroups.map((group) => {
                    const statusKey = getStatusKey(group.status);

                    return (
                      <tr key={group.id}>
                        <td>
                          <div className="group-main">
                            <div className="group-avatar">
                              {(group.name || "GR").slice(0, 2).toUpperCase()}
                            </div>

                            <div>
                              <div className="group-name">{group.name}</div>
                              <div className="small-text">Customer Segment</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="description-text">
                            {group.description || "-"}
                          </div>
                        </td>

                        <td>
                          <div className="discount-pill">
                            <Percent size={13} />
                            {Number(group.discount_percentage || 0)}%
                          </div>
                        </td>

                        <td>
                          <span className={`status-badge status-${statusKey}`}>
                            {statusKey === "active" ? (
                              <BadgeCheck size={13} />
                            ) : (
                              <Ban size={13} />
                            )}
                            {getStatusLabel(group.status)}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              className="edit-btn"
                              type="button"
                              onClick={() => handleEdit(group)}
                              title="Edit Group"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              className="delete-btn"
                              type="button"
                              onClick={() => handleDeactivate(group.id)}
                              title="Deactivate Group"
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
        </section>
      </div>
    </AdminLayout>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  .group-command-page {
    --page-text: #171717;
    --page-muted: #6B7280;
    --page-soft: #8A7A52;
    --page-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.20), transparent 28%),
      radial-gradient(circle at bottom right, rgba(17, 24, 39, 0.06), transparent 30%),
      linear-gradient(135deg, #FFFDF6 0%, #FFF8E1 45%, #F7EBC5 100%);
    --card-bg: rgba(255, 255, 255, 0.96);
    --card-bg-strong: #FFFFFF;
    --card-border: rgba(232, 224, 199, 0.95);
    --input-bg: #FFFFFF;
    --input-border: rgba(17, 24, 39, 0.10);
    --table-head: #FFF9E8;
    --table-row-hover: rgba(255, 210, 30, 0.10);
    --shadow: 0 18px 48px rgba(17, 24, 39, 0.08);
    --shadow-hover: 0 24px 68px rgba(17, 24, 39, 0.13);

    min-height: 100vh;
    color: var(--page-text);
    background: var(--page-bg);
    padding: 8px;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  .theme-dark .group-command-page {
    --page-text: #F8FAFC;
    --page-muted: rgba(255, 255, 255, 0.62);
    --page-soft: rgba(255, 255, 255, 0.46);
    --page-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.12), transparent 32%),
      radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.05), transparent 30%),
      linear-gradient(135deg, #07090F 0%, #0F172A 48%, #111827 100%);
    --card-bg: rgba(255, 255, 255, 0.055);
    --card-bg-strong: rgba(8, 10, 18, 0.86);
    --card-border: rgba(255, 255, 255, 0.09);
    --input-bg: rgba(255, 255, 255, 0.06);
    --input-border: rgba(255, 255, 255, 0.10);
    --table-head: rgba(255, 255, 255, 0.055);
    --table-row-hover: rgba(255, 210, 30, 0.08);
    --shadow: 0 18px 52px rgba(0, 0, 0, 0.24);
    --shadow-hover: 0 28px 76px rgba(0, 0, 0, 0.34);
  }

  .group-hero {
    position: relative;
    overflow: hidden;
    min-height: 210px;
    border-radius: 30px;
    padding: 28px 32px;
    margin-bottom: 22px;
    background:
      linear-gradient(135deg, #121316 0%, #202126 54%, #0B0C0E 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.10) !important;
    box-shadow:
      0 20px 56px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }

  .hero-grid-pattern {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.42;
    pointer-events: none;
  }

  .group-hero::after {
    content: '';
    position: absolute;
    left: 32px;
    right: 32px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 210, 30, 0.75),
      transparent
    );
  }

  .hero-glow {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-glow-one {
    width: 210px;
    height: 210px;
    right: -70px;
    top: -92px;
    background: #FFD21E;
    opacity: 0.95;
    box-shadow: 0 0 80px rgba(255, 210, 30, 0.38);
  }

  .hero-glow-two {
    width: 96px;
    height: 96px;
    right: 135px;
    bottom: -38px;
    border: 18px solid rgba(255, 210, 30, 0.14);
  }

  .hero-left {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    max-width: 830px;
  }

  .hero-icon {
    width: 62px;
    height: 62px;
    border-radius: 22px;
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16px 36px rgba(255, 210, 30, 0.25);
    flex-shrink: 0;
  }

  .hero-copy {
    min-width: 0;
  }

  .hero-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(255, 210, 30, 0.25);
    background: rgba(255, 210, 30, 0.09);
    color: #FFD21E;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .hero-kicker span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #FFD21E;
    box-shadow: 0 0 0 5px rgba(255, 210, 30, 0.13);
  }

  .group-hero h1 {
    margin: 0;
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(29px, 3vw, 42px);
    line-height: 1.04;
    font-weight: 800;
    letter-spacing: -1px;
    color: #FFFFFF !important;
  }

  .group-hero p {
    max-width: 760px;
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.66) !important;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.7;
  }

  .hero-actions {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .group-primary-btn,
  .group-secondary-btn {
    min-height: 44px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0 16px;
    border: none;
    font-family: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .group-primary-btn {
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    box-shadow: 0 12px 28px rgba(255, 210, 30, 0.24);
  }

  .group-secondary-btn {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .form-secondary {
    background: var(--input-bg);
    color: var(--page-text);
    border: 1px solid var(--input-border);
  }

  .group-primary-btn:hover,
  .group-secondary-btn:hover {
    transform: translateY(-2px);
  }

  .group-primary-btn:disabled,
  .group-secondary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card {
    position: relative;
    overflow: hidden;
    min-height: 142px;
    border-radius: 24px;
    padding: 18px;
    background: var(--card-bg) !important;
    border: 1px solid var(--card-border) !important;
    box-shadow: var(--shadow) !important;
    backdrop-filter: blur(18px);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-hover) !important;
    border-color: rgba(255, 210, 30, 0.35) !important;
  }

  .stat-card::after {
    content: '';
    position: absolute;
    width: 105px;
    height: 105px;
    right: -48px;
    bottom: -48px;
    border-radius: 50%;
    background: rgba(255, 210, 30, 0.13);
  }

  .stat-top {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 17px;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-line {
    width: 36px;
    height: 6px;
    border-radius: 999px;
    margin-top: 8px;
  }

  .stat-card h3 {
    position: relative;
    z-index: 1;
    margin: 0;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.8px;
    color: var(--page-text) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-card p {
    position: relative;
    z-index: 1;
    margin: 7px 0 0;
    color: var(--page-muted) !important;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.65px;
  }

  .stat-card span {
    position: relative;
    z-index: 1;
    display: block;
    margin-top: 6px;
    color: var(--page-soft);
    font-size: 11px;
    font-weight: 700;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    padding: 13px 15px;
    border-radius: 18px;
    background: rgba(239, 68, 68, 0.10);
    border: 1px solid rgba(239, 68, 68, 0.22);
    color: #EF4444;
    font-size: 13px;
    font-weight: 800;
  }

  .theme-dark .error-box {
    color: #FCA5A5;
  }

  .form-card,
  .toolbar,
  .table-card {
    background: var(--card-bg-strong) !important;
    border: 1px solid var(--card-border) !important;
    box-shadow: var(--shadow) !important;
    backdrop-filter: blur(18px);
  }

  .form-card {
    border-radius: 28px;
    padding: 24px;
    margin-bottom: 22px;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

  .section-label {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: rgba(255, 210, 30, 0.12);
    border: 1px solid rgba(255, 210, 30, 0.24);
    color: #D9A900;
    padding: 6px 10px;
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .theme-dark .section-label {
    color: #FFD21E;
  }

  .form-header h2,
  .table-header h2 {
    margin: 0;
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: 23px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--page-text) !important;
  }

  .form-header p,
  .table-header p {
    margin: 5px 0 0;
    color: var(--page-muted) !important;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.6;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--page-muted);
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
    font-size: 12px;
    font-weight: 900;
    color: var(--page-text) !important;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    min-height: 46px;
    border: 1.5px solid var(--input-border) !important;
    border-radius: 15px;
    padding: 12px 14px;
    background: var(--input-bg) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    font-weight: 750;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-group textarea {
    min-height: 96px;
    resize: vertical;
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: var(--page-soft);
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    border-color: rgba(255, 210, 30, 0.75) !important;
    box-shadow: 0 0 0 4px rgba(255, 210, 30, 0.12);
  }

  .theme-dark .form-group select option {
    background: #0F172A;
    color: #F8FAFC;
  }

  .theme-light .form-group select option {
    background: #FFFFFF;
    color: #111827;
  }

  .status-select {
    font-weight: 900 !important;
  }

  .status-select-active {
    color: #16A34A !important;
  }

  .status-select-inactive,
  .status-select-blocked {
    color: #DC2626 !important;
  }

  .theme-dark .status-select-active {
    background: rgba(22, 163, 74, 0.10) !important;
    border-color: rgba(22, 163, 74, 0.28) !important;
    color: #4ADE80 !important;
  }

  .theme-dark .status-select-inactive,
  .theme-dark .status-select-blocked {
    background: rgba(220, 38, 38, 0.10) !important;
    border-color: rgba(220, 38, 38, 0.28) !important;
    color: #FCA5A5 !important;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
  }

  .toolbar {
    border-radius: 24px;
    padding: 16px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .search-wrap {
    max-width: 520px;
    width: 100%;
    min-height: 46px;
    border-radius: 16px;
    background: var(--input-bg) !important;
    border: 1px solid var(--input-border) !important;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    color: var(--page-muted);
  }

  .search-wrap input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--page-text);
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .search-wrap input::placeholder {
    color: var(--page-soft);
  }

  .toolbar-count {
    color: var(--page-muted);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .toolbar-count strong {
    color: var(--page-text);
    font-weight: 900;
  }

  .table-card {
    border-radius: 28px;
    padding: 22px;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .table-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 210, 30, 0.12);
    border: 1px solid rgba(255, 210, 30, 0.24);
    color: #D9A900;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }

  .theme-dark .table-chip {
    color: #FFD21E;
  }

  .table-wrap {
    overflow-x: auto;
    border-radius: 20px;
    border: 1px solid var(--card-border);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 840px;
    background: var(--card-bg-strong) !important;
  }

  th {
    background: var(--table-head) !important;
    color: var(--page-soft) !important;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.55px;
    text-align: left;
    padding: 15px 14px;
    border-bottom: 1px solid var(--card-border) !important;
    font-weight: 900;
  }

  td {
    padding: 16px 14px;
    border-bottom: 1px solid var(--card-border) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    vertical-align: top;
    font-weight: 700;
  }

  tbody tr {
    transition: background 0.18s ease;
  }

  tbody tr:hover {
    background: var(--table-row-hover) !important;
  }

  tbody tr:last-child td {
    border-bottom: none !important;
  }

  .group-main {
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }

  .group-avatar {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .group-name {
    color: var(--page-text) !important;
    font-weight: 900;
  }

  .description-text {
    color: var(--page-muted);
    font-weight: 700;
    line-height: 1.55;
  }

  .small-text {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--page-muted) !important;
    font-size: 12px;
    margin-top: 6px;
    font-weight: 700;
    line-height: 1.35;
  }

  .discount-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 900;
    background: rgba(37, 99, 235, 0.12);
    color: #2563EB;
    border: 1px solid rgba(37, 99, 235, 0.22);
    white-space: nowrap;
  }

  .theme-dark .discount-pill {
    color: #93C5FD;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 900;
    text-transform: capitalize;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .status-badge.status-active {
    background: rgba(22, 163, 74, 0.12) !important;
    color: #16A34A !important;
    border-color: rgba(22, 163, 74, 0.24) !important;
  }

  .status-badge.status-inactive,
  .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.12) !important;
    color: #DC2626 !important;
    border-color: rgba(220, 38, 38, 0.24) !important;
  }

  .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.12) !important;
    color: #EA580C !important;
    border-color: rgba(234, 88, 12, 0.24) !important;
  }

  .theme-dark .status-badge.status-active {
    background: rgba(22, 163, 74, 0.16) !important;
    color: #4ADE80 !important;
    border-color: rgba(74, 222, 128, 0.28) !important;
  }

  .theme-dark .status-badge.status-inactive,
  .theme-dark .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.16) !important;
    color: #FCA5A5 !important;
    border-color: rgba(252, 165, 165, 0.28) !important;
  }

  .theme-dark .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.16) !important;
    color: #FDBA74 !important;
    border-color: rgba(251, 186, 116, 0.28) !important;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .edit-btn:hover,
  .delete-btn:hover {
    transform: translateY(-2px);
  }

  .edit-btn {
    background: rgba(255, 210, 30, 0.16);
    color: #D9A900;
  }

  .delete-btn {
    background: rgba(220, 38, 38, 0.12);
    color: #DC2626;
  }

  .theme-dark .edit-btn {
    color: #FFD21E;
  }

  .theme-dark .delete-btn {
    background: rgba(220, 38, 38, 0.18);
    color: #FCA5A5;
  }

  .empty-box {
    min-height: 210px;
    border: 1px dashed var(--card-border);
    border-radius: 22px;
    background: rgba(255, 210, 30, 0.045);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: left;
    padding: 28px;
  }

  .empty-icon {
    width: 54px;
    height: 54px;
    border-radius: 19px;
    background: rgba(255, 210, 30, 0.14);
    color: #D9A900;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .theme-dark .empty-icon {
    color: #FFD21E;
  }

  .empty-box h3 {
    margin: 0;
    color: var(--page-text);
    font-size: 18px;
    font-weight: 900;
  }

  .empty-box p {
    margin: 7px 0 0;
    color: var(--page-muted);
    font-size: 13px;
    font-weight: 700;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1180px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .group-hero {
      flex-direction: column;
    }

    .hero-actions {
      justify-content: flex-start;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .group-command-page {
      padding: 0;
    }

    .group-hero {
      border-radius: 24px;
      padding: 24px;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions {
      width: 100%;
    }

    .hero-actions .group-primary-btn,
    .hero-actions .group-secondary-btn {
      flex: 1;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .toolbar-count {
      white-space: normal;
    }

    .table-header {
      flex-direction: column;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .form-actions .group-primary-btn,
    .form-actions .group-secondary-btn {
      width: 100%;
    }

    .group-hero h1 {
      font-size: 28px;
    }

    .empty-box {
      flex-direction: column;
      text-align: center;
    }
  }
`;