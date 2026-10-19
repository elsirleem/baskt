import Image from "next/image";
import Link from "next/link";
import type { Product } from "@prisma/client";
import { formatPrice } from "@/lib/utils";
import { cardClass } from "@/components/ui";
import { AddToCartButton } from "@/components/ProductActions";

export function PrivateLabelBadge() {
  return (
    <span className="absolute left-2 top-2 rounded-md bg-gold px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink">
      Our Brand
    </span>
  );
}

export function ProductCard({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const href = `/product/${product.slug}`;

  return (
    <div className={`${cardClass} flex flex-col overflow-hidden ${className}`}>
      <Link href={href} className="relative block aspect-[4/3] bg-brand-pale">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
        />
        {product.isPrivateLabel && <PrivateLabelBadge />}
      </Link>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <Link
          href={href}
          className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink hover:text-brand md:text-sm"
        >
          {product.name}
        </Link>
        {product.size && <p className="mt-0.5 text-[11px] text-ink-soft md:text-xs">{product.size}</p>}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display text-[15px] font-bold text-brand md:text-base">
            {formatPrice(product.priceCents, product.currency)}
          </span>
          <AddToCartButton
            productId={product.id}
            productName={product.name}
            disabled={product.stock <= 0}
          />
        </div>
      </div>
    </div>
  );
}
