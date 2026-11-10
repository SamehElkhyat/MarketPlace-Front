import { Suspense } from "react";
import { OrderAdminDetail } from "@/features/admin/orders-admin";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


async function Content({ params }: Pick<PageProps<"/[locale]/admin/orders/[id]">, "params">) {
  const { id } = await params;
  return <OrderAdminDetail id={id} />;
}

export default function AdminOrderPage(props: PageProps<"/[locale]/admin/orders/[id]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
