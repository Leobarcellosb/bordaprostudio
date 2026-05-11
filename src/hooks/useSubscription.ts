import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Subscription } from "@/types/database.types";

const STALE_2_MIN = 2 * 60 * 1000;

export function useSubscription() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery<Subscription | null>({
    queryKey: ["subscription", userId],
    enabled: !!userId,
    staleTime: STALE_2_MIN,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return ((data as unknown) as Subscription | null) ?? null;
    },
  });

  const expiresAt = data?.access_expires_at ?? null;
  const now = Date.now();
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const isActive =
    !!data &&
    data.status === "active" &&
    !!expiresMs &&
    !Number.isNaN(expiresMs) &&
    expiresMs > now;

  return {
    subscription: data ?? null,
    isActive,
    expiresAt,
    isLoading,
  };
}
