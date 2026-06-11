const db = require("../config/db");

const SAFE_KEYS = [
  "website_avatar",
  "website_logo",
  "website_banner",
  "website_url",
  "facebook_url",
  "instagram_url",
  "youtube_url",
  "linkedin_url",
  "twitter_url",
  "whatsapp_url",
  "google_map_url",
  "support_email",
  "support_phone",
  "address",
];

exports.getCustomerWebsiteSettings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT setting_key, setting_value FROM settings WHERE setting_group = 'customer_website'`
    );
    const data = {};
    SAFE_KEYS.forEach((k) => { data[k] = ""; });
    rows.forEach((r) => {
      if (SAFE_KEYS.includes(r.setting_key)) {
        data[r.setting_key] = r.setting_value || "";
      }
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
