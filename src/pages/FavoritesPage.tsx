import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoritesQuery, useToggleFavorite } from "@/hooks/queries/useFavoritesQuery";
import { AppLayout } from "@/components/AppLayout";
import { DesignCard } from "@/components/cards/DesignCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const FavoritesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { favoriteIds, error: favError } = useFavoritesQuery();
  const toggleMutation = useToggleFavorite();
  const toggle = (kitId: string) =>
    toggleMutation.mutate({ kitId, isFavorited: favoriteIds.has(kitId) });
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ids = Array.from(favoriteIds);
    if (ids.length === 0) { setDesigns([]); setError(false); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        // Chunk de 100 — evita o URL bomb do .in() com muitos ids (incidente
        // histórico: 1104 UUIDs → URL ~40KB → HTTP 400). [S5-01]
        const CHUNK = 100;
        const all: any[] = [];
        for (let i = 0; i < ids.length; i += CHUNK) {
          const { data, error: qErr } = await db
            .from("designs")
            .select("*, categories(name)")
            .in("id", ids.slice(i, i + CHUNK))
            .eq("is_published", true);
          if (qErr) throw qErr;
          all.push(...(data ?? []));
        }
        if (!cancelled) setDesigns(all);
      } catch (err) {
        // Falha vira ERRO visível, não "vazio" enganoso. [S6-03]
        console.error("[FavoritesPage] fetch error:", err);
        if (!cancelled) { setError(true); setDesigns([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, favoriteIds]);

  const showError = error || !!favError;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-destructive/10">
            <Heart className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">{t("favorites.title")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {designs.length > 0
                 ? `${designs.length} ${designs.length !== 1 ? t("favorites.count") : t("favorites.countSingular")}`
                 : t("favorites.emptyTitle")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-3.5">
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : showError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-16 text-center space-y-4">
              <Heart className="h-12 w-12 text-destructive/40 mx-auto" />
              <p className="text-foreground font-medium">Não foi possível carregar seus favoritos.</p>
              <p className="text-sm text-muted-foreground">Pode ter sido uma falha de conexão — tente recarregar.</p>
              <Button onClick={() => window.location.reload()} className="mt-2 rounded-xl">Recarregar</Button>
            </CardContent>
          </Card>
        ) : designs.length === 0 ? (
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="py-16 text-center space-y-4">
              <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground font-medium">Você ainda não favoritou nenhuma matriz.</p>
              <p className="text-sm text-muted-foreground/60">
                Toque no coração em qualquer matriz para salvar aqui.
              </p>
              <Button onClick={() => navigate("/library")} className="mt-2 rounded-xl gap-2">
                Explorar Biblioteca
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((kit: any) => (
              <DesignCard
                key={kit.id}
                name={kit.name}
                coverImage={kit.cover_image}
                category={kit.categories?.name}
                tags={[]}
                isFavorite={favoriteIds.has(kit.id)}
                onToggleFavorite={() => toggle(kit.id)}
                onClick={() => navigate(`/library/${kit.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FavoritesPage;
