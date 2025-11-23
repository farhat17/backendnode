import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const initDatabase = async () => {
  let connection;
  
  try {
    // Connect to MySQL without selecting database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'job_portal'}`);
    console.log('Database created or already exists');

    // Use the database
    await connection.execute(`USE ${process.env.DB_NAME || 'job_portal'}`);
    console.log('Using database:', process.env.DB_NAME || 'job_portal');

    // Create tables
    console.log('Creating tables...');

    // Admin table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admin table created');

    // Jobs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        company VARCHAR(255),
        job_type ENUM('government', 'private') NOT NULL,
        post_name VARCHAR(255),
        qualification TEXT,
        salary VARCHAR(255),
        last_date DATE,
        apply_link VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_type (job_type),
        INDEX idx_last_date (last_date),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Jobs table created');

    // Study Materials table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_materials (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post_name VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_size INT,
        file_type VARCHAR(50),
        download_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_post_name (post_name),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Study materials table created');

    // Education News table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS education_news (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        news_type ENUM('cbse', 'jkbose', 'other') NOT NULL,
        exam_date DATE,
        important_dates TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_news_type (news_type),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Education news table created');

    // Notes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_level ENUM('8', '9', '10', '11', '12') NOT NULL,
        subject VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_size INT,
        file_type VARCHAR(50),
        download_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_class_level (class_level),
        INDEX idx_subject (subject),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Notes table created');

    // Create default admin user
    const defaultUsername = 'admin';
    const defaultPassword = 'admin123';
    const defaultEmail = 'admin@jobportal.com';
    
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    
    try {
      await connection.execute(
        'INSERT INTO admin (username, password_hash, email) VALUES (?, ?, ?)',
        [defaultUsername, passwordHash, defaultEmail]
      );
      console.log('✅ Default admin user created');
      console.log('📋 Default credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@jobportal.com');
      console.log('⚠️  Please change the default password immediately!');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('ℹ️  Admin user already exists');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run initialization
initDatabase();