import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const FAVORITES_QUERY_KEY = (userId: string) => ["favorites", userId] as const;

interface FavoriteRow {
  kit_id: string;
}

/**
 * Lista de kit_ids favoritados pelo user atual. Retorna Set pra lookup
 * O(1) — uso típico `favoriteIds.has(designId)`.
 *
 * Schema histórico: favorites tem coluna kit_id (que sincroniza com
 * design_id via trigger). Hoje usamos kit_id como key canônica.
 */
export function useFavoritesQuery() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const query = useQuery({
    queryKey: FAVORITES_QUERY_KEY(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("kit_id")
        .eq("user_id", userId);
      if (error) throw error;
      return new Set(((data ?? []) as FavoriteRow[]).map((f) => f.kit_id));
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    favoriteIds: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Toggle favorito com optimistic update + rollback em erro + webhook.
 *
 * Mantém paridade com o useFavorites antigo:
 *   - UI atualiza ANTES da resposta do servidor (otimismo)
 *   - Se a request falhar, reverte
 *   - Toast de sucesso/erro
 *   - Dispatch de webhook "design_favorited" no insert (não no delete)
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const key = FAVORITES_QUERY_KEY(userId);

  return useMutation({
    mutationFn: async ({ kitId, isFavorited }: { kitId: string; isFavorited: boolean }) => {
      if (!userId) throw new Error("Faça login para salvar favoritos");
      if (isFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("kit_id", kitId);
        if (error) throw error;
        return { action: "removed" as const, kitId };
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: userId, kit_id: kitId });
        if (error) throw error;
        return { action: "added" as const, kitId };
      }
    },
    // Optimistic update — toca o cache antes da resposta
    onMutate: async ({ kitId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Set<string>>(key) ?? new Set();
      const next = new Set(prev);
      if (isFavorited) next.delete(kitId);
      else next.add(kitId);
      queryClient.setQueryData(key, next);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
      const msg = err instanceof Error ? err.message : "Erro ao atualizar favoritos";
      toast.error(msg);
    },
    onSuccess: (result) => {
      if (result.action === "added") {
        toast.success("Adicionado aos favoritos!");
        // Webhook fire-and-forget — não bloqueia UX
        import("@/lib/webhooks")
          .then(({ dispatchWebhook }) =>
            dispatchWebhook({
              event_name: "design_favorited",
              user_email: user?.email || undefined,
              user_id: userId,
              design_id: result.kitId,
            }),
          )
          .catch((err) => console.error("[useToggleFavorite] webhook error:", err));
      } else {
        toast.success("Removido dos favoritos");
      }
    },
    onSettled: () => {
      // Não invalidar — confiamos no optimistic update. Pode ativar se
      // suspeitar de divergência cache vs DB:
      // queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
