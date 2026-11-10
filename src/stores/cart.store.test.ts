import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./cart.store";

const items = () => useCartStore.getState().guestItems;

describe("guest cart store", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ guestItems: [] });
  });

  it("adds new lines and merges quantities of the same SKU", () => {
    const { addGuest } = useCartStore.getState();
    addGuest("TEE-M", 1);
    addGuest("TEE-M", 2);
    addGuest("SHIRT-S", 1);
    expect(items()).toEqual([{ sku: "TEE-M", qty: 3 }, { sku: "SHIRT-S", qty: 1 }]);
  });

  it("never exceeds the known stock or the per-line maximum", () => {
    const { addGuest } = useCartStore.getState();
    addGuest("A", 5, 3);
    expect(items()[0]!.qty).toBe(3);
    addGuest("B", 500);
    expect(items()[1]!.qty).toBe(99);
  });

  it("sets, removes and clears", () => {
    const { addGuest, setGuestQty, removeGuest, clearGuest } = useCartStore.getState();
    addGuest("A", 1);
    addGuest("B", 1);
    setGuestQty("A", 4);
    expect(items().find((i) => i.sku === "A")!.qty).toBe(4);
    setGuestQty("A", 0); // zero removes
    expect(items().map((i) => i.sku)).toEqual(["B"]);
    removeGuest("B");
    expect(items()).toEqual([]);
    addGuest("C", 1);
    clearGuest();
    expect(items()).toEqual([]);
  });

  it("persists to localStorage so a refresh keeps the guest cart", () => {
    useCartStore.getState().addGuest("PERSIST", 2);
    expect(JSON.parse(localStorage.getItem("atelier-guest-cart")!).state.guestItems).toEqual([{ sku: "PERSIST", qty: 2 }]);
  });
});
