import { ProductForm } from "@/components/ProductForm";
import { createProduct } from "@/lib/actions/admin";

export const metadata = { title: "Admin — New product" };

export default function NewProductPage() {
  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">New product</h2>
      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  );
}
