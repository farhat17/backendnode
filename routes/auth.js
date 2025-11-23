import express from 'express';
import { login, getProfile, changePassword } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { createJob, getJobBySlug, getJobs } from '../controllers/jobController.js';

const router = express.Router();

// Public routes
router.post('/admin/login', login); 
router.post('/jobs', authenticateToken, createJob);
router.get('/jobs/:slug',authenticateToken,getJobBySlug);
router.get('/jobs',authenticateToken, getJobs);
// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/change-password', authenticateToken, changePassword);

export default router;