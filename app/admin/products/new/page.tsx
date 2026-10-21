import { ProductForm } from "@/components/ProductForm";
import { createProduct } from "@/lib/actions/admin";
import { getCategories, requireAdmin } from "@/lib/data";

export const metadata = { title: "Admin — New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getCategories();

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">New product</h2>
      <ProductForm action={createProduct} categories={categories} submitLabel="Create product" />
    </div>
  );
}
