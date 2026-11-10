import { api } from "@/lib/api/client";
import type { AuthResponse, Profile } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth.store";

/** Thin wrappers over the auth endpoints that also keep the in-memory session in sync. */

export async function login(input: { email: string; password: string }) {
  const data = await api<AuthResponse>("/auth/login", { method: "POST", body: input, auth: false });
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data.user;
}

export async function register(input: { name: string; email: string; password: string; locale: "ar" | "en" }) {
  const data = await api<AuthResponse>("/auth/register", { method: "POST", body: input, auth: false });
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data.user;
}

export async function loginWithGoogle(input: { credential: string; locale: "ar" | "en" }) {
  const data = await api<AuthResponse>("/auth/google", { method: "POST", body: input, auth: false });
  useAuthStore.getState().setSession(data.accessToken, data.user);
  return data.user;
}

export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } finally {
    useAuthStore.getState().clear();
  }
}

export async function logoutEverywhere() {
  try {
    await api("/auth/logout-all", { method: "POST" });
  } finally {
    useAuthStore.getState().clear();
  }
}

export const forgotPassword = (email: string) => api("/auth/forgot-password", { method: "POST", body: { email }, auth: false });

export const resetPassword = (input: { token: string; password: string }) =>
  api("/auth/reset-password", { method: "POST", body: input, auth: false });

export const verifyEmail = (token: string) => api("/auth/verify-email", { method: "POST", body: { token }, auth: false });

export const resendVerification = () => api("/auth/resend-verification", { method: "POST" });

export const fetchProfile = () => api<Profile>("/users/me");
