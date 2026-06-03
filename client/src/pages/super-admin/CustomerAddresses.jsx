import { useEffect, useState } from "react";
import API from "../../api/axios";
import {
  BadgeCheck,
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

const initialAddress = {
  address_type: "shipping",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  is_default: false,
};

export default function CustomerAddresses({ customer, onClose }) {
  const [addresses, setAddresses] = useState([]);
  const [formData, setFormData] = useState(initialAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get(`/api/customer-addresses/${customer.id}`);

      if (res.data.success) {
        setAddresses(res.data.addresses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer?.id) {
      fetchAddresses();
    }
  }, [customer?.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const openCreateForm = () => {
    setFormData(initialAddress);
    setEditingAddressId(null);
    setShowForm(true);
  };

  const handleEdit = (address) => {
    setEditingAddressId(address.id);

    setFormData({
      address_type: address.address_type || "shipping",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      country: address.country || "India",
      pincode: address.pincode || "",
      is_default: Boolean(address.is_default),
    });

    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData(initialAddress);
    setEditingAddressId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.address_line1.trim()) {
      setError("Address line 1 is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      let res;

      if (editingAddressId) {
        res = await API.put(
          `/api/customer-addresses/address/${editingAddressId}`,
          formData
        );
      } else {
        res = await API.post(`/api/customer-addresses/${customer.id}`, formData);
      }

      if (res.data.success) {
        handleCancel();
        fetchAddresses();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this address?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/customer-addresses/address/${addressId}`);
      fetchAddresses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete address");
    }
  };

  return (
    <div className="address-modal-overlay">
      <style>{css}</style>

      <div className="customer-address-modal">
        <div className="address-modal-glow address-glow-one" />
        <div className="address-modal-glow address-glow-two" />

        <div className="address-header">
          <div className="address-title">
            <div className="address-icon">
              <MapPin size={26} />
            </div>

            <div>
              <span className="address-kicker">Customer Location Records</span>
              <h2>Customer Addresses</h2>
              <p>{customer?.business_name || "Selected Customer"}</p>
            </div>
          </div>

          <button className="close-modal-btn" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="address-actions">
          <div className="address-count-card">
            <span>Total Addresses</span>
            <strong>{addresses.length}</strong>
          </div>

          <div className="address-action-buttons">
            <button
              className="address-secondary-btn"
              type="button"
              onClick={fetchAddresses}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              Refresh
            </button>

            <button
              className="address-primary-btn"
              type="button"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              Add Address
            </button>
          </div>
        </div>

        {error && (
          <div className="address-error-box">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        {showForm && (
          <form className="address-form" onSubmit={handleSubmit}>
            <div className="address-form-header">
              <div>
                <span className="address-section-label">
                  {editingAddressId ? "Update Address" : "Create Address"}
                </span>

                <h3>
                  {editingAddressId
                    ? "Edit Customer Address"
                    : "Add New Customer Address"}
                </h3>

                <p>
                  Add billing, shipping or office address details for this
                  customer.
                </p>
              </div>

              <button
                type="button"
                className="address-form-close"
                onClick={handleCancel}
              >
                <X size={16} />
              </button>
            </div>

            <div className="address-form-grid">
              <div className="address-form-group">
                <label>Address Type</label>
                <select
                  name="address_type"
                  value={formData.address_type}
                  onChange={handleChange}
                >
                  <option value="billing">Billing</option>
                  <option value="shipping">Shipping</option>
                  <option value="office">Office</option>
                </select>
              </div>

              <div className="address-form-group full">
                <label>Address Line 1 *</label>
                <input
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  placeholder="No 25, Main Road"
                  required
                />
              </div>

              <div className="address-form-group full">
                <label>Address Line 2</label>
                <input
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  placeholder="Near Market"
                />
              </div>

              <div className="address-form-group">
                <label>City</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Bangalore"
                />
              </div>

              <div className="address-form-group">
                <label>State</label>
                <input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Karnataka"
                />
              </div>

              <div className="address-form-group">
                <label>Country</label>
                <input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="India"
                />
              </div>

              <div className="address-form-group">
                <label>Pincode</label>
                <input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="560001"
                />
              </div>

              <label className="address-checkbox-row">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleChange}
                />

                <span>
                  <BadgeCheck size={15} />
                  Set as default address
                </span>
              </label>
            </div>

            <div className="address-form-actions">
              <button
                type="button"
                className="address-secondary-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="address-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingAddressId
                  ? "Update Address"
                  : "Save Address"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="address-empty-box">
            <div className="address-empty-icon">
              <RefreshCw size={24} className="spin" />
            </div>

            <div>
              <h3>Loading addresses...</h3>
              <p>Please wait while address records are loading.</p>
            </div>
          </div>
        ) : addresses.length === 0 ? (
          <div className="address-empty-box">
            <div className="address-empty-icon">
              <MapPin size={24} />
            </div>

            <div>
              <h3>No address found</h3>
              <p>Add billing, shipping or office address for this customer.</p>
            </div>
          </div>
        ) : (
          <div className="address-grid">
            {addresses.map((address) => (
              <div className="address-card" key={address.id}>
                <div className="address-card-top">
                  <div className="address-badge-row">
                    <span className={`address-type type-${address.address_type}`}>
                      {address.address_type || "shipping"}
                    </span>

                    {Boolean(address.is_default) && (
                      <span className="default-badge">
                        <BadgeCheck size={13} />
                        Default
                      </span>
                    )}
                  </div>

                  <div className="card-actions">
                    <button
                      className="address-edit-btn"
                      type="button"
                      onClick={() => handleEdit(address)}
                      title="Edit Address"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      className="address-delete-btn"
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      title="Delete Address"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="address-card-body">
                  <p>
                    {address.address_line1}
                    <br />

                    {address.address_line2 && (
                      <>
                        {address.address_line2}
                        <br />
                      </>
                    )}

                    {[address.city, address.state, address.country]
                      .filter(Boolean)
                      .join(", ")}

                    <br />
                    PIN: {address.pincode || "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const css = `
  .address-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background:
      radial-gradient(circle at top right, rgba(255, 210, 30, 0.14), transparent 32%),
      rgba(3, 6, 12, 0.72);
    backdrop-filter: blur(16px);
  }

  .customer-address-modal {
    --address-text: #171717;
    --address-muted: #6B7280;
    --address-soft: #8A7A52;
    --address-bg: rgba(255, 255, 255, 0.96);
    --address-card-bg: #FFFFFF;
    --address-soft-bg: #FFF9E8;
    --address-border: rgba(232, 224, 199, 0.95);
    --address-input-bg: #FFFFFF;
    --address-input-border: rgba(17, 24, 39, 0.12);
    --address-shadow: 0 30px 90px rgba(0, 0, 0, 0.30);

    position: relative;
    width: 100%;
    max-width: 1080px;
    max-height: 92vh;
    overflow-y: auto;
    border-radius: 30px;
    padding: 28px;
    background:
      radial-gradient(circle at top right, rgba(255, 210, 30, 0.18), transparent 34%),
      var(--address-bg);
    border: 1px solid var(--address-border);
    box-shadow: var(--address-shadow);
    color: var(--address-text);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  .theme-dark .customer-address-modal {
    --address-text: #F8FAFC;
    --address-muted: rgba(255, 255, 255, 0.62);
    --address-soft: rgba(255, 255, 255, 0.44);
    --address-bg: rgba(8, 10, 18, 0.96);
    --address-card-bg: rgba(255, 255, 255, 0.055);
    --address-soft-bg: rgba(255, 255, 255, 0.055);
    --address-border: rgba(255, 255, 255, 0.10);
    --address-input-bg: rgba(255, 255, 255, 0.06);
    --address-input-border: rgba(255, 255, 255, 0.11);
    --address-shadow: 0 34px 96px rgba(0, 0, 0, 0.58);
  }

  .customer-address-modal::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.24;
    pointer-events: none;
  }

  .address-modal-glow {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }

  .address-glow-one {
    width: 180px;
    height: 180px;
    top: -85px;
    right: -60px;
    background: rgba(255, 210, 30, 0.28);
    filter: blur(16px);
  }

  .address-glow-two {
    width: 120px;
    height: 120px;
    left: -50px;
    bottom: -45px;
    background: rgba(255, 210, 30, 0.12);
    filter: blur(18px);
  }

  .address-header,
  .address-actions,
  .address-form,
  .address-grid,
  .address-empty-box,
  .address-error-box {
    position: relative;
    z-index: 1;
  }

  .address-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 22px;
  }

  .address-title {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    min-width: 0;
  }

  .address-icon {
    width: 58px;
    height: 58px;
    border-radius: 20px;
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16px 36px rgba(255, 210, 30, 0.24);
    flex-shrink: 0;
  }

  .address-kicker {
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
    margin-bottom: 9px;
  }

  .theme-dark .address-kicker {
    color: #FFD21E;
  }

  .address-header h2 {
    margin: 0;
    color: var(--address-text);
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: 27px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.6px;
  }

  .address-header p {
    margin: 6px 0 0;
    color: var(--address-muted);
    font-size: 13px;
    font-weight: 700;
  }

  .close-modal-btn {
    width: 42px;
    height: 42px;
    border: 1px solid var(--address-input-border);
    border-radius: 14px;
    background: var(--address-input-bg);
    color: var(--address-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .close-modal-btn:hover {
    transform: translateY(-2px);
    color: var(--address-text);
  }

  .address-actions {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 20px;
    align-items: center;
  }

  .address-count-card {
    min-height: 54px;
    min-width: 170px;
    border-radius: 18px;
    background: var(--address-card-bg);
    border: 1px solid var(--address-border);
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .address-count-card span {
    color: var(--address-muted);
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .address-count-card strong {
    color: var(--address-text);
    font-size: 21px;
    font-weight: 900;
    margin-top: 2px;
  }

  .address-action-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .address-primary-btn,
  .address-secondary-btn {
    min-height: 44px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 16px;
    border: none;
    font-family: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .address-primary-btn {
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    box-shadow: 0 12px 28px rgba(255, 210, 30, 0.22);
  }

  .address-secondary-btn {
    background: var(--address-input-bg);
    color: var(--address-text);
    border: 1px solid var(--address-input-border);
  }

  .address-primary-btn:hover,
  .address-secondary-btn:hover {
    transform: translateY(-2px);
  }

  .address-primary-btn:disabled,
  .address-secondary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .address-error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(220, 38, 38, 0.10);
    border: 1px solid rgba(220, 38, 38, 0.24);
    color: #DC2626;
    padding: 12px 14px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 18px;
  }

  .theme-dark .address-error-box {
    color: #FCA5A5;
  }

  .address-form {
    background: var(--address-card-bg);
    border: 1px solid var(--address-border);
    border-radius: 24px;
    padding: 22px;
    margin-bottom: 22px;
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.06);
  }

  .theme-dark .address-form {
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
  }

  .address-form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
  }

  .address-section-label {
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

  .theme-dark .address-section-label {
    color: #FFD21E;
  }

  .address-form-header h3 {
    margin: 0;
    color: var(--address-text);
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.4px;
  }

  .address-form-header p {
    margin: 5px 0 0;
    color: var(--address-muted);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.6;
  }

  .address-form-close {
    width: 38px;
    height: 38px;
    border: 1px solid var(--address-input-border);
    border-radius: 13px;
    background: var(--address-input-bg);
    color: var(--address-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .address-form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 15px;
  }

  .address-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .address-form-group.full {
    grid-column: 1 / -1;
  }

  .address-form-group label {
    font-size: 12px;
    font-weight: 900;
    color: var(--address-text);
  }

  .address-form-group input,
  .address-form-group select {
    width: 100%;
    min-height: 46px;
    border: 1.5px solid var(--address-input-border);
    border-radius: 15px;
    padding: 12px 14px;
    outline: none;
    font-size: 13px;
    font-weight: 750;
    box-sizing: border-box;
    font-family: inherit;
    background: var(--address-input-bg);
    color: var(--address-text);
  }

  .address-form-group input::placeholder {
    color: var(--address-soft);
  }

  .address-form-group input:focus,
  .address-form-group select:focus {
    border-color: rgba(255, 210, 30, 0.75);
    box-shadow: 0 0 0 4px rgba(255, 210, 30, 0.12);
  }

  .theme-dark .address-form-group select option {
    background: #0F172A;
    color: #F8FAFC;
  }

  .theme-light .address-form-group select option {
    background: #FFFFFF;
    color: #111827;
  }

  .address-checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    color: var(--address-text);
    font-size: 13px;
    font-weight: 900;
  }

  .address-checkbox-row input {
    width: 17px;
    height: 17px;
    accent-color: #FFD21E;
  }

  .address-checkbox-row span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .address-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
  }

  .address-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .address-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--address-border);
    border-radius: 22px;
    padding: 18px;
    background: var(--address-card-bg);
    box-shadow: 0 14px 38px rgba(17, 24, 39, 0.07);
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .theme-dark .address-card {
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.24);
  }

  .address-card::after {
    content: '';
    position: absolute;
    width: 105px;
    height: 105px;
    right: -52px;
    bottom: -52px;
    border-radius: 50%;
    background: rgba(255, 210, 30, 0.12);
    pointer-events: none;
  }

  .address-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 210, 30, 0.38);
    box-shadow: 0 22px 58px rgba(17, 24, 39, 0.12);
  }

  .theme-dark .address-card:hover {
    box-shadow: 0 26px 68px rgba(0, 0, 0, 0.34);
  }

  .address-card-top {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .address-badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .address-type,
  .default-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 900;
    text-transform: capitalize;
    border: 1px solid transparent;
  }

  .address-type {
    background: rgba(255, 210, 30, 0.14);
    color: #D9A900;
    border-color: rgba(255, 210, 30, 0.24);
  }

  .theme-dark .address-type {
    color: #FFD21E;
  }

  .type-billing {
    background: rgba(37, 99, 235, 0.12);
    color: #2563EB;
    border-color: rgba(37, 99, 235, 0.22);
  }

  .theme-dark .type-billing {
    color: #93C5FD;
  }

  .type-office {
    background: rgba(124, 58, 237, 0.12);
    color: #7C3AED;
    border-color: rgba(124, 58, 237, 0.22);
  }

  .theme-dark .type-office {
    color: #C4B5FD;
  }

  .default-badge {
    background: rgba(22, 163, 74, 0.12);
    color: #16A34A;
    border-color: rgba(22, 163, 74, 0.24);
  }

  .theme-dark .default-badge {
    color: #4ADE80;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .address-edit-btn,
  .address-delete-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease;
  }

  .address-edit-btn {
    background: rgba(255, 210, 30, 0.16);
    color: #D9A900;
  }

  .theme-dark .address-edit-btn {
    color: #FFD21E;
  }

  .address-delete-btn {
    background: rgba(220, 38, 38, 0.12);
    color: #DC2626;
  }

  .theme-dark .address-delete-btn {
    color: #FCA5A5;
  }

  .address-edit-btn:hover,
  .address-delete-btn:hover {
    transform: translateY(-2px);
  }

  .address-card-body {
    position: relative;
    z-index: 1;
  }

  .address-card-body p {
    margin: 0;
    color: var(--address-muted);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.75;
  }

  .address-empty-box {
    min-height: 190px;
    border: 1px dashed var(--address-border);
    border-radius: 22px;
    background: rgba(255, 210, 30, 0.045);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: left;
    padding: 28px;
  }

  .address-empty-icon {
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

  .theme-dark .address-empty-icon {
    color: #FFD21E;
  }

  .address-empty-box h3 {
    margin: 0;
    color: var(--address-text);
    font-size: 18px;
    font-weight: 900;
  }

  .address-empty-box p {
    margin: 7px 0 0;
    color: var(--address-muted);
    font-size: 13px;
    font-weight: 700;
  }

  .spin {
    animation: addressSpin 1s linear infinite;
  }

  @keyframes addressSpin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 850px) {
    .address-modal-overlay {
      padding: 16px;
    }

    .customer-address-modal {
      padding: 22px;
      border-radius: 24px;
    }

    .address-header,
    .address-actions,
    .address-card-top {
      flex-direction: column;
    }

    .address-action-buttons {
      width: 100%;
      justify-content: stretch;
    }

    .address-primary-btn,
    .address-secondary-btn {
      flex: 1;
    }

    .address-form-grid,
    .address-grid {
      grid-template-columns: 1fr;
    }

    .address-form-actions {
      flex-direction: column-reverse;
    }

    .address-form-actions .address-primary-btn,
    .address-form-actions .address-secondary-btn {
      width: 100%;
    }

    .address-empty-box {
      flex-direction: column;
      text-align: center;
    }
  }
`;