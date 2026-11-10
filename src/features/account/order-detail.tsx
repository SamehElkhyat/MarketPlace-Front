"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, PartyPopper } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { OptionSummary } from "@/components/layout/cart-drawer";
import { Money } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge, TIMELINE_STEPS } from "@/features/account/order-status";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { Order, OrderStatus } from "@/lib/api/types";
import { formatDate, pick } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Vertical timeline driven by `statusHistory`: completed steps carry the real timestamp. */
export function OrderTimeline({ order }: { order: Order }) {
  const t = useT();
  const locale = useLocale();
  const reached = new Map(order.statusHistory.map((h) => [h.status, h]));
  const terminal = order.status === "cancelled" || order.status === "refunded";
  const steps: OrderStatus[] = order.paymentMethod === "cod" ? [...TIMELINE_STEPS] : ["pending_payment", "paid", "processing", "shipped", "delivered"];

  return (
    <ol className="space-y-0" aria-label={t("order.timeline")}>
      {steps.map((step, index) => {
        const entry = reached.get(step);
        const done = Boolean(entry);
        const last = index === steps.length - 1 && !terminal;
        return (
          <li key={step} className="relative flex gap-4 pb-8 last:pb-0">
            {!last ? <span aria-hidden className={cn("absolute start-[11px] top-6 h-[calc(100%-1.5rem)] w-px", done ? "bg-foreground" : "bg-border")} /> : null}
            <span className={cn("z-10 flex size-6 shrink-0 items-center justify-center rounded-full border", done ? "border-foreground bg-foreground text-background" : "border-border bg-background")}>
              {done ? <Check className="size-3.5" /> : null}
            </span>
            <div className={cn("-mt-0.5", !done && "text-muted-foreground")}>
              <p className="text-sm font-medium">{t(`order.status.${step}`)}</p>
              {entry ? <time className="text-xs text-muted-foreground" dateTime={entry.at}>{formatDate(entry.at, locale, "datetime")}</time> : null}
              {entry?.note ? <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p> : null}
            </div>
          </li>
        );
      })}
      {terminal ? (
        <li className="relative flex gap-4 pt-8">
          <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-destructive bg-destructive text-background"><Check className="size-3.5" /></span>
          <div className="-mt-0.5">
            <p className="text-sm font-medium text-destructive">{t(`order.status.${order.status}`)}</p>
            {reached.get(order.status) ? <time className="text-xs text-muted-foreground">{formatDate(reached.get(order.status)!.at, locale, "datetime")}</time> : null}
            {order.cancelReason ? <p className="mt-1 text-xs text-muted-foreground">{order.cancelReason}</p> : null}
          </div>
        </li>
      ) : null}
    </ol>
  );
}

export function OrderDetail({ orderNumber }: { orderNumber: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const justPlaced = useSearchParams().get("placed") === "1";

  const query = useQuery({
    queryKey: ["orders", orderNumber],
    queryFn: async () => (await api<{ order: Order }>(`/orders/${orderNumber}`)).order,
    // Gentle polling while the order is still moving (the page doubles as the payment "return" screen).
    refetchInterval: (q) => (q.state.data && ["pending_payment", "pending_confirmation", "confirmed", "processing", "shipped"].includes(q.state.data.status) ? 30_000 : false),
  });

  const cancel = useMutation({
    mutationFn: () => api<{ order: Order }>(`/orders/${orderNumber}/cancel`, { method: "POST", body: {} }),
    onSuccess: ({ order }) => {
      queryClient.setQueryData(["orders", orderNumber], order);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("order.cancelled"));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (query.isPending) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-72 w-full" /></div>;
  if (query.isError || !query.data) return <p role="alert" className="text-destructive">{errorMessage(query.error)}</p>;

  const order = query.data;
  const canCancel = order.allowedActions.includes("cancelled");

  return (
    <div className="space-y-10">
      {justPlaced ? (
        <div className="flex items-start gap-4 border border-success/40 bg-success/5 p-6" role="status">
          <PartyPopper className="mt-0.5 size-6 shrink-0 text-success" strokeWidth={1.25} />
          <div>
            <h2 className="text-lg">{t("order.thanks")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("order.thanksBody")}</p>
          </div>
        </div>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{t("order.number")}</p>
          <h1 className="text-xl tabular-nums" dir="ltr">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt, locale, "datetime")}</p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          {canCancel ? (
            <Button variant="destructive" size="sm" disabled={cancel.isPending} onClick={() => { if (window.confirm(t("order.cancelConfirm"))) cancel.mutate(); }}>
              {t("order.cancel")}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="page-grid gap-y-10">
        <section className="col-span-4 md:col-span-5" aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="mb-6 font-sans text-base font-medium tracking-normal">{t("order.timeline")}</h2>
          <OrderTimeline order={order} />
        </section>

        <div className="col-span-4 space-y-10 md:col-span-7">
          <section aria-labelledby="items-heading">
            <h2 id="items-heading" className="mb-4 font-sans text-base font-medium tracking-normal">{t("order.items")}</h2>
            <ul className="divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <li key={item.sku} className="flex gap-4 py-4">
                  <div className="media-4x5 w-16 shrink-0">{item.image ? <Image src={item.image} alt="" fill sizes="64px" className="object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p>{pick(item.title, locale)}</p>
                    <OptionSummary line={item} />
                    <p className="text-xs text-muted-foreground">{t("cart.qtyShort", { count: item.qty })} × <Money amount={item.unitPrice} /></p>
                  </div>
                  <Money amount={item.lineTotal} className="text-sm" />
                </li>
              ))}
            </ul>
            <dl className="mt-4 ms-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("cart.subtotal")}</dt><dd><Money amount={order.subtotal} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("checkout.shipping")}</dt><dd><Money amount={order.shippingFee} /></dd></div>
              {order.discount > 0 ? <div className="flex justify-between text-success"><dt>{t("checkout.discount")}</dt><dd>− <Money amount={order.discount} /></dd></div> : null}
              <div className="flex justify-between border-t border-border pt-2 text-base font-medium"><dt>{t("checkout.total")}</dt><dd><Money amount={order.total} /></dd></div>
            </dl>
          </section>

          <div className="grid gap-8 sm:grid-cols-2">
            <section>
              <h2 className="mb-3 font-sans text-base font-medium tracking-normal">{t("order.deliveryAddress")}</h2>
              <address className="text-sm leading-relaxed text-muted-foreground not-italic">
                {order.shippingAddress.fullName}<br />
                {order.shippingAddress.street}, {order.shippingAddress.city}<br />
                <span dir="ltr">{order.shippingAddress.phone}</span>
              </address>
            </section>
            <section>
              <h2 className="mb-3 font-sans text-base font-medium tracking-normal">{t("order.payment")}</h2>
              <p className="text-sm text-muted-foreground">{t(`checkout.method.${order.paymentMethod}.label`)}</p>
              <p className="text-sm text-muted-foreground">{t(`order.paymentStatus.${order.paymentStatus}`)}</p>
            </section>
          </div>

          <Button asChild variant="outline"><Link href="/account/orders">{t("order.backToOrders")}</Link></Button>
        </div>
      </div>
    </div>
  );
}
