import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DatabaseBackup,
  FileText,
  Globe2,
  Layers3,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../api/axios";

const SERVER_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const yesNoOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const SETTINGS_GROUPS = [
  {
    group: "APP",
    icon: Globe2,
    items: [
      {
        key: "general",
        label: "General",
        title: "General Settings",
        subtitle: "App name, timezone, currency and language preferences",
        icon: SettingsIcon,
        endpoint: "/api/settings/general",
        fields: [
          { name: "app_name", label: "App Name", type: "text", placeholder: "Vivin Store" },
          { name: "business_name", label: "Business Name", type: "text", placeholder: "Vivin Store" },
          { name: "support_email", label: "Support Email", type: "email" },
          { name: "support_phone", label: "Support Phone", type: "text" },
          { name: "default_currency", label: "Default Currency", type: "text", placeholder: "INR" },
          { name: "default_timezone", label: "Default Timezone", type: "text", placeholder: "Asia/Kolkata" },
          { name: "date_format", label: "Date Format", type: "text", placeholder: "DD-MM-YYYY" },
          { name: "financial_year_start", label: "Financial Year Start", type: "text", placeholder: "April" },
          {
            name: "maintenance_mode",
            label: "Maintenance Mode",
            type: "select",
            options: [
              { label: "Disabled", value: "disabled" },
              { label: "Enabled", value: "enabled" },
            ],
          },
          {
            name: "language",
            label: "Default Language",
            type: "select",
            options: [
              { label: "English", value: "en" },
              { label: "Kannada", value: "kn" },
              { label: "Hindi", value: "hi" },
              { label: "Tamil", value: "ta" },
              { label: "Telugu", value: "te" },
            ],
          },
        ],
      },
      {
        key: "company",
        label: "Company",
        title: "Company / Business Settings",
        subtitle: "Company identity, legal, tax and contact details",
        icon: Building2,
        endpoint: "/api/settings/company",
        fields: [
          { name: "company_name", label: "Company Name", type: "text" },
          { name: "legal_name", label: "Legal Name", type: "text" },
          { name: "gstin", label: "GSTIN", type: "text" },
          { name: "pan_number", label: "PAN Number", type: "text" },
          { name: "cin_number", label: "CIN Number", type: "text" },
          { name: "email", label: "Company Email", type: "email" },
          { name: "phone", label: "Company Phone", type: "text" },
          { name: "website", label: "Website", type: "text" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "city", label: "City", type: "text" },
          { name: "state", label: "State", type: "text" },
          { name: "pincode", label: "Pincode", type: "text" },
        ],
      },
    ],
  },
  {
    group: "BILLING",
    icon: FileText,
    items: [
      {
        key: "invoice",
        label: "Invoice",
        title: "Invoice Settings",
        subtitle: "Invoice numbering, terms and billing rules",
        icon: FileText,
        endpoint: "/api/settings/invoice",
        fields: [
          { name: "prefix", label: "Invoice Prefix", type: "text", placeholder: "VS" },
          { name: "next_number", label: "Next Invoice Number", type: "number" },
          { name: "logo", label: "Logo URL", type: "text" },
          { name: "terms_conditions", label: "Terms & Conditions", type: "textarea" },
          { name: "footer_text", label: "Footer Note", type: "textarea" },
        ],
      },
      {
        key: "gst",
        label: "GST",
        title: "GST Settings",
        subtitle: "GST compliance, filing and e-invoice configuration",
        icon: BadgeCheck,
        endpoint: "/api/settings/gst",
        fields: [
          { name: "gst_number", label: "GSTIN", type: "text" },
          { name: "legal_name", label: "Legal Name", type: "text" },
          { name: "state", label: "State", type: "text" },
          { name: "address", label: "Address", type: "textarea" },
          {
            name: "default_tax_type",
            label: "Default Tax Type",
            type: "select",
            options: [
              { label: "CGST + SGST", value: "cgst_sgst" },
              { label: "IGST", value: "igst" },
            ],
          },
          { name: "e_invoice_enabled", label: "E-Invoice Enabled", type: "select", options: yesNoOptions },
          { name: "e_way_bill_enabled", label: "E-Way Bill Enabled", type: "select", options: yesNoOptions },
        ],
      },
      {
        key: "payment-gateway",
        label: "Payment Gateway",
        title: "Payment Gateway Settings",
        subtitle: "Gateway provider, API credentials and live/test mode",
        icon: CreditCard,
        endpoint: "/api/settings/payment-gateway",
        fields: [
          { name: "provider", label: "Provider", type: "text", placeholder: "Razorpay / Cashfree" },
          { name: "merchant_id", label: "Merchant ID", type: "text" },
          { name: "api_key", label: "API Key", type: "password" },
          { name: "api_secret", label: "API Secret", type: "password" },
          { name: "webhook_secret", label: "Webhook Secret", type: "password" },
          {
            name: "mode",
            label: "Mode",
            type: "select",
            options: [
              { label: "Test", value: "test" },
              { label: "Live", value: "live" },
            ],
          },
          { name: "status", label: "Status", type: "select", options: statusOptions },
        ],
      },
    ],
  },
  {
    group: "NOTIFICATIONS",
    icon: MessageSquare,
    items: [
      {
        key: "email",
        label: "Email / SMTP",
        title: "Email Settings",
        subtitle: "SMTP sender and mail delivery settings",
        icon: Mail,
        endpoint: "/api/settings/email",
        fields: [
          { name: "smtp_host", label: "SMTP Host", type: "text" },
          { name: "smtp_port", label: "SMTP Port", type: "number" },
          { name: "smtp_user", label: "SMTP User", type: "text" },
          { name: "smtp_password", label: "SMTP Password", type: "password" },
          { name: "from_email", label: "From Email", type: "email" },
          { name: "from_name", label: "From Name", type: "text" },
          {
            name: "encryption",
            label: "Encryption",
            type: "select",
            options: [
              { label: "None", value: "none" },
              { label: "SSL", value: "ssl" },
              { label: "TLS", value: "tls" },
            ],
          },
          { name: "status", label: "Status", type: "select", options: statusOptions },
        ],
      },
      {
        key: "sms",
        label: "SMS / OTP",
        title: "SMS / OTP Settings",
        subtitle: "SMS provider, sender ID and OTP expiry settings",
        icon: MessageSquare,
        endpoint: "/api/settings/sms",
        fields: [
          { name: "provider", label: "Provider", type: "text", placeholder: "MSG91 / Textlocal" },
          { name: "sender_id", label: "Sender ID", type: "text" },
          { name: "api_key", label: "API Key", type: "password" },
          { name: "status", label: "Status", type: "select", options: statusOptions },
        ],
      },
    ],
  },
  {
    group: "SYSTEM",
    icon: LockKeyhole,
    items: [
      {
        key: "security",
        label: "Security",
        title: "Security Settings",
        subtitle: "Session, password and login protection",
        icon: ShieldCheck,
        endpoint: "/api/settings/security",
        fields: [
          { name: "session_timeout_minutes", label: "Session Timeout Minutes", type: "number" },
          { name: "password_min_length", label: "Password Minimum Length", type: "number" },
          { name: "login_attempt_limit", label: "Max Login Attempts", type: "number" },
          { name: "lockout_minutes", label: "Lockout Minutes", type: "number" },
          { name: "two_factor_enabled", label: "Two Factor Enabled", type: "select", options: yesNoOptions },
        ],
      },
      {
        key: "backup",
        label: "Backups",
        title: "Backup Settings",
        subtitle: "Recent backup records and manual backup log",
        icon: DatabaseBackup,
        endpoint: "/api/settings/backup",
        readonly: true,
        type: "table",
      },
      {
        key: "logs",
        label: "Activity Logs",
        title: "System Logs / Activity Settings",
        subtitle: "Recent system and activity logs",
        icon: Activity,
        endpoint: "/api/settings/activity-logs",
        readonly: true,
        type: "table",
      },
    ],
  },
  {
    group: "WEBSITE",
    icon: Globe2,
    items: [
      {
        key: "customer-website",
        label: "Customer Website",
        title: "Customer Website Profile",
        subtitle: "Avatar, logo, banner, social links and contact info",
        icon: Globe2,
        endpoint: "/api/settings/customer-website",
        fields: [
          { name: "website_avatar",  label: "Avatar URL",        type: "image-url", placeholder: "https://example.com/avatar.png" },
          { name: "website_logo",    label: "Logo URL",          type: "image-url", placeholder: "https://example.com/logo.png" },
          { name: "website_banner",  label: "Banner Image URL",  type: "image-url", placeholder: "https://example.com/banner.png" },
          { name: "website_url",     label: "Website URL",       type: "text",      placeholder: "https://yourwebsite.com" },
          { name: "facebook_url",    label: "Facebook URL",      type: "text" },
          { name: "instagram_url",   label: "Instagram URL",     type: "text" },
          { name: "youtube_url",     label: "YouTube URL",       type: "text" },
          { name: "linkedin_url",    label: "LinkedIn URL",      type: "text" },
          { name: "twitter_url",     label: "X / Twitter URL",   type: "text" },
          { name: "whatsapp_url",    label: "WhatsApp URL",      type: "text" },
          { name: "google_map_url",  label: "Google Map Link",   type: "text" },
          { name: "support_email",   label: "Support Email",     type: "email" },
          { name: "support_phone",   label: "Support Phone",     type: "text" },
          { name: "address",         label: "Address",           type: "textarea" },
        ],
      },
    ],
  },
];

const tabs = SETTINGS_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.group }))
);

const emptySummary = {
  total_settings: 0,
  active_settings: 0,
  inactive_settings: 0,
  last_updated: null,
  sections: [],
};

const cleanDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

const getResponsePayload = (response) => {
  const body = response?.data || {};

  if (body.data !== undefined) return body.data;
  if (body.settings !== undefined) return body.settings;
  if (body.logs !== undefined) return body.logs;
  if (body.result !== undefined) return body.result;

  return body;
};

const normalizeObject = (payload) => {
  if (!payload) return {};

  if (Array.isArray(payload)) {
    return payload.reduce((acc, row) => {
      if (row.setting_key) acc[row.setting_key] = row.setting_value ?? "";
      if (row.key) acc[row.key] = row.value ?? "";
      if (row.name && row.value !== undefined) acc[row.name] = row.value ?? "";
      return acc;
    }, {});
  }

  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
};

const normalizeRows = (response) => {
  const body = response?.data || {};
  const payload = getResponsePayload(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(body.logs)) return body.logs;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.rows)) return body.rows;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(payload?.logs)) return payload.logs;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
};

function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [summary, setSummary] = useState(emptySummary);
  const [formData, setFormData] = useState({});
  const [tableRows, setTableRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeConfig = useMemo(() => {
    return tabs.find((tab) => tab.key === activeTab) || tabs[0];
  }, [activeTab]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return tableRows;

    const term = search.toLowerCase();

    return tableRows.filter((row) =>
      Object.values(row || {})
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [tableRows, search]);

  const tableColumns = useMemo(() => {
    if (!filteredRows.length) return [];

    const priority = [
      "id",
      "source_table",
      "backup_name",
      "backup_type",
      "action",
      "type",
      "module",
      "description",
      "message",
      "status",
      "created_by",
      "user_id",
      "created_at",
      "updated_at",
    ];

    const allKeys = Array.from(
      new Set(filteredRows.flatMap((row) => Object.keys(row || {})))
    );

    const orderedPriority = priority.filter((key) => allKeys.includes(key));
    const remaining = allKeys.filter((key) => !orderedPriority.includes(key));

    return [...orderedPriority, ...remaining].slice(0, 8);
  }, [filteredRows]);

  const loadSummary = async () => {
    setSummaryLoading(true);

    try {
      const response = await api.get("/api/settings/summary");
      const payload = getResponsePayload(response);

      setSummary({
        total_settings: Number(payload.total_settings || 0),
        active_settings: Number(payload.active_settings || 0),
        inactive_settings: Number(payload.inactive_settings || 0),
        last_updated: payload.last_updated || null,
        sections: payload.sections || [],
      });
    } catch {
      setSummary(emptySummary);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadSection = async (config = activeConfig) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get(config.endpoint);

      if (config.readonly || config.type === "table") {
        setTableRows(normalizeRows(response));
        setFormData({});
      } else {
        setFormData(normalizeObject(getResponsePayload(response)));
        setTableRows([]);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Failed to load ${config.title}`;

      setError(message);
      setFormData({});
      setTableRows([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrent = async () => {
    await Promise.all([loadSummary(), loadSection(activeConfig)]);
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearch("");
    setError("");
    setSuccess("");
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (fieldName, file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await api.post("/api/settings/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!uploadRes.data.success) throw new Error(uploadRes.data.message || "Upload failed");
      const url = uploadRes.data.url;
      handleChange(fieldName, url);
      await api.put(activeConfig.endpoint, { [fieldName]: url });
      setSuccess("Image uploaded and saved");
      await refreshCurrent();
    } catch(e) {
      setError(e?.response?.data?.message || e?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (activeConfig.readonly) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      try {
        await api.put(activeConfig.endpoint, formData);
      } catch (putError) {
        if ([404, 405].includes(putError?.response?.status)) {
          await api.post(activeConfig.endpoint, formData);
        } else {
          throw putError;
        }
      }

      setSuccess(`${activeConfig.title} updated successfully`);
      await refreshCurrent();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Failed to save ${activeConfig.title}`;

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/api/settings/backup", {
        backup_name: `Manual Backup ${new Date().toISOString()}`,
        backup_type: "manual",
        status: "pending",
      });

      setSuccess("Backup record created successfully");
      await refreshCurrent();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create backup record";

      setError(message);
    } finally {
      setCreatingBackup(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadSection(activeConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const renderInput = (field) => {
    const value = formData?.[field.name] ?? "";

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          placeholder={field.placeholder || ""}
          onChange={(event) => handleChange(field.name, event.target.value)}
          rows={4}
        />
      );
    }

    if (field.type === "image-url") {
      const previewSrc = value
        ? value.startsWith("http") ? value : `${SERVER_BASE}${value}`
        : null;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {previewSrc && (
            <img
              key={previewSrc}
              src={previewSrc}
              alt={field.label}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ maxHeight: 90, maxWidth: "100%", borderRadius: 8, border: "1px solid #E0D8C0", objectFit: "contain" }}
            />
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", background: "#151515", color: "#C9B96E", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}>
              {uploading ? "Uploading…" : "↑ Upload Image"}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: "none" }}
                disabled={uploading}
                onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(field.name, e.target.files[0]); e.target.value = ""; }}
              />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => handleChange(field.name, "")}
                style={{ padding: "7px 14px", background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12 }}
              >
                ✕ Remove
              </button>
            )}
          </div>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <select
          value={value}
          onChange={(event) => handleChange(field.name, event.target.value)}
        >
          <option value="">Select {field.label}</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={value}
        placeholder={field.placeholder || ""}
        onChange={(event) => handleChange(field.name, event.target.value)}
      />
    );
  };

  return (
    <AdminLayout>
      <div className="settings-page">
        <div className="premium-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <Sparkles size={24} />
            </div>

            <div>
              <p className="eyebrow">Vivin Store Control Panel</p>
              <h1>Premium Settings Console</h1>
              <p className="hero-desc">
                Configure business profile, billing rules, notifications, security,
                backups and activity tracking from one polished Super Admin workspace.
              </p>

              <div className="hero-tags">
                <span>
                  <Zap size={14} />
                  API Connected
                </span>
                <span>
                  <ShieldCheck size={14} />
                  Protected Routes
                </span>
                <span>
                  <Layers3 size={14} />
                  {tabs.length} Modules
                </span>
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <button className="soft-btn" onClick={refreshCurrent}>
              <RefreshCw size={17} />
              Refresh
            </button>

            {!activeConfig.readonly && (
              <button className="gold-btn" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                Save Changes
              </button>
            )}

            {activeConfig.key === "backup" && (
              <button
                className="gold-btn"
                disabled={creatingBackup}
                onClick={handleCreateBackup}
              >
                {creatingBackup ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <DatabaseBackup size={17} />
                )}
                Create Backup
              </button>
            )}
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card dark">
            <span>Total Settings</span>
            <strong>{summaryLoading ? "..." : summary.total_settings}</strong>
            <small>Configured records</small>
          </div>

          <div className="summary-card">
            <span>Active Settings</span>
            <strong>{summaryLoading ? "..." : summary.active_settings}</strong>
            <small>Enabled configuration</small>
          </div>

          <div className="summary-card">
            <span>Inactive Settings</span>
            <strong>{summaryLoading ? "..." : summary.inactive_settings}</strong>
            <small>Disabled configuration</small>
          </div>

          <div className="summary-card">
            <span>Last Updated</span>
            <strong className="date-value">{cleanDate(summary.last_updated)}</strong>
            <small>Latest change record</small>
          </div>
        </div>

        {error && (
          <div className="alert-box error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-box success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <div className="settings-layout">
          <aside className="settings-menu">
            <div className="menu-header">
              <span>Configuration Modules</span>
              <strong>{tabs.length}</strong>
            </div>

            {SETTINGS_GROUPS.map((group) => {
              const GroupIcon = group.icon;

              return (
                <div className="menu-group" key={group.group}>
                  <div className="group-title">
                    <GroupIcon size={14} />
                    {group.group}
                  </div>

                  {group.items.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        className={`menu-item ${active ? "active" : ""}`}
                        onClick={() => handleTabChange(tab.key)}
                      >
                        <span className="menu-icon">
                          <Icon size={17} />
                        </span>

                        <span className="menu-text">
                          <strong>{tab.label}</strong>
                          <small>{tab.subtitle}</small>
                        </span>

                        <ChevronRight size={16} className="chev" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </aside>

          <main className="settings-panel">
            <div className="panel-top">
              <div>
                <span className="panel-chip">{activeConfig.group}</span>
                <h2>{activeConfig.title}</h2>
                <p>{activeConfig.subtitle}</p>
              </div>

              {(activeConfig.readonly || activeConfig.type === "table") && (
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search records..."
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-box">
                <Loader2 className="spin" size={26} />
                <span>Loading {activeConfig.title}...</span>
              </div>
            ) : activeConfig.readonly || activeConfig.type === "table" ? (
              <div className="table-card">
                <div className="table-header">
                  <strong>{filteredRows.length} Records</strong>
                  <span>{activeConfig.title}</span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {tableColumns.length ? (
                          tableColumns.map((column) => (
                            <th key={column}>{column.replace(/_/g, " ")}</th>
                          ))
                        ) : (
                          <th>Records</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.length ? (
                        filteredRows.map((row, index) => (
                          <tr key={row.id || index}>
                            {tableColumns.map((column) => (
                              <td key={column}>
                                {column.includes("created_at") ||
                                column.includes("updated_at")
                                  ? cleanDate(row[column])
                                  : row[column] === null || row[column] === undefined
                                  ? "—"
                                  : String(row[column])}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={tableColumns.length || 1} className="empty-cell">
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  {(activeConfig.fields || []).map((field) => (
                    <label
                      key={field.name}
                      className={`form-field ${field.type === "textarea" || field.type === "image-url" ? "full" : ""}`}
                    >
                      <span>{field.label}</span>
                      {renderInput(field)}
                    </label>
                  ))}
                </div>

                <div className="panel-actions">
                  <button className="soft-btn" onClick={() => loadSection(activeConfig)}>
                    Reset
                  </button>

                  <button className="gold-btn" disabled={saving} onClick={handleSave}>
                    {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                    Save {activeConfig.label}
                  </button>
                </div>
              </>
            )}
          </main>
        </div>

        <style>{`
          .settings-page {
            color: #151515;
          }

          .premium-hero {
            position: relative;
            overflow: hidden;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            padding: 34px;
            border-radius: 32px;
            margin-bottom: 18px;
            color: #fff;
            background:
              radial-gradient(circle at 92% 8%, rgba(250, 203, 82, 0.34), transparent 28%),
              radial-gradient(circle at 18% 90%, rgba(250, 203, 82, 0.14), transparent 26%),
              linear-gradient(135deg, #0b0b0d 0%, #17110a 55%, #2b1c06 100%);
            border: 1px solid rgba(250, 203, 82, 0.26);
            box-shadow: 0 22px 60px rgba(0, 0, 0, 0.18);
          }

          .premium-hero::before {
            content: "";
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
            background-size: 42px 42px;
            mask-image: linear-gradient(to bottom, rgba(0,0,0,.5), transparent);
            pointer-events: none;
          }

          .hero-left,
          .hero-actions {
            position: relative;
            z-index: 1;
          }

          .hero-left {
            display: flex;
            gap: 18px;
            align-items: flex-start;
          }

          .hero-icon {
            width: 62px;
            height: 62px;
            border-radius: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #111;
            background: linear-gradient(135deg, #ffe48a, #d6a21f);
            box-shadow: 0 18px 40px rgba(214, 162, 31, 0.32);
            flex-shrink: 0;
          }

          .eyebrow {
            margin: 0 0 8px;
            color: #f7d982;
            font-size: 12px;
            font-weight: 950;
            letter-spacing: 0.7px;
            text-transform: uppercase;
          }

          .premium-hero h1 {
            margin: 0;
            font-size: 34px;
            line-height: 1.05;
            font-weight: 950;
            letter-spacing: -0.9px;
          }

          .hero-desc {
            margin: 12px 0 0;
            max-width: 800px;
            color: rgba(255, 255, 255, 0.72);
            font-size: 14px;
            line-height: 1.75;
          }

          .hero-tags {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 18px;
          }

          .hero-tags span {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            height: 32px;
            padding: 0 12px;
            border-radius: 999px;
            color: #fff3c7;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            font-size: 12px;
            font-weight: 900;
          }

          .hero-actions,
          .panel-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: center;
            justify-content: flex-end;
          }

          .gold-btn,
          .soft-btn {
            height: 44px;
            padding: 0 17px;
            border: none;
            border-radius: 15px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 950;
            white-space: nowrap;
            transition: 0.2s ease;
          }

          .gold-btn {
            color: #111;
            background: linear-gradient(135deg, #f8dc7c, #c89421);
            box-shadow: 0 14px 28px rgba(200, 148, 33, 0.26);
          }

          .soft-btn {
            color: #222;
            background: #fff;
            border: 1px solid #e9e9e9;
          }

          .gold-btn:hover,
          .soft-btn:hover {
            transform: translateY(-1px);
          }

          .gold-btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
            transform: none;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 15px;
            margin-bottom: 18px;
          }

          .summary-card {
            position: relative;
            overflow: hidden;
            padding: 19px;
            border-radius: 24px;
            background: #fff;
            border: 1px solid #ececec;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.045);
          }

          .summary-card::after {
            content: "";
            position: absolute;
            width: 92px;
            height: 92px;
            right: -30px;
            top: -30px;
            border-radius: 999px;
            background: rgba(214, 162, 31, 0.10);
          }

          .summary-card.dark {
            color: #fff;
            background: linear-gradient(135deg, #121212, #2a1a05);
            border-color: rgba(250, 203, 82, 0.24);
          }

          .summary-card span {
            display: block;
            color: #777;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 9px;
          }

          .summary-card.dark span,
          .summary-card.dark small {
            color: rgba(255,255,255,.68);
          }

          .summary-card strong {
            display: block;
            color: #111;
            font-size: 30px;
            line-height: 1;
            font-weight: 950;
            margin-bottom: 9px;
          }

          .summary-card.dark strong {
            color: #fff;
          }

          .summary-card small {
            display: block;
            color: #8a8a8a;
            font-size: 12px;
            font-weight: 800;
          }

          .summary-card .date-value {
            font-size: 13px;
            line-height: 1.4;
          }

          .alert-box {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 13px 15px;
            border-radius: 17px;
            margin-bottom: 18px;
            font-size: 13px;
            font-weight: 900;
          }

          .alert-box.error {
            background: #fff1f1;
            border: 1px solid #ffc9c9;
            color: #d63636;
          }

          .alert-box.success {
            background: #effdf3;
            border: 1px solid #bcefc8;
            color: #16833a;
          }

          .settings-layout {
            display: grid;
            grid-template-columns: 350px minmax(0, 1fr);
            gap: 18px;
            align-items: start;
          }

          .settings-menu,
          .settings-panel {
            background: #fff;
            border: 1px solid #ececec;
            border-radius: 28px;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.045);
          }

          .settings-menu {
            padding: 14px;
            position: sticky;
            top: 18px;
          }

          .menu-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 10px 14px;
            border-bottom: 1px solid #eeeeee;
            margin-bottom: 12px;
          }

          .menu-header span {
            color: #777;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.45px;
          }

          .menu-header strong {
            min-width: 30px;
            height: 30px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #111;
            background: #f7d66d;
            font-size: 12px;
            font-weight: 950;
          }

          .menu-group {
            margin-bottom: 14px;
          }

          .group-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #a47c1b;
            font-size: 11px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 7px 10px;
          }

          .menu-item {
            width: 100%;
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr) 18px;
            gap: 11px;
            align-items: center;
            padding: 12px;
            border: 1px solid transparent;
            border-radius: 18px;
            background: transparent;
            cursor: pointer;
            text-align: left;
            transition: 0.2s ease;
          }

          .menu-item:hover {
            background: #fafafa;
          }

          .menu-item.active {
            background: linear-gradient(135deg, #fff8e8, #ffffff);
            border-color: #ecdca9;
            box-shadow: 0 10px 24px rgba(214, 162, 31, 0.08);
          }

          .menu-icon {
            width: 42px;
            height: 42px;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            color: #777;
          }

          .menu-item.active .menu-icon {
            color: #f8dc7c;
            background: #111;
          }

          .menu-text {
            min-width: 0;
          }

          .menu-text strong {
            display: block;
            color: #151515;
            font-size: 13px;
            font-weight: 950;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .menu-text small {
            display: block;
            color: #777;
            font-size: 11px;
            font-weight: 750;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .chev {
            color: #aaa;
          }

          .menu-item.active .chev {
            color: #a47c1b;
          }

          .settings-panel {
            padding: 26px;
            min-height: 720px;
          }

          .panel-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eeeeee;
          }

          .panel-chip {
            display: inline-flex;
            align-items: center;
            height: 28px;
            padding: 0 11px;
            border-radius: 999px;
            color: #815c0d;
            background: #fff3cf;
            border: 1px solid #ecdca9;
            font-size: 11px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 9px;
          }

          .panel-top h2 {
            margin: 0;
            color: #111;
            font-size: 25px;
            font-weight: 950;
            letter-spacing: -0.45px;
          }

          .panel-top p {
            margin: 7px 0 0;
            color: #777;
            font-size: 13px;
            line-height: 1.65;
          }

          .search-box {
            width: 320px;
            height: 46px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 14px;
            border-radius: 16px;
            color: #888;
            background: #f8f8f8;
            border: 1px solid #eeeeee;
          }

          .search-box input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            color: #222;
            font-size: 13px;
            font-weight: 800;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .form-field {
            display: flex;
            flex-direction: column;
            gap: 9px;
            padding: 15px;
            border-radius: 20px;
            background: #fcfcfc;
            border: 1px solid #eeeeee;
            transition: 0.2s ease;
          }

          .form-field:hover {
            border-color: #e1cf98;
            background: #fff;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04);
          }

          .form-field.full {
            grid-column: 1 / -1;
          }

          .form-field span {
            color: #555;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.35px;
          }

          .form-field input,
          .form-field select,
          .form-field textarea {
            width: 100%;
            min-height: 46px;
            border-radius: 15px;
            border: 1px solid #e5e5e5;
            outline: none;
            background: #fff;
            color: #222;
            padding: 0 14px;
            font-size: 13px;
            font-weight: 800;
            transition: 0.2s ease;
          }

          .form-field textarea {
            min-height: 112px;
            resize: vertical;
            padding-top: 13px;
            line-height: 1.65;
          }

          .form-field input:focus,
          .form-field select:focus,
          .form-field textarea:focus {
            border-color: #c89421;
            box-shadow: 0 0 0 4px rgba(200, 148, 33, 0.12);
          }

          .panel-actions {
            justify-content: flex-end;
            margin-top: 24px;
            padding-top: 22px;
            border-top: 1px solid #eeeeee;
          }

          .loading-box {
            min-height: 320px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #777;
            font-size: 14px;
            font-weight: 950;
          }

          .table-card {
            overflow: hidden;
            border-radius: 22px;
            border: 1px solid #eeeeee;
            background: #fff;
          }

          .table-header {
            display: flex;
            justify-content: space-between;
            padding: 15px 16px;
            background: #fcfcfc;
            border-bottom: 1px solid #eeeeee;
          }

          .table-header strong,
          .table-header span {
            color: #666;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.35px;
          }

          .table-wrap {
            overflow: auto;
          }

          table {
            width: 100%;
            min-width: 860px;
            border-collapse: collapse;
          }

          th,
          td {
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
            text-align: left;
            vertical-align: top;
            font-size: 13px;
          }

          th {
            background: #fafafa;
            color: #666;
            font-size: 11px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.35px;
          }

          td {
            color: #222;
            font-weight: 750;
            max-width: 280px;
            word-break: break-word;
            line-height: 1.5;
          }

          tbody tr:hover td {
            background: #fffaf0;
          }

          .empty-cell {
            padding: 44px;
            color: #888;
            font-weight: 900;
            text-align: center;
          }

          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 1280px) {
            .settings-layout {
              grid-template-columns: 1fr;
            }

            .settings-menu {
              position: static;
            }
          }

          @media (max-width: 1100px) {
            .premium-hero,
            .panel-top {
              flex-direction: column;
            }

            .summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .hero-actions {
              justify-content: flex-start;
            }

            .search-box {
              width: 100%;
            }
          }

          @media (max-width: 760px) {
            .premium-hero {
              padding: 24px;
              border-radius: 24px;
            }

            .premium-hero h1 {
              font-size: 28px;
            }

            .hero-left {
              flex-direction: column;
            }

            .summary-grid,
            .form-grid {
              grid-template-columns: 1fr;
            }

            .settings-panel {
              padding: 18px;
              border-radius: 22px;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}

export default Settings;
