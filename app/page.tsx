import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import {
  getProducts,
  getCategories,
  getCurrentUserId,
  getWishlistProductIds,
} from "@/lib/data";

export default async function Home(props: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await props.searchParams;
  const active = category ?? "All";
  const query = q?.trim() ?? "";

  const [products, categories, userId] = await Promise.all([
    getProducts(active, query),
    getCategories(),
    getCurrentUserId(),
  ]);

  const wishlistIds = userId ? await getWishlistProductIds(userId) : new Set<string>();
  const tabs = ["All", ...categories];

  // Preserve the active search term when switching category tabs.
  const tabHref = (tab: string) => {
    const params = new URLSearchParams();
    if (tab !== "All") params.set("category", tab);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div>
      <div className="mb-8">
        {query ? (
          <>
            <h1 className="text-3xl font-bold">
              Results for &ldquo;{query}&rdquo;
            </h1>
            <p className="mt-1 text-stone-600">
              {products.length} {products.length === 1 ? "item" : "items"} found.{" "}
              <Link href="/" className="text-emerald-700 hover:underline">
                Clear search
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Taste of home.</h1>
            <p className="mt-1 text-stone-600">
              Authentic African essentials, delivered across the UK. Free delivery over £70.
            </p>
          </>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={tabHref(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === active
                ? "bg-emerald-600 text-white"
                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-stone-500">
          {query ? "No products match your search." : "No products in this category."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inWishlist={wishlistIds.has(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
