"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api/client";
import type { AdminCategory, AttributeDef, Brand } from "@/lib/api/types";

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await api<{ items: AdminCategory[] }>("/admin/categories")).items,
  });
}

export function useAdminBrands() {
  return useQuery({
    queryKey: ["admin", "brands"],
    queryFn: async () => (await api<{ items: Brand[] }>("/admin/brands")).items,
  });
}

/** Depth-first flattening with the level, so selects can show `Fashion › Men › T-shirts` indentation. */
export function flattenCategories(categories: AdminCategory[]): (AdminCategory & { depth: number })[] {
  const byParent = new Map<string | null, AdminCategory[]>();
  for (const category of categories) {
    const key = category.parentId;
    byParent.set(key, [...(byParent.get(key) ?? []), category]);
  }
  const out: (AdminCategory & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const child of (byParent.get(parent) ?? []).sort((a, b) => a.sortOrder - b.sortOrder)) {
      out.push({ ...child, depth });
      walk(child._id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Attributes are inherited down the tree (Fashion → Men → T-shirts); a child may override a key. */
export function effectiveAttributes(categories: AdminCategory[], categoryId: string | undefined): AttributeDef[] {
  if (!categoryId) return [];
  const byId = new Map(categories.map((c) => [c._id, c]));
  const chain: AdminCategory[] = [];
  for (let current = byId.get(categoryId); current; current = current.parentId ? byId.get(current.parentId) : undefined) {
    chain.unshift(current);
  }
  const merged = new Map<string, AttributeDef>();
  for (const category of chain) for (const attribute of category.attributes) merged.set(attribute.key, attribute);
  return [...merged.values()];
}

export function useCategoryList() {
  const query = useAdminCategories();
  const flat = useMemo(() => flattenCategories(query.data ?? []), [query.data]);
  return { ...query, flat };
}
