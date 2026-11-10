"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AdminHeading, useWriteGuard } from "@/features/admin/admin-ui";
import { ImageUploader, type ProductImageValue } from "@/features/admin/image-uploader";
import { effectiveAttributes, useAdminBrands, useCategoryList } from "@/features/admin/use-admin-data";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { useLocalizedRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AttributeDef, Localized } from "@/lib/api/types";
import { inputToPiasters, piastersToInput, pick } from "@/lib/format";

interface VariantRow {
  sku: string;
  optionValues: Record<string, string>;
  price: string;
  compareAt: string;
  stock: string;
  /** Existing variants keep their LIVE stock — it can only be changed through inventory adjustments. */
  existing: boolean;
}

interface FormState {
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  categoryId: string;
  brandId: string;
  status: "draft" | "published";
  tags: string;
  images: ProductImageValue[];
  specs: Record<string, string>;
  options: Record<string, string[]>;
  variants: VariantRow[];
}

interface ProductDoc {
  _id: string;
  title: Localized;
  description: Localized;
  categoryId: string;
  brandId?: string;
  images: { url: string; publicId?: string }[];
  specs: Record<string, string>;
  options: { key: string; values: string[] }[];
  variants: { sku: string; optionValues: Record<string, string>; price: number; compareAtPrice?: number; stock: number }[];
  tags?: string[];
  status: "draft" | "published";
}

const EMPTY: FormState = {
  titleAr: "", titleEn: "", descAr: "", descEn: "", categoryId: "", brandId: "", status: "draft", tags: "",
  images: [], specs: {}, options: {}, variants: [{ sku: "", optionValues: {}, price: "", compareAt: "", stock: "0", existing: false }],
};

const comboKey = (values: Record<string, string>) => Object.keys(values).sort().map((k) => `${k}=${values[k]}`).join("|");

function cartesian(options: [string, string[]][]): Record<string, string>[] {
  return options.reduce<Record<string, string>[]>((acc, [key, values]) => acc.flatMap((combo) => values.map((v) => ({ ...combo, [key]: v }))), [{}]);
}

/** Rebuilds the variant matrix from the chosen options, keeping rows the admin already filled in. */
function syncVariants(previous: VariantRow[], options: Record<string, string[]>, attributes: AttributeDef[], titleEn: string): VariantRow[] {
  const ordered = attributes.filter((a) => a.variantOption && (options[a.key]?.length ?? 0) > 0).map((a) => [a.key, options[a.key]!] as [string, string[]]);
  const kept = new Map(previous.map((row) => [comboKey(row.optionValues), row]));
  const prefix = titleEn.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 12) || "SKU";
  return cartesian(ordered).map((optionValues) => {
    const existing = kept.get(comboKey(optionValues));
    if (existing) return existing;
    const suffix = Object.values(optionValues).join("-").toUpperCase().replace(/[^A-Z0-9-]+/g, "");
    return { sku: suffix ? `${prefix}-${suffix}` : prefix, optionValues, price: previous[0]?.price ?? "", compareAt: "", stock: "0", existing: false };
  });
}

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border border-border bg-card p-5 md:p-6">
      <h2 className="font-sans text-base font-medium tracking-normal">{title}</h2>
      {description ? <p className="mt-1 mb-5 text-sm text-muted-foreground">{description}</p> : <div className="mb-5" />}
      {children}
    </section>
  );
}

const toFormState = (p: ProductDoc): FormState => ({
  titleAr: p.title.ar, titleEn: p.title.en, descAr: p.description.ar, descEn: p.description.en,
  categoryId: p.categoryId, brandId: p.brandId ?? "", status: p.status, tags: (p.tags ?? []).join(", "),
  images: p.images.map((i) => ({ url: i.url, publicId: i.publicId })),
  specs: p.specs,
  options: Object.fromEntries(p.options.map((o) => [o.key, o.values])),
  variants: p.variants.map((v) => ({ sku: v.sku, optionValues: v.optionValues, price: piastersToInput(v.price), compareAt: v.compareAtPrice ? piastersToInput(v.compareAtPrice) : "", stock: String(v.stock), existing: true })),
});

/** Loads the product (when editing) and hands it to the form as its INITIAL state — no sync-in-effect needed. */
export function ProductForm({ productId }: { productId?: string }) {
  const product = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: async () => (await api<{ product: ProductDoc }>(`/admin/products/${productId}`)).product,
    enabled: Boolean(productId),
  });
  if (productId && !product.data) return <Skeleton className="h-96 w-full" />;
  return <ProductFormInner productId={productId} initial={product.data ? toFormState(product.data) : EMPTY} />;
}

function ProductFormInner({ productId, initial }: { productId: string | undefined; initial: FormState }) {
  const t = useT();
  const locale = useLocale();
  const router = useLocalizedRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const categories = useCategoryList();
  const brands = useAdminBrands();
  const [state, setState] = useState<FormState>(initial);
  const [issues, setIssues] = useState<string[]>([]);

  const attributes = useMemo(() => effectiveAttributes(categories.data ?? [], state.categoryId), [categories.data, state.categoryId]);
  const variantAttributes = attributes.filter((a) => a.variantOption);
  const specAttributes = attributes.filter((a) => !a.variantOption);
  const patch = (partial: Partial<FormState>) => setState((s) => ({ ...s, ...partial }));

  const setOptions = (options: Record<string, string[]>, nextAttributes: AttributeDef[] = attributes) =>
    setState((s) => ({ ...s, options, variants: syncVariants(s.variants, options, nextAttributes, s.titleEn) }));

  const changeCategory = (categoryId: string) => {
    const nextAttributes = effectiveAttributes(categories.data ?? [], categoryId);
    const allowed = new Set(nextAttributes.filter((a) => a.variantOption).map((a) => a.key));
    setState((s) => {
      const options = Object.fromEntries(Object.entries(s.options).filter(([k]) => allowed.has(k)));
      const specKeys = new Set(nextAttributes.filter((a) => !a.variantOption).map((a) => a.key));
      return { ...s, categoryId, options, specs: Object.fromEntries(Object.entries(s.specs).filter(([k]) => specKeys.has(k))), variants: syncVariants(s.variants, options, nextAttributes, s.titleEn) };
    });
  };

  const toggleOption = (attr: AttributeDef, value: string) => {
    const current = state.options[attr.key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setOptions({ ...state.options, [attr.key]: next });
  };

  const updateVariant = (index: number, partial: Partial<VariantRow>) =>
    setState((s) => ({ ...s, variants: s.variants.map((v, i) => (i === index ? { ...v, ...partial } : v)) }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: { ar: state.titleAr.trim(), en: state.titleEn.trim() },
        description: { ar: state.descAr.trim(), en: state.descEn.trim() },
        categoryId: state.categoryId,
        ...(state.brandId ? { brandId: state.brandId } : {}),
        images: state.images.map((i) => ({ url: i.url, ...(i.publicId ? { publicId: i.publicId } : {}) })),
        specs: Object.fromEntries(Object.entries(state.specs).filter(([, v]) => v.trim())),
        options: Object.entries(state.options).filter(([, v]) => v.length > 0).map(([key, values]) => ({ key, values })),
        variants: state.variants.map((v) => ({
          sku: v.sku.trim().toUpperCase(),
          optionValues: v.optionValues,
          price: inputToPiasters(v.price || "0"),
          ...(v.compareAt.trim() ? { compareAtPrice: inputToPiasters(v.compareAt) } : {}),
          stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        })),
        tags: state.tags.split(",").map((s) => s.trim()).filter(Boolean),
        status: state.status,
      };
      return productId ? api<{ product: ProductDoc }>(`/admin/products/${productId}`, { method: "PUT", body }) : api<{ product: ProductDoc }>("/admin/products", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(t("admin.products.saved"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] });
      router.push("/admin/products");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
        setIssues((error.details as { path: string; message: string }[]).map((d) => `${d.path}: ${d.message}`));
      }
      toast.error(errorMessage(error));
    },
  });

  if (categories.isPending) return <Skeleton className="h-96 w-full" />;

  const attrLabel = (a: AttributeDef) => pick(a.label, locale);
  const valueLabel = (a: AttributeDef, value: string) => { const v = a.values.find((x) => x.value === value); return v?.label ? pick(v.label, locale) : value; };
  const complete = state.titleAr.trim() && state.titleEn.trim() && state.categoryId && state.variants.length > 0 && state.variants.every((v) => v.sku.trim() && v.price.trim());

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setIssues([]);
        save.mutate();
      }}
      className="space-y-6 pb-24"
    >
      <AdminHeading title={productId ? t("admin.products.edit") : t("admin.products.new")} />

      {issues.length > 0 ? (
        <div role="alert" className="border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="mb-2 font-medium text-destructive">{t("errors.VALIDATION_ERROR")}</p>
          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground" dir="ltr">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ) : null}

      <Card title={t("admin.products.general")}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t("admin.products.titleEn")} required><Input value={state.titleEn} onChange={(e) => patch({ titleEn: e.target.value })} dir="ltr" /></Field>
          <Field label={t("admin.products.titleAr")} required><Input value={state.titleAr} onChange={(e) => patch({ titleAr: e.target.value })} dir="rtl" /></Field>
          <Field label={t("admin.products.descEn")}><Textarea rows={5} value={state.descEn} onChange={(e) => patch({ descEn: e.target.value })} dir="ltr" /></Field>
          <Field label={t("admin.products.descAr")}><Textarea rows={5} value={state.descAr} onChange={(e) => patch({ descAr: e.target.value })} dir="rtl" /></Field>
        </div>
      </Card>

      <Card title={t("admin.products.classification")} description={t("admin.products.classificationHint")}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t("admin.products.category")} required>
            <Select value={state.categoryId} onValueChange={changeCategory}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder={t("admin.products.chooseCategory")} /></SelectTrigger>
              <SelectContent>
                {categories.flat.map((c) => <SelectItem key={c._id} value={c._id}>{"— ".repeat(c.depth)}{pick(c.name, locale)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("admin.products.brand")}>
            <Select value={state.brandId || "none"} onValueChange={(v) => patch({ brandId: v === "none" ? "" : v })}>
              <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("admin.products.noBrand")}</SelectItem>
                {brands.data?.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("admin.products.tags")} hint={t("admin.products.tagsHint")} className="md:col-span-2"><Input value={state.tags} onChange={(e) => patch({ tags: e.target.value })} /></Field>
        </div>
      </Card>

      <Card title={t("admin.products.images")} description={t("admin.products.imagesHint")}>
        <ImageUploader value={state.images} onChange={(images) => patch({ images })} disabled={disabled} />
      </Card>

      <Card title={t("admin.products.options")} description={state.categoryId ? t("admin.products.optionsHint") : t("admin.products.pickCategoryFirst")}>
        {variantAttributes.length === 0 && state.categoryId ? <p className="mb-4 text-sm text-muted-foreground">{t("admin.products.noOptions")}</p> : null}
        <div className="space-y-5">
          {variantAttributes.map((attr) => (
            <fieldset key={attr.key}>
              <legend className="mb-2 text-sm font-medium">{attrLabel(attr)}</legend>
              <div className="flex flex-wrap gap-2">
                {attr.values.map((v) => {
                  const on = (state.options[attr.key] ?? []).includes(v.value);
                  return (
                    <label key={v.value} className="flex cursor-pointer items-center gap-2 border border-border px-3 py-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted">
                      <Checkbox checked={on} onCheckedChange={() => toggleOption(attr, v.value)} />
                      {v.swatch ? <span aria-hidden className="size-3.5 rounded-full border border-border" style={{ backgroundColor: v.swatch }} /> : null}
                      {valueLabel(attr, v.value)}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="py-2 pe-3 text-start font-medium">{t("admin.products.variant")}</th>
                <th className="px-1.5 text-start font-medium">SKU</th>
                <th className="px-1.5 text-start font-medium">{t("admin.products.priceEgp")}</th>
                <th className="px-1.5 text-start font-medium">{t("admin.products.comparePrice")}</th>
                <th className="px-1.5 text-start font-medium">{t("admin.products.stock")}</th>
              </tr>
            </thead>
            <tbody>
              {state.variants.map((row, index) => (
                <tr key={comboKey(row.optionValues) || `v${index}`} className="border-b border-border/60 align-top">
                  <td className="py-2 pe-3">
                    {Object.keys(row.optionValues).length === 0 ? <span className="text-muted-foreground">{t("admin.products.defaultVariant")}</span> : (
                      <span className="flex flex-wrap gap-1">{Object.entries(row.optionValues).map(([k, v]) => { const a = attributes.find((x) => x.key === k); return <Badge key={k} variant="outline">{a ? valueLabel(a, v) : v}</Badge>; })}</span>
                    )}
                  </td>
                  <td className="px-1.5 py-1.5"><Input value={row.sku} onChange={(e) => updateVariant(index, { sku: e.target.value.toUpperCase() })} className="h-9 w-44" dir="ltr" aria-label="SKU" readOnly={row.existing && Boolean(productId)} /></td>
                  <td className="px-1.5 py-1.5"><Input value={row.price} onChange={(e) => updateVariant(index, { price: e.target.value })} inputMode="decimal" className="h-9 w-28" dir="ltr" aria-label={t("admin.products.priceEgp")} /></td>
                  <td className="px-1.5 py-1.5"><Input value={row.compareAt} onChange={(e) => updateVariant(index, { compareAt: e.target.value })} inputMode="decimal" className="h-9 w-28" dir="ltr" aria-label={t("admin.products.comparePrice")} /></td>
                  <td className="px-1.5 py-1.5">
                    <Input value={row.stock} onChange={(e) => updateVariant(index, { stock: e.target.value })} inputMode="numeric" className="h-9 w-24" dir="ltr" aria-label={t("admin.products.stock")} disabled={row.existing} title={row.existing ? t("admin.products.stockLocked") : undefined} />
                    {row.existing ? <p className="mt-1 text-[0.6875rem] text-muted-foreground">{t("admin.products.stockLocked")}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {specAttributes.length > 0 ? (
        <Card title={t("admin.products.specs")} description={t("admin.products.specsHint")}>
          <div className="grid gap-5 md:grid-cols-2">
            {specAttributes.map((attr) => (
              <Field key={attr.key} label={attrLabel(attr)}>
                {attr.values.length > 0 ? (
                  <Select value={state.specs[attr.key] || "none"} onValueChange={(v) => patch({ specs: { ...state.specs, [attr.key]: v === "none" ? "" : v } })}>
                    <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {attr.values.map((v) => <SelectItem key={v.value} value={v.value}>{valueLabel(attr, v.value)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={state.specs[attr.key] ?? ""} onChange={(e) => patch({ specs: { ...state.specs, [attr.key]: e.target.value } })} />
                )}
              </Field>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm md:start-[var(--sidebar-width)]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <label className="flex items-center gap-3 text-sm">
            <Select value={state.status} onValueChange={(v) => patch({ status: v as FormState["status"] })}>
              <SelectTrigger className="h-10 w-40" aria-label={t("admin.orders.status")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t("admin.products.draft")}</SelectItem>
                <SelectItem value="published">{t("admin.products.published")}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={disabled || save.isPending || !complete}>{t("common.save")}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
