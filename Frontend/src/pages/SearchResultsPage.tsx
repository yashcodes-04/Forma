import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { productApi } from "../api/client";
import { formatINR, loadCatalog, type Product } from "../data/catalog";
import "../search-results.css";

export default function SearchResultsPage() {
  const [products, setProducts] = useState<Product[]>(loadCatalog);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState("All");
  const [priceRange, setPriceRange] = useState("All");
  const [sort, setSort] = useState("Featured");
  const [loading, setLoading] = useState(false);

  // Fetch results from backend API
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const apiParams: Record<string, any> = {};
    if (query.trim()) apiParams.q = query.trim();
    if (category !== "All") apiParams.category = category;

    if (priceRange === "Under ₹5,000") {
      apiParams.maxPrice = 4999;
    } else if (priceRange === "₹5,000–₹8,000") {
      apiParams.minPrice = 5000;
      apiParams.maxPrice = 8000;
    } else if (priceRange === "Above ₹8,000") {
      apiParams.minPrice = 8001;
    }

    if (sort === "Price: Low to high") {
      apiParams.sort = "price_asc";
    } else if (sort === "Price: High to low") {
      apiParams.sort = "price_desc";
    }

    productApi
      .getProducts(apiParams)
      .then((data) => {
        if (mounted) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [query, category, priceRange, sort]);

  const activeFilterCount =
    Number(category !== "All") + Number(priceRange !== "All") + Number(sort !== "Featured");

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchParams(input.trim() ? { q: input.trim() } : {});
  };

  return (
    <main className="results-page">
      <header className="results-header">
        <Link className="wordmark" to="/">
          FORMA<span>®</span>
        </Link>
        <Link to="/products">Back to shop</Link>
      </header>

      <section className="results-hero">
        <p>Search / Collection</p>
        <h1>{query ? `Results for “${query}”` : "All pieces"}</h1>
        <form onSubmit={submitSearch}>
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
          <button type="submit" aria-label="Submit search">
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
        </form>
      </section>

      <section className="results-content">
        <div className="results-meta">
          <span>{loading ? "Searching..." : `${products.length} pieces`}</span>
          <button
            className={filterOpen ? "is-active" : ""}
            onClick={() => setFilterOpen(!filterOpen)}
            aria-expanded={filterOpen}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h10M18 7h2M4 17h2m4 0h10M14 4v6M10 14v6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Filter {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
          </button>
        </div>

        <div className={`filter-panel ${filterOpen ? "is-open" : ""}`}>
          <div className="filter-group">
            <p>Category</p>
            <div>
              {[
                "All",
                "Outerwear",
                "Essentials",
                "Tailoring",
                "T-shirts",
                "Shorts",
                "Accessories",
                "Bottoms",
              ].map((option) => (
                <button
                  className={category === option ? "is-selected" : ""}
                  onClick={() => setCategory(option)}
                  key={option}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <p>Price</p>
            <div>
              {["All", "Under ₹5,000", "₹5,000–₹8,000", "Above ₹8,000"].map((option) => (
                <button
                  className={priceRange === option ? "is-selected" : ""}
                  onClick={() => setPriceRange(option)}
                  key={option}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <p>Sort by</p>
            <div>
              {["Featured", "Price: Low to high", "Price: High to low"].map((option) => (
                <button
                  className={sort === option ? "is-selected" : ""}
                  onClick={() => setSort(option)}
                  key={option}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-actions">
            <button
              onClick={() => {
                setCategory("All");
                setPriceRange("All");
                setSort("Featured");
              }}
            >
              Clear all
            </button>
            <button onClick={() => setFilterOpen(false)}>Show {products.length} pieces</button>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="results-grid">
            {products.map((product) => (
              <Link to={`/products/${product.id}`} className="result-product" key={product.id}>
                <div className="result-image">
                  {product.badge && <span>{product.badge}</span>}
                  <img src={product.image} alt={product.name} />
                </div>
                <p>
                  {product.category} · {product.tone}
                </p>
                <div>
                  <h2>{product.name}</h2>
                  <strong>{formatINR(product.price)}</strong>
                </div>
                <small>Available sizes: {product.sizes}</small>
              </Link>
            ))}
          </div>
        ) : (
          <div className="results-empty">
            <p>No products match “{query}”.</p>
            <button
              onClick={() => {
                setInput("");
                setSearchParams({});
                setCategory("All");
                setPriceRange("All");
              }}
            >
              View all products
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
