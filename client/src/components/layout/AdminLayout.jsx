import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeftRight,
  BarChart3,
  BadgeCheck,
  Bell,
  BellRing,
  BookOpen,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileQuestion,
  FileText,
  FolderTree,
  GitBranch,
  Globe2,
  IndianRupee,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquareText,
  Monitor,
  Moon,
  Package,
  PackageCheck,
  ReceiptText,
  Ruler,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sun,
  Tags,
  Truck,
  Users,
  Warehouse,
  Wallet,
  X,
  Activity,
  TrendingUp,
} from "lucide-react";

const LOGO_SRC = "/vivin-logo.png";

const APP_URL = "/app";
const WEBSITE_URL = "/";

// FIX #4: Removed location.pathname from dependency — only restore on collapse/expand
const SIDEBAR_SCROLL_KEY = "vivin_admin_sidebar_scroll";

const languages = [
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
  { code: "kn", label: "Kannada", short: "KN", flag: "🇮🇳" },
  { code: "hi", label: "Hindi", short: "HI", flag: "🇮🇳" },
  { code: "te", label: "Telugu", short: "TE", flag: "🇮🇳" },
];

const accentColors = [
  { name: "Purple", value: "#7367F0", dark: "#5E50EE" },
  { name: "Teal", value: "#0F9997", dark: "#0B7F7D" },
  { name: "Amber", value: "#F8C400", dark: "#DFAE00" },
  { name: "Rose", value: "#EA3B66", dark: "#D92A56" },
  { name: "Blue", value: "#2196F3", dark: "#1686DE" },
];

const customizerDefaults = {
  accent: "#7367F0",
  accentDark: "#5E50EE",
  skin: "default",
  content: "compact",
  direction: "ltr",
  semiDark: false,
};


const translations = {
  en: {
    vivinStore: "Vivin Store",
    brandTag: "B2B Supply Chain",
    searchPlaceholder: "Search page and press Enter...",
    systemOnline: "System Online",
    superAdmin: "Super Admin",
    notifications: "Notifications",
    unreadUpdates: "unread updates",
    markAllRead: "Mark all read",
    clearAll: "Clear all",
    noNotifications: "No notifications",
    accountSettings: "Account Settings",
    darkMode: "Dark mode",
    language: "Language",
    selected: "Selected",
    openApp: "Open App",
    openWebsite: "Open Website",
    signOut: "Sign Out",
    logout: "Logout",
    secureLogout: "Secure Logout",
    logoutQuestion: "Are you sure you want to logout?",
    logoutMessage:
      "Your current admin session will be closed and you will be redirected to the login page.",
    stayLoggedIn: "Stay Logged In",
    yesLogout: "Yes, Logout",
    themeCustomizer: "Theme Customizer",
    customizePreview: "Customize & Preview in Real Time",
    theming: "Theming",
    primaryColor: "Primary Color",
    mode: "Mode",
    light: "Light",
    dark: "Dark",
    system: "System",
    skin: "Skin",
    defaultSkin: "Default",
    borderedSkin: "Bordered",
    semiDark: "Semi Dark",
    layout: "Layout",
    layouts: "Layouts",
    vertical: "Vertical",
    collapsedLayout: "Collapsed",
    horizontal: "Horizontal",
    content: "Content",
    compact: "Compact",
    wide: "Wide",
    direction: "Direction",
    leftToRight: "Left to Right",
    rightToLeft: "Right to Left",
    english: "English",
    arabic: "Arabic",
    resetCustomizer: "Reset Customizer",

    // FIX #3: Notification translation keys added
    notif_order_title: "New order received",
    notif_order_message: "A customer order is waiting for confirmation.",
    notif_stock_title: "Low stock alert",
    notif_stock_message: "Some warehouse products are below minimum stock.",
    notif_payment_title: "Payment update",
    notif_payment_message: "A customer wallet transaction was completed.",

    OVERVIEW: "OVERVIEW",
    CUSTOMERS: "CUSTOMERS",
    OPERATIONS: "OPERATIONS",
    "SUPPLY CHAIN": "SUPPLY CHAIN",
    REPORTS: "REPORTS",
    SYSTEM: "SYSTEM",

    Dashboard: "Dashboard",
    Customers: "Customers",
    "Customer Groups": "Customer Groups",
    "Customer Pricing": "Customer Pricing",
    "Credit Limits": "Credit Limits",
    "Customer Wallets": "Customer Wallets",
    Transactions: "Transactions",
    "Customer Ledgers": "Customer Ledgers",
    Vendors: "Vendors",
    "All Vendors": "All Vendors",
    "Vendor Categories": "Vendor Categories",
    "Vendor Contacts": "Vendor Contacts",
    "Vendor Addresses": "Vendor Addresses",
    "Vendor Bank Accounts": "Vendor Bank Accounts",
    "Vendor Documents": "Vendor Documents",
    "Vendor Wallets": "Vendor Wallets",
    "Vendor Transactions": "Vendor Transactions",
    "Vendor Ledgers": "Vendor Ledgers",
    "Vendor Ratings": "Vendor Ratings",
    "Vendor Reports": "Vendor Reports",
    Categories: "Categories",
    "Sub Categories": "Sub Categories",
    Units: "Units",
    Brands: "Brands",
    Products: "Products",
    "All Products": "All Products",
    "Product Variants": "Product Variants",
    "Product Pricing": "Product Pricing",
    "Product Reviews": "Product Reviews",
    "Product Reports": "Product Reports",
    Procurement: "Procurement",
    "Procurement Dashboard": "Procurement Dashboard",
    "Procurement Reports": "Procurement Reports",
    "Vendor Ledgers & Statements": "Vendor Ledgers & Statements",
    "Vendor Settlement Center": "Vendor Settlement Center",
    "Quotation Comparison": "Quotation Comparison",
    "Purchase Orders": "Purchase Orders",
    "Purchase Receipts / GRN": "Purchase Receipts / GRN",
    "Purchase Payments": "Purchase Payments",
    "Purchase Returns": "Purchase Returns",
    Warehouses: "Warehouses",
    Inventory: "Inventory",
    "All Inventory": "All Inventory",
    "Inventory Batches": "Inventory Batches",
    "Inventory Alerts": "Inventory Alerts",
    "Inventory Requests": "Inventory Requests",
    "Inventory Reports": "Inventory Reports",
    "Stock Inward": "Stock Inward",
    "Stock Outward": "Stock Outward",
    "Stock Adjustment": "Stock Adjustment",
    Orders: "Orders",
    Delivery: "Delivery",
    Finance: "Finance",
    "GST Reports": "GST Reports",
    Analytics: "Analytics",
    Settings: "Settings",
  },

  kn: {
    vivinStore: "ವಿವಿನ್ ಸ್ಟೋರ್",
    brandTag: "B2B ಸರಬರಾಜು ಸರಣಿ",
    searchPlaceholder: "ಪುಟ ಹುಡುಕಿ Enter ಒತ್ತಿ...",
    systemOnline: "ಸಿಸ್ಟಮ್ ಆನ್‌ಲೈನ್",
    superAdmin: "ಸೂಪರ್ ಅಡ್ಮಿನ್",
    notifications: "ಅಧಿಸೂಚನೆಗಳು",
    unreadUpdates: "ಓದದ ಅಪ್ಡೇಟ್‌ಗಳು",
    markAllRead: "ಎಲ್ಲಾ ಓದಿದೆ ಎಂದು ಗುರುತುಮಾಡಿ",
    clearAll: "ಎಲ್ಲಾ ಕ್ಲಿಯರ್ ಮಾಡಿ",
    noNotifications: "ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ",
    accountSettings: "ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    darkMode: "ಡಾರ್ಕ್ ಮೋಡ್",
    language: "ಭಾಷೆ",
    selected: "ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ",
    openApp: "ಆಪ್ ತೆರೆಯಿರಿ",
    openWebsite: "ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಿರಿ",
    signOut: "ಸೈನ್ ಔಟ್",
    logout: "ಲಾಗೌಟ್",
    secureLogout: "ಸುರಕ್ಷಿತ ಲಾಗೌಟ್",
    logoutQuestion: "ನೀವು ಲಾಗೌಟ್ ಮಾಡಲು ಖಚಿತವೇ?",
    logoutMessage:
      "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಅಡ್ಮಿನ್ ಸೆಷನ್ ಮುಚ್ಚಲಾಗುತ್ತದೆ ಮತ್ತು ನೀವು ಲಾಗಿನ್ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತೀರಿ.",
    stayLoggedIn: "ಲಾಗಿನ್ ಆಗಿಯೇ ಇರಿ",
    yesLogout: "ಹೌದು, ಲಾಗೌಟ್",

    notif_order_title: "ಹೊಸ ಆರ್ಡರ್ ಬಂದಿದೆ",
    notif_order_message: "ಗ್ರಾಹಕರ ಆರ್ಡರ್ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದೆ.",
    notif_stock_title: "ಸ್ಟಾಕ್ ಕಡಿಮೆ ಎಚ್ಚರಿಕೆ",
    notif_stock_message: "ಕೆಲವು ಉತ್ಪನ್ನಗಳು ಕನಿಷ್ಠ ಸ್ಟಾಕ್‌ಗಿಂತ ಕೆಳಗಿದೆ.",
    notif_payment_title: "ಪಾವತಿ ಅಪ್ಡೇಟ್",
    notif_payment_message: "ಗ್ರಾಹಕ ವಾಲೆಟ್ ವ್ಯವಹಾರ ಪೂರ್ಣಗೊಂಡಿದೆ.",

    OVERVIEW: "ಒವರ್‌ವ್ಯೂ",
    CUSTOMERS: "ಗ್ರಾಹಕರು",
    OPERATIONS: "ಆಪರೇಷನ್ಸ್",
    "SUPPLY CHAIN": "ಸರಬರಾಜು ಸರಣಿ",
    REPORTS: "ರಿಪೋರ್ಟ್‌ಗಳು",
    SYSTEM: "ಸಿಸ್ಟಮ್",

    Dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    Customers: "ಗ್ರಾಹಕರು",
    "Customer Groups": "ಗ್ರಾಹಕ ಗುಂಪುಗಳು",
    "Customer Pricing": "ಗ್ರಾಹಕ ಬೆಲೆ",
    "Credit Limits": "ಕ್ರೆಡಿಟ್ ಮಿತಿ",
    "Customer Wallets": "ಗ್ರಾಹಕ ವಾಲೆಟ್",
    Transactions: "ವಹಿವಾಟುಗಳು",
    "Customer Ledgers": "ಗ್ರಾಹಕ ಲೆಡ್ಜರ್",
    Vendors: "ವೆಂಡರ್‌ಗಳು",
    "All Vendors": "All Vendors",
    "Vendor Categories": "Vendor Categories",
    "Vendor Contacts": "Vendor Contacts",
    "Vendor Addresses": "Vendor Addresses",
    "Vendor Bank Accounts": "Vendor Bank Accounts",
    "Vendor Documents": "Vendor Documents",
    "Vendor Wallets": "Vendor Wallets",
    "Vendor Transactions": "Vendor Transactions",
    "Vendor Ledgers": "Vendor Ledgers",
    "Vendor Ratings": "Vendor Ratings",
    "Vendor Reports": "Vendor Reports",
    Categories: "ಕ್ಯಾಟಗರಿಗಳು",
    "Sub Categories": "ಸಬ್ ಕ್ಯಾಟಗರಿಗಳು",
    Units: "ಯೂನಿಟ್‌ಗಳು",
    Brands: "ಬ್ರ್ಯಾಂಡ್‌ಗಳು",
    Products: "ಉತ್ಪನ್ನಗಳು",
    "All Products": "All Products",
    "Product Variants": "Product Variants",
    "Product Pricing": "Product Pricing",
    "Product Reviews": "Product Reviews",
    "Product Reports": "Product Reports",
    Procurement: "ಪ್ರೊಕ್ಯೂರ್‌ಮೆಂಟ್",
    "Procurement Dashboard": "ಪ್ರೊಕ್ಯೂರ್‌ಮೆಂಟ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "Procurement Reports": "ಪ್ರೊಕ್ಯೂರ್‌ಮೆಂಟ್ ವರದಿಗಳು",
    "Vendor Ledgers & Statements": "Vendor Ledgers & Statements",
    "Vendor Settlement Center": "Vendor Settlement Center",
    "Quotation Comparison": "ಕೋಟೇಶನ್ ಹೋಲಿಕೆ",
    "Purchase Orders": "Purchase Orders",
    "Purchase Receipts / GRN": "Purchase Receipts / GRN",
    "Purchase Payments": "Purchase Payments",
    "Purchase Returns": "Purchase Returns",
    Warehouses: "ವೇರ್‌ಹೌಸ್‌ಗಳು",
    Inventory: "ಇನ್ವೆಂಟರಿ",
    "All Inventory": "All Inventory",
    "Inventory Batches": "Inventory Batches",
    "Inventory Alerts": "Inventory Alerts",
    "Inventory Requests": "Inventory Requests",
    "Inventory Reports": "Inventory Reports",
    "Stock Inward": "ಸ್ಟಾಕ್ ಇನ್‌ವರ್ಡ್",
    "Stock Outward": "ಸ್ಟಾಕ್ ಔಟ್‌ವರ್ಡ್",
    "Stock Adjustment": "ಸ್ಟಾಕ್ ಅಡ್ಜಸ್ಟ್‌ಮೆಂಟ್",
    Orders: "ಆರ್ಡರ್‌ಗಳು",
    Delivery: "ಡೆಲಿವರಿ",
    Finance: "ಫೈನಾನ್ಸ್",
    "GST Reports": "GST ರಿಪೋರ್ಟ್‌ಗಳು",
    Analytics: "ಅನಾಲಿಟಿಕ್ಸ್",
    Settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
  },

  hi: {
    vivinStore: "विविन स्टोर",
    brandTag: "B2B सप्लाई चेन",
    searchPlaceholder: "पेज खोजें और Enter दबाएं...",
    systemOnline: "सिस्टम ऑनलाइन",
    superAdmin: "सुपर एडमिन",
    notifications: "नोटिफिकेशन",
    unreadUpdates: "अनरीड अपडेट्स",
    markAllRead: "सभी को रीड करें",
    clearAll: "सभी हटाएं",
    noNotifications: "कोई नोटिफिकेशन नहीं",
    accountSettings: "अकाउंट सेटिंग्स",
    darkMode: "डार्क मोड",
    language: "भाषा",
    selected: "चयनित",
    openApp: "ऐप खोलें",
    openWebsite: "वेबसाइट खोलें",
    signOut: "साइन आउट",
    logout: "लॉगआउट",
    secureLogout: "सिक्योर लॉगआउट",
    logoutQuestion: "क्या आप लॉगआउट करना चाहते हैं?",
    logoutMessage:
      "आपका वर्तमान एडमिन सेशन बंद हो जाएगा और आप लॉगिन पेज पर चले जाएंगे.",
    stayLoggedIn: "लॉगिन रहें",
    yesLogout: "हाँ, लॉगआउट",

    notif_order_title: "नया ऑर्डर मिला",
    notif_order_message: "एक ग्राहक का ऑर्डर पुष्टि के लिए प्रतीक्षा कर रहा है।",
    notif_stock_title: "कम स्टॉक अलर्ट",
    notif_stock_message: "कुछ वेयरहाउस उत्पाद न्यूनतम स्टॉक से नीचे हैं।",
    notif_payment_title: "पेमेंट अपडेट",
    notif_payment_message: "एक ग्राहक वॉलेट ट्रांजैक्शन पूरा हुआ।",

    OVERVIEW: "ओवरव्यू",
    CUSTOMERS: "कस्टमर्स",
    OPERATIONS: "ऑपरेशन्स",
    "SUPPLY CHAIN": "सप्लाई चेन",
    REPORTS: "रिपोर्ट्स",
    SYSTEM: "सिस्टम",

    Dashboard: "डैशबोर्ड",
    Customers: "कस्टमर्स",
    "Customer Groups": "कस्टमर ग्रुप्स",
    "Customer Pricing": "कस्टमर प्राइसिंग",
    "Credit Limits": "क्रेडिट लिमिट्स",
    "Customer Wallets": "कस्टमर वॉलेट्स",
    Transactions: "ट्रांजैक्शन्स",
    "Customer Ledgers": "कस्टमर लेजर्स",
    Vendors: "वेंडर्स",
    "All Vendors": "All Vendors",
    "Vendor Categories": "Vendor Categories",
    "Vendor Contacts": "Vendor Contacts",
    "Vendor Addresses": "Vendor Addresses",
    "Vendor Bank Accounts": "Vendor Bank Accounts",
    "Vendor Documents": "Vendor Documents",
    "Vendor Wallets": "Vendor Wallets",
    "Vendor Transactions": "Vendor Transactions",
    "Vendor Ledgers": "Vendor Ledgers",
    "Vendor Ratings": "Vendor Ratings",
    "Vendor Reports": "Vendor Reports",
    Categories: "कैटेगरीज",
    "Sub Categories": "सब कैटेगरीज",
    Units: "यूनिट्स",
    Brands: "ब्रांड्स",
    Products: "प्रोडक्ट्स",
    "All Products": "All Products",
    "Product Variants": "Product Variants",
    "Product Pricing": "Product Pricing",
    "Product Reviews": "Product Reviews",
    "Product Reports": "Product Reports",
    Procurement: "प्रोक्योरमेंट",
    "Procurement Dashboard": "प्रोक्योरमेंट डैशबोर्ड",
    "Procurement Reports": "प्रोक्योरमेंट रिपोर्ट",
    "Vendor Ledgers & Statements": "Vendor Ledgers & Statements",
    "Vendor Settlement Center": "Vendor Settlement Center",
    "Quotation Comparison": "कोटेशन तुलना",
    "Purchase Orders": "Purchase Orders",
    "Purchase Receipts / GRN": "Purchase Receipts / GRN",
    "Purchase Payments": "Purchase Payments",
    "Purchase Returns": "Purchase Returns",
    Warehouses: "वेयरहाउस",
    Inventory: "इन्वेंटरी",
    "All Inventory": "All Inventory",
    "Inventory Batches": "Inventory Batches",
    "Inventory Alerts": "Inventory Alerts",
    "Inventory Requests": "Inventory Requests",
    "Inventory Reports": "Inventory Reports",
    "Stock Inward": "स्टॉक इनवर्ड",
    "Stock Outward": "स्टॉक आउटवर्ड",
    "Stock Adjustment": "स्टॉक एडजस्टमेंट",
    Orders: "ऑर्डर्स",
    Delivery: "डिलीवरी",
    Finance: "फाइनेंस",
    "GST Reports": "GST रिपोर्ट्स",
    Analytics: "एनालिटिक्स",
    Settings: "सेटिंग्स",
  },

  te: {
    vivinStore: "వివిన్ స్టోర్",
    brandTag: "B2B సప్లై చైన్",
    searchPlaceholder: "పేజీని వెతికి Enter నొక్కండి...",
    systemOnline: "సిస్టమ్ ఆన్‌లైన్",
    superAdmin: "సూపర్ అడ్మిన్",
    notifications: "నోటిఫికేషన్స్",
    unreadUpdates: "చదవని అప్డేట్స్",
    markAllRead: "అన్నీ చదివినట్లు గుర్తించు",
    clearAll: "అన్నీ తొలగించు",
    noNotifications: "నోటిఫికేషన్స్ లేవు",
    accountSettings: "ఖాతా సెట్టింగ్స్",
    darkMode: "డార్క్ మోడ్",
    language: "భాష",
    selected: "ఎంచుకున్నారు",
    openApp: "ఆప్ తెరవండి",
    openWebsite: "వెబ్‌సైట్ తెరవండి",
    signOut: "సైన్ అవుట్",
    logout: "లాగౌట్",
    secureLogout: "సెక్యూర్ లాగౌట్",
    logoutQuestion: "మీరు లాగౌట్ చేయాలనుకుంటున్నారా?",
    logoutMessage:
      "మీ ప్రస్తుత అడ్మిన్ సెషన్ మూసివేయబడుతుంది మరియు మీరు లాగిన్ పేజీకి వెళ్తారు.",
    stayLoggedIn: "లాగిన్‌గా ఉండండి",
    yesLogout: "అవును, లాగౌట్",

    notif_order_title: "కొత్త ఆర్డర్ వచ్చింది",
    notif_order_message: "ఒక కస్టమర్ ఆర్డర్ నిర్ధారణ కోసం వేచి ఉంది.",
    notif_stock_title: "తక్కువ స్టాక్ హెచ్చరిక",
    notif_stock_message: "కొన్ని వేర్‌హౌస్ ఉత్పత్తులు కనీస స్టాక్ కంటే తక్కువగా ఉన్నాయి.",
    notif_payment_title: "చెల్లింపు అప్డేట్",
    notif_payment_message: "ఒక కస్టమర్ వాలెట్ లావాదేవీ పూర్తైంది.",

    OVERVIEW: "ఓవర్వ్యూ",
    CUSTOMERS: "కస్టమర్లు",
    OPERATIONS: "ఆపరేషన్స్",
    "SUPPLY CHAIN": "సప్లై చైన్",
    REPORTS: "రిపోర్ట్స్",
    SYSTEM: "సిస్టమ్",

    Dashboard: "డ్యాష్‌బోర్డ్",
    Customers: "కస్టమర్లు",
    "Customer Groups": "కస్టమర్ గ్రూప్స్",
    "Customer Pricing": "కస్టమర్ ప్రైసింగ్",
    "Credit Limits": "క్రెడిట్ లిమిట్స్",
    "Customer Wallets": "కస్టమర్ వాలెట్స్",
    Transactions: "ట్రాన్సాక్షన్స్",
    "Customer Ledgers": "కస్టమర్ లెడ్జర్స్",
    Vendors: "వెండర్స్",
    "All Vendors": "All Vendors",
    "Vendor Categories": "Vendor Categories",
    "Vendor Contacts": "Vendor Contacts",
    "Vendor Addresses": "Vendor Addresses",
    "Vendor Bank Accounts": "Vendor Bank Accounts",
    "Vendor Documents": "Vendor Documents",
    "Vendor Wallets": "Vendor Wallets",
    "Vendor Transactions": "Vendor Transactions",
    "Vendor Ledgers": "Vendor Ledgers",
    "Vendor Ratings": "Vendor Ratings",
    "Vendor Reports": "Vendor Reports",
    Categories: "కేటగిరీస్",
    "Sub Categories": "సబ్ కేటగిరీస్",
    Units: "యూనిట్స్",
    Brands: "బ్రాండ్స్",
    Products: "ప్రొడక్ట్స్",
    "All Products": "All Products",
    "Product Variants": "Product Variants",
    "Product Pricing": "Product Pricing",
    "Product Reviews": "Product Reviews",
    "Product Reports": "Product Reports",
    Procurement: "ప్రొక్యూర్‌మెంట్",
    "Procurement Dashboard": "ప్రొక్యూర్‌మెంట్ డ్యాష్‌బోర్డ్",
    "Procurement Reports": "ప్రొక్యూర్‌మెంట్ రిపోర్ట్లు",
    "Vendor Ledgers & Statements": "Vendor Ledgers & Statements",
    "Vendor Settlement Center": "Vendor Settlement Center",
    "Quotation Comparison": "కోటేశన్ పోలిక",
    "Purchase Orders": "Purchase Orders",
    "Purchase Receipts / GRN": "Purchase Receipts / GRN",
    "Purchase Payments": "Purchase Payments",
    "Purchase Returns": "Purchase Returns",
    Warehouses: "వేర్‌హౌసెస్",
    Inventory: "ఇన్వెంటరీ",
    "All Inventory": "All Inventory",
    "Inventory Batches": "Inventory Batches",
    "Inventory Alerts": "Inventory Alerts",
    "Inventory Requests": "Inventory Requests",
    "Inventory Reports": "Inventory Reports",
    "Stock Inward": "స్టాక్ ఇన్‌వర్డ్",
    "Stock Outward": "స్టాక్ అవుట్‌వర్డ్",
    "Stock Adjustment": "స్టాక్ అడ్జస్ట్‌మెంట్",
    Orders: "ఆర్డర్స్",
    Delivery: "డెలివరీ",
    Finance: "ఫైనాన్స్",
    "GST Reports": "GST రిపోర్ట్స్",
    Analytics: "అనలిటిక్స్",
    Settings: "సెట్టింగ్స్",
  },
};

const menuItems = [
  { title: "Dashboard", path: "/super-admin/dashboard", icon: LayoutDashboard, group: "OVERVIEW" },
  { title: "Customers", path: "/super-admin/customers", icon: Users, group: "CUSTOMERS" },
  { title: "Customer Groups", path: "/super-admin/customer-groups", icon: Tags, group: "CUSTOMERS" },
  { title: "Customer Pricing", path: "/super-admin/customer-pricing", icon: IndianRupee, group: "CUSTOMERS" },
  { title: "Credit Limits", path: "/super-admin/customer-credit-limits", icon: CreditCard, group: "CUSTOMERS" },
  { title: "Customer Wallets", path: "/super-admin/customer-wallets", icon: Wallet, group: "CUSTOMERS" },
  { title: "Transactions", path: "/super-admin/customer-transactions", icon: ArrowLeftRight, group: "CUSTOMERS" },
  { title: "Customer Ledgers", path: "/super-admin/customer-ledgers", icon: BookOpen, group: "CUSTOMERS" },
  {
    title: "Vendors",
    icon: Building2,
    group: "OPERATIONS",
    children: [
      { title: "All Vendors", path: "/super-admin/vendors", icon: Building2 },
      { title: "Vendor Categories", path: "/super-admin/vendor-categories", icon: Tags },
      { title: "Vendor Contacts", path: "/super-admin/vendor-contacts", icon: Users },
      { title: "Vendor Addresses", path: "/super-admin/vendor-addresses", icon: Warehouse },
      { title: "Vendor Bank Accounts", path: "/super-admin/vendor-bank-accounts", icon: CreditCard },
      { title: "Vendor Documents", path: "/super-admin/vendor-documents", icon: FileText },
      { title: "Vendor Wallets", path: "/super-admin/vendor-wallets", icon: Wallet },
      { title: "Vendor Transactions", path: "/super-admin/vendor-transactions", icon: ArrowLeftRight },
      { title: "Vendor Ledgers", path: "/super-admin/vendor-ledgers", icon: BookOpen },
      { title: "Vendor Ratings", path: "/super-admin/vendor-ratings", icon: BadgeCheck },
      { title: "Vendor Reports", path: "/super-admin/vendor-reports", icon: BarChart3 },
    ],
  },
  { title: "Categories", path: "/super-admin/categories", icon: FolderTree, group: "OPERATIONS" },
  { title: "Sub Categories", path: "/super-admin/sub-categories", icon: Layers3, group: "OPERATIONS" },
  { title: "Units", path: "/super-admin/units", icon: Ruler, group: "OPERATIONS" },
  { title: "Brands", path: "/super-admin/brands", icon: BadgeCheck, group: "OPERATIONS" },
  {
    title: "Products",
    icon: Package,
    group: "OPERATIONS",
    children: [
      { title: "All Products", path: "/super-admin/products", icon: Package },
      { title: "Product Variants", path: "/super-admin/product-variants", icon: Layers3 },
      { title: "Product Pricing", path: "/super-admin/product-pricing", icon: IndianRupee },
      { title: "Product Reviews", path: "/super-admin/product-reviews", icon: MessageSquareText },
      { title: "Product Reports", path: "/super-admin/product-reports", icon: BarChart3 },
    ]
  },
  {
    title: "Procurement",
    icon: ClipboardList,
    group: "SUPPLY CHAIN",
    children: [
      { title: "Master Dashboard", path: "/super-admin/procurement-master-dashboard", icon: LayoutDashboard },
      { title: "Procurement Dashboard", path: "/super-admin/procurement-dashboard", icon: LayoutDashboard },
      { title: "Procurement Reports", path: "/super-admin/procurement-reports", icon: BarChart3 },
      { title: "Vendor Ledgers & Statements", path: "/super-admin/vendor-ledgers", icon: BookOpen },
      { title: "Vendor Settlement Center", path: "/super-admin/vendor-settlements", icon: IndianRupee },
      { title: "Approval Center", path: "/super-admin/procurement-approvals", icon: ShieldCheck },
      { title: "Budget Control", path: "/super-admin/procurement-budgets", icon: Wallet },
      { title: "Vendor Performance", path: "/super-admin/vendor-performance", icon: BarChart3 },
      { title: "Procurement Audit Trail", path: "/super-admin/procurement-audit", icon: Activity },
      { title: "Procurement KPI Dashboard", path: "/super-admin/procurement-kpis", icon: BarChart3 },
      { title: "Procurement Forecasting", path: "/super-admin/procurement-forecasting", icon: TrendingUp },
      { title: "Reorder Planning", path: "/super-admin/procurement-reorder-planning", icon: ShoppingCart },
      { title: "Auto PO Creation", path: "/super-admin/procurement-auto-po", icon: ShoppingCart },
      { title: "Purchase Requisitions", path: "/super-admin/procurement-requisitions", icon: ClipboardList },
      { title: "Requisition Conversion", path: "/super-admin/procurement-requisition-conversion", icon: GitBranch },
      { title: "Vendor Rate Contracts", path: "/super-admin/vendor-rate-contracts", icon: LockKeyhole },
      { title: "Rate Contract Checks", path: "/super-admin/procurement-rate-contract-checks", icon: BadgeCheck },
      { title: "Documents", path: "/super-admin/procurement-documents", icon: FileText },
      { title: "Alerts & Reminders", path: "/super-admin/procurement-alerts", icon: BellRing },
      { title: "RFQs", path: "/super-admin/rfqs", icon: FileQuestion },
      { title: "Vendor Quotations", path: "/super-admin/vendor-quotations", icon: FileText },
      { title: "Quotation Comparison", path: "/super-admin/quotation-comparison", icon: BarChart3 },
      { title: "Purchase Orders", path: "/super-admin/purchase-orders", icon: ClipboardList },
      { title: "Purchase Receipts / GRN", path: "/super-admin/purchase-receipts", icon: PackageCheck },
      { title: "Purchase Payments", path: "/super-admin/procurement-payments", icon: Wallet },
      { title: "Purchase Returns", path: "/super-admin/procurement-returns", icon: ArrowLeftRight },
    ],
  },
  { title: "Warehouses", path: "/super-admin/warehouse", icon: Warehouse, group: "SUPPLY CHAIN" },
  {
    title: "Inventory",
    icon: Package,
    group: "SUPPLY CHAIN",
    children: [
      { title: "All Inventory", path: "/super-admin/inventory", icon: Package },
      { title: "Inventory Batches", path: "/super-admin/inventory-batches", icon: Layers3 },
      { title: "Inventory Alerts", path: "/super-admin/inventory-alerts", icon: BellRing },
      { title: "Inventory Requests", path: "/super-admin/inventory-requests", icon: ClipboardList },
      { title: "Inventory Reports", path: "/super-admin/inventory-reports", icon: BarChart3 },
      { title: "Stock Inward", path: "/super-admin/stock-inward", icon: ClipboardList },
      { title: "Stock Outward", path: "/super-admin/stock-outward", icon: FileText },
      { title: "Stock Adjustment", path: "/super-admin/stock-adjustment", icon: ClipboardCheck },
    ],
  },
  { title: "Orders", path: "/super-admin/orders", icon: ShoppingCart, group: "SUPPLY CHAIN" },
  { title: "Delivery", path: "/super-admin/delivery", icon: Truck, group: "SUPPLY CHAIN" },
  { title: "Finance", path: "/super-admin/finance", icon: ReceiptText, group: "REPORTS" },
  { title: "GST Reports", path: "/super-admin/gst", icon: FileText, group: "REPORTS" },
  { title: "Analytics", path: "/super-admin/analytics", icon: BarChart3, group: "REPORTS" },
  { title: "Settings", path: "/super-admin/settings", icon: Settings, group: "SYSTEM" },
];

const groups = ["OVERVIEW", "CUSTOMERS", "OPERATIONS", "SUPPLY CHAIN", "REPORTS", "SYSTEM"];

// FIX #3: Use translation keys instead of raw English strings
const defaultNotifications = [
  {
    id: 1,
    titleKey: "notif_order_title",
    messageKey: "notif_order_message",
    time: "Just now",
    read: false,
  },
  {
    id: 2,
    titleKey: "notif_stock_title",
    messageKey: "notif_stock_message",
    time: "10 min ago",
    read: false,
  },
  {
    id: 3,
    titleKey: "notif_payment_title",
    messageKey: "notif_payment_message",
    time: "Today",
    read: false,
  },
];

function readStoredNotifications() {
  try {
    const saved = JSON.parse(localStorage.getItem("admin_notifications"));
    return Array.isArray(saved) ? saved : defaultNotifications;
  } catch {
    return defaultNotifications;
  }
}

function normalizePath(path) {
  if (!path) return "/";
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}

const routeAliases = {
  "/super-admin/warehouse": ["/super-admin/warehouses"],
  "/super-admin/warehouses": ["/super-admin/warehouse"],
};

function isRouteActive(currentPath, targetPath) {
  const current = normalizePath(currentPath);
  const target = normalizePath(targetPath);
  const aliases = routeAliases[target] || [];

  if (current === target || aliases.includes(current)) return true;
  if (target === "/super-admin/dashboard") return false;

  return current.startsWith(`${target}/`) || aliases.some((alias) => current.startsWith(`${alias}/`));
}

function getFlatMenuItems(items) {
  return items.flatMap((item) => {
    if (!Array.isArray(item.children) || item.children.length === 0) {
      return [item];
    }

    return item.children.map((child) => ({
      ...child,
      group: item.group,
      parentTitle: item.title,
    }));
  });
}

function isParentMenuActive(currentPath, item) {
  if (!Array.isArray(item.children) || item.children.length === 0) return false;
  return item.children.some((child) => isRouteActive(currentPath, child.path));
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [now, setNow] = useState(new Date());
  const [theme, setTheme] = useState(
    () => localStorage.getItem("admin_theme") || "light"
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("admin_language") || "en"
  );
  const [topbarSearch, setTopbarSearch] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem("admin_accent_color") || customizerDefaults.accent
  );
  const [accentDark, setAccentDark] = useState(
    () => localStorage.getItem("admin_accent_dark") || customizerDefaults.accentDark
  );
  const [skin, setSkin] = useState(
    () => localStorage.getItem("admin_skin") || customizerDefaults.skin
  );
  const [contentMode, setContentMode] = useState(
    () => localStorage.getItem("admin_content_mode") || customizerDefaults.content
  );
  const [direction, setDirection] = useState(
    () => localStorage.getItem("admin_direction") || customizerDefaults.direction
  );
  const [semiDark, setSemiDark] = useState(
    () => localStorage.getItem("admin_semi_dark") === "true"
  );
  const [notifications, setNotifications] = useState(readStoredNotifications);

  // FIX #1: user derived once via useState initializer — not re-computed every render
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  });

  const selectedLanguage =
    languages.find((item) => item.code === language) || languages[0];

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  const flatMenuItems = useMemo(() => getFlatMenuItems(menuItems), []);

  useEffect(() => {
    const activeParent = menuItems.find((item) => isParentMenuActive(location.pathname, item));

    if (activeParent) {
      setOpenMenus((prev) =>
        prev[activeParent.title] ? prev : { ...prev, [activeParent.title]: true }
      );
    }
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("admin_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("admin_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("admin_accent_color", accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem("admin_accent_dark", accentDark);
  }, [accentDark]);

  useEffect(() => {
    localStorage.setItem("admin_skin", skin);
  }, [skin]);

  useEffect(() => {
    localStorage.setItem("admin_content_mode", contentMode);
  }, [contentMode]);

  useEffect(() => {
    localStorage.setItem("admin_direction", direction);
    document.documentElement.setAttribute("dir", direction);
  }, [direction]);

  useEffect(() => {
    localStorage.setItem("admin_semi_dark", String(semiDark));
  }, [semiDark]);

  // FIX #4: Only restore sidebar scroll on collapse/expand — not on every page navigation
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const savedScroll = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || 0);
    nav.scrollTop = savedScroll;
  }, [collapsed]);

  useEffect(() => {
    const closeDropdowns = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", closeDropdowns);
    return () => document.removeEventListener("mousedown", closeDropdowns);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const currentTitleKey =
    flatMenuItems.find((item) => item.path && isRouteActive(location.pathname, item.path))
      ?.title || "Dashboard";

  const currentTitle = t(currentTitleKey);
  const sideW = collapsed ? 86 : 282;

  const currentTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const currentDate = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const userInitials = (user?.name || "SA").slice(0, 2).toUpperCase();

  const saveSidebarScroll = () => {
    if (!navRef.current) return;
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(navRef.current.scrollTop));
  };

  const handleMenuNavigation = (event, path) => {
    event.preventDefault();
    saveSidebarScroll();
    setNotificationOpen(false);
    setProfileOpen(false);
    setMobileSidebarOpen(false);
    const targetPath = normalizePath(path);
    const currentPath = normalizePath(location.pathname);
    if (currentPath !== targetPath) {
      navigate(targetPath);
    }
  };

  const handleParentMenuClick = (event, item) => {
    event.preventDefault();
    saveSidebarScroll();
    setNotificationOpen(false);
    setProfileOpen(false);

    if (collapsed) {
      setCollapsed(false);
    }

    // IMPORTANT: Parent active route should open by default,
    // but user click must still close the dropdown.
    setOpenMenus((prev) => {
      const parentActiveNow = isParentMenuActive(location.pathname, item);
      const currentlyOpen = prev[item.title] ?? parentActiveNow;

      return {
        ...prev,
        [item.title]: !currentlyOpen,
      };
    });
  };

  const requestLogout = () => {
    setProfileOpen(false);
    setLogoutConfirmOpen(true);
  };

  const cancelLogout = () => {
    setLogoutConfirmOpen(false);
  };

  // FIX #2: Clear theme and language on logout so next user starts fresh
  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin_theme");
    localStorage.removeItem("admin_language");
    localStorage.removeItem("admin_notifications");
    setLogoutConfirmOpen(false);
    navigate("/");
  };

  const handleNotificationClick = (notificationId) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item
      )
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setNotificationOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const search = topbarSearch.trim().toLowerCase();
    if (!search) return;
    const matchedMenu = flatMenuItems.find((item) => {
      if (!item.path) return false;
      const originalTitle = item.title.toLowerCase();
      const translatedTitle = t(item.title).toLowerCase();
      return originalTitle.includes(search) || translatedTitle.includes(search);
    });
    if (matchedMenu) {
      saveSidebarScroll();
      navigate(matchedMenu.path);
      setTopbarSearch("");
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const openQuickLink = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const applyAccentColor = (color) => {
    setAccentColor(color.value);
    setAccentDark(color.dark);
  };

  const applySystemTheme = () => {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    setTheme(prefersDark ? "dark" : "light");
  };

  const resetCustomizer = () => {
    setAccentColor(customizerDefaults.accent);
    setAccentDark(customizerDefaults.accentDark);
    setSkin(customizerDefaults.skin);
    setContentMode(customizerDefaults.content);
    setDirection(customizerDefaults.direction);
    setSemiDark(customizerDefaults.semiDark);
    setCollapsed(false);
    setTheme("light");
  };

  return (
    <div
      className={`admin-layout theme-${theme} skin-${skin} content-${contentMode} ${
        semiDark ? "semi-dark" : ""
      } ${
        collapsed ? "is-collapsed" : ""
      } ${mobileSidebarOpen ? "mobile-sidebar-open" : ""}`}
      dir={direction}
      style={{
        "--side-w": `${sideW}px`,
        "--brand": accentColor,
        "--brand-dark": accentDark,
        "--brand-soft": `${accentColor}18`,
      }}
    >
      <style>{css}</style>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="mobile-sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <button
            type="button"
            className="brand-block"
            onClick={() => navigate("/super-admin/dashboard")}
            title="Dashboard"
          >
            <span className="brand-logo">
              <img
                src={LOGO_SRC}
                alt="Vivin Store"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.nextElementSibling.style.display = "flex";
                }}
              />
              <span className="logo-fallback">V</span>
            </span>

            {!collapsed && (
              <span className="brand-copy">
                <strong>{t("vivinStore")}</strong>
                <small>{t("brandTag")}</small>
              </span>
            )}
          </button>

          <button
            type="button"
            className="collapse-btn"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setMobileSidebarOpen(false)}
            title="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="admin-nav" ref={navRef} onScroll={saveSidebarScroll}>
          {groups.map((group) => {
            const items = menuItems.filter((item) => item.group === group);
            if (!items.length) return null;

            return (
              <div className="admin-nav-group" key={group}>
                {!collapsed && (
                  <div className="admin-group-title">{t(group)}</div>
                )}

                {items.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  const parentActive = hasChildren && isParentMenuActive(location.pathname, item);
                  const isOpen = hasChildren && (openMenus[item.title] ?? parentActive);

                  if (hasChildren) {
                    return (
                      <div
                        key={item.title}
                        className={`admin-nav-dropdown${isOpen ? " open" : ""}${parentActive ? " active" : ""}`}
                      >
                        <button
                          type="button"
                          className={`admin-nav-item admin-nav-parent${parentActive ? " active" : ""}`}
                          title={collapsed ? t(item.title) : undefined}
                          onClick={(event) => handleParentMenuClick(event, item)}
                        >
                          <span className="admin-nav-icon">
                            <Icon size={18} />
                          </span>

                          {!collapsed && (
                            <>
                              <span className="admin-nav-label">
                                {t(item.title)}
                              </span>
                              <ChevronRight
                                className={`nav-arrow dropdown-arrow${isOpen ? " rotate" : ""}`}
                                size={14}
                              />
                            </>
                          )}
                        </button>

                        {!collapsed && isOpen && (
                          <div className="admin-subnav">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;

                              return (
                                <NavLink
                                  key={child.path}
                                  to={child.path}
                                  title={t(child.title)}
                                  onClick={(event) => handleMenuNavigation(event, child.path)}
                                  className={({ isActive }) =>
                                    `admin-subnav-item${isActive ? " active" : ""}`
                                  }
                                >
                                  <span className="admin-subnav-icon">
                                    <ChildIcon size={15} />
                                  </span>
                                  <span>{t(child.title)}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // FIX #6: Use NavLink's built-in isActive — no manual active class duplication
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/super-admin/dashboard"}
                      title={collapsed ? t(item.title) : undefined}
                      onClick={(event) => handleMenuNavigation(event, item.path)}
                      className={({ isActive }) =>
                        `admin-nav-item${isActive ? " active" : ""}`
                      }
                    >
                      <span className="admin-nav-icon">
                        <Icon size={18} />
                      </span>

                      {!collapsed && (
                        <>
                          <span className="admin-nav-label">
                            {t(item.title)}
                          </span>
                          <ChevronRight className="nav-arrow" size={14} />
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user-card">
              <span className="sidebar-avatar">{userInitials}</span>
              <span className="sidebar-user-info">
                <strong>{user?.name || t("superAdmin")}</strong>
                <small>{user?.email || "admin@vivinstore.com"}</small>
              </span>
            </div>
          )}

          <button
            type="button"
            className="sidebar-logout"
            onClick={requestLogout}
            title={t("logout")}
          >
            <LogOut size={17} />
            {!collapsed && <span>{t("logout")}</span>}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(true)}
              title="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="page-title-block">
              <span className="breadcrumb-text">{t("vivinStore")}</span>
              <h1>{currentTitle}</h1>
            </div>

            <div className="topbar-search">
              <Search size={18} />
              <input
                value={topbarSearch}
                onChange={(e) => setTopbarSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t("searchPlaceholder")}
              />
            </div>
          </div>

          <div className="topbar-actions">
            <div className="time-pill">
              <strong>{currentTime}</strong>
              <span>{currentDate}</span>
            </div>

            <div className="online-pill">
              <span />
              {t("systemOnline")}
            </div>

            <button
              className="round-action-btn"
              type="button"
              title="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="notification-wrapper" ref={notificationRef}>
              <button
                className="round-action-btn"
                type="button"
                title={t("notifications")}
                onClick={() => {
                  setNotificationOpen((prev) => !prev);
                  setProfileOpen(false);
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notification-count">{unreadCount}</span>
                )}
              </button>

              {notificationOpen && (
                <div className="notification-panel">
                  <div className="panel-header">
                    <div>
                      <h3>{t("notifications")}</h3>
                      <p>
                        {unreadCount} {t("unreadUpdates")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="panel-close"
                      onClick={() => setNotificationOpen(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="notification-actions">
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      disabled={!notifications.length}
                    >
                      <CheckCheck size={14} />
                      {t("markAllRead")}
                    </button>
                    <button
                      type="button"
                      className="danger-action"
                      onClick={clearAllNotifications}
                      disabled={!notifications.length}
                    >
                      {t("clearAll")}
                    </button>
                  </div>

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="empty-notification">
                        <Bell size={24} />
                        <span>{t("noNotifications")}</span>
                      </div>
                    ) : (
                      // FIX #3: Render using titleKey/messageKey through t() for multilingual support
                      notifications.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`notification-item ${item.read ? "read" : ""}`}
                          onClick={() => handleNotificationClick(item.id)}
                        >
                          <span className="notification-dot" />
                          <span className="notification-content">
                            <strong>
                              {item.titleKey ? t(item.titleKey) : item.title}
                            </strong>
                            <small>
                              {item.messageKey ? t(item.messageKey) : item.message}
                            </small>
                            <em>{item.time}</em>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="profile-wrapper" ref={profileRef}>
              <button
                type="button"
                className="profile-trigger"
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotificationOpen(false);
                }}
              >
                <span className="top-avatar">{userInitials}</span>
                <span className="profile-trigger-text">
                  <strong>{user?.name || t("superAdmin")}</strong>
                  <small>{user?.email || "admin@vivinstore.com"}</small>
                </span>
                <span className="profile-online-dot" />
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-head">
                    <span className="profile-large-avatar">{userInitials}</span>
                    <div>
                      <h3>{user?.name || t("superAdmin")}</h3>
                      <p>{user?.email || "admin@vivinstore.com"}</p>
                      <span>{t("superAdmin")}</span>
                    </div>
                  </div>

                  <div className="profile-menu-section">
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/super-admin/settings");
                        setProfileOpen(false);
                      }}
                    >
                      <Settings size={17} />
                      {t("accountSettings")}
                    </button>

                    <button type="button" onClick={toggleTheme}>
                      {theme === "dark" ? (
                        <Moon size={17} />
                      ) : (
                        <Sun size={17} />
                      )}
                      {t("darkMode")}
                      <span
                        className={`profile-switch ${
                          theme === "dark" ? "active" : ""
                        }`}
                      >
                        <span />
                      </span>
                    </button>
                  </div>

                  <div className="profile-menu-section">
                    <div className="profile-language-title">
                      <Globe2 size={15} />
                      <span>{t("language")}</span>
                    </div>

                    <div className="profile-language-grid">
                      {languages.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          className={language === item.code ? "active" : ""}
                          onClick={() => setLanguage(item.code)}
                        >
                          <span>{item.flag}</span>
                          <strong>{item.short}</strong>
                        </button>
                      ))}
                    </div>

                    <div className="selected-language-line">
                      {selectedLanguage.label} · {t("selected")}
                    </div>
                  </div>

                  <div className="profile-menu-section">
                    <button
                      type="button"
                      onClick={() => {
                        openQuickLink(APP_URL);
                        setProfileOpen(false);
                      }}
                    >
                      <Smartphone size={17} />
                      {t("openApp")}
                      <ExternalLink size={13} className="menu-external" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openQuickLink(WEBSITE_URL);
                        setProfileOpen(false);
                      }}
                    >
                      <Globe2 size={17} />
                      {t("openWebsite")}
                      <ExternalLink size={13} className="menu-external" />
                    </button>

                    <button type="button" onClick={markAllNotificationsRead}>
                      <CheckCheck size={17} />
                      {t("markAllRead")}
                    </button>
                  </div>

                  <div className="profile-menu-section">
                    <button
                      type="button"
                      className="signout-option"
                      onClick={requestLogout}
                    >
                      <LogOut size={17} />
                      {t("signOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>


      <button
        type="button"
        className="theme-customizer-trigger"
        title={t("themeCustomizer")}
        onClick={() => setThemeCustomizerOpen(true)}
      >
        <Settings size={24} />
      </button>

      {themeCustomizerOpen && (
        <>
          <button
            type="button"
            className="theme-customizer-backdrop"
            aria-label="Close theme customizer"
            onClick={() => setThemeCustomizerOpen(false)}
          />

          <aside className="theme-customizer-drawer">
            <div className="theme-customizer-head">
              <div>
                <h2>{t("themeCustomizer")}</h2>
                <p>{t("customizePreview")}</p>
              </div>

              <div className="theme-customizer-head-actions">
                <button type="button" onClick={resetCustomizer} title={t("resetCustomizer")}>
                  <RotateCcw size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => setThemeCustomizerOpen(false)}
                  title="Close"
                >
                  <X size={26} />
                </button>
              </div>
            </div>

            <div className="theme-customizer-body">
              <div className="customizer-tag">{t("theming")}</div>

              <section className="customizer-section">
                <h3>{t("primaryColor")}</h3>
                <div className="color-grid">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`color-tile ${accentColor === color.value ? "active" : ""}`}
                      onClick={() => applyAccentColor(color)}
                      title={color.name}
                    >
                      <span style={{ background: color.value }} />
                      {accentColor === color.value && <Check size={18} />}
                    </button>
                  ))}

                  <label className="color-tile custom-color-tile" title="Custom color">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(event) => {
                        setAccentColor(event.target.value);
                        setAccentDark(event.target.value);
                      }}
                    />
                    <Settings size={18} />
                  </label>
                </div>
              </section>

              <section className="customizer-section">
                <h3>{t("mode")}</h3>
                <div className="option-grid three">
                  <button
                    type="button"
                    className={theme === "light" ? "active" : ""}
                    onClick={() => setTheme("light")}
                  >
                    <Sun size={38} />
                    <span>{t("light")}</span>
                  </button>
                  <button
                    type="button"
                    className={theme === "dark" ? "active" : ""}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon size={38} />
                    <span>{t("dark")}</span>
                  </button>
                  <button type="button" onClick={applySystemTheme}>
                    <Monitor size={38} />
                    <span>{t("system")}</span>
                  </button>
                </div>
              </section>

              <section className="customizer-section">
                <h3>{t("skin")}</h3>
                <div className="skin-grid">
                  <button
                    type="button"
                    className={skin === "default" ? "active" : ""}
                    onClick={() => setSkin("default")}
                  >
                    <span className="layout-preview default-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <strong>{t("defaultSkin")}</strong>
                  </button>
                  <button
                    type="button"
                    className={skin === "bordered" ? "active" : ""}
                    onClick={() => setSkin("bordered")}
                  >
                    <span className="layout-preview bordered-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <strong>{t("borderedSkin")}</strong>
                  </button>
                </div>
              </section>

              <section className="customizer-section customizer-switch-row">
                <h3>{t("semiDark")}</h3>
                <button
                  type="button"
                  className={`customizer-switch ${semiDark ? "active" : ""}`}
                  onClick={() => setSemiDark((prev) => !prev)}
                >
                  <span />
                </button>
              </section>

              <div className="customizer-divider" />

              <div className="customizer-tag">{t("layout")}</div>

              <section className="customizer-section">
                <h3>{t("layouts")}</h3>
                <div className="option-grid three">
                  <button
                    type="button"
                    className={!collapsed ? "active" : ""}
                    onClick={() => setCollapsed(false)}
                  >
                    <span className="layout-preview vertical-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span>{t("vertical")}</span>
                  </button>
                  <button
                    type="button"
                    className={collapsed ? "active" : ""}
                    onClick={() => setCollapsed(true)}
                  >
                    <span className="layout-preview collapsed-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span>{t("collapsedLayout")}</span>
                  </button>
                  <button type="button" disabled>
                    <span className="layout-preview horizontal-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span>{t("horizontal")}</span>
                  </button>
                </div>
              </section>

              <section className="customizer-section">
                <h3>{t("content")}</h3>
                <div className="option-grid two">
                  <button
                    type="button"
                    className={contentMode === "compact" ? "active" : ""}
                    onClick={() => setContentMode("compact")}
                  >
                    <span className="layout-preview compact-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span>{t("compact")}</span>
                  </button>
                  <button
                    type="button"
                    className={contentMode === "wide" ? "active" : ""}
                    onClick={() => setContentMode("wide")}
                  >
                    <span className="layout-preview wide-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span>{t("wide")}</span>
                  </button>
                </div>
              </section>

              <section className="customizer-section">
                <h3>{t("direction")}</h3>
                <div className="option-grid two">
                  <button
                    type="button"
                    className={direction === "ltr" ? "active" : ""}
                    onClick={() => setDirection("ltr")}
                  >
                    <span className="layout-preview ltr-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span>{t("leftToRight")}</span>
                    <small>({t("english")})</small>
                  </button>
                  <button
                    type="button"
                    className={direction === "rtl" ? "active" : ""}
                    onClick={() => setDirection("rtl")}
                  >
                    <span className="layout-preview rtl-preview">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span>{t("rightToLeft")}</span>
                    <small>({t("arabic")})</small>
                  </button>
                </div>
              </section>
            </div>
          </aside>
        </>
      )}

      {logoutConfirmOpen && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-card">
            <button
              type="button"
              className="logout-confirm-close"
              onClick={cancelLogout}
              title="Close"
            >
              <X size={16} />
            </button>

            <div className="logout-confirm-icon">
              <LogOut size={28} />
            </div>

            <div className="logout-confirm-content">
              <span>{t("secureLogout")}</span>
              <h2>{t("logoutQuestion")}</h2>
              <p>{t("logoutMessage")}</p>
            </div>

            <div className="logout-confirm-user">
              <div className="logout-confirm-avatar">{userInitials}</div>
              <div>
                <strong>{user?.name || t("superAdmin")}</strong>
                <small>{user?.email || "admin@vivinstore.com"}</small>
              </div>
            </div>

            <div className="logout-confirm-actions">
              <button
                type="button"
                className="logout-cancel-btn"
                onClick={cancelLogout}
              >
                {t("stayLoggedIn")}
              </button>

              <button
                type="button"
                className="logout-confirm-btn"
                onClick={confirmLogout}
              >
                {t("yesLogout")}
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// FIX #5 NOTE: This CSS is kept inline for now as requested.
// For better maintainability, move to AdminLayout.module.css in the future.
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    font-family: 'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #F8F8FB;
    color: #2B2C40;
  }

  button,
  input {
    font-family: inherit;
  }

  .admin-layout {
    --brand: #F8C400;
    --brand-dark: #DFAE00;
    --brand-soft: #FFF7DB;
    --brand-ink: #111318;
    --side-w: 282px;
    --main-bg: #F8F8FB;
    --sidebar-bg: #FFFFFF;
    --sidebar-border: #E6E6EA;
    --topbar-bg: #FFFFFF;
    --card-bg: #FFFFFF;
    --card-border: #E6E6EA;
    --text: #2B2C40;
    --soft-text: #4B465C;
    --muted: #6E6B7B;
    --input-bg: #FFFFFF;
    --input-border: #DBDADE;
    --shadow: 0 4px 22px rgba(17, 19, 24, 0.06);
    --dropdown-shadow: 0 18px 60px rgba(17, 19, 24, 0.14);
    --nav-hover: #F6F6F8;
    min-height: 100vh;
    display: flex;
    font-family: 'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--main-bg);
    color: var(--text);
    color-scheme: light;
    transition: background 0.25s ease, color 0.25s ease;
  }

  .admin-layout.theme-light {
    --main-bg: #F8F8FB;
    --sidebar-bg: #FFFFFF;
    --sidebar-border: #E6E6EA;
    --topbar-bg: #FFFFFF;
    --card-bg: #FFFFFF;
    --card-border: #E6E6EA;
    --text: #2B2C40;
    --soft-text: #4B465C;
    --muted: #6E6B7B;
    --input-bg: #FFFFFF;
    --input-border: #DBDADE;
    --shadow: 0 4px 22px rgba(17, 19, 24, 0.06);
    --dropdown-shadow: 0 18px 60px rgba(17, 19, 24, 0.14);
    --nav-hover: #F6F6F8;
    background: #F8F8FB;
    color-scheme: light;
  }

  .admin-layout.theme-dark {
    --main-bg: #101114;
    --sidebar-bg: #17191F;
    --sidebar-border: rgba(255, 255, 255, 0.10);
    --topbar-bg: #17191F;
    --card-bg: #1E2027;
    --card-border: rgba(255, 255, 255, 0.10);
    --text: #F8F8FA;
    --soft-text: #D0D1D8;
    --muted: #A6A7B2;
    --input-bg: #22252D;
    --input-border: rgba(255,255,255,0.14);
    --shadow: 0 18px 50px rgba(0,0,0,0.26);
    --dropdown-shadow: 0 24px 70px rgba(0,0,0,0.40);
    --nav-hover: rgba(255,255,255,0.06);
    background: #101114;
    color-scheme: dark;
  }

  .admin-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--side-w);
    min-height: 100vh;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
    z-index: 50;
    display: flex;
    flex-direction: column;
    transition: width 0.25s ease, background 0.25s ease, transform 0.25s ease;
  }

  .admin-brand {
    min-height: 90px;
    padding: 20px 24px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .is-collapsed .admin-brand {
    padding: 22px 12px 18px;
    justify-content: center;
    flex-direction: column;
  }

  .brand-block {
    min-width: 0;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 13px;
    cursor: pointer;
    padding: 0;
  }

  .brand-logo {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    flex-shrink: 0;
  }

  .brand-logo img {
    width: 76px;
    height: 66px;
    object-fit: contain;
    display: block;
  }

  .logo-fallback {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: var(--brand);
    color: var(--brand-ink);
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 900;
    display: none;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    text-align: left;
  }

  .brand-copy strong {
    color: var(--text);
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.9px;
    line-height: 1;
  }

  .brand-copy small {
    margin-top: 5px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.9px;
    text-transform: uppercase;
  }

  .collapse-btn {
    width: 31px;
    height: 31px;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
  }

  .collapse-btn:hover {
    background: var(--nav-hover);
    color: var(--brand-dark);
  }

  .is-collapsed .collapse-btn svg {
    transform: rotate(180deg);
  }

  .admin-nav {
    flex: 1;
    overflow-y: auto;
    padding: 8px 24px 18px;
    scroll-behavior: auto;
  }

  .is-collapsed .admin-nav {
    padding: 8px 14px 18px;
  }

  .admin-nav-group {
    margin-bottom: 20px;
  }

  .admin-group-title {
    color: #A8A6B3;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin: 0 0 10px 12px;
  }

  .theme-dark .admin-group-title {
    color: #BDBBC8;
  }

  .admin-nav-item {
    min-height: 44px;
    text-decoration: none;
    color: var(--soft-text);
    display: flex;
    align-items: center;
    gap: 13px;
    border-radius: 8px;
    padding: 0 14px;
    margin-bottom: 5px;
    font-size: 15px;
    font-weight: 500;
    transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
    position: relative;
  }

  .is-collapsed .admin-nav-item {
    justify-content: center;
    padding: 0;
  }

  .admin-nav-item:hover {
    background: var(--nav-hover);
    color: var(--text);
  }

  .admin-nav-item.active {
    background: var(--brand-soft);
    color: var(--brand-ink);
    box-shadow: inset 4px 0 0 var(--brand);
  }

  .theme-dark .admin-nav-item.active {
    background: rgba(248, 196, 0, 0.18);
    color: var(--brand);
    box-shadow: inset 4px 0 0 var(--brand);
  }

  .admin-nav-icon {
    width: 22px;
    min-width: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
  }

  .admin-nav-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-arrow {
    color: currentColor;
    opacity: 0.55;
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  .admin-nav-item:hover .nav-arrow,
  .admin-nav-item.active .nav-arrow {
    opacity: 1;
  }

  .admin-nav-parent {
    width: 100%;
    border: none;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .admin-nav-parent .dropdown-arrow {
    margin-left: auto;
  }

  .admin-nav-parent .dropdown-arrow.rotate,
  .admin-nav-parent:hover .dropdown-arrow.rotate,
  .admin-nav-parent.active .dropdown-arrow.rotate {
    transform: rotate(90deg);
  }

  .admin-subnav {
    margin: 3px 0 10px 32px;
    padding: 5px 0 3px 12px;
    border-left: 1px solid var(--sidebar-border);
    display: grid;
    gap: 4px;
    animation: dropdownPop 0.16s ease;
  }

  .admin-subnav-item {
    min-height: 35px;
    border-radius: 8px;
    text-decoration: none;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.18s ease, color 0.18s ease;
  }

  .admin-subnav-item:hover {
    background: var(--nav-hover);
    color: var(--text);
  }

  .admin-subnav-item.active {
    background: var(--brand-soft);
    color: var(--brand-ink);
  }

  .theme-dark .admin-subnav-item.active {
    background: rgba(248, 196, 0, 0.18);
    color: var(--brand);
  }

  .admin-subnav-icon {
    width: 18px;
    min-width: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .admin-sidebar-footer {
    padding: 16px 24px 24px;
    border-top: 1px solid var(--sidebar-border);
  }

  .is-collapsed .admin-sidebar-footer {
    padding: 16px 14px 20px;
  }

  .sidebar-user-card {
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    box-shadow: 0 4px 18px rgba(17,19,24,0.04);
  }

  .sidebar-avatar,
  .top-avatar,
  .profile-large-avatar,
  .logout-confirm-avatar {
    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
    color: var(--brand-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    position: relative;
  }

  .sidebar-avatar {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    font-size: 12px;
    flex-shrink: 0;
  }

  .sidebar-user-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .sidebar-user-info strong {
    color: var(--text);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-user-info small {
    color: var(--muted);
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-logout {
    width: 100%;
    min-height: 42px;
    border-radius: 8px;
    border: 0;
    background: transparent;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 11px;
    padding: 0 13px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.18s ease;
  }

  .is-collapsed .sidebar-logout {
    justify-content: center;
    padding: 0;
  }

  .sidebar-logout:hover {
    background: #FEF3F2;
    color: #EA5455;
  }

  .theme-dark .sidebar-logout:hover {
    background: rgba(234, 84, 85, 0.12);
    color: #FF7B7C;
  }

  .admin-main {
    min-height: 100vh;
    width: calc(100% - var(--side-w));
    margin-left: var(--side-w);
    background: var(--main-bg);
    transition: margin-left 0.25s ease, width 0.25s ease;
  }

  .admin-topbar {
    min-height: 78px;
    position: sticky;
    top: 0;
    z-index: 35;
    background: var(--topbar-bg);
    border-bottom: 1px solid var(--card-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 14px 30px;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 20px;
    min-width: 0;
    flex: 1;
  }

  .page-title-block {
    min-width: 180px;
  }

  .breadcrumb-text {
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .page-title-block h1 {
    margin: 3px 0 0;
    color: var(--text);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.35px;
  }

  .topbar-search {
    width: min(540px, 42vw);
    min-height: 48px;
    border-radius: 8px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 0 16px;
    color: var(--muted);
    transition: box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .topbar-search:focus-within {
    border-color: var(--brand);
    box-shadow: 0 3px 12px rgba(248, 196, 0, 0.18);
  }

  .topbar-search input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 15px;
    font-weight: 400;
  }

  .topbar-search input::placeholder {
    color: #8C8A98;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .time-pill {
    height: 48px;
    min-width: 148px;
    border-left: 1px solid var(--card-border);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 0 0 18px;
  }

  .time-pill strong {
    color: var(--text);
    font-size: 14px;
    font-weight: 700;
    line-height: 1.1;
  }

  .time-pill span {
    color: var(--muted);
    font-size: 12px;
    font-weight: 400;
    margin-top: 4px;
  }

  .online-pill {
    height: 36px;
    border-radius: 8px;
    border: 1px solid rgba(248, 196, 0, 0.28);
    background: var(--brand-soft);
    color: #876B00;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .theme-dark .online-pill {
    color: var(--brand);
  }

  .online-pill span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #28C76F;
    box-shadow: 0 0 0 5px rgba(40, 199, 111, 0.12);
    animation: pulse 1.8s infinite;
  }

  .round-action-btn {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--soft-text);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    transition: background 0.18s ease, color 0.18s ease;
  }

  .round-action-btn:hover,
  .profile-trigger:hover {
    background: var(--nav-hover);
    color: var(--brand-dark);
  }

  .notification-wrapper,
  .profile-wrapper {
    position: relative;
  }

  .notification-count {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: var(--brand);
    color: var(--brand-ink);
    border: 2px solid var(--topbar-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 800;
  }

  .profile-trigger {
    height: 50px;
    border: 0;
    background: transparent;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 0 0 10px;
    cursor: pointer;
    position: relative;
  }

  .top-avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    font-size: 13px;
    flex-shrink: 0;
  }

  .profile-trigger-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .profile-trigger-text strong {
    color: var(--text);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-trigger-text small {
    color: var(--muted);
    font-size: 12px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-online-dot {
    position: absolute;
    left: 46px;
    bottom: 4px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #28C76F;
    border: 2px solid var(--topbar-bg);
  }

  .notification-panel,
  .profile-dropdown {
    position: absolute;
    top: 62px;
    right: 0;
    width: 390px;
    max-width: calc(100vw - 26px);
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    box-shadow: var(--dropdown-shadow);
    overflow: hidden;
    z-index: 90;
    animation: dropdownPop 0.18s ease;
  }

  .profile-dropdown {
    width: 405px;
  }

  .panel-header,
  .profile-dropdown-head {
    padding: 18px;
    border-bottom: 1px solid var(--card-border);
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .panel-header h3,
  .profile-dropdown-head h3 {
    margin: 0;
    color: var(--text);
    font-size: 18px;
    font-weight: 700;
  }

  .panel-header p,
  .profile-dropdown-head p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 12px;
    font-weight: 400;
  }

  .panel-close {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 0;
    background: transparent;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .panel-close:hover {
    background: var(--nav-hover);
  }

  .notification-actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 11px 14px;
    border-bottom: 1px solid var(--card-border);
  }

  .notification-actions button {
    min-height: 34px;
    border-radius: 8px;
    border: 1px solid rgba(248, 196, 0, 0.28);
    background: var(--brand-soft);
    color: #876B00;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .notification-actions .danger-action {
    border-color: rgba(234, 84, 85, 0.20);
    background: #FEF3F2;
    color: #EA5455;
  }

  .notification-list {
    max-height: 335px;
    overflow-y: auto;
    padding: 10px;
  }

  .notification-item {
    width: 100%;
    border: 1px solid var(--card-border);
    background: var(--brand-soft);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 9px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    cursor: pointer;
    transition: background 0.18s ease;
  }

  .notification-item:hover {
    background: rgba(248,196,0,0.18);
  }

  .notification-item.read {
    background: transparent;
    opacity: 0.75;
  }

  .notification-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--brand);
    margin-top: 6px;
    flex-shrink: 0;
  }

  .notification-item.read .notification-dot {
    opacity: 0;
  }

  .notification-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .notification-content strong {
    color: var(--text);
    font-size: 13px;
    font-weight: 700;
  }

  .notification-content small {
    color: var(--muted);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.45;
    margin-top: 3px;
  }

  .notification-content em {
    color: var(--brand-dark);
    font-size: 10px;
    font-weight: 700;
    font-style: normal;
    margin-top: 6px;
  }

  .empty-notification {
    min-height: 150px;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .profile-dropdown-head {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .profile-large-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    font-size: 16px;
    flex-shrink: 0;
  }

  .profile-dropdown-head span {
    display: inline-flex;
    margin-top: 8px;
    border-radius: 999px;
    background: var(--brand-soft);
    border: 1px solid rgba(248, 196, 0, 0.28);
    color: #876B00;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 700;
  }

  .profile-menu-section {
    padding: 8px;
    border-bottom: 1px solid var(--card-border);
  }

  .profile-menu-section:last-child {
    border-bottom: none;
  }

  .profile-menu-section button {
    width: 100%;
    min-height: 46px;
    border: none;
    background: transparent;
    color: var(--soft-text);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 12px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
  }

  .profile-menu-section button:hover {
    background: var(--nav-hover);
    color: var(--text);
  }

  .profile-menu-section .signout-option {
    color: #EA5455;
  }

  .menu-external {
    margin-left: auto;
    opacity: 0.5;
  }

  .profile-switch {
    margin-left: auto;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background: #DBDADE;
    padding: 3px;
    display: flex;
    align-items: center;
    transition: background 0.18s ease;
  }

  .profile-switch span {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0 4px 10px rgba(17,19,24,0.18);
    transition: transform 0.18s ease;
  }

  .profile-switch.active {
    background: var(--brand);
  }

  .profile-switch.active span {
    transform: translateX(20px);
  }

  .profile-language-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 7px 10px 10px;
  }

  .profile-language-title svg {
    color: var(--brand-dark);
  }

  .profile-language-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 7px;
    padding: 0 8px 8px;
  }

  .profile-language-grid button {
    min-height: 46px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background: var(--input-bg);
    padding: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    color: var(--text);
  }

  .profile-language-grid button.active {
    background: var(--brand-soft);
    border-color: rgba(248, 196, 0, 0.40);
  }

  .profile-language-grid button span {
    font-size: 18px;
    line-height: 1;
  }

  .profile-language-grid button strong {
    font-size: 11px;
    font-weight: 800;
  }

  .selected-language-line {
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
    padding: 0 12px 8px;
  }

  .admin-content {
    padding: 26px 30px 38px;
  }

  .mobile-menu-btn,
  .mobile-sidebar-close {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--soft-text);
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .mobile-menu-btn {
    display: none;
    flex-shrink: 0;
  }

  .mobile-sidebar-close {
    display: none;
  }

  .mobile-sidebar-overlay {
    display: none;
  }

  .logout-confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background:
      radial-gradient(circle at top left, rgba(248, 196, 0, 0.10), transparent 34%),
      rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    animation: fadeIn 0.18s ease;
  }

  .logout-confirm-card {
    width: 100%;
    max-width: 440px;
    position: relative;
    border-radius: 18px;
    padding: 34px 30px 28px;
    background: #FFFFFF;
    border: 1px solid #DBDADE;
    box-shadow:
      0 18px 60px rgba(17, 19, 24, 0.16),
      0 2px 10px rgba(17, 19, 24, 0.06);
    animation: modalPop 0.22s ease-out;
  }

  .logout-confirm-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 0;
    background: #F7F7F9;
    color: #6E6B7B;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2;
  }

  .logout-confirm-close:hover {
    background: #EFEFF2;
    color: #2B2C40;
  }

  .logout-confirm-icon {
    width: 82px;
    height: 82px;
    border-radius: 26px;
    background: var(--brand-soft);
    color: var(--brand-dark);
    border: 1px solid rgba(248, 196, 0, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 32px rgba(248, 196, 0, 0.18);
    margin: 0 auto 20px;
  }

  .logout-confirm-content {
    text-align: center;
  }

  .logout-confirm-content span {
    display: inline-flex;
    align-items: center;
    background: var(--brand-soft);
    border: 1px solid rgba(248, 196, 0, 0.28);
    color: #876B00;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 13px;
  }

  .logout-confirm-content h2 {
    margin: 0;
    color: #2B2C40;
    font-size: 24px;
    line-height: 1.28;
    font-weight: 700;
    letter-spacing: -0.3px;
  }

  .logout-confirm-content p {
    margin: 12px auto 0;
    max-width: 350px;
    color: #6E6B7B;
    font-size: 15px;
    line-height: 1.6;
    font-weight: 400;
  }

  .logout-confirm-user {
    margin-top: 22px;
    padding: 12px;
    border-radius: 12px;
    background: #F8F8FB;
    border: 1px solid #DBDADE;
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .logout-confirm-avatar {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    font-size: 13px;
    flex-shrink: 0;
  }

  .logout-confirm-user strong {
    display: block;
    color: #2B2C40;
    font-size: 13px;
    font-weight: 700;
  }

  .logout-confirm-user small {
    display: block;
    margin-top: 3px;
    color: #6E6B7B;
    font-size: 12px;
    font-weight: 400;
  }

  .logout-confirm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 24px;
  }

  .logout-cancel-btn,
  .logout-confirm-btn {
    min-height: 48px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  }

  .logout-cancel-btn {
    border: 1px solid #DBDADE;
    background: #FFFFFF;
    color: #2B2C40;
  }

  .logout-cancel-btn:hover {
    background: #F7F7F9;
  }

  .logout-confirm-btn {
    border: 0;
    background: var(--brand);
    color: var(--brand-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 6px 18px rgba(248, 196, 0, 0.30);
  }

  .logout-confirm-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 9px 24px rgba(248, 196, 0, 0.36);
  }

  .is-collapsed .admin-sidebar {
    width: 86px;
  }

  .is-collapsed .brand-copy,
  .is-collapsed .admin-group-title,
  .is-collapsed .admin-nav-label,
  .is-collapsed .admin-subnav,
  .is-collapsed .sidebar-user-card,
  .is-collapsed .sidebar-logout span,
  .is-collapsed .nav-arrow {
    display: none;
  }

  ::selection {
    background: rgba(248, 196, 0, 0.35);
    color: #111318;
  }

  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(248, 196, 0, 0.55);
    border-radius: 999px;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed !important;
  }

  @keyframes dropdownPop {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalPop {
    from { opacity: 0; transform: translateY(14px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(0.92); }
  }

  @media (max-width: 1280px) {
    .time-pill,
    .online-pill,
    .profile-trigger-text {
      display: none;
    }

    .profile-trigger {
      padding: 0;
      width: 52px;
    }

    .profile-online-dot {
      left: 36px;
    }
  }

  @media (max-width: 1024px) {
    .admin-layout {
      --side-w: 86px !important;
    }

    .admin-sidebar {
      width: 86px;
    }

    .brand-copy,
    .admin-group-title,
    .admin-nav-label,
    .nav-arrow,
    .sidebar-user-card,
    .sidebar-logout span,
    .admin-subnav {
      display: none;
    }

    .admin-brand {
      padding: 22px 12px 18px;
      justify-content: center;
      flex-direction: column;
    }

    .admin-nav {
      padding: 8px 14px 18px;
    }

    .admin-nav-item {
      justify-content: center;
      padding: 0;
    }

    .sidebar-logout {
      justify-content: center;
      padding: 0;
    }
  }

  @media (max-width: 820px) {
    .admin-topbar {
      padding: 14px 18px;
      flex-direction: column;
      align-items: stretch;
    }

    .topbar-left {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .topbar-search {
      width: 100%;
    }

    .topbar-actions {
      justify-content: flex-end;
    }

    .admin-content {
      padding: 22px 18px 32px;
    }
  }

  @media (max-width: 540px) {
    .admin-main {
      width: 100%;
      margin-left: 0;
    }

    .mobile-menu-btn {
      display: flex;
    }

    .mobile-sidebar-overlay {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: block;
      border: none;
      background: rgba(17, 19, 24, 0.52);
      backdrop-filter: blur(8px);
    }

    .admin-sidebar {
      display: flex;
      width: min(320px, calc(100vw - 34px));
      transform: translateX(-105%);
      transition: transform 0.24s ease;
      z-index: 90;
    }

    .mobile-sidebar-open .admin-sidebar {
      transform: translateX(0);
    }

    .mobile-sidebar-open .brand-copy,
    .mobile-sidebar-open .admin-group-title,
    .mobile-sidebar-open .admin-nav-label,
    .mobile-sidebar-open .nav-arrow,
    .mobile-sidebar-open .sidebar-user-card,
    .mobile-sidebar-open .sidebar-logout span {
      display: flex;
    }

    .mobile-sidebar-open .brand-copy,
    .mobile-sidebar-open .sidebar-user-info {
      display: flex;
      flex-direction: column;
    }

    .mobile-sidebar-open .admin-brand {
      padding: 22px 18px 18px;
      justify-content: space-between;
      flex-direction: row;
    }

    .mobile-sidebar-open .admin-nav {
      padding: 8px 18px 18px;
    }

    .mobile-sidebar-open .admin-nav-item {
      justify-content: flex-start;
      padding: 0 14px;
    }

    .mobile-sidebar-open .sidebar-logout {
      justify-content: flex-start;
      padding: 0 13px;
    }

    .mobile-sidebar-open .collapse-btn {
      display: none;
    }

    .mobile-sidebar-open .mobile-sidebar-close {
      display: flex;
    }

    .page-title-block h1 {
      font-size: 21px;
    }

    .notification-panel,
    .profile-dropdown {
      right: -8px;
      width: calc(100vw - 24px);
    }

    .logout-confirm-actions {
      grid-template-columns: 1fr;
    }
  }

  .theme-customizer-trigger {
    position: fixed;
    right: 0;
    top: 162px;
    width: 52px;
    height: 48px;
    border: none;
    border-radius: 10px 0 0 10px;
    background: var(--brand);
    color: var(--brand-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 28px rgba(17, 19, 24, 0.18);
    z-index: 80;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .theme-customizer-trigger:hover {
    transform: translateX(-3px);
    box-shadow: 0 14px 36px rgba(17, 19, 24, 0.24);
  }

  .theme-customizer-backdrop {
    position: fixed;
    inset: 0;
    border: none;
    background: rgba(17, 19, 24, 0.18);
    z-index: 998;
    cursor: default;
  }

  .theme-customizer-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(500px, 100vw);
    height: 100vh;
    background: #FFFFFF;
    color: #4B465C;
    border-left: 1px solid #DBDADE;
    z-index: 999;
    display: flex;
    flex-direction: column;
    box-shadow: -12px 0 40px rgba(17, 19, 24, 0.14);
    animation: customizerSlide 0.22s ease;
  }

  .theme-dark .theme-customizer-drawer {
    background: #1B1D23;
    color: #F8F8FA;
    border-left-color: rgba(255,255,255,0.10);
  }

  .theme-customizer-head {
    min-height: 94px;
    padding: 22px 30px;
    border-bottom: 1px solid #DBDADE;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    flex-shrink: 0;
  }

  .theme-dark .theme-customizer-head {
    border-bottom-color: rgba(255,255,255,0.10);
  }

  .theme-customizer-head h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #4B465C;
    letter-spacing: -0.2px;
  }

  .theme-dark .theme-customizer-head h2 {
    color: #F8F8FA;
  }

  .theme-customizer-head p {
    margin: 4px 0 0;
    color: #6E6B7B;
    font-size: 15px;
    font-weight: 400;
  }

  .theme-dark .theme-customizer-head p {
    color: rgba(255,255,255,0.62);
  }

  .theme-customizer-head-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .theme-customizer-head-actions button {
    width: 34px;
    height: 34px;
    border: none;
    background: transparent;
    color: #4B465C;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 8px;
  }

  .theme-customizer-head-actions button:hover {
    background: #F6F6F8;
  }

  .theme-dark .theme-customizer-head-actions button {
    color: #F8F8FA;
  }

  .theme-dark .theme-customizer-head-actions button:hover {
    background: rgba(255,255,255,0.06);
  }

  .theme-customizer-body {
    overflow-y: auto;
    padding: 30px;
  }

  .customizer-tag {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    border-radius: 5px;
    background: var(--brand-soft);
    color: var(--brand);
    padding: 0 13px;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 26px;
  }

  .customizer-section {
    margin-bottom: 28px;
  }

  .customizer-section h3 {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 600;
    color: #4B465C;
  }

  .theme-dark .customizer-section h3 {
    color: #F8F8FA;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
  }

  .color-tile {
    height: 64px;
    border-radius: 8px;
    border: 1px solid #DBDADE;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
  }

  .theme-dark .color-tile {
    background: #22252D;
    border-color: rgba(255,255,255,0.10);
  }

  .color-tile.active {
    border-color: var(--brand);
    box-shadow: 0 0 0 1px var(--brand);
  }

  .color-tile > span {
    width: 34px;
    height: 34px;
    border-radius: 7px;
  }

  .color-tile svg {
    position: absolute;
    color: #FFFFFF;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
  }

  .custom-color-tile input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .custom-color-tile {
    background: #F6F6F8;
    color: #4B465C;
  }

  .option-grid {
    display: grid;
    gap: 18px;
  }

  .option-grid.three {
    grid-template-columns: repeat(3, 1fr);
  }

  .option-grid.two,
  .skin-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .skin-grid {
    display: grid;
    gap: 18px;
  }

  .option-grid button,
  .skin-grid button {
    min-height: 68px;
    border-radius: 8px;
    border: 1px solid #DBDADE;
    background: #FFFFFF;
    color: #6E6B7B;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
    text-align: left;
    gap: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 400;
    padding: 0 0 10px;
    overflow: hidden;
    transition: border 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  }

  .theme-dark .option-grid button,
  .theme-dark .skin-grid button {
    background: #22252D;
    border-color: rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.68);
  }

  .option-grid button.active,
  .skin-grid button.active {
    border-color: var(--brand);
    color: var(--brand);
    box-shadow: 0 0 0 1px var(--brand);
  }

  .option-grid button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .option-grid button svg {
    color: currentColor;
    align-self: center;
    margin-top: 8px;
  }

  .skin-grid strong,
  .option-grid button > span:not(.layout-preview),
  .option-grid small {
    padding: 0 10px;
    font-weight: 400;
    color: inherit;
  }

  .layout-preview {
    width: 100%;
    height: 84px;
    border-radius: 8px 8px 0 0;
    background: #F4F4F6;
    border-bottom: 1px solid #E6E6EA;
    display: grid;
    grid-template-columns: 32px 1fr;
    grid-template-rows: 18px 1fr 1fr;
    gap: 8px;
    padding: 10px;
  }

  .theme-dark .layout-preview {
    background: rgba(255,255,255,0.05);
    border-bottom-color: rgba(255,255,255,0.10);
  }

  .layout-preview i {
    display: block;
    border-radius: 3px;
    background: #D1D3DA;
    min-height: 6px;
  }

  .layout-preview i:nth-child(1) {
    grid-row: 1 / 4;
    height: 100%;
  }

  .layout-preview i:nth-child(2) {
    grid-column: 2;
    width: 92%;
  }

  .layout-preview i:nth-child(3),
  .layout-preview i:nth-child(4),
  .layout-preview i:nth-child(5),
  .layout-preview i:nth-child(6) {
    grid-column: 2;
  }

  .bordered-preview i,
  .wide-preview i,
  .horizontal-preview i,
  .rtl-preview i {
    background: transparent;
    border: 1px solid #D1D3DA;
  }

  .horizontal-preview {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 14px 1fr 1fr;
  }

  .horizontal-preview i:nth-child(1) {
    grid-column: 1 / 4;
    grid-row: 1;
  }

  .horizontal-preview i:nth-child(n + 2) {
    grid-column: auto;
    grid-row: auto;
  }

  .collapsed-preview {
    grid-template-columns: 18px 1fr;
  }

  .compact-preview {
    width: 92%;
    margin: 0 auto;
  }

  .rtl-preview {
    direction: rtl;
  }

  .customizer-switch-row {
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .customizer-switch-row h3 {
    margin: 0;
  }

  .customizer-switch {
    width: 38px;
    height: 22px;
    border: none;
    border-radius: 999px;
    background: #DBDADE;
    padding: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    transition: background 0.18s ease;
  }

  .customizer-switch span {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0 2px 6px rgba(17,19,24,0.18);
    transition: transform 0.18s ease;
  }

  .customizer-switch.active {
    background: var(--brand);
  }

  .customizer-switch.active span {
    transform: translateX(16px);
  }

  .customizer-divider {
    height: 1px;
    background: #DBDADE;
    margin: 28px 0 40px;
  }

  .theme-dark .customizer-divider {
    background: rgba(255,255,255,0.10);
  }

  .content-wide .admin-content {
    max-width: none;
  }

  .content-compact .admin-content {
    max-width: 1440px;
    margin-inline: auto;
  }

  .skin-bordered .admin-sidebar,
  .skin-bordered .admin-topbar,
  .skin-bordered .sidebar-user-card,
  .skin-bordered .notification-panel,
  .skin-bordered .profile-dropdown {
    box-shadow: none !important;
    border-width: 1px !important;
  }

  .semi-dark.theme-light .admin-sidebar {
    --sidebar-bg: #17191F;
    --sidebar-border: rgba(255,255,255,0.10);
    --text: #F8F8FA;
    --soft-text: #D0D1D8;
    --muted: #A6A7B2;
    --card-bg: #1B1D23;
    --card-border: rgba(255,255,255,0.10);
    background: #17191F;
  }

  .semi-dark.theme-light .admin-sidebar .admin-nav-item:hover {
    background: rgba(255,255,255,0.06);
  }

  .semi-dark.theme-light .admin-sidebar .brand-copy strong,
  .semi-dark.theme-light .admin-sidebar .sidebar-user-info strong {
    color: #F8F8FA;
  }

  [dir="rtl"] .admin-sidebar {
    left: auto;
    right: 0;
    border-right: 0;
    border-left: 1px solid var(--sidebar-border);
  }

  [dir="rtl"] .admin-main {
    margin-left: 0;
    margin-right: var(--side-w);
  }

  [dir="rtl"] .theme-customizer-trigger {
    right: auto;
    left: 0;
    border-radius: 0 10px 10px 0;
  }

  [dir="rtl"] .theme-customizer-drawer {
    right: auto;
    left: 0;
    border-left: 0;
    border-right: 1px solid #DBDADE;
    box-shadow: 12px 0 40px rgba(17, 19, 24, 0.14);
  }

  @keyframes customizerSlide {
    from {
      opacity: 0;
      transform: translateX(28px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 540px) {
    .theme-customizer-drawer {
      width: 100vw;
    }

    .option-grid.three,
    .option-grid.two,
    .skin-grid {
      grid-template-columns: 1fr;
    }

    .color-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    [dir="rtl"] .admin-main {
      margin-right: 0;
    }
  }

`;
