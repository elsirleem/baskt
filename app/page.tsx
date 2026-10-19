import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { getProducts, getCategories, getCurrentUserId, getUserTier } from "@/lib/data";
import { categoryIcon } from "@/lib/categories";

export default async function Home(props: {
  searchParams: Promise<{ category?: string; q?: string; brand?: string }>;
}) {
  const { category, q, brand } = await props.searchParams;
  const active = category ?? "All";
  const query = q?.trim() ?? "";
  const ourLabelOnly = brand === "ours";
  const filtering = Boolean(query) || active !== "All" || ourLabelOnly;

  const [products, categories, ourLabel, userId] = await Promise.all([
    getProducts({ category: active, query, privateLabel: ourLabelOnly }),
    getCategories(),
    filtering ? Promise.resolve([]) : getProducts({ privateLabel: true }),
    getCurrentUserId(),
  ]);
  const tier = userId ? await getUserTier(userId) : "PAYG";
  const tabs = ["All", ...categories];

  // Preserve the active search term when switching category tiles.
  const tabHref = (tab: string) => {
    const params = new URLSearchParams();
    if (tab !== "All") params.set("category", tab);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div>
      <form action="/" role="search" className="mb-5">
        <label className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-white px-4 py-3 shadow-[0_1px_6px_rgba(0,0,0,0.06)] transition focus-within:border-brand">
          <SearchIcon className="h-5 w-5 shrink-0 text-ink-soft" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search African groceries…"
            aria-label="Search products"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-soft"
          />
        </label>
      </form>

      {!filtering && (
        <section className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-brand to-brand-dark p-5 md:p-8">
          <div className="absolute -right-5 -top-5 h-36 w-36 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 right-8 h-32 w-32 rounded-full bg-gold/15" />
          <span className="relative inline-block rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
            ✨ AfroPlus members
          </span>
          <h1 className="relative mt-2 max-w-[190px] font-display text-xl font-bold leading-snug text-white md:max-w-md md:text-3xl">
            {tier === "PLUS" ? "You save 10% on every order" : "Save 10% on every order"}
          </h1>
          <Link
            href={tier === "PLUS" ? "#all-products" : "/membership"}
            className="relative mt-3 inline-block rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-brand transition hover:bg-brand-pale md:mt-5 md:px-5 md:py-2.5 md:text-sm"
          >
            {tier === "PLUS" ? "Shop now" : "See plans"}
          </Link>
          <div
            className="absolute right-6 top-1/2 -translate-y-1/2 text-5xl md:right-14 md:text-7xl"
            aria-hidden="true"
          >
            🌿
          </div>
        </section>
      )}

      <SectionHeader title="Categories" />
      <div className="-mx-4 mb-6 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
        {tabs.map((tab) => {
          const isActive = tab === active && !ourLabelOnly;
          return (
            <Link
              key={tab}
              href={tabHref(tab)}
              aria-current={isActive ? "page" : undefined}
              className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-[54px] w-[54px] items-center justify-center rounded-2xl border-2 text-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition ${
                  isActive
                    ? "border-brand bg-brand-pale"
                    : "border-transparent bg-white group-hover:border-brand/30"
                }`}
                aria-hidden="true"
              >
                {categoryIcon(tab)}
              </span>
              <span
                className={`text-center text-[11px] leading-tight ${
                  isActive ? "font-semibold text-brand" : "font-medium text-ink-mid"
                }`}
              >
                {tab}
              </span>
            </Link>
          );
        })}
      </div>

      {!filtering && ourLabel.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Our Label 🏷️" href="/?brand=ours" />
          <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-6">
            {ourLabel.slice(0, 6).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-[150px] shrink-0 md:w-auto"
              />
            ))}
          </div>
        </section>
      )}

      {!filtering && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/fresh"
            className="flex items-center justify-between gap-3 rounded-2xl bg-linear-to-br from-fresh to-gold px-5 py-4 transition hover:brightness-105"
          >
            <div>
              <span className="inline-block rounded-full bg-white/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                Monthly add-on
              </span>
              <p className="mt-1.5 font-display text-[17px] font-bold text-ink">
                Fresh Produce Box
              </p>
              <p className="text-xs text-ink/80">UK farm-sourced fruit, veg &amp; British beef</p>
            </div>
            <span className="text-5xl" aria-hidden="true">
              🥬
            </span>
          </Link>

          {tier !== "PLUS" && (
            <Link
              href="/membership"
              className="flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-gold bg-gold-light px-5 py-4 transition hover:brightness-[0.98]"
            >
              <div>
                <p className="font-display text-[15px] font-bold text-ink">Upgrade to AfroPlus ⭐</p>
                <p className="text-xs text-ink-mid">10% off + free delivery on all orders</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-black text-brand">£39.99</p>
                <p className="text-[10px] text-ink-soft">per year</p>
              </div>
            </Link>
          )}
        </div>
      )}

      <section id="all-products" className="scroll-mt-4">
        {filtering ? (
          <div className="mb-4">
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              {query ? <>Results for &ldquo;{query}&rdquo;</> : ourLabelOnly ? "Our Label 🏷️" : active}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {products.length} {products.length === 1 ? "item" : "items"} ·{" "}
              <Link href="/" className="font-semibold text-brand hover:underline">
                Clear
              </Link>
            </p>
          </div>
        ) : (
          <SectionHeader title="All Products" />
        )}

        {products.length === 0 ? (
          <p className="py-8 text-center text-ink-soft">
            {query ? "No products match your search." : "No products in this category."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
