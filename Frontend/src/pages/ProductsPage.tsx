import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { productApi, type CategoryItem } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import StorePageHeader from "../components/StorePageHeader";
import { formatINR, loadCatalog, type Product } from "../data/catalog";
import "../store-pages.css";

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedCategory = params.get("category") ?? "All";
  const [products, setProducts] = useState<Product[]>(loadCatalog);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories from API
  useEffect(() => {
    let mounted = true;
    productApi.getCategories().then((cats: CategoryItem[]) => {
      if (mounted && cats.length > 0) {
        setCategories(["All", ...cats.map((c) => c.name)]);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch products from API based on selected category
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const filterParam = selectedCategory !== "All" ? { category: selectedCategory } : {};
    productApi
      .getProducts(filterParam)
      .then((data) => {
        if (mounted) {
          setProducts(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedCategory]);

  return (
    <main className="store-page">
      <StorePageHeader title="Products" />
      <section className="collection-heading">
        <p>Shop / All pieces</p>
        <h1>The collection.</h1>
        <div className="collection-filters">
          {categories.map((category) => (
            <button
              className={selectedCategory === category ? "is-active" : ""}
              onClick={() => setParams(category === "All" ? {} : { category })}
              key={category}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="catalog-grid">
        {products.map((product) => (
          <Link className="catalog-card" to={`/products/${product.id}`} key={product.id}>
            <div>
              {product.badge && <span>{product.badge}</span>}
              <img src={product.image} alt={product.name} />
            </div>
            <p>
              {product.category} · {product.tone}
            </p>
            <section>
              <h2>{product.name}</h2>
              <strong>{formatINR(product.price)}</strong>
            </section>
            <small>
              {product.stock <= 0
                ? "Out of stock"
                : isAdmin
                ? `${product.stock} available`
                : product.stock <= 4
                ? "Limited pieces"
                : "In stock"} ·{" "}
              {product.sizes}
            </small>
          </Link>
        ))}
      </section>
    </main>
  );
}
