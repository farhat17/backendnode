import express from 'express';
import {
  getStudyMaterials,
  getStudyMaterialById,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  downloadStudyMaterial,
  getStudyMaterialPosts
} from '../controllers/studyMaterialController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getStudyMaterials);
router.get('/posts', getStudyMaterialPosts);
router.get('/:id', getStudyMaterialById);
router.get('/:id/download', downloadStudyMaterial);

// Protected routes (Admin only)
router.post('/', authenticateToken, upload.single('file'), handleUploadError, createStudyMaterial);
router.put('/:id', authenticateToken, upload.single('file'), handleUploadError, updateStudyMaterial);
router.delete('/:id', authenticateToken, deleteStudyMaterial);

export default router;