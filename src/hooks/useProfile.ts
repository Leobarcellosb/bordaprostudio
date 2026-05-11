import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/types/database.types";

const STALE_5_MIN = 5 * 60 * 1000;

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const profileQuery = useQuery<Profile | null>({
    queryKey: ["profile", userId],
    enabled: !!userId,
    staleTime: STALE_5_MIN,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  const rolesQuery = useQuery<{ role: string }[]>({
    queryKey: ["roles", userId],
    enabled: !!userId,
    staleTime: STALE_5_MIN,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return (data as { role: string }[]) ?? [];
    },
  });

  const profile = profileQuery.data ?? null;
  const isAdmin = (rolesQuery.data ?? []).some((r) => r.role === "admin");

  return {
    profile,
    isLoading: profileQuery.isLoading || rolesQuery.isLoading,
    isAdmin,
    machineFormat: profile?.machine_format ?? null,
    hoopSize: profile?.machine_hoop_size ?? null,
  };
}
