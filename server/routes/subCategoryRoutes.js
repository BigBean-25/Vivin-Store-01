const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getSubCategorySummary,
  getSubCategories,
  getActiveSubCategories,
  getSubCategoriesByCategory,
  createSubCategory,
  getSubCategoryById,
  updateSubCategory,
  updateSubCategoryStatus,
  deleteSubCategory,
} = require("../controllers/subCategoryController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/sub-categories");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      "sub-category-" +
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

router.get("/summary", protect, getSubCategorySummary);
router.get("/active/list", protect, getActiveSubCategories);
router.get("/category/:categoryId", protect, getSubCategoriesByCategory);
router.get("/", protect, getSubCategories);
router.post("/", protect, upload.single("image"), createSubCategory);
router.get("/:id", protect, getSubCategoryById);
router.put("/:id", protect, upload.single("image"), updateSubCategory);
router.patch("/:id/status", protect, updateSubCategoryStatus);
router.delete("/:id", protect, deleteSubCategory);

module.exports = router;
