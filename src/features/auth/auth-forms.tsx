"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPassword, login, register, resetPassword } from "@/features/auth/auth-api";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import { Link } from "@/i18n/navigation";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation";

/** Form error messages are i18n keys produced by the shared zod schemas. */
function useFieldError() {
  const t = useT();
  return (message?: string) => (message ? t(message as MessageKey) : undefined);
}

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit(async (values) => {
        setFormError(null);
        try {
          await login(values);
          onSuccess();
        } catch (error) {
          setFormError(errorMessage(error));
        }
      })}
    >
      <Field label={t("auth.email")} error={fieldError(errors.email?.message)} required>
        <Input type="email" autoComplete="email" inputMode="email" dir="ltr" {...form.register("email")} />
      </Field>
      <Field label={t("auth.password")} error={fieldError(errors.password?.message)} required>
        <Input type="password" autoComplete="current-password" dir="ltr" {...form.register("password")} />
      </Field>
      {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{t("auth.signIn")}</Button>
      <p className="text-center text-sm"><Link href="/forgot-password" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">{t("auth.forgot")}</Link></p>
    </form>
  );
}

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const locale = useLocale();
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof registerSchema>, unknown, z.output<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit(async (values) => {
        setFormError(null);
        try {
          await register({ ...values, locale });
          toast.success(t("auth.registered"));
          onSuccess();
        } catch (error) {
          setFormError(errorMessage(error));
        }
      })}
    >
      <Field label={t("auth.name")} error={fieldError(errors.name?.message)} required>
        <Input autoComplete="name" {...form.register("name")} />
      </Field>
      <Field label={t("auth.email")} error={fieldError(errors.email?.message)} required>
        <Input type="email" autoComplete="email" inputMode="email" dir="ltr" {...form.register("email")} />
      </Field>
      <Field label={t("auth.password")} hint={t("auth.passwordHint")} error={fieldError(errors.password?.message)} required>
        <Input type="password" autoComplete="new-password" dir="ltr" {...form.register("password")} />
      </Field>
      {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{t("auth.createAccount")}</Button>
    </form>
  );
}

export function ForgotForm() {
  const t = useT();
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const [sent, setSent] = useState(false);
  const form = useForm<z.input<typeof forgotSchema>, unknown, z.output<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  if (sent) return <p role="status" className="text-sm text-muted-foreground">{t("auth.resetSent")}</p>;
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit(async ({ email }) => {
        try {
          await forgotPassword(email);
          setSent(true);
        } catch (error) {
          toast.error(errorMessage(error));
        }
      })}
    >
      <Field label={t("auth.email")} error={fieldError(form.formState.errors.email?.message)} required>
        <Input type="email" autoComplete="email" dir="ltr" {...form.register("email")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>{t("auth.sendReset")}</Button>
    </form>
  );
}

export function ResetForm({ token, onDone }: { token: string; onDone: () => void }) {
  const t = useT();
  const fieldError = useFieldError();
  const errorMessage = useErrorMessage();
  const form = useForm<z.input<typeof resetSchema>, unknown, z.output<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit(async ({ password }) => {
        try {
          await resetPassword({ token, password });
          toast.success(t("auth.resetDone"));
          onDone();
        } catch (error) {
          toast.error(errorMessage(error));
        }
      })}
    >
      <Field label={t("auth.newPassword")} hint={t("auth.passwordHint")} error={fieldError(errors.password?.message)} required>
        <Input type="password" autoComplete="new-password" dir="ltr" {...form.register("password")} />
      </Field>
      <Field label={t("auth.confirmPassword")} error={fieldError(errors.confirm?.message)} required>
        <Input type="password" autoComplete="new-password" dir="ltr" {...form.register("confirm")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{t("auth.resetPassword")}</Button>
    </form>
  );
}
