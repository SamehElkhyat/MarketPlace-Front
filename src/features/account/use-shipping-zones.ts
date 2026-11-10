"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ShippingZone } from "@/lib/api/types";

/** Governorates with delivery fee + ETA (public data, cached for an hour). */
export function useShippingZones() {
  return useQuery({
    queryKey: ["shipping-zones"],
    queryFn: async () => (await api<{ items: ShippingZone[] }>("/shipping/zones", { auth: false })).items,
    staleTime: 60 * 60_000,
  });
}
