"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AdminHeading, ConfirmDialog, useWriteGuard } from "@/features/admin/admin-ui";
import { useCategoryList } from "@/features/admin/use-admin-data";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { api } from "@/lib/api/client";
import type { AdminCategory, AttributeDef, AttributeValue } from "@/lib/api/types";
import { pick } from "@/lib/format";

interface Draft {
  id?: string;
  parentId: string | null;
  nameAr: string;
  nameEn: string;
  slug: string;
  sortOrder: string;
  isActive: boolean;
  attributes: AttributeDef[];
}

const blankAttribute = (): AttributeDef => ({ key: "", label: { ar: "", en: "" }, type: "select", values: [], filterable: true, variantOption: false });

const toDraft = (c: AdminCategory): Draft => ({
  id: c._id, parentId: c.parentId, nameAr: c.name.ar, nameEn: c.name.en, slug: c.slug, sortOrder: String(c.sortOrder), isActive: c.isActive,
  attributes: structuredClone(c.attributes),
});

function AttributeEditor({ attribute, onChange, onRemove }: { attribute: AttributeDef; onChange: (next: AttributeDef) => void; onRemove: () => void }) {
  const t = useT();
  const set = (partial: Partial<AttributeDef>) => onChange({ ...attribute, ...partial });
  const setValue = (index: number, partial: Partial<AttributeValue>) => set({ values: attribute.values.map((v, i) => (i === index ? { ...v, ...partial } : v)) });

  return (
    <div className="space-y-4 border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <Field label={t("admin.categories.attrKey")} hint="size, color…"><Input value={attribute.key} onChange={(e) => set({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} dir="ltr" className="h-10" /></Field>
          <Field label={t("admin.categories.labelEn")}><Input value={attribute.label.en} onChange={(e) => set({ label: { ...attribute.label, en: e.target.value } })} dir="ltr" className="h-10" /></Field>
          <Field label={t("admin.categories.labelAr")}><Input value={attribute.label.ar} onChange={(e) => set({ label: { ...attribute.label, ar: e.target.value } })} dir="rtl" className="h-10" /></Field>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("common.delete")}><X /></Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <Select value={attribute.type} onValueChange={(v) => set({ type: v as AttributeDef["type"] })}>
          <SelectTrigger className="h-9 w-36" aria-label={t("admin.categories.attrType")}><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["select", "color", "text", "number"] as const).map((type) => <SelectItem key={type} value={type}>{t(`admin.categories.type.${type}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2"><Switch checked={attribute.filterable} onCheckedChange={(v) => set({ filterable: v })} /> {t("admin.categories.filterable")}</label>
        <label className="flex items-center gap-2"><Switch checked={attribute.variantOption} onCheckedChange={(v) => set({ variantOption: v })} /> {t("admin.categories.variantOption")}</label>
      </div>

      {attribute.type !== "text" && attribute.type !== "number" ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("admin.categories.values")}</p>
          {attribute.values.map((value, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_6rem_auto]">
              <Input value={value.value} onChange={(e) => setValue(index, { value: e.target.value })} placeholder="value" dir="ltr" className="h-9" aria-label="value" />
              <Input value={value.label?.en ?? ""} onChange={(e) => setValue(index, { label: { en: e.target.value, ar: value.label?.ar ?? "" } })} placeholder="EN" dir="ltr" className="h-9" aria-label="EN" />
              <Input value={value.label?.ar ?? ""} onChange={(e) => setValue(index, { label: { ar: e.target.value, en: value.label?.en ?? "" } })} placeholder="AR" dir="rtl" className="h-9" aria-label="AR" />
              {attribute.type === "color" ? <Input value={value.swatch ?? ""} onChange={(e) => setValue(index, { swatch: e.target.value })} placeholder="#hex" dir="ltr" className="hidden h-9 sm:block" aria-label="swatch" /> : null}
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => set({ values: attribute.values.filter((_, i) => i !== index) })} aria-label={t("common.delete")}><X /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="xs" onClick={() => set({ values: [...attribute.values, { value: "" }] })}><Plus /> {t("admin.categories.addValue")}</Button>
        </div>
      ) : null}
    </div>
  );
}

function CategoryDialog({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [state, setState] = useState<Draft | null>(draft);
  const [seen, setSeen] = useState(draft);
  if (draft !== seen) { setSeen(draft); setState(draft); } // re-seed when a different category is opened

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const cleaned = d.attributes
        .filter((a) => a.key)
        .map((a) => ({
          ...a,
          label: { ar: a.label.ar || a.label.en, en: a.label.en || a.label.ar },
          values: a.values.filter((v) => v.value).map((v) => ({ value: v.value, ...(v.label && (v.label.ar || v.label.en) ? { label: { ar: v.label.ar || v.label.en, en: v.label.en || v.label.ar } } : {}), ...(v.swatch ? { swatch: v.swatch } : {}) })),
        }));
      const common = { name: { ar: d.nameAr.trim(), en: d.nameEn.trim() }, ...(d.slug.trim() ? { slug: d.slug.trim() } : {}), sortOrder: Math.max(0, Number(d.sortOrder) || 0), isActive: d.isActive, attributes: cleaned };
      return d.id ? api(`/admin/categories/${d.id}`, { method: "PATCH", body: common }) : api("/admin/categories", { method: "POST", body: { ...common, parentId: d.parentId } });
    },
    onSuccess: () => {
      toast.success(t("admin.categories.saved"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const { disabled } = useWriteGuard();

  if (!state) return null;
  const patch = (partial: Partial<Draft>) => setState({ ...state, ...partial });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{state.id ? t("admin.categories.edit") : t("admin.categories.new")}</DialogTitle>
          <DialogDescription>{t("admin.categories.attributesHint")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("admin.products.titleEn")} required><Input value={state.nameEn} onChange={(e) => patch({ nameEn: e.target.value })} dir="ltr" /></Field>
          <Field label={t("admin.products.titleAr")} required><Input value={state.nameAr} onChange={(e) => patch({ nameAr: e.target.value })} dir="rtl" /></Field>
          <Field label="Slug" hint={t("admin.categories.slugHint")}><Input value={state.slug} onChange={(e) => patch({ slug: e.target.value })} dir="ltr" /></Field>
          <Field label={t("admin.categories.sortOrder")}><Input value={state.sortOrder} onChange={(e) => patch({ sortOrder: e.target.value })} inputMode="numeric" dir="ltr" /></Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-2"><Switch checked={state.isActive} onCheckedChange={(v) => patch({ isActive: v })} /> {t("admin.categories.active")}</label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-sm font-medium">{t("admin.categories.attributes")}</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => patch({ attributes: [...state.attributes, blankAttribute()] })}><Plus /> {t("admin.categories.addAttribute")}</Button>
          </div>
          {state.attributes.length === 0 ? <p className="text-sm text-muted-foreground">{t("admin.categories.noAttributes")}</p> : null}
          {state.attributes.map((attribute, index) => (
            <AttributeEditor key={index} attribute={attribute}
              onChange={(next) => patch({ attributes: state.attributes.map((a, i) => (i === index ? next : a)) })}
              onRemove={() => patch({ attributes: state.attributes.filter((_, i) => i !== index) })} />
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={disabled || save.isPending || !state.nameAr.trim() || !state.nameEn.trim()} onClick={() => save.mutate(state)}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CategoriesAdmin() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const { flat, isPending } = useCategoryList();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(t("admin.categories.deleted")); setDeleting(null); void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] }); },
    onError: (error) => { toast.error(errorMessage(error)); setDeleting(null); },
  });

  const blank = (parentId: string | null): Draft => ({ parentId, nameAr: "", nameEn: "", slug: "", sortOrder: "0", isActive: true, attributes: [] });

  return (
    <>
      <AdminHeading title={t("admin.nav.categories")} description={t("admin.categories.subtitle")} actions={<Button size="sm" disabled={disabled} onClick={() => setDraft(blank(null))}><Plus /> {t("admin.categories.new")}</Button>} />
      {isPending ? <Skeleton className="h-64 w-full" /> : (
        <ul className="divide-y divide-border border border-border bg-card">
          {flat.map((category) => (
            <li key={category._id} className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ paddingInlineStart: `${1 + category.depth * 1.75}rem` }}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {pick(category.name, locale)}
                  {!category.isActive ? <Badge variant="secondary">{t("admin.categories.inactive")}</Badge> : null}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <span dir="ltr">/{category.slug}</span>
                  {category.attributes.map((a) => <Badge key={a.key} variant="outline" className="h-4 text-[0.625rem]">{pick(a.label, locale)}{a.variantOption ? " ◆" : a.filterable ? " ▾" : ""}</Badge>)}
                </p>
              </div>
              {category.level < 3 ? <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setDraft(blank(category._id))}><Plus /> {t("admin.categories.addChild")}</Button> : null}
              <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => setDraft(toDraft(category))}><Pencil /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} disabled={disabled} onClick={() => setDeleting(category)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">◆ {t("admin.categories.variantOption")} · ▾ {t("admin.categories.filterable")}</p>

      <CategoryDialog draft={draft} onClose={() => setDraft(null)} />
      <ConfirmDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)} title={t("admin.categories.deleteTitle")} description={t("admin.categories.deleteBody")} confirmLabel={t("common.delete")} destructive pending={remove.isPending} onConfirm={() => deleting && remove.mutate(deleting._id)} />
    </>
  );
}
