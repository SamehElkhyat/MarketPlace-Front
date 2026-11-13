import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartLine, CartView } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth.store";
import { cartKey, useCart } from "./use-cart";

const apiMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: apiMock }));

const line = (qty: number): CartLine => ({ sku: "A", qty, available: true, unitPrice: 10_000, stock: 10, lineTotal: 10_000 * qty, warnings: [] });
const cartOf = (qty: number): CartView => ({ items: [line(qty)], itemCount: qty, subtotal: 10_000 * qty, hasBlockingIssues: false });

/** A request the test resolves by hand, so we control the order responses arrive in. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(cartKey("account"), cartOf(1));
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useCart(), { wrapper });
  return { client, ...hook };
}

describe("useCart (signed in)", () => {
  beforeEach(() => {
    apiMock.mockReset();
    useAuthStore.setState({ status: "authenticated" });
  });

  it("shows the new quantity immediately, before the server answers", async () => {
    const pending = deferred<{ cart: CartView }>();
    apiMock.mockImplementation((path: string) => (path === "/cart" ? Promise.resolve({ cart: cartOf(1) }) : pending.promise));
    const { result } = setup();

    act(() => result.current.setQty.mutate({ sku: "A", qty: 2 }));

    await waitFor(() => expect(result.current.cart.items[0]!.qty).toBe(2));
    expect(result.current.cart.subtotal).toBe(20_000);
    pending.resolve({ cart: cartOf(2) });
  });

  it("sends writes one at a time, in click order (no out-of-order lost update)", async () => {
    const first = deferred<{ cart: CartView }>();
    const second = deferred<{ cart: CartView }>();
    const queue = [first, second];
    apiMock.mockImplementation((path: string) => (path === "/cart" ? Promise.resolve({ cart: cartOf(1) }) : queue.shift()!.promise));
    const { result, client } = setup();

    act(() => {
      result.current.setQty.mutate({ sku: "A", qty: 2 });
      result.current.setQty.mutate({ sku: "A", qty: 3 });
    });

    await waitFor(() => expect(apiMock.mock.calls.filter(([p]) => p !== "/cart")).toHaveLength(1)); // 2nd is held back
    expect(result.current.cart.items[0]!.qty).toBe(3); // ...but the UI already shows the latest intent

    await act(async () => first.resolve({ cart: cartOf(2) }));
    await waitFor(() => expect(apiMock.mock.calls.filter(([p]) => p !== "/cart")).toHaveLength(2));
    // The stale "2" response must not overwrite the optimistic "3" while the second write is still in flight.
    expect(client.getQueryData<CartView>(cartKey("account"))!.items[0]!.qty).toBe(3);

    await act(async () => second.resolve({ cart: cartOf(3) }));
    await waitFor(() => expect(client.getQueryData<CartView>(cartKey("account"))!.items[0]!.qty).toBe(3));
    expect(apiMock.mock.calls.filter(([, o]) => o?.method === "PATCH").map(([, o]) => o.body.qty)).toEqual([2, 3]);
  });

  it("rolls back and re-fetches the server cart when a write is rejected", async () => {
    apiMock.mockImplementation((path: string, options?: { method?: string }) =>
      options?.method === "PATCH" ? Promise.reject(new Error("insufficient stock")) : Promise.resolve({ cart: cartOf(1) }),
    );
    const { result, client } = setup();

    await act(async () => {
      await result.current.setQty.mutateAsync({ sku: "A", qty: 9 }).catch(() => undefined);
    });

    expect(client.getQueryData<CartView>(cartKey("account"))!.items[0]!.qty).toBe(1);
    await waitFor(() => expect(apiMock.mock.calls.some(([p, o]) => p === "/cart" && !o)).toBe(true));
  });
});
