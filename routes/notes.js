import express from 'express';
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  downloadNote,
  getSubjects,
  getNoteBySlug,
  upload
} from '../controllers/notesController.js';

const router = express.Router();

// Public routes
router.get('/', getNotes);
router.get('/subjects', getSubjects);
router.get('/:id', getNoteById); // Works with both ID and slug
router.get('/:slug', getNoteBySlug); // Specific slug route
router.get('/:id/download', downloadNote);

// Protected routes (add authentication middleware as needed)
router.post('/', upload.single('file'), createNote);
router.put('/:id', upload.single('file'), updateNote);
router.delete('/:id', deleteNote);

export default router;