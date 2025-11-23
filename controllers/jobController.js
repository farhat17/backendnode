import pool from '../config/database.js';

// Slug generation function
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export const getJobs = async (req, res) => {
  try {
    const { type, page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT * FROM jobs WHERE 1=1`;
    const params = [];
    
    if (type && (type === 'government' || type === 'private')) {
      query += ' AND job_type = ?';
      params.push(type);
    }
    
    if (search) {
      query += ' AND (title LIKE ? OR company LIKE ? OR post_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [jobs] = await pool.execute(query, params);
    console.log(jobs);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM jobs WHERE 1=1';
    const countParams = [];
    
    if (type && (type === 'government' || type === 'private')) {
      countQuery += ' AND job_type = ?';
      countParams.push(type);
    }
    
    if (search) {
      countQuery += ' AND (title LIKE ? OR company LIKE ? OR post_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getJobBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [jobs] = await pool.execute(
      'SELECT * FROM jobs WHERE slug = ?',
      [slug]
    );
    
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: jobs[0]
    });
  } catch (error) {
    console.error('Get job by slug error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      company,
      job_type,
      post_name,
      qualification,
      salary,
      last_date,
      apply_link
    } = req.body;
    
    console.log(req.body);

    // Validation
    if (!title || !company || !job_type || !last_date) {
      return res.status(400).json({
        success: false,
        error: 'Title, company, job type, and last date are required'
      });
    }

    if (job_type !== 'government' && job_type !== 'private') {
      return res.status(400).json({
        success: false,
        error: 'Job type must be either government or private'
      });
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let counter = 1;
    let finalSlug = slug;

    // Check if slug already exists and make it unique
    while (true) {
      const [existingJobs] = await pool.execute(
        'SELECT id FROM jobs WHERE slug = ?',
        [finalSlug]
      );
      
      if (existingJobs.length === 0) {
        break;
      }
      
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const [result] = await pool.execute(
      `INSERT INTO jobs (title, slug, description, company, job_type, post_name, qualification, salary, last_date, apply_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, finalSlug, description, company, job_type, post_name, qualification, salary, last_date, apply_link]
    );
    
    // Get the created job
    const [jobs] = await pool.execute('SELECT * FROM jobs WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      data: jobs[0],
      message: 'Job created successfully'
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      title,
      description,
      company,
      job_type,
      post_name,
      qualification,
      salary,
      last_date,
      apply_link
    } = req.body;

    // Check if job exists
    const [existingJobs] = await pool.execute('SELECT * FROM jobs WHERE slug = ?', [slug]);
    
    if (existingJobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const existingJob = existingJobs[0];
    let updateSlug = existingJob.slug;

    // If title changed, generate new slug
    if (title && title !== existingJob.title) {
      let newSlug = generateSlug(title);
      let counter = 1;
      updateSlug = newSlug;

      // Check if new slug already exists and make it unique
      while (true) {
        const [existingSlugs] = await pool.execute(
          'SELECT id FROM jobs WHERE slug = ? AND id != ?',
          [updateSlug, existingJob.id]
        );
        
        if (existingSlugs.length === 0) {
          break;
        }
        
        updateSlug = `${newSlug}-${counter}`;
        counter++;
      }
    }

    const [result] = await pool.execute(
      `UPDATE jobs SET 
        title = ?, slug = ?, description = ?, company = ?, job_type = ?, 
        post_name = ?, qualification = ?, salary = ?, last_date = ?, apply_link = ?
       WHERE slug = ?`,
      [title, updateSlug, description, company, job_type, post_name, qualification, salary, last_date, apply_link, slug]
    );
    
    // Get updated job
    const [jobs] = await pool.execute('SELECT * FROM jobs WHERE slug = ?', [updateSlug]);
    
    res.json({
      success: true,
      data: jobs[0],
      message: 'Job updated successfully'
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [result] = await pool.execute('DELETE FROM jobs WHERE slug = ?', [slug]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const [jobs] = await pool.execute('SELECT * FROM jobs ORDER BY created_at DESC');
    
    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getJobStats = async (req, res) => {
  try {
    const [governmentJobs] = await pool.execute(
      'SELECT COUNT(*) as count FROM jobs WHERE job_type = "government"'
    );
    
    const [privateJobs] = await pool.execute(
      'SELECT COUNT(*) as count FROM jobs WHERE job_type = "private"'
    );
    
    const [totalJobs] = await pool.execute(
      'SELECT COUNT(*) as count FROM jobs'
    );
    
    res.json({
      success: true,
      data: {
        government: governmentJobs[0].count,
        private: privateJobs[0].count,
        total: totalJobs[0].count
      }
    });
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};