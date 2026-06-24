import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/ProductForm";
import { updateProduct } from "@/lib/actions/admin";

export const metadata = { title: "Admin — Edit product" };

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  // Bind the product id so the form action matches the (prev, formData) shape.
  const action = updateProduct.bind(null, product.id);

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">Edit: {product.name}</h2>
      <ProductForm action={action} product={product} submitLabel="Save changes" />
    </div>
  );
}
