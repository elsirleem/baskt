import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice } from "@/lib/utils";
import {
  getProductBySlug,
  getCurrentUserId,
  getWishlistProductIds,
} from "@/lib/data";
import { AddToCartButton, WishlistButton } from "@/components/ProductActions";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found — Baskt" };
  return { title: `${product.name} — Baskt`, description: product.description };
}

export default async function ProductPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const userId = await getCurrentUserId();
  const wishlistIds = userId ? await getWishlistProductIds(userId) : new Set<string>();

  return (
    <div>
      <Link href="/" className="text-sm text-emerald-700 hover:underline">
        ← Back to catalogue
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-white">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        <div>
          <span className="text-xs uppercase tracking-wide text-stone-400">
            {product.category}
          </span>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold">
            {formatPrice(product.priceCents, product.currency)}
          </p>
          <p className="mt-4 leading-relaxed text-stone-600">{product.description}</p>
          <p className="mt-2 text-sm text-stone-500">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <AddToCartButton productId={product.id} className="px-6 py-3 text-base" />
            <WishlistButton
              productId={product.id}
              inWishlist={wishlistIds.has(product.id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
