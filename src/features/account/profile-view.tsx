"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logoutEverywhere, resendVerification } from "@/features/auth/auth-api";
import { profileKey } from "@/features/wishlist/use-wishlist";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useT } from "@/i18n/client";
import { useLocalizedRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { Profile } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth.store";

export function ProfileView() {
  const t = useT();
  const router = useLocalizedRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState<string | null>(null);
  const value = name ?? user?.name ?? "";

  const save = useMutation({
    mutationFn: () => api<Profile>("/users/me", { method: "PATCH", body: { name: value.trim() } }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(profileKey, data);
      setName(null);
      toast.success(t("account.saved"));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!user) return null;
  const unchanged = value.trim() === user.name || value.trim().length < 2;

  return (
    <div className="max-w-xl space-y-10">
      <h1 className="text-xl">{t("account.profile")}</h1>

      {!user.emailVerified ? (
        <div className="flex items-start gap-3 border border-warning/40 bg-warning/5 p-4 text-sm" role="status">
          <MailWarning className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={1.5} />
          <div className="space-y-2">
            <p>{t("account.verifyBanner")}</p>
            <Button
              variant="link"
              size="xs"
              onClick={() =>
                void resendVerification()
                  .then(() => toast.success(t("account.verifySent")))
                  .catch((error) => toast.error(errorMessage(error)))
              }
            >
              {t("account.resend")}
            </Button>
          </div>
        </div>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!unchanged) save.mutate();
        }}
      >
        <Field label={t("auth.name")}>
          <Input value={value} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label={t("auth.email")} hint={t("account.emailReadonly")}>
          <Input value={user.email} readOnly dir="ltr" className="text-muted-foreground" />
        </Field>
        <Button type="submit" disabled={save.isPending || unchanged}>
          {t("common.save")}
        </Button>
      </form>

      <section className="border-t border-border pt-8">
        <h2 className="mb-2 font-sans text-base font-medium tracking-normal">{t("account.security")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("account.logoutAllHint")}</p>
        <Button
          variant="outline"
          onClick={async () => {
            await logoutEverywhere();
            router.push("/");
          }}
        >
          {t("account.logoutAll")}
        </Button>
      </section>
    </div>
  );
}
