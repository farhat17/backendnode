// controllers/newsController.js

import pool from "../config/database.js";

// Generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

// ============================ GET ALL NEWS ============================
export const getNews = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM education_news ORDER BY created_at DESC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get news error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
// ============================ GET NEWS BY SLUG ============================
export const getNewsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM education_news WHERE slug = ? LIMIT 1',
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "News not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error("Get news by slug error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// ============================ CREATE NEWS ============================
export const createNews = async (req, res) => {
  try {
    const body = req.body;
    console.log("Request body:", body);
    const file = req.file;
    console.log("Uploaded file:", file);

    if (!body.title || !body.content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required"
      });
    }

    const slug = generateSlug(body.title);
    const imagePath = file ? `/uploads/${file.filename}` : null;

    // Debug: Log the values before insertion
    console.log("Inserting news with values:", {
      title: body.title,
      slug: slug,
      content: body.content,
      excerpt: body.excerpt || null,
      category: body.category || 'general',
      image: imagePath,
      news_type: body.news_type || "general",
      status: body.status || "draft",
      important_dates: body.important_dates || null,
      tags: body.tags || null,
      is_active: body.is_active ? 1 : 0
    });

    const sql = `
      INSERT INTO education_news 
      (title, slug, content, excerpt, category, image, news_type, status, important_dates, tags, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      body.title,
      slug,
      body.content,
      body.excerpt || null,
      body.category || 'general',
      imagePath,
      body.news_type || "general",
      body.status || "draft",
      body.important_dates || null,
      body.tags || null,
      body.is_active ? 1 : 0
    ];

    const [result] = await pool.execute(sql, values);
    console.log("Insert result:", result);

    const [newItem] = await pool.execute(
      "SELECT * FROM education_news WHERE id = ?",
      [result.insertId]
    );

    res.json({
      success: true,
      message: "News created successfully",
      data: newItem[0]
    });
  } catch (error) {
    console.error("Create news error details:");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error sqlMessage:", error.sqlMessage);
    console.error("Full error:", error);
    
    res.status(500).json({ 
      success: false, 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================ UPDATE NEWS ============================
export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const file = req.file;

    const [existing] = await pool.execute(
      "SELECT * FROM education_news WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    let slug = existing[0].slug;
    if (body.title && body.title !== existing[0].title) {
      slug = generateSlug(body.title);
    }

    const imagePath =
      file ? `/uploads/${file.filename}` : existing[0].image;

    const sql = `
      UPDATE education_news SET
      title = ?, slug = ?, content = ?, excerpt = ?, category = ?,
      image = ?, news_type = ?, status = ?, important_dates = ?, tags = ?, is_active = ?
      WHERE id = ?
    `;

    const values = [
      body.title || existing[0].title,
      slug,
      body.content || existing[0].content,
      body.excerpt ?? existing[0].excerpt,
      body.category || existing[0].category,
      imagePath,
      body.news_type || existing[0].news_type,
      body.status || existing[0].status,
      body.important_dates ?? existing[0].important_dates,
      body.tags ?? existing[0].tags,
      body.is_active ? 1 : 0,
      id
    ];

    await pool.execute(sql, values);

    const [updated] = await pool.execute(
      "SELECT * FROM education_news WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "News updated successfully",
      data: updated[0]
    });
  } catch (error) {
    console.error("Update news error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ============================ DELETE NEWS (SOFT) ============================
export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "UPDATE education_news SET is_active = FALSE WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    res.json({ success: true, message: "News deleted successfully" });
  } catch (error) {
    console.error("Delete news error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ============================ TOGGLE ACTIVE (PATCH) ============================
export const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [result] = await pool.execute(
      "UPDATE education_news SET is_active = ? WHERE id = ?",
      [is_active ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    res.json({ success: true, message: "Active status updated" });
  } catch (error) {
    console.error("Toggle active error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
