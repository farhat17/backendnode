import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
// import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/notes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'note-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Get all notes with filtering
export const getNotes = async (req, res) => {
  try {
    const { class_level, subject, search = '' } = req.query;
    
    let query = `
      SELECT 
        id, slug, title, subject, class_level, description, 
        file_path, file_name, file_size, file_type,
        author, download_count,
        DATE_FORMAT(created_at, '%Y-%m-%d') as uploaded_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d') as updated_at
      FROM notes 
      WHERE is_active = TRUE 
    `;
    const params = [];
    
    if (class_level && ['8', '9', '10', '11', '12'].includes(class_level)) {
      query += ' AND class_level = ?';
      params.push(class_level);
    }
    
    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }
    
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR subject LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [notes] = await pool.execute(query, params);
    
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notes'
    });
  }
};

// Get note by ID or slug
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a slug (contains letters) or ID (numeric)
    const isSlug = isNaN(id);
    
    let query = `
      SELECT 
        id, slug, title, subject, class_level, description, 
        file_path, file_name, file_size, file_type,
        author, download_count,
        DATE_FORMAT(created_at, '%Y-%m-%d') as uploaded_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d') as updated_at
      FROM notes 
      WHERE is_active = TRUE AND `;
    
    if (isSlug) {
      query += 'slug = ?';
    } else {
      query += 'id = ?';
    }
    
    const [notes] = await pool.execute(query, [id]);
    
    if (notes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }
    
    res.json({
      success: true,
      data: notes[0]
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch note'
    });
  }
};

// Create new note
export const createNote = async (req, res) => {
  try {
    const { title, subject, class_level, description, author } = req.body;

    // Validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF file is required'
      });
    }

    if (!title || !subject || !class_level) {
      return res.status(400).json({
        success: false,
        error: 'Title, subject, and class level are required'
      });
    }

    if (!['8', '9', '10', '11', '12'].includes(class_level)) {
      return res.status(400).json({
        success: false,
        error: 'Class level must be 8, 9, 10, 11, or 12'
      });
    }

    // Generate slug
    const slug = generateSlug(title);
    
    // Check if slug already exists
    const [existingSlugs] = await pool.execute(
      'SELECT id FROM notes WHERE slug = ?',
      [slug]
    );

    let finalSlug = slug;
    if (existingSlugs.length > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const [result] = await pool.execute(
      `INSERT INTO notes (
        slug, title, subject, class_level, description, author,
        file_path, file_name, file_size, file_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalSlug,
        title,
        subject,
        class_level,
        description || '',
        author || 'Unknown',
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      ]
    );
    
    // Get the created note
    const [notes] = await pool.execute(`
      SELECT 
        id, slug, title, subject, class_level, description, 
        file_path, file_name, file_size, file_type,
        author, download_count,
        DATE_FORMAT(created_at, '%Y-%m-%d') as uploaded_at
      FROM notes WHERE id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      data: notes[0],
      message: 'Note created successfully'
    });
  } catch (error) {
    console.error('Create note error:', error);
    
    // Delete uploaded file if database operation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create note'
    });
  }
};

// Update note
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, class_level, description, author } = req.body;

    // Check if note exists
    const [existingNotes] = await pool.execute('SELECT * FROM notes WHERE id = ?', [id]);
    
    if (existingNotes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    const existingNote = existingNotes[0];

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(title);
      
      // Generate new slug if title changed
      const newSlug = generateSlug(title);
      updateFields.push('slug = ?');
      updateParams.push(newSlug);
    }
    
    if (subject !== undefined) {
      updateFields.push('subject = ?');
      updateParams.push(subject);
    }
    
    if (class_level !== undefined) {
      if (!['8', '9', '10', '11', '12'].includes(class_level)) {
        return res.status(400).json({
          success: false,
          error: 'Class level must be 8, 9, 10, 11, or 12'
        });
      }
      updateFields.push('class_level = ?');
      updateParams.push(class_level);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }
    
    if (author !== undefined) {
      updateFields.push('author = ?');
      updateParams.push(author);
    }

    // Handle file update if new file is provided
    if (req.file) {
      // Delete old file
      if (fs.existsSync(existingNote.file_path)) {
        fs.unlinkSync(existingNote.file_path);
      }

      updateFields.push('file_path = ?');
      updateFields.push('file_name = ?');
      updateFields.push('file_size = ?');
      updateFields.push('file_type = ?');
      
      updateParams.push(req.file.path, req.file.originalname, req.file.size, req.file.mimetype);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateParams.push(id);

    const query = `UPDATE notes SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await pool.execute(query, updateParams);
    
    // Get updated note
    const [notes] = await pool.execute(`
      SELECT 
        id, slug, title, subject, class_level, description, 
        file_path, file_name, file_size, file_type,
        author, download_count,
        DATE_FORMAT(created_at, '%Y-%m-%d') as uploaded_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d') as updated_at
      FROM notes WHERE id = ?
    `, [id]);
    
    res.json({
      success: true,
      data: notes[0],
      message: 'Note updated successfully'
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update note'
    });
  }
};

// Delete note
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get note to delete file
    const [notes] = await pool.execute('SELECT * FROM notes WHERE id = ?', [id]);
    
    if (notes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    const note = notes[0];

    // Delete file from filesystem
    if (fs.existsSync(note.file_path)) {
      fs.unlinkSync(note.file_path);
    }

    // Delete from database
    await pool.execute('DELETE FROM notes WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete note'
    });
  }
};

// Download note
export const downloadNote = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [notes] = await pool.execute(
      'SELECT * FROM notes WHERE id = ? AND is_active = TRUE',
      [id]
    );
    
    if (notes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    const note = notes[0];

    // Check if file exists
    if (!fs.existsSync(note.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Increment download count
    await pool.execute(
      'UPDATE notes SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );

    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${note.file_name}"`);
    
    const fileStream = fs.createReadStream(note.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download note'
    });
  }
};

// Get available subjects
export const getSubjects = async (req, res) => {
  try {
    const [subjects] = await pool.execute(`
      SELECT DISTINCT subject 
      FROM notes 
      WHERE is_active = TRUE 
      ORDER BY subject
    `);
    
    res.json({
      success: true,
      data: subjects.map(s => s.subject)
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subjects'
    });
  }
};

// Get note by slug
export const getNoteBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [notes] = await pool.execute(`
      SELECT 
        id, slug, title, subject, class_level, description, 
        file_path, file_name, file_size, file_type,
        author, download_count,
        DATE_FORMAT(created_at, '%Y-%m-%d') as uploaded_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d') as updated_at
      FROM notes 
      WHERE slug = ? AND is_active = TRUE
    `, [slug]);
    
    if (notes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }
    
    res.json({
      success: true,
      data: notes[0]
    });
  } catch (error) {
    console.error('Get note by slug error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch note'
    });
  }
};

export { upload };