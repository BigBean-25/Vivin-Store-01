const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getCategorySummary,
  getCategories,
  getActiveCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/categories");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      "category-" +
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG and WEBP images are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/summary", protect, getCategorySummary);
router.get("/active/list", protect, getActiveCategories);
router.get("/", protect, getCategories);
router.post("/", protect, upload.single("image"), createCategory);
router.get("/:id", protect, getCategoryById);
router.put("/:id", protect, upload.single("image"), updateCategory);
router.patch("/:id/status", protect, updateCategoryStatus);
router.delete("/:id", protect, deleteCategory);

module.exports = router;
