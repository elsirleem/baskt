import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { DeleteProductButton } from "@/components/DeleteProductButton";

export const metadata = { title: "Admin — Products" };

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });

  return (
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
            <tr key={product.id}>
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
                    <p className="font-medium text-ink">{product.name}</p>
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
              <td className="px-4 py-3 text-ink-mid">{product.stock}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-4">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteProductButton id={product.id} name={product.name} />
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
  );
}
