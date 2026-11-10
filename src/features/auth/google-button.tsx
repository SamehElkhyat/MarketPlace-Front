"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loginWithGoogle } from "@/features/auth/auth-api";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale } from "@/i18n/client";

interface GoogleId {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** "Continue with Google" via Google Identity Services. Renders nothing unless a client id is configured. */
export function GoogleButton({ onSuccess }: { onSuccess: () => void }) {
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const google = (window as unknown as { google?: GoogleId }).google;
    if (!ready || !CLIENT_ID || !google || !container.current) return;
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async ({ credential }) => {
        try {
          await loginWithGoogle({ credential, locale });
          onSuccess();
        } catch (error) {
          toast.error(errorMessage(error));
        }
      },
    });
    google.accounts.id.renderButton(container.current, { theme: "outline", size: "large", shape: "rectangular", width: 320, locale });
  }, [ready, locale, onSuccess, errorMessage]);

  if (!CLIENT_ID) return null;
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onLoad={() => setReady(true)} />
      <div ref={container} className="flex min-h-10 justify-center" />
    </>
  );
}
