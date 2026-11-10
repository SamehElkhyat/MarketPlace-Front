"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { mergeGuestCart, cartKey } from "@/features/cart/use-cart";
import { I18nProvider, useDir } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/translate";
import { refreshSession } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { hasSessionHint, useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        // Don't hammer the API with retries for errors a retry can't fix.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });
}

/**
 * Restores the session on page load (refresh cookie → new access token) and merges the guest cart
 * into the account cart the moment the user signs in.
 */
function SessionBootstrap() {
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (hasSessionHint()) void refreshSession();
    else useAuthStore.getState().clear();
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (useCartStore.getState().guestItems.length === 0) return;
    void mergeGuestCart().then((cart) => cart && queryClient.setQueryData(cartKey("account"), cart));
  }, [status, queryClient]);

  return null;
}

function ToasterWithDirection() {
  return <Toaster dir={useDir()} position="bottom-center" />;
}

export function Providers({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} messages={messages}>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            <TooltipProvider delayDuration={200}>
              <SessionBootstrap />
              {children}
              <ToasterWithDirection />
            </TooltipProvider>
          </NuqsAdapter>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
