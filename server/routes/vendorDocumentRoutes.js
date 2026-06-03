const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getVendorDocuments,
  getVendorDocumentById,
  createVendorDocument,
  updateVendorDocument,
  deleteVendorDocument,
} = require("../controllers/vendorDocumentController");

const { protect } = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "..", "uploads", "vendor-documents");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase();

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, image, DOC and DOCX files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.get("/", protect, getVendorDocuments);
router.post("/", protect, upload.single("document"), createVendorDocument);
router.get("/:id", protect, getVendorDocumentById);
router.put("/:id", protect, upload.single("document"), updateVendorDocument);
router.delete("/:id", protect, deleteVendorDocument);

module.exports = router;