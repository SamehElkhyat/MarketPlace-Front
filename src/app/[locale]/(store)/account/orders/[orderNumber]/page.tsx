import { Suspense } from "react";
import { OrderDetail } from "@/features/account/order-detail";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


async function Content({ params }: Pick<PageProps<"/[locale]/account/orders/[orderNumber]">, "params">) {
  const { orderNumber } = await params;
  return <OrderDetail orderNumber={orderNumber} />;
}

export default function OrderPage(props: PageProps<"/[locale]/account/orders/[orderNumber]">) {
  return (
    <Suspense fallback={<div className="min-h-[50dvh]" aria-busy />}>
      <Content params={props.params} />
    </Suspense>
  );
}
