const validateNews = (req, res, next) => {
  const { title, slug, content } = req.body;

  const errors = [];

  if (!title || title.trim() === '') {
    errors.push('Title is required');
  }

  if (!slug || slug.trim() === '') {
    errors.push('Slug is required');
  }

  if (!content || content.trim() === '') {
    errors.push('Content is required');
  }

  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

module.exports = {
  validateNews
};