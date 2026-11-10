import { ProductForm } from "@/features/admin/product-form";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


export default function NewProductPage() {
  return <ProductForm />;
}
