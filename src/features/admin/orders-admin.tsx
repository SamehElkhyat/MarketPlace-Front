"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OptionSummary } from "@/components/layout/cart-drawer";
import { Money } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatusBadge } from "@/features/account/order-status";
import { OrderTimeline } from "@/features/account/order-detail";
import { AdminHeading, ConfirmDialog, DataTable, Pager, useWriteGuard } from "@/features/admin/admin-ui";
import { useDebounced } from "@/hooks/use-debounced";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { Link, useLocalizedRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { Order, OrderStatus, Page } from "@/lib/api/types";
import { formatDate, pick } from "@/lib/format";

const STATUSES: OrderStatus[] = ["pending_payment", "paid", "pending_confirmation", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];

export function OrdersAdmin() {
  const t = useT();
  const locale = useLocale();
  const router = useLocalizedRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 300);

  const query = useQuery({
    queryKey: ["admin", "orders", { page, status, method, q }],
    queryFn: () =>
      api<Page<Order>>("/admin/orders", {
        query: { page, limit: 20, status: status === "all" ? undefined : status, paymentMethod: method === "all" ? undefined : method, q: q || undefined },
      }),
    placeholderData: (previous) => previous,
  });

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      { header: t("order.number"), cell: ({ row }) => <span className="font-medium tabular-nums" dir="ltr">{row.original.orderNumber}</span> },
      { header: t("admin.orders.customer"), cell: ({ row }) => <span><span className="block">{row.original.customer?.name}</span><span className="text-xs text-muted-foreground" dir="ltr">{row.original.customer?.email}</span></span> },
      { header: t("admin.orders.date"), cell: ({ row }) => formatDate(row.original.createdAt, locale, "datetime") },
      { header: t("admin.orders.status"), cell: ({ row }) => <OrderStatusBadge status={row.original.status} /> },
      { header: t("order.payment"), cell: ({ row }) => t(`checkout.method.${row.original.paymentMethod}.label`) },
      { header: t("checkout.total"), cell: ({ row }) => <Money amount={row.original.total} /> },
    ],
    [t, locale],
  );

  return (
    <>
      <AdminHeading title={t("admin.nav.orders")} description={t("admin.orders.subtitle")} />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("admin.orders.search")} aria-label={t("admin.orders.search")} className="h-10 max-w-xs" dir="ltr" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-10 w-48" aria-label={t("admin.orders.status")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.orders.allStatuses")}</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`order.status.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
          <SelectTrigger className="h-10 w-44" aria-label={t("order.payment")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.orders.allMethods")}</SelectItem>
            {(["cod", "card", "wallet", "fawry"] as const).map((m) => <SelectItem key={m} value={m}>{t(`checkout.method.${m}.label`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={query.data?.items} loading={query.isPending} onRowClick={(o) => router.push(`/admin/orders/${o.id}`)} emptyTitle={t("admin.orders.empty")} />
      {query.data ? <Pager page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} onPage={setPage} /> : null}
    </>
  );
}

export function OrderAdminDetail({ id }: { id: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");

  const query = useQuery({ queryKey: ["admin", "orders", id], queryFn: async () => (await api<{ order: Order }>(`/admin/orders/${id}`)).order });

  const transition = useMutation({
    mutationFn: (to: OrderStatus) => api<{ order: Order }>(`/admin/orders/${id}/transition`, { method: "POST", body: { to, ...(note.trim() ? { note: note.trim() } : {}) } }),
    onSuccess: ({ order }) => {
      queryClient.setQueryData(["admin", "orders", id], order);
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"], exact: false });
      void queryClient.invalidateQueries({ queryKey: ["admin", "new-count"] });
      toast.success(t("admin.orders.updated"));
      setPending(null);
      setNote("");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.isError || !query.data) return <p role="alert" className="text-destructive">{errorMessage(query.error)}</p>;
  const order = query.data;
  const destructive = (s: OrderStatus) => s === "cancelled" || s === "refunded";

  return (
    <>
      <AdminHeading
        title={order.orderNumber}
        description={formatDate(order.createdAt, locale, "datetime")}
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            {/* Only the transitions the state machine allows right now are offered. */}
            {order.allowedActions.map((to) => (
              <Button key={to} size="sm" variant={destructive(to) ? "destructive" : "default"} disabled={disabled} onClick={() => setPending(to)}>
                {t(`admin.orders.action.${to}`)}
              </Button>
            ))}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="border border-border bg-card p-5">
            <h2 className="mb-4 font-sans text-base font-medium tracking-normal">{t("order.items")}</h2>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.sku} className="flex gap-4 py-3">
                  <div className="media-4x5 w-14 shrink-0">{item.image ? <Image src={item.image} alt="" fill sizes="56px" className="object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p>{pick(item.title, locale)}</p>
                    <OptionSummary line={item} />
                    <p className="text-xs text-muted-foreground" dir="ltr">{item.sku} × {item.qty}</p>
                  </div>
                  <Money amount={item.lineTotal} className="text-sm" />
                </li>
              ))}
            </ul>
            <dl className="mt-4 ms-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("cart.subtotal")}</dt><dd><Money amount={order.subtotal} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("checkout.shipping")}</dt><dd><Money amount={order.shippingFee} /></dd></div>
              {order.discount > 0 ? <div className="flex justify-between"><dt className="text-muted-foreground">{t("checkout.discount")} {order.couponCode ? `(${order.couponCode})` : ""}</dt><dd>− <Money amount={order.discount} /></dd></div> : null}
              <div className="flex justify-between border-t border-border pt-2 font-medium"><dt>{t("checkout.total")}</dt><dd><Money amount={order.total} /></dd></div>
            </dl>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="border border-border bg-card p-5 text-sm">
              <h2 className="mb-3 font-sans text-base font-medium tracking-normal">{t("admin.orders.customer")}</h2>
              <p>{order.customer?.name}</p>
              <p className="text-muted-foreground" dir="ltr">{order.customer?.email}</p>
              {order.customer ? <Button asChild variant="link" size="xs" className="mt-2"><Link href={`/admin/customers`}>{t("admin.nav.customers")}</Link></Button> : null}
            </section>
            <section className="border border-border bg-card p-5 text-sm">
              <h2 className="mb-3 font-sans text-base font-medium tracking-normal">{t("order.deliveryAddress")}</h2>
              <address className="leading-relaxed text-muted-foreground not-italic">
                {order.shippingAddress.fullName}<br />{order.shippingAddress.street}, {order.shippingAddress.city}<br /><span dir="ltr">{order.shippingAddress.phone}</span>
              </address>
              {order.customerNote ? <p className="mt-3 border-t border-border pt-3 text-xs">“{order.customerNote}”</p> : null}
            </section>
          </div>
        </div>

        <aside className="border border-border bg-card p-5">
          <h2 className="mb-6 font-sans text-base font-medium tracking-normal">{t("order.timeline")}</h2>
          <OrderTimeline order={order} />
        </aside>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? t(`admin.orders.action.${pending}`) : ""}
        description={pending ? t("admin.orders.confirmTransition", { status: t(`order.status.${pending}`) }) : ""}
        confirmLabel={t("common.confirm")}
        destructive={pending ? destructive(pending) : false}
        pending={transition.isPending}
        onConfirm={() => pending && transition.mutate(pending)}
      >
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.orders.notePlaceholder")} aria-label={t("admin.orders.notePlaceholder")} maxLength={500} />
      </ConfirmDialog>
    </>
  );
}
