"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsReadOnly } from "@/features/admin/admin-shell";
import { useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { useLocale } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function AdminHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl md:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Disables mutating controls for the read-only demo account (the API also rejects the calls). */
export function useWriteGuard() {
  const readOnly = useIsReadOnly();
  return { readOnly, disabled: readOnly };
}

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[] | undefined;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyDescription?: string;
}

/** Headless table (TanStack) styled with the design tokens. Pagination is server-side via {@link Pager}. */
export function DataTable<T>({ columns, data, loading, onRowClick, emptyTitle, emptyDescription }: DataTableProps<T>) {
  // TanStack Table returns unmemoizable functions; React Compiler skips this component, which is fine.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: data ?? [], columns, getCoreRowModel: getCoreRowModel() });

  if (loading && !data) {
    return (
      <div className="space-y-2" aria-busy>
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (!data || data.length === 0) return <EmptyState title={emptyTitle} {...(emptyDescription ? { description: emptyDescription } : {})} />;

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row.original) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(onRowClick && "cursor-pointer hover:bg-muted/60")}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="text-sm">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) {
  const t = useT();
  const locale = useLocale();
  if (total === 0) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>{t("listing.results", { count: total })}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("common.previous")}><ChevronLeft className="rtl:rotate-180" /></Button>
        <span className="tabular-nums">{formatNumber(page, locale)} / {formatNumber(totalPages, locale)}</span>
        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t("common.next")}><ChevronRight className="rtl:rotate-180" /></Button>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  pending,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  pending?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {/* lining + tabular figures: Cormorant's default old-style numerals read badly for money */}
      <p className="mt-2 font-heading text-xl font-normal lining-nums tabular-nums md:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
