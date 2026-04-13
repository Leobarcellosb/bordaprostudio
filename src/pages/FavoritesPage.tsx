import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
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
  const { favoriteIds, toggle } = useFavorites();
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ids = Array.from(favoriteIds);
    if (ids.length === 0) { setDesigns([]); setLoading(false); return; }

    db.from("designs")
      .select("*, categories(name)")
      .in("id", ids)
      .eq("is_published", true)
      .then(({ data }: any) => {
        setDesigns(data || []);
      })
      .catch((err: any) => {
        console.error("[FavoritesPage] fetch error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, favoriteIds]);

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
