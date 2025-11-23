import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';

export const getStudyMaterials = async (req, res) => {
  try {
    const { post_name, page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM study_materials 
      WHERE is_active = TRUE 
    `;
    const params = [];
    
    if (post_name) {
      query += ' AND post_name LIKE ?';
      params.push(`%${post_name}%`);
    }
    
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [materials] = await pool.execute(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM study_materials WHERE is_active = TRUE';
    const countParams = [];
    
    if (post_name) {
      countQuery += ' AND post_name LIKE ?';
      countParams.push(`%${post_name}%`);
    }
    
    if (search) {
      countQuery += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: {
        materials,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get study materials error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getStudyMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [materials] = await pool.execute(
      'SELECT * FROM study_materials WHERE id = ? AND is_active = TRUE',
      [id]
    );
    
    if (materials.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }
    
    res.json({
      success: true,
      data: materials[0]
    });
  } catch (error) {
    console.error('Get study material by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const createStudyMaterial = async (req, res) => {
  try {
    const { post_name, title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF file is required'
      });
    }

    if (!post_name || !title) {
      return res.status(400).json({
        success: false,
        error: 'Post name and title are required'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO study_materials (post_name, title, description, file_path, file_name, file_size, file_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        post_name,
        title,
        description,
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      ]
    );
    
    // Get the created material
    const [materials] = await pool.execute('SELECT * FROM study_materials WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      data: materials[0],
      message: 'Study material uploaded successfully'
    });
  } catch (error) {
    console.error('Create study material error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const updateStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { post_name, title, description, is_active } = req.body;

    // Check if material exists
    const [existingMaterials] = await pool.execute('SELECT * FROM study_materials WHERE id = ?', [id]);
    
    if (existingMaterials.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }

    const existingMaterial = existingMaterials[0];

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    if (post_name !== undefined) {
      updateFields.push('post_name = ?');
      updateParams.push(post_name);
    }
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateParams.push(is_active);
    }

    // Handle file update if new file is provided
    if (req.file) {
      // Delete old file
      if (fs.existsSync(existingMaterial.file_path)) {
        fs.unlinkSync(existingMaterial.file_path);
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

    const query = `UPDATE study_materials SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await pool.execute(query, updateParams);
    
    // Get updated material
    const [materials] = await pool.execute('SELECT * FROM study_materials WHERE id = ?', [id]);
    
    res.json({
      success: true,
      data: materials[0],
      message: 'Study material updated successfully'
    });
  } catch (error) {
    console.error('Update study material error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const deleteStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get material to delete file
    const [materials] = await pool.execute('SELECT * FROM study_materials WHERE id = ?', [id]);
    
    if (materials.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }

    const material = materials[0];

    // Delete file from filesystem
    if (fs.existsSync(material.file_path)) {
      fs.unlinkSync(material.file_path);
    }

    // Delete from database
    const [result] = await pool.execute('DELETE FROM study_materials WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Study material deleted successfully'
    });
  } catch (error) {
    console.error('Delete study material error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const downloadStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [materials] = await pool.execute(
      'SELECT * FROM study_materials WHERE id = ? AND is_active = TRUE',
      [id]
    );
    
    if (materials.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }

    const material = materials[0];

    // Check if file exists
    if (!fs.existsSync(material.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Increment download count
    await pool.execute(
      'UPDATE study_materials SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );

    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${material.file_name}"`);
    
    const fileStream = fs.createReadStream(material.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download study material error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getStudyMaterialPosts = async (req, res) => {
  try {
    const [posts] = await pool.execute(
      'SELECT DISTINCT post_name FROM study_materials WHERE is_active = TRUE ORDER BY post_name'
    );
    
    res.json({
      success: true,
      data: posts.map(p => p.post_name)
    });
  } catch (error) {
    console.error('Get study material posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};