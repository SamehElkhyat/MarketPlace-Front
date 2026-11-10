"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDir, useLocale, useT } from "@/i18n/client";
import { otherLocale } from "@/i18n/config";
import { Link, useLanguageSwitcher } from "@/i18n/navigation";
import type { CategoryNode } from "@/lib/api/types";
import { pick } from "@/lib/format";
import { useUiStore } from "@/stores/ui.store";

export function MobileMenu({ tree }: { tree: CategoryNode[] }) {
  const t = useT();
  const locale = useLocale();
  const dir = useDir();
  const open = useUiStore((s) => s.menuOpen);
  const setOpen = useUiStore((s) => s.setMenuOpen);
  const switchTo = useLanguageSwitcher();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* "start" side: left in English, right in Arabic */}
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-[85%] max-w-sm gap-0 overflow-y-auto p-0" closeLabel={t("common.close")}>
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>

        <nav aria-label={t("nav.primary")} className="flex-1 px-4 py-2">
          <Accordion type="multiple">
            {tree.map((node) => (
              <AccordionItem key={node.id} value={node.id}>
                <AccordionTrigger className="text-base">{pick(node.name, locale)}</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 ps-3 pb-2">
                    <li>
                      <Link href={`/c/${node.slug}`} onClick={close} className="text-sm underline underline-offset-4">
                        {t("nav.viewAll", { name: pick(node.name, locale) })}
                      </Link>
                    </li>
                    {node.children.map((child) => (
                      <li key={child.id}>
                        <Link href={`/c/${node.slug}/${child.slug}`} onClick={close} className="text-sm font-medium">
                          {pick(child.name, locale)}
                        </Link>
                        <ul className="mt-2 space-y-2 ps-3">
                          {child.children.map((leaf) => (
                            <li key={leaf.id}>
                              <Link href={`/c/${node.slug}/${child.slug}/${leaf.slug}`} onClick={close} className="text-sm text-muted-foreground">
                                {pick(leaf.name, locale)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <li>
              <Link href="/collections/offers" onClick={close} className="block py-2 text-accent">
                {t("nav.offers")}
              </Link>
            </li>
            <li>
              <Link href="/brands" onClick={close} className="block py-2">
                {t("nav.brands")}
              </Link>
            </li>
            <li>
              <Link href="/account/orders" onClick={close} className="block py-2">
                {t("nav.myOrders")}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <Button variant="outline" className="w-full" lang={otherLocale(locale)} onClick={() => { switchTo(otherLocale(locale)); close(); }}>
            {otherLocale(locale) === "ar" ? "العربية" : "English"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
