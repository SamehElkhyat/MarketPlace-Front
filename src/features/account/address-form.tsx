"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useShippingZones } from "@/features/account/use-shipping-zones";
import { useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import type { Address } from "@/lib/api/types";
import { formatMoney, pick } from "@/lib/format";
import { addressSchema, type AddressFormValues } from "@/lib/validation";

interface AddressFormProps {
  initial?: Partial<Address>;
  submitLabel: string;
  onSubmit: (values: AddressFormValues) => Promise<void> | void;
  onCancel?: () => void;
  showDefault?: boolean;
  defaultName?: string;
}

export function AddressForm({ initial, submitLabel, onSubmit, onCancel, showDefault = true, defaultName }: AddressFormProps) {
  const t = useT();
  const locale = useLocale();
  const zones = useShippingZones();
  const form = useForm<z.input<typeof addressSchema>, unknown, AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: initial?.fullName ?? defaultName ?? "",
      phone: initial?.phone ?? "",
      governorate: initial?.governorate ?? "",
      city: initial?.city ?? "",
      street: initial?.street ?? "",
      notes: initial?.notes ?? "",
      isDefault: initial?.isDefault ?? false,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const err = (message?: string) => (message ? t(message as MessageKey) : undefined);

  return (
    <form noValidate onSubmit={form.handleSubmit(async (values) => void (await onSubmit(values)))} className="grid gap-5 sm:grid-cols-2">
      <Field label={t("address.fullName")} error={err(errors.fullName?.message)} required className="sm:col-span-2">
        <Input autoComplete="name" {...form.register("fullName")} />
      </Field>
      <Field label={t("address.phone")} error={err(errors.phone?.message)} required>
        <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="01012345678" {...form.register("phone")} />
      </Field>
      <Controller
        control={form.control}
        name="governorate"
        render={({ field }) => (
          <Field label={t("address.governorate")} error={err(errors.governorate?.message)} required>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder={t("address.chooseGovernorate")} /></SelectTrigger>
              <SelectContent>
                {zones.data?.map((zone) => (
                  <SelectItem key={zone.governorate} value={zone.governorate}>
                    {pick(zone.name, locale)} · {formatMoney(zone.fee, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      <Field label={t("address.city")} error={err(errors.city?.message)} required>
        <Input autoComplete="address-level2" {...form.register("city")} />
      </Field>
      <Field label={t("address.street")} error={err(errors.street?.message)} required>
        <Input autoComplete="street-address" {...form.register("street")} />
      </Field>
      <Field label={t("address.notes")} className="sm:col-span-2">
        <Textarea rows={2} {...form.register("notes")} />
      </Field>
      {showDefault ? (
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <div className="flex items-center gap-2.5 sm:col-span-2">
              <Checkbox id="address-default" checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              <Label htmlFor="address-default" className="text-sm font-normal">{t("address.makeDefault")}</Label>
            </div>
          )}
        />
      ) : null}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button> : null}
      </div>
    </form>
  );
}
