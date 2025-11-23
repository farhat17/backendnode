import express from 'express';
import {
  getJobs,
  getJobBySlug,
  createJob,
  updateJob,
  deleteJob,
  getJobStats
} from '../controllers/jobController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getJobs);
router.get('/stats', getJobStats);
router.get('/:slug', getJobBySlug,);

// Protected routes (Admin only)
router.post('/', authenticateToken, createJob);
router.put('/:slug', authenticateToken, updateJob);
router.delete('/:slug', authenticateToken, deleteJob);

export default router;