"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ForgotForm, LoginForm, RegisterForm, ResetForm } from "@/features/auth/auth-forms";
import { verifyEmail } from "@/features/auth/auth-api";
import { GoogleButton } from "@/features/auth/google-button";
import { useT } from "@/i18n/client";
import { Link, useLocalizedRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth.store";

/** Only same-site relative paths are honoured — prevents open-redirect abuse of `?next=`. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="page-container flex min-h-[70dvh] items-center justify-center py-16">
      <div className="w-full max-w-md border border-border bg-card p-8 md:p-10">
        <h1 className="text-xl">{title}</h1>
        {subtitle ? <p className="mt-2 mb-8 text-sm text-muted-foreground">{subtitle}</p> : <div className="mb-8" />}
        {children}
        {footer ? <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}

function useRedirectWhenSignedIn() {
  const router = useLocalizedRouter();
  const params = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const next = safeNext(params.get("next"));
  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);
  return { next, goNext: () => router.replace(next) };
}

export function LoginView() {
  const t = useT();
  const { next, goNext } = useRedirectWhenSignedIn();
  return (
    <AuthShell
      title={t("auth.signInTitle")}
      subtitle={t("auth.signInSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-foreground underline underline-offset-4">{t("auth.createAccount")}</Link>
        </>
      }
    >
      <div className="space-y-6">
        <LoginForm onSuccess={goNext} />
        <GoogleButton onSuccess={goNext} />
      </div>
    </AuthShell>
  );
}

export function RegisterView() {
  const t = useT();
  const { next, goNext } = useRedirectWhenSignedIn();
  return (
    <AuthShell
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-foreground underline underline-offset-4">{t("auth.signIn")}</Link>
        </>
      }
    >
      <div className="space-y-6">
        <RegisterForm onSuccess={goNext} />
        <GoogleButton onSuccess={goNext} />
      </div>
    </AuthShell>
  );
}

export function ForgotView() {
  const t = useT();
  return (
    <AuthShell title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")} footer={<Link href="/login" className="underline underline-offset-4">{t("auth.backToSignIn")}</Link>}>
      <ForgotForm />
    </AuthShell>
  );
}

export function ResetView() {
  const t = useT();
  const router = useLocalizedRouter();
  const token = useSearchParams().get("token");
  return (
    <AuthShell title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")}>
      {token ? <ResetForm token={token} onDone={() => router.replace("/login")} /> : <p role="alert" className="text-sm text-destructive">{t("auth.linkInvalid")}</p>}
    </AuthShell>
  );
}

export function VerifyEmailView() {
  const t = useT();
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"pending" | "ok" | "error">(token ? "pending" : "error");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyEmail(token)
      .then(() => !cancelled && setState("ok"))
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell title={t("auth.verifyTitle")}>
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        {state === "pending" ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
        {state === "ok" ? (
          <>
            <CheckCircle2 className="size-8 text-success" strokeWidth={1.25} />
            <p className="text-sm">{t("auth.verifyOk")}</p>
            <Button asChild><Link href="/">{t("auth.continueShopping")}</Link></Button>
          </>
        ) : null}
        {state === "error" ? (
          <>
            <XCircle className="size-8 text-destructive" strokeWidth={1.25} />
            <p className="text-sm">{t("auth.linkInvalid")}</p>
          </>
        ) : null}
      </div>
    </AuthShell>
  );
}
