import { CustomersAdmin } from "@/features/admin/sales-admin";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


export default function Page() {
  return <CustomersAdmin />;
}
