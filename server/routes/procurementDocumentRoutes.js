const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getProcurementDocumentSummary,
  getProcurementDocuments,
  getProcurementDocumentById,
  uploadProcurementDocument,
  updateProcurementDocument,
  downloadProcurementDocument,
  deleteProcurementDocument,
} = require("../controllers/procurementDocumentController");

const { protect } = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "../uploads/procurement-documents");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 60);

    cb(null, `${Date.now()}-${baseName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, image, Excel and Word files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

router.get("/summary", protect, getProcurementDocumentSummary);

router.get("/", protect, getProcurementDocuments);
router.post("/", protect, upload.single("document"), uploadProcurementDocument);

router.get("/:id", protect, getProcurementDocumentById);
router.put("/:id", protect, updateProcurementDocument);
router.get("/:id/download", protect, downloadProcurementDocument);
router.delete("/:id", protect, deleteProcurementDocument);

module.exports = router;
