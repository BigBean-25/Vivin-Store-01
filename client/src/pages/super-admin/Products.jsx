import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import ProductImageModal from "./ProductImageModal";
import {
  Barcode,
  Edit3,
  Image as ImageIcon,
  IndianRupee,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const initialForm = {
  product_code: "",
  sku: "",
  name: "",
  slug: "",
  category_id: "",
  sub_category_id: "",
  unit_id: "",
  brand_id: "",
  hsn_code: "",
  barcode: "",
  description: "",
  base_price: 0,
  purchase_price: 0,
  tax_rate: 0,
  min_stock_level: 0,
  reorder_level: 0,
  shelf_life_days: 0,
  is_batch_tracking: true,
  is_expiry_tracking: true,
  status: "active",
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedImageProduct, setSelectedImageProduct] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [primaryImageFile, setPrimaryImageFile] = useState(null);
  const [primaryImagePreview, setPrimaryImagePreview] = useState("");
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/products");

      if (res.data.success) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/api/categories");

      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.log("Categories fetch failed:", err.response?.data?.message);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await API.get("/api/units/active/list");

      if (res.data.success) {
        setUnits(res.data.units || []);
      }
    } catch (err) {
      console.log("Units fetch failed:", err.response?.data?.message);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await API.get("/api/brands/active/list");

      if (res.data.success) {
        setBrands(res.data.brands || []);
      }
    } catch (err) {
      console.log("Brands fetch failed:", err.response?.data?.message);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await API.get("/api/sub-categories/active/list");

      if (res.data.success) {
        setSubCategories(res.data.subCategories || []);
      }
    } catch (err) {
      console.log("Sub categories fetch failed:", err.response?.data?.message);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUnits();
    fetchBrands();
    fetchSubCategories();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const text = `
        ${product.product_code || ""}
        ${product.sku || ""}
        ${product.name || ""}
        ${product.category_name || ""}
        ${product.hsn_code || ""}
        ${product.barcode || ""}
        ${product.status || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const createSlug = (text) => {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleEdit = (product) => {
    setEditingProductId(product.id);

    setFormData({
      product_code: product.product_code || "",
      sku: product.sku || "",
      name: product.name || "",
      slug: product.slug || "",
      category_id: product.category_id || "",
      sub_category_id: product.sub_category_id || "",
      unit_id: product.unit_id || "",
      brand_id: product.brand_id || "",
      hsn_code: product.hsn_code || "",
      barcode: product.barcode || "",
      description: product.description || "",
      base_price: product.base_price || 0,
      purchase_price: product.purchase_price || 0,
      tax_rate: product.tax_rate || 0,
      min_stock_level: product.min_stock_level || 0,
      reorder_level: product.reorder_level || 0,
      shelf_life_days: product.shelf_life_days || 0,
      is_batch_tracking:
        product.is_batch_tracking === 1 || product.is_batch_tracking === true,
      is_expiry_tracking:
        product.is_expiry_tracking === 1 || product.is_expiry_tracking === true,
      status: product.status || "active",
    });

    setShowForm(true);
    resetProductImages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenImageModal = (product) => {
    setSelectedImageProduct(product);
    setShowImageModal(true);
  };

  const resetProductImages = () => {
    if (primaryImagePreview) {
      URL.revokeObjectURL(primaryImagePreview);
    }

    additionalImagePreviews.forEach((preview) => {
      URL.revokeObjectURL(preview);
    });

    setPrimaryImageFile(null);
    setPrimaryImagePreview("");
    setAdditionalImageFiles([]);
    setAdditionalImagePreviews([]);
  };

  const validateImageFile = (file) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed");
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Each image size should be below 5MB");
      return false;
    }

    return true;
  };

  const handlePrimaryImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!validateImageFile(file)) return;

    if (primaryImagePreview) {
      URL.revokeObjectURL(primaryImagePreview);
    }

    setError("");
    setPrimaryImageFile(file);
    setPrimaryImagePreview(URL.createObjectURL(file));
  };

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const validFiles = [];

    for (const file of files) {
      if (validateImageFile(file)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    additionalImagePreviews.forEach((preview) => {
      URL.revokeObjectURL(preview);
    });

    setError("");
    setAdditionalImageFiles(validFiles);
    setAdditionalImagePreviews(validFiles.map((file) => URL.createObjectURL(file)));
  };

  const uploadSingleProductImage = async ({
    productId,
    file,
    altText,
    sortOrder,
    isPrimary,
  }) => {
    const payload = new FormData();

    payload.append("product_id", productId);
    payload.append("image", file);
    payload.append("alt_text", altText || "Product Image");
    payload.append("sort_order", sortOrder);
    payload.append("is_primary", isPrimary ? "true" : "false");

    await API.post("/api/product-images", payload);
  };

  const uploadProductImages = async (productId, productName) => {
    if (!productId) return;

    if (primaryImageFile) {
      await uploadSingleProductImage({
        productId,
        file: primaryImageFile,
        altText: `${productName} Primary Image`,
        sortOrder: 0,
        isPrimary: true,
      });
    }

    for (let i = 0; i < additionalImageFiles.length; i++) {
      await uploadSingleProductImage({
        productId,
        file: additionalImageFiles[i],
        altText: `${productName} Image ${i + 1}`,
        sortOrder: i + 1,
        isPrimary: false,
      });
    }
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingProductId(null);
    setShowForm(false);
    resetProductImages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      let res;

      if (editingProductId) {
        res = await API.put(`/api/products/${editingProductId}`, formData);
      } else {
        res = await API.post("/api/products", formData);
      }

      if (res.data.success) {
        const savedProductId = editingProductId || res.data.product_id;

        if (
          savedProductId &&
          (primaryImageFile || additionalImageFiles.length > 0)
        ) {
          await uploadProductImages(savedProductId, formData.name);
        }

        const createdProduct =
          !editingProductId && res.data.product_id
            ? {
                ...formData,
                id: res.data.product_id,
                name: formData.name,
                product_code: formData.product_code || `Product #${res.data.product_id}`,
              }
            : null;

        setFormData(initialForm);
        setEditingProductId(null);
        setShowForm(false);
        resetProductImages();
        fetchProducts();

        if (
          createdProduct &&
          !primaryImageFile &&
          additionalImageFiles.length === 0
        ) {
          setSelectedImageProduct(createdProduct);
          setShowImageModal(true);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingProductId
            ? "Failed to update product"
            : "Failed to create product")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this product?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deactivate product");
    }
  };

  return (
    <AdminLayout>
      <div className="product-page">
        <style>{`
          .product-page {
            color: #151515;
          }

          .product-hero {
            background:
              radial-gradient(circle at top right, rgba(232,119,58,0.20), transparent 30%),
              linear-gradient(135deg, #ffffff, #fff8f3);
            border: 1px solid #f1ded2;
            border-radius: 28px;
            padding: 30px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            gap: 22px;
            align-items: flex-start;
            box-shadow: 0 8px 28px rgba(0,0,0,0.045);
          }

          .hero-left {
            display: flex;
            gap: 18px;
            align-items: flex-start;
          }

          .hero-icon {
            width: 58px;
            height: 58px;
            border-radius: 19px;
            background: linear-gradient(135deg, #E8773A, #FF9A62);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 14px 30px rgba(232,119,58,0.28);
            flex-shrink: 0;
          }

          .product-hero h1 {
            margin: 0;
            font-size: 30px;
            font-weight: 950;
            color: #111;
          }

          .product-hero p {
            margin: 9px 0 0;
            color: #777;
            font-size: 14px;
            line-height: 1.7;
            max-width: 760px;
          }

          .hero-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .primary-btn,
          .secondary-btn {
            border: none;
            height: 46px;
            padding: 0 18px;
            border-radius: 15px;
            display: flex;
            align-items: center;
            gap: 9px;
            font-weight: 900;
            cursor: pointer;
            white-space: nowrap;
          }

          .primary-btn {
            background: linear-gradient(135deg, #E8773A, #FF9A62);
            color: #fff;
          }

          .secondary-btn {
            background: #fff;
            color: #333;
            border: 1px solid #e8e8e8;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 22px;
          }

          .stat-card {
            background: #fff;
            border: 1px solid #ececec;
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 8px 26px rgba(0,0,0,0.04);
          }

          .stat-card h3 {
            margin: 0;
            font-size: 25px;
            font-weight: 950;
            color: #111;
          }

          .stat-card p {
            margin: 7px 0 0;
            color: #777;
            font-size: 13px;
            font-weight: 800;
          }

          .error-box {
            background: #fff1f1;
            border: 1px solid #ffc9c9;
            color: #d63636;
            padding: 13px 15px;
            border-radius: 16px;
            margin-bottom: 18px;
            font-size: 13px;
            font-weight: 800;
          }

          .form-card {
            background: #fff;
            border: 1px solid #ececec;
            border-radius: 24px;
            padding: 24px;
            margin-bottom: 22px;
            box-shadow: 0 8px 26px rgba(0,0,0,0.04);
          }

          .form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 22px;
          }

          .form-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 950;
          }

          .close-btn {
            width: 40px;
            height: 40px;
            border-radius: 13px;
            border: none;
            background: #f6f6f6;
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
            font-size: 13px;
            font-weight: 900;
            color: #333;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            border: 1.5px solid #e8e8e8;
            border-radius: 14px;
            padding: 13px 14px;
            font-size: 14px;
            font-weight: 650;
            outline: none;
            box-sizing: border-box;
            font-family: inherit;
          }

          .form-group textarea {
            min-height: 90px;
            resize: vertical;
          }

          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
            padding-top: 30px;
            font-size: 13px;
            font-weight: 850;
            color: #333;
          }

          .checkbox-group input {
            width: 16px;
            height: 16px;
          }

          .image-upload-box {
            border: 1.5px dashed #e5c8b8;
            background: #fff8f3;
            border-radius: 20px;
            padding: 20px;
            display: flex;
            gap: 18px;
            align-items: center;
          }

          .image-preview-box {
            width: 125px;
            height: 125px;
            border-radius: 20px;
            background: #fff;
            border: 1px solid #f0ded2;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #E8773A;
            overflow: hidden;
            flex-shrink: 0;
          }

          .image-preview-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .image-upload-content {
            width: 100%;
          }

          .image-upload-content input[type="file"] {
            background: #fff;
          }

          .image-help-text {
            margin-top: 8px;
            color: #777;
            font-size: 12.5px;
            font-weight: 700;
          }

          .additional-preview-grid {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 12px;
          }

          .additional-preview-item {
            width: 82px;
            height: 82px;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid #f0ded2;
            background: #fff;
          }

          .additional-preview-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 22px;
          }

          .toolbar {
            background: #fff;
            border: 1px solid #ececec;
            border-radius: 22px;
            padding: 18px;
            margin-bottom: 22px;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            box-shadow: 0 8px 26px rgba(0,0,0,0.04);
          }

          .search-wrap {
            max-width: 440px;
            width: 100%;
            height: 46px;
            border-radius: 15px;
            background: #f7f7f7;
            border: 1px solid #eeeeee;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 14px;
            color: #888;
          }

          .search-wrap input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            font-size: 13px;
            font-weight: 700;
          }

          .filter-select {
            height: 46px;
            border-radius: 15px;
            border: 1px solid #eeeeee;
            background: #fff;
            padding: 0 14px;
            font-size: 13px;
            font-weight: 800;
            color: #333;
            outline: none;
          }

          .table-card {
            background: #fff;
            border: 1px solid #ececec;
            border-radius: 24px;
            padding: 22px;
            box-shadow: 0 8px 26px rgba(0,0,0,0.04);
            overflow: hidden;
          }

          .table-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 950;
          }

          .table-header p {
            margin: 5px 0 18px;
            color: #777;
            font-size: 13px;
          }

          .table-wrap {
            overflow-x: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1180px;
          }

          th {
            background: #fafafa;
            color: #777;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            text-align: left;
            padding: 14px;
            border-bottom: 1px solid #eeeeee;
          }

          td {
            padding: 15px 14px;
            border-bottom: 1px solid #f0f0f0;
            color: #333;
            font-size: 13px;
            vertical-align: top;
          }

          .product-name {
            font-weight: 950;
            color: #111;
          }

          .small-text {
            color: #777;
            font-size: 12.5px;
            margin-top: 5px;
          }

          .price-text {
            font-size: 15px;
            font-weight: 950;
            color: #E8773A;
          }

          .purchase-text {
            font-size: 15px;
            font-weight: 950;
            color: #1c9b58;
          }

          .status-badge {
            display: inline-flex;
            border-radius: 999px;
            padding: 7px 11px;
            font-size: 12px;
            font-weight: 900;
            text-transform: capitalize;
          }

          .status-badge.active {
            background: #effbf4;
            color: #1c9b58;
          }

          .status-badge.inactive {
            background: #fff1f1;
            color: #d63636;
          }

          .action-buttons {
            display: flex;
            gap: 8px;
          }

          .image-btn {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            border: none;
            background: #eef6ff;
            color: #2176d2;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .edit-btn,
          .delete-btn {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .edit-btn {
            background: #fff4ee;
            color: #E8773A;
          }

          .delete-btn {
            background: #fff1f1;
            color: #d63636;
          }

          .empty-box {
            min-height: 180px;
            border: 1px dashed #ddd;
            border-radius: 20px;
            background: #fafafa;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 28px;
          }

          .empty-box h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 950;
          }

          .empty-box p {
            margin: 8px 0 0;
            color: #777;
            font-size: 13px;
          }

          @media (max-width: 1100px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 900px) {
            .form-grid {
              grid-template-columns: 1fr;
            }

            .product-hero,
            .toolbar {
              flex-direction: column;
              align-items: stretch;
            }

            .hero-left {
              flex-direction: column;
            }
          }

          @media (max-width: 600px) {
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div className="product-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <Package size={28} />
            </div>

            <div>
              <h1>Products</h1>
              <p>
                Create and manage products with SKU, barcode, HSN code,
                category, base price, purchase price, stock levels and tax rate.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button className="secondary-btn" onClick={fetchProducts}>
              <RefreshCw size={17} />
              Refresh
            </button>

            <button className="primary-btn" onClick={() => setShowForm(true)}>
              <Plus size={18} />
              Add Product
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>{products.length}</h3>
            <p>Total Products</p>
          </div>

          <div className="stat-card">
            <h3>{products.filter((p) => p.status === "active").length}</h3>
            <p>Active Products</p>
          </div>

          <div className="stat-card">
            <h3>{categories.length}</h3>
            <p>Categories</p>
          </div>

          <div className="stat-card">
            <h3>
              ₹
              {formatAmount(
                products.reduce(
                  (sum, product) => sum + Number(product.base_price || 0),
                  0
                )
              )}
            </h3>
            <p>Total Base Value</p>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {showForm && (
          <div className="form-card">
            <div className="form-header">
              <h2>{editingProductId ? "Edit Product" : "Add New Product"}</h2>

              <button className="close-btn" onClick={handleCancelForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tomato"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Product Code</label>
                  <input
                    name="product_code"
                    value={formData.product_code}
                    onChange={handleChange}
                    placeholder="Auto generate if empty"
                  />
                </div>

                <div className="form-group">
                  <label>SKU</label>
                  <input
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="Auto generate if empty"
                  />
                </div>

                <div className="form-group">
                  <label>Slug</label>
                  <input
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="tomato"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Category</option>

                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <select
                    name="unit_id"
                    value={formData.unit_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Unit</option>

                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.short_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sub Category</label>
                  <select
                    name="sub_category_id"
                    value={formData.sub_category_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Sub Category</option>

                    {subCategories
                      .filter(
                        (item) =>
                          !formData.category_id ||
                          String(item.category_id) === String(formData.category_id)
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Brand</label>
                  <select
                    name="brand_id"
                    value={formData.brand_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Brand</option>

                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>HSN Code</label>
                  <input
                    name="hsn_code"
                    value={formData.hsn_code}
                    onChange={handleChange}
                    placeholder="0702"
                  />
                </div>

                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="8901234567890"
                  />
                </div>

                <div className="form-group">
                  <label>Base Price</label>
                  <input
                    type="number"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleChange}
                    placeholder="40"
                  />
                </div>

                <div className="form-group">
                  <label>Purchase Price</label>
                  <input
                    type="number"
                    name="purchase_price"
                    value={formData.purchase_price}
                    onChange={handleChange}
                    placeholder="32"
                  />
                </div>

                <div className="form-group">
                  <label>Tax Rate %</label>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={handleChange}
                    placeholder="5"
                  />
                </div>

                <div className="form-group">
                  <label>Min Stock Level</label>
                  <input
                    type="number"
                    name="min_stock_level"
                    value={formData.min_stock_level}
                    onChange={handleChange}
                    placeholder="20"
                  />
                </div>

                <div className="form-group">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    name="reorder_level"
                    value={formData.reorder_level}
                    onChange={handleChange}
                    placeholder="50"
                  />
                </div>

                <div className="form-group">
                  <label>Shelf Life Days</label>
                  <input
                    type="number"
                    name="shelf_life_days"
                    value={formData.shelf_life_days}
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
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    name="is_batch_tracking"
                    checked={formData.is_batch_tracking}
                    onChange={handleChange}
                  />
                  Batch Tracking
                </label>

                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    name="is_expiry_tracking"
                    checked={formData.is_expiry_tracking}
                    onChange={handleChange}
                  />
                  Expiry Tracking
                </label>

                <div className="form-group full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Fresh tomato for hotels and restaurants"
                  />
                </div>

                <div className="form-group full">
                  <label>Primary Product Image</label>

                  <div className="image-upload-box">
                    <div className="image-preview-box">
                      {primaryImagePreview ? (
                        <img src={primaryImagePreview} alt="Primary Product Preview" />
                      ) : (
                        <Upload size={34} />
                      )}
                    </div>

                    <div className="image-upload-content">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handlePrimaryImageChange}
                      />

                      <div className="image-help-text">
                        This image will be saved as the main primary product image.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group full">
                  <label>Additional Product Images</label>

                  <div className="image-upload-box">
                    <div className="image-preview-box">
                      <Upload size={34} />
                    </div>

                    <div className="image-upload-content">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        onChange={handleAdditionalImagesChange}
                      />

                      <div className="image-help-text">
                        Select multiple images. These will be saved as normal product images.
                      </div>

                      {additionalImagePreviews.length > 0 && (
                        <div className="additional-preview-grid">
                          {additionalImagePreviews.map((preview, index) => (
                            <div className="additional-preview-item" key={index}>
                              <img src={preview} alt={`Additional Preview ${index + 1}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingProductId
                    ? "Update Product"
                    : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU, barcode, category..."
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Active Products</option>
            <option value="inactive">Inactive Products</option>
            <option value="all">All Products</option>
          </select>

          <div>
            Showing <strong>{filteredProducts.length}</strong> products
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Product List</h2>
            <p>Product master records from MySQL database</p>
          </div>

          {loading ? (
            <div className="empty-box">
              <div>
                <h3>Loading products...</h3>
                <p>Please wait while product records are loading.</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-box">
              <div>
                <h3>No products found</h3>
                <p>Click Add Product to create your first product.</p>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Sub Category</th>
                    <th>Unit</th>
                    <th>Brand</th>
                    <th>SKU / Barcode</th>
                    <th>Base Price</th>
                    <th>Purchase Price</th>
                    <th>Stock Rules</th>
                    <th>Tax</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="product-name">{product.name}</div>
                        <div className="small-text">
                          Code: {product.product_code || "-"}
                        </div>
                        <div className="small-text">
                          HSN: {product.hsn_code || "-"}
                        </div>
                      </td>

                      <td>{product.category_name || "-"}</td>

                      <td>{product.sub_category_name || "-"}</td>

                      <td>
                        {product.unit_name ? (
                          <>
                            <div>{product.unit_name}</div>
                            <div className="small-text">
                              {product.unit_short_name}
                            </div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>{product.brand_name || "-"}</td>

                      <td>
                        <div>
                          <Barcode size={13} /> {product.sku || "-"}
                        </div>
                        <div className="small-text">
                          Barcode: {product.barcode || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="price-text">
                          <IndianRupee size={13} />
                          {formatAmount(product.base_price)}
                        </div>
                      </td>

                      <td>
                        <div className="purchase-text">
                          ₹{formatAmount(product.purchase_price)}
                        </div>
                      </td>

                      <td>
                        <div>Min: {product.min_stock_level || 0}</div>
                        <div className="small-text">
                          Reorder: {product.reorder_level || 0}
                        </div>
                      </td>

                      <td>{product.tax_rate || 0}%</td>

                      <td>
                        <span className={`status-badge ${product.status}`}>
                          {product.status}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="image-btn"
                            onClick={() => handleOpenImageModal(product)}
                            title="Manage Images"
                          >
                            <ImageIcon size={16} />
                          </button>

                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit3 size={16} />
                          </button>

                          {product.status === "active" ? (
                            <button
                              className="delete-btn"
                              onClick={() => handleDeactivate(product.id)}
                              title="Deactivate Product"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="small-text">Deactivated</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showImageModal && selectedImageProduct && (
          <ProductImageModal
            product={selectedImageProduct}
            onClose={() => {
              setShowImageModal(false);
              setSelectedImageProduct(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
