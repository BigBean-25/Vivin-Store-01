const express = require("express");
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { login, me, uploadAvatar } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const avatarDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename:    (req, file, cb) => cb(null, "avatar-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});
const avatarFilter = (req, file, cb) => {
  ["image/jpeg","image/jpg","image/png","image/webp"].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only JPG, PNG and WEBP images are allowed"), false);
};
const uploadMw = multer({ storage: avatarStorage, fileFilter: avatarFilter, limits: { fileSize: 3 * 1024 * 1024 } });

router.post("/login", login);
router.get("/me", protect, me);
router.post("/upload-avatar", protect, uploadMw.single("file"), uploadAvatar);

module.exports = router;