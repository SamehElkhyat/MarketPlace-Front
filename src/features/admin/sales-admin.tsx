"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { Money } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AdminHeading, ConfirmDialog, DataTable, Pager, useWriteGuard } from "@/features/admin/admin-ui";
import { useDebounced } from "@/hooks/use-debounced";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { api } from "@/lib/api/client";
import type { AdminCustomer, AuditLog, Coupon, InventoryLog, Page } from "@/lib/api/types";
import { formatDate, formatNumber, inputToPiasters, piastersToInput } from "@/lib/format";
import { GOVERNORATES } from "@/lib/governorates";
import { pick } from "@/lib/format";

/* ─────────────────────────────── Coupons ─────────────────────────────── */

interface CouponDraft { id?: string; code: string; type: "percent" | "fixed"; value: string; minOrder: string; maxDiscount: string; startsAt: string; expiresAt: string; maxUses: string; isActive: boolean }
const blankCoupon: CouponDraft = { code: "", type: "percent", value: "10", minOrder: "0", maxDiscount: "", startsAt: "", expiresAt: "", maxUses: "", isActive: true };
const dateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export function CouponsAdmin() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<CouponDraft | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const list = useQuery({ queryKey: ["admin", "coupons", page], queryFn: () => api<Page<Coupon>>("/admin/coupons", { query: { page, limit: 20 } }), placeholderData: (p) => p });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });

  const save = useMutation({
    mutationFn: (d: CouponDraft) => {
      const body = {
        code: d.code.trim().toUpperCase(),
        type: d.type,
        value: d.type === "percent" ? Math.round(Number(d.value)) : inputToPiasters(d.value),
        minOrder: inputToPiasters(d.minOrder || "0"),
        ...(d.maxDiscount.trim() ? { maxDiscount: inputToPiasters(d.maxDiscount) } : {}),
        ...(d.startsAt ? { startsAt: new Date(d.startsAt).toISOString() } : {}),
        ...(d.expiresAt ? { expiresAt: new Date(`${d.expiresAt}T23:59:59`).toISOString() } : {}),
        ...(d.maxUses.trim() ? { maxUses: Math.round(Number(d.maxUses)) } : {}),
        isActive: d.isActive,
      };
      return d.id ? api(`/admin/coupons/${d.id}`, { method: "PATCH", body }) : api("/admin/coupons", { method: "POST", body });
    },
    onSuccess: () => { toast.success(t("admin.saved")); setDraft(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("admin.deleted")); setDeleting(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Coupon, unknown>[]>(
    () => [
      { header: t("admin.coupons.code"), cell: ({ row }) => <span className="font-medium tracking-wide" dir="ltr">{row.original.code}</span> },
      { header: t("admin.coupons.discount"), cell: ({ row }) => (row.original.type === "percent" ? `${formatNumber(row.original.value, locale)}%` : <Money amount={row.original.value} />) },
      { header: t("admin.coupons.minOrder"), cell: ({ row }) => <Money amount={row.original.minOrder} /> },
      { header: t("admin.coupons.usage"), cell: ({ row }) => `${formatNumber(row.original.usedCount, locale)}${row.original.maxUses ? ` / ${formatNumber(row.original.maxUses, locale)}` : ""}` },
      { header: t("admin.coupons.expires"), cell: ({ row }) => (row.original.expiresAt ? formatDate(row.original.expiresAt, locale, "short") : "—") },
      { header: t("admin.orders.status"), cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "secondary"}>{t(row.original.isActive ? "admin.categories.active" : "admin.categories.inactive")}</Badge> },
      {
        id: "actions", header: "",
        cell: ({ row }) => (
          <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => { const c = row.original; setDraft({ id: c._id, code: c.code, type: c.type, value: c.type === "percent" ? String(c.value) : piastersToInput(c.value), minOrder: piastersToInput(c.minOrder), maxDiscount: c.maxDiscount ? piastersToInput(c.maxDiscount) : "", startsAt: dateInput(c.startsAt), expiresAt: dateInput(c.expiresAt), maxUses: c.maxUses ? String(c.maxUses) : "", isActive: c.isActive }); }}><Pencil /></Button>
            <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} disabled={disabled} onClick={() => setDeleting(row.original)}><Trash2 /></Button>
          </span>
        ),
      },
    ],
    [t, locale, disabled],
  );

  return (
    <>
      <AdminHeading title={t("admin.nav.coupons")} description={t("admin.coupons.subtitle")} actions={<Button size="sm" disabled={disabled} onClick={() => setDraft(blankCoupon)}><Plus /> {t("admin.coupons.new")}</Button>} />
      <DataTable columns={columns} data={list.data?.items} loading={list.isPending} emptyTitle={t("admin.coupons.empty")} />
      {list.data ? <Pager page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} /> : null}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-xl" closeLabel={t("common.close")}>
          <DialogHeader><DialogTitle>{draft?.id ? t("admin.coupons.edit") : t("admin.coupons.new")}</DialogTitle></DialogHeader>
          {draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("admin.coupons.code")} required><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} dir="ltr" /></Field>
              <Field label={t("admin.coupons.type")}>
                <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as CouponDraft["type"] })}>
                  <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">{t("admin.coupons.percent")}</SelectItem><SelectItem value="fixed">{t("admin.coupons.fixed")}</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label={draft.type === "percent" ? t("admin.coupons.valuePercent") : t("admin.coupons.valueEgp")} required><Input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} inputMode="decimal" dir="ltr" /></Field>
              <Field label={t("admin.coupons.minOrderEgp")}><Input value={draft.minOrder} onChange={(e) => setDraft({ ...draft, minOrder: e.target.value })} inputMode="decimal" dir="ltr" /></Field>
              {draft.type === "percent" ? <Field label={t("admin.coupons.maxDiscountEgp")}><Input value={draft.maxDiscount} onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value })} inputMode="decimal" dir="ltr" /></Field> : null}
              <Field label={t("admin.coupons.maxUses")}><Input value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })} inputMode="numeric" dir="ltr" /></Field>
              <Field label={t("admin.coupons.startsAt")}><Input type="date" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} dir="ltr" /></Field>
              <Field label={t("admin.coupons.expires")}><Input type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} dir="ltr" /></Field>
              <label className="flex items-center gap-3 text-sm sm:col-span-2"><Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} /> {t("admin.categories.active")}</label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{t("common.cancel")}</Button>
            <Button disabled={disabled || save.isPending || !draft?.code.trim() || !draft?.value.trim()} onClick={() => draft && save.mutate(draft)}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("admin.coupons.deleteTitle")} confirmLabel={t("common.delete")} destructive pending={remove.isPending} onConfirm={() => deleting && remove.mutate(deleting._id)} />
    </>
  );
}

/* ─────────────────────────────── Shipping ─────────────────────────────── */

interface Zone { governorate: string; fee: number; estimatedDays: { min: number; max: number }; isActive: boolean }
interface ZoneRow { fee: string; min: string; max: string; isActive: boolean; saved: boolean }

export function ShippingAdmin() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const zones = useQuery({ queryKey: ["admin", "shipping"], queryFn: async () => (await api<{ items: Zone[] }>("/admin/shipping-zones")).items });
  const [edits, setEdits] = useState<Record<string, ZoneRow>>({});

  const rows = useMemo(() => {
    const saved = new Map((zones.data ?? []).map((z) => [z.governorate, z]));
    return GOVERNORATES.map((g) => {
      const z = saved.get(g.key);
      const base: ZoneRow = z ? { fee: piastersToInput(z.fee), min: String(z.estimatedDays.min), max: String(z.estimatedDays.max), isActive: z.isActive, saved: true } : { fee: "", min: "1", max: "3", isActive: true, saved: false };
      return { key: g.key, name: pick(g, locale), row: edits[g.key] ?? base, dirty: Boolean(edits[g.key]) };
    });
  }, [zones.data, edits, locale]);

  const save = useMutation({
    mutationFn: ({ key, row }: { key: string; row: ZoneRow }) =>
      api(`/admin/shipping-zones/${key}`, { method: "PUT", body: { fee: inputToPiasters(row.fee || "0"), estimatedDays: { min: Number(row.min) || 0, max: Number(row.max) || 0 }, isActive: row.isActive } }),
    onSuccess: (_d, { key }) => {
      toast.success(t("admin.saved"));
      setEdits((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "shipping"] });
      void queryClient.invalidateQueries({ queryKey: ["shipping-zones"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const edit = (key: string, current: ZoneRow, partial: Partial<ZoneRow>) => setEdits((s) => ({ ...s, [key]: { ...current, ...partial } }));

  return (
    <>
      <AdminHeading title={t("admin.nav.shipping")} description={t("admin.shipping.subtitle")} />
      {zones.isPending ? <Skeleton className="h-96 w-full" /> : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[42rem] text-sm">
            <thead><tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-start font-medium">{t("address.governorate")}</th>
              <th className="px-2 text-start font-medium">{t("admin.shipping.fee")}</th>
              <th className="px-2 text-start font-medium">{t("admin.shipping.days")}</th>
              <th className="px-2 text-start font-medium">{t("admin.categories.active")}</th>
              <th />
            </tr></thead>
            <tbody>
              {rows.map(({ key, name, row, dirty }) => (
                <tr key={key} className="border-b border-border/60">
                  <td className="px-4 py-2">{name} {!row.saved ? <Badge variant="outline" className="ms-2">{t("admin.shipping.notSet")}</Badge> : null}</td>
                  <td className="px-2"><Input value={row.fee} onChange={(e) => edit(key, row, { fee: e.target.value })} inputMode="decimal" className="h-9 w-24" dir="ltr" aria-label={t("admin.shipping.fee")} /></td>
                  <td className="px-2"><span className="flex items-center gap-1" dir="ltr"><Input value={row.min} onChange={(e) => edit(key, row, { min: e.target.value })} inputMode="numeric" className="h-9 w-14" aria-label="min" /> – <Input value={row.max} onChange={(e) => edit(key, row, { max: e.target.value })} inputMode="numeric" className="h-9 w-14" aria-label="max" /></span></td>
                  <td className="px-2"><Switch checked={row.isActive} onCheckedChange={(v) => edit(key, row, { isActive: v })} aria-label={t("admin.categories.active")} /></td>
                  <td className="px-2 text-end"><Button size="sm" variant={dirty ? "default" : "ghost"} disabled={disabled || !dirty || !row.fee.trim() || save.isPending} onClick={() => save.mutate({ key, row })}><Save /> {t("common.save")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────── Customers ─────────────────────────────── */

export function CustomersAdmin() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<AdminCustomer | null>(null);
  const q = useDebounced(search.trim(), 300);
  const list = useQuery({ queryKey: ["admin", "customers", { page, q }], queryFn: () => api<Page<AdminCustomer>>("/admin/customers", { query: { page, limit: 20, q: q || undefined } }), placeholderData: (p) => p });

  const toggle = useMutation({
    mutationFn: (c: AdminCustomer) => api(`/admin/customers/${c.id}/status`, { method: "PATCH", body: { status: c.status === "banned" ? "active" : "banned" } }),
    onSuccess: () => { toast.success(t("admin.saved")); setTarget(null); void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<ColumnDef<AdminCustomer, unknown>[]>(
    () => [
      { header: t("auth.name"), cell: ({ row }) => <span><span className="block font-medium">{row.original.name}</span><span className="text-xs text-muted-foreground" dir="ltr">{row.original.email}</span></span> },
      { header: t("admin.customers.orders"), cell: ({ row }) => formatNumber(row.original.orders, locale) },
      { header: t("admin.customers.spent"), cell: ({ row }) => <Money amount={row.original.totalSpent} /> },
      { header: t("admin.customers.joined"), cell: ({ row }) => formatDate(row.original.createdAt, locale, "short") },
      { header: t("admin.orders.status"), cell: ({ row }) => <Badge variant={row.original.status === "banned" ? "destructive" : "success"}>{t(row.original.status === "banned" ? "admin.customers.banned" : "admin.categories.active")}</Badge> },
      { id: "a", header: "", cell: ({ row }) => <Button variant={row.original.status === "banned" ? "outline" : "destructive"} size="sm" disabled={disabled} onClick={() => setTarget(row.original)}>{t(row.original.status === "banned" ? "admin.customers.unban" : "admin.customers.ban")}</Button> },
    ],
    [t, locale, disabled],
  );

  return (
    <>
      <AdminHeading title={t("admin.nav.customers")} />
      <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("admin.customers.search")} aria-label={t("admin.customers.search")} className="mb-6 h-10 max-w-xs" />
      <DataTable columns={columns} data={list.data?.items} loading={list.isPending} emptyTitle={t("admin.customers.empty")} />
      {list.data ? <Pager page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} /> : null}
      <ConfirmDialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)} title={target?.status === "banned" ? t("admin.customers.unban") : t("admin.customers.ban")} description={target?.status === "banned" ? t("admin.customers.unbanBody") : t("admin.customers.banBody")} confirmLabel={t("common.confirm")} destructive={target?.status !== "banned"} pending={toggle.isPending} onConfirm={() => target && toggle.mutate(target)} />
    </>
  );
}

/* ─────────────────────────────── Inventory ─────────────────────────────── */

export function InventoryAdmin() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const [page, setPage] = useState(1);
  const [skuFilter, setSkuFilter] = useState("");
  const [sku, setSku] = useState("");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const filter = useDebounced(skuFilter.trim().toUpperCase(), 300);

  const logs = useQuery({ queryKey: ["admin", "inventory", { page, filter }], queryFn: () => api<Page<InventoryLog>>("/admin/inventory/logs", { query: { page, limit: 20, sku: filter || undefined } }), placeholderData: (p) => p });

  const adjust = useMutation({
    mutationFn: () => api<{ stock: number }>("/admin/inventory/adjust", { method: "POST", body: { sku: sku.trim().toUpperCase(), delta: Number(delta), note: note.trim() } }),
    onSuccess: ({ stock }) => {
      toast.success(t("admin.inventory.adjusted", { stock }));
      setDelta(""); setNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<ColumnDef<InventoryLog, unknown>[]>(
    () => [
      { header: t("admin.orders.date"), cell: ({ row }) => formatDate(row.original.createdAt, locale, "datetime") },
      { header: "SKU", cell: ({ row }) => <span dir="ltr">{row.original.sku}</span> },
      { header: t("admin.inventory.change"), cell: ({ row }) => <span className={row.original.delta < 0 ? "text-destructive tabular-nums" : "text-success tabular-nums"} dir="ltr">{row.original.delta > 0 ? "+" : ""}{row.original.delta}</span> },
      { header: t("admin.inventory.reason"), cell: ({ row }) => <span>{t(`admin.inventory.reasons.${row.original.reason}` as "admin.inventory.reasons.order_placed")}{row.original.note ? <span className="block text-xs text-muted-foreground">{row.original.note}</span> : null}</span> },
    ],
    [t, locale],
  );
  const valid = sku.trim().length >= 2 && Number.isInteger(Number(delta)) && Number(delta) !== 0 && note.trim().length >= 3;

  return (
    <>
      <AdminHeading title={t("admin.nav.inventory")} description={t("admin.inventory.subtitle")} />
      <form className="mb-10 grid gap-4 border border-border bg-card p-5 md:grid-cols-[1fr_8rem_2fr_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); if (valid) adjust.mutate(); }}>
        <Field label="SKU"><Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} dir="ltr" /></Field>
        <Field label={t("admin.inventory.change")} hint="+10 / -3"><Input value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" dir="ltr" /></Field>
        <Field label={t("admin.inventory.reason")} hint={t("admin.inventory.reasonRequired")}><Textarea rows={1} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-11" /></Field>
        <Button type="submit" disabled={disabled || !valid || adjust.isPending}>{t("admin.inventory.adjust")}</Button>
      </form>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-sans text-base font-medium tracking-normal">{t("admin.inventory.history")}</h2>
        <Input value={skuFilter} onChange={(e) => { setSkuFilter(e.target.value); setPage(1); }} placeholder={t("admin.inventory.filterSku")} aria-label={t("admin.inventory.filterSku")} className="h-9 max-w-52" dir="ltr" />
      </div>
      <DataTable columns={columns} data={logs.data?.items} loading={logs.isPending} emptyTitle={t("admin.inventory.empty")} />
      {logs.data ? <Pager page={logs.data.page} totalPages={logs.data.totalPages} total={logs.data.total} onPage={setPage} /> : null}
    </>
  );
}

/* ─────────────────────────────── Audit log ─────────────────────────────── */

export function AuditAdmin() {
  const t = useT();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const logs = useQuery({ queryKey: ["admin", "audit", page], queryFn: () => api<Page<AuditLog>>("/admin/audit-logs", { query: { page, limit: 25 } }), placeholderData: (p) => p });

  const columns = useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      { header: t("admin.orders.date"), cell: ({ row }) => formatDate(row.original.createdAt, locale, "datetime") },
      { header: t("admin.audit.actor"), cell: ({ row }) => (typeof row.original.actorId === "object" && row.original.actorId ? <span>{row.original.actorId.name}<span className="block text-xs text-muted-foreground" dir="ltr">{row.original.actorId.email}</span></span> : "—") },
      { header: t("admin.audit.action"), cell: ({ row }) => <Badge variant="outline" dir="ltr">{row.original.action}</Badge> },
      { header: t("admin.audit.target"), cell: ({ row }) => <span className="text-xs text-muted-foreground" dir="ltr">{row.original.entity}{row.original.entityId ? `:${row.original.entityId.slice(-8)}` : ""}</span> },
    ],
    [t, locale],
  );

  return (
    <>
      <AdminHeading title={t("admin.nav.audit")} description={t("admin.audit.subtitle")} />
      <DataTable columns={columns} data={logs.data?.items} loading={logs.isPending} emptyTitle={t("admin.audit.empty")} />
      {logs.data ? <Pager page={logs.data.page} totalPages={logs.data.totalPages} total={logs.data.total} onPage={setPage} /> : null}
    </>
  );
}
