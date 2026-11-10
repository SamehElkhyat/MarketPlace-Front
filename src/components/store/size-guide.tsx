"use client";

import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDir, useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";

/** Measurements in cm. */
const CHART: Record<string, { chest: number; waist: number; length: number }> = {
  S: { chest: 96, waist: 80, length: 68 },
  M: { chest: 102, waist: 86, length: 70 },
  L: { chest: 108, waist: 92, length: 72 },
  XL: { chest: 114, waist: 98, length: 74 },
};

export function SizeGuide({ sizes }: { sizes: string[] }) {
  const t = useT();
  const locale = useLocale();
  const dir = useDir();
  const rows = sizes.filter((size) => CHART[size]);
  if (rows.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" size="xs" className="gap-1.5 text-xs">
          <Ruler /> {t("product.sizeGuide")}
        </Button>
      </SheetTrigger>
      <SheetContent side={dir === "rtl" ? "left" : "right"} closeLabel={t("common.close")} className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("product.sizeGuide")}</SheetTitle>
          <SheetDescription>{t("product.sizeGuideHint")}</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("product.size")}</TableHead>
                <TableHead>{t("product.chest")}</TableHead>
                <TableHead>{t("product.waist")}</TableHead>
                <TableHead>{t("product.length")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((size) => (
                <TableRow key={size}>
                  <TableCell className="font-medium">{size}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(CHART[size]!.chest, locale)}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(CHART[size]!.waist, locale)}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(CHART[size]!.length, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">{t("product.sizeGuideNote")}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
