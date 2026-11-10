import { Suspense } from "react";
import { ProductForm } from "@/features/admin/product-form";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


async function Content({ params }: Pick<PageProps<"/[locale]/admin/products/[id]">, "params">) {
  const { id } = await params;
  return <ProductForm productId={id} />;
}

export default function EditProductPage(props: PageProps<"/[locale]/admin/products/[id]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
