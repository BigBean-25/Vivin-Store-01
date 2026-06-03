import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import API from "../../api/axios";
import CustomerAddresses from "./CustomerAddresses";
import CustomerDetailsModal from "./CustomerDetailsModal";
import {
  BadgeCheck,
  Ban,
  Building2,
  Clock3,
  Edit3,
  Eye,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

const initialForm = {
  business_name: "",
  contact_person: "",
  email: "",
  phone: "",
  gst_number: "",
  pan_number: "",
  group_id: "",
  credit_limit: 0,
  credit_days: 0,
  status: "active",
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

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

const getStatusLabel = (status, t) => {
  const value = getStatusKey(status);
  return t(`status_${value}`);
};

const customerTranslations = {
  en: {
    failedFetchCustomers: "Failed to fetch customers",
    businessNameRequired: "Business name is required",
    failedUpdateCustomer: "Failed to update customer",
    failedCreateCustomer: "Failed to create customer",
    deactivateConfirm: "Are you sure you want to deactivate this customer?",
    failedDeactivateCustomer: "Failed to deactivate customer",

    heroKicker: "B2B Customer Command Center",
    pageTitle: "Customer Management",
    pageDesc:
      "Add and manage B2B customers, GST/PAN details, credit limit, credit days, status, address records and account activity in one premium control panel.",
    refresh: "Refresh",
    addCustomer: "Add Customer",

    totalCustomers: "Total Customers",
    totalCustomersHint: "All B2B accounts",
    activeCustomers: "Active Customers",
    activeCustomersHint: "Currently enabled",
    pendingCustomers: "Pending Customers",
    pendingCustomersHint: "Waiting for review",
    creditLimit: "Credit Limit",
    creditLimitHint: "Total approved credit",
    blockedInactive: "Blocked / Inactive",
    blockedInactiveHint: "Restricted accounts",

    updateRecord: "Update Record",
    createRecord: "Create Record",
    editCustomer: "Edit Customer",
    addNewCustomer: "Add New Customer",
    formDesc:
      "Fill customer business details, tax information, credit controls and account status.",
    businessName: "Business Name",
    contactPerson: "Contact Person",
    email: "Email",
    phone: "Phone",
    gstNumber: "GST Number",
    panNumber: "PAN Number",
    customerGroup: "Customer Group",
    selectGroup: "Select Group",
    status: "Status",
    creditDays: "Credit Days",
    cancel: "Cancel",
    saving: "Saving...",
    updateCustomer: "Update Customer",
    saveCustomer: "Save Customer",

    searchPlaceholder: "Search by name, phone, email, GST, PAN, code...",
    showing: "Showing",
    of: "of",
    customers: "customers",

    customerDatabase: "Customer Database",
    customerList: "Customer List",
    databaseDesc: "B2B customer records from MySQL database",
    liveRecords: "Live Records",
    loadingCustomers: "Loading customers...",
    loadingDesc: "Please wait while customer records are loading.",
    noCustomersFound: "No customers found",
    noCustomersDesc: "Click Add Customer to create your first B2B customer.",

    tableCustomer: "Customer",
    tableContact: "Contact",
    tableGstPan: "GST / PAN",
    tableCredit: "Credit",
    tableStatus: "Status",
    tableAction: "Action",
    code: "Code",
    gst: "GST",
    pan: "PAN",
    days: "days",

    customerAddresses: "Customer Addresses",
    viewDetails: "View Details",
    deactivateCustomer: "Deactivate Customer",

    status_active: "Active",
    status_pending: "Pending",
    status_inactive: "Inactive",
    status_blocked: "Blocked",
  },

  kn: {
    failedFetchCustomers: "ಗ್ರಾಹಕರನ್ನು ಪಡೆಯಲು ವಿಫಲವಾಗಿದೆ",
    businessNameRequired: "ಬಿಸಿನೆಸ್ ಹೆಸರು ಅಗತ್ಯ",
    failedUpdateCustomer: "ಗ್ರಾಹಕ ಅಪ್ಡೇಟ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ",
    failedCreateCustomer: "ಗ್ರಾಹಕ ರಚಿಸಲು ವಿಫಲವಾಗಿದೆ",
    deactivateConfirm: "ಈ ಗ್ರಾಹಕನನ್ನು ಡಿಯಾಕ್ಟಿವೇಟ್ ಮಾಡಲು ಖಚಿತವೇ?",
    failedDeactivateCustomer: "ಗ್ರಾಹಕ ಡಿಯಾಕ್ಟಿವೇಟ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ",

    heroKicker: "B2B ಗ್ರಾಹಕ ಕಮಾಂಡ್ ಸೆಂಟರ್",
    pageTitle: "ಗ್ರಾಹಕ ನಿರ್ವಹಣೆ",
    pageDesc:
      "B2B ಗ್ರಾಹಕರು, GST/PAN ವಿವರಗಳು, ಕ್ರೆಡಿಟ್ ಮಿತಿ, ಕ್ರೆಡಿಟ್ ದಿನಗಳು, ಸ್ಥಿತಿ, ವಿಳಾಸ ದಾಖಲೆಗಳು ಮತ್ತು ಖಾತೆ ಚಟುವಟಿಕೆಯನ್ನು ಒಂದೇ ಪ್ರೀಮಿಯಂ ಪ್ಯಾನೆಲ್‌ನಲ್ಲಿ ನಿರ್ವಹಿಸಿ.",
    refresh: "ರಿಫ್ರೆಶ್",
    addCustomer: "ಗ್ರಾಹಕ ಸೇರಿಸಿ",

    totalCustomers: "ಒಟ್ಟು ಗ್ರಾಹಕರು",
    totalCustomersHint: "ಎಲ್ಲಾ B2B ಖಾತೆಗಳು",
    activeCustomers: "ಸಕ್ರಿಯ ಗ್ರಾಹಕರು",
    activeCustomersHint: "ಪ್ರಸ್ತುತ ಸಕ್ರಿಯ",
    pendingCustomers: "ಬಾಕಿ ಗ್ರಾಹಕರು",
    pendingCustomersHint: "ಪರಿಶೀಲನೆಗಾಗಿ ಕಾಯುತ್ತಿದೆ",
    creditLimit: "ಕ್ರೆಡಿಟ್ ಮಿತಿ",
    creditLimitHint: "ಒಟ್ಟು ಅನುಮೋದಿತ ಕ್ರೆಡಿಟ್",
    blockedInactive: "ಬ್ಲಾಕ್ / ನಿಷ್ಕ್ರಿಯ",
    blockedInactiveHint: "ನಿರ್ಬಂಧಿತ ಖಾತೆಗಳು",

    updateRecord: "ದಾಖಲೆ ಅಪ್ಡೇಟ್",
    createRecord: "ದಾಖಲೆ ರಚಿಸಿ",
    editCustomer: "ಗ್ರಾಹಕ ತಿದ್ದುಪಡಿ",
    addNewCustomer: "ಹೊಸ ಗ್ರಾಹಕ ಸೇರಿಸಿ",
    formDesc:
      "ಗ್ರಾಹಕ ಬಿಸಿನೆಸ್ ವಿವರಗಳು, ತೆರಿಗೆ ಮಾಹಿತಿ, ಕ್ರೆಡಿಟ್ ನಿಯಂತ್ರಣಗಳು ಮತ್ತು ಖಾತೆ ಸ್ಥಿತಿಯನ್ನು ಭರ್ತಿ ಮಾಡಿ.",
    businessName: "ಬಿಸಿನೆಸ್ ಹೆಸರು",
    contactPerson: "ಸಂಪರ್ಕ ವ್ಯಕ್ತಿ",
    email: "ಇಮೇಲ್",
    phone: "ಫೋನ್",
    gstNumber: "GST ಸಂಖ್ಯೆ",
    panNumber: "PAN ಸಂಖ್ಯೆ",
    customerGroup: "ಗ್ರಾಹಕ ಗುಂಪು",
    selectGroup: "ಗುಂಪು ಆಯ್ಕೆಮಾಡಿ",
    status: "ಸ್ಥಿತಿ",
    creditDays: "ಕ್ರೆಡಿಟ್ ದಿನಗಳು",
    cancel: "ರದ್ದುಮಾಡಿ",
    saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ...",
    updateCustomer: "ಗ್ರಾಹಕ ಅಪ್ಡೇಟ್",
    saveCustomer: "ಗ್ರಾಹಕ ಉಳಿಸಿ",

    searchPlaceholder: "ಹೆಸರು, ಫೋನ್, ಇಮೇಲ್, GST, PAN, ಕೋಡ್ ಮೂಲಕ ಹುಡುಕಿ...",
    showing: "ತೋರಿಸಲಾಗುತ್ತಿದೆ",
    of: "ಇಂದ",
    customers: "ಗ್ರಾಹಕರು",

    customerDatabase: "ಗ್ರಾಹಕ ಡೇಟಾಬೇಸ್",
    customerList: "ಗ್ರಾಹಕ ಪಟ್ಟಿ",
    databaseDesc: "MySQL ಡೇಟಾಬೇಸ್‌ನಿಂದ B2B ಗ್ರಾಹಕ ದಾಖಲೆಗಳು",
    liveRecords: "ಲೈವ್ ದಾಖಲೆಗಳು",
    loadingCustomers: "ಗ್ರಾಹಕರು ಲೋಡ್ ಆಗುತ್ತಿದ್ದಾರೆ...",
    loadingDesc: "ಗ್ರಾಹಕ ದಾಖಲೆಗಳು ಲೋಡ್ ಆಗುವವರೆಗೆ ಕಾಯಿರಿ.",
    noCustomersFound: "ಗ್ರಾಹಕರು ಕಂಡುಬಂದಿಲ್ಲ",
    noCustomersDesc: "ಮೊದಲ B2B ಗ್ರಾಹಕ ರಚಿಸಲು ಗ್ರಾಹಕ ಸೇರಿಸಿ ಕ್ಲಿಕ್ ಮಾಡಿ.",

    tableCustomer: "ಗ್ರಾಹಕ",
    tableContact: "ಸಂಪರ್ಕ",
    tableGstPan: "GST / PAN",
    tableCredit: "ಕ್ರೆಡಿಟ್",
    tableStatus: "ಸ್ಥಿತಿ",
    tableAction: "ಕ್ರಿಯೆ",
    code: "ಕೋಡ್",
    gst: "GST",
    pan: "PAN",
    days: "ದಿನಗಳು",

    customerAddresses: "ಗ್ರಾಹಕ ವಿಳಾಸಗಳು",
    viewDetails: "ವಿವರಗಳನ್ನು ನೋಡಿ",
    deactivateCustomer: "ಗ್ರಾಹಕ ಡಿಯಾಕ್ಟಿವೇಟ್",

    status_active: "ಸಕ್ರಿಯ",
    status_pending: "ಬಾಕಿ",
    status_inactive: "ನಿಷ್ಕ್ರಿಯ",
    status_blocked: "ಬ್ಲಾಕ್",
  },

  hi: {
    failedFetchCustomers: "कस्टमर्स लोड करने में विफल",
    businessNameRequired: "बिजनेस नाम आवश्यक है",
    failedUpdateCustomer: "कस्टमर अपडेट करने में विफल",
    failedCreateCustomer: "कस्टमर बनाने में विफल",
    deactivateConfirm: "क्या आप इस कस्टमर को डिएक्टिवेट करना चाहते हैं?",
    failedDeactivateCustomer: "कस्टमर डिएक्टिवेट करने में विफल",

    heroKicker: "B2B कस्टमर कमांड सेंटर",
    pageTitle: "कस्टमर मैनेजमेंट",
    pageDesc:
      "B2B कस्टमर्स, GST/PAN डिटेल्स, क्रेडिट लिमिट, क्रेडिट डेज, स्टेटस, एड्रेस रिकॉर्ड्स और अकाउंट एक्टिविटी को एक प्रीमियम कंट्रोल पैनल में मैनेज करें.",
    refresh: "रिफ्रेश",
    addCustomer: "कस्टमर जोड़ें",

    totalCustomers: "कुल कस्टमर्स",
    totalCustomersHint: "सभी B2B अकाउंट्स",
    activeCustomers: "एक्टिव कस्टमर्स",
    activeCustomersHint: "वर्तमान में सक्षम",
    pendingCustomers: "पेंडिंग कस्टमर्स",
    pendingCustomersHint: "रिव्यू के लिए प्रतीक्षा",
    creditLimit: "क्रेडिट लिमिट",
    creditLimitHint: "कुल अप्रूव्ड क्रेडिट",
    blockedInactive: "ब्लॉक / इनएक्टिव",
    blockedInactiveHint: "रिस्ट्रिक्टेड अकाउंट्स",

    updateRecord: "रिकॉर्ड अपडेट",
    createRecord: "रिकॉर्ड बनाएं",
    editCustomer: "कस्टमर एडिट",
    addNewCustomer: "नया कस्टमर जोड़ें",
    formDesc:
      "कस्टमर बिजनेस डिटेल्स, टैक्स जानकारी, क्रेडिट कंट्रोल्स और अकाउंट स्टेटस भरें.",
    businessName: "बिजनेस नाम",
    contactPerson: "कॉन्टैक्ट पर्सन",
    email: "ईमेल",
    phone: "फोन",
    gstNumber: "GST नंबर",
    panNumber: "PAN नंबर",
    customerGroup: "कस्टमर ग्रुप",
    selectGroup: "ग्रुप चुनें",
    status: "स्टेटस",
    creditDays: "क्रेडिट डेज",
    cancel: "कैंसल",
    saving: "सेव हो रहा है...",
    updateCustomer: "कस्टमर अपडेट",
    saveCustomer: "कस्टमर सेव",

    searchPlaceholder: "नाम, फोन, ईमेल, GST, PAN, कोड से खोजें...",
    showing: "दिखा रहे हैं",
    of: "में से",
    customers: "कस्टमर्स",

    customerDatabase: "कस्टमर डेटाबेस",
    customerList: "कस्टमर लिस्ट",
    databaseDesc: "MySQL डेटाबेस से B2B कस्टमर रिकॉर्ड्स",
    liveRecords: "लाइव रिकॉर्ड्स",
    loadingCustomers: "कस्टमर्स लोड हो रहे हैं...",
    loadingDesc: "कृपया प्रतीक्षा करें, कस्टमर रिकॉर्ड्स लोड हो रहे हैं.",
    noCustomersFound: "कोई कस्टमर नहीं मिला",
    noCustomersDesc: "पहला B2B कस्टमर बनाने के लिए Add Customer क्लिक करें.",

    tableCustomer: "कस्टमर",
    tableContact: "कॉन्टैक्ट",
    tableGstPan: "GST / PAN",
    tableCredit: "क्रेडिट",
    tableStatus: "स्टेटस",
    tableAction: "एक्शन",
    code: "कोड",
    gst: "GST",
    pan: "PAN",
    days: "दिन",

    customerAddresses: "कस्टमर एड्रेस",
    viewDetails: "डिटेल्स देखें",
    deactivateCustomer: "कस्टमर डिएक्टिवेट",

    status_active: "एक्टिव",
    status_pending: "पेंडिंग",
    status_inactive: "इनएक्टिव",
    status_blocked: "ब्लॉक",
  },

  te: {
    failedFetchCustomers: "కస్టమర్లను లోడ్ చేయడంలో విఫలమైంది",
    businessNameRequired: "బిజినెస్ పేరు అవసరం",
    failedUpdateCustomer: "కస్టమర్ అప్డేట్ చేయడంలో విఫలమైంది",
    failedCreateCustomer: "కస్టమర్ సృష్టించడంలో విఫలమైంది",
    deactivateConfirm: "ఈ కస్టమర్‌ను డియాక్టివేట్ చేయాలనుకుంటున్నారా?",
    failedDeactivateCustomer: "కస్టమర్ డియాక్టివేట్ చేయడంలో విఫలమైంది",

    heroKicker: "B2B కస్టమర్ కమాండ్ సెంటర్",
    pageTitle: "కస్టమర్ మేనేజ్‌మెంట్",
    pageDesc:
      "B2B కస్టమర్లు, GST/PAN వివరాలు, క్రెడిట్ లిమిట్, క్రెడిట్ డేస్, స్టేటస్, అడ్రస్ రికార్డ్స్ మరియు అకౌంట్ యాక్టివిటీని ఒకే ప్రీమియం కంట్రోల్ ప్యానెల్‌లో నిర్వహించండి.",
    refresh: "రిఫ్రెష్",
    addCustomer: "కస్టమర్ జోడించండి",

    totalCustomers: "మొత్తం కస్టమర్లు",
    totalCustomersHint: "అన్ని B2B అకౌంట్లు",
    activeCustomers: "యాక్టివ్ కస్టమర్లు",
    activeCustomersHint: "ప్రస్తుతం యాక్టివ్",
    pendingCustomers: "పెండింగ్ కస్టమర్లు",
    pendingCustomersHint: "రివ్యూ కోసం వేచి ఉంది",
    creditLimit: "క్రెడిట్ లిమిట్",
    creditLimitHint: "మొత్తం ఆమోదిత క్రెడిట్",
    blockedInactive: "బ్లాక్ / ఇనాక్టివ్",
    blockedInactiveHint: "రెస్ట్రిక్టెడ్ అకౌంట్లు",

    updateRecord: "రికార్డ్ అప్డేట్",
    createRecord: "రికార్డ్ సృష్టించండి",
    editCustomer: "కస్టమర్ ఎడిట్",
    addNewCustomer: "కొత్త కస్టమర్ జోడించండి",
    formDesc:
      "కస్టమర్ బిజినెస్ వివరాలు, ట్యాక్స్ సమాచారం, క్రెడిట్ కంట్రోల్స్ మరియు అకౌంట్ స్టేటస్‌ను భర్తీ చేయండి.",
    businessName: "బిజినెస్ పేరు",
    contactPerson: "కాంటాక్ట్ పర్సన్",
    email: "ఇమెయిల్",
    phone: "ఫోన్",
    gstNumber: "GST నంబర్",
    panNumber: "PAN నంబర్",
    customerGroup: "కస్టమర్ గ్రూప్",
    selectGroup: "గ్రూప్ ఎంచుకోండి",
    status: "స్టేటస్",
    creditDays: "క్రెడిట్ డేస్",
    cancel: "క్యాన్సెల్",
    saving: "సేవ్ అవుతోంది...",
    updateCustomer: "కస్టమర్ అప్డేట్",
    saveCustomer: "కస్టమర్ సేవ్",

    searchPlaceholder: "పేరు, ఫోన్, ఇమెయిల్, GST, PAN, కోడ్ ద్వారా వెతకండి...",
    showing: "చూపిస్తున్నాం",
    of: "లో",
    customers: "కస్టమర్లు",

    customerDatabase: "కస్టమర్ డేటాబేస్",
    customerList: "కస్టమర్ లిస్ట్",
    databaseDesc: "MySQL డేటాబేస్ నుండి B2B కస్టమర్ రికార్డ్స్",
    liveRecords: "లైవ్ రికార్డ్స్",
    loadingCustomers: "కస్టమర్లు లోడ్ అవుతున్నారు...",
    loadingDesc: "కస్టమర్ రికార్డ్స్ లోడ్ అయ్యే వరకు వేచి ఉండండి.",
    noCustomersFound: "కస్టమర్లు కనబడలేదు",
    noCustomersDesc: "మొదటి B2B కస్టమర్ సృష్టించడానికి Add Customer క్లిక్ చేయండి.",

    tableCustomer: "కస్టమర్",
    tableContact: "కాంటాక్ట్",
    tableGstPan: "GST / PAN",
    tableCredit: "క్రెడిట్",
    tableStatus: "స్టేటస్",
    tableAction: "యాక్షన్",
    code: "కోడ్",
    gst: "GST",
    pan: "PAN",
    days: "రోజులు",

    customerAddresses: "కస్టమర్ అడ్రెస్స్",
    viewDetails: "వివరాలు చూడండి",
    deactivateCustomer: "కస్టమర్ డియాక్టివేట్",

    status_active: "యాక్టివ్",
    status_pending: "పెండింగ్",
    status_inactive: "ఇనాక్టివ్",
    status_blocked: "బ్లాక్",
  },
};

function getCustomerLanguage() {
  return localStorage.getItem("admin_language") || "en";
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [language, setLanguage] = useState(getCustomerLanguage);

  const t = useCallback(
    (key) =>
      customerTranslations[language]?.[key] ||
      customerTranslations.en[key] ||
      key,
    [language]
  );

  useEffect(() => {
    const syncLanguage = () => {
      const nextLanguage = getCustomerLanguage();
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

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/api/customers");

      if (res.data.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("failedFetchCustomers"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerGroups = async () => {
    try {
      const res = await API.get("/api/customer-groups");

      if (res.data.success) {
        setCustomerGroups(res.data.groups || []);
      }
    } catch (err) {
      console.log("Customer groups fetch failed:", err.response?.data?.message);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchCustomerGroups();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const text = `
        ${customer.business_name || ""}
        ${customer.contact_person || ""}
        ${customer.email || ""}
        ${customer.phone || ""}
        ${customer.gst_number || ""}
        ${customer.pan_number || ""}
        ${customer.customer_code || ""}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [customers, search]);

  const summaryCards = useMemo(() => {
    const active = customers.filter(
      (c) => getStatusKey(c.status) === "active"
    ).length;

    const pending = customers.filter(
      (c) => getStatusKey(c.status) === "pending"
    ).length;

    const inactive = customers.filter((c) =>
      ["inactive", "blocked"].includes(getStatusKey(c.status))
    ).length;

    const totalCredit = customers.reduce(
      (sum, c) => sum + Number(c.credit_limit || 0),
      0
    );

    return [
      {
        label: t("totalCustomers"),
        value: formatNumber(customers.length),
        hint: t("totalCustomersHint"),
        icon: Users,
        color: "#D9A900",
      },
      {
        label: t("activeCustomers"),
        value: formatNumber(active),
        hint: t("activeCustomersHint"),
        icon: UserCheck,
        color: "#16A34A",
      },
      {
        label: t("pendingCustomers"),
        value: formatNumber(pending),
        hint: t("pendingCustomersHint"),
        icon: Clock3,
        color: "#EA580C",
      },
      {
        label: t("creditLimit"),
        value: formatCurrency(totalCredit),
        hint: t("creditLimitHint"),
        icon: ShieldCheck,
        color: "#2563EB",
      },
      {
        label: t("blockedInactive"),
        value: formatNumber(inactive),
        hint: t("blockedInactiveHint"),
        icon: Ban,
        color: "#DC2626",
      },
    ];
  }, [customers, t]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openCreateForm = () => {
    setFormData(initialForm);
    setEditingCustomerId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (customer) => {
    setEditingCustomerId(customer.id);

    setFormData({
      business_name: customer.business_name || "",
      contact_person: customer.contact_person || "",
      email: customer.email || "",
      phone: customer.phone || "",
      gst_number: customer.gst_number || "",
      pan_number: customer.pan_number || "",
      group_id: customer.group_id || "",
      credit_limit: customer.credit_limit || 0,
      credit_days: customer.credit_days || 0,
      status: getStatusKey(customer.status),
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomerDetails(customer);
    setShowDetailsModal(true);
  };

  const handleCancelForm = () => {
    setFormData(initialForm);
    setEditingCustomerId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.business_name.trim()) {
      setError(t("businessNameRequired"));
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...formData,
        status: getStatusKey(formData.status),
        credit_limit: Number(formData.credit_limit || 0),
        credit_days: Number(formData.credit_days || 0),
      };

      let res;

      if (editingCustomerId) {
        res = await API.put(`/api/customers/${editingCustomerId}`, payload);
      } else {
        res = await API.post("/api/customers", payload);
      }

      if (res.data.success) {
        setFormData(initialForm);
        setEditingCustomerId(null);
        setShowForm(false);
        fetchCustomers();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingCustomerId
            ? t("failedUpdateCustomer")
            : t("failedCreateCustomer"))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmDelete = window.confirm(t("deactivateConfirm"));

    if (!confirmDelete) return;

    try {
      await API.delete(`/api/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || t("failedDeactivateCustomer"));
    }
  };

  return (
    <AdminLayout>
      <style>{css}</style>

      <div className="customer-page customer-command-page">
        <section className="customer-hero">
          <div className="hero-grid-pattern" />
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-left">
            <div className="hero-icon">
              <Users size={28} />
            </div>

            <div className="hero-copy">
              <div className="hero-kicker">
                <span />
                {t("heroKicker")}
              </div>

              <h1>{t("pageTitle")}</h1>

              <p>
                {t("pageDesc")}
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={fetchCustomers}
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              {t("refresh")}
            </button>

            <button className="primary-btn" type="button" onClick={openCreateForm}>
              <Plus size={18} />
              {t("addCustomer")}
            </button>
          </div>
        </section>

        <section className="stats-grid">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div className="stat-card" key={card.label}>
                <div className="stat-top">
                  <div
                    className="stat-icon"
                    style={{
                      background: `${card.color}16`,
                      color: card.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="stat-line" style={{ background: card.color }} />
                </div>

                <h3>{card.value}</h3>
                <p>{card.label}</p>
                <span>{card.hint}</span>
              </div>
            );
          })}
        </section>

        {error && (
          <div className="error-box">
            <div className="error-icon">
              <X size={16} />
            </div>
            <span>{error}</span>
          </div>
        )}

        {selectedCustomer && (
          <CustomerAddresses
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        )}

        {showForm && (
          <section className="form-card">
            <div className="form-header">
              <div>
                <span className="section-label">
                  {editingCustomerId ? t("updateRecord") : t("createRecord")}
                </span>

                <h2>{editingCustomerId ? t("editCustomer") : t("addNewCustomer")}</h2>

                <p>
                  {t("formDesc")}
                </p>
              </div>

              <button
                className="close-btn"
                type="button"
                onClick={handleCancelForm}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{t("businessName")} *</label>
                  <input
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    placeholder="Hotel Green Palace"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t("contactPerson")}</label>
                  <input
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                    placeholder="Suresh"
                  />
                </div>

                <div className="form-group">
                  <label>{t("email")}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="hotel@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>{t("phone")}</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543211"
                  />
                </div>

                <div className="form-group">
                  <label>{t("gstNumber")}</label>
                  <input
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    placeholder="29ABCDE1234F1Z6"
                  />
                </div>

                <div className="form-group">
                  <label>{t("panNumber")}</label>
                  <input
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleChange}
                    placeholder="ABCDE1234G"
                  />
                </div>

                <div className="form-group">
                  <label>{t("customerGroup")}</label>
                  <select
                    name="group_id"
                    value={formData.group_id}
                    onChange={handleChange}
                  >
                    <option value="">{t("selectGroup")}</option>

                    {customerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("status")}</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={`status-select status-select-${getStatusKey(
                      formData.status
                    )}`}
                  >
                    <option value="active">{t("status_active")}</option>
                    <option value="pending">{t("status_pending")}</option>
                    <option value="inactive">{t("status_inactive")}</option>
                    <option value="blocked">{t("status_blocked")}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("creditLimit")}</label>
                  <input
                    type="number"
                    name="credit_limit"
                    value={formData.credit_limit}
                    onChange={handleChange}
                    placeholder="50000"
                  />
                </div>

                <div className="form-group">
                  <label>{t("creditDays")}</label>
                  <input
                    type="number"
                    name="credit_days"
                    value={formData.credit_days}
                    onChange={handleChange}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleCancelForm}
                >
                  {t("cancel")}
                </button>

                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving
                    ? t("saving")
                    : editingCustomerId
                    ? t("updateCustomer")
                    : t("saveCustomer")}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>

          <div className="toolbar-count">
            {t("showing")} <strong>{filteredCustomers.length}</strong> {t("of")}{" "}
            <strong>{customers.length}</strong> {t("customers")}
          </div>
        </section>

        <section className="table-card">
          <div className="table-header">
            <div>
              <span className="section-label">{t("customerDatabase")}</span>
              <h2>{t("customerList")}</h2>
              <p>{t("databaseDesc")}</p>
            </div>

            <div className="table-chip">
              <Building2 size={14} />
              {t("liveRecords")}
            </div>
          </div>

          {loading ? (
            <div className="empty-box">
              <div className="empty-icon">
                <RefreshCw size={24} className="spin" />
              </div>

              <div>
                <h3>{t("loadingCustomers")}</h3>
                <p>{t("loadingDesc")}</p>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="empty-box">
              <div className="empty-icon">
                <Users size={24} />
              </div>

              <div>
                <h3>{t("noCustomersFound")}</h3>
                <p>{t("noCustomersDesc")}</p>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("tableCustomer")}</th>
                    <th>{t("tableContact")}</th>
                    <th>{t("tableGstPan")}</th>
                    <th>{t("tableCredit")}</th>
                    <th>{t("tableStatus")}</th>
                    <th>{t("tableAction")}</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => {
                    const statusKey = getStatusKey(customer.status);

                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="customer-main">
                            <div className="customer-avatar">
                              {(customer.business_name || "CU")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <div className="customer-name">
                                {customer.business_name}
                              </div>

                              <div className="small-text">
                                {t("code")}: {customer.customer_code || "-"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="contact-name">
                            {customer.contact_person || "-"}
                          </div>

                          {customer.phone && (
                            <div className="small-text">
                              <Phone size={13} />
                              {customer.phone}
                            </div>
                          )}

                          {customer.email && (
                            <div className="small-text">
                              <Mail size={13} />
                              {customer.email}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="tax-text">
                            {t("gst")}: {customer.gst_number || "-"}
                          </div>

                          <div className="small-text">
                            {t("pan")}: {customer.pan_number || "-"}
                          </div>
                        </td>

                        <td>
                          <div className="credit-text">
                            {formatCurrency(customer.credit_limit)}
                          </div>

                          <div className="small-text">
                            {customer.credit_days || 0} {t("days")}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${statusKey}`}
                          >
                            <BadgeCheck size={13} />
                            {getStatusLabel(customer.status, t)}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              className="address-btn"
                              type="button"
                              onClick={() => setSelectedCustomer(customer)}
                              title={t("customerAddresses")}
                            >
                              <MapPin size={16} />
                            </button>

                            <button
                              className="view-btn"
                              type="button"
                              onClick={() => handleViewDetails(customer)}
                              title={t("viewDetails")}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="edit-btn"
                              type="button"
                              onClick={() => handleEdit(customer)}
                              title={t("editCustomer")}
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              className="delete-btn"
                              type="button"
                              onClick={() => handleDeactivate(customer.id)}
                              title={t("deactivateCustomer")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showDetailsModal && selectedCustomerDetails && (
          <CustomerDetailsModal
            customer={selectedCustomerDetails}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedCustomerDetails(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap');

  .customer-command-page {
    --page-text: #171717;
    --page-muted: #6B7280;
    --page-soft: #8A7A52;
    --page-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.20), transparent 28%),
      radial-gradient(circle at bottom right, rgba(17, 24, 39, 0.06), transparent 30%),
      linear-gradient(135deg, #FFFDF6 0%, #FFF8E1 45%, #F7EBC5 100%);
    --card-bg: rgba(255, 255, 255, 0.96);
    --card-bg-strong: #FFFFFF;
    --card-border: rgba(232, 224, 199, 0.95);
    --input-bg: #FFFFFF;
    --input-border: rgba(17, 24, 39, 0.10);
    --table-head: #FFF9E8;
    --table-row-hover: rgba(255, 210, 30, 0.10);
    --shadow: 0 18px 48px rgba(17, 24, 39, 0.08);
    --shadow-hover: 0 24px 68px rgba(17, 24, 39, 0.13);

    min-height: 100vh;
    color: var(--page-text);
    background: var(--page-bg);
    padding: 8px;
    font-family: 'Public Sans', system-ui, sans-serif;
  }

  .theme-dark .customer-command-page {
    --page-text: #F8FAFC;
    --page-muted: rgba(255, 255, 255, 0.62);
    --page-soft: rgba(255, 255, 255, 0.46);
    --page-bg:
      radial-gradient(circle at top left, rgba(255, 210, 30, 0.12), transparent 32%),
      radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.05), transparent 30%),
      linear-gradient(135deg, #07090F 0%, #0F172A 48%, #111827 100%);
    --card-bg: rgba(255, 255, 255, 0.055);
    --card-bg-strong: rgba(8, 10, 18, 0.86);
    --card-border: rgba(255, 255, 255, 0.09);
    --input-bg: rgba(255, 255, 255, 0.06);
    --input-border: rgba(255, 255, 255, 0.10);
    --table-head: rgba(255, 255, 255, 0.055);
    --table-row-hover: rgba(255, 210, 30, 0.08);
    --shadow: 0 18px 52px rgba(0, 0, 0, 0.24);
    --shadow-hover: 0 28px 76px rgba(0, 0, 0, 0.34);
  }

  .customer-hero {
    position: relative;
    overflow: hidden;
    min-height: 210px;
    border-radius: 30px;
    padding: 28px 32px;
    margin-bottom: 22px;
    background:
      linear-gradient(135deg, #121316 0%, #202126 54%, #0B0C0E 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.10) !important;
    box-shadow:
      0 20px 56px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }

  .hero-grid-pattern {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.42;
    pointer-events: none;
  }

  .customer-hero::after {
    content: '';
    position: absolute;
    left: 32px;
    right: 32px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 210, 30, 0.75),
      transparent
    );
  }

  .hero-glow {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-glow-one {
    width: 210px;
    height: 210px;
    right: -70px;
    top: -92px;
    background: #FFD21E;
    opacity: 0.95;
    box-shadow: 0 0 80px rgba(255, 210, 30, 0.38);
  }

  .hero-glow-two {
    width: 96px;
    height: 96px;
    right: 135px;
    bottom: -38px;
    border: 18px solid rgba(255, 210, 30, 0.14);
  }

  .hero-left {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    max-width: 830px;
  }

  .hero-icon {
    width: 62px;
    height: 62px;
    border-radius: 22px;
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16px 36px rgba(255, 210, 30, 0.25);
    flex-shrink: 0;
  }

  .hero-copy {
    min-width: 0;
  }

  .hero-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(255, 210, 30, 0.25);
    background: rgba(255, 210, 30, 0.09);
    color: #FFD21E;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .hero-kicker span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #FFD21E;
    box-shadow: 0 0 0 5px rgba(255, 210, 30, 0.13);
  }

  .customer-hero h1 {
    margin: 0;
    font-family: 'Public Sans', sans-serif;
    font-size: clamp(29px, 3vw, 42px);
    line-height: 1.04;
    font-weight: 800;
    letter-spacing: -1px;
    color: #FFFFFF !important;
  }

  .customer-hero p {
    max-width: 760px;
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.66) !important;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.7;
  }

  .hero-actions {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .primary-btn,
  .secondary-btn {
    min-height: 44px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0 16px;
    border: none;
    font-family: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .primary-btn {
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    box-shadow: 0 12px 28px rgba(255, 210, 30, 0.24);
  }

  .secondary-btn {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .form-actions .secondary-btn {
    background: var(--input-bg);
    color: var(--page-text);
    border: 1px solid var(--input-border);
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card {
    position: relative;
    overflow: hidden;
    min-height: 142px;
    border-radius: 24px;
    padding: 18px;
    background: var(--card-bg) !important;
    border: 1px solid var(--card-border) !important;
    box-shadow: var(--shadow) !important;
    backdrop-filter: blur(18px);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-hover) !important;
    border-color: rgba(255, 210, 30, 0.35) !important;
  }

  .stat-card::after {
    content: '';
    position: absolute;
    width: 105px;
    height: 105px;
    right: -48px;
    bottom: -48px;
    border-radius: 50%;
    background: rgba(255, 210, 30, 0.13);
  }

  .stat-top {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 17px;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-line {
    width: 36px;
    height: 6px;
    border-radius: 999px;
    margin-top: 8px;
  }

  .stat-card h3 {
    position: relative;
    z-index: 1;
    margin: 0;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.8px;
    color: var(--page-text) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-card p {
    position: relative;
    z-index: 1;
    margin: 7px 0 0;
    color: var(--page-muted) !important;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.65px;
  }

  .stat-card span {
    position: relative;
    z-index: 1;
    display: block;
    margin-top: 6px;
    color: var(--page-soft);
    font-size: 11px;
    font-weight: 700;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 18px;
    padding: 13px 15px;
    border-radius: 18px;
    background: rgba(239, 68, 68, 0.10);
    border: 1px solid rgba(239, 68, 68, 0.22);
    color: #EF4444;
    font-size: 13px;
    font-weight: 800;
  }

  .error-icon {
    width: 30px;
    height: 30px;
    border-radius: 12px;
    background: rgba(239, 68, 68, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .form-card,
  .toolbar,
  .table-card {
    background: var(--card-bg-strong) !important;
    border: 1px solid var(--card-border) !important;
    box-shadow: var(--shadow) !important;
    backdrop-filter: blur(18px);
  }

  .form-card {
    border-radius: 28px;
    padding: 24px;
    margin-bottom: 22px;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
  }

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
    margin-bottom: 8px;
  }

  .theme-dark .section-label {
    color: #FFD21E;
  }

  .form-header h2,
  .table-header h2 {
    margin: 0;
    font-family: 'Public Sans', sans-serif;
    font-size: 23px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--page-text) !important;
  }

  .form-header p,
  .table-header p {
    margin: 5px 0 0;
    color: var(--page-muted) !important;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.6;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--page-muted);
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

  .form-group label {
    font-size: 12px;
    font-weight: 900;
    color: var(--page-text) !important;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    min-height: 46px;
    border: 1.5px solid var(--input-border) !important;
    border-radius: 15px;
    padding: 12px 14px;
    background: var(--input-bg) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    font-weight: 750;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-group input::placeholder {
    color: var(--page-soft);
  }

  .form-group input:focus,
  .form-group select:focus {
    border-color: rgba(255, 210, 30, 0.75) !important;
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

  .status-select {
    font-weight: 900 !important;
  }

  .status-select-active {
    color: #16A34A !important;
  }

  .status-select-pending {
    color: #EA580C !important;
  }

  .status-select-inactive,
  .status-select-blocked {
    color: #DC2626 !important;
  }

  .theme-dark .status-select-active {
    background: rgba(22, 163, 74, 0.10) !important;
    border-color: rgba(22, 163, 74, 0.28) !important;
  }

  .theme-dark .status-select-pending {
    background: rgba(234, 88, 12, 0.10) !important;
    border-color: rgba(234, 88, 12, 0.28) !important;
  }

  .theme-dark .status-select-inactive,
  .theme-dark .status-select-blocked {
    background: rgba(220, 38, 38, 0.10) !important;
    border-color: rgba(220, 38, 38, 0.28) !important;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
  }

  .toolbar {
    border-radius: 24px;
    padding: 16px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .search-wrap {
    max-width: 520px;
    width: 100%;
    min-height: 46px;
    border-radius: 16px;
    background: var(--input-bg) !important;
    border: 1px solid var(--input-border) !important;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    color: var(--page-muted);
  }

  .search-wrap input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--page-text);
    font-size: 13px;
    font-weight: 750;
    font-family: inherit;
  }

  .search-wrap input::placeholder {
    color: var(--page-soft);
  }

  .toolbar-count {
    color: var(--page-muted);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .toolbar-count strong {
    color: var(--page-text);
    font-weight: 900;
  }

  .table-card {
    border-radius: 28px;
    padding: 22px;
    overflow: hidden;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .table-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 210, 30, 0.12);
    border: 1px solid rgba(255, 210, 30, 0.24);
    color: #D9A900;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }

  .theme-dark .table-chip {
    color: #FFD21E;
  }

  .table-wrap {
    overflow-x: auto;
    border-radius: 20px;
    border: 1px solid var(--card-border);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1080px;
    background: var(--card-bg-strong) !important;
  }

  th {
    background: var(--table-head) !important;
    color: var(--page-soft) !important;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.55px;
    text-align: left;
    padding: 15px 14px;
    border-bottom: 1px solid var(--card-border) !important;
    font-weight: 900;
  }

  td {
    padding: 16px 14px;
    border-bottom: 1px solid var(--card-border) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    vertical-align: top;
    font-weight: 700;
  }

  tbody tr {
    transition: background 0.18s ease;
  }

  tbody tr:hover {
    background: var(--table-row-hover) !important;
  }

  tbody tr:last-child td {
    border-bottom: none !important;
  }

  .customer-main {
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }

  .customer-avatar {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: linear-gradient(135deg, #FFD21E, #D9A900);
    color: #121316;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .customer-name,
  .contact-name,
  .tax-text,
  .credit-text {
    color: var(--page-text) !important;
    font-weight: 900;
  }

  .small-text {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--page-muted) !important;
    font-size: 12px;
    margin-top: 6px;
    font-weight: 700;
    line-height: 1.35;
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
    background: rgba(22, 163, 74, 0.12) !important;
    color: #16A34A !important;
    border-color: rgba(22, 163, 74, 0.24) !important;
  }

  .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.12) !important;
    color: #EA580C !important;
    border-color: rgba(234, 88, 12, 0.24) !important;
  }

  .status-badge.status-inactive,
  .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.12) !important;
    color: #DC2626 !important;
    border-color: rgba(220, 38, 38, 0.24) !important;
  }

  .theme-dark .status-badge.status-active {
    background: rgba(22, 163, 74, 0.16) !important;
    color: #4ADE80 !important;
    border-color: rgba(74, 222, 128, 0.28) !important;
  }

  .theme-dark .status-badge.status-pending {
    background: rgba(234, 88, 12, 0.16) !important;
    color: #FDBA74 !important;
    border-color: rgba(251, 186, 116, 0.28) !important;
  }

  .theme-dark .status-badge.status-inactive,
  .theme-dark .status-badge.status-blocked {
    background: rgba(220, 38, 38, 0.16) !important;
    color: #FCA5A5 !important;
    border-color: rgba(252, 165, 165, 0.28) !important;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .address-btn,
  .view-btn,
  .edit-btn,
  .delete-btn {
    width: 37px;
    height: 37px;
    border-radius: 13px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .address-btn:hover,
  .view-btn:hover,
  .edit-btn:hover,
  .delete-btn:hover {
    transform: translateY(-2px);
  }

  .address-btn {
    background: rgba(37, 99, 235, 0.12);
    color: #2563EB;
  }

  .view-btn {
    background: rgba(124, 58, 237, 0.12);
    color: #7C3AED;
  }

  .edit-btn {
    background: rgba(255, 210, 30, 0.16);
    color: #D9A900;
  }

  .delete-btn {
    background: rgba(220, 38, 38, 0.12);
    color: #DC2626;
  }

  .theme-dark .address-btn {
    background: rgba(37, 99, 235, 0.16);
    color: #93C5FD;
  }

  .theme-dark .view-btn {
    background: rgba(124, 58, 237, 0.18);
    color: #C4B5FD;
  }

  .theme-dark .edit-btn {
    background: rgba(255, 210, 30, 0.16);
    color: #FFD21E;
  }

  .theme-dark .delete-btn {
    background: rgba(220, 38, 38, 0.18);
    color: #FCA5A5;
  }

  .empty-box {
    min-height: 210px;
    border: 1px dashed var(--card-border);
    border-radius: 22px;
    background: rgba(255, 210, 30, 0.045);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: left;
    padding: 28px;
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

  .empty-box h3 {
    margin: 0;
    color: var(--page-text);
    font-size: 18px;
    font-weight: 900;
  }

  .empty-box p {
    margin: 7px 0 0;
    color: var(--page-muted);
    font-size: 13px;
    font-weight: 700;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1320px) {
    .stats-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 1100px) {
    .customer-hero {
      flex-direction: column;
    }

    .hero-actions {
      justify-content: flex-start;
    }

    .form-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .customer-command-page {
      padding: 0;
    }

    .customer-hero {
      border-radius: 24px;
      padding: 24px;
    }

    .hero-left {
      flex-direction: column;
    }

    .hero-actions {
      width: 100%;
    }

    .hero-actions .primary-btn,
    .hero-actions .secondary-btn {
      flex: 1;
    }

    .stats-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .toolbar-count {
      white-space: normal;
    }

    .table-header {
      flex-direction: column;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .form-actions .primary-btn,
    .form-actions .secondary-btn {
      width: 100%;
    }

    .customer-hero h1 {
      font-size: 28px;
    }

    .empty-box {
      flex-direction: column;
      text-align: center;
    }
  }

  .theme-light .customer-command-page {
    --page-text: #2B2C40;
    --page-muted: #6E6B7B;
    --page-soft: #8C8A98;
    --page-bg: #F8F8FB;
    --card-bg: #FFFFFF;
    --card-bg-strong: #FFFFFF;
    --card-border: #DBDADE;
    --input-bg: #FFFFFF;
    --input-border: #DBDADE;
    --table-head: #F8F8FB;
    --table-row-hover: rgba(248, 196, 0, 0.08);
    --shadow: 0 6px 22px rgba(17, 19, 24, 0.045);
    --shadow-hover: 0 12px 32px rgba(17, 19, 24, 0.08);
    background: var(--page-bg) !important;
  }

  .theme-dark .customer-command-page {
    --page-text: #F8F8FA;
    --page-muted: rgba(255,255,255,0.62);
    --page-soft: rgba(255,255,255,0.48);
    --page-bg: #101114;
    --card-bg: #1B1D23;
    --card-bg-strong: #1B1D23;
    --card-border: rgba(255,255,255,0.10);
    --input-bg: #22252D;
    --input-border: rgba(255,255,255,0.12);
    --table-head: #22252D;
    --table-row-hover: rgba(255,255,255,0.045);
    --shadow: 0 12px 34px rgba(0,0,0,0.22);
    --shadow-hover: 0 18px 44px rgba(0,0,0,0.34);
    background: var(--page-bg) !important;
  }

  .theme-light .customer-hero {
    background:
      radial-gradient(circle at 88% 12%, rgba(248, 196, 0, 0.25), transparent 30%),
      linear-gradient(135deg, #FFFFFF 0%, #FFF9DE 100%) !important;
    border: 1px solid #DBDADE !important;
    box-shadow: 0 8px 28px rgba(17, 19, 24, 0.06) !important;
  }

  .theme-light .customer-hero h1 {
    color: #2B2C40 !important;
  }

  .theme-light .customer-hero p {
    color: #6E6B7B !important;
  }

  .theme-light .hero-kicker {
    background: #FFF7DB;
    border-color: rgba(248,196,0,0.30);
    color: #876B00;
  }

  .theme-light .secondary-btn {
    background: #FFFFFF;
    color: #2B2C40;
    border: 1px solid #DBDADE;
  }

  .theme-dark .customer-hero {
    background:
      radial-gradient(circle at 88% 12%, rgba(248, 196, 0, 0.18), transparent 30%),
      linear-gradient(135deg, #1B1D23 0%, #20232A 100%) !important;
    border-color: rgba(255,255,255,0.10) !important;
    box-shadow: 0 12px 34px rgba(0,0,0,0.24) !important;
  }

  .theme-dark .form-group input,
  .theme-dark .form-group select,
  .theme-dark .search-wrap input {
    color: #F8F8FA !important;
  }

  .theme-dark .form-group input::placeholder,
  .theme-dark .search-wrap input::placeholder {
    color: rgba(255,255,255,0.42) !important;
  }

  .theme-dark table,
  .theme-dark th,
  .theme-dark td,
  .theme-dark .table-wrap {
    border-color: rgba(255,255,255,0.10) !important;
  }
`;
