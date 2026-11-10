"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressForm } from "@/features/account/address-form";
import { useShippingZones } from "@/features/account/use-shipping-zones";
import { profileKey, useProfile } from "@/features/wishlist/use-wishlist";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import { api } from "@/lib/api/client";
import type { Profile } from "@/lib/api/types";
import { pick } from "@/lib/format";
import type { AddressFormValues } from "@/lib/validation";

export function AddressesView() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const profile = useProfile();
  const zones = useShippingZones();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const onSaved = (data: Profile) => {
    queryClient.setQueryData(profileKey, data);
    setEditing(null);
    toast.success(t("account.saved"));
  };
  const onError = (error: unknown) => toast.error(errorMessage(error));

  const create = useMutation({
    mutationFn: (values: AddressFormValues) => api<Profile>("/users/me/addresses", { method: "POST", body: values }),
    onSuccess: onSaved,
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AddressFormValues }) =>
      api<Profile>(`/users/me/addresses/${id}`, { method: "PUT", body: values }),
    onSuccess: onSaved,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<Profile>(`/users/me/addresses/${id}`, { method: "DELETE" }),
    onSuccess: (data) => queryClient.setQueryData(profileKey, data),
    onError,
  });

  const addresses = profile.data?.addresses ?? [];
  const governorateName = (key: string) => {
    const zone = zones.data?.find((z) => z.governorate === key);
    return zone ? pick(zone.name, locale) : key;
  };
  const showNewForm = editing === "new" || (addresses.length === 0 && !profile.isPending);

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl">{t("account.addresses")}</h1>
        {editing === null && addresses.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus /> {t("address.addNew")}
          </Button>
        ) : null}
      </div>

      {profile.isPending ? <Skeleton className="h-32 w-full" /> : null}

      {showNewForm ? (
        <div className="border border-border bg-card p-6">
          {addresses.length === 0 ? (
            <EmptyState icon={MapPin} title={t("address.empty.title")} description={t("address.empty.description")} className="py-6" />
          ) : null}
          <AddressForm
            submitLabel={t("address.save")}
            onSubmit={async (values) => void (await create.mutateAsync(values).catch(() => undefined))}
            {...(addresses.length > 0 ? { onCancel: () => setEditing(null) } : {})}
          />
        </div>
      ) : null}

      <ul className="space-y-4">
        {addresses.map((address) => (
          <li key={address._id} className="border border-border p-5">
            {editing === address._id ? (
              <AddressForm
                initial={address}
                submitLabel={t("common.save")}
                onSubmit={async (values) => void (await update.mutateAsync({ id: address._id, values }).catch(() => undefined))}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <address className="space-y-1 text-sm not-italic">
                  <p className="flex items-center gap-2 font-medium">
                    {address.fullName} {address.isDefault ? <Badge variant="outline">{t("address.default")}</Badge> : null}
                  </p>
                  <p className="text-muted-foreground">
                    {address.street}, {address.city}, {governorateName(address.governorate)}
                  </p>
                  <p className="text-muted-foreground" dir="ltr">
                    {address.phone}
                  </p>
                </address>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => setEditing(address._id)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("common.delete")}
                    onClick={() => {
                      if (window.confirm(t("address.deleteConfirm"))) remove.mutate(address._id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
