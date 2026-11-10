"use client";

import { Heart } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import { useT } from "@/i18n/client";
import { useLocalizedRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const t = useT();
  const router = useLocalizedRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const { has, toggle } = useWishlist();
  const saved = has(productId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("bg-background/80 backdrop-blur-sm hover:bg-background", className)}
      aria-pressed={saved}
      aria-label={saved ? t("wishlist.remove") : t("wishlist.add")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (status !== "authenticated") {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        toggle.mutate({ productId, saved });
      }}
    >
      <Heart className={cn("size-4", saved && "fill-accent text-accent")} strokeWidth={1.5} />
    </Button>
  );
}
