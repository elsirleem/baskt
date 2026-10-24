import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserId, getSharedWishlist } from "@/lib/data";
import { ProductCard } from "@/components/ProductCard";
import { AddAllToCartButton } from "@/components/AddAllToCartButton";
import { PageTitle } from "@/components/ui";

// A private link: keep it out of search engines.
export const metadata: Metadata = {
  title: "Shared wishlist",
  robots: { index: false, follow: false },
};

export default async function SharedWishlistPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const [wishlist, viewerId] = await Promise.all([getSharedWishlist(token), getCurrentUserId()]);
  if (!wishlist) notFound();

  const { ownerFirstName, products } = wishlist;
  const inStock = products.filter((product) => product.stock > 0).map((product) => product.id);

  return (
    <div>
      <PageTitle
        subtitle={`African essentials ${ownerFirstName || "they"} would love, delivered across the UK. Add any of them to your own basket.`}
      >
        {ownerFirstName ? `${ownerFirstName}'s wishlist 🤍` : "A shared wishlist 🤍"}
      </PageTitle>

      {viewerId === wishlist.ownerId && (
        <p className="mb-4 rounded-xl bg-brand-pale px-4 py-3 text-sm text-brand">
          This is what people with your link see.{" "}
          <Link href="/wishlist" className="font-semibold underline">
            Back to your wishlist
          </Link>
        </p>
      )}
      {!viewerId && (
        <p className="mb-4 rounded-xl bg-gold-light px-4 py-3 text-sm text-gold-dark">
          <Link href="/login" className="font-semibold underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-semibold underline">
            create an account
          </Link>{" "}
          to add these to your basket.
        </p>
      )}

      {products.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-ink-soft">
          Nothing on this wishlist right now.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {viewerId && viewerId !== wishlist.ownerId && (
            <div className="mt-6">
              <AddAllToCartButton productIds={inStock} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
