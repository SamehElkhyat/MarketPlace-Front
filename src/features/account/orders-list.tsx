"use client";

import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/features/account/order-status";
import { useLocale, useT } from "@/i18n/client";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { Order, Page } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export function OrdersList() {
  const t = useT();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["orders", "list", page],
    queryFn: () => api<Page<Order>>("/orders", { query: { page, limit: 10 } }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl">{t("nav.myOrders")}</h1>
      {query.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("order.empty.title")}
          description={t("order.empty.description")}
          action={
            <Button asChild>
              <Link href="/collections/new-arrivals">{t("cart.empty.cta")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border border-y border-border">
            {query.data?.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-5 transition-colors hover:bg-card"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium tabular-nums" dir="ltr">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt, locale)} · {t("cart.items", { count: order.items.reduce((n, i) => n + i.qty, 0) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <OrderStatusBadge status={order.status} />
                    <Money amount={order.total} className="text-sm" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {query.data && query.data.totalPages > 1 ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t("common.previous")}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= query.data.totalPages} onClick={() => setPage((p) => p + 1)}>
                {t("common.next")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
