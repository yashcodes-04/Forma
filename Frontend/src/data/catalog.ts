import { productApi } from "../api/client";

export type Product = {
  id: number;
  name: string;
  slug?: string;
  category: string;
  price: number;
  compare_at_price?: number | null;
  image: string;
  gallery?: string[];
  description?: string;
  badge?: string | null;
  tone: string;
  sizes: string;
  stock: number;
};

export const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const defaultProducts: Product[] = [
  {
    id: 1,
    name: "Contour Overshirt",
    slug: "contour-overshirt",
    category: "Outerwear",
    price: 7490,
    compare_at_price: 8990,
    image:
      "https://images.unsplash.com/photo-1742210738581-002518b41530?auto=format&fit=crop&w=900&q=85",
    badge: "Bestseller",
    tone: "Ink",
    sizes: "XS–XL",
    stock: 18,
  },
  {
    id: 2,
    name: "Column Wool Coat",
    slug: "column-wool-coat",
    category: "Outerwear",
    price: 12990,
    compare_at_price: 15490,
    image:
      "https://images.unsplash.com/photo-1571668398274-be66d255abdc?auto=format&fit=crop&w=900&q=85",
    badge: "New arrival",
    tone: "Stone",
    sizes: "XS–XL",
    stock: 9,
  },
  {
    id: 3,
    name: "Soft Form Hoodie",
    slug: "soft-form-hoodie",
    category: "Essentials",
    price: 4990,
    image:
      "https://images.unsplash.com/photo-1765916093860-28dc1bdd2de9?auto=format&fit=crop&w=900&q=85",
    tone: "Walnut",
    sizes: "XS–XXL",
    stock: 24,
  },
  {
    id: 4,
    name: "Frame Trousers",
    slug: "frame-trousers",
    category: "Tailoring",
    price: 6490,
    compare_at_price: 7990,
    image:
      "https://images.unsplash.com/photo-1789899097931-a7d3ba0b113a?auto=format&fit=crop&w=900&q=85",
    tone: "Charcoal",
    sizes: "26–36",
    stock: 13,
  },
  {
    id: 5,
    name: "Everyday Heavy Tee",
    slug: "everyday-heavy-tee",
    category: "T-shirts",
    price: 2490,
    image:
      "https://images.unsplash.com/photo-1595188525947-4ba148279529?auto=format&fit=crop&w=900&q=85",
    badge: "New arrival",
    tone: "Chalk",
    sizes: "XS–XXL",
    stock: 31,
  },
  {
    id: 6,
    name: "Utility Pleat Shorts",
    slug: "utility-pleat-shorts",
    category: "Shorts",
    price: 3990,
    image:
      "https://images.unsplash.com/photo-1790065665675-6af27f102618?auto=format&fit=crop&w=900&q=85",
    tone: "Washed Indigo",
    sizes: "26–36",
    stock: 7,
  },
  {
    id: 7,
    name: "Arc Mini Shoulder Bag",
    slug: "arc-mini-shoulder-bag",
    category: "Accessories",
    price: 5490,
    compare_at_price: 6490,
    image:
      "https://images.unsplash.com/photo-1730196726788-d6a1171dfb75?auto=format&fit=crop&w=900&q=85",
    badge: "Limited",
    tone: "Black",
    sizes: "One size",
    stock: 4,
  },
  {
    id: 8,
    name: "Relaxed Studio Pant",
    slug: "relaxed-studio-pant",
    category: "Bottoms",
    price: 5990,
    image:
      "https://images.unsplash.com/photo-1649352449314-cae34aca0df2?auto=format&fit=crop&w=900&q=85",
    tone: "Sand",
    sizes: "26–36",
    stock: 16,
  },
];

const CATALOG_KEY = "formaCatalog";

/**
 * Synchronous cached loader for instant first-paint
 */
export function loadCatalog(): Product[] {
  try {
    const saved = localStorage.getItem(CATALOG_KEY);
    return saved ? (JSON.parse(saved) as Product[]) : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

/**
 * Asynchronous loader connecting directly to Backend API & Supabase
 */
export async function fetchCatalog(): Promise<Product[]> {
  try {
    const products = await productApi.getProducts();
    if (products && products.length > 0) {
      saveCatalogLocally(products);
      return products;
    }
  } catch (err) {
    console.warn("API fetch catalog failed, using cached:", err);
  }
  return loadCatalog();
}

export function saveCatalogLocally(products: Product[]) {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event("forma-catalog-updated"));
  } catch {
    // storage limit fallback
  }
}

export function saveCatalog(products: Product[]) {
  saveCatalogLocally(products);
}

/**
 * Parses product sizes string into selectable size array
 * Returns ['One size'] for freesized / accessories
 */
export function parseSizes(sizeString?: string): string[] {
  if (!sizeString) return ["One size"];
  const trimmed = sizeString.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.includes("one size") ||
    lower.includes("free") ||
    lower === "os" ||
    lower === "universal"
  ) {
    return ["One size"];
  }

  // Handle standard alpha range e.g. XS–XL, XS–XXL, S–L
  if (trimmed.includes("–") || trimmed.includes("-")) {
    const delimiter = trimmed.includes("–") ? "–" : "-";
    const parts = trimmed.split(delimiter).map((s) => s.trim().toUpperCase());
    if (parts.length === 2) {
      const alphaSizes = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
      const startIdx = alphaSizes.indexOf(parts[0]);
      const endIdx = alphaSizes.indexOf(parts[1]);
      if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
        return alphaSizes.slice(startIdx, endIdx + 1);
      }

      // Handle numeric waist range e.g. 26–36, 28–34
      const startNum = parseInt(parts[0], 10);
      const endNum = parseInt(parts[1], 10);
      if (!isNaN(startNum) && !isNaN(endNum) && startNum < endNum) {
        const result: string[] = [];
        for (let i = startNum; i <= endNum; i += 2) {
          result.push(String(i));
        }
        return result;
      }
    }
  }

  // Handle comma or slash separated lists e.g. "S, M, L, XL" or "S / M / L"
  if (trimmed.includes(",") || trimmed.includes("/")) {
    return trimmed
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Handle whitespace separated e.g. "S M L"
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens;
  }

  return [trimmed];
}

