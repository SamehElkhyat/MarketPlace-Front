"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "@/lib/api/client";
import type { CartView } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { applyQty, applyRemove, overlayGuestQuantities } from "./optimistic";

export const cartKey = (mode: "account" | "guest", items?: unknown) => ["cart", mode, items] as const;

const EMPTY_CART: CartView = { items: [], itemCount: 0, subtotal: 0, hasBlockingIssues: false };

/**
 * Every cart write shares one mutation key + scope. The scope makes TanStack Query run them strictly one
 * after another, so two quick taps on "+" can never reach the server out of order (the classic lost-update /
 * stale-overwrite race), and the key lets us tell whether a response is the *latest* one still in flight.
 */
const CART_MUTATION_KEY = ["cart", "write"] as const;
const CART_SCOPE = { id: "cart" } as const;

type Snapshot = { previous: CartView | undefined } | undefined;

/**
 * One cart API for the whole UI.
 *  - signed in  → the server cart is the source of truth (`/cart`); quantity changes are applied optimistically,
 *                 serialized, and rolled back (then re-fetched) if the server refuses.
 *  - guest      → quantities live in localStorage; the SERVER still prices them (`/cart/preview`)
 * Prices, stock and warnings always come from the server; optimistic numbers are a brief estimate it overwrites.
 */
export function useCart() {
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const guestItems = useCartStore((s) => s.guestItems);
  const { addGuest, setGuestQty, removeGuest } = useCartStore.getState();
  const signedIn = status === "authenticated";
  const accountKey = cartKey("account");

  const query = useQuery({
    queryKey: signedIn ? accountKey : cartKey("guest", guestItems),
    queryFn: async () =>
      signedIn
        ? (await api<{ cart: CartView }>("/cart")).cart
        : (await api<{ cart: CartView }>("/cart/preview", { method: "POST", body: { items: guestItems }, auth: false })).cart,
    enabled: status !== "loading" && (signedIn || guestItems.length > 0),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  /** True while this is the only cart write left — only then is its response the freshest truth. */
  const isLatestWrite = () => queryClient.isMutating({ mutationKey: CART_MUTATION_KEY }) <= 1;

  const commit = (cart: CartView | null) => {
    if (cart && isLatestWrite()) queryClient.setQueryData(accountKey, cart);
  };

  const optimistic = async (apply: (cart: CartView) => CartView): Promise<Snapshot> => {
    if (!signedIn) return undefined;
    await queryClient.cancelQueries({ queryKey: accountKey }); // an in-flight GET must not clobber the edit
    const previous = queryClient.getQueryData<CartView>(accountKey);
    if (previous) queryClient.setQueryData(accountKey, apply(previous));
    return { previous };
  };

  const recover = (snapshot: Snapshot) => {
    if (!signedIn) return;
    if (snapshot?.previous) queryClient.setQueryData(accountKey, snapshot.previous);
    // Queued writes may have stacked more guesses on top; once the queue drains, ask the server what is true.
    if (isLatestWrite()) void queryClient.invalidateQueries({ queryKey: accountKey });
  };

  const add = useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: async ({ sku, qty, stock }: { sku: string; qty: number; stock?: number }) => {
      if (!signedIn) {
        addGuest(sku, qty, stock);
        return null;
      }
      return (await api<{ cart: CartView }>("/cart/items", { method: "POST", body: { sku, qty } })).cart;
    },
    onSuccess: commit,
  });

  const setQty = useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: async ({ sku, qty }: { sku: string; qty: number }) => {
      if (!signedIn) {
        setGuestQty(sku, qty);
        return null;
      }
      return (await api<{ cart: CartView }>(`/cart/items/${encodeURIComponent(sku)}`, { method: "PATCH", body: { qty } })).cart;
    },
    onMutate: ({ sku, qty }) => optimistic((cart) => applyQty(cart, sku, qty)),
    onError: (_error, _vars, snapshot) => recover(snapshot),
    onSuccess: commit,
  });

  const remove = useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: CART_SCOPE,
    mutationFn: async (sku: string) => {
      if (!signedIn) {
        removeGuest(sku);
        return null;
      }
      return (await api<{ cart: CartView }>(`/cart/items/${encodeURIComponent(sku)}`, { method: "DELETE" })).cart;
    },
    onMutate: (sku) => optimistic((cart) => applyRemove(cart, sku)),
    onError: (_error, _sku, snapshot) => recover(snapshot),
    onSuccess: commit,
  });

  const acknowledgePrices = useCallback(async () => {
    if (!signedIn) return;
    queryClient.setQueryData(cartKey("account"), (await api<{ cart: CartView }>("/cart/acknowledge-prices", { method: "POST" })).cart);
  }, [signedIn, queryClient]);

  const priced = signedIn || guestItems.length > 0 ? (query.data ?? EMPTY_CART) : EMPTY_CART;
  // Guests: local quantities are instant, the priced preview trails by one round trip — show the former over the latter.
  // `overlayGuestQuantities` returns the same reference when nothing differs, so steady state causes no re-render.
  const cart = signedIn ? priced : overlayGuestQuantities(priced, guestItems);
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
