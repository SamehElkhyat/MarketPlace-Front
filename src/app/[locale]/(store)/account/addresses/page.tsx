import { AddressesView } from "@/features/account/addresses-view";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


export default function AddressesPage() {
  return <AddressesView />;
}
