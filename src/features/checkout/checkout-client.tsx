"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { OptionSummary } from "@/components/layout/cart-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AddressForm } from "@/features/account/address-form";
import { LoginForm, RegisterForm } from "@/features/auth/auth-forms";
import { GoogleButton } from "@/features/auth/google-button";
import { useCart } from "@/features/cart/use-cart";
import { profileKey, useProfile } from "@/features/wishlist/use-wishlist";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { Link, useLocalizedRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Address, PaymentMethod, PaymentMethodInfo, PlaceOrderResponse, Profile, Quote } from "@/lib/api/types";
import { formatMoney, pick } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <h2 className="mb-6 flex items-center gap-3 font-sans text-base font-medium tracking-normal">
        <span className="flex size-6 items-center justify-center rounded-full border border-foreground text-xs tabular-nums">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AuthStep() {
  const t = useT();
  return (
    <Tabs defaultValue="login" className="max-w-md">
      <TabsList className="mb-6 w-full">
        <TabsTrigger value="login" className="flex-1">{t("auth.signIn")}</TabsTrigger>
        <TabsTrigger value="register" className="flex-1">{t("auth.createAccount")}</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="space-y-6"><LoginForm onSuccess={() => undefined} /><GoogleButton onSuccess={() => undefined} /></TabsContent>
      <TabsContent value="register" className="space-y-6"><RegisterForm onSuccess={() => undefined} /><GoogleButton onSuccess={() => undefined} /></TabsContent>
    </Tabs>
  );
}

function AddressStep({ profile, selected, onSelect }: { profile: Profile | undefined; selected: string | null; onSelect: (id: string) => void }) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [adding, setAdding] = useState(false);
  const addresses = profile?.addresses ?? [];

  const addAddress = useMutation({
    mutationFn: (values: Record<string, unknown>) => api<Profile & { addresses: Address[] }>("/users/me/addresses", { method: "POST", body: values }),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data);
      const created = data.addresses.at(-1);
      if (created) onSelect(created._id);
      setAdding(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const showForm = adding || addresses.length === 0;

  return (
    <div className="space-y-4">
      {addresses.length > 0 ? (
        <div role="radiogroup" aria-label={t("checkout.address")} className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <button
              key={address._id}
              type="button"
              role="radio"
              aria-checked={selected === address._id}
              onClick={() => onSelect(address._id)}
              className={cn("flex flex-col gap-1 border p-4 text-start text-sm transition-colors", selected === address._id ? "border-foreground bg-card" : "border-border hover:border-muted-foreground")}
            >
              <span className="flex items-center justify-between font-medium">
                {address.fullName}
                {selected === address._id ? <Check className="size-4" /> : null}
              </span>
              <span className="text-muted-foreground">{address.street}, {address.city}</span>
              <span className="text-muted-foreground" dir="ltr">{address.phone}</span>
              {address.isDefault ? <Badge variant="outline" className="mt-1 w-fit">{t("address.default")}</Badge> : null}
            </button>
          ))}
        </div>
      ) : null}

      {showForm ? (
        <div className="border border-border bg-card p-5">
          <AddressForm
            submitLabel={t("address.save")}
            defaultName={user?.name}
            onSubmit={async (values) => void (await addAddress.mutateAsync({ ...values, isDefault: values.isDefault ?? addresses.length === 0 }).catch(() => undefined))}
            {...(addresses.length > 0 ? { onCancel: () => setAdding(false) } : {})}
          />
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}><Plus /> {t("address.addNew")}</Button>
      )}
      <p className="sr-only" lang={locale}>{t("checkout.address")}</p>
    </div>
  );
}

export function CheckoutClient() {
  const t = useT();
  const locale = useLocale();
  const router = useLocalizedRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const { cart, isLoading: cartLoading } = useCart();
  const profile = useProfile();

  const [addressChoice, setAddressChoice] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>();
  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [note, setNote] = useState("");
  // One key per attempt: a double-click or network retry returns the SAME order instead of a second one.
  const idempotencyKey = useRef(crypto.randomUUID());

  const addresses = profile.data?.addresses ?? [];
  const addressId = addressChoice ?? (addresses.find((a) => a.isDefault) ?? addresses[0])?._id ?? null;
  const signedIn = status === "authenticated";

  const methods = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => (await api<{ items: PaymentMethodInfo[] }>("/checkout/payment-methods", { auth: false })).items,
    staleTime: 10 * 60_000,
  });

  const quote = useQuery({
    queryKey: ["quote", addressId, coupon, cart.items.map((i) => `${i.sku}:${i.qty}`).join(",")],
    queryFn: () => api<Quote>("/checkout/quote", { method: "POST", body: { ...(addressId ? { addressId } : {}), ...(coupon ? { couponCode: coupon } : {}) } }),
    enabled: signedIn && cart.items.length > 0,
    placeholderData: (previous) => previous,
  });

  const place = useMutation({
    mutationFn: () =>
      api<PlaceOrderResponse>("/orders", {
        method: "POST",
        idempotencyKey: idempotencyKey.current,
        body: { addressId, paymentMethod: method, ...(coupon ? { couponCode: coupon } : {}), ...(note ? { note } : {}), ...(quote.data ? { expectedTotal: quote.data.total } : {}) },
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace(`/account/orders/${data.order.orderNumber}?placed=1`);
    },
    onError: (error) => {
      // A definitive server rejection means no order exists → next attempt gets a fresh key.
      if (error instanceof ApiError && error.code !== "NETWORK") idempotencyKey.current = crypto.randomUUID();
      toast.error(errorMessage(error));
      if (error instanceof ApiError && ["PRICE_CHANGED", "INSUFFICIENT_STOCK", "PRODUCT_UNAVAILABLE", "COUPON_INVALID"].includes(error.code)) {
        void queryClient.invalidateQueries({ queryKey: ["cart"] });
        void quote.refetch();
      }
    },
  });

  if (status === "loading" || cartLoading) {
    return <div className="page-container py-12"><Skeleton className="h-96 w-full" /></div>;
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={t("cart.empty.title")}
        description={t("cart.empty.description")}
        action={<Button asChild><Link href="/collections/new-arrivals">{t("cart.empty.cta")}</Link></Button>}
        className="py-32"
      />
    );
  }

  const q = quote.data;
  const codBlocked = method === "cod" && q ? !q.codAvailable : false;
  const canPlace = signedIn && !!addressId && !!q && q.shippingKnown && !cart.hasBlockingIssues && !codBlocked && !place.isPending;
  const couponError = q?.coupon?.error?.reason;

  return (
    <div className="page-container py-10 md:py-16">
      <h1 className="mb-10 text-xl md:text-2xl">{t("checkout.title")}</h1>
      <div className="page-grid gap-y-12">
        <div className="col-span-4 md:col-span-7">
          <Section step={1} title={t("checkout.account")}>
            {signedIn && user ? (
              <p className="text-sm">
                {t("checkout.signedInAs")} <span className="font-medium" dir="ltr">{user.email}</span>
                {!user.emailVerified ? <Badge variant="warning" className="ms-2">{t("checkout.unverified")}</Badge> : null}
              </p>
            ) : (
              <AuthStep />
            )}
          </Section>

          {signedIn ? (
            <>
              <Section step={2} title={t("checkout.address")}>
                <AddressStep profile={profile.data} selected={addressId} onSelect={setAddressChoice} />
                {q?.shippingEstimate ? (
                  <p className="mt-4 text-sm text-muted-foreground">{t("checkout.eta", { min: q.shippingEstimate.min, max: q.shippingEstimate.max })}</p>
                ) : null}
              </Section>

              <Section step={3} title={t("checkout.payment")}>
                <div role="radiogroup" aria-label={t("checkout.payment")} className="space-y-3">
                  {(methods.data ?? []).map((info) => {
                    const disabled = !info.enabled;
                    const active = method === info.method;
                    return (
                      <button
                        key={info.method}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-disabled={disabled}
                        disabled={disabled}
                        onClick={() => setMethod(info.method)}
                        className={cn("flex w-full items-center justify-between gap-4 border p-4 text-start transition-colors", active ? "border-foreground bg-card" : "border-border", disabled ? "cursor-not-allowed opacity-60" : "hover:border-muted-foreground")}
                      >
                        <span>
                          <span className="block text-sm font-medium">{t(`checkout.method.${info.method}.label`)}</span>
                          <span className="block text-xs text-muted-foreground">{t(`checkout.method.${info.method}.hint`)}</span>
                        </span>
                        {info.comingSoon ? <Badge variant="accent">{t("checkout.soon")}</Badge> : active ? <Check className="size-4" /> : null}
                      </button>
                    );
                  })}
                </div>
                {methods.data?.some((m) => m.comingSoon) ? <p className="mt-3 text-xs text-muted-foreground">{t("checkout.onlineSoon")}</p> : null}
                {codBlocked && q ? <p role="alert" className="mt-3 text-sm text-destructive">{t("checkout.codLimit", { max: formatMoney(q.codMaxAmount, locale) })}</p> : null}
              </Section>

              <Section step={4} title={t("checkout.notes")}>
                <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("checkout.notesPlaceholder")} aria-label={t("checkout.notes")} />
              </Section>
            </>
          ) : null}
        </div>

        <aside className="col-span-4 md:col-span-5" aria-label={t("checkout.summary")}>
          <div className="border border-border bg-card p-6 md:sticky md:top-24">
            <h2 className="mb-5 font-sans text-base font-medium tracking-normal">{t("checkout.summary")}</h2>
            <ul className="divide-y divide-border">
              {cart.items.map((line) => (
                <li key={line.sku} className="flex gap-3 py-3 first:pt-0">
                  <div className="media-4x5 w-14 shrink-0">{line.image ? <Image src={line.image} alt="" fill sizes="56px" className="object-cover" /> : null}</div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-2">{pick(line.title, locale) || line.sku}</p>
                    <OptionSummary line={line} />
                    <p className="text-xs text-muted-foreground">{t("cart.qtyShort", { count: line.qty })}</p>
                    {line.warnings.some((w) => w !== "PRICE_CHANGED") ? <p className="text-xs text-destructive">{t("cart.fixIssues")}</p> : null}
                  </div>
                  {line.available ? <Money amount={line.lineTotal} className="text-sm" /> : null}
                </li>
              ))}
            </ul>

            {signedIn ? (
              <form
                className="mt-5 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCoupon(couponInput.trim().toUpperCase() || undefined);
                }}
              >
                <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={t("checkout.coupon")} aria-label={t("checkout.coupon")} dir="ltr" className="h-10 uppercase" />
                <Button type="submit" variant="outline" size="sm" className="h-10">{t("checkout.apply")}</Button>
              </form>
            ) : null}
            {couponError ? <p role="alert" className="mt-2 text-xs text-destructive">{t(`checkout.couponReason.${couponError as "inactive"}`)}</p> : null}
            {q?.coupon && !q.coupon.error ? <p className="mt-2 text-xs text-success">{t("checkout.couponApplied", { code: q.coupon.code })}</p> : null}

            <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("cart.subtotal")}</dt><dd><Money amount={q?.subtotal ?? cart.subtotal} /></dd></div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("checkout.shipping")}</dt>
                <dd>{q?.shippingKnown ? <Money amount={q.shippingFee} /> : <span className="text-muted-foreground">{t("checkout.shippingTbd")}</span>}</dd>
              </div>
              {q && q.discount > 0 ? <div className="flex justify-between text-success"><dt>{t("checkout.discount")}</dt><dd>− <Money amount={q.discount} /></dd></div> : null}
              <div className="flex justify-between border-t border-border pt-3 text-base font-medium"><dt>{t("checkout.total")}</dt><dd><Money amount={q?.total ?? cart.subtotal} /></dd></div>
            </dl>

            <Button size="lg" className="mt-6 w-full" disabled={!canPlace} onClick={() => place.mutate()}>
              {place.isPending ? t("checkout.placing") : t("checkout.place")}
            </Button>
            {!signedIn ? <p className="mt-3 text-center text-xs text-muted-foreground">{t("checkout.signInFirst")}</p> : null}
            {signedIn && !addressId ? <p className="mt-3 text-center text-xs text-muted-foreground">{t("checkout.addAddressFirst")}</p> : null}
            <p className="mt-4 text-center text-xs text-muted-foreground">{t("checkout.codNote")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
