import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { productApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import UserMenu from "../components/UserMenu";
import { loadCart, saveCart, updateCartItemQuantity, updateCartItemSize, type CartItem } from "../data/cart";
import { formatINR, loadCatalog, parseSizes, type Product } from "../data/catalog";

const ArrowIcon = ({ diagonal = false }: { diagonal?: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path
      d={diagonal ? "M5 19 19 5M8 5h11v11" : "M5 12h14m-5-5 5 5-5 5"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BagIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path
      d="M5.5 8.5h13l1 12h-15l1-12ZM9 9V6a3 3 0 0 1 6 0v3"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link
        className="product-image-wrap"
        to={`/products/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        {(product.badge || product.stock <= 0) && (
          <span className="product-badge">
            {product.stock <= 0 ? "Out of stock" : product.badge}
          </span>
        )}
        <img className="product-image" src={product.image} alt={product.name} />
        <span className="quick-view">View Details</span>
      </Link>

      <Link
        to={`/products/${product.id}`}
        className="product-card-link"
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div className="product-details">
          <div>
            <p className="product-category">
              {product.category} · {product.tone} · {product.sizes}
            </p>
            <h3>{product.name}</h3>
            <p className="product-price">{formatINR(product.price)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

const TrashIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="14" height="14">
    <path
      d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);


export default function App() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>(loadCatalog);
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [navHidden, setNavHidden] = useState(false);


  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleCartSync = () => setCart(loadCart());
    window.addEventListener("forma-cart-updated", handleCartSync);
    return () => window.removeEventListener("forma-cart-updated", handleCartSync);
  }, []);

  const searchResults = products.filter((product) =>
    `${product.name} ${product.category} ${product.tone} ${product.sizes}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    document.body.style.overflow = cartOpen || menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, menuOpen, searchOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    let mounted = true;
    productApi.getProducts().then((data) => {
      if (mounted && data.length > 0) {
        setProducts(data);
      }
    });

    const refreshCatalog = () => setProducts(loadCatalog());
    window.addEventListener("forma-catalog-updated", refreshCatalog);
    return () => {
      mounted = false;
      window.removeEventListener("forma-catalog-updated", refreshCatalog);
    };
  }, []);


  useEffect(() => {
    let previousScroll = window.scrollY;

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const scrollingDown = currentScroll > previousScroll;

      setNavHidden(scrollingDown && currentScroll > 120 && !menuOpen);
      previousScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = document.querySelectorAll<HTMLElement>("[data-reveal]");

    if (reducedMotion) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px -4% 0px" },
    );

    revealElements.forEach((element) => observer.observe(element));

    let frame = 0;
    const heroImage = document.querySelector<HTMLElement>(".hero > img");
    const updateParallax = () => {
      frame = 0;
      if (heroImage && window.scrollY < window.innerHeight) {
        heroImage.style.setProperty("--parallax-y", `${window.scrollY * 0.09}px`);
      }
    };
    const handleParallax = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax);
    };

    window.addEventListener("scroll", handleParallax, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleParallax);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      const nextCart = existing
        ? current.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...current, { ...product, quantity: 1 }];
      saveCart(nextCart);
      return nextCart;
    });
    setCartOpen(true);
  };

  const updateCart = (id: number, size: string | undefined, amount: number) => {
    const res = updateCartItemQuantity(id, size, amount);
    if (res.success || amount < 0) {
      setCart(res.cart);
    }
  };

  const updateCartSize = (id: number, oldSize: string | undefined, newSize: string) => {
    const nextCart = updateCartItemSize(id, oldSize, newSize);
    setCart(nextCart);
  };

  const deleteFromCart = (id: number, size?: string) => {
    setCart((current) => {
      const nextCart = current.filter(
        (item) => !(item.id === id && (item.selectedSize || "") === (size || ""))
      );
      saveCart(nextCart);
      return nextCart;
    });
  };

  return (
    <div className="site-shell">
      <div className="announcement" aria-label="Current promotions">
        <div className="ticker">
          {[0, 1].map((group) => (
            <div className="ticker-group" key={group} aria-hidden={group === 1}>
              <span>Mid-season edit: up to 30% off</span>
              <i />
              <span>Complimentary shipping over ₹10,000</span>
              <i />
              <span>Members get early access</span>
              <i />
            </div>
          ))}
        </div>
      </div>

      <header className={`header ${navHidden ? "is-hidden" : ""}`}>
        <button
          className={`menu-button ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <a href="#" onClick={() => setMenuOpen(false)}>
            Home
          </a>
          <a href="/products" onClick={() => setMenuOpen(false)}>
            New arrivals
          </a>
          <a href="/products" onClick={() => setMenuOpen(false)}>
            Shop
          </a>
          <a href="#editorial" onClick={() => setMenuOpen(false)}>
            Editorial
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About
          </a>
          {isAuthenticated ? (
            <>
              <a className="mobile-account-link" href="/orders" onClick={() => setMenuOpen(false)}>
                My Orders
              </a>
              {isAdmin && (
                <a className="mobile-account-link" href="/admin" onClick={() => setMenuOpen(false)}>
                  Studio Admin →
                </a>
              )}
              <button
                type="button"
                className="mobile-account-link mobile-logout-link"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
              >
                Sign Out ({user?.firstName || user?.name})
              </button>
            </>
          ) : (
            <>
              <a className="mobile-account-link" href="/login" onClick={() => setMenuOpen(false)}>
                Sign In
              </a>
              <a
                className="mobile-account-link"
                href="/register"
                onClick={() => setMenuOpen(false)}
              >
                Create Account
              </a>
            </>
          )}
        </nav>
        <a className="wordmark" href="#" aria-label="Forma home">
          FORMA<span>®</span>
        </a>
        <div className="header-actions">
          <button className="text-action search-trigger" onClick={() => setSearchOpen(true)}>
            Search
          </button>
          <UserMenu />
          <button
            type="button"
            className="bag-action"
            onClick={() => window.dispatchEvent(new Event("forma-open-cart"))}
            aria-label={`Shopping bag with ${itemCount} items`}
          >
            <BagIcon />
            <span className="bag-text">Bag</span>
            <span className="bag-count-badge">{itemCount}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <img
            src="https://images.unsplash.com/photo-1783697861961-04c5cdb1afbb?auto=format&fit=crop&w=2000&q=90"
            alt="Model in a contemporary outfit seated by modern architecture"
          />
          <div className="hero-overlay" />
          <div className="hero-kicker">
            <span>Collection 05</span>
            <span>New forms for now</span>
          </div>
          <div className="hero-content">
            <p>Spring / Summer 2026</p>
            <h1>
              Everyday,
              <br />
              re-formed.
            </h1>
            <a href="#shop" className="light-cta">
              Shop the collection <ArrowIcon />
            </a>
          </div>
          <p className="hero-side-note">Designed for movement — made to remain</p>
        </section>

        <section className="intro" id="about" data-reveal="up">
          <p className="section-number">01 / Philosophy</p>
          <div>
            <h2>Less noise. More intention.</h2>
            <p>
              We make considered clothing for real life—quietly expressive pieces with
              strong silhouettes, responsible fabrics, and a long view.
            </p>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading" data-reveal="up">
            <div>
              <p className="eyebrow">The current edit</p>
              <h2>Built to live in.</h2>
            </div>
            <a href="#shop">
              View all pieces <ArrowIcon />
            </a>
          </div>
          <nav className="category-nav" aria-label="Shop by category" data-reveal="up">
            <a href="/products">All</a>
            <a href="/products">New arrivals</a>
            <a href="/products?category=T-shirts">T-shirts</a>
            <a href="/products?category=Bottoms">Bottoms</a>
            <a href="/products?category=Shorts">Shorts</a>
            <a href="/products?category=Accessories">Accessories</a>
          </nav>
          <div className="product-grid" data-reveal="up">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </section>

        <section className="size-guide" id="size" data-reveal="up">
          <div className="size-guide-heading">
            <div>
              <p className="section-number">Size chart / Unisex</p>
              <h2>Find your form.</h2>
            </div>
            <p>
              Measurements are in centimetres and refer to body measurements. For a
              relaxed fit, choose one size up.
            </p>
          </div>
          <div className="size-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest</th>
                  <th>Waist</th>
                  <th>Hip</th>
                  <th>India size</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["XS", "81–86", "66–71", "84–89", "36"],
                  ["S", "86–91", "71–76", "89–94", "38"],
                  ["M", "91–97", "76–81", "94–99", "40"],
                  ["L", "97–104", "81–89", "99–107", "42"],
                  ["XL", "104–112", "89–97", "107–114", "44"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="size-note">
            Bottoms are also available in waist sizes 26–36. Accessories marked “One
            size” include adjustable fittings.
          </p>
        </section>

        <section className="editorial" id="editorial">
          <div className="editorial-image main-shot" data-reveal="left">
            <img
              src="https://images.unsplash.com/photo-1769614552343-a86788218525?auto=format&fit=crop&w=1200&q=88"
              alt="Woman walking through a colonnade in a minimalist outfit"
            />
            <span>Look 09</span>
          </div>
          <div className="editorial-copy" data-reveal="up">
            <p className="section-number">02 / Editorial</p>
            <h2>In between spaces</h2>
            <p>
              A study in soft structure. The new collection moves between city geometry
              and unhurried moments.
            </p>
            <a href="#journal">
              Explore the story <ArrowIcon diagonal />
            </a>
          </div>
          <div className="editorial-image detail-shot" data-reveal="right">
            <img
              src="https://images.unsplash.com/photo-1783697857653-ba945c8546a6?auto=format&fit=crop&w=900&q=88"
              alt="Woman in sunglasses sitting on architectural steps"
            />
            <span>Look 14</span>
          </div>
        </section>

        <section className="newsletter" id="journal">
          <div data-reveal="up">
            <p className="eyebrow">The Forma dispatch</p>
            <h2>Good things, occasionally.</h2>
          </div>
          <form data-reveal="up" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="email">Email address</label>
            <div>
              <input id="email" type="email" placeholder="you@example.com" required />
              <button aria-label="Join newsletter">
                <ArrowIcon />
              </button>
            </div>
            <p>New releases, studio notes, and no unnecessary noise.</p>
          </form>
        </section>
      </main>

      <footer>
        <div className="footer-top" data-reveal="up">
          <a className="footer-logo" href="#">
            FORMA®
          </a>
          <div className="footer-links">
            <div>
              <p>Shop</p>
              <a href="#shop">New arrivals</a>
              <a href="#shop">Clothing</a>
              <a href="#shop">Accessories</a>
              <a href="#shop">Archive sale</a>
            </div>
            <div>
              <p>Help</p>
              <a href="#shipping">Shipping & returns</a>
              <a href="#contact">Contact</a>
              <a href="#care">Care guide</a>
              <a href="#size">Size guide</a>
            </div>
            <div>
              <p>Follow</p>
              <a href="#instagram">Instagram</a>
              <a href="#pinterest">Pinterest</a>
              <a href="#tiktok">TikTok</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Forma Studio</span>
          <div>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <button>India / INR</button>
          </div>
        </div>
      </footer>

      <section
        className={`search-panel ${searchOpen ? "is-open" : ""}`}
        aria-hidden={!searchOpen}
        aria-label="Search products"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSearchOpen(false);
        }}
      >
        <div className="search-dialog" role="dialog" aria-modal="true">
          <div className="search-panel-header">
            <h2>Search</h2>
            <button onClick={() => setSearchOpen(false)} aria-label="Close search">
              ×
            </button>
          </div>
          <div className="search-input-wrap">
            <input
              id="product-search"
              type="search"
              placeholder="Suggested searches"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus={searchOpen}
              tabIndex={searchOpen ? 0 : -1}
            />
            <button
              className="search-submit"
              type="button"
              aria-label="Search products"
              onClick={() => {
                setSearchOpen(false);
                navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="m16 16 4 4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="popular-searches">
            <h3>Popular categories</h3>
            <div>
              {["Bottoms", "T-shirts", "Overshirt", "Shorts"].map((category) => (
                <button key={category} onClick={() => setSearchQuery(category)}>
                  <span>↗</span> {category}
                </button>
              ))}
            </div>
          </div>

          <div className="suggestion-heading">
            <h3>{searchQuery ? "Search results" : "Suggestions"}</h3>
            <span>{searchResults.length} pieces</span>
          </div>

          {searchResults.length > 0 ? (
            <div className="search-results">
              {searchResults.slice(0, 5).map((product) => (
                <article className="search-result-card" key={product.id}>
                  <img src={product.image} alt="" />
                  <div className="search-result-info">
                    <div>
                      <p>{product.category}</p>
                      <h4>{product.name}</h4>
                      <span>
                        {product.tone} · Sizes {product.sizes}
                      </span>
                    </div>
                    <strong>{formatINR(product.price)}</strong>
                  </div>
                  <button
                    disabled={product.stock <= 0}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/products/${product.id}`);
                    }}
                  >
                    {product.stock <= 0 ? "Out of stock" : "View piece"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-search">
              <p>No pieces found for “{searchQuery}”.</p>
              <button onClick={() => setSearchQuery("")}>View all pieces</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
