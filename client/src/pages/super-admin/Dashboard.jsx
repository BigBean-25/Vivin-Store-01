import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import AdminLayout from "../../components/layout/AdminLayout";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  ExternalLink,
  Globe2,
  IndianRupee,
  Package,
  RefreshCw,
  Settings as SettingsIcon,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

const BRAND = {
  yellow: "#F8C400",
  yellowDark: "#DFAE00",
  black: "#111318",
  blackSoft: "#2B2C40",
  text: "#2B2C40",
  muted: "#6E6B7B",
  cream: "#FFF7DB",
  white: "#FFFFFF",
  border: "#DBDADE",
};

const SERVER_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const toAbsUrl = (url) => (!url ? "" : url.startsWith("http") ? url : `${SERVER_BASE}${url}`);

const HERO_TRUCK_SRC = "/vivin-login-hero-light.png";

const numberFormatter = new Intl.NumberFormat("en-IN");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatNumber = (value) => numberFormatter.format(Number(value ?? 0));
const formatCurrency = (value) => currencyFormatter.format(Number(value ?? 0));

const dashboardTranslations = {
  en: {
    sessionExpired: "Session expired. Please login again.",
    unableLoadData: "Unable to load live dashboard data",
    fallbackText: "Showing safe fallback values.",
    retry: "Retry",
    loading: "Loading",
    loadingDots: "Loading…",
    noItems: "No items",
    items: "items",
    commandCenter: "B2B Supply Chain Command Center",
    welcomeBack: "Welcome back,",
    superAdmin: "Super Admin",
    heroDesc:
      "Manage vendors, customers, products, warehouse, orders, delivery, finance and live operations from one premium dashboard.",
    refreshDashboard: "Refresh Dashboard",
    liveOverview: "Live business overview",
    businessModules: "Business Modules",
    operationsOverview: "Operations Overview",
    compactStatus: "Compact live module status across your workflow.",
    systemAudit: "System Audit",
    recentActivity: "Recent Activity",
    latestActions: "Latest actions and system events.",
    loadingActivity: "Loading recent activity…",
    noActivity: "No recent activity found",
    systemActivity: "System activity",
    general: "General",
    noDescription: "No description available",
    open: "Open",

    revenue: "Revenue",
    revenueHint: "Paid and partial orders",
    outstanding: "Outstanding",
    outstandingHint: "Invoice balance due",
    stockAlerts: "Stock Alerts",
    stockAlertsHint: "Open inventory alerts",
    notifications: "Notifications",
    notificationsHint: "System notifications",

    vendors: "Vendors",
    vendorsSub: "active",
    vendorsText: "Supplier onboarding and documents",
    customers: "Customers",
    customersSub: "active",
    customersText: "B2B accounts and pricing controls",
    products: "Products",
    productsSub: "active",
    productsText: "Product master, HSN and pricing",
    warehouse: "Warehouse",
    warehouseSub: "active",
    warehouseText: "Stock, batches and expiry tracking",
    orders: "Orders",
    ordersSub: "in progress",
    ordersText: "Order lifecycle and fulfillment",
    delivery: "Delivery",
    deliverySub: "active",
    deliveryText: "Dispatch, tracking and POD",
  },

  kn: {
    sessionExpired: "ಸೆಷನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ.",
    unableLoadData: "ಲೈವ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಡೇಟಾ ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ",
    fallbackText: "ಸುರಕ್ಷಿತ ಡೀಫಾಲ್ಟ್ ಮೌಲ್ಯಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ.",
    retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ",
    loadingDots: "ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    noItems: "ಐಟಂಗಳು ಇಲ್ಲ",
    items: "ಐಟಂಗಳು",
    commandCenter: "B2B ಸರಬರಾಜು ಸರಣಿ ಕಮಾಂಡ್ ಸೆಂಟರ್",
    welcomeBack: "ಮತ್ತೆ ಸ್ವಾಗತ,",
    superAdmin: "ಸೂಪರ್ ಅಡ್ಮಿನ್",
    heroDesc:
      "ವೆಂಡರ್‌ಗಳು, ಗ್ರಾಹಕರು, ಉತ್ಪನ್ನಗಳು, ವೇರ್‌ಹೌಸ್, ಆರ್ಡರ್‌ಗಳು, ಡೆಲಿವರಿ, ಫೈನಾನ್ಸ್ ಮತ್ತು ಲೈವ್ ಆಪರೇಷನ್ಸ್ ಅನ್ನು ಒಂದೇ ಪ್ರೀಮಿಯಂ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಿಂದ ನಿರ್ವಹಿಸಿ.",
    refreshDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ರಿಫ್ರೆಶ್ ಮಾಡಿ",
    liveOverview: "ಲೈವ್ ಬಿಸಿನೆಸ್ ಒವರ್‌ವ್ಯೂ",
    businessModules: "ಬಿಸಿನೆಸ್ ಮಾಡ್ಯೂಲ್‌ಗಳು",
    operationsOverview: "ಆಪರೇಷನ್ಸ್ ಒವರ್‌ವ್ಯೂ",
    compactStatus: "ನಿಮ್ಮ ವರ್ಕ್‌ಫ್ಲೋನಲ್ಲಿ ಲೈವ್ ಮಾಡ್ಯೂಲ್ ಸ್ಥಿತಿ.",
    systemAudit: "ಸಿಸ್ಟಮ್ ಆಡಿಟ್",
    recentActivity: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ",
    latestActions: "ಇತ್ತೀಚಿನ ಕ್ರಿಯೆಗಳು ಮತ್ತು ಸಿಸ್ಟಮ್ ಈವೆಂಟ್‌ಗಳು.",
    loadingActivity: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    noActivity: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ ಕಂಡುಬಂದಿಲ್ಲ",
    systemActivity: "ಸಿಸ್ಟಮ್ ಚಟುವಟಿಕೆ",
    general: "ಸಾಮಾನ್ಯ",
    noDescription: "ವಿವರಣೆ ಲಭ್ಯವಿಲ್ಲ",
    open: "ತೆರೆಯಿರಿ",

    revenue: "ಆದಾಯ",
    revenueHint: "ಪಾವತಿಯಾದ ಮತ್ತು ಭಾಗಶಃ ಆರ್ಡರ್‌ಗಳು",
    outstanding: "ಬಾಕಿ",
    outstandingHint: "ಇನ್ವಾಯ್ಸ್ ಬಾಕಿ ಮೊತ್ತ",
    stockAlerts: "ಸ್ಟಾಕ್ ಎಚ್ಚರಿಕೆಗಳು",
    stockAlertsHint: "ಓಪನ್ ಇನ್ವೆಂಟರಿ ಎಚ್ಚರಿಕೆಗಳು",
    notifications: "ಅಧಿಸೂಚನೆಗಳು",
    notificationsHint: "ಸಿಸ್ಟಮ್ ಅಧಿಸೂಚನೆಗಳು",

    vendors: "ವೆಂಡರ್‌ಗಳು",
    vendorsSub: "ಸಕ್ರಿಯ",
    vendorsText: "ಸಪ್ಲೈಯರ್ ಆನ್‌ಬೋರ್ಡಿಂಗ್ ಮತ್ತು ದಾಖಲೆಗಳು",
    customers: "ಗ್ರಾಹಕರು",
    customersSub: "ಸಕ್ರಿಯ",
    customersText: "B2B ಖಾತೆಗಳು ಮತ್ತು ಬೆಲೆ ನಿಯಂತ್ರಣಗಳು",
    products: "ಉತ್ಪನ್ನಗಳು",
    productsSub: "ಸಕ್ರಿಯ",
    productsText: "ಉತ್ಪನ್ನ ಮಾಸ್ಟರ್, HSN ಮತ್ತು ಬೆಲೆ",
    warehouse: "ವೇರ್‌ಹೌಸ್",
    warehouseSub: "ಸಕ್ರಿಯ",
    warehouseText: "ಸ್ಟಾಕ್, ಬ್ಯಾಚ್‌ಗಳು ಮತ್ತು ಎಕ್ಸ್‌ಪೈರಿ ಟ್ರ್ಯಾಕಿಂಗ್",
    orders: "ಆರ್ಡರ್‌ಗಳು",
    ordersSub: "ಪ್ರಗತಿಯಲ್ಲಿದೆ",
    ordersText: "ಆರ್ಡರ್ ಲೈಫ್‌ಸೈಕಲ್ ಮತ್ತು ಫುಲ್ಫಿಲ್ಮೆಂಟ್",
    delivery: "ಡೆಲಿವರಿ",
    deliverySub: "ಸಕ್ರಿಯ",
    deliveryText: "ಡಿಸ್ಪ್ಯಾಚ್, ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು POD",
  },

  hi: {
    sessionExpired: "सेशन समाप्त हो गया है। कृपया फिर से लॉगिन करें।",
    unableLoadData: "लाइव डैशबोर्ड डेटा लोड नहीं हो पाया",
    fallbackText: "सुरक्षित फॉलबैक वैल्यू दिखा रहे हैं।",
    retry: "फिर कोशिश करें",
    loading: "लोड हो रहा है",
    loadingDots: "लोड हो रहा है…",
    noItems: "कोई आइटम नहीं",
    items: "आइटम",
    commandCenter: "B2B सप्लाई चेन कमांड सेंटर",
    welcomeBack: "वापसी पर स्वागत है,",
    superAdmin: "सुपर एडमिन",
    heroDesc:
      "वेंडर्स, कस्टमर्स, प्रोडक्ट्स, वेयरहाउस, ऑर्डर्स, डिलीवरी, फाइनेंस और लाइव ऑपरेशन्स को एक प्रीमियम डैशबोर्ड से मैनेज करें।",
    refreshDashboard: "डैशबोर्ड रिफ्रेश करें",
    liveOverview: "लाइव बिजनेस ओवरव्यू",
    businessModules: "बिजनेस मॉड्यूल्स",
    operationsOverview: "ऑपरेशन्स ओवरव्यू",
    compactStatus: "आपके वर्कफ्लो में कॉम्पैक्ट लाइव मॉड्यूल स्टेटस।",
    systemAudit: "सिस्टम ऑडिट",
    recentActivity: "हाल की गतिविधि",
    latestActions: "नवीनतम कार्रवाइयां और सिस्टम इवेंट्स।",
    loadingActivity: "हाल की गतिविधि लोड हो रही है…",
    noActivity: "कोई हाल की गतिविधि नहीं मिली",
    systemActivity: "सिस्टम गतिविधि",
    general: "सामान्य",
    noDescription: "कोई विवरण उपलब्ध नहीं",
    open: "खोलें",

    revenue: "रेवेन्यू",
    revenueHint: "पेड और पार्शियल ऑर्डर्स",
    outstanding: "बकाया",
    outstandingHint: "इनवॉइस बैलेंस देय",
    stockAlerts: "स्टॉक अलर्ट्स",
    stockAlertsHint: "ओपन इन्वेंटरी अलर्ट्स",
    notifications: "नोटिफिकेशन्स",
    notificationsHint: "सिस्टम नोटिफिकेशन्स",

    vendors: "वेंडर्स",
    vendorsSub: "एक्टिव",
    vendorsText: "सप्लायर ऑनबोर्डिंग और डॉक्यूमेंट्स",
    customers: "कस्टमर्स",
    customersSub: "एक्टिव",
    customersText: "B2B अकाउंट्स और प्राइसिंग कंट्रोल्स",
    products: "प्रोडक्ट्स",
    productsSub: "एक्टिव",
    productsText: "प्रोडक्ट मास्टर, HSN और प्राइसिंग",
    warehouse: "वेयरहाउस",
    warehouseSub: "एक्टिव",
    warehouseText: "स्टॉक, बैच और एक्सपायरी ट्रैकिंग",
    orders: "ऑर्डर्स",
    ordersSub: "प्रगति में",
    ordersText: "ऑर्डर लाइफसाइकल और फुलफिलमेंट",
    delivery: "डिलीवरी",
    deliverySub: "एक्टिव",
    deliveryText: "डिस्पैच, ट्रैकिंग और POD",
  },

  te: {
    sessionExpired: "సెషన్ ముగిసింది. దయచేసి మళ్లీ లాగిన్ చేయండి.",
    unableLoadData: "లైవ్ డ్యాష్‌బోర్డ్ డేటా లోడ్ చేయలేకపోయాం",
    fallbackText: "సేఫ్ ఫాల్‌బ్యాక్ విలువలు చూపిస్తున్నాం.",
    retry: "మళ్లీ ప్రయత్నించండి",
    loading: "లోడ్ అవుతోంది",
    loadingDots: "లోడ్ అవుతోంది…",
    noItems: "ఐటంలు లేవు",
    items: "ఐటంలు",
    commandCenter: "B2B సప్లై చైన్ కమాండ్ సెంటర్",
    welcomeBack: "మళ్లీ స్వాగతం,",
    superAdmin: "సూపర్ అడ్మిన్",
    heroDesc:
      "వెండర్లు, కస్టమర్లు, ప్రొడక్ట్స్, వేర్‌హౌస్, ఆర్డర్లు, డెలివరీ, ఫైనాన్స్ మరియు లైవ్ ఆపరేషన్స్‌ను ఒకే ప్రీమియం డ్యాష్‌బోర్డ్ నుండి నిర్వహించండి.",
    refreshDashboard: "డ్యాష్‌బోర్డ్ రిఫ్రెష్ చేయండి",
    liveOverview: "లైవ్ బిజినెస్ ఓవర్వ్యూ",
    businessModules: "బిజినెస్ మాడ్యూల్స్",
    operationsOverview: "ఆపరేషన్స్ ఓవర్వ్యూ",
    compactStatus: "మీ వర్క్‌ఫ్లోలో కాంపాక్ట్ లైవ్ మాడ్యూల్ స్థితి.",
    systemAudit: "సిస్టమ్ ఆడిట్",
    recentActivity: "తాజా కార్యకలాపం",
    latestActions: "తాజా చర్యలు మరియు సిస్టమ్ ఈవెంట్స్.",
    loadingActivity: "తాజా కార్యకలాపం లోడ్ అవుతోంది…",
    noActivity: "తాజా కార్యకలాపం కనబడలేదు",
    systemActivity: "సిస్టమ్ కార్యకలాపం",
    general: "జనరల్",
    noDescription: "వివరణ అందుబాటులో లేదు",
    open: "తెరవండి",

    revenue: "ఆదాయం",
    revenueHint: "పెయిడ్ మరియు పార్టియల్ ఆర్డర్లు",
    outstanding: "బకాయి",
    outstandingHint: "ఇన్వాయిస్ బకాయి మొత్తం",
    stockAlerts: "స్టాక్ అలర్ట్స్",
    stockAlertsHint: "ఓపెన్ ఇన్వెంటరీ అలర్ట్స్",
    notifications: "నోటిఫికేషన్స్",
    notificationsHint: "సిస్టమ్ నోటిఫికేషన్స్",

    vendors: "వెండర్లు",
    vendorsSub: "యాక్టివ్",
    vendorsText: "సప్లయర్ ఆన్‌బోర్డింగ్ మరియు డాక్యుమెంట్స్",
    customers: "కస్టమర్లు",
    customersSub: "యాక్టివ్",
    customersText: "B2B అకౌంట్స్ మరియు ప్రైసింగ్ కంట్రోల్స్",
    products: "ప్రొడక్ట్స్",
    productsSub: "యాక్టివ్",
    productsText: "ప్రొడక్ట్ మాస్టర్, HSN మరియు ప్రైసింగ్",
    warehouse: "వేర్‌హౌస్",
    warehouseSub: "యాక్టివ్",
    warehouseText: "స్టాక్, బ్యాచ్‌లు మరియు ఎక్స్‌పైరీ ట్రాకింగ్",
    orders: "ఆర్డర్లు",
    ordersSub: "ప్రోగ్రెస్‌లో",
    ordersText: "ఆర్డర్ లైఫ్‌సైకిల్ మరియు ఫుల్ఫిల్‌మెంట్",
    delivery: "డెలివరీ",
    deliverySub: "యాక్టివ్",
    deliveryText: "డిస్ప్యాచ్, ట్రాకింగ్ మరియు POD",
  },
};

function getDashboardLanguage() {
  return localStorage.getItem("admin_language") || "en";
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [webProfile, setWebProfile] = useState(null);
  const [language, setLanguage] = useState(getDashboardLanguage);

  const t = useCallback(
    (key) =>
      dashboardTranslations[language]?.[key] ||
      dashboardTranslations.en[key] ||
      key,
    [language]
  );

  useEffect(() => {
    const syncLanguage = () => {
      const nextLanguage = getDashboardLanguage();
      setLanguage((current) =>
        current === nextLanguage ? current : nextLanguage
      );
    };

    syncLanguage();

    const timer = setInterval(syncLanguage, 300);
    window.addEventListener("storage", syncLanguage);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  const getProfile = useCallback(async () => {
    try {
      const res = await API.get("/api/auth/me");
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert(t("sessionExpired"));
      navigate("/");
    }
  }, [navigate, t]);

  const getSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setSummaryError("");

      const res = await API.get("/api/dashboard/summary");
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch {
      setSummary(null);
      setSummaryError(t("unableLoadData"));
    } finally {
      setLoadingSummary(false);
    }
  }, [t]);

  const loadWebProfile = useCallback(async () => {
    try {
      const res = await API.get("/api/settings/customer-website");
      if (res.data.success) setWebProfile(res.data.data || {});
    } catch {}
  }, []);

  useEffect(() => {
    getProfile();
    getSummary();
    loadWebProfile();
  }, [getProfile, getSummary, loadWebProfile]);

  const moduleCards = useMemo(() => {
    const modules = summary?.modules || {};

    return [
      {
        title: t("vendors"),
        value: modules.vendors?.total ?? 0,
        subValue: `${formatNumber(modules.vendors?.active ?? 0)} ${t(
          "vendorsSub"
        )}`,
        icon: Building2,
        text: t("vendorsText"),
        path: "/super-admin/vendors",
        accent: "#D99B00",
        bg: "#FFF4C4",
        code: "01",
      },
      {
        title: t("customers"),
        value: modules.customers?.total ?? 0,
        subValue: `${formatNumber(modules.customers?.active ?? 0)} ${t(
          "customersSub"
        )}`,
        icon: Users,
        text: t("customersText"),
        path: "/super-admin/customers",
        accent: "#111827",
        bg: "#F3F4F6",
        code: "02",
      },
      {
        title: t("products"),
        value: modules.products?.total ?? 0,
        subValue: `${formatNumber(modules.products?.active ?? 0)} ${t(
          "productsSub"
        )}`,
        icon: Package,
        text: t("productsText"),
        path: "/super-admin/products",
        accent: "#C2410C",
        bg: "#FFEDD5",
        code: "03",
      },
      {
        title: t("warehouse"),
        value: modules.warehouses?.total ?? 0,
        subValue: `${formatNumber(modules.warehouses?.active ?? 0)} ${t(
          "warehouseSub"
        )}`,
        icon: Warehouse,
        text: t("warehouseText"),
        path: "/super-admin/warehouse",
        accent: "#2563EB",
        bg: "#DBEAFE",
        code: "04",
      },
      {
        title: t("orders"),
        value: modules.orders?.total ?? 0,
        subValue: `${formatNumber(modules.orders?.pending ?? 0)} ${t(
          "ordersSub"
        )}`,
        icon: ShoppingCart,
        text: t("ordersText"),
        path: "/super-admin/orders",
        accent: "#059669",
        bg: "#D1FAE5",
        code: "05",
      },
      {
        title: t("delivery"),
        value: modules.deliveries?.total ?? 0,
        subValue: `${formatNumber(modules.deliveries?.active ?? 0)} ${t(
          "deliverySub"
        )}`,
        icon: Truck,
        text: t("deliveryText"),
        path: "/super-admin/delivery",
        accent: "#7C3AED",
        bg: "#EDE9FE",
        code: "06",
      },
    ];
  }, [summary, t]);

  const metrics = useMemo(() => {
    const m = summary?.metrics || {};

    return [
      {
        label: t("revenue"),
        value: formatCurrency(m.revenue ?? 0),
        hint: t("revenueHint"),
        icon: IndianRupee,
        color: "#16A34A",
      },
      {
        label: t("outstanding"),
        value: formatCurrency(m.unpaidAmount ?? 0),
        hint: t("outstandingHint"),
        icon: TrendingUp,
        color: "#EA580C",
      },
      {
        label: t("stockAlerts"),
        value: formatNumber(m.lowStockAlerts ?? 0),
        hint: t("stockAlertsHint"),
        icon: AlertTriangle,
        color: "#DC2626",
      },
      {
        label: t("notifications"),
        value: formatNumber(m.unreadNotifications ?? 0),
        hint: t("notificationsHint"),
        icon: Bell,
        color: "#7C3AED",
      },
    ];
  }, [summary, t]);

  const activityCountLabel = (() => {
    if (loadingSummary) return t("loadingDots");
    const len = summary?.recentActivities?.length ?? 0;
    return len > 0 ? `${formatNumber(len)} ${t("items")}` : t("noItems");
  })();

  return (
    <AdminLayout>
      <style>{css}</style>

      <div className="dash-page">
        <section className="hero-card">
          <div className="hero-bg-circle hero-circle-one" />
          <div className="hero-bg-circle hero-circle-two" />

          <div className="hero-content">
            <div className="hero-tag">
              <span />
              {t("commandCenter")}
            </div>

            <h1 className="hero-title">
              {t("welcomeBack")}{" "}
              <strong>{user?.name || t("superAdmin")}</strong>
            </h1>

            <p className="hero-desc">{t("heroDesc")}</p>

            <div className="hero-actions">
              <button
                type="button"
                className="hero-primary-btn"
                onClick={getSummary}
                disabled={loadingSummary}
              >
                <RefreshCw size={14} className={loadingSummary ? "spin" : ""} />
                {t("refreshDashboard")}
              </button>

              <div className="hero-note">{t("liveOverview")}</div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <img
              src={HERO_TRUCK_SRC}
              alt=""
              loading="eager"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        </section>

        {summaryError && (
          <div className="alert-row" role="alert">
            <div className="alert-icon">
              <AlertTriangle size={18} />
            </div>
            <span>
              {summaryError}. {t("fallbackText")}
            </span>
            <button type="button" onClick={getSummary}>
              {t("retry")}
            </button>
          </div>
        )}

        <section className="metrics-row">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              metric={metric}
              loading={loadingSummary}
            />
          ))}
        </section>

        <div className="section-header compact-header">
          <div>
            <span className="section-label">{t("businessModules")}</span>
            <h2 className="section-title">{t("operationsOverview")}</h2>
            <p className="section-caption">{t("compactStatus")}</p>
          </div>
        </div>

        <section className="dash-grid compact-grid">
          {moduleCards.map((card) => (
            <ModuleCard
              key={card.title}
              card={card}
              loading={loadingSummary}
              onOpen={() => navigate(card.path)}
              t={t}
            />
          ))}
        </section>

        <section className="activity-card">
          <div className="activity-header">
            <div>
              <span className="section-label">{t("systemAudit")}</span>
              <h2 className="section-title">{t("recentActivity")}</h2>
              <p className="section-caption">{t("latestActions")}</p>
            </div>

            <div className="activity-count">{activityCountLabel}</div>
          </div>

          <div className="activity-list">
            {summary?.recentActivities?.length ? (
              summary.recentActivities.map((item, index) => (
                <div
                  className="activity-item"
                  key={item.id ?? `${item.module}-${item.created_at}-${index}`}
                >
                  <span className="activity-dot" />
                  <div>
                    <div className="activity-title">
                      {item.action || t("systemActivity")}{" "}
                      {item.module || t("general")}
                    </div>
                    <div className="activity-desc">
                      {item.description || t("noDescription")}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                {loadingSummary ? t("loadingActivity") : t("noActivity")}
              </div>
            )}
          </div>
        </section>

        <WebsiteProfileCard profile={webProfile} onManage={() => navigate("/super-admin/settings")} />

      </div>
    </AdminLayout>
  );
}

function WebsiteProfileCard({ profile, onManage }) {
  if (profile === null) return null;

  const SOCIAL_KEYS = ["facebook_url","instagram_url","youtube_url","linkedin_url","twitter_url","whatsapp_url"];
  const activeSocialCount = SOCIAL_KEYS.filter((k) => profile[k]).length;
  const configured = profile.website_url || profile.website_avatar || profile.support_email;

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: BRAND.muted, textTransform: "uppercase" }}>Customer Channel</span>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: BRAND.black, margin: "2px 0 0" }}>Customer Website Profile</h2>
        <p style={{ fontSize: 13, color: BRAND.muted, margin: "2px 0 0" }}>Public-facing brand identity and contact links</p>
      </div>

      <div style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 16, padding: 24, display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {configured ? (
          <>
            {/* Avatar / Logo */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 90 }}>
              {profile.website_avatar ? (
                <img
                  key={toAbsUrl(profile.website_avatar)}
                  src={toAbsUrl(profile.website_avatar)}
                  alt="Website Avatar"
                  style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${BRAND.yellow}` }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: BRAND.cream, display: "flex", alignItems: "center", justifyContent: "center", border: `2px dashed ${BRAND.yellowDark}` }}>
                  <Globe2 size={28} color={BRAND.yellowDark} />
                </div>
              )}
              {profile.website_logo && (
                <img
                  key={toAbsUrl(profile.website_logo)}
                  src={toAbsUrl(profile.website_logo)}
                  alt="Logo"
                  style={{ maxHeight: 32, maxWidth: 90, objectFit: "contain" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {profile.website_url && (
                <a
                  href={toAbsUrl(profile.website_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 14, color: BRAND.black, textDecoration: "none", marginBottom: 8 }}
                >
                  <Globe2 size={14} color={BRAND.yellowDark} />
                  {profile.website_url}
                  <ExternalLink size={12} color={BRAND.muted} />
                </a>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: activeSocialCount > 0 ? "#DCFCE7" : "#F3F4F6", color: activeSocialCount > 0 ? "#166534" : BRAND.muted, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                  {activeSocialCount} / {SOCIAL_KEYS.length} Social Links Active
                </span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: BRAND.muted }}>
                {profile.support_email && <span>✉ {profile.support_email}</span>}
                {profile.support_phone && <span>📞 {profile.support_phone}</span>}
              </div>

              {profile.address && (
                <div style={{ marginTop: 6, fontSize: 12, color: BRAND.muted }}>📍 {profile.address}</div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, color: BRAND.muted }}>
            <Globe2 size={32} color={BRAND.border} />
            <span style={{ fontSize: 13 }}>Customer website profile not configured</span>
          </div>
        )}

        {/* Action */}
        <div style={{ alignSelf: "flex-start" }}>
          <button
            type="button"
            onClick={onManage}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: BRAND.black, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
          >
            <SettingsIcon size={14} />
            Manage Website Settings
          </button>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ metric, loading }) {
  const Icon = metric.icon;

  return (
    <div className="metric-card">
      <div className="metric-top">
        <div
          className="metric-icon"
          style={{ background: `${metric.color}14` }}
        >
          <Icon size={20} color={metric.color} />
        </div>
        <div className="metric-mini-line" style={{ background: metric.color }} />
      </div>

      <div className="metric-label">{metric.label}</div>
      <div className="metric-value">{loading ? "…" : metric.value}</div>
      <div className="metric-hint">{metric.hint}</div>
    </div>
  );
}

function ModuleCard({ card, loading, onOpen, t }) {
  const Icon = card.icon;

  return (
    <button className="module-card" type="button" onClick={onOpen}>
      <div className="module-code">{card.code}</div>

      <div className="module-top">
        <div
          className="module-icon"
          style={{ background: card.bg, color: card.accent }}
        >
          <Icon size={19} />
        </div>
        <div className="module-open">
          <ArrowUpRight size={13} />
        </div>
      </div>

      <div className="module-content">
        <h3 className="module-title">{card.title}</h3>

        <div className="module-value-row">
          <div className="module-value" style={{ color: card.accent }}>
            {loading ? "…" : formatNumber(card.value)}
          </div>
          <div className="module-sub">
            {loading ? t("loading") : card.subValue}
          </div>
        </div>

        <p className="module-text">{card.text}</p>
      </div>

      <div className="module-bottom">
        <span>{t("open")}</span>
        <ArrowUpRight size={12} />
      </div>
    </button>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');

  .dash-page {
    font-family: 'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
    color: ${BRAND.text};
    background: #F8F8FB;
    padding: 0;
  }

  .hero-card {
    position: relative;
    overflow: hidden;
    min-height: 256px;
    border-radius: 16px;
    padding: 30px 36px;
    margin-bottom: 24px;
    background:
      radial-gradient(circle at 85% 16%, rgba(248, 196, 0, 0.30), transparent 30%),
      linear-gradient(135deg, #FFFFFF 0%, #FFF9DE 100%);
    border: 1px solid ${BRAND.border};
    box-shadow: 0 8px 28px rgba(17, 19, 24, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
  }

  .hero-card::before {
    content: '';
    position: absolute;
    width: 330px;
    height: 330px;
    right: -120px;
    top: -112px;
    border-radius: 50%;
    background: rgba(248, 196, 0, 0.20);
    pointer-events: none;
  }

  .hero-card::after {
    content: '';
    position: absolute;
    right: 70px;
    bottom: -52px;
    width: 178px;
    height: 178px;
    border-radius: 50%;
    border: 30px solid rgba(248, 196, 0, 0.11);
    pointer-events: none;
  }

  .hero-bg-circle {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-circle-one {
    width: 94px;
    height: 94px;
    top: 48px;
    right: 310px;
    background: rgba(248, 196, 0, 0.18);
  }

  .hero-circle-two {
    width: 54px;
    height: 54px;
    right: 420px;
    bottom: 30px;
    border: 12px solid rgba(17, 19, 24, 0.05);
  }

  .hero-content {
    position: relative;
    z-index: 2;
    max-width: 700px;
    flex: 1 1 58%;
  }

  .hero-visual {
    position: relative;
    z-index: 2;
    flex: 0 0 420px;
    height: 210px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .hero-visual::before {
    content: '';
    position: absolute;
    width: 340px;
    height: 170px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.62);
    filter: blur(2px);
    transform: translateY(16px);
  }

  .hero-visual img {
    position: relative;
    z-index: 1;
    width: 460px;
    max-width: 100%;
    height: 260px;
    object-fit: cover;
    object-position: 48% 52%;
    border-radius: 22px;
    filter: drop-shadow(0 18px 28px rgba(17, 19, 24, 0.16));
    clip-path: inset(0 round 22px);
  }

  .hero-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(248, 196, 0, 0.30);
    background: ${BRAND.cream};
    color: #876B00;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .hero-tag span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #28C76F;
    box-shadow: 0 0 0 5px rgba(40, 199, 111, 0.12);
  }

  .hero-title {
    font-size: clamp(28px, 3vw, 40px);
    line-height: 1.12;
    margin: 0 0 12px;
    color: ${BRAND.text};
    letter-spacing: -0.8px;
    font-weight: 800;
  }

  .hero-title strong {
    color: ${BRAND.black};
    font-weight: 800;
  }

  .hero-desc {
    max-width: 690px;
    margin: 0;
    color: ${BRAND.muted};
    font-size: 15px;
    font-weight: 400;
    line-height: 1.65;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 22px;
    flex-wrap: wrap;
  }

  .hero-primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    border-radius: 8px;
    background: ${BRAND.yellow};
    color: ${BRAND.black};
    padding: 12px 16px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(248, 196, 0, 0.28);
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .hero-primary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 9px 24px rgba(248, 196, 0, 0.34);
  }

  .hero-primary-btn:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }

  .hero-note {
    color: ${BRAND.muted};
    font-size: 14px;
    font-weight: 500;
  }

  .alert-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding: 13px 16px;
    border-radius: 10px;
    background: #FFF1E5;
    border: 1px solid #FFD2AD;
    color: #A84F12;
    font-size: 14px;
    font-weight: 500;
  }

  .alert-icon {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: #FFE2C6;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .alert-row button {
    margin-left: auto;
    border: none;
    border-radius: 8px;
    background: #A84F12;
    color: #ffffff;
    padding: 9px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 28px;
  }

  .metric-card {
    position: relative;
    overflow: hidden;
    min-height: 138px;
    border-radius: 14px;
    padding: 20px;
    background: #FFFFFF;
    border: 1px solid ${BRAND.border};
    box-shadow: 0 6px 22px rgba(17, 19, 24, 0.045);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .metric-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(17, 19, 24, 0.08);
    border-color: rgba(248, 196, 0, 0.42);
  }

  .metric-card::after {
    content: '';
    position: absolute;
    width: 86px;
    height: 86px;
    right: -38px;
    bottom: -38px;
    border-radius: 50%;
    background: rgba(248, 196, 0, 0.10);
  }

  .metric-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }

  .metric-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .metric-mini-line {
    width: 34px;
    height: 5px;
    border-radius: 999px;
    margin-top: 10px;
    opacity: 0.75;
  }

  .metric-label {
    position: relative;
    z-index: 1;
    font-size: 13px;
    font-weight: 500;
    color: ${BRAND.muted};
    margin-bottom: 8px;
  }

  .metric-value {
    position: relative;
    z-index: 1;
    font-size: 24px;
    font-weight: 800;
    color: ${BRAND.text};
    letter-spacing: -0.55px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .metric-hint {
    position: relative;
    z-index: 1;
    margin-top: 6px;
    font-size: 12px;
    font-weight: 400;
    color: ${BRAND.muted};
  }

  .section-header {
    margin-bottom: 16px;
  }

  .compact-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }

  .section-label {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: ${BRAND.cream};
    border: 1px solid rgba(248, 196, 0, 0.26);
    color: #876B00;
    padding: 6px 11px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.55px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .section-title {
    margin: 0;
    font-size: 25px;
    font-weight: 800;
    color: ${BRAND.text};
    letter-spacing: -0.45px;
  }

  .section-caption {
    margin: 5px 0 0;
    color: ${BRAND.muted};
    font-size: 14px;
    font-weight: 400;
  }

  .dash-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .module-card {
    position: relative;
    overflow: hidden;
    text-align: left;
    min-height: 188px;
    border: none;
    border-radius: 14px;
    padding: 20px;
    background: #FFFFFF;
    box-shadow:
      0 6px 22px rgba(17, 19, 24, 0.045),
      inset 0 0 0 1px ${BRAND.border};
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  }

  .module-card:hover {
    transform: translateY(-3px);
    box-shadow:
      0 12px 32px rgba(17, 19, 24, 0.08),
      inset 0 0 0 1px rgba(248, 196, 0, 0.42);
  }

  .module-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(248, 196, 0, 0.14), transparent 42%);
    opacity: 0;
    transition: opacity 0.18s ease;
  }

  .module-card:hover::before {
    opacity: 1;
  }

  .module-code {
    position: absolute;
    right: 18px;
    top: 14px;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -1.5px;
    color: rgba(43, 44, 64, 0.055);
  }

  .module-top {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .module-icon {
    width: 46px;
    height: 46px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .module-open {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: ${BRAND.black};
    color: ${BRAND.yellow};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .module-card:hover .module-open {
    transform: rotate(12deg);
    background: ${BRAND.yellow};
    color: ${BRAND.black};
  }

  .module-content {
    position: relative;
    z-index: 1;
  }

  .module-title {
    margin: 0 0 9px;
    font-size: 17px;
    font-weight: 700;
    color: ${BRAND.text};
    letter-spacing: -0.25px;
  }

  .module-value-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 9px;
  }

  .module-value {
    font-size: 32px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: -1px;
  }

  .module-sub {
    display: inline-flex;
    border-radius: 999px;
    background: #F8F8FB;
    border: 1px solid ${BRAND.border};
    color: #4B465C;
    padding: 5px 9px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .module-text {
    margin: 0;
    min-height: 34px;
    color: ${BRAND.muted};
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1.55;
  }

  .module-bottom {
    position: relative;
    z-index: 1;
    margin-top: 15px;
    padding-top: 12px;
    border-top: 1px solid ${BRAND.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: ${BRAND.text};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .activity-card {
    margin-top: 26px;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 24px;
    border: 1px solid ${BRAND.border};
    box-shadow: 0 6px 22px rgba(17, 19, 24, 0.045);
  }

  .activity-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .activity-count {
    background: ${BRAND.yellow};
    color: ${BRAND.black};
    border-radius: 999px;
    padding: 8px 13px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .activity-list {
    display: grid;
    gap: 10px;
  }

  .activity-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    border-radius: 11px;
    padding: 14px;
    background: #F8F8FB;
    border: 1px solid ${BRAND.border};
    transition: transform 0.18s ease, border-color 0.18s ease;
  }

  .activity-item:hover {
    transform: translateX(3px);
    border-color: rgba(248, 196, 0, 0.46);
  }

  .activity-dot {
    width: 9px;
    height: 9px;
    margin-top: 7px;
    border-radius: 50%;
    background: ${BRAND.yellow};
    box-shadow: 0 0 0 5px rgba(248, 196, 0, 0.16);
    flex-shrink: 0;
  }

  .activity-title {
    font-size: 14px;
    font-weight: 700;
    color: ${BRAND.text};
    margin-bottom: 4px;
  }

  .activity-desc {
    font-size: 12.5px;
    font-weight: 400;
    color: ${BRAND.muted};
    line-height: 1.5;
  }

  .empty-state {
    padding: 22px;
    text-align: center;
    border-radius: 12px;
    background: #F8F8FB;
    border: 1px dashed ${BRAND.border};
    color: ${BRAND.muted};
    font-size: 13px;
    font-weight: 500;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .theme-dark .dash-page {
    background: #101114 !important;
    color: #F8F8FA !important;
  }

  .theme-dark .hero-card {
    background:
      radial-gradient(circle at 88% 12%, rgba(248, 196, 0, 0.18), transparent 30%),
      linear-gradient(135deg, #1B1D23 0%, #20232A 100%) !important;
    border-color: rgba(255,255,255,0.10) !important;
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.24) !important;
  }

  .theme-dark .hero-visual::before {
    background: rgba(255, 255, 255, 0.055) !important;
  }

  .theme-dark .hero-visual img {
    filter: drop-shadow(0 20px 32px rgba(0, 0, 0, 0.34));
  }

  .theme-dark .hero-title,
  .theme-dark .section-title,
  .theme-dark .metric-value,
  .theme-dark .module-title,
  .theme-dark .activity-title,
  .theme-dark .module-bottom {
    color: #F8F8FA !important;
  }

  .theme-dark .hero-title strong {
    color: ${BRAND.yellow} !important;
  }

  .theme-dark .hero-desc,
  .theme-dark .hero-note,
  .theme-dark .section-caption,
  .theme-dark .metric-label,
  .theme-dark .metric-hint,
  .theme-dark .module-text,
  .theme-dark .activity-desc {
    color: rgba(255,255,255,0.62) !important;
  }

  .theme-dark .metric-card,
  .theme-dark .module-card,
  .theme-dark .activity-card {
    background: #1B1D23 !important;
    border-color: rgba(255,255,255,0.10) !important;
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22) !important;
  }

  .theme-dark .module-sub,
  .theme-dark .activity-item,
  .theme-dark .empty-state {
    background: #22252D !important;
    border-color: rgba(255,255,255,0.10) !important;
    color: rgba(255,255,255,0.72) !important;
  }

  .theme-dark .module-bottom {
    border-top-color: rgba(255,255,255,0.10) !important;
  }

  .theme-dark .module-code {
    color: rgba(255,255,255,0.055) !important;
  }

  .theme-dark .section-label,
  .theme-dark .hero-tag {
    background: rgba(248,196,0,0.14) !important;
    border-color: rgba(248,196,0,0.30) !important;
    color: ${BRAND.yellow} !important;
  }

  .theme-dark .activity-count,
  .theme-dark .hero-primary-btn {
    color: ${BRAND.black} !important;
  }

  .theme-dark .alert-row {
    background: rgba(234, 84, 85, 0.12) !important;
    border-color: rgba(234, 84, 85, 0.22) !important;
    color: #FFB4B4 !important;
  }

  .theme-dark .alert-icon {
    background: rgba(234, 84, 85, 0.14) !important;
  }

  @media (max-width: 1340px) {
    .hero-visual {
      flex-basis: 350px;
    }

    .hero-visual img {
      width: 400px;
      height: 230px;
    }
  }

  @media (max-width: 1180px) {
    .hero-card {
      align-items: flex-start;
      flex-direction: column;
    }

    .hero-visual {
      width: 100%;
      flex: none;
      height: 230px;
      justify-content: flex-end;
    }

    .hero-visual img {
      width: min(560px, 100%);
      height: 240px;
    }

    .metrics-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dash-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .hero-card {
      border-radius: 14px;
      padding: 24px;
      min-height: auto;
    }

    .hero-title {
      font-size: 28px;
    }

    .hero-desc {
      font-size: 13px;
    }

    .hero-actions {
      margin-top: 16px;
    }

    .hero-visual {
      height: 190px;
      justify-content: center;
    }

    .hero-visual img {
      height: 200px;
      width: 100%;
      object-position: center;
    }

    .metrics-row,
    .dash-grid {
      grid-template-columns: 1fr;
    }

    .module-card {
      min-height: 170px;
    }

    .activity-header {
      flex-direction: column;
    }

    .hero-primary-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;