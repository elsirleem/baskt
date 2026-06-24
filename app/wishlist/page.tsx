import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { getCurrentUserId, getWishlist } from "@/lib/data";
import {
  MoveToCartButton,
  RemoveFromWishlistButton,
} from "@/components/WishlistControls";

export const metadata = { title: "Your wishlist — Baskt" };

export default async function WishlistPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const items = await getWishlist(userId);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Your wishlist is empty</h1>
        <p className="mt-2 text-stone-600">
          Tap the ♡ on any product to save it for later.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
        >
          Browse catalogue
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your wishlist</h1>
      <ul className="divide-y divide-stone-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <Link
              href={`/product/${item.product.slug}`}
              className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-stone-200"
            >
              <Image
                src={item.product.imageUrl}
                alt={item.product.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </Link>

            <div className="flex flex-1 flex-col">
              <Link
                href={`/product/${item.product.slug}`}
                className="font-medium hover:text-emerald-700"
              >
                {item.product.name}
              </Link>
              <span className="text-sm text-stone-500">
                {formatPrice(item.product.priceCents, item.product.currency)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <MoveToCartButton productId={item.productId} />
              <RemoveFromWishlistButton productId={item.productId} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
