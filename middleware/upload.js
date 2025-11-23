import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.parse(file.originalname).name;
    cb(null, name + "-" + uniqueSuffix + ext);
  }
});

// Allowed MIME types
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// File filter
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};

// Multer instance
export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter,
});

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 20MB.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        error: "Unexpected field",
      });
    }
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  next();
};

// Optional: API route to test file upload
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  res.json({
    success: true,
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

export default router;
