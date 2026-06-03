import { useEffect, useState } from "react";
import API from "../../api/axios";
import {
  BadgeCheck,
  Building2,
  CheckCircle,
  Edit3,
  Home,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

const initialAddressForm = {
  customer_id: "",
  address_type: "shipping",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  latitude: "",
  longitude: "",
  is_default: false,
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const getStatusKey = (status) => {
  const value = String(status || "active").toLowerCase().trim();

  if (value === "pending") return "pending";
  if (value === "inactive") return "inactive";
  if (value === "blocked") return "blocked";
  return "active";
};

const getStatusLabel = (status) => {
  const value = getStatusKey(status);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default function CustomerDetailsModal({ customer, onClose }) {
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(initialAddressForm);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState("");

  const fetchAddresses = async () => {
    if (!customer?.id) return;

    try {
      setLoadingAddress(true);
      setError("");

      const res = await API.get(
        `/api/customer-addresses/customer/${customer.id}`
      );

      if (res.data.success) {
        setAddresses(res.data.addresses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch addresses");
    } finally {
      setLoadingAddress(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
    setAddressForm({ ...initialAddressForm, customer_id: customer?.id || "" });
  }, [customer]);

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;

    setAddressForm({
      ...addressForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({ ...initialAddressForm, customer_id: customer?.id || "" });
    setShowAddressForm(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address.id);

    setAddressForm({
      customer_id: address.customer_id || customer?.id || "",
      address_type: address.address_type || "shipping",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      country: address.country || "India",
      pincode: address.pincode || "",
      latitude: address.latitude || "",
      longitude: address.longitude || "",
      is_default: address.is_default === 1 || address.is_default === true,
    });

    setShowAddressForm(true);
  };

  const handleCancelAddress = () => {
    setEditingAddressId(null);
    setShowAddressForm(false);
    setAddressForm({ ...initialAddressForm, customer_id: customer?.id || "" });
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();

    if (!addressForm.address_line1.trim()) {
      setError("Address line 1 is required");
      return;
    }

    try {
      setSavingAddress(true);
      setError("");

      const payload = {
        ...addressForm,
        customer_id: customer?.id || addressForm.customer_id,
      };

      const res = editingAddressId
        ? await API.put(`/api/customer-addresses/${editingAddressId}`, payload)
        : await API.post("/api/customer-addresses", payload);

      if (res.data.success) {
        handleCancelAddress();
        fetchAddresses();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingAddressId
            ? "Failed to update address"
            : "Failed to create address")
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;

    try {
      setError("");
      await API.delete(`/api/customer-addresses/${id}`);
      fetchAddresses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete address");
    }
  };

  if (!customer) return null;

  const statusKey = getStatusKey(customer.status);

  return (
    <div className="customer-modal-overlay">
      <style>{css}</style>

      <div className="customer-details-modal">
        <div className="modal-bg-grid" />
        <div className="modal-glow modal-glow-one" />
        <div className="modal-glow modal-glow-two" />

        <div className="customer-modal-header">
          <div className="customer-modal-title">
            <div className="customer-modal-icon">
              <Building2 size={26} />
            </div>

            <div>
              <span className="modal-kicker">Customer Profile</span>

              <h2>{customer.business_name}</h2>

              <p>
                Customer Code: {customer.customer_code || "-"} | Contact:{" "}
                {customer.contact_person || "-"}
              </p>
            </div>
          </div>

          <button className="modal-close-btn" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="customer-modal-body">
          {error && (
            <div className="error-box">
              <X size={16} />
              <span>{error}</span>
            </div>
          )}

          <section className="profile-summary-grid">
            <div className="summary-card">
              <div className="summary-icon">
                <User size={19} />
              </div>

              <span>Contact Person</span>
              <strong>{customer.contact_person || "-"}</strong>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                <Phone size={19} />
              </div>

              <span>Phone</span>
              <strong>{customer.phone || "-"}</strong>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                <Mail size={19} />
              </div>

              <span>Email</span>
              <strong>{customer.email || "-"}</strong>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                <Wallet size={19} />
              </div>

              <span>Credit Limit</span>
              <strong>{formatCurrency(customer.credit_limit)}</strong>
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <div>
                <span className="section-label">Business Information</span>
                <h3>Basic Details</h3>
              </div>

              <span className={`status-badge status-${statusKey}`}>
                <BadgeCheck size={13} />
                {getStatusLabel(customer.status)}
              </span>
            </div>

            <div className="details-grid">
              <div className="detail-box">
                <span>Business Name</span>
                <strong>{customer.business_name || "-"}</strong>
              </div>

              <div className="detail-box">
                <span>Contact Person</span>
                <strong>{customer.contact_person || "-"}</strong>
              </div>

              <div className="detail-box">
                <span>Phone</span>
                <strong>{customer.phone || "-"}</strong>
              </div>

              <div className="detail-box">
                <span>Email</span>
                <strong>{customer.email || "-"}</strong>
              </div>

              <div className="detail-box">
                <span>GST Number</span>
                <strong>{customer.gst_number || "-"}</strong>
              </div>

              <div className="detail-box">
                <span>PAN Number</span>
                <strong>{customer.pan_number || "-"}</strong>
              </div>

              <div className="detail-box">
                <span>Credit Limit</span>
                <strong>{formatCurrency(customer.credit_limit)}</strong>
              </div>

              <div className="detail-box">
                <span>Credit Days</span>
                <strong>{customer.credit_days || 0} Days</strong>
              </div>

              <div className="detail-box">
                <span>Group ID</span>
                <strong>{customer.group_id || "-"}</strong>
              </div>
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <div>
                <span className="section-label">Location Records</span>
                <h3>Customer Addresses</h3>
              </div>

              <div className="header-actions">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={fetchAddresses}
                  disabled={loadingAddress}
                >
                  <RefreshCw
                    size={16}
                    className={loadingAddress ? "spin" : ""}
                  />
                  Refresh
                </button>

                <button
                  className="primary-btn"
                  type="button"
                  onClick={handleAddAddress}
                >
                  <Plus size={17} />
                  Add Address
                </button>
              </div>
            </div>

            {showAddressForm && (
              <form className="address-form" onSubmit={handleAddressSubmit}>
                <div className="address-form-header">
                  <div>
                    <span className="section-label">
                      {editingAddressId ? "Update Address" : "Create Address"}
                    </span>

                    <h4>
                      {editingAddressId
                        ? "Edit Customer Address"
                        : "Add New Customer Address"}
                    </h4>

                    <p>
                      Add billing, shipping or office location details for this
                      customer.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="form-close-btn"
                    onClick={handleCancelAddress}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Address Type</label>
                    <select
                      name="address_type"
                      value={addressForm.address_type}
                      onChange={handleAddressChange}
                    >
                      <option value="billing">Billing</option>
                      <option value="shipping">Shipping</option>
                      <option value="office">Office</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Address Line 1 *</label>
                    <input
                      name="address_line1"
                      value={addressForm.address_line1}
                      onChange={handleAddressChange}
                      placeholder="No 25, Main Road"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Address Line 2</label>
                    <input
                      name="address_line2"
                      value={addressForm.address_line2}
                      onChange={handleAddressChange}
                      placeholder="Near Bus Stand"
                    />
                  </div>

                  <div className="form-group">
                    <label>City</label>
                    <input
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressChange}
                      placeholder="Bangalore"
                    />
                  </div>

                  <div className="form-group">
                    <label>State</label>
                    <input
                      name="state"
                      value={addressForm.state}
                      onChange={handleAddressChange}
                      placeholder="Karnataka"
                    />
                  </div>

                  <div className="form-group">
                    <label>Country</label>
                    <input
                      name="country"
                      value={addressForm.country}
                      onChange={handleAddressChange}
                      placeholder="India"
                    />
                  </div>

                  <div className="form-group">
                    <label>Pincode</label>
                    <input
                      name="pincode"
                      value={addressForm.pincode}
                      onChange={handleAddressChange}
                      placeholder="560001"
                    />
                  </div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={addressForm.is_default}
                      onChange={handleAddressChange}
                    />

                    <span>
                      <ShieldCheck size={15} />
                      Set as default address
                    </span>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleCancelAddress}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={savingAddress}
                  >
                    {savingAddress
                      ? "Saving..."
                      : editingAddressId
                      ? "Update Address"
                      : "Save Address"}
                  </button>
                </div>
              </form>
            )}

            {loadingAddress ? (
              <div className="empty-box">
                <div className="empty-icon">
                  <RefreshCw size={24} className="spin" />
                </div>

                <div>
                  <h4>Loading addresses...</h4>
                  <p>Please wait while address records are loading.</p>
                </div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="empty-box">
                <div className="empty-icon">
                  <MapPin size={24} />
                </div>

                <div>
                  <h4>No address added</h4>
                  <p>
                    Click Add Address to create billing, shipping or office
                    address.
                  </p>
                </div>
              </div>
            ) : (
              <div className="address-grid">
                {addresses.map((address) => {
                  const isDefault =
                    address.is_default === 1 || address.is_default === true;

                  return (
                    <div className="address-card" key={address.id}>
                      <div className="address-top">
                        <div className="address-badge-row">
                          <span
                            className={`address-type type-${
                              address.address_type || "shipping"
                            }`}
                          >
                            {address.address_type === "billing" ? (
                              <Home size={14} />
                            ) : (
                              <MapPin size={14} />
                            )}
                            {address.address_type || "shipping"}
                          </span>

                          {isDefault && (
                            <span className="default-badge">
                              <CheckCircle size={13} />
                              Default
                            </span>
                          )}
                        </div>

                        <div className="address-actions">
                          <button
                            className="icon-btn edit-btn"
                            type="button"
                            onClick={() => handleEditAddress(address)}
                            title="Edit Address"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            className="icon-btn delete-btn"
                            type="button"
                            onClick={() => handleDeleteAddress(address.id)}
                            title="Delete Address"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="address-text">
                        <div>{address.address_line1}</div>

                        {address.address_line2 && (
                          <div>{address.address_line2}</div>
                        )}

                        <div>
                          {[address.city, address.state, address.pincode]
                            .filter(Boolean)
                            .join(", ")}
                        </div>

                        <div>{address.country || "India"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  .customer-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 35px 18px;
    overflow-y: auto;
    background:
      radial-gradient(circle at top right, rgba(255, 210, 30, 0.14), transparent 32%),
      rgba(3, 6, 12, 0.72);
    backdrop-filter: blur(16px);
  }

  .customer-details-modal {
    --modal-text: #171717;
    --modal-muted: #6B7280;
    --modal-soft: #8A7A52;
    --modal-bg: rgba(255, 255, 255, 0.96);
    --modal-card-bg: #FFFFFF;
    --modal-soft-bg: #FFF9E8;
    --modal-border: rgba(232, 224, 199, 0.95);
    --modal-input-bg: #FFFFFF;
    --modal-input-border: rgba(17, 24, 39, 0.12);
    --modal-shadow: 0 30px 90px rgba(0, 0, 0, 0.30);

    position: relative;
    width: 100%;
    max-width: 1080px;
    overflow: hidden;
    border-radius: 30px;
    background:
      radial-gradient(circle at top right, rgba(255, 210, 30, 0.18), transparent 34%),
      var(--modal-bg);
    border: 1px solid var(--modal-border);
    box-shadow: var(--modal-shadow);
    color: var(--modal-text);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  .theme-dark .customer-details-modal {
    --modal-text: #F8FAFC;
    --modal-muted: rgba(255, 255, 255, 0.62);
    --modal-soft: rgba(255, 255, 255, 0.44);
    --modal-bg: rgba(8, 10, 18, 0.96);
    --modal-card-bg: rgba(255, 255, 255, 0.055);
    --modal-soft-bg: rgba(255, 255, 255, 0.055);
    --modal-border: rgba(255, 255, 255, 0.10);
    --modal-input-bg: rgba(255, 255, 255, 0.06);
    --modal-input-border: rgba(255, 255, 255, 0.11);
    --modal-shadow: 0 34px 96px rgba(0, 0, 0, 0.58);
  }

  .modal-bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.24;
    pointer-events: none;
  }

  .modal-glow {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }

  .modal-glow-one {
    width: 190px;
    height: 190px;
    top: -90px;
    right: -70px;
    background: rgba(255, 210, 30, 0.28);
    filter: blur(18px);
  }

  .modal-glow-two {
    width: 120px;
    height: 120px;
    left: -50px;
    bottom: -45px;
    background: rgba(255, 210, 30, 0.12);
    filter: blur(18px);
  }

  .customer-modal-header,
  .customer-modal-body {
    position: relative;
    z-index: 1;
  }

  .customer-modal-header {
    padding: 26px;
    border-bottom: 1px solid var(--modal-border);
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }

  .customer-modal-title {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    min-width: 0;
  }

  .customer-modal-icon {
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

  .modal-kicker,
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
    margin-bottom: 9px;
  }

  .theme-dark .modal-kicker,
  .theme-dark .section-label {
    color: #FFD21E;
  }

  .customer-modal-header h2 {
    margin: 0;
    color: var(--modal-text);
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.7px;
  }

  .customer-modal-header p {
    margin: 7px 0 0;
    color: var(--modal-muted);
    font-size: 13px;
    font-weight: 700;
  }

  .modal-close-btn {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    border: 1px solid var(--modal-input-border);
    background: var(--modal-input-bg);
    color: var(--modal-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s ease, color 0.18s ease;
    flex-shrink: 0;
  }

  .modal-close-btn:hover {
    transform: translateY(-2px);
    color: var(--modal-text);
  }

  .customer-modal-body {
    padding: 24px;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(220, 38, 38, 0.10);
    border: 1px solid rgba(220, 38, 38, 0.24);
    color: #DC2626;
    padding: 12px 14px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 800;
  }

  .theme-dark .error-box {
    color: #FCA5A5;
  }

  .profile-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 20px;
  }

  .summary-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--modal-border);
    border-radius: 22px;
    padding: 16px;
    background: var(--modal-card-bg);
    box-shadow: 0 14px 38px rgba(17, 24, 39, 0.06);
  }

  .theme-dark .summary-card {
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.22);
  }

  .summary-card::after {
    content: '';
    position: absolute;
    width: 92px;
    height: 92px;
    right: -45px;
    bottom: -45px;
    border-radius: 50%;
    background: rgba(255, 210, 30, 0.12);
    pointer-events: none;
  }

  .summary-icon {
    position: relative;
    z-index: 1;
    width: 40px;
    height: 40px;
    border-radius: 15px;
    background: rgba(255, 210, 30, 0.14);
    color: #D9A900;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .theme-dark .summary-icon {
    color: #FFD21E;
  }

  .summary-card span {
    position: relative;
    z-index: 1;
    display: block;
    color: var(--modal-muted);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.65px;
    margin-bottom: 6px;
  }

  .summary-card strong {
    position: relative;
    z-index: 1;
    display: block;
    color: var(--modal-text);
    font-size: 13px;
    font-weight: 900;
    word-break: break-word;
  }

  .section-card {
    border: 1px solid var(--modal-border);
    border-radius: 24px;
    padding: 20px;
    margin-bottom: 20px;
    background: var(--modal-card-bg);
    box-shadow: 0 14px 38px rgba(17, 24, 39, 0.06);
  }

  .theme-dark .section-card {
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.22);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .section-header h3 {
    margin: 0;
    color: var(--modal-text);
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.4px;
  }

  .header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .primary-btn,
  .secondary-btn {
    min-height: 42px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 15px;
    border: none;
    font-family: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .primary-btn {
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    box-shadow: 0 12px 28px rgba(255, 210, 30, 0.22);
  }

  .secondary-btn {
    background: var(--modal-input-bg);
    color: var(--modal-text);
    border: 1px solid var(--modal-input-border);
  }

  .primary-btn:hover,
  .secondary-btn:hover {
    transform: translateY(-2px);
  }

  .primary-btn:disabled,
  .secondary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .details-grid,
  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .detail-box {
    background: var(--modal-soft-bg);
    border: 1px solid var(--modal-border);
    border-radius: 18px;
    padding: 14px;
  }

  .detail-box span {
    display: block;
    color: var(--modal-muted);
    font-size: 11px;
    font-weight: 900;
    margin-bottom: 7px;
    text-transform: uppercase;
    letter-spacing: 0.55px;
  }

  .detail-box strong {
    display: block;
    color: var(--modal-text);
    font-size: 14px;
    font-weight: 900;
    word-break: break-word;
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
    background: rgba(22, 163, 74, 0.12);
    color: #16A34A;
    border-color: rgba(22, 163, 74, 0.24);
  }

  .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.12);
    color: #EA580C;
    border-color: rgba(234, 88, 12, 0.24);
  }

  .status-badge.status-inactive,
  .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.12);
    color: #DC2626;
    border-color: rgba(220, 38, 38, 0.24);
  }

  .theme-dark .status-badge.status-active {
    background: rgba(22, 163, 74, 0.16);
    color: #4ADE80;
    border-color: rgba(74, 222, 128, 0.28);
  }

  .theme-dark .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.16);
    color: #FDBA74;
    border-color: rgba(251, 186, 116, 0.28);
  }

  .theme-dark .status-badge.status-inactive,
  .theme-dark .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.16);
    color: #FCA5A5;
    border-color: rgba(252, 165, 165, 0.28);
  }

  .address-form {
    background: var(--modal-soft-bg);
    border: 1px solid var(--modal-border);
    border-radius: 22px;
    padding: 18px;
    margin-bottom: 18px;
  }

  .address-form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 18px;
  }

  .address-form-header h4 {
    margin: 0;
    color: var(--modal-text);
    font-family: 'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.4px;
  }

  .address-form-header p {
    margin: 5px 0 0;
    color: var(--modal-muted);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.6;
  }

  .form-close-btn {
    width: 38px;
    height: 38px;
    border: 1px solid var(--modal-input-border);
    border-radius: 13px;
    background: var(--modal-input-bg);
    color: var(--modal-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .form-group.full {
    grid-column: 1 / -1;
  }

  .form-group label {
    color: var(--modal-text);
    font-size: 12px;
    font-weight: 900;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    min-height: 44px;
    border: 1.5px solid var(--modal-input-border);
    border-radius: 14px;
    padding: 12px 13px;
    background: var(--modal-input-bg);
    color: var(--modal-text);
    font-size: 13px;
    font-weight: 750;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-group input::placeholder {
    color: var(--modal-soft);
  }

  .form-group input:focus,
  .form-group select:focus {
    border-color: rgba(255, 210, 30, 0.75);
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

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding-top: 27px;
    color: var(--modal-text);
    font-size: 13px;
    font-weight: 900;
  }

  .checkbox-row input {
    width: 16px;
    height: 16px;
    accent-color: #FFD21E;
  }

  .checkbox-row span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .address-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .address-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--modal-border);
    background: var(--modal-card-bg);
    border-radius: 20px;
    padding: 17px;
    transition: transform 0.18s ease, border-color 0.18s ease;
  }

  .address-card::after {
    content: '';
    position: absolute;
    width: 100px;
    height: 100px;
    right: -50px;
    bottom: -50px;
    border-radius: 50%;
    background: rgba(255, 210, 30, 0.12);
    pointer-events: none;
  }

  .address-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255, 210, 30, 0.38);
  }

  .address-top {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 12px;
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
    gap: 7px;
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

  .address-text {
    position: relative;
    z-index: 1;
    color: var(--modal-muted);
    line-height: 1.75;
    font-size: 13px;
    font-weight: 700;
  }

  .address-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 13px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s ease;
  }

  .icon-btn:hover {
    transform: translateY(-2px);
  }

  .edit-btn {
    background: rgba(255, 210, 30, 0.16);
    color: #D9A900;
  }

  .theme-dark .edit-btn {
    color: #FFD21E;
  }

  .delete-btn {
    background: rgba(220, 38, 38, 0.12);
    color: #DC2626;
  }

  .theme-dark .delete-btn {
    color: #FCA5A5;
  }

  .empty-box {
    min-height: 170px;
    border: 1px dashed var(--modal-border);
    border-radius: 20px;
    background: rgba(255, 210, 30, 0.045);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: left;
    padding: 24px;
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

  .empty-box h4 {
    margin: 0;
    color: var(--modal-text);
    font-size: 17px;
    font-weight: 900;
  }

  .empty-box p {
    margin: 7px 0 0;
    color: var(--modal-muted);
    font-size: 13px;
    font-weight: 700;
  }

  .spin {
    animation: modalSpin 1s linear infinite;
  }

  @keyframes modalSpin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 960px) {
    .profile-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .details-grid,
    .form-grid,
    .address-grid {
      grid-template-columns: 1fr;
    }

    .customer-modal-header,
    .section-header,
    .address-form-header {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      justify-content: stretch;
    }

    .header-actions .primary-btn,
    .header-actions .secondary-btn {
      flex: 1;
    }
  }

  @media (max-width: 620px) {
    .customer-modal-overlay {
      padding: 18px 12px;
    }

    .customer-details-modal {
      border-radius: 24px;
    }

    .customer-modal-header,
    .customer-modal-body {
      padding: 20px;
    }

    .customer-modal-title {
      flex-direction: column;
    }

    .profile-summary-grid {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .form-actions .primary-btn,
    .form-actions .secondary-btn {
      width: 100%;
    }

    .empty-box {
      flex-direction: column;
      text-align: center;
    }
  }
`;