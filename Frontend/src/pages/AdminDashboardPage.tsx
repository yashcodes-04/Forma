import { FormEvent, useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { productApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  defaultProducts,
  formatINR,
  loadCatalog,
  saveCatalog,
  type Product,
} from "../data/catalog";
import "../admin.css";

const PRESET_IMAGES = [
  {
    name: "Outerwear Overshirt",
    url: "https://images.unsplash.com/photo-1742210738581-002518b41530?auto=format&fit=crop&w=900&q=85",
    category: "Outerwear",
    tone: "Ink",
  },
  {
    name: "Wool Trench Coat",
    url: "https://images.unsplash.com/photo-1571668398274-be66d255abdc?auto=format&fit=crop&w=900&q=85",
    category: "Outerwear",
    tone: "Stone",
  },
  {
    name: "Heavy Boxy Tee",
    url: "https://images.unsplash.com/photo-1595188525947-4ba148279529?auto=format&fit=crop&w=900&q=85",
    category: "T-shirts",
    tone: "Chalk",
  },
  {
    name: "Tailored Wide Pant",
    url: "https://images.unsplash.com/photo-1789899097931-a7d3ba0b113a?auto=format&fit=crop&w=900&q=85",
    category: "Tailoring",
    tone: "Charcoal",
  },
  {
    name: "Leather Mini Bag",
    url: "https://images.unsplash.com/photo-1730196726788-d6a1171dfb75?auto=format&fit=crop&w=900&q=85",
    category: "Accessories",
    tone: "Black",
  },
];

type FilterTab = "all" | "in_stock" | "low_stock" | "out_of_stock" | "bestsellers";
type ViewMode = "table" | "grid";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [catalog, setCatalog] = useState<Product[]>(loadCatalog);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentTab, setCurrentTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_desc" | "price_asc" | "stock_desc" | "stock_asc">("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Modals state
  const [showAddDrop, setShowAddDrop] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Drop Form state
  const [dropImage, setDropImage] = useState("");
  const [dropImageName, setDropImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [dropSizes, setDropSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [dropColors, setDropColors] = useState<string[]>(["Black"]);
  const [optionError, setOptionError] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Live fetch from Backend API / Supabase Cloud
  useEffect(() => {
    let mounted = true;
    productApi.getProducts().then((data) => {
      if (mounted && data.length > 0) {
        setCatalog(data);
        saveCatalog(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return catalog
      .filter((p) => {
        // Tab filtering
        if (currentTab === "in_stock") return p.stock > 0;
        if (currentTab === "low_stock") return p.stock > 0 && p.stock <= 5;
        if (currentTab === "out_of_stock") return p.stock <= 0;
        if (currentTab === "bestsellers") return p.badge === "Bestseller" || p.badge === "Limited";
        return true;
      })
      .filter((p) => {
        // Category filtering
        if (selectedCategory !== "All") {
          return p.category.toLowerCase() === selectedCategory.toLowerCase();
        }
        return true;
      })
      .filter((p) => {
        // Search filtering
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tone.toLowerCase().includes(q) ||
          p.sizes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "stock_desc") return b.stock - a.stock;
        if (sortBy === "stock_asc") return a.stock - b.stock;
        return (b.id || 0) - (a.id || 0);
      });
  }, [catalog, currentTab, selectedCategory, searchQuery, sortBy]);

  const categories = useMemo(() => {
    return ["All", ...new Set(catalog.map((p) => p.category))];
  }, [catalog]);

  const totalUnits = catalog.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = catalog.filter((p) => p.stock <= 5 && p.stock > 0).length;
  const outOfStockCount = catalog.filter((p) => p.stock <= 0).length;
  const totalValue = catalog.reduce((sum, p) => sum + p.stock * p.price, 0);

  // Quick In-Line Stock Adjuster (+1 / -1)
  const adjustStock = async (id: number, delta: number) => {
    const item = catalog.find((p) => p.id === id);
    if (!item) return;
    const nextStock = Math.max(0, item.stock + delta);

    setCatalog((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: nextStock } : p))
    );

    try {
      await productApi.updateStock(id, nextStock);
      showToast(`Updated '${item.name}' stock to ${nextStock} units.`);
    } catch {
      // local fallback
    }
  };

  // Direct In-Line Field Update
  const updateProductField = async (id: number, field: "price" | "stock", value: number) => {
    const nextVal = Math.max(0, value);
    setCatalog((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: nextVal } : p))
    );

    try {
      if (field === "stock") {
        await productApi.updateStock(id, nextVal);
      } else {
        await productApi.updateProduct(id, { price: nextVal });
      }
    } catch {
      // fallback
    }
  };

  // Remove / Delete Product
  const removeProduct = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from the catalog?`)) {
      return;
    }

    const nextCatalog = catalog.filter((p) => p.id !== id);
    setCatalog(nextCatalog);
    saveCatalog(nextCatalog);

    try {
      await productApi.deleteProduct(id);
      showToast(`Removed '${name}' from catalog.`);
    } catch {
      // fallback
    }
  };

  // Handle Full Product Edit Submit
  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProduct) return;

    const data = new FormData(event.currentTarget);
    const updatedData: Partial<Product> = {
      name: String(data.get("name")),
      category: String(data.get("category")),
      price: Number(data.get("price")),
      compare_at_price: data.get("compare_at_price") ? Number(data.get("compare_at_price")) : null,
      stock: Number(data.get("stock")),
      badge: String(data.get("badge")) || null,
      tone: String(data.get("tone")),
      sizes: String(data.get("sizes")),
      description: String(data.get("description")),
      image: String(data.get("image")),
    };

    const nextCatalog = catalog.map((p) =>
      p.id === editingProduct.id ? { ...p, ...updatedData } : p
    );
    setCatalog(nextCatalog);
    saveCatalog(nextCatalog);
    setEditingProduct(null);

    try {
      await productApi.updateProduct(editingProduct.id, updatedData);
      showToast(`Successfully updated '${updatedData.name}'.`);
    } catch {
      showToast("Updated locally.");
    }
  };

  // Add New Drop
  const addDrop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dropImage) {
      setImageError("Please upload an image or select a preset.");
      return;
    }
    if (dropSizes.length === 0 || dropColors.length === 0) {
      setOptionError("Select at least one size and one colour.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const newProductPayload = {
      name: String(data.get("name")),
      category: String(data.get("category")),
      price: Number(data.get("price")),
      compare_at_price: data.get("compare_at_price") ? Number(data.get("compare_at_price")) : null,
      stock: Number(data.get("stock")),
      image: dropImage,
      tone: dropColors.join(", "),
      sizes: dropSizes.join(", "),
      badge: String(data.get("badge")) || "New drop",
      description: String(data.get("description") || ""),
    };

    let createdProduct: Product = {
      id: Date.now(),
      ...newProductPayload,
    };

    try {
      const res = await productApi.createProduct(newProductPayload);
      if (res && res.id) createdProduct = res;
    } catch {
      // local fallback
    }

    const nextCatalog = [createdProduct, ...catalog];
    setCatalog(nextCatalog);
    saveCatalog(nextCatalog);

    setShowAddDrop(false);
    setDropImage("");
    setDropImageName("");
    setImageError("");
    setDropSizes(["S", "M", "L", "XL"]);
    setDropColors(["Black"]);
    setOptionError("");
    showToast(`Published '${createdProduct.name}' drop to live catalog!`);
  };

  const uploadDropImage = (file?: File) => {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImageError("Image must be smaller than 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDropImage(String(reader.result));
      setDropImageName(file.name);
    };
    reader.onerror = () => setImageError("Image could not be read.");
    reader.readAsDataURL(file);
  };

  // Export Catalog to CSV
  const exportToCSV = () => {
    const headers = ["ID", "Name", "Category", "Price", "Stock", "Tone", "Sizes", "Badge"];
    const rows = catalog.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.price,
      p.stock,
      p.tone,
      p.sizes,
      p.badge || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forma_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported catalog to CSV.");
  };

  return (
    <main className="admin-dashboard">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="admin-toast-notice">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <Link className="admin-logo" to="/">
          FORMA<span>®</span>
        </Link>
        <nav>
          <Link className="is-active" to="/admin/products">
            Products & Inventory
          </Link>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/admin/customers">Customers</Link>
          <Link to="/admin/settings">Settings</Link>
          <button
            type="button"
            className="sidebar-add-btn"
            onClick={() => setShowAddDrop(true)}
          >
            + New Drop
          </button>
          <Link to="/">View Storefront ↗</Link>
        </nav>

        <div className="admin-sidebar-user">
          <div className="admin-sidebar-user-details">
            <strong>{user?.name || "Studio Admin"}</strong>
            <span>{user?.email || "admin@forma.com"}</span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/admin-login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Studio Console */}
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>Studio Operations / Inventory</p>
            <h1>Product Management.</h1>
          </div>
          <div className="admin-topbar-actions">
            <button className="admin-export-btn" onClick={exportToCSV}>
              Export CSV
            </button>
            <button className="admin-primary" onClick={() => setShowAddDrop(true)}>
              + Add New Drop
            </button>
          </div>
        </header>

        {/* High-Level Inventory Metrics */}
        <div className="admin-stats">
          <article>
            <span>Live Catalog Styles</span>
            <strong>{catalog.length}</strong>
            <small>Active in storefront</small>
          </article>
          <article>
            <span>Total Units in Stock</span>
            <strong>{totalUnits}</strong>
            <small>Warehouse count</small>
          </article>
          <article className={lowStockCount > 0 ? "needs-attention" : ""}>
            <span>Low Stock Pieces</span>
            <strong>{lowStockCount}</strong>
            <small>{lowStockCount > 0 ? "Re-order suggested" : "Stock healthy"}</small>
          </article>
          <article>
            <span>Total Inventory Value</span>
            <strong>{formatINR(totalValue)}</strong>
            <small>Retail valuation</small>
          </article>
        </div>

        {/* Status Filter Tabs */}
        <div className="admin-filter-tabs">
          <button
            className={currentTab === "all" ? "active" : ""}
            onClick={() => setCurrentTab("all")}
          >
            All Pieces <span>{catalog.length}</span>
          </button>
          <button
            className={currentTab === "in_stock" ? "active" : ""}
            onClick={() => setCurrentTab("in_stock")}
          >
            In Stock <span>{catalog.filter((p) => p.stock > 0).length}</span>
          </button>
          <button
            className={currentTab === "low_stock" ? "active" : ""}
            onClick={() => setCurrentTab("low_stock")}
          >
            Low Stock <span>{lowStockCount}</span>
          </button>
          <button
            className={currentTab === "out_of_stock" ? "active" : ""}
            onClick={() => setCurrentTab("out_of_stock")}
          >
            Out of Stock <span>{outOfStockCount}</span>
          </button>
          <button
            className={currentTab === "bestsellers" ? "active" : ""}
            onClick={() => setCurrentTab("bestsellers")}
          >
            Highlights
          </button>
        </div>

        {/* Toolbar: Search, Category, Sort, View Mode */}
        <div className="admin-toolbar">
          <div className="admin-search-box">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="16" height="16">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, category, tone, size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery("")}>
                ×
              </button>
            )}
          </div>

          <div className="admin-toolbar-controls">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="admin-select"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="admin-select"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
            </select>

            <div className="view-mode-toggle">
              <button
                className={viewMode === "table" ? "active" : ""}
                onClick={() => setViewMode("table")}
                title="List View"
              >
                List
              </button>
              <button
                className={viewMode === "grid" ? "active" : ""}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Product List / Table View */}
        {viewMode === "table" ? (
          <div className="admin-product-table-wrap">
            <table className="admin-product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price (INR)</th>
                  <th>Stock Units</th>
                  <th>Badge / Tone</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={product.stock <= 5 ? "row-low-stock" : ""}>
                    <td>
                      <div className="table-product-info">
                        <img src={product.image} alt="" className="table-thumb" />
                        <div>
                          <strong>{product.name}</strong>
                          <span className="table-sizes">{product.sizes}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="table-category-badge">{product.category}</span>
                    </td>
                    <td>
                      <div className="table-price-cell">
                        <input
                          type="number"
                          className="table-inline-input"
                          value={product.price}
                          onChange={(e) =>
                            updateProductField(product.id, "price", Number(e.target.value))
                          }
                        />
                        <small>{formatINR(product.price)}</small>
                      </div>
                    </td>
                    <td>
                      <div className="table-stock-stepper">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => adjustStock(product.id, -1)}
                          disabled={product.stock <= 0}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className="table-inline-input stock-input"
                          value={product.stock}
                          onChange={(e) =>
                            updateProductField(product.id, "stock", Number(e.target.value))
                          }
                        />
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => adjustStock(product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <small className={product.stock <= 5 ? "stock-warn" : "stock-ok"}>
                        {product.stock <= 0
                          ? "Out of stock"
                          : product.stock <= 5
                          ? "Low stock alert"
                          : "In stock"}
                      </small>
                    </td>
                    <td>
                      <div className="table-tags">
                        {product.badge && <span className="item-badge">{product.badge}</span>}
                        <span className="item-tone">{product.tone}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="table-actions">
                        <button
                          className="btn-edit-product"
                          onClick={() => setEditingProduct(product)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete-product"
                          onClick={() => removeProduct(product.id, product.name)}
                          title="Remove Piece"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="admin-empty-results">
                <p>No products matching your search or filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setCurrentTab("all");
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Grid View */
          <div className="admin-product-grid-view">
            {filteredProducts.map((product) => (
              <article className="admin-grid-card" key={product.id}>
                <div className="grid-card-media">
                  <img src={product.image} alt="" />
                  {product.badge && <span className="grid-badge">{product.badge}</span>}
                  <span className={`grid-stock-pill ${product.stock <= 5 ? "low" : ""}`}>
                    {product.stock} left
                  </span>
                </div>
                <div className="grid-card-body">
                  <span className="grid-cat">{product.category} · {product.tone}</span>
                  <h3>{product.name}</h3>
                  <div className="grid-price-row">
                    <strong>{formatINR(product.price)}</strong>
                    <span>Sizes {product.sizes}</span>
                  </div>
                  <div className="grid-card-footer">
                    <button
                      className="btn-edit-product"
                      onClick={() => setEditingProduct(product)}
                    >
                      Edit Details
                    </button>
                    <button
                      className="btn-delete-product"
                      onClick={() => removeProduct(product.id, product.name)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Global Catalog Controls */}
        <div className="admin-footer-controls">
          <button
            className="admin-reset"
            onClick={() => {
              if (window.confirm("Reset catalog cache? This will synchronize with default catalog data.")) {
                setCatalog(defaultProducts);
                saveCatalog(defaultProducts);
                showToast("Synchronized with base catalog.");
              }
            }}
          >
            Reset to Base Catalog
          </button>
        </div>
      </section>

      {/* MODAL 1: Edit Product Modal */}
      {editingProduct && (
        <div className="drop-modal" onMouseDown={() => setEditingProduct(null)}>
          <form
            onSubmit={handleEditSubmit}
            onMouseDown={(e) => e.stopPropagation()}
            className="admin-edit-modal-form"
          >
            <div className="drop-modal-heading">
              <div>
                <p>Catalog / Edit Piece #{editingProduct.id}</p>
                <h2>Edit {editingProduct.name}</h2>
              </div>
              <button type="button" onClick={() => setEditingProduct(null)}>
                ×
              </button>
            </div>

            <div className="drop-form-grid">
              <label>
                Piece Name
                <input
                  name="name"
                  defaultValue={editingProduct.name}
                  required
                />
              </label>

              <label>
                Category
                <input
                  name="category"
                  defaultValue={editingProduct.category}
                  required
                />
              </label>

              <label>
                Selling Price (INR)
                <input
                  name="price"
                  type="number"
                  min="0"
                  defaultValue={editingProduct.price}
                  required
                />
              </label>

              <label>
                Compare-at / Original Price (INR)
                <input
                  name="compare_at_price"
                  type="number"
                  min="0"
                  defaultValue={editingProduct.compare_at_price || ""}
                  placeholder="Optional"
                />
              </label>

              <label>
                Units in Stock
                <input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={editingProduct.stock}
                  required
                />
              </label>

              <label>
                Highlight Badge
                <select
                  name="badge"
                  defaultValue={editingProduct.badge || ""}
                  className="admin-select"
                >
                  <option value="">None</option>
                  <option value="Bestseller">Bestseller</option>
                  <option value="New arrival">New arrival</option>
                  <option value="Limited">Limited</option>
                  <option value="New drop">New drop</option>
                </select>
              </label>

              <label>
                Color Tone
                <input
                  name="tone"
                  defaultValue={editingProduct.tone}
                  required
                />
              </label>

              <label>
                Available Sizes
                <input
                  name="sizes"
                  defaultValue={editingProduct.sizes}
                  placeholder="e.g. XS–XL, 26–36, One size"
                  required
                />
              </label>

              <label className="full-field">
                Image URL
                <input
                  name="image"
                  defaultValue={editingProduct.image}
                  required
                />
              </label>

              <label className="full-field">
                Product Description
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={
                    editingProduct.description ||
                    "A considered Forma staple designed for everyday movement, finished with a relaxed silhouette and durable construction."
                  }
                />
              </label>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="admin-cancel-btn"
                onClick={() => setEditingProduct(null)}
              >
                Cancel
              </button>
              <button className="admin-primary" type="submit">
                Save & Update Piece <span>→</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Add New Drop Modal */}
      {showAddDrop && (
        <div className="drop-modal" onMouseDown={() => setShowAddDrop(false)}>
          <form onSubmit={addDrop} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drop-modal-heading">
              <div>
                <p>Studio Catalog / New Drop</p>
                <h2>Publish a New Drop</h2>
              </div>
              <button type="button" onClick={() => setShowAddDrop(false)}>
                ×
              </button>
            </div>

            {/* Quick Luxury Presets Picker */}
            <div className="preset-picker-box">
              <span className="preset-label">1-Click Curated Presets:</span>
              <div className="preset-images-row">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className={`preset-btn ${dropImage === preset.url ? "is-active" : ""}`}
                    onClick={() => {
                      setDropImage(preset.url);
                      setDropImageName(preset.name);
                      setImageError("");
                    }}
                  >
                    <img src={preset.url} alt={preset.name} />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="drop-form-grid">
              <label>
                Piece Name
                <input name="name" placeholder="e.g. Structured Twill Overshirt" required />
              </label>
              <label>
                Category
                <input name="category" placeholder="Outerwear / Tailoring / T-shirts" required />
              </label>
              <label>
                Price (INR)
                <input name="price" type="number" min="0" placeholder="7490" required />
              </label>
              <label>
                Compare Price (Optional)
                <input name="compare_at_price" type="number" min="0" placeholder="8990" />
              </label>
              <label>
                Initial Stock
                <input name="stock" type="number" min="0" placeholder="25" required />
              </label>
              <label>
                Badge Tag
                <select name="badge" className="admin-select">
                  <option value="New drop">New drop</option>
                  <option value="New arrival">New arrival</option>
                  <option value="Bestseller">Bestseller</option>
                  <option value="Limited">Limited</option>
                  <option value="">None</option>
                </select>
              </label>

              <fieldset className="full-field drop-option-group">
                <legend>Available Sizes</legend>
                <div className="size-options">
                  {["XS", "S", "M", "L", "XL", "XXL", "One size", "28", "30", "32", "34", "36"].map(
                    (size) => (
                      <label className={dropSizes.includes(size) ? "is-selected" : ""} key={size}>
                        <input
                          type="checkbox"
                          value={size}
                          checked={dropSizes.includes(size)}
                          onChange={() => {
                            setOptionError("");
                            setDropSizes((current) =>
                              current.includes(size)
                                ? current.filter((item) => item !== size)
                                : [...current, size]
                            );
                          }}
                        />
                        {size}
                      </label>
                    )
                  )}
                </div>
              </fieldset>

              <fieldset className="full-field drop-option-group">
                <legend>Color Palette</legend>
                <div className="color-options">
                  {[
                    { name: "Black", hex: "#171715" },
                    { name: "White", hex: "#f7f5ef" },
                    { name: "Ink", hex: "#1d2331" },
                    { name: "Stone", hex: "#a49f93" },
                    { name: "Charcoal", hex: "#3b3d3b" },
                    { name: "Walnut", hex: "#5c4033" },
                    { name: "Sand", hex: "#c4ae89" },
                    { name: "Olive", hex: "#555d42" },
                  ].map((color) => (
                    <label
                      className={dropColors.includes(color.name) ? "is-selected" : ""}
                      key={color.name}
                    >
                      <input
                        type="checkbox"
                        value={color.name}
                        checked={dropColors.includes(color.name)}
                        onChange={() => {
                          setOptionError("");
                          setDropColors((current) =>
                            current.includes(color.name)
                              ? current.filter((item) => item !== color.name)
                              : [...current, color.name]
                          );
                        }}
                      />
                      <i style={{ backgroundColor: color.hex }} />
                      {color.name}
                    </label>
                  ))}
                </div>
                {optionError && <p className="drop-option-error">{optionError}</p>}
              </fieldset>

              <div className="full-field drop-image-field">
                <span>Product Image</span>
                <label className={`drop-image-upload ${dropImage ? "has-image" : ""}`}>
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => uploadDropImage(event.target.files?.[0])}
                  />
                  {dropImage ? (
                    <>
                      <img src={dropImage} alt="Preview" />
                      <div>
                        <strong>Image Ready</strong>
                        <small>{dropImageName || "Selected Image"}</small>
                        <span>Click to upload or pick a preset above</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <strong>Upload Custom Image or Choose Preset</strong>
                        <small>JPG, PNG, WEBP · Max 3 MB</small>
                      </div>
                    </>
                  )}
                </label>
                {imageError && <p className="image-upload-error">{imageError}</p>}
              </div>

              <label className="full-field">
                Product Description
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Design details, fabric weight, and silhouette notes..."
                />
              </label>
            </div>

            <button className="admin-primary" type="submit">
              Publish Drop to Live Storefront <span>→</span>
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
