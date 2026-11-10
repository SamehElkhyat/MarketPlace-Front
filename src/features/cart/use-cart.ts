"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "@/lib/api/client";
import type { CartView } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";

export const cartKey = (mode: "account" | "guest", items?: unknown) => ["cart", mode, items] as const;

const EMPTY_CART: CartView = { items: [], itemCount: 0, subtotal: 0, hasBlockingIssues: false };

/**
 * One cart API for the whole UI.
 *  - signed in  → the server cart is the source of truth (`/cart`)
 *  - guest      → quantities live in localStorage; the SERVER still prices them (`/cart/preview`)
 * Prices, stock and warnings always come from the server — the browser never computes them.
 */
export function useCart() {
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const guestItems = useCartStore((s) => s.guestItems);
  const { addGuest, setGuestQty, removeGuest } = useCartStore.getState();
  const signedIn = status === "authenticated";

  const query = useQuery({
    queryKey: signedIn ? cartKey("account") : cartKey("guest", guestItems),
    queryFn: async () =>
      signedIn
        ? (await api<{ cart: CartView }>("/cart")).cart
        : (await api<{ cart: CartView }>("/cart/preview", { method: "POST", body: { items: guestItems }, auth: false })).cart,
    enabled: status !== "loading" && (signedIn || guestItems.length > 0),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const store = (cart: CartView) => queryClient.setQueryData(cartKey("account"), cart);

  const add = useMutation({
    mutationFn: async ({ sku, qty, stock }: { sku: string; qty: number; stock?: number }) => {
      if (!signedIn) {
        addGuest(sku, qty, stock);
        return null;
      }
      return (await api<{ cart: CartView }>("/cart/items", { method: "POST", body: { sku, qty } })).cart;
    },
    onSuccess: (cart) => cart && store(cart),
  });

  const setQty = useMutation({
    mutationFn: async ({ sku, qty }: { sku: string; qty: number }) => {
      if (!signedIn) {
        setGuestQty(sku, qty);
        return null;
      }
      return (await api<{ cart: CartView }>(`/cart/items/${encodeURIComponent(sku)}`, { method: "PATCH", body: { qty } })).cart;
    },
    onSuccess: (cart) => cart && store(cart),
  });

  const remove = useMutation({
    mutationFn: async (sku: string) => {
      if (!signedIn) {
        removeGuest(sku);
        return null;
      }
      return (await api<{ cart: CartView }>(`/cart/items/${encodeURIComponent(sku)}`, { method: "DELETE" })).cart;
    },
    onSuccess: (cart) => cart && store(cart),
  });

  const acknowledgePrices = useCallback(async () => {
    if (!signedIn) return;
    store((await api<{ cart: CartView }>("/cart/acknowledge-prices", { method: "POST" })).cart);
  }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const cart = signedIn || guestItems.length > 0 ? (query.data ?? EMPTY_CART) : EMPTY_CART;
  // Show the badge instantly for guests (no round trip needed to count what's in localStorage).
  const itemCount = signedIn ? cart.itemCount : guestItems.reduce((n, i) => n + i.qty, 0);

  return {
    cart,
    itemCount,
    isLoading: status === "loading" || (query.isPending && (signedIn || guestItems.length > 0)),
    add,
    setQty,
    remove,
    acknowledgePrices,
  };
}

/** After sign-in: pour the browser cart into the account cart, then clear the local copy. */
export async function mergeGuestCart(): Promise<CartView | null> {
  const { guestItems, clearGuest } = useCartStore.getState();
  if (guestItems.length === 0) return null;
  const { cart } = await api<{ cart: CartView }>("/cart/merge", { method: "POST", body: { items: guestItems } });
  clearGuest();
  return cart;
}
