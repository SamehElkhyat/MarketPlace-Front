"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AdminHeading, ConfirmDialog, useWriteGuard } from "@/features/admin/admin-ui";
import { useAdminBrands } from "@/features/admin/use-admin-data";
import { useDebounced } from "@/hooks/use-debounced";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { api } from "@/lib/api/client";
import type { AdminProductRow, Brand, Collection, Page } from "@/lib/api/types";
import { formatNumber, pick } from "@/lib/format";

/* ─────────────────────────────── Brands ─────────────────────────────── */

interface BrandDraft { id?: string; name: string; logo: string; descEn: string; descAr: string }
const blankBrand: BrandDraft = { name: "", logo: "", descEn: "", descAr: "" };

export function BrandsAdmin() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const brands = useAdminBrands();
  const [draft, setDraft] = useState<BrandDraft | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });

  const save = useMutation({
    mutationFn: (d: BrandDraft) => {
      const body = { name: d.name.trim(), ...(d.logo.trim() ? { logo: d.logo.trim() } : {}), description: { ar: d.descAr.trim(), en: d.descEn.trim() } };
      return d.id ? api(`/admin/brands/${d.id}`, { method: "PATCH", body }) : api("/admin/brands", { method: "POST", body });
    },
    onSuccess: () => { toast.success(t("admin.saved")); setDraft(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/brands/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("admin.deleted")); setDeleting(null); refresh(); },
    onError: (e) => { toast.error(errorMessage(e)); setDeleting(null); },
  });

  return (
    <>
      <AdminHeading title={t("admin.nav.brands")} actions={<Button size="sm" disabled={disabled} onClick={() => setDraft(blankBrand)}><Plus /> {t("admin.brands.new")}</Button>} />
      {brands.isPending ? <Skeleton className="h-48 w-full" /> : (
        <ul className="divide-y divide-border border border-border bg-card">
          {brands.data?.map((brand) => (
            <li key={brand._id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{brand.name}</p><p className="truncate text-xs text-muted-foreground">{pick(brand.description, locale)}</p></div>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => setDraft({ id: brand._id, name: brand.name, logo: brand.logo ?? "", descEn: brand.description.en, descAr: brand.description.ar })}><Pencil /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} disabled={disabled} onClick={() => setDeleting(brand)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader><DialogTitle>{draft?.id ? t("admin.brands.edit") : t("admin.brands.new")}</DialogTitle></DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <Field label={t("admin.brands.name")} required><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label={t("admin.brands.logo")}><Input value={draft.logo} onChange={(e) => setDraft({ ...draft, logo: e.target.value })} dir="ltr" placeholder="https://" /></Field>
              <Field label={t("admin.products.descEn")}><Textarea rows={2} value={draft.descEn} onChange={(e) => setDraft({ ...draft, descEn: e.target.value })} dir="ltr" /></Field>
              <Field label={t("admin.products.descAr")}><Textarea rows={2} value={draft.descAr} onChange={(e) => setDraft({ ...draft, descAr: e.target.value })} dir="rtl" /></Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{t("common.cancel")}</Button>
            <Button disabled={disabled || save.isPending || !draft?.name.trim()} onClick={() => draft && save.mutate(draft)}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("admin.brands.deleteTitle")} description={t("admin.brands.deleteBody")} confirmLabel={t("common.delete")} destructive pending={remove.isPending} onConfirm={() => deleting && remove.mutate(deleting._id)} />
    </>
  );
}

/* ───────────────────────────── Collections ───────────────────────────── */

interface AdminCollection extends Collection { productIds: string[]; isActive: boolean }
interface CollectionDraft { id?: string; titleEn: string; titleAr: string; descEn: string; descAr: string; image: string; sortOrder: string; isActive: boolean; productIds: string[] }
const blankCollection: CollectionDraft = { titleEn: "", titleAr: "", descEn: "", descAr: "", image: "", sortOrder: "0", isActive: true, productIds: [] };

function ProductPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const t = useT();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const all = useQuery({ queryKey: ["admin", "products", "picker"], queryFn: () => api<Page<AdminProductRow>>("/admin/products", { query: { limit: 100 } }), staleTime: 60_000 });
  const results = useQuery({ queryKey: ["admin", "products", "picker", q], queryFn: () => api<Page<AdminProductRow>>("/admin/products", { query: { limit: 8, q } }), enabled: q.length >= 2 });
  const titles = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of [...(all.data?.items ?? []), ...(results.data?.items ?? [])]) map.set(p._id, pick(p.title, locale));
    return map;
  }, [all.data, results.data, locale]);

  return (
    <div className="space-y-3">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.collections.searchProducts")} aria-label={t("admin.collections.searchProducts")} className="h-10" />
      {results.data?.items.length ? (
        <ul className="divide-y divide-border border border-border text-sm">
          {results.data.items.filter((p) => !selected.includes(p._id)).map((p) => (
            <li key={p._id}><button type="button" className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-muted" onClick={() => onChange([...selected, p._id])}>{pick(p.title, locale)} <Plus className="size-4" /></button></li>
          ))}
        </ul>
      ) : null}
      <ul className="flex flex-wrap gap-2">
        {selected.map((id) => (
          <li key={id}><Badge variant="outline" className="h-7 gap-1.5 pe-1">{titles.get(id) ?? id.slice(-6)} <button type="button" onClick={() => onChange(selected.filter((x) => x !== id))} aria-label={t("common.delete")}><X className="size-3" /></button></Badge></li>
        ))}
      </ul>
    </div>
  );
}

export function CollectionsAdmin() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const list = useQuery({ queryKey: ["admin", "collections"], queryFn: async () => (await api<{ items: AdminCollection[] }>("/admin/collections")).items });
  const [draft, setDraft] = useState<CollectionDraft | null>(null);
  const [deleting, setDeleting] = useState<AdminCollection | null>(null);
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["admin", "collections"] }); void queryClient.invalidateQueries({ queryKey: ["admin", "products"] }); };

  const save = useMutation({
    mutationFn: (d: CollectionDraft) => {
      const body = { title: { ar: d.titleAr.trim(), en: d.titleEn.trim() }, description: { ar: d.descAr.trim(), en: d.descEn.trim() }, ...(d.image.trim() ? { image: d.image.trim() } : {}), sortOrder: Math.max(0, Number(d.sortOrder) || 0), isActive: d.isActive, productIds: d.productIds };
      return d.id ? api(`/admin/collections/${d.id}`, { method: "PATCH", body }) : api("/admin/collections", { method: "POST", body });
    },
    onSuccess: () => { toast.success(t("admin.saved")); setDraft(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("admin.deleted")); setDeleting(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <AdminHeading title={t("admin.nav.collections")} description={t("admin.collections.subtitle")} actions={<Button size="sm" disabled={disabled} onClick={() => setDraft(blankCollection)}><Plus /> {t("admin.collections.new")}</Button>} />
      {list.isPending ? <Skeleton className="h-48 w-full" /> : (
        <ul className="divide-y divide-border border border-border bg-card">
          {list.data?.map((c) => (
            <li key={c._id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">{pick(c.title, locale)} {!c.isActive ? <Badge variant="secondary">{t("admin.categories.inactive")}</Badge> : null}</p>
                <p className="text-xs text-muted-foreground"><span dir="ltr">/{c.slug}</span> · {t("admin.collections.productCount", { count: formatNumber(c.productIds.length, locale) })}</p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => setDraft({ id: c._id, titleEn: c.title.en, titleAr: c.title.ar, descEn: c.description.en, descAr: c.description.ar, image: c.image ?? "", sortOrder: String(c.sortOrder), isActive: c.isActive, productIds: c.productIds })}><Pencil /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} disabled={disabled} onClick={() => setDeleting(c)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" closeLabel={t("common.close")}>
          <DialogHeader><DialogTitle>{draft?.id ? t("admin.collections.edit") : t("admin.collections.new")}</DialogTitle></DialogHeader>
          {draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("admin.products.titleEn")} required><Input value={draft.titleEn} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })} dir="ltr" /></Field>
              <Field label={t("admin.products.titleAr")} required><Input value={draft.titleAr} onChange={(e) => setDraft({ ...draft, titleAr: e.target.value })} dir="rtl" /></Field>
              <Field label={t("admin.products.descEn")}><Textarea rows={2} value={draft.descEn} onChange={(e) => setDraft({ ...draft, descEn: e.target.value })} dir="ltr" /></Field>
              <Field label={t("admin.products.descAr")}><Textarea rows={2} value={draft.descAr} onChange={(e) => setDraft({ ...draft, descAr: e.target.value })} dir="rtl" /></Field>
              <Field label={t("admin.collections.image")}><Input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} dir="ltr" placeholder="https://" /></Field>
              <Field label={t("admin.categories.sortOrder")}><Input value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} inputMode="numeric" dir="ltr" /></Field>
              <label className="flex items-center gap-3 text-sm sm:col-span-2"><Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} /> {t("admin.categories.active")}</label>
              <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">{t("admin.collections.products")}</p><ProductPicker selected={draft.productIds} onChange={(productIds) => setDraft({ ...draft, productIds })} /></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{t("common.cancel")}</Button>
            <Button disabled={disabled || save.isPending || !draft?.titleEn.trim() || !draft?.titleAr.trim()} onClick={() => draft && save.mutate(draft)}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("admin.collections.deleteTitle")} confirmLabel={t("common.delete")} destructive pending={remove.isPending} onConfirm={() => deleting && remove.mutate(deleting._id)} />
    </>
  );
}
