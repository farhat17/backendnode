import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT id, username, email FROM admin WHERE id = ? AND username = ?',
      [decoded.userId, decoded.username]
    );
    
    if (users.length === 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }
    
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false,
        error: 'Token expired' 
      });
    }
    
    return res.status(403).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT id, username, email FROM admin WHERE id = ? AND username = ?',
      [decoded.userId, decoded.username]
    );
    
    if (users.length > 0) {
      req.user = users[0];
    }
    
    next();
  } catch (error) {
    next();
  }
};