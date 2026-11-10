"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminHeading, ConfirmDialog, DataTable, Pager, useWriteGuard } from "@/features/admin/admin-ui";
import { useDebounced } from "@/hooks/use-debounced";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { Link, useLocalizedRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { AdminProductRow, Page } from "@/lib/api/types";
import { formatDate, formatNumber, pick } from "@/lib/format";

const CSV_HEADER = ["title_en", "title_ar", "category_slug", "brand_slug", "sku", "price_egp", "stock", "image_url", "description_en", "description_ar", "status"];

interface ImportResult {
  row: number;
  ok: boolean;
  sku?: string;
  error?: string;
}

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const run = useMutation({
    mutationFn: () => api<{ results: ImportResult[] }>("/admin/products/import", { method: "POST", body: { rows } }),
    onSuccess: ({ results: r }) => {
      setResults(r);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(t("admin.products.importDone", { ok: r.filter((x) => x.ok).length, total: r.length }));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const downloadTemplate = () => {
    const sample = ["Linen Shirt", "قميص كتان", "men-shirts", "atelier-nile", "SHIRT-001", "899.00", "10", "https://picsum.photos/seed/shirt/800/1000", "", "", "draft"];
    const blob = new Blob([Papa.unparse({ fields: CSV_HEADER, data: [sample] })], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "products-template.csv" }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setRows([]); setResults(null); } }}>
      <DialogContent className="sm:max-w-2xl" closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("admin.products.import")}</DialogTitle>
          <DialogDescription>{t("admin.products.importHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download /> {t("admin.products.template")}</Button>
            <Button variant="outline" size="sm" onClick={() => input.current?.click()}><Upload /> {t("admin.products.chooseCsv")}</Button>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                Papa.parse<Record<string, string>>(file, {
                  header: true,
                  skipEmptyLines: true,
                  complete: (parsed) => { setRows(parsed.data.slice(0, 500)); setResults(null); },
                  error: () => toast.error(t("admin.products.csvInvalid")),
                });
              }}
            />
          </div>
          {rows.length > 0 && !results ? <p className="text-sm">{t("admin.products.rowsReady", { count: rows.length })}</p> : null}
          {results ? (
            <ul className="max-h-64 divide-y divide-border overflow-y-auto border border-border text-sm">
              {results.map((r) => (
                <li key={r.row} className="flex items-start gap-3 px-3 py-2">
                  <Badge variant={r.ok ? "success" : "destructive"}>{r.ok ? "OK" : t("common.error")}</Badge>
                  <span className="tabular-nums text-muted-foreground">#{r.row}</span>
                  <span className="min-w-0 flex-1 break-words" dir="ltr">{r.ok ? r.sku : r.error}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
          <Button disabled={rows.length === 0 || run.isPending || results !== null} onClick={() => run.mutate()}>{t("admin.products.runImport")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsAdmin() {
  const t = useT();
  const locale = useLocale();
  const router = useLocalizedRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { disabled } = useWriteGuard();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<AdminProductRow | null>(null);
  const q = useDebounced(search.trim(), 300);

  const query = useQuery({
    queryKey: ["admin", "products", { page, status, q }],
    queryFn: () => api<Page<AdminProductRow>>("/admin/products", { query: { page, limit: 20, status: status === "all" ? undefined : status, q: q || undefined } }),
    placeholderData: (previous) => previous,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<{ outcome: "deleted" | "archived" }>(`/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: ({ outcome }) => {
      toast.success(outcome === "archived" ? t("admin.products.archived") : t("admin.products.deleted"));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const columns = useMemo<ColumnDef<AdminProductRow, unknown>[]>(
    () => [
      {
        header: t("admin.products.product"),
        cell: ({ row }) => (
          <span className="flex items-center gap-3">
            <span className="media-4x5 w-10 shrink-0">{row.original.images[0] ? <Image src={row.original.images[0].url} alt="" fill sizes="40px" className="object-cover" /> : null}</span>
            <span className="min-w-0"><span className="block max-w-64 truncate font-medium">{pick(row.original.title, locale)}</span><span className="text-xs text-muted-foreground" dir="ltr">{row.original.slug}</span></span>
          </span>
        ),
      },
      { header: t("admin.orders.status"), cell: ({ row }) => <Badge variant={row.original.status === "published" ? "success" : "secondary"}>{t(row.original.status === "published" ? "admin.products.published" : "admin.products.draft")}</Badge> },
      { header: t("admin.products.price"), cell: ({ row }) => <span className="tabular-nums"><Money amount={row.original.minPrice} />{row.original.maxPrice > row.original.minPrice ? <> – <Money amount={row.original.maxPrice} /></> : null}</span> },
      {
        header: t("admin.products.stock"),
        cell: ({ row }) => {
          const total = row.original.variants.reduce((n, v) => n + v.stock, 0);
          const low = row.original.variants.some((v) => v.stock <= 5);
          return <span className="inline-flex items-center gap-2 tabular-nums">{formatNumber(total, locale)} <span className="text-xs text-muted-foreground">({row.original.variants.length})</span>{low ? <Badge variant={total === 0 ? "destructive" : "warning"}>{t(total === 0 ? "product.soldOut" : "admin.products.low")}</Badge> : null}</span>;
        },
      },
      { header: t("admin.products.sold"), cell: ({ row }) => formatNumber(row.original.soldCount, locale) },
      { header: t("admin.products.updated"), cell: ({ row }) => formatDate(row.original.updatedAt, locale, "short") },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label={t("common.delete")} onClick={(e) => { e.stopPropagation(); setDeleting(row.original); }}><Trash2 /></Button>
        ),
      },
    ],
    [t, locale, disabled],
  );

  return (
    <>
      <AdminHeading
        title={t("admin.nav.products")}
        description={t("admin.products.subtitle")}
        actions={
          <>
            <Button variant="outline" size="sm" disabled={disabled} onClick={() => setImporting(true)}><Upload /> {t("admin.products.import")}</Button>
            <Button size="sm" asChild><Link href="/admin/products/new"><Plus /> {t("admin.products.new")}</Link></Button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("admin.products.search")} aria-label={t("admin.products.search")} className="h-10 max-w-xs" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-10 w-44" aria-label={t("admin.orders.status")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.orders.allStatuses")}</SelectItem>
            <SelectItem value="published">{t("admin.products.published")}</SelectItem>
            <SelectItem value="draft">{t("admin.products.draft")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={query.data?.items} loading={query.isPending} onRowClick={(p) => router.push(`/admin/products/${p._id}`)} emptyTitle={t("admin.products.empty")} emptyDescription={t("admin.products.emptyHint")} />
      {query.data ? <Pager page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} onPage={setPage} /> : null}

      <ImportDialog open={importing} onOpenChange={setImporting} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("admin.products.deleteTitle")}
        description={t("admin.products.deleteBody")}
        confirmLabel={t("common.delete")}
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting._id)}
      />
    </>
  );
}
