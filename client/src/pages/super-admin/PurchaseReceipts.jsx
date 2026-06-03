import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  RefreshCcw,
  Search,
  Plus,
  X,
  CheckCircle2,
  Send,
  Ban,
  PackageCheck,
  ClipboardList,
  Warehouse,
  Truck,
  CalendarDays,
  FileText,
  IndianRupee,
  Boxes,
  AlertCircle,
  Eye,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const emptyItem = () => ({
  product_id: "",
  batch_no: "",
  expiry_date: "",
  received_qty: "",
  accepted_qty: "",
  rejected_qty: "0",
  unit_price: "",
});

const defaultForm = {
  purchase_order_id: "",
  vendor_id: "",
  warehouse_id: "",
  receipt_date: today,
  invoice_number: "",
  status: "posted",
  remarks: "",
  items: [emptyItem()],
};

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "verified", label: "Verified" },
  { value: "posted", label: "Posted" },
  { value: "cancelled", label: "Cancelled" },
];

const createStatusOptions = [
  { value: "posted", label: "Create & Post Stock" },
  { value: "draft", label: "Save as Draft" },
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

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const getStatusClass = (status) => {
  switch (status) {
    case "posted":
      return "status posted";
    case "verified":
      return "status verified";
    case "cancelled":
      return "status cancelled";
    default:
      return "status draft";
  }
};

export default function PurchaseReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState({});
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    vendor_id: "",
    warehouse_id: "",
  });

  const [form, setForm] = useState(defaultForm);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const formTotals = useMemo(() => {
    return form.items.reduce(
      (acc, item) => {
        const received = Number(item.received_qty || 0);
        const accepted = Number(item.accepted_qty || 0);
        const rejected = Number(item.rejected_qty || 0);
        const price = Number(item.unit_price || 0);

        acc.receivedQty += received;
        acc.acceptedQty += accepted;
        acc.rejectedQty += rejected;
        acc.totalAmount += accepted * price;

        return acc;
      },
      {
        receivedQty: 0,
        acceptedQty: 0,
        rejectedQty: 0,
        totalAmount: 0,
      }
    );
  }, [form.items]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.clearTimeout(window.__grnMessageTimer);
    window.__grnMessageTimer = window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3500);
  };

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        search: filters.search || undefined,
        status: filters.status || undefined,
        vendor_id: filters.vendor_id || undefined,
        warehouse_id: filters.warehouse_id || undefined,
      };

      const [listRes, summaryRes] = await Promise.all([
        API.get("/api/goods-receipts", { params }),
        API.get("/api/goods-receipts/summary"),
      ]);

      setReceipts(
        getArray(listRes, ["goodsReceipts", "goods_receipts", "data", "receipts"])
      );

      setSummary(
        summaryRes.data?.summary ||
          summaryRes.data?.data ||
          summaryRes.data ||
          {}
      );
    } catch (error) {
      console.error("Fetch goods receipts error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to load purchase receipts"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const [poRes, vendorRes, warehouseRes, productRes] = await Promise.all([
        API.get("/api/purchase-orders"),
        API.get("/api/vendors"),
        API.get("/api/warehouses/active/list"),
        API.get("/api/products"),
      ]);

      setPurchaseOrders(
        getArray(poRes, [
          "purchaseOrders",
          "purchase_orders",
          "data",
          "orders",
          "purchaseorders",
        ]).filter(
          (po) =>
            !["draft", "cancelled", "received"].includes(
              String(po.status || "").toLowerCase()
            )
        )
      );

      setVendors(
        getArray(vendorRes, ["vendors", "data", "vendorList", "vendor_list"])
      );

      setWarehouses(
        getArray(warehouseRes, [
          "warehouses",
          "data",
          "warehouseList",
          "warehouse_list",
        ])
      );

      setProducts(
        getArray(productRes, ["products", "data", "productList", "product_list"])
      );
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
    fetchReceipts();
  }, [fetchReceipts]);

  const resetForm = () => {
    setForm({
      ...defaultForm,
      receipt_date: today,
      items: [emptyItem()],
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeCreateModal = () => {
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
  };

  const handleItemChange = (index, name, value) => {
    setForm((prev) => {
      const nextItems = [...prev.items];
      const nextItem = {
        ...nextItems[index],
        [name]: value,
      };

      if (name === "received_qty" || name === "rejected_qty") {
        const received = Number(
          name === "received_qty" ? value : nextItem.received_qty || 0
        );
        const rejected = Number(
          name === "rejected_qty" ? value : nextItem.rejected_qty || 0
        );

        nextItem.accepted_qty = String(Math.max(received - rejected, 0));
      }

      nextItems[index] = nextItem;

      return {
        ...prev,
        items: nextItems,
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

  const handlePurchaseOrderSelect = async (purchaseOrderId) => {
    handleFormChange("purchase_order_id", purchaseOrderId);

    if (!purchaseOrderId) return;

    const poFromList = purchaseOrders.find(
      (po) => String(po.id) === String(purchaseOrderId)
    );

    if (poFromList) {
      setForm((prev) => ({
        ...prev,
        purchase_order_id: purchaseOrderId,
        vendor_id: poFromList.vendor_id || prev.vendor_id,
        warehouse_id: poFromList.warehouse_id || prev.warehouse_id,
      }));
    }

    try {
      const res = await API.get(`/api/purchase-orders/${purchaseOrderId}`);
      const po =
        res.data?.purchaseOrder ||
        res.data?.purchase_order ||
        res.data?.data ||
        res.data;

      const poItems = Array.isArray(po?.items) ? po.items : [];

      if (poItems.length > 0) {
        const mappedItems = poItems.map((item) => {
          const orderedQty = Number(item.quantity || 0);
          const receivedQty = Number(item.received_quantity || 0);
          const pendingQty = Math.max(orderedQty - receivedQty, 0);

          return {
            product_id: item.product_id || "",
            batch_no: "",
            expiry_date: "",
            received_qty: String(pendingQty || orderedQty || ""),
            accepted_qty: String(pendingQty || orderedQty || ""),
            rejected_qty: "0",
            unit_price: String(item.unit_price || item.price || ""),
          };
        });

        setForm((prev) => ({
          ...prev,
          purchase_order_id: purchaseOrderId,
          vendor_id: po.vendor_id || prev.vendor_id,
          warehouse_id: po.warehouse_id || prev.warehouse_id,
          items: mappedItems.length ? mappedItems : prev.items,
        }));
      }
    } catch (error) {
      console.error("Fetch purchase order details error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to load PO items"
      );
    }
  };

  const validateForm = () => {
    if (!form.vendor_id) return "Vendor is required";
    if (!form.warehouse_id) return "Warehouse is required";
    if (!form.receipt_date) return "Receipt date is required";

    if (!form.items.length) return "At least one item is required";

    for (let index = 0; index < form.items.length; index += 1) {
      const item = form.items[index];

      if (!item.product_id) return `Product is required in item ${index + 1}`;

      const receivedQty = Number(item.received_qty || 0);
      const acceptedQty = Number(item.accepted_qty || 0);
      const rejectedQty = Number(item.rejected_qty || 0);

      if (receivedQty <= 0) {
        return `Received quantity must be greater than 0 in item ${index + 1}`;
      }

      if (acceptedQty < 0 || rejectedQty < 0) {
        return `Accepted / rejected quantity cannot be negative in item ${
          index + 1
        }`;
      }

      if (acceptedQty + rejectedQty > receivedQty) {
        return `Accepted + rejected quantity cannot exceed received quantity in item ${
          index + 1
        }`;
      }
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      showMessage("error", validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        purchase_order_id: form.purchase_order_id || null,
        vendor_id: form.vendor_id,
        warehouse_id: form.warehouse_id,
        receipt_date: form.receipt_date,
        invoice_number: form.invoice_number || null,
        status: form.status,
        remarks: form.remarks || null,
        items: form.items.map((item) => ({
          product_id: item.product_id,
          batch_no: item.batch_no || null,
          expiry_date: item.expiry_date || null,
          received_qty: Number(item.received_qty || 0),
          accepted_qty: Number(item.accepted_qty || 0),
          rejected_qty: Number(item.rejected_qty || 0),
          unit_price: Number(item.unit_price || 0),
        })),
      };

      const res = await API.post("/api/goods-receipts", payload);

      showMessage(
        "success",
        res.data?.message || "Purchase receipt created successfully"
      );

      closeCreateModal();
      fetchReceipts();
    } catch (error) {
      console.error("Create goods receipt error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to create purchase receipt"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (receiptId, action) => {
    const labels = {
      verify: "verify this receipt",
      post: "post this receipt and update stock",
      cancel: "cancel this receipt",
    };

    const ok = window.confirm(`Are you sure you want to ${labels[action]}?`);

    if (!ok) return;

    try {
      setSaving(true);

      const res = await API.patch(`/api/goods-receipts/${receiptId}/${action}`);

      showMessage(
        "success",
        res.data?.message || "Receipt updated successfully"
      );

      fetchReceipts();
    } catch (error) {
      console.error("Receipt action error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to update receipt"
      );
    } finally {
      setSaving(false);
    }
  };

  const openViewReceipt = async (receiptId) => {
    try {
      setSaving(true);

      const res = await API.get(`/api/goods-receipts/${receiptId}`);

      const receipt =
        res.data?.goodsReceipt ||
        res.data?.goods_receipt ||
        res.data?.data ||
        res.data;

      setSelectedReceipt(receipt);
      setViewOpen(true);
    } catch (error) {
      console.error("View receipt error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to open receipt"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="grn-page">
        <style>{css}</style>

        <div className="page-head">
          <div>
            <div className="eyebrow">
              <ClipboardList size={15} />
              Procurement Module
            </div>

            <h1>Purchase Receipts / GRN</h1>

            <p>
              Receive purchase order materials, add batch and expiry details,
              update warehouse stock, and track posted GRNs.
            </p>
          </div>

          <div className="head-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={fetchReceipts}
              disabled={loading}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>

            <button type="button" className="btn primary" onClick={openCreateModal}>
              <Plus size={17} />
              New GRN
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

        <div className="summary-grid">
          <SummaryCard
            icon={PackageCheck}
            label="Total GRN"
            value={summary.total_goods_receipts || receipts.length || 0}
          />
          <SummaryCard
            icon={CheckCircle2}
            label="Posted"
            value={summary.posted_count || 0}
          />
          <SummaryCard
            icon={Boxes}
            label="Accepted Qty"
            value={formatNumber(summary.total_accepted_qty || 0)}
          />
          <SummaryCard
            icon={AlertCircle}
            label="Rejected Qty"
            value={formatNumber(summary.total_rejected_qty || 0)}
          />
        </div>

        <div className="filter-card">
          <div className="search-box">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search GRN, PO, invoice, vendor, warehouse..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

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
            value={filters.warehouse_id}
            onChange={(e) => handleFilterChange("warehouse_id", e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name || warehouse.warehouse_name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Goods Receipt List</h2>
              <p>
                {loading
                  ? "Loading receipts..."
                  : `${receipts.length} receipt record(s) found`}
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>GRN No</th>
                  <th>PO No</th>
                  <th>Vendor</th>
                  <th>Warehouse</th>
                  <th>Receipt Date</th>
                  <th>Invoice</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="empty">
                      Loading purchase receipts...
                    </td>
                  </tr>
                ) : receipts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty">
                      No purchase receipts found
                    </td>
                  </tr>
                ) : (
                  receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>
                        <strong>{receipt.grn_number || `GRN-${receipt.id}`}</strong>
                      </td>
                      <td>{receipt.po_number || "-"}</td>
                      <td>{receipt.vendor_name || "-"}</td>
                      <td>{receipt.warehouse_name || "-"}</td>
                      <td>{formatDate(receipt.receipt_date)}</td>
                      <td>{receipt.invoice_number || "-"}</td>
                      <td>
                        <span className="qty-pill">
                          {formatNumber(
                            receipt.total_accepted_qty ||
                              receipt.total_received_qty ||
                              0
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusClass(receipt.status)}>
                          {receipt.status || "draft"}
                        </span>
                      </td>
                      <td className="right">
                        <div className="action-row">
                          <button
                            type="button"
                            className="icon-btn"
                            title="View"
                            onClick={() => openViewReceipt(receipt.id)}
                          >
                            <Eye size={15} />
                          </button>

                          {receipt.status === "draft" && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Verify"
                              onClick={() => handleAction(receipt.id, "verify")}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}

                          {(receipt.status === "draft" ||
                            receipt.status === "verified") && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Post Stock"
                              onClick={() => handleAction(receipt.id, "post")}
                            >
                              <Send size={15} />
                            </button>
                          )}

                          {receipt.status !== "posted" &&
                            receipt.status !== "cancelled" && (
                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Cancel"
                                onClick={() => handleAction(receipt.id, "cancel")}
                              >
                                <Ban size={15} />
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
                  <h2>Create Purchase Receipt / GRN</h2>
                  <p>
                    Select PO or manually receive vendor materials into warehouse.
                  </p>
                </div>

                <button type="button" className="close-btn" onClick={closeCreateModal}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label>Purchase Order</label>
                    <select
                      value={form.purchase_order_id}
                      onChange={(e) => handlePurchaseOrderSelect(e.target.value)}
                      disabled={dropdownLoading}
                    >
                      <option value="">Without PO / Direct GRN</option>
                      {purchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_number || `PO-${po.id}`} —{" "}
                          {po.vendor_name || po.business_name || "Vendor"}
                        </option>
                      ))}
                    </select>
                  </div>

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
                    <label>Warehouse *</label>
                    <select
                      value={form.warehouse_id}
                      onChange={(e) =>
                        handleFormChange("warehouse_id", e.target.value)
                      }
                      required
                      disabled={dropdownLoading}
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name || warehouse.warehouse_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Receipt Date *</label>
                    <input
                      type="date"
                      value={form.receipt_date}
                      onChange={(e) =>
                        handleFormChange("receipt_date", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Supplier Invoice No</label>
                    <input
                      type="text"
                      value={form.invoice_number}
                      onChange={(e) =>
                        handleFormChange("invoice_number", e.target.value)
                      }
                      placeholder="INV-001"
                    />
                  </div>

                  <div className="field">
                    <label>Create Status</label>
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

                <div className="items-section">
                  <div className="items-head">
                    <div>
                      <h3>Received Items</h3>
                      <p>Add products, batch number, expiry and accepted quantity.</p>
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
                          <div className="field wide">
                            <label>Product *</label>
                            <select
                              value={item.product_id}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "product_id",
                                  e.target.value
                                )
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
                            <label>Batch No</label>
                            <input
                              type="text"
                              value={item.batch_no}
                              onChange={(e) =>
                                handleItemChange(index, "batch_no", e.target.value)
                              }
                              placeholder="BATCH-001"
                            />
                          </div>

                          <div className="field">
                            <label>Expiry Date</label>
                            <input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "expiry_date",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="field">
                            <label>Received Qty *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.received_qty}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "received_qty",
                                  e.target.value
                                )
                              }
                              required
                            />
                          </div>

                          <div className="field">
                            <label>Accepted Qty *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.accepted_qty}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "accepted_qty",
                                  e.target.value
                                )
                              }
                              required
                            />
                          </div>

                          <div className="field">
                            <label>Rejected Qty</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rejected_qty}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "rejected_qty",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="field">
                            <label>Unit Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "unit_price",
                                  e.target.value
                                )
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="remarks-total-row">
                  <div className="field">
                    <label>Remarks</label>
                    <textarea
                      rows="4"
                      value={form.remarks}
                      onChange={(e) => handleFormChange("remarks", e.target.value)}
                      placeholder="Material received against PO / direct purchase..."
                    />
                  </div>

                  <div className="total-card">
                    <div>
                      <span>Received Qty</span>
                      <strong>{formatNumber(formTotals.receivedQty)}</strong>
                    </div>
                    <div>
                      <span>Accepted Qty</span>
                      <strong>{formatNumber(formTotals.acceptedQty)}</strong>
                    </div>
                    <div>
                      <span>Rejected Qty</span>
                      <strong>{formatNumber(formTotals.rejectedQty)}</strong>
                    </div>
                    <div>
                      <span>Total Value</span>
                      <strong>{formatCurrency(formTotals.totalAmount)}</strong>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn secondary" onClick={closeCreateModal}>
                    Cancel
                  </button>

                  <button type="submit" className="btn primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Purchase Receipt"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewOpen && selectedReceipt && (
          <div className="modal-backdrop">
            <div className="modal-card large">
              <div className="modal-head">
                <div>
                  <h2>{selectedReceipt.grn_number || "GRN Details"}</h2>
                  <p>
                    {selectedReceipt.vendor_name || "-"} ·{" "}
                    {selectedReceipt.warehouse_name || "-"}
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
                <Detail icon={ClipboardList} label="PO Number" value={selectedReceipt.po_number || "-"} />
                <Detail icon={Truck} label="Vendor" value={selectedReceipt.vendor_name || "-"} />
                <Detail icon={Warehouse} label="Warehouse" value={selectedReceipt.warehouse_name || "-"} />
                <Detail icon={CalendarDays} label="Receipt Date" value={formatDate(selectedReceipt.receipt_date)} />
                <Detail icon={FileText} label="Invoice" value={selectedReceipt.invoice_number || "-"} />
                <Detail icon={PackageCheck} label="Status" value={selectedReceipt.status || "draft"} />
              </div>

              <div className="table-card inner">
                <div className="table-head">
                  <div>
                    <h2>Receipt Items</h2>
                    <p>Products received in this GRN</p>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Batch</th>
                        <th>Expiry</th>
                        <th>Received</th>
                        <th>Accepted</th>
                        <th>Rejected</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedReceipt.items?.length ? (
                        selectedReceipt.items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>
                                {item.product_name ||
                                  item.name ||
                                  `Product #${item.product_id}`}
                              </strong>
                            </td>
                            <td>{item.batch_no || "-"}</td>
                            <td>{formatDate(item.expiry_date)}</td>
                            <td>{formatNumber(item.received_qty)}</td>
                            <td>{formatNumber(item.accepted_qty)}</td>
                            <td>{formatNumber(item.rejected_qty)}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>
                              {formatCurrency(
                                item.total_amount ||
                                  Number(item.accepted_qty || 0) *
                                    Number(item.unit_price || 0)
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="empty">
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedReceipt.remarks && (
                <div className="remarks-box">
                  <strong>Remarks</strong>
                  <p>{selectedReceipt.remarks}</p>
                </div>
              )}
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
  .grn-page {
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
    max-width: 720px;
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
    grid-template-columns: 1.5fr 0.6fr 0.8fr 0.8fr;
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
    min-height: 104px;
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
    margin-top: 18px;
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

  .status.posted {
    background: #ecfdf5;
    color: #047857;
  }

  .status.verified {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .status.cancelled {
    background: #fef2f2;
    color: #b91c1c;
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
    max-width: 1180px;
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

  .items-section {
    margin-top: 22px;
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
    font-weight: 700;
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
    grid-template-columns: 1.5fr repeat(6, 1fr);
    gap: 12px;
  }

  .remarks-total-row {
    display: grid;
    grid-template-columns: 1fr 330px;
    gap: 16px;
    margin-top: 18px;
  }

  .total-card {
    border-radius: 20px;
    border: 1px solid #edf0f4;
    background: #111827;
    padding: 16px;
    color: #ffffff;
    display: grid;
    gap: 11px;
  }

  .total-card div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .total-card span {
    color: rgba(255,255,255,0.62);
    font-size: 12px;
    font-weight: 850;
  }

  .total-card strong {
    color: #ffd21e;
    font-size: 15px;
    font-weight: 950;
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
    margin: 18px 24px 24px;
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .remarks-total-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .grn-page {
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