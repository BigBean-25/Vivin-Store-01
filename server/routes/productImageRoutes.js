const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getProductImages,
  getImagesByProduct,
  createProductImage,
  getProductImageById,
  updateProductImage,
  setPrimaryImage,
  deleteProductImage,
} = require("../controllers/productImageController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/product-images");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      "product-" +
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

router.get("/", protect, getProductImages);
router.get("/product/:productId", protect, getImagesByProduct);

router.post("/", protect, upload.single("image"), createProductImage);

router.get("/:id", protect, getProductImageById);

router.put("/:id", protect, upload.single("image"), updateProductImage);

router.patch("/:id/set-primary", protect, setPrimaryImage);

router.delete("/:id", protect, deleteProductImage);

module.exports = router;
