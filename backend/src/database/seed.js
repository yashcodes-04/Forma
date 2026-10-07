import { db, initDB } from "./db.js";

const categories = [
  { name: "Outerwear", slug: "outerwear", description: "Structured silhouettes, overshirts, and wool coats." },
  { name: "Essentials", slug: "essentials", description: "Everyday foundation garments and elevated jersey." },
  { name: "Tailoring", slug: "tailoring", description: "Sharp trousers and fluid structured cuts." },
  { name: "T-shirts", slug: "t-shirts", description: "Heavyweight jersey tees in considered tones." },
  { name: "Shorts", slug: "shorts", description: "Relaxed utility shorts and pleat details." },
  { name: "Bottoms", slug: "bottoms", description: "Studio pants, relaxed cuts, and versatile denim." },
  { name: "Accessories", slug: "accessories", description: "Leather goods, mini shoulder bags, and accents." },
];

const products = [
  {
    name: "Contour Overshirt",
    slug: "contour-overshirt",
    category: "Outerwear",
    description: "Relaxed boxy silhouette with concealed front placket and dropped shoulders. Cut from a dense cotton twill.",
    price: 7490,
    compare_at_price: 8990,
    image: "https://images.unsplash.com/photo-1742210738581-002518b41530?auto=format&fit=crop&w=900&q=85",
    badge: "Bestseller",
    tone: "Ink",
    sizes: "XS–XL",
    stock: 18,
  },
  {
    name: "Column Wool Coat",
    slug: "column-wool-coat",
    category: "Outerwear",
    description: "Full-length structured coat in heavy double-faced wool. Single back vent with horn button closures.",
    price: 12990,
    compare_at_price: 15490,
    image: "https://images.unsplash.com/photo-1571668398274-be66d255abdc?auto=format&fit=crop&w=900&q=85",
    badge: "New arrival",
    tone: "Stone",
    sizes: "XS–XL",
    stock: 9,
  },
  {
    name: "Soft Form Hoodie",
    slug: "soft-form-hoodie",
    category: "Essentials",
    description: "480 GSM organic cotton fleece with ribbed gusseting and blind stitch hems. Seamless double-lined hood.",
    price: 4990,
    compare_at_price: null,
    image: "https://images.unsplash.com/photo-1765916093860-28dc1bdd2de9?auto=format&fit=crop&w=900&q=85",
    badge: null,
    tone: "Walnut",
    sizes: "XS–XXL",
    stock: 24,
  },
  {
    name: "Frame Trousers",
    slug: "frame-trousers",
    category: "Tailoring",
    description: "Wide-leg tailored trousers featuring deep front pleats, adjustable waist tabs, and full drape.",
    price: 6490,
    compare_at_price: 7990,
    image: "https://images.unsplash.com/photo-1789899097931-a7d3ba0b113a?auto=format&fit=crop&w=900&q=85",
    badge: null,
    tone: "Charcoal",
    sizes: "26–36",
    stock: 13,
  },
  {
    name: "Everyday Heavy Tee",
    slug: "everyday-heavy-tee",
    category: "T-shirts",
    description: "260 GSM combed cotton jersey with a structured 1-inch rib collar. Pre-shrunk for an enduring fit.",
    price: 2490,
    compare_at_price: null,
    image: "https://images.unsplash.com/photo-1595188525947-4ba148279529?auto=format&fit=crop&w=900&q=85",
    badge: "New arrival",
    tone: "Chalk",
    sizes: "XS–XXL",
    stock: 31,
  },
  {
    name: "Utility Pleat Shorts",
    slug: "utility-pleat-shorts",
    category: "Shorts",
    description: "Above-knee cut with dual front pleats, slant pockets, and reinforced belt loops. Washed cotton poplin.",
    price: 3990,
    compare_at_price: null,
    image: "https://images.unsplash.com/photo-1790065665675-6af27f102618?auto=format&fit=crop&w=900&q=85",
    badge: null,
    tone: "Washed Indigo",
    sizes: "26–36",
    stock: 7,
  },
  {
    name: "Arc Mini Shoulder Bag",
    slug: "arc-mini-shoulder-bag",
    category: "Accessories",
    description: "Full-grain calfskin leather bag with custom matte silver hardware and internal card compartment.",
    price: 5490,
    compare_at_price: 6490,
    image: "https://images.unsplash.com/photo-1730196726788-d6a1171dfb75?auto=format&fit=crop&w=900&q=85",
    badge: "Limited",
    tone: "Black",
    sizes: "One size",
    stock: 4,
  },
  {
    name: "Relaxed Studio Pant",
    slug: "relaxed-studio-pant",
    category: "Bottoms",
    description: "Easy relaxed fit pant with elasticated drawstring waistband and subtle leg tapering. Garment-dyed finish.",
    price: 5990,
    compare_at_price: null,
    image: "https://images.unsplash.com/photo-1649352449314-cae34aca0df2?auto=format&fit=crop&w=900&q=85",
    badge: null,
    tone: "Sand",
    sizes: "26–36",
    stock: 16,
  },
];

export function seed() {
  initDB();

  console.log("🌱 Seeding Forma Database...");

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, slug, description)
    VALUES (@name, @slug, @description)
  `);

  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products (
      name, slug, category, description, price, compare_at_price,
      image, badge, tone, sizes, stock
    ) VALUES (
      @name, @slug, @category, @description, @price, @compare_at_price,
      @image, @badge, @tone, @sizes, @stock
    )
  `);

  const seedTransaction = db.transaction(() => {
    // Seed Categories
    for (const cat of categories) {
      insertCategory.run(cat);
    }

    // Seed Products
    for (const prod of products) {
      insertProduct.run(prod);
    }

    // Seed Admin User
    try {
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (id, name, email, mobile, password_hash, role, avatar, created_at)
        VALUES (@id, @name, @email, @mobile, @password_hash, @role, @avatar, @created_at)
      `);
      insertUser.run({
        id: "usr_admin_master",
        name: "Studio Administrator",
        email: "admin@trial.com",
        mobile: "+919999999999",
        password_hash: "kunal00700@",
        role: "admin",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  });

  seedTransaction();

  const count = db.prepare("SELECT COUNT(*) as total FROM products").get();
  console.log(`✅ Seed completed! Total products in database: ${count.total}`);
}

// Run if called directly
if (process.argv[1]?.endsWith("seed.js")) {
  seed();
}
