import { z } from "zod";
import type { MessageKey } from "@/i18n/translate";

/**
 * Form schemas. Messages are i18n KEYS (not text) so the same schema works in Arabic and English:
 * the UI resolves `error.message` through `t()`.
 */
const k = (key: MessageKey) => key;

export const emailField = z.string().trim().toLowerCase().pipe(z.email(k("validation.email")));

export const passwordField = z
  .string()
  .min(8, k("validation.passwordMin"))
  .regex(/[A-Za-z]/, k("validation.passwordLetter"))
  .regex(/[0-9]/, k("validation.passwordNumber"));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, k("validation.required")),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, k("validation.nameMin")),
  email: emailField,
  password: passwordField,
});

export const forgotSchema = z.object({ email: emailField });

export const resetSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: k("validation.passwordMatch") });

export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, k("validation.phone"));

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, k("validation.required")),
  phone: phoneField,
  governorate: z.string().min(1, k("validation.required")),
  city: z.string().trim().min(2, k("validation.required")),
  street: z.string().trim().min(3, k("validation.required")),
  notes: z.string().trim().max(300).optional(),
  isDefault: z.boolean().optional(),
});
export type AddressFormValues = z.infer<typeof addressSchema>;
