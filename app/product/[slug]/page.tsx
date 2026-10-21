import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice } from "@/lib/utils";
import {
  getProductBySlug,
  getCurrentUserId,
  getRecipesUsingProduct,
  getWishlistProductIds,
} from "@/lib/data";
import { AddWithQuantity, WishlistButton } from "@/components/ProductActions";
import { BackButton } from "@/components/ui";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.description };
}

export default async function ProductPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [userId, recipes] = await Promise.all([
    getCurrentUserId(),
    getRecipesUsingProduct(product.id),
  ]);
  const wishlistIds = userId ? await getWishlistProductIds(userId) : new Set<string>();
  const archived = Boolean(product.archivedAt);
  const outOfStock = !archived && product.stock <= 0;
  const lowStock = !archived && !outOfStock && product.stock <= 10;

  return (
    <div className="-mx-4 -mt-2 md:mx-0 md:mt-0 md:grid md:grid-cols-2 md:items-start md:gap-10">
      <div className="relative h-[280px] bg-brand-pale md:aspect-square md:h-auto md:overflow-hidden md:rounded-2xl">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        <BackButton href="/" label="Back to shop" />
        <div className="absolute right-4 top-4 z-10">
          <WishlistButton productId={product.id} inWishlist={wishlistIds.has(product.id)} />
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-white px-5 pb-6 pt-6 md:mt-0 md:rounded-2xl md:p-8 md:shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-[22px] font-bold leading-tight md:text-3xl">
            {product.name}
          </h1>
          <p className="shrink-0 font-display text-2xl font-black text-brand md:text-3xl">
            {formatPrice(product.priceCents, product.currency)}
          </p>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          {[product.size, product.isPrivateLabel ? "Our Brand" : null, product.category]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {(product.isPrivateLabel || product.badges.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {product.isPrivateLabel && (
              <span className="rounded-full bg-gold-light px-3 py-1 text-xs font-semibold text-gold-dark">
                🏷️ Private Label
              </span>
            )}
            {product.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-brand"
              >
                ✓ {badge}
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 text-sm leading-relaxed text-ink-mid md:text-base">
          {product.description}
        </p>
        {outOfStock && (
          <p className="mt-2 text-sm font-semibold text-danger">Out of stock</p>
        )}
        {lowStock && (
          <p className="mt-2 text-sm font-semibold text-gold-dark">
            Only {product.stock} left
          </p>
        )}

        {recipes.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2.5 font-display text-[15px] font-bold">Use in these recipes 🍳</h2>
            <div className="flex flex-wrap gap-2">
              {recipes.map((recipe) => (
                <Link
                  key={recipe.slug}
                  href={`/recipes/${recipe.slug}`}
                  className="rounded-xl bg-brand-pale px-3.5 py-2 text-[13px] font-medium text-brand transition hover:bg-brand hover:text-white"
                >
                  🍲 {recipe.title}
                  {recipe.isPremium && " ⭐"}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          {archived ? (
            <p className="rounded-xl bg-cream px-4 py-3 text-sm font-medium text-ink-mid">
              We no longer sell this product.
            </p>
          ) : (
            <AddWithQuantity
              productId={product.id}
              priceCents={product.priceCents}
              currency={product.currency}
              stock={product.stock}
            />
          )}
        </div>
      </div>
    </div>
  );
}
