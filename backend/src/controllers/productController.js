import { db } from "../database/db.js";
import { supabase, isSupabaseConfigured } from "../database/supabaseClient.js";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

/**
 * GET /api/products
 * Rich querying with Supabase Cloud DB and Local Fallback
 */
export async function getProducts(req, res) {
  try {
    const {
      q,
      category,
      tone,
      badge,
      minPrice,
      maxPrice,
      inStock,
      sort = "newest",
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // --- SUPABASE CLOUD QUERY ---
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      if (q && q.trim()) {
        const term = q.trim();
        query = query.or(
          `name.ilike.%${term}%,category.ilike.%${term}%,tone.ilike.%${term}%,description.ilike.%${term}%`
        );
      }

      if (category && category !== "All" && category.trim()) {
        query = query.ilike("category", category.trim());
      }

      if (tone && tone.trim()) {
        query = query.ilike("tone", `%${tone.trim()}%`);
      }

      if (badge && badge.trim()) {
        query = query.eq("badge", badge.trim());
      }

      if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        query = query.gte("price", Number(minPrice));
      }

      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        query = query.lte("price", Number(maxPrice));
      }

      if (inStock === "true" || inStock === "1") {
        query = query.gt("stock", 0);
      }

      // Sort
      if (sort === "price_asc") {
        query = query.order("price", { ascending: true });
      } else if (sort === "price_desc") {
        query = query.order("price", { ascending: false });
      } else if (sort === "name_asc") {
        query = query.order("name", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(offset, offset + limitNum - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        return res.json({
          success: true,
          source: "supabase-cloud",
          data,
          pagination: {
            total: count || data.length,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil((count || data.length) / limitNum),
          },
        });
      }
      console.warn("Supabase query fallback to local DB:", error?.message);
    }

    // --- LOCAL DATABASE FALLBACK ---
    const conditions = ["is_active = 1"];
    const params = {};

    if (q && q.trim()) {
      conditions.push(
        "(name LIKE @search OR category LIKE @search OR tone LIKE @search OR description LIKE @search)"
      );
      params.search = `%${q.trim()}%`;
    }

    if (category && category !== "All" && category.trim()) {
      conditions.push("category = @category COLLATE NOCASE");
      params.category = category.trim();
    }

    if (tone && tone.trim()) {
      conditions.push("tone LIKE @tone");
      params.tone = `%${tone.trim()}%`;
    }

    if (badge && badge.trim()) {
      conditions.push("badge = @badge");
      params.badge = badge.trim();
    }

    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      conditions.push("price >= @minPrice");
      params.minPrice = Number(minPrice);
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      conditions.push("price <= @maxPrice");
      params.maxPrice = Number(maxPrice);
    }

    if (inStock === "true" || inStock === "1") {
      conditions.push("stock > 0");
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderBy = "ORDER BY created_at DESC";
    if (sort === "price_asc") {
      orderBy = "ORDER BY price ASC";
    } else if (sort === "price_desc") {
      orderBy = "ORDER BY price DESC";
    } else if (sort === "name_asc") {
      orderBy = "ORDER BY name ASC";
    }

    const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const totalCount = db.prepare(countSql).get(params).total;

    params.limit = limitNum;
    params.offset = offset;

    const dataSql = `
      SELECT * FROM products
      ${whereClause}
      ${orderBy}
      LIMIT @limit OFFSET @offset
    `;

    const products = db.prepare(dataSql).all(params);

    return res.json({
      success: true,
      source: "local-db",
      data: products,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/products/featured
 */
export async function getFeaturedProducts(req, res) {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("badge", "is", null)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!error && data) {
        return res.json({ success: true, source: "supabase-cloud", data });
      }
    }

    const products = db
      .prepare(
        "SELECT * FROM products WHERE is_active = 1 AND badge IS NOT NULL ORDER BY created_at DESC LIMIT 8"
      )
      .all();
    return res.json({ success: true, source: "local-db", data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/products/:id
 */
export async function getProductById(req, res) {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured && supabase) {
      let query = supabase.from("products").select("*");
      if (!isNaN(Number(id))) {
        query = query.eq("id", Number(id));
      } else {
        query = query.eq("slug", id);
      }
      const { data, error } = await query.single();
      if (!error && data) {
        return res.json({ success: true, source: "supabase-cloud", data });
      }
    }

    let product;
    if (!isNaN(Number(id))) {
      product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    } else {
      product = db.prepare("SELECT * FROM products WHERE slug = ?").get(id);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, source: "local-db", data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/products
 */
export async function createProduct(req, res) {
  try {
    const {
      name,
      category,
      description = "",
      price,
      compare_at_price = null,
      image,
      badge = null,
      tone,
      sizes,
      stock = 0,
    } = req.body;

    if (!name || !category || price === undefined || !image || !tone || !sizes) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (name, category, price, image, tone, sizes)",
      });
    }

    const slug = slugify(name) + "-" + Date.now().toString(36);
    const newProductData = {
      name: name.trim(),
      slug,
      category: category.trim(),
      description: description.trim(),
      price: Math.max(0, Number(price)),
      compare_at_price: compare_at_price ? Number(compare_at_price) : null,
      image: image.trim(),
      badge: badge ? badge.trim() : null,
      tone: tone.trim(),
      sizes: sizes.trim(),
      stock: Math.max(0, Number(stock)),
      is_active: true,
    };

    // Save to Supabase Cloud if available
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("products")
        .insert([newProductData])
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json({
          success: true,
          source: "supabase-cloud",
          message: "Product created in Supabase cloud",
          data,
        });
      }
    }

    // Save to Local DB
    const stmt = db.prepare(`
      INSERT INTO products (
        name, slug, category, description, price, compare_at_price,
        image, badge, tone, sizes, stock, is_active
      ) VALUES (
        @name, @slug, @category, @description, @price, @compare_at_price,
        @image, @badge, @tone, @sizes, @stock, 1
      )
    `);

    const result = stmt.run(newProductData);
    const newProduct = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      source: "local-db",
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/products/:id
 */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("products")
        .update(req.body)
        .eq("id", Number(id))
        .select()
        .single();

      if (!error && data) {
        return res.json({ success: true, source: "supabase-cloud", data });
      }
    }

    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updatedData = { ...existing, ...req.body, id };
    const stmt = db.prepare(`
      UPDATE products SET
        name = @name,
        category = @category,
        description = @description,
        price = @price,
        compare_at_price = @compare_at_price,
        image = @image,
        badge = @badge,
        tone = @tone,
        sizes = @sizes,
        stock = @stock,
        is_active = @is_active,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    stmt.run(updatedData);
    const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id);

    return res.json({ success: true, source: "local-db", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/products/:id/stock
 */
export async function updateStock(req, res) {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("products")
        .update({ stock: Math.max(0, Number(stock)) })
        .eq("id", Number(id))
        .select()
        .single();

      if (!error && data) {
        return res.json({ success: true, source: "supabase-cloud", data });
      }
    }

    db.prepare("UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      Math.max(0, Number(stock)),
      id
    );

    return res.json({
      success: true,
      source: "local-db",
      data: { id: Number(id), stock: Number(stock) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/products/:id
 */
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured && supabase) {
      await supabase.from("products").delete().eq("id", Number(id));
    }

    db.prepare("DELETE FROM products WHERE id = ?").run(id);

    return res.json({
      success: true,
      message: "Product deleted successfully",
      data: { id: Number(id) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
