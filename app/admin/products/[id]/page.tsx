import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/ProductForm";
import { updateProduct } from "@/lib/actions/admin";
import { getCategories, requireAdmin } from "@/lib/data";

export const metadata = { title: "Admin — Edit product" };

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await props.params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getCategories(),
  ]);
  if (!product) notFound();

  // Bind the product id so the form action matches the (prev, formData) shape.
  const action = updateProduct.bind(null, product.id);

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">Edit: {product.name}</h2>
      <ProductForm
        action={action}
        product={product}
        categories={categories}
        submitLabel="Save changes"
      />
    </div>
  );
}
