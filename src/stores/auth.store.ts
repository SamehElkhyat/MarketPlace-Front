import { create } from "zustand";
import type { User } from "@/lib/api/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

/**
 * A non-secret hint ("this browser had a session") so anonymous visitors don't fire a pointless
 * refresh request — and a 401 in the console — on every page load. The credential itself stays in
 * the httpOnly cookie, which JavaScript can't read.
 */
const SESSION_HINT_KEY = "atelier-session-hint";

export const hasSessionHint = (): boolean => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return true; // storage blocked → just try the refresh
  }
};

const writeSessionHint = (present: boolean) => {
  try {
    if (present) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // storage unavailable (private mode) — harmless
  }
};

interface AuthState {
  status: AuthStatus;
  /**
   * Short-lived (15 min) access token. Kept ONLY in memory — never localStorage — so XSS can't
   * steal a long-lived credential. The httpOnly refresh cookie silently renews it on page load.
   */
  accessToken: string | null;
  user: User | null;
  setSession: (accessToken: string, user: User) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => {
    writeSessionHint(true);
    set({ accessToken, user, status: "authenticated" });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    writeSessionHint(false);
    set({ accessToken: null, user: null, status: "anonymous" });
  },
}));

export const isAdminRole = (role: User["role"] | undefined): boolean => role === "admin" || role === "demo_admin";
