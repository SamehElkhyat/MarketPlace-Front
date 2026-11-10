import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface GuestCartItem {
  sku: string;
  qty: number;
}

const MAX_QTY = 99;

interface CartState {
  /** Guest cart — lives in the browser. Signed-in carts live on the server; this is merged in on login. */
  guestItems: GuestCartItem[];
  addGuest: (sku: string, qty: number, maxStock?: number) => void;
  setGuestQty: (sku: string, qty: number) => void;
  removeGuest: (sku: string) => void;
  clearGuest: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      guestItems: [],
      addGuest: (sku, qty, maxStock) =>
        set(({ guestItems }) => {
          const existing = guestItems.find((i) => i.sku === sku);
          const cap = Math.min(MAX_QTY, maxStock ?? MAX_QTY);
          const next = Math.min((existing?.qty ?? 0) + qty, cap);
          return {
            guestItems: existing
              ? guestItems.map((i) => (i.sku === sku ? { ...i, qty: next } : i))
              : [...guestItems, { sku, qty: next }],
          };
        }),
      setGuestQty: (sku, qty) =>
        set(({ guestItems }) => ({
          guestItems:
            qty <= 0
              ? guestItems.filter((i) => i.sku !== sku)
              : guestItems.map((i) => (i.sku === sku ? { ...i, qty: Math.min(qty, MAX_QTY) } : i)),
        })),
      removeGuest: (sku) => set(({ guestItems }) => ({ guestItems: guestItems.filter((i) => i.sku !== sku) })),
      clearGuest: () => set({ guestItems: [] }),
    }),
    {
      name: "atelier-guest-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestItems: state.guestItems }),
    },
  ),
);
