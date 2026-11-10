import { HeaderClient } from "@/components/layout/header-client";
import { getCategoryTree } from "@/lib/data/catalog";

/** Server wrapper: the (cached) category tree feeds the mega menu without any client-side fetching. */
export async function SiteHeader() {
  const tree = await getCategoryTree();
  return <HeaderClient tree={tree} />;
}
