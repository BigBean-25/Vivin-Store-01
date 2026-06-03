import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  IndianRupee,
  Layers3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Star,
  Tags,
  X,
} from "lucide-react";

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
];

const getListFromResponse = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const getProductName = (product) => {
  return (
    product.product_name ||
    product.name ||
    product.title ||
    product.item_name ||
    `Product #${product.id}`
  );
};

const getCategoryName = (category) => {
  return (
    category.category_name ||
    category.name ||
    category.title ||
    `Category #${category.id}`
  );
};

const getBrandName = (brand) => {
  return brand.brand_name || brand.name || brand.title || `Brand #${brand.id}`;
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString("en-IN");
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getImageUrl = (value) => {
  if (!value) return "";

  if (String(value).startsWith("http")) return value;

  const cleanPath = String(value).replace(/^\/+/, "");
  return `http://localhost:5000/${cleanPath}`;
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const reportColumns = [
  { label: "Product ID", value: (item) => item.id },
  { label: "Product Name", value: (item) => item.product_name || "-" },
  { label: "SKU", value: (item) => item.sku || "-" },
  { label: "Barcode", value: (item) => item.barcode || "-" },
  { label: "HSN Code", value: (item) => item.hsn_code || "-" },
  { label: "Category", value: (item) => item.category_name || "-" },
  { label: "Sub Category", value: (item) => item.sub_category_name || "-" },
  { label: "Brand", value: (item) => item.brand_name || "-" },
  { label: "Unit", value: (item) => item.unit_name || "-" },
  { label: "Status", value: (item) => item.status || "-" },
  { label: "Variant Count", value: (item) => item.variant_count || 0 },
  { label: "Active Variants", value: (item) => item.active_variant_count || 0 },
  { label: "Total Stock", value: (item) => item.total_stock || 0 },
  { label: "Low Stock Count", value: (item) => item.low_stock_count || 0 },
  { label: "Pricing Count", value: (item) => item.pricing_count || 0 },
  { label: "Min Selling Price", value: (item) => item.min_selling_price || 0 },
  { label: "Max Selling Price", value: (item) => item.max_selling_price || 0 },
  { label: "Review Count", value: (item) => item.review_count || 0 },
  { label: "Average Rating", value: (item) => Number(item.average_rating || 0).toFixed(1) },
  { label: "Image Count", value: (item) => item.image_count || 0 },
  { label: "Created At", value: (item) => formatDate(item.created_at) },
];

export default function ProductReports() {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2800);
  };

  const buildParams = () => {
    const params = new URLSearchParams();

    if (search.trim()) params.append("search", search.trim());
    if (productFilter) params.append("product_id", productFilter);
    if (categoryFilter) params.append("category_id", categoryFilter);
    if (brandFilter) params.append("brand_id", brandFilter);
    if (statusFilter) params.append("status", statusFilter);
    if (lowStockOnly) params.append("low_stock", "true");

    return params.toString();
  };

  const fetchMasterData = async () => {
    try {
      const [productRes, categoryRes, brandRes] = await Promise.allSettled([
        API.get("/api/products"),
        API.get("/api/categories"),
        API.get("/api/brands"),
      ]);

      if (productRes.status === "fulfilled") {
        setProducts(getListFromResponse(productRes.value.data, "products"));
      }

      if (categoryRes.status === "fulfilled") {
        setCategories(getListFromResponse(categoryRes.value.data, "categories"));
      }

      if (brandRes.status === "fulfilled") {
        setBrands(getListFromResponse(brandRes.value.data, "brands"));
      }
    } catch (err) {
      console.error("Fetch master data error:", err.response?.data || err.message);
    }
  };

  const fetchProductReports = async () => {
    try {
      setLoading(true);
      setError("");

      const params = buildParams();

      const [reportRes, summaryRes] = await Promise.all([
        API.get(`/api/product-reports?${params}`),
        API.get(`/api/product-reports/summary?${params}`),
      ]);

      if (reportRes.data.success) {
        setReports(reportRes.data.reports || []);
      }

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.summary || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch product reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductReports();
    }, 350);

    return () => clearTimeout(timer);
  }, [search, productFilter, categoryFilter, brandFilter, statusFilter, lowStockOnly]);

  const computedSummary = useMemo(() => {
    if (summary) return summary;

    const totalProducts = reports.length;
    const activeProducts = reports.filter((item) => item.status === "active").length;
    const totalVariants = reports.reduce(
      (sum, item) => sum + Number(item.variant_count || 0),
      0
    );
    const totalImages = reports.reduce(
      (sum, item) => sum + Number(item.image_count || 0),
      0
    );
    const totalPricing = reports.reduce(
      (sum, item) => sum + Number(item.pricing_count || 0),
      0
    );
    const totalReviews = reports.reduce(
      (sum, item) => sum + Number(item.review_count || 0),
      0
    );
    const totalStock = reports.reduce(
      (sum, item) => sum + Number(item.total_stock || 0),
      0
    );
    const lowStockProducts = reports.filter(
      (item) => Number(item.low_stock_count || 0) > 0
    ).length;

    const averageRating =
      reports.length > 0
        ? reports.reduce((sum, item) => sum + Number(item.average_rating || 0), 0) /
          reports.length
        : 0;

    return {
      total_products: totalProducts,
      active_products: activeProducts,
      total_variants: totalVariants,
      total_images: totalImages,
      total_pricing: totalPricing,
      total_reviews: totalReviews,
      total_stock: totalStock,
      low_stock_products: lowStockProducts,
      average_rating: Number(averageRating.toFixed(1)),
    };
  }, [reports, summary]);

  const resetFilters = () => {
    setSearch("");
    setProductFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setStatusFilter("");
    setLowStockOnly(false);
  };

  const buildSummaryCardsHtml = () => {
    const cards = [
      ["Total Products", computedSummary.total_products],
      ["Active Products", computedSummary.active_products],
      ["Total Variants", computedSummary.total_variants],
      ["Total Stock", computedSummary.total_stock],
      ["Low Stock Products", computedSummary.low_stock_products],
      ["Pricing Records", computedSummary.total_pricing],
      ["Total Reviews", computedSummary.total_reviews],
      ["Product Images", computedSummary.total_images],
    ];

    return cards
      .map(
        ([label, value]) => `
          <div class="summary-card">
            <strong>${escapeHtml(formatNumber(value))}</strong>
            <span>${escapeHtml(label)}</span>
          </div>
        `
      )
      .join("");
  };

  const buildReportRowsHtml = () => {
    return reports
      .map(
        (item) => `
          <tr>
            ${reportColumns
              .map((column) => `<td>${escapeHtml(column.value(item))}</td>`)
              .join("")}
          </tr>
        `
      )
      .join("");
  };

  const buildFilterLine = () => {
    const productName = products.find((item) => String(item.id) === String(productFilter));
    const categoryName = categories.find((item) => String(item.id) === String(categoryFilter));
    const brandName = brands.find((item) => String(item.id) === String(brandFilter));

    const filters = [
      search ? `Search: ${search}` : null,
      productFilter ? `Product: ${getProductName(productName || {})}` : null,
      categoryFilter ? `Category: ${getCategoryName(categoryName || {})}` : null,
      brandFilter ? `Brand: ${getBrandName(brandName || {})}` : null,
      statusFilter ? `Status: ${statusFilter}` : null,
      lowStockOnly ? "Low Stock Only" : null,
    ].filter(Boolean);

    return filters.length ? filters.join(" | ") : "All product records";
  };

  const downloadExcel = () => {
    if (!reports.length) {
      setError("No report data available to download");
      return;
    }

    const headerHtml = reportColumns
      .map((column) => `<th>${escapeHtml(column.label)}</th>`)
      .join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Product Reports</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Arial, sans-serif; color: #111111; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .meta { color: #555555; font-size: 12px; margin-bottom: 14px; }
            .summary { margin-bottom: 16px; }
            .summary td { border: 1px solid #d9d9d9; padding: 8px 10px; font-weight: bold; background: #fff8cc; }
            .summary small { display: block; color: #666666; font-weight: normal; text-transform: uppercase; }
            table.report { border-collapse: collapse; width: 100%; }
            table.report th { background: #111111; color: #facc15; border: 1px solid #111111; padding: 8px; text-align: left; font-size: 12px; }
            table.report td { border: 1px solid #d9d9d9; padding: 7px; font-size: 12px; mso-number-format: "\\@"; }
          </style>
        </head>
        <body>
          <h1>Vivin Store - Product Reports</h1>
          <div class="meta">
            Generated on ${escapeHtml(new Date().toLocaleString("en-IN"))}<br />
            Filters: ${escapeHtml(buildFilterLine())}<br />
            Total Records: ${escapeHtml(reports.length)}
          </div>

          <table class="summary">
            <tr>
              <td>${escapeHtml(formatNumber(computedSummary.total_products))}<small>Total Products</small></td>
              <td>${escapeHtml(formatNumber(computedSummary.active_products))}<small>Active Products</small></td>
              <td>${escapeHtml(formatNumber(computedSummary.total_variants))}<small>Total Variants</small></td>
              <td>${escapeHtml(formatNumber(computedSummary.total_stock))}<small>Total Stock</small></td>
            </tr>
            <tr>
              <td>${escapeHtml(formatNumber(computedSummary.low_stock_products))}<small>Low Stock Products</small></td>
              <td>${escapeHtml(formatNumber(computedSummary.total_pricing))}<small>Pricing Records</small></td>
              <td>${escapeHtml(formatNumber(computedSummary.total_reviews))}<small>Total Reviews</small></td>
              <td>${escapeHtml(formatNumber(computedSummary.total_images))}<small>Product Images</small></td>
            </tr>
          </table>

          <table class="report">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${buildReportRowsHtml()}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `product-reports-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    showSuccess("Excel report downloaded successfully");
  };

  const downloadPDF = () => {
    if (!reports.length) {
      setError("No report data available to download");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError("Popup blocked. Please allow popup to download PDF report.");
      return;
    }

    const compactColumns = [
      "Product Name",
      "SKU",
      "Category",
      "Brand",
      "Status",
      "Variant Count",
      "Total Stock",
      "Low Stock Count",
      "Pricing Count",
      "Min Selling Price",
      "Max Selling Price",
      "Review Count",
      "Average Rating",
      "Image Count",
    ];

    const pdfColumns = reportColumns.filter((column) => compactColumns.includes(column.label));

    const headerHtml = pdfColumns
      .map((column) => `<th>${escapeHtml(column.label)}</th>`)
      .join("");

    const rowsHtml = reports
      .map(
        (item) => `
          <tr>
            ${pdfColumns
              .map((column) => `<td>${escapeHtml(column.value(item))}</td>`)
              .join("")}
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Product Reports PDF</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              color: #111111;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            .header {
              background: #111111;
              color: #ffffff;
              padding: 18px 20px;
              border-radius: 14px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              gap: 20px;
              align-items: flex-start;
            }
            .header h1 {
              margin: 0;
              color: #facc15;
              font-size: 24px;
            }
            .header p {
              margin: 6px 0 0;
              color: rgba(255,255,255,0.75);
              font-size: 11px;
              line-height: 1.5;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 14px;
            }
            .summary-card {
              border: 1px solid #dddddd;
              border-radius: 10px;
              padding: 9px 10px;
              background: #fffbea;
              min-height: 58px;
            }
            .summary-card strong {
              display: block;
              font-size: 17px;
              color: #111111;
            }
            .summary-card span {
              display: block;
              color: #666666;
              font-size: 9px;
              margin-top: 3px;
              text-transform: uppercase;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            th {
              background: #111111;
              color: #facc15;
              padding: 7px 6px;
              text-align: left;
              border: 1px solid #111111;
              white-space: nowrap;
            }
            td {
              border: 1px solid #dddddd;
              padding: 6px;
              vertical-align: top;
            }
            tr:nth-child(even) td { background: #fafafa; }
            .footer {
              margin-top: 12px;
              color: #777777;
              font-size: 9px;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Vivin Store - Product Reports</h1>
              <p>
                Complete product report with variants, pricing, stock, reviews, images and status.<br />
                Filters: ${escapeHtml(buildFilterLine())}
              </p>
            </div>
            <p>
              Generated: ${escapeHtml(new Date().toLocaleString("en-IN"))}<br />
              Records: ${escapeHtml(reports.length)}
            </p>
          </div>

          <div class="summary">
            ${buildSummaryCardsHtml()}
          </div>

          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="footer">Vivin Store B2B Supply Chain · Product Reports</div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    showSuccess("PDF report opened. Select Save as PDF in the print window.");
  };

  return (
    <AdminLayout>
      <div className="product-reports-page">
        <style>{css}</style>

        <div className="reports-hero">
          <div className="hero-left">
            <div className="hero-icon">
              <BarChart3 size={30} />
            </div>

            <div>
              <div className="eyebrow">Product Master</div>
              <h1>Product Reports</h1>
              <p>
                Complete product performance report with variants, pricing, stock,
                reviews, images, category and brand analytics.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={fetchProductReports}
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
              Refresh
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={downloadPDF}
              disabled={!reports.length}
            >
              <FileText size={17} />
              PDF Download
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={downloadExcel}
              disabled={!reports.length}
            >
              <Download size={17} />
              Excel Download
            </button>
          </div>
        </div>

        {success && (
          <div className="success-box">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {error && (
          <div className="error-box">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}

        <div className="stats-grid">
          <StatCard
            title="Total Products"
            value={formatNumber(computedSummary.total_products)}
            icon={Package}
          />
          <StatCard
            title="Active Products"
            value={formatNumber(computedSummary.active_products)}
            icon={CheckCircle2}
          />
          <StatCard
            title="Total Variants"
            value={formatNumber(computedSummary.total_variants)}
            icon={Layers3}
          />
          <StatCard
            title="Total Stock"
            value={formatNumber(computedSummary.total_stock)}
            icon={Boxes}
          />
          <StatCard
            title="Low Stock Products"
            value={formatNumber(computedSummary.low_stock_products)}
            icon={AlertTriangle}
          />
          <StatCard
            title="Pricing Records"
            value={formatNumber(computedSummary.total_pricing)}
            icon={IndianRupee}
          />
          <StatCard
            title="Total Reviews"
            value={formatNumber(computedSummary.total_reviews)}
            icon={Star}
          />
          <StatCard
            title="Product Images"
            value={formatNumber(computedSummary.total_images)}
            icon={ImageIcon}
          />
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, SKU, barcode, HSN..."
            />
          </div>

          <select
            className="filter-select"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {getProductName(product)}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {getCategoryName(category)}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={brandFilter}
            onChange={(event) => setBrandFilter(event.target.value)}
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {getBrandName(brand)}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`stock-toggle ${lowStockOnly ? "active" : ""}`}
            onClick={() => setLowStockOnly((prev) => !prev)}
          >
            <AlertTriangle size={15} />
            Low Stock
          </button>

          <button type="button" className="clear-btn" onClick={resetFilters}>
            Clear
          </button>

          <div className="api-chip">
            API Connected · <strong>{reports.length}</strong> records
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Product Report List</h2>
            <p>
              Product-wise stock, pricing, reviews, images and master data summary.
            </p>
          </div>

          {loading ? (
            <div className="empty-box">
              <Loader2 size={30} className="spin" />
              <h3>Loading product reports...</h3>
              <p>Please wait while report records are loading.</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-box">
              <BarChart3 size={34} />
              <h3>No product reports found</h3>
              <p>Try changing filters or refresh product report data.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand / Unit</th>
                    <th>Variants</th>
                    <th>Stock</th>
                    <th>Pricing</th>
                    <th>Reviews</th>
                    <th>Images</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb">
                            {item.primary_image ? (
                              <img src={getImageUrl(item.primary_image)} alt="" />
                            ) : (
                              <Package size={18} />
                            )}
                          </div>

                          <div>
                            <div className="main-name">
                              {item.product_name || "-"}
                            </div>
                            <div className="small-text">
                              SKU: {item.sku || "-"} · HSN: {item.hsn_code || "-"}
                            </div>
                            <div className="small-text">
                              Barcode: {item.barcode || "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="main-name">
                          <Tags size={15} />
                          {item.category_name || "-"}
                        </div>
                        <div className="small-text">
                          {item.sub_category_name || "No sub category"}
                        </div>
                      </td>

                      <td>
                        <div className="main-name">{item.brand_name || "-"}</div>
                        <div className="small-text">
                          Unit: {item.unit_name || "-"}
                        </div>
                      </td>

                      <td>
                        <div className="count-pill">
                          {formatNumber(item.variant_count)}
                        </div>
                        <div className="small-text">
                          Active: {formatNumber(item.active_variant_count)}
                        </div>
                      </td>

                      <td>
                        <div className="stock-line">
                          {formatNumber(item.total_stock)}
                        </div>
                        <div
                          className={`small-text ${
                            Number(item.low_stock_count || 0) > 0 ? "danger-text" : ""
                          }`}
                        >
                          Low stock: {formatNumber(item.low_stock_count)}
                        </div>
                      </td>

                      <td>
                        <div className="price-line">
                          {formatCurrency(item.min_selling_price)}
                        </div>
                        <div className="small-text">
                          Max: {formatCurrency(item.max_selling_price)}
                        </div>
                        <div className="small-text">
                          Records: {formatNumber(item.pricing_count)}
                        </div>
                      </td>

                      <td>
                        <div className="rating-line">
                          <Star size={15} fill="currentColor" />
                          {Number(item.average_rating || 0).toFixed(1)}
                        </div>
                        <div className="small-text">
                          Reviews: {formatNumber(item.review_count)}
                        </div>
                      </td>

                      <td>
                        <div className="count-pill">
                          {formatNumber(item.image_count)}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge ${item.status || "active"}`}>
                          {item.status || "active"}
                        </span>
                      </td>

                      <td>{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="stat-card">
      <div>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>

      <div className="stat-icon">
        <Icon size={20} />
      </div>

      <div className="stat-mark" />
    </div>
  );
}

const css = `
  .product-reports-page {
    color: #151515;
  }

  .reports-hero {
    background:
      radial-gradient(circle at top right, rgba(250,204,21,0.24), transparent 34%),
      linear-gradient(135deg, #080808, #171717 55%, #050505);
    border: 1px solid rgba(250,204,21,0.18);
    border-radius: 30px;
    padding: 32px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 22px;
    align-items: flex-start;
    box-shadow: 0 24px 70px rgba(0,0,0,0.22);
    color: #fff;
  }

  .hero-left {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }

  .hero-icon {
    width: 60px;
    height: 60px;
    border-radius: 20px;
    background: #facc15;
    color: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 18px 36px rgba(250,204,21,0.25);
    flex-shrink: 0;
  }

  .eyebrow {
    color: #facc15;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 9px;
  }

  .reports-hero h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 950;
    color: #fff;
    letter-spacing: -1px;
  }

  .reports-hero p {
    margin: 9px 0 0;
    color: rgba(255,255,255,0.62);
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
  .secondary-btn,
  .clear-btn,
  .stock-toggle {
    border: none;
    height: 46px;
    padding: 0 18px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  }

  .primary-btn {
    background: #facc15;
    color: #111;
    box-shadow: 0 14px 30px rgba(250,204,21,0.22);
  }

  .primary-btn:disabled,
  .secondary-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .secondary-btn {
    background: rgba(255,255,255,0.10);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
  }

  .clear-btn {
    background: #f4f4f5;
    color: #111;
  }

  .stock-toggle {
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid #fed7aa;
  }

  .stock-toggle.active {
    background: #c2410c;
    color: #fff;
  }

  .success-box,
  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 15px;
    border-radius: 16px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 900;
  }

  .success-box {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
  }

  .error-box {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
    justify-content: space-between;
  }

  .error-box button {
    border: none;
    background: transparent;
    color: #be123c;
    cursor: pointer;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card,
  .toolbar,
  .table-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 26px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.06);
  }

  .stat-card {
    border-radius: 22px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .stat-card h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .stat-card p {
    margin: 7px 0 0;
    color: #777;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    background: #fffbeb;
    color: #b45309;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-mark {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: #facc15;
  }

  .toolbar {
    padding: 18px;
    margin-bottom: 22px;
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-wrap {
    max-width: 360px;
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
    font-weight: 800;
  }

  .filter-select {
    height: 46px;
    border-radius: 15px;
    border: 1px solid #eeeeee;
    background: #fff;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 900;
    color: #333;
    outline: none;
    min-width: 150px;
  }

  .api-chip {
    background: #ecfdf5;
    color: #047857;
    border-radius: 999px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 950;
    white-space: nowrap;
    margin-left: auto;
  }

  .table-card {
    padding: 22px;
    overflow: hidden;
  }

  .table-header {
    margin-bottom: 18px;
  }

  .table-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 950;
    color: #111;
  }

  .table-header p {
    margin: 6px 0 0;
    color: #777;
    font-size: 13px;
    line-height: 1.6;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1450px;
  }

  th {
    background: #111;
    color: #facc15;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 15px 14px;
  }

  td {
    padding: 16px 14px;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
    font-size: 13px;
    vertical-align: top;
    font-weight: 700;
  }

  tr:hover td {
    background: #fffbeb;
  }

  .product-cell {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 300px;
  }

  .product-thumb {
    width: 48px;
    height: 48px;
    border-radius: 15px;
    background: #fffbeb;
    color: #b45309;
    border: 1px solid #fde68a;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .product-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .main-name {
    font-weight: 950;
    color: #111;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .small-text {
    color: #777;
    font-size: 12px;
    margin-top: 6px;
    max-width: 260px;
    line-height: 1.45;
  }

  .danger-text {
    color: #dc2626;
    font-weight: 950;
  }

  .count-pill {
    background: #f4f4f5;
    color: #111;
    border-radius: 999px;
    padding: 8px 12px;
    display: inline-flex;
    font-size: 12px;
    font-weight: 950;
  }

  .stock-line,
  .price-line,
  .rating-line {
    color: #111;
    font-weight: 950;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .rating-line {
    color: #d97706;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .status-badge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .status-badge.inactive {
    background: #fff1f2;
    color: #e11d48;
  }

  .status-badge.draft {
    background: #fffbeb;
    color: #b45309;
  }

  .empty-box {
    min-height: 190px;
    border: 1px dashed #ddd;
    border-radius: 22px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 28px;
    color: #777;
  }

  .empty-box h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 950;
    color: #111;
  }

  .empty-box p {
    margin: 0;
    color: #777;
    font-size: 13px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1200px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 800px) {
    .reports-hero,
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions,
    .primary-btn,
    .secondary-btn,
    .clear-btn,
    .stock-toggle {
      width: 100%;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .api-chip {
      margin-left: 0;
    }
  }
`;