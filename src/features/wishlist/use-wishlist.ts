"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useErrorMessage } from "@/hooks/use-error-message";
import { api } from "@/lib/api/client";
import type { Profile } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth.store";

export const profileKey = ["profile"] as const;

/** Account profile (addresses + wishlist ids). Only fetched for signed-in users. */
export function useProfile() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: profileKey,
    queryFn: () => api<Profile>("/users/me"),
    enabled: status === "authenticated",
    staleTime: 5 * 60_000,
  });
}

export function useWishlist() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const errorMessage = useErrorMessage();
  const ids = new Set(profile.data?.wishlist ?? []);

  const toggle = useMutation({
    mutationFn: async ({ productId, saved }: { productId: string; saved: boolean }) => {
      await api(`/users/me/wishlist/${productId}`, { method: saved ? "DELETE" : "PUT" });
    },
    // Optimistic: the heart fills instantly; rolled back if the request fails.
    onMutate: async ({ productId, saved }) => {
      await queryClient.cancelQueries({ queryKey: profileKey });
      const previous = queryClient.getQueryData<Profile>(profileKey);
      if (previous) {
        queryClient.setQueryData<Profile>(profileKey, {
          ...previous,
          wishlist: saved ? previous.wishlist.filter((id) => id !== productId) : [...previous.wishlist, productId],
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(profileKey, context.previous);
      toast.error(errorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  return { ids, has: (id: string) => ids.has(id), toggle };
}
