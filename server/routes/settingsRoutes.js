const express = require("express");
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { protect } = require("../middleware/authMiddleware");

const {
  getSettingsSummary,
  getSettingsSection,
  updateSettingsSection,
  getActivityLogs,
  createBackupRecord,
  uploadWebsiteImage,
} = require("../controllers/settingsController");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/website");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, "website-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});
const fileFilter = (req, file, cb) => {
  ["image/jpeg","image/jpg","image/png","image/webp"].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only JPG, PNG and WEBP images are allowed"), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/summary",        protect, getSettingsSummary);
router.get("/activity-logs",  protect, getActivityLogs);
router.get("/logs",           protect, getActivityLogs);
router.post("/backup",        protect, createBackupRecord);
router.post("/upload-image",  protect, upload.single("file"), uploadWebsiteImage);

router.get("/:section",  protect, getSettingsSection);
router.put("/:section",  protect, updateSettingsSection);

module.exports = router;