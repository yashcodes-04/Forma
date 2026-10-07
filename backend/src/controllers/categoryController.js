import { db } from "../database/db.js";

/**
 * GET /api/categories
 * Returns list of categories with product count
 */
export function getCategories(req, res) {
  try {
    const categories = db
      .prepare(`
        SELECT 
          c.id, 
          c.name, 
          c.slug, 
          c.description,
          COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category = c.name AND p.is_active = 1
        GROUP BY c.id
        ORDER BY c.name ASC
      `)
      .all();

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/categories
 * Admin protected: Create a category
 */
export function createCategory(req, res) {
  try {
    const { name, slug, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const catSlug = slug || name.toLowerCase().trim().replace(/\s+/g, "-");
    const stmt = db.prepare(`
      INSERT INTO categories (name, slug, description)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(name.trim(), catSlug, description || null);
    const newCat = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);

    return res.status(201).json({ success: true, data: newCat });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
