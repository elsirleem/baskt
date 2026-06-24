import Image from "next/image";
import Link from "next/link";
import type { Product } from "@prisma/client";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton, WishlistButton } from "@/components/ProductActions";

export function ProductCard({
  product,
  inWishlist,
}: {
  product: Product;
  inWishlist: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
      <Link href={`/product/${product.slug}`} className="relative block aspect-square">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
        />
        {product.isPrivateLabel && (
          <span className="absolute left-2 top-2 rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Baskt
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs uppercase tracking-wide text-stone-400">
          {product.category}
        </span>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 font-medium text-stone-900 hover:text-emerald-700"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="font-semibold">
            {formatPrice(product.priceCents, product.currency)}
          </span>
          <div className="flex items-center gap-2">
            <WishlistButton productId={product.id} inWishlist={inWishlist} />
            <AddToCartButton productId={product.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
