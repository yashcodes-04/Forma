import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { productApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import StorePageHeader from "../components/StorePageHeader";
import { addProductToCart, getProductCartQuantity } from "../data/cart";
import { formatINR, loadCatalog, parseSizes, type Product } from "../data/catalog";
import "../store-pages.css";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  // Instant cached fallback
  const cached = loadCatalog().find((item) => item.id === Number(id));
  const [product, setProduct] = useState<Product | null>(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [sizeError, setSizeError] = useState<string>("");
  const [cartQty, setCartQty] = useState(() => getProductCartQuantity(Number(id)));

  useEffect(() => {
    const handleCartChange = () => {
      setCartQty(getProductCartQuantity(Number(id)));
    };
    window.addEventListener("forma-cart-updated", handleCartChange);
    return () => window.removeEventListener("forma-cart-updated", handleCartChange);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    if (id) {
      productApi
        .getProductById(id)
        .then((data) => {
          if (mounted && data) {
            setProduct(data);
            setSelectedImage(data.image);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="store-page">
        <StorePageHeader title="Loading..." />
        <div className="product-missing">
          <p>Loading piece details...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="store-page">
        <StorePageHeader title="Product not found" />
        <div className="product-missing">
          <h1>Piece not found.</h1>
          <Link to="/products">Return to collection</Link>
        </div>
      </main>
    );
  }

  const activeImage = selectedImage || product.image;
  const availableSizes = parseSizes(product.sizes);
  const isFreeSize =
    availableSizes.length === 1 &&
    (availableSizes[0] === "One size" ||
      availableSizes[0].toLowerCase().includes("free") ||
      availableSizes[0].toLowerCase().includes("universal"));

  const isMaxStockInBag = cartQty >= product.stock;

  const handleAddToCart = () => {
    if (product.stock <= 0) return;

    // Validate size selection if not freesized
    if (!isFreeSize && !selectedSize) {
      setSizeError("Please select your size before adding to bag.");
      return;
    }

    const finalSize = isFreeSize ? "One size" : selectedSize;
    const res = addProductToCart(product, finalSize);

    if (!res.success) {
      setSizeError(res.error || "Unable to add to bag.");
      return;
    }

    setSizeError("");
    setCartQty(getProductCartQuantity(product.id));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);

    // Automatically open shopping bag drawer
    window.dispatchEvent(new Event("forma-open-cart"));
  };

  return (
    <main className="store-page">
      <StorePageHeader title={product.name} />
      <section className="product-page">
        <div className="product-page-image">
          <img src={activeImage} alt={product.name} />
        </div>
        <div className="product-page-copy">
          <p>
            {product.category} / {product.badge ?? "Collection"}
          </p>
          <h1>{product.name}</h1>

          {/* Pricing Row with Clean Gap and Strikethrough Regular Price */}
          <div className="product-price-row">
            <span className="product-current-price">{formatINR(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <div className="product-compare-wrap">
                <span className="product-regular-label">MRP</span>
                <span className="product-compare-price">
                  {formatINR(product.compare_at_price)}
                </span>
                <span className="product-discount-pill">
                  {Math.round(
                    ((product.compare_at_price - product.price) / product.compare_at_price) * 100
                  )}
                  % OFF
                </span>
              </div>
            )}
          </div>

          <div className="product-facts">
            <div>
              <span>Colour</span>
              <p>{product.tone}</p>
            </div>
            <div>
              <span>Format</span>
              <p>{isFreeSize ? "Universal fit" : product.sizes}</p>
            </div>
            <div>
              <span>Availability</span>
              <p>
                {product.stock <= 0
                  ? "Out of stock"
                  : isAdmin
                  ? `In stock (${product.stock} units)`
                  : product.stock <= 4
                  ? "Limited allocation"
                  : "In stock"}
              </p>
            </div>
          </div>

          {/* Interactive Size Selector */}
          <div className={`product-size-section ${sizeError ? "has-error" : ""}`}>
            <div className="product-size-header">
              <span className="size-section-label">Select Size</span>
              {selectedSize && (
                <span className="selected-size-indicator">
                  Selected: <strong>{selectedSize}</strong>
                </span>
              )}
              {isFreeSize && (
                <span className="freesize-tag">One Size / Universal</span>
              )}
            </div>

            {!isFreeSize ? (
              <div className="size-pills-grid" role="radiogroup" aria-label="Available sizes">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      type="button"
                      key={size}
                      className={`size-pill-btn ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedSize(size);
                        setSizeError("");
                      }}
                      aria-checked={isSelected}
                      role="radio"
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="freesize-badge-banner">
                <span>✓ Fits all sizes comfortably (Free size)</span>
              </div>
            )}

            {sizeError && (
              <div className="size-error-message" role="alert">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {sizeError}
              </div>
            )}
          </div>

          <p className="product-description">
            {product.description ||
              "A considered Forma staple designed for everyday movement, finished with a relaxed silhouette and durable construction."}
          </p>

          <button
            className={`product-add-btn ${added ? "is-added" : ""}`}
            disabled={product.stock <= 0 || isMaxStockInBag}
            onClick={handleAddToCart}
          >
            {product.stock <= 0
              ? "Out of stock"
              : isMaxStockInBag
              ? `Max stock in bag (${cartQty})`
              : added
              ? `Added to bag ${selectedSize ? `(${selectedSize})` : ""}`
              : "Add to bag"}
          </button>
        </div>
      </section>
    </main>
  );
}

