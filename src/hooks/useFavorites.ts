import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); setLoading(false); return; }
    db.from("favorites")
      .select("kit_id")
      .eq("user_id", user.id)
      .then(({ data }: any) => {
        setFavoriteIds(new Set((data || []).map((f: any) => f.kit_id)));
      })
      .catch((err: any) => {
        console.error("[useFavorites] load error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const toggle = useCallback(async (kitId: string) => {
    if (!user) { toast.error("Faça login para salvar favoritos"); return; }
    const isFav = favoriteIds.has(kitId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(kitId) : next.add(kitId);
      return next;
    });
    try {
      if (isFav) {
        await db.from("favorites").delete().eq("user_id", user.id).eq("kit_id", kitId);
        toast.success("Removido dos favoritos");
      } else {
        await db.from("favorites").insert({ user_id: user.id, kit_id: kitId });
        toast.success("Adicionado aos favoritos!");
        import("@/lib/webhooks")
          .then(({ dispatchWebhook }) => {
            dispatchWebhook({ event_name: "design_favorited", user_email: user.email || undefined, user_id: user.id, design_id: kitId });
          })
          .catch((err) => console.error("[useFavorites] webhook dispatch error:", err));
      }
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.add(kitId) : next.delete(kitId);
        return next;
      });
      toast.error("Erro ao atualizar favoritos");
    }
  }, [user, favoriteIds]);

  return { favoriteIds, toggle, loading };
}
