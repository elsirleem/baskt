import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requireAdmin } from "@/lib/data";
import { ArchiveProductButton, DeleteProductButton } from "@/components/DeleteProductButton";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Admin — Products" };

/** Stock with a warning when it's low, gone, or oversold (two people paid for the last one). */
function StockCell({ stock }: { stock: number }) {
  if (stock < 0) return <span className="font-semibold text-danger">Oversold by {-stock}</span>;
  if (stock === 0) return <span className="font-semibold text-danger">Sold out</span>;
  if (stock <= 5) return <span className="font-semibold text-gold-dark">{stock} left</span>;
  return <span className="text-ink-mid">{stock}</span>;
}

export default async function AdminProductsPage() {
  await requireAdmin();
  // Archived products go to the bottom; order counts decide if Delete is allowed.
  const products = await prisma.product.findMany({
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    include: { _count: { select: { orderItems: true } } },
  });
  const archivedCount = products.filter((p) => p.archivedAt).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          Products ({products.length - archivedCount})
          {archivedCount > 0 && (
            <span className="ml-2 text-sm font-normal text-ink-soft">+ {archivedCount} archived</span>
          )}
        </h2>
        <Link href="/admin/products/new" className={`${buttonClass.primary} px-4 py-2.5 text-sm`}>
          + New product
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line bg-cream text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => (
              <tr key={product.id} className={product.archivedAt ? "bg-cream/60 text-ink-soft" : ""}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-brand-pale">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-ink">
                        {product.name}
                        {product.archivedAt && (
                          <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-[10px] font-bold uppercase text-ink-mid">
                            Archived
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {[product.size, product.isPrivateLabel ? "Our Brand" : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-mid">{product.category}</td>
                <td className="px-4 py-3">{formatPrice(product.priceCents, product.currency)}</td>
                <td className="px-4 py-3">
                  <StockCell stock={product.stock} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-sm font-semibold text-brand hover:underline"
                    >
                      Edit
                    </Link>
                    <ArchiveProductButton id={product.id} archived={Boolean(product.archivedAt)} />
                    {product._count.orderItems === 0 && (
                      <DeleteProductButton id={product.id} name={product.name} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <p className="px-4 py-8 text-center text-ink-soft">
            No products yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
