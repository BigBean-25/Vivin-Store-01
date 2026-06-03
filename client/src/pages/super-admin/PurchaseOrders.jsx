import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  X,
  Trash2,
  Eye,
  CheckCircle2,
  PackagePlus,
  CalendarDays,
  IndianRupee,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";

const initialForm = {
  vendor_id: "",
  quotation_id: "",
  warehouse_id: "",
  po_date: new Date().toISOString().slice(0, 10),
  expected_delivery_date: "",
  status: "draft",
  remarks: "",
};

const emptyItem = {
  product_id: "",
  quantity: "",
  unit_price: "",
  tax_rate: 0,
};

const statusOptions = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "partially_received",
  "received",
  "cancelled",
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClass = (status) => {
  switch (status) {
    case "approved":
    case "sent":
    case "received":
      return "success";
    case "pending_approval":
    case "partially_received":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
};

const getArrayData = (response, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }

  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState(initialForm);
  const [items, setItems] = useState([{ ...emptyItem }]);

  const [showForm, setShowForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [viewModal, setViewModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.product_id &&
        Number(item.quantity || 0) > 0 &&
        Number(item.unit_price || 0) >= 0
    );
  }, [items]);

  const totals = useMemo(() => {
    return validItems.reduce(
      (acc, item) => {
        const qty = Number(item.quantity || 0);
        const price = Number(item.unit_price || 0);
        const taxRate = Number(item.tax_rate || 0);

        const lineSubtotal = qty * price;
        const lineTax = (lineSubtotal * taxRate) / 100;

        acc.subtotal += lineSubtotal;
        acc.tax_amount += lineTax;
        acc.total_amount += lineSubtotal + lineTax;

        return acc;
      },
      { subtotal: 0, tax_amount: 0, total_amount: 0 }
    );
  }, [validItems]);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        !search ||
        String(po.po_number || "").toLowerCase().includes(search) ||
        String(po.vendor_name || po.business_name || "")
          .toLowerCase()
          .includes(search) ||
        String(po.warehouse_name || "").toLowerCase().includes(search);

      const matchesStatus = !statusFilter || po.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  const fetchDropdownData = async () => {
    try {
      const [vendorRes, quotationRes, warehouseRes, productRes] = await Promise.allSettled([
        API.get("/api/vendors"),
        API.get("/api/quotations", { params: { status: "accepted" } }),
        API.get("/api/warehouses/active/list"),
        API.get("/api/products"),
      ]);

      if (vendorRes.status === "fulfilled") {
        setVendors(getArrayData(vendorRes.value, ["vendors"]));
      }

      if (quotationRes.status === "fulfilled") {
        setQuotations(getArrayData(quotationRes.value, ["quotations", "data"]));
      }

      if (warehouseRes.status === "fulfilled") {
        setWarehouses(getArrayData(warehouseRes.value, ["warehouses"]));
      }

      if (productRes.status === "fulfilled") {
        setProducts(getArrayData(productRes.value, ["products"]));
      }
    } catch (err) {
      console.error("Dropdown fetch error:", err);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const [listRes, summaryRes] = await Promise.allSettled([
        API.get("/api/purchase-orders"),
        API.get("/api/purchase-orders/summary"),
      ]);

      if (listRes.status === "fulfilled") {
        setPurchaseOrders(
          listRes.value.data.purchaseOrders ||
            listRes.value.data.purchase_orders ||
            listRes.value.data.data ||
            []
        );
      } else {
        throw listRes.reason;
      }

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value.data.summary || summaryRes.value.data.data || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchDropdownData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQuotationChange = async (e) => {
    const quotationId = e.target.value;

    setFormData((prev) => ({
      ...prev,
      quotation_id: quotationId,
    }));

    if (!quotationId) return;

    try {
      const res = await API.get(`/api/quotations/${quotationId}`);
      const quotation = res.data?.quotation || res.data?.data;

      if (!quotation) return;

      setFormData((prev) => ({
        ...prev,
        quotation_id: quotationId,
        vendor_id: quotation.vendor_id ? String(quotation.vendor_id) : prev.vendor_id,
        remarks: prev.remarks || `Created from quotation ${quotation.quotation_number || quotationId}`,
      }));

      if (Array.isArray(quotation.items) && quotation.items.length > 0) {
        setItems(
          quotation.items.map((item) => ({
            product_id: item.product_id ? String(item.product_id) : "",
            quantity: item.quantity || "",
            unit_price: item.unit_price || "",
            tax_rate: item.tax_rate || 0,
          }))
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load quotation details");
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeItem = (index) => {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const resetForm = () => {
    setFormData({
      ...initialForm,
      po_date: new Date().toISOString().slice(0, 10),
    });
    setItems([{ ...emptyItem }]);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      setError("Vendor is required");
      return;
    }

    if (!formData.po_date) {
      setError("PO date is required");
      return;
    }

    if (validItems.length === 0) {
      setError("At least one valid item is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...formData,
        vendor_id: Number(formData.vendor_id),
        quotation_id: formData.quotation_id ? Number(formData.quotation_id) : null,
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        items: validItems.map((item) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unit_price || 0);
          const taxRate = Number(item.tax_rate || 0);
          const subtotal = quantity * unitPrice;
          const taxAmount = (subtotal * taxRate) / 100;

          return {
            product_id: Number(item.product_id),
            quantity,
            unit_price: unitPrice,
            tax_rate: taxRate,
            total_amount: subtotal + taxAmount,
          };
        }),
      };

      const res = await API.post("/api/purchase-orders", payload);

      if (res.data.success) {
        resetForm();
        fetchPurchaseOrders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (id) => {
    try {
      setError("");

      const res = await API.get(`/api/purchase-orders/${id}`);

      setSelectedPO(
        res.data.purchaseOrder ||
          res.data.purchase_order ||
          res.data.data ||
          res.data
      );

      setViewModal(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch purchase order details");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      setError("");

      const res = await API.patch(`/api/purchase-orders/${id}/status`, {
        status,
      });

      if (res.data.success) {
        fetchPurchaseOrders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update PO status");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this purchase order?"
    );

    if (!confirmDelete) return;

    try {
      setError("");

      const res = await API.delete(`/api/purchase-orders/${id}`);

      if (res.data.success) {
        fetchPurchaseOrders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete purchase order");
    }
  };

  return (
    <AdminLayout>
      <div className="po-page">
        <div className="po-hero">
          <div>
            <p className="eyebrow">Procurement Management</p>
            <h1>Purchase Orders</h1>
            <p>
              Create vendor purchase orders, track approval status, and manage
              warehouse procurement from one place.
            </p>
          </div>

          <div className="hero-actions">
            <button type="button" className="secondary-btn" onClick={fetchPurchaseOrders}>
              <RefreshCw size={16} />
              Refresh
            </button>

            <button type="button" className="primary-btn" onClick={() => setShowForm(true)}>
              <Plus size={16} />
              New Purchase Order
            </button>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="summary-grid">
          <div className="summary-card">
            <span>Total PO</span>
            <strong>{summary?.total_purchase_orders || purchaseOrders.length}</strong>
          </div>

          <div className="summary-card">
            <span>Pending</span>
            <strong>
              {summary?.pending_count ||
                purchaseOrders.filter((po) => po.status === "pending_approval").length}
            </strong>
          </div>

          <div className="summary-card">
            <span>Approved</span>
            <strong>
              {summary?.approved_count ||
                purchaseOrders.filter((po) => po.status === "approved").length}
            </strong>
          </div>

          <div className="summary-card">
            <span>Total Value</span>
            <strong>{formatCurrency(summary?.total_amount || 0)}</strong>
          </div>
        </div>

        {showForm && (
          <div className="form-card">
            <div className="section-header">
              <div>
                <h2>Create Purchase Order</h2>
                <p>Add vendor, warehouse, and product item details.</p>
              </div>

              <button type="button" className="icon-btn" onClick={resetForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Accepted Quotation</label>
                  <select
                    name="quotation_id"
                    value={formData.quotation_id}
                    onChange={handleQuotationChange}
                  >
                    <option value="">Select Quotation</option>
                    {quotations.map((quotation) => (
                      <option key={quotation.id} value={quotation.id}>
                        {quotation.quotation_number || `QT-${quotation.id}`} - {quotation.vendor_name || `Vendor #${quotation.vendor_id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Vendor *</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.business_name || vendor.name || vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Warehouse</label>
                  <select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>PO Date *</label>
                  <input
                    type="date"
                    name="po_date"
                    value={formData.po_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    name="expected_delivery_date"
                    value={formData.expected_delivery_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group wide">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Enter PO remarks..."
                  />
                </div>
              </div>

              <div className="items-section">
                <div className="items-title">
                  <div>
                    <h3>Purchase Items</h3>
                    <p>Add products, quantity, price and tax.</p>
                  </div>

                  <button type="button" className="secondary-btn" onClick={addItem}>
                    <PackagePlus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="items-table">
                  <div className="items-head">
                    <span>Product</span>
                    <span>Qty</span>
                    <span>Unit Price</span>
                    <span>Tax %</span>
                    <span>Total</span>
                    <span></span>
                  </div>

                  {items.map((item, index) => {
                    const qty = Number(item.quantity || 0);
                    const price = Number(item.unit_price || 0);
                    const tax = Number(item.tax_rate || 0);
                    const rowTotal = qty * price * (1 + tax / 100);

                    return (
                      <div className="items-row" key={`${index}-${item.product_id}`}>
                        <select
                          value={item.product_id}
                          onChange={(e) =>
                            handleItemChange(index, "product_id", e.target.value)
                          }
                        >
                          <option value="">Select Product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} {product.sku ? `- ${product.sku}` : ""}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(index, "unit_price", e.target.value)
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Tax"
                          value={item.tax_rate}
                          onChange={(e) =>
                            handleItemChange(index, "tax_rate", e.target.value)
                          }
                        />

                        <strong>{formatCurrency(rowTotal)}</strong>

                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="totals-box">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatCurrency(totals.subtotal)}</strong>
                  </div>

                  <div>
                    <span>Tax</span>
                    <strong>{formatCurrency(totals.tax_amount)}</strong>
                  </div>

                  <div className="grand-total">
                    <span>Total</span>
                    <strong>{formatCurrency(totals.total_amount)}</strong>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={resetForm}>
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? "Saving..." : "Save Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="list-card">
          <div className="list-toolbar">
            <div>
              <h2>Purchase Order List</h2>
              <p>{filteredPurchaseOrders.length} records found</p>
            </div>

            <div className="filters">
              <div className="search-box">
                <Search size={16} />
                <input
                  placeholder="Search PO, vendor, warehouse..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading purchase orders...</div>
          ) : filteredPurchaseOrders.length === 0 ? (
            <div className="empty-state">No purchase orders found</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PO No</th>
                    <th>Vendor</th>
                    <th>Warehouse</th>
                    <th>PO Date</th>
                    <th>Delivery</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPurchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td>
                        <strong>{po.po_number || `PO-${po.id}`}</strong>
                      </td>
                      <td>{po.vendor_name || po.business_name || "-"}</td>
                      <td>{po.warehouse_name || "-"}</td>
                      <td>{formatDate(po.po_date)}</td>
                      <td>{formatDate(po.expected_delivery_date)}</td>
                      <td>{formatCurrency(po.total_amount)}</td>
                      <td>
                        <select
                          className={`status-select ${getStatusClass(po.status)}`}
                          value={po.status || "draft"}
                          onChange={(e) => handleStatusChange(po.id, e.target.value)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="view-btn"
                            onClick={() => handleView(po.id)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(po.id)}
                          >
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

        {viewModal && selectedPO && (
          <div className="modal-backdrop">
            <div className="po-modal">
              <div className="modal-header">
                <div>
                  <h2>{selectedPO.po_number || `PO-${selectedPO.id}`}</h2>
                  <p>Purchase order details</p>
                </div>

                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setViewModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-info-grid">
                <div>
                  <CalendarDays size={18} />
                  <span>PO Date</span>
                  <strong>{formatDate(selectedPO.po_date)}</strong>
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  <span>Status</span>
                  <strong>{selectedPO.status?.replaceAll("_", " ")}</strong>
                </div>

                <div>
                  <IndianRupee size={18} />
                  <span>Total Amount</span>
                  <strong>{formatCurrency(selectedPO.total_amount)}</strong>
                </div>
              </div>

              <div className="modal-section">
                <h3>Items</h3>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Tax</th>
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedPO.items || []).map((item) => (
                        <tr key={item.id || `${item.product_id}-${item.product_name}`}>
                          <td>{item.product_name || item.name || item.product_id}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{item.tax_rate || 0}%</td>
                          <td>{formatCurrency(item.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .po-page {
            display: flex;
            flex-direction: column;
            gap: 22px;
          }

          .po-hero,
          .form-card,
          .list-card {
            background: var(--admin-card-bg, #ffffff);
            border: 1px solid var(--admin-border, rgba(15, 23, 42, 0.08));
            border-radius: 24px;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
          }

          .po-hero {
            padding: 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 18px;
          }

          .eyebrow {
            margin: 0 0 8px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #c79a00;
          }

          .po-hero h1,
          .section-header h2,
          .list-toolbar h2 {
            margin: 0;
            color: var(--admin-text, #0f172a);
          }

          .po-hero p,
          .section-header p,
          .list-toolbar p,
          .items-title p {
            margin: 6px 0 0;
            color: var(--admin-muted, #64748b);
          }

          .hero-actions,
          .form-actions,
          .row-actions,
          .filters {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .primary-btn,
          .secondary-btn,
          .icon-btn,
          .view-btn,
          .delete-btn {
            border: 0;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 14px;
            font-weight: 800;
            transition: all 0.2s ease;
          }

          .primary-btn {
            padding: 12px 18px;
            background: linear-gradient(135deg, #ffd21e, #e7b900);
            color: #111827;
            box-shadow: 0 10px 22px rgba(231, 185, 0, 0.25);
          }

          .secondary-btn {
            padding: 12px 18px;
            background: rgba(148, 163, 184, 0.12);
            color: var(--admin-text, #0f172a);
            border: 1px solid rgba(148, 163, 184, 0.24);
          }

          .icon-btn,
          .view-btn,
          .delete-btn {
            width: 38px;
            height: 38px;
            background: rgba(148, 163, 184, 0.12);
            color: var(--admin-text, #0f172a);
          }

          .view-btn {
            color: #2563eb;
          }

          .delete-btn {
            color: #dc2626;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }

          .summary-card {
            padding: 20px;
            border-radius: 20px;
            background: var(--admin-card-bg, #ffffff);
            border: 1px solid var(--admin-border, rgba(15, 23, 42, 0.08));
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
          }

          .summary-card span {
            display: block;
            color: var(--admin-muted, #64748b);
            font-size: 13px;
            font-weight: 700;
          }

          .summary-card strong {
            display: block;
            margin-top: 8px;
            color: var(--admin-text, #0f172a);
            font-size: 24px;
          }

          .form-card,
          .list-card {
            padding: 24px;
          }

          .section-header,
          .list-toolbar,
          .items-title,
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 22px;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .form-group.wide {
            grid-column: span 2;
          }

          label {
            font-size: 13px;
            font-weight: 800;
            color: var(--admin-text, #0f172a);
          }

          input,
          select,
          textarea {
            width: 100%;
            border: 1px solid rgba(148, 163, 184, 0.32);
            border-radius: 14px;
            padding: 12px 14px;
            background: var(--admin-input-bg, #ffffff);
            color: var(--admin-text, #0f172a);
            outline: none;
          }

          textarea {
            min-height: 88px;
            resize: vertical;
          }

          .items-section {
            margin-top: 24px;
            padding: 18px;
            border-radius: 20px;
            background: rgba(148, 163, 184, 0.08);
            border: 1px solid rgba(148, 163, 184, 0.18);
          }

          .items-head,
          .items-row {
            display: grid;
            grid-template-columns: 2fr 0.8fr 1fr 0.8fr 1fr 48px;
            gap: 10px;
            align-items: center;
          }

          .items-head {
            padding: 10px 0;
            font-size: 12px;
            font-weight: 900;
            color: var(--admin-muted, #64748b);
            text-transform: uppercase;
          }

          .items-row {
            margin-bottom: 10px;
          }

          .items-row strong {
            color: var(--admin-text, #0f172a);
          }

          .totals-box {
            margin-top: 18px;
            margin-left: auto;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .totals-box div {
            display: flex;
            justify-content: space-between;
            color: var(--admin-text, #0f172a);
          }

          .grand-total {
            padding-top: 10px;
            border-top: 1px solid rgba(148, 163, 184, 0.32);
            font-size: 18px;
          }

          .form-actions {
            justify-content: flex-end;
            margin-top: 24px;
          }

          .search-box {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(148, 163, 184, 0.28);
            border-radius: 14px;
            padding: 0 12px;
            background: var(--admin-input-bg, #ffffff);
          }

          .search-box input {
            border: 0;
            padding-left: 0;
          }

          .table-wrap {
            overflow-x: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            text-align: left;
            padding: 14px 12px;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--admin-muted, #64748b);
            border-bottom: 1px solid rgba(148, 163, 184, 0.22);
          }

          td {
            padding: 14px 12px;
            color: var(--admin-text, #0f172a);
            border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          }

          .status-select {
            min-width: 150px;
            padding: 8px 10px;
            font-size: 12px;
            font-weight: 800;
          }

          .status-select.success {
            color: #15803d;
            background: rgba(34, 197, 94, 0.1);
          }

          .status-select.warning {
            color: #b45309;
            background: rgba(245, 158, 11, 0.12);
          }

          .status-select.danger {
            color: #b91c1c;
            background: rgba(239, 68, 68, 0.1);
          }

          .status-select.neutral {
            color: #475569;
            background: rgba(148, 163, 184, 0.12);
          }

          .error-box {
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(239, 68, 68, 0.1);
            color: #b91c1c;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
          }

          .error-box button {
            border: 0;
            background: transparent;
            color: inherit;
            cursor: pointer;
          }

          .empty-state {
            padding: 40px;
            text-align: center;
            color: var(--admin-muted, #64748b);
            font-weight: 700;
          }

          .modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 999;
            background: rgba(15, 23, 42, 0.58);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }

          .po-modal {
            width: min(920px, 100%);
            max-height: 90vh;
            overflow: auto;
            background: var(--admin-card-bg, #ffffff);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
          }

          .modal-info-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 24px;
          }

          .modal-info-grid div {
            padding: 16px;
            border-radius: 18px;
            background: rgba(148, 163, 184, 0.1);
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .modal-info-grid span {
            color: var(--admin-muted, #64748b);
            font-size: 13px;
            font-weight: 700;
          }

          .modal-info-grid strong {
            color: var(--admin-text, #0f172a);
          }

          .modal-section h3 {
            margin: 0 0 14px;
            color: var(--admin-text, #0f172a);
          }

          @media (max-width: 900px) {
            .po-hero,
            .section-header,
            .list-toolbar,
            .items-title {
              flex-direction: column;
            }

            .summary-grid,
            .form-grid,
            .modal-info-grid {
              grid-template-columns: 1fr;
            }

            .form-group.wide {
              grid-column: span 1;
            }

            .items-head {
              display: none;
            }

            .items-row {
              grid-template-columns: 1fr;
              padding: 14px;
              border-radius: 16px;
              background: rgba(148, 163, 184, 0.08);
            }

            .filters {
              width: 100%;
              flex-direction: column;
              align-items: stretch;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
};

export default PurchaseOrders;