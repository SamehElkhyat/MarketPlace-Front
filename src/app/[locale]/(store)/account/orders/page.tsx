import { OrdersList } from "@/features/account/orders-list";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


export default function OrdersPage() {
  return <OrdersList />;
}
