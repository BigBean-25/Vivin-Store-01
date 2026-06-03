import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  RefreshCcw,
  Search,
  Plus,
  X,
  RotateCcw,
  CheckCircle2,
  Send,
  Ban,
  Trash2,
  Edit3,
  Eye,
  AlertCircle,
  ClipboardList,
  CalendarDays,
  Building2,
  FileText,
  Boxes,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const emptyItem = () => ({
  product_id: "",
  quantity: "",
  reason: "",
});

const defaultForm = {
  vendor_id: "",
  purchase_order_id: "",
  goods_receipt_id: "",
  return_date: today,
  reason: "",
  status: "draft",
  items: [emptyItem()],
};

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "closed", label: "Closed" },
];

const createStatusOptions = [
  { value: "draft", label: "Save as Draft" },
  { value: "approved", label: "Create & Approve" },
  { value: "sent", label: "Create & Send" },
  { value: "closed", label: "Create & Close Stock" },
];

const getArray = (res, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(res?.data?.[key])) return res.data[key];
  }

  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatNumber = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getStatusClass = (status) => {
  switch (status) {
    case "closed":
      return "status closed";
    case "sent":
      return "status sent";
    case "approved":
      return "status approved";
    default:
      return "status draft";
  }
};

export default function ProcurementReturns() {
  const [returns, setReturns] = useState([]);
  const [summary, setSummary] = useState({});
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [products, setProducts] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    vendor_id: "",
    purchase_order_id: "",
    goods_receipt_id: "",
    status: "",
  });

  const [form, setForm] = useState(defaultForm);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [editId, setEditId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const totalReturnQty = useMemo(() => {
    return form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [form.items]);

  const filteredPurchaseOrders = useMemo(() => {
    if (!form.vendor_id) return purchaseOrders;

    return purchaseOrders.filter(
      (po) => String(po.vendor_id) === String(form.vendor_id)
    );
  }, [form.vendor_id, purchaseOrders]);

  const filteredGoodsReceipts = useMemo(() => {
    return goodsReceipts.filter((grn) => {
      const vendorOk = form.vendor_id
        ? String(grn.vendor_id) === String(form.vendor_id)
        : true;

      const poOk = form.purchase_order_id
        ? String(grn.purchase_order_id) === String(form.purchase_order_id)
        : true;

      return vendorOk && poOk;
    });
  }, [form.vendor_id, form.purchase_order_id, goodsReceipts]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__procurementReturnTimer);
    window.__procurementReturnTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      setApiMissing(false);

      const params = {
        search: filters.search || undefined,
        vendor_id: filters.vendor_id || undefined,
        purchase_order_id: filters.purchase_order_id || undefined,
        goods_receipt_id: filters.goods_receipt_id || undefined,
        status: filters.status || undefined,
      };

      const [listRes, summaryRes] = await Promise.all([
        API.get("/api/procurement-returns", { params }),
        API.get("/api/procurement-returns/summary"),
      ]);

      setReturns(
        getArray(listRes, [
          "returns",
          "procurementReturns",
          "procurement_returns",
          "data",
        ])
      );

      setSummary(
        summaryRes.data?.summary ||
          summaryRes.data?.data ||
          summaryRes.data ||
          {}
      );
    } catch (error) {
      console.error("Fetch procurement returns error:", error);

      if (error.response?.status === 404) {
        setApiMissing(true);
        setReturns([]);
        setSummary({});
        return;
      }

      showMessage(
        "error",
        error.response?.data?.message || "Failed to load procurement returns"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const [vendorRes, poRes, grnRes, productRes] = await Promise.allSettled([
        API.get("/api/vendors"),
        API.get("/api/purchase-orders"),
        API.get("/api/goods-receipts"),
        API.get("/api/products"),
      ]);

      if (vendorRes.status === "fulfilled") {
        setVendors(
          getArray(vendorRes.value, [
            "vendors",
            "data",
            "vendorList",
            "vendor_list",
          ])
        );
      }

      if (poRes.status === "fulfilled") {
        setPurchaseOrders(
          getArray(poRes.value, [
            "purchaseOrders",
            "purchase_orders",
            "data",
            "orders",
          ])
        );
      }

      if (grnRes.status === "fulfilled") {
        setGoodsReceipts(
          getArray(grnRes.value, [
            "goodsReceipts",
            "goods_receipts",
            "receipts",
            "data",
          ])
        );
      }

      if (productRes.status === "fulfilled") {
        setProducts(
          getArray(productRes.value, [
            "products",
            "data",
            "productList",
            "product_list",
          ])
        );
      }
    } catch (error) {
      console.error("Fetch dropdowns error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to load dropdown data"
      );
    } finally {
      setDropdownLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const resetForm = () => {
    setForm({
      ...defaultForm,
      return_date: today,
      items: [emptyItem()],
    });
    setEditId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "vendor_id") {
      setForm((prev) => ({
        ...prev,
        vendor_id: value,
        purchase_order_id: "",
        goods_receipt_id: "",
      }));
    }

    if (name === "purchase_order_id") {
      setForm((prev) => ({
        ...prev,
        purchase_order_id: value,
        goods_receipt_id: "",
      }));
    }
  };

  const handlePurchaseOrderSelect = (purchaseOrderId) => {
    const po = purchaseOrders.find(
      (item) => String(item.id) === String(purchaseOrderId)
    );

    setForm((prev) => ({
      ...prev,
      purchase_order_id: purchaseOrderId,
      goods_receipt_id: "",
      vendor_id: po?.vendor_id || prev.vendor_id,
    }));
  };

  const handleGoodsReceiptSelect = async (goodsReceiptId) => {
    const grn = goodsReceipts.find(
      (item) => String(item.id) === String(goodsReceiptId)
    );

    setForm((prev) => ({
      ...prev,
      goods_receipt_id: goodsReceiptId,
      vendor_id: grn?.vendor_id || prev.vendor_id,
      purchase_order_id: grn?.purchase_order_id || prev.purchase_order_id,
    }));

    if (!goodsReceiptId) return;

    try {
      const res = await API.get(`/api/goods-receipts/${goodsReceiptId}`);

      const data =
        res.data?.goodsReceipt ||
        res.data?.goods_receipt ||
        res.data?.data ||
        res.data;

      const items = Array.isArray(data?.items) ? data.items : [];

      if (items.length > 0) {
        setForm((prev) => ({
          ...prev,
          goods_receipt_id: goodsReceiptId,
          vendor_id: data.vendor_id || prev.vendor_id,
          purchase_order_id: data.purchase_order_id || prev.purchase_order_id,
          items: items.map((item) => ({
            product_id: item.product_id || "",
            quantity: "",
            reason: "Damaged / wrong / excess material",
          })),
        }));
      }
    } catch (error) {
      console.error("GRN details fetch error:", error);
    }
  };

  const handleItemChange = (index, name, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        [name]: value,
      };

      return {
        ...prev,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;

      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const validateForm = () => {
    if (!form.vendor_id) return "Vendor is required";
    if (!form.return_date) return "Return date is required";
    if (!form.reason) return "Main return reason is required";

    if (!Array.isArray(form.items) || form.items.length === 0) {
      return "At least one return item is required";
    }

    for (let index = 0; index < form.items.length; index += 1) {
      const item = form.items[index];

      if (!item.product_id) return `Product is required in item ${index + 1}`;

      if (!item.quantity || Number(item.quantity) <= 0) {
        return `Return quantity must be greater than 0 in item ${index + 1}`;
      }
    }

    return "";
  };

  const buildPayload = () => ({
    vendor_id: form.vendor_id,
    purchase_order_id: form.purchase_order_id || null,
    goods_receipt_id: form.goods_receipt_id || null,
    return_date: form.return_date,
    reason: form.reason || null,
    status: form.status || "draft",
    items: form.items.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity || 0),
      reason: item.reason || null,
    })),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      showMessage("error", validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();

      const res = editId
        ? await API.put(`/api/procurement-returns/${editId}`, payload)
        : await API.post("/api/procurement-returns", payload);

      showMessage(
        "success",
        res.data?.message ||
          (editId
            ? "Procurement return updated successfully"
            : "Procurement return created successfully")
      );

      closeModal();
      fetchReturns();
    } catch (error) {
      console.error("Save procurement return error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to save procurement return"
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (item) => {
    try {
      setSaving(true);

      const res = await API.get(`/api/procurement-returns/${item.id}`);

      const data =
        res.data?.procurementReturn ||
        res.data?.procurement_return ||
        res.data?.data ||
        item;

      setEditId(data.id);
      setForm({
        vendor_id: data.vendor_id || "",
        purchase_order_id: data.purchase_order_id || "",
        goods_receipt_id: data.goods_receipt_id || "",
        return_date: data.return_date ? String(data.return_date).slice(0, 10) : today,
        reason: data.reason || "",
        status: data.status || "draft",
        items: Array.isArray(data.items) && data.items.length
          ? data.items.map((row) => ({
              product_id: row.product_id || "",
              quantity: row.quantity || "",
              reason: row.reason || "",
            }))
          : [emptyItem()],
      });

      setModalOpen(true);
    } catch (error) {
      console.error("Open edit procurement return error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to open procurement return"
      );
    } finally {
      setSaving(false);
    }
  };

  const openView = async (id) => {
    try {
      setSaving(true);

      const res = await API.get(`/api/procurement-returns/${id}`);

      const data =
        res.data?.procurementReturn ||
        res.data?.procurement_return ||
        res.data?.data ||
        res.data;

      setSelectedReturn(data);
      setViewOpen(true);
    } catch (error) {
      console.error("View procurement return error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to open procurement return"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    const ok = window.confirm(
      status === "closed"
        ? "Are you sure you want to close this return? Stock will be deducted."
        : `Are you sure you want to mark as ${status}?`
    );

    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.patch(`/api/procurement-returns/${id}/status`, {
        status,
      });

      showMessage(
        "success",
        res.data?.message || "Procurement return status updated successfully"
      );

      fetchReturns();
    } catch (error) {
      console.error("Update procurement return status error:", error);
      showMessage(
        "error",
        error.response?.data?.message ||
          "Failed to update procurement return status"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteReturn = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this return?");

    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.delete(`/api/procurement-returns/${id}`);

      showMessage(
        "success",
        res.data?.message || "Procurement return deleted successfully"
      );

      fetchReturns();
    } catch (error) {
      console.error("Delete procurement return error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete procurement return"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="return-page">
        <style>{css}</style>

        <div className="page-head">
          <div>
            <div className="eyebrow">
              <RotateCcw size={15} />
              Procurement Module
            </div>

            <h1>Purchase Returns</h1>

            <p>
              Create vendor material returns against PO or GRN, track return
              status, and deduct stock when return is closed.
            </p>
          </div>

          <div className="head-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={fetchReturns}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={openCreateModal}
              disabled={apiMissing}
            >
              <Plus size={17} />
              New Return
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle2 size={17} />
            ) : (
              <AlertCircle size={17} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {apiMissing && (
          <div className="message error">
            <AlertCircle size={17} />
            <span>
              Procurement Returns backend route is not connected yet. Add backend
              route /api/procurement-returns and restart server.
            </span>
          </div>
        )}

        <div className="summary-grid">
          <SummaryCard
            icon={RotateCcw}
            label="Total Returns"
            value={summary.total_returns || returns.length || 0}
          />

          <SummaryCard
            icon={CheckCircle2}
            label="Approved"
            value={summary.approved_count || 0}
          />

          <SummaryCard
            icon={Send}
            label="Sent"
            value={summary.sent_count || 0}
          />

          <SummaryCard
            icon={Boxes}
            label="Return Qty"
            value={formatNumber(summary.total_return_qty || 0)}
          />
        </div>

        <div className="filter-card">
          <div className="search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search return no, vendor, PO, GRN, reason..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          <select
            value={filters.vendor_id}
            onChange={(e) => handleFilterChange("vendor_id", e.target.value)}
          >
            <option value="">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.business_name || vendor.name || vendor.vendor_name}
              </option>
            ))}
          </select>

          <select
            value={filters.purchase_order_id}
            onChange={(e) =>
              handleFilterChange("purchase_order_id", e.target.value)
            }
          >
            <option value="">All Purchase Orders</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.po_number || `PO-${po.id}`}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Return List</h2>
              <p>
                {loading
                  ? "Loading returns..."
                  : `${returns.length} return record(s) found`}
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Return No</th>
                  <th>Vendor</th>
                  <th>PO No</th>
                  <th>GRN No</th>
                  <th>Return Date</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      Loading procurement returns...
                    </td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      No procurement returns found
                    </td>
                  </tr>
                ) : (
                  returns.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.return_number || `PR-${item.id}`}</strong>
                      </td>
                      <td>{item.vendor_name || "-"}</td>
                      <td>{item.po_number || "-"}</td>
                      <td>{item.grn_number || "-"}</td>
                      <td>{formatDate(item.return_date)}</td>
                      <td>
                        <span className="qty-pill">
                          {formatNumber(item.total_return_qty || 0)}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusClass(item.status)}>
                          {item.status || "draft"}
                        </span>
                      </td>
                      <td className="right">
                        <div className="action-row">
                          <button
                            type="button"
                            className="icon-btn"
                            title="View"
                            onClick={() => openView(item.id)}
                          >
                            <Eye size={15} />
                          </button>

                          {item.status !== "closed" && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Edit"
                              onClick={() => openEdit(item)}
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {item.status === "draft" && (
                            <button
                              type="button"
                              className="icon-btn success"
                              title="Approve"
                              onClick={() => updateStatus(item.id, "approved")}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}

                          {item.status === "approved" && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Mark Sent"
                              onClick={() => updateStatus(item.id, "sent")}
                            >
                              <Send size={15} />
                            </button>
                          )}

                          {item.status !== "closed" && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Close & Deduct Stock"
                              onClick={() => updateStatus(item.id, "closed")}
                            >
                              <Ban size={15} />
                            </button>
                          )}

                          {item.status !== "closed" && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Delete"
                              onClick={() => deleteReturn(item.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card large">
              <div className="modal-head">
                <div>
                  <h2>{editId ? "Edit Purchase Return" : "Create Purchase Return"}</h2>
                  <p>
                    Select vendor, PO/GRN and add return item quantity with
                    reason.
                  </p>
                </div>

                <button type="button" className="close-btn" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label>Vendor *</label>
                    <select
                      value={form.vendor_id}
                      onChange={(e) => handleFormChange("vendor_id", e.target.value)}
                      required
                      disabled={dropdownLoading}
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.business_name || vendor.name || vendor.vendor_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Purchase Order</label>
                    <select
                      value={form.purchase_order_id}
                      onChange={(e) => handlePurchaseOrderSelect(e.target.value)}
                      disabled={dropdownLoading}
                    >
                      <option value="">Without PO</option>
                      {filteredPurchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_number || `PO-${po.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Goods Receipt / GRN</label>
                    <select
                      value={form.goods_receipt_id}
                      onChange={(e) => handleGoodsReceiptSelect(e.target.value)}
                      disabled={dropdownLoading}
                    >
                      <option value="">Without GRN</option>
                      {filteredGoodsReceipts.map((grn) => (
                        <option key={grn.id} value={grn.id}>
                          {grn.grn_number || `GRN-${grn.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Return Date *</label>
                    <input
                      type="date"
                      value={form.return_date}
                      onChange={(e) =>
                        handleFormChange("return_date", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => handleFormChange("status", e.target.value)}
                    >
                      {createStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field main-reason">
                  <label>Main Return Reason *</label>
                  <textarea
                    rows="3"
                    value={form.reason}
                    onChange={(e) => handleFormChange("reason", e.target.value)}
                    placeholder="Damaged material / wrong item / excess quantity / quality issue..."
                    required
                  />
                </div>

                <div className="items-section">
                  <div className="items-head">
                    <div>
                      <h3>Return Items</h3>
                      <p>Total return quantity: {formatNumber(totalReturnQty)}</p>
                    </div>

                    <button type="button" className="mini-btn" onClick={addItem}>
                      <Plus size={15} />
                      Add Item
                    </button>
                  </div>

                  <div className="items-list">
                    {form.items.map((item, index) => (
                      <div className="item-card" key={`${index}-${item.product_id}`}>
                        <div className="item-title">
                          <strong>Item {index + 1}</strong>

                          {form.items.length > 1 && (
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => removeItem(index)}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>

                        <div className="item-grid">
                          <div className="field">
                            <label>Product *</label>
                            <select
                              value={item.product_id}
                              onChange={(e) =>
                                handleItemChange(index, "product_id", e.target.value)
                              }
                              required
                              disabled={dropdownLoading}
                            >
                              <option value="">Select Product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name ||
                                    product.product_name ||
                                    product.title}{" "}
                                  {product.sku ? `(${product.sku})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="field">
                            <label>Return Qty *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(index, "quantity", e.target.value)
                              }
                              placeholder="0"
                              required
                            />
                          </div>

                          <div className="field">
                            <label>Item Reason</label>
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) =>
                                handleItemChange(index, "reason", e.target.value)
                              }
                              placeholder="Damaged / wrong item"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn secondary" onClick={closeModal}>
                    Cancel
                  </button>

                  <button type="submit" className="btn primary" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : editId
                      ? "Update Return"
                      : "Save Return"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewOpen && selectedReturn && (
          <div className="modal-backdrop">
            <div className="modal-card large">
              <div className="modal-head">
                <div>
                  <h2>{selectedReturn.return_number || "Return Details"}</h2>
                  <p>
                    {selectedReturn.vendor_name || "-"} ·{" "}
                    {selectedReturn.status || "draft"}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setViewOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="detail-grid">
                <Detail icon={Building2} label="Vendor" value={selectedReturn.vendor_name || "-"} />
                <Detail icon={ClipboardList} label="PO Number" value={selectedReturn.po_number || "-"} />
                <Detail icon={FileText} label="GRN Number" value={selectedReturn.grn_number || "-"} />
                <Detail icon={CalendarDays} label="Return Date" value={formatDate(selectedReturn.return_date)} />
                <Detail icon={CheckCircle2} label="Status" value={selectedReturn.status || "-"} />
              </div>

              {selectedReturn.reason && (
                <div className="remarks-box">
                  <strong>Main Reason</strong>
                  <p>{selectedReturn.reason}</p>
                </div>
              )}

              <div className="table-card inner">
                <div className="table-head">
                  <div>
                    <h2>Return Items</h2>
                    <p>Products returned to vendor</p>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Product Code</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Reason</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedReturn.items?.length ? (
                        selectedReturn.items.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <strong>
                                {row.product_name || `Product #${row.product_id}`}
                              </strong>
                            </td>
                            <td>{row.product_code || "-"}</td>
                            <td>{row.sku || "-"}</td>
                            <td>
                              <span className="qty-pill">
                                {formatNumber(row.quantity)}
                              </span>
                            </td>
                            <td>{row.reason || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="empty">
                            No return items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-icon">
        <Icon size={20} />
      </div>

      <div>
        <p>{label}</p>
        <h3>{value}</h3>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="detail-card">
      <Icon size={17} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

const css = `
  .return-page {
    min-height: 100vh;
    padding: 26px;
    color: #111827;
  }

  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 22px;
    margin-bottom: 20px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 210, 30, 0.16);
    color: #8a6b00;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  .page-head h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1.08;
    font-weight: 900;
    letter-spacing: -1px;
    color: #0b0d12;
  }

  .page-head p {
    margin: 10px 0 0;
    max-width: 740px;
    color: #6b7280;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.7;
  }

  .head-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn {
    height: 42px;
    padding: 0 15px;
    border: none;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
    white-space: nowrap;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }

  .btn.primary {
    background: linear-gradient(135deg, #ffd21e, #e7b900);
    color: #111827;
    box-shadow: 0 14px 28px rgba(231, 185, 0, 0.28);
  }

  .btn.secondary {
    background: #ffffff;
    color: #111827;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  }

  .message {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 850;
  }

  .message.success {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
  }

  .message.error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .summary-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 22px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
  }

  .summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111827;
    color: #ffd21e;
    flex-shrink: 0;
  }

  .summary-card p {
    margin: 0;
    color: #7b8190;
    font-size: 12px;
    font-weight: 850;
  }

  .summary-card h3 {
    margin: 5px 0 0;
    color: #0b0d12;
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.5px;
  }

  .filter-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 22px;
    padding: 14px;
    display: grid;
    grid-template-columns: 1.5fr 0.8fr 0.9fr 0.6fr;
    gap: 12px;
    margin-bottom: 18px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.055);
  }

  .search-box {
    height: 44px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 15px;
    padding: 0 13px;
  }

  .search-box input,
  .filter-card select,
  .field input,
  .field select,
  .field textarea {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: #111827;
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .filter-card select,
  .field input,
  .field select,
  .field textarea {
    height: 44px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 15px;
    padding: 0 12px;
  }

  .field textarea {
    height: auto;
    min-height: 92px;
    resize: vertical;
    padding-top: 12px;
  }

  .table-card {
    background: #ffffff;
    border: 1px solid #edf0f4;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.065);
  }

  .table-card.inner {
    box-shadow: none;
    margin: 18px 24px 24px;
  }

  .table-head {
    padding: 18px 20px;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .table-head h2 {
    margin: 0;
    color: #0b0d12;
    font-size: 18px;
    font-weight: 950;
  }

  .table-head p {
    margin: 4px 0 0;
    color: #7b8190;
    font-size: 12px;
    font-weight: 750;
  }

  .table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 980px;
  }

  th {
    background: #f8fafc;
    color: #6b7280;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.55px;
    text-align: left;
    padding: 14px 16px;
    border-bottom: 1px solid #edf0f4;
  }

  td {
    padding: 15px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #374151;
    font-size: 13px;
    font-weight: 700;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  td strong {
    color: #111827;
    font-weight: 950;
  }

  .right {
    text-align: right;
  }

  .empty {
    text-align: center;
    color: #9ca3af;
    padding: 34px 16px;
    font-weight: 850;
  }

  .qty-pill,
  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .qty-pill {
    background: #f3f4f6;
    color: #111827;
  }

  .status.closed {
    background: #ecfdf5;
    color: #047857;
  }

  .status.sent {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .status.approved {
    background: #fefce8;
    color: #a16207;
  }

  .status.draft {
    background: #fff7ed;
    color: #c2410c;
  }

  .action-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 11px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #111827;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-btn:hover {
    background: #111827;
    color: #ffd21e;
  }

  .icon-btn.success:hover {
    background: #047857;
    color: #ffffff;
  }

  .icon-btn.danger:hover {
    background: #b91c1c;
    color: #ffffff;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(7, 8, 11, 0.62);
    backdrop-filter: blur(7px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .modal-card {
    width: 100%;
    max-height: 92vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,0.35);
    box-shadow: 0 38px 120px rgba(0,0,0,0.35);
  }

  .modal-card.large {
    max-width: 1100px;
  }

  .modal-head {
    padding: 22px 24px;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .modal-head h2 {
    margin: 0;
    color: #0b0d12;
    font-size: 23px;
    font-weight: 950;
    letter-spacing: -0.5px;
  }

  .modal-head p {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 13px;
    font-weight: 700;
  }

  .close-btn {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #111827;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-card form {
    padding: 22px 24px 24px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .field label {
    display: block;
    margin-bottom: 8px;
    color: #6b7280;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .main-reason {
    margin-top: 14px;
  }

  .items-section {
    margin-top: 20px;
    border: 1px solid #edf0f4;
    border-radius: 22px;
    overflow: hidden;
  }

  .items-head {
    padding: 16px;
    background: #f8fafc;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .items-head h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 950;
    color: #111827;
  }

  .items-head p {
    margin: 4px 0 0;
    color: #7b8190;
    font-size: 12px;
    font-weight: 750;
  }

  .mini-btn {
    height: 36px;
    border: none;
    border-radius: 13px;
    background: #111827;
    color: #ffd21e;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .items-list {
    padding: 14px;
    display: grid;
    gap: 12px;
  }

  .item-card {
    border: 1px solid #edf0f4;
    border-radius: 19px;
    padding: 14px;
    background: #ffffff;
  }

  .item-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .item-title strong {
    color: #111827;
    font-size: 13px;
    font-weight: 950;
  }

  .remove-btn {
    width: 30px;
    height: 30px;
    border-radius: 11px;
    border: none;
    background: #fef2f2;
    color: #b91c1c;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-grid {
    display: grid;
    grid-template-columns: 1.5fr 0.6fr 1.3fr;
    gap: 12px;
  }

  .modal-actions {
    margin-top: 22px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .detail-grid {
    padding: 20px 24px 2px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .detail-card {
    background: #f8fafc;
    border: 1px solid #edf0f4;
    border-radius: 18px;
    padding: 14px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .detail-card svg {
    color: #d5a900;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .detail-card span {
    display: block;
    color: #7b8190;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-card strong {
    display: block;
    margin-top: 3px;
    color: #111827;
    font-size: 13px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .remarks-box {
    margin: 18px 24px 0;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #edf0f4;
    padding: 15px;
  }

  .remarks-box strong {
    color: #111827;
    font-size: 13px;
    font-weight: 950;
  }

  .remarks-box p {
    margin: 6px 0 0;
    color: #4b5563;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.7;
  }

  @media (max-width: 1100px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filter-card {
      grid-template-columns: 1fr 1fr;
    }

    .form-grid,
    .detail-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .item-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .return-page {
      padding: 18px;
    }

    .page-head {
      flex-direction: column;
    }

    .head-actions {
      width: 100%;
    }

    .head-actions .btn {
      flex: 1;
    }

    .summary-grid,
    .filter-card,
    .form-grid,
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .modal-backdrop {
      padding: 12px;
    }

    .modal-head,
    .modal-card form {
      padding: 18px;
    }
  }
`;
