const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getBrandSummary,
  getBrands,
  getActiveBrands,
  createBrand,
  getBrandById,
  updateBrand,
  updateBrandStatus,
  deleteBrand,
} = require("../controllers/brandController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/brands");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      "brand-" +
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

router.get("/summary", protect, getBrandSummary);
router.get("/active/list", protect, getActiveBrands);
router.get("/", protect, getBrands);
router.post("/", protect, upload.single("logo"), createBrand);
router.get("/:id", protect, getBrandById);
router.put("/:id", protect, upload.single("logo"), updateBrand);
router.patch("/:id/status", protect, updateBrandStatus);
router.delete("/:id", protect, deleteBrand);

module.exports = router;
