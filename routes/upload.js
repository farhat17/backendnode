import express from 'express';
import { upload, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// POST /api/upload
router.post('/upload', upload.single('file'), handleUploadError, (req, res) => {
  // Return the file URL
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

export default router;
