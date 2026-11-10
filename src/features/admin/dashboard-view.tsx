"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared/price";
import { AdminHeading, StatCard } from "@/features/admin/admin-ui";
import { OrderStatusBadge } from "@/features/account/order-status";
import { useLocale, useT } from "@/i18n/client";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { DashboardData, OrderStatus } from "@/lib/api/types";
import { formatDate, formatMoney, formatNumber, pick } from "@/lib/format";

export function DashboardView() {
  const t = useT();
  const locale = useLocale();
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api<DashboardData>("/admin/dashboard"),
    refetchInterval: 60_000,
  });

  if (isPending) {
    return (
      <>
        <AdminHeading title={t("admin.nav.dashboard")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="mt-6 h-80 w-full" />
      </>
    );
  }
  if (isError || !data) return <p role="alert" className="text-destructive">{t("errors.generic")}</p>;

  const salesConfig = { revenue: { label: t("admin.dashboard.revenue"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const categoriesConfig = { revenue: { label: t("admin.dashboard.revenue"), color: "var(--chart-2)" } } satisfies ChartConfig;
  const salesData = data.salesByDay.map((d) => ({ date: formatDate(d.date, locale, "short"), revenue: d.revenue / 100, orders: d.orders }));
  const categoryData = data.topCategories.map((c) => ({ name: pick(c.name, locale), revenue: c.revenue / 100 }));
  const statuses = Object.entries(data.orderStatusCounts) as [OrderStatus, number][];

  return (
    <>
      <AdminHeading title={t("admin.nav.dashboard")} description={t("admin.dashboard.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("admin.dashboard.revenueToday")} value={<Money amount={data.today.revenue} />} hint={t("admin.dashboard.ordersCount", { count: data.today.orders })} />
        <StatCard label={t("admin.dashboard.revenueMonth")} value={<Money amount={data.month.revenue} />} hint={t("admin.dashboard.ordersCount", { count: data.month.orders })} />
        <StatCard label={t("admin.dashboard.aov")} value={<Money amount={data.month.averageOrderValue} />} hint={t("admin.dashboard.thisMonth")} />
        <StatCard label={t("admin.dashboard.pending")} value={formatNumber((data.orderStatusCounts.pending_confirmation ?? 0) + (data.orderStatusCounts.paid ?? 0), locale)} hint={<Link href="/admin/orders" className="underline underline-offset-4">{t("admin.dashboard.reviewOrders")}</Link>} />
      </div>

      <section className="mt-6 border border-border bg-card p-5" aria-labelledby="sales-heading">
        <h2 id="sales-heading" className="mb-4 font-sans text-base font-medium tracking-normal">{t("admin.dashboard.sales30")}</h2>
        <ChartContainer config={salesConfig} className="h-72 w-full">
          <AreaChart data={salesData} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} reversed={locale === "ar"} />
            <YAxis tickLine={false} axisLine={false} width={56} orientation={locale === "ar" ? "right" : "left"} tickFormatter={(v: number) => formatMoney(v * 100, locale, { compact: true })} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value) * 100, locale)} />} />
            <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.12} strokeWidth={1.5} />
          </AreaChart>
        </ChartContainer>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-border bg-card p-5" aria-labelledby="top-products">
          <h2 id="top-products" className="mb-4 font-sans text-base font-medium tracking-normal">{t("admin.dashboard.topProducts")}</h2>
          {data.topProducts.length === 0 ? <p className="text-sm text-muted-foreground">{t("admin.dashboard.noSales")}</p> : (
            <ol className="divide-y divide-border">
              {data.topProducts.map((p, index) => (
                <li key={p.productId} className="flex items-center gap-3 py-3 text-sm">
                  <span className="w-5 text-muted-foreground tabular-nums">{formatNumber(index + 1, locale)}</span>
                  <span className="min-w-0 flex-1 truncate">{pick(p.title, locale)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{t("admin.dashboard.units", { count: p.qty })}</span>
                  <Money amount={p.revenue} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="border border-border bg-card p-5" aria-labelledby="top-categories">
          <h2 id="top-categories" className="mb-4 font-sans text-base font-medium tracking-normal">{t("admin.dashboard.topCategories")}</h2>
          <ChartContainer config={categoriesConfig} className="h-60 w-full">
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid horizontal={false} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={96} orientation={locale === "ar" ? "right" : "left"} />
              <XAxis type="number" hide reversed={locale === "ar"} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value) * 100, locale)} />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={2} />
            </BarChart>
          </ChartContainer>
        </section>

        <section className="border border-border bg-card p-5" aria-labelledby="low-stock">
          <h2 id="low-stock" className="mb-4 font-sans text-base font-medium tracking-normal">{t("admin.dashboard.lowStock")}</h2>
          {data.lowStock.length === 0 ? <p className="text-sm text-muted-foreground">{t("admin.dashboard.stockOk")}</p> : (
            <ul className="divide-y divide-border">
              {data.lowStock.map((item) => (
                <li key={item.sku} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0"><span className="block truncate">{pick(item.title, locale)}</span><span className="text-xs text-muted-foreground" dir="ltr">{item.sku}</span></span>
                  <Badge variant={item.stock === 0 ? "destructive" : "warning"}>{item.stock === 0 ? t("product.soldOut") : t("admin.dashboard.left", { count: item.stock })}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border bg-card p-5" aria-labelledby="by-status">
          <h2 id="by-status" className="mb-4 font-sans text-base font-medium tracking-normal">{t("admin.dashboard.byStatus")}</h2>
          <ul className="space-y-3">
            {statuses.map(([status, count]) => (
              <li key={status} className="flex items-center justify-between text-sm"><OrderStatusBadge status={status} /><span className="tabular-nums">{formatNumber(count, locale)}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
