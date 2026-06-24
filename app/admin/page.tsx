import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { DeleteProductButton } from "@/components/DeleteProductButton";

export const metadata = { title: "Admin — Products" };

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-left text-stone-500">
          <tr>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Stock</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-stone-200">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <span className="font-medium text-stone-800">{product.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-stone-600">{product.category}</td>
              <td className="px-4 py-3">{formatPrice(product.priceCents, product.currency)}</td>
              <td className="px-4 py-3 text-stone-600">{product.stock}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-4">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-sm text-emerald-700 hover:underline"
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
        <p className="px-4 py-8 text-center text-stone-500">
          No products yet. Create one to get started.
        </p>
      )}
    </div>
  );
}
