import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/types/database.types";

export const PROFILE_QUERY_KEY = (userId: string) => ["profile", userId] as const;

/**
 * Fetch do profile do usuário logado.
 *
 * Atenção: o AuthContext JÁ cacheia profile em React state e expõe via
 * useAuth().profile pro app inteiro. Este hook é para componentes que
 * preferem o pattern useQuery (caching, refetch, isLoading, mutation
 * adjacente). Os dois coexistem mas cuidado: se mutar via este hook,
 * o AuthContext fica stale até chamar refresh() — use updateProfileMutation
 * abaixo que faz os dois.
 */
export function useProfileQuery() {
  const { user } = useAuth();
  return useQuery<Profile | null>({
    queryKey: PROFILE_QUERY_KEY(user?.id ?? ""),
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Atualiza o profile + invalida cache do React Query + força refresh do
 * AuthContext (pra AppSidebar e outros consumidores via useAuth() não
 * ficarem stale).
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (!user?.id) throw new Error("Sem user logado");
      const { error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY(user.id) });
      await refresh(); // sincroniza AuthContext (sidebar + ProtectedRoute)
    },
  });
}
