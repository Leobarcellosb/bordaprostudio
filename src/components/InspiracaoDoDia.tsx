import { useInspiracaoDoDia } from "@/hooks/useInspiracaoDoDia";
import { useFavorites } from "@/hooks/useFavorites";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Eye, Heart, Download, Flame, Clock, Star, ThumbsUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LABEL_CONFIG: Record<string, { text: string; icon: typeof Flame; className: string }> = {
  tendencia: { text: "Tendência", icon: Flame, className: "bg-destructive/90 text-destructive-foreground" },
  novo: { text: "Novo", icon: Clock, className: "bg-primary/90 text-primary-foreground" },
  baseado_favoritos: { text: "Baseado nos seus favoritos", icon: Heart, className: "bg-secondary/90 text-secondary-foreground" },
  baseado_downloads: { text: "Baseado nos seus downloads", icon: ThumbsUp, className: "bg-accent text-accent-foreground" },
  destaque: { text: "Destaque", icon: Star, className: "bg-primary/90 text-primary-foreground" },
};

export const InspiracaoDoDia = () => {
  const { designs, loading } = useInspiracaoDoDia();
  const { favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleDownload = async (designId: string) => {
    if (!user) { toast.error("Faça login para baixar"); return; }
    try {
      await db.from("downloads").insert({ user_id: user.id, kit_id: designId });
      toast.success("Download registrado!");
      navigate(`/library/${designId}`);
    } catch {
      toast.error("Erro ao registrar download");
    }
  };

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/10">
            <Sparkles className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold">Inspiração do Dia</h2>
            <p className="text-sm text-muted-foreground">Descubra seleções especiais para criar, vender e se inspirar hoje.</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs gap-1.5 shrink-0">
          <Sparkles className="h-3 w-3" />
          Atualizado hoje
        </Badge>
      </div>

      {/* Cards */}
      {designs.length === 0 ? (
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma inspiração disponível ainda. Explore a biblioteca para gerar recomendações!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {designs.map((design) => {
            const labelCfg = design.label ? LABEL_CONFIG[design.label] : null;
            const LabelIcon = labelCfg?.icon;
            const isFav = favoriteIds.has(design.id);

            return (
              <Card
                key={design.id}
                className="group overflow-hidden border-border/40 bg-card hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15)] hover:border-primary/25 transition-all duration-500 ease-out hover:-translate-y-1.5 cursor-pointer rounded-xl"
                onClick={() => navigate(`/library/${design.id}`)}
              >
                {/* Image */}
                <div className="aspect-[4/5] bg-muted overflow-hidden relative">
                  {design.cover_image ? (
                    <img
                      src={design.cover_image}
                      alt={design.name}
                      className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-accent to-muted gap-2">
                      <span className="text-3xl opacity-40">🧵</span>
                      <span className="text-xs text-muted-foreground">Preview não disponível</span>
                    </div>
                  )}

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Label badge */}
                  {labelCfg && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <Badge className={`${labelCfg.className} border-0 text-[10px] font-semibold shadow-sm px-2 py-0.5 gap-1`}>
                        {LabelIcon && <LabelIcon className="h-3 w-3" />}
                        {labelCfg.text}
                      </Badge>
                    </div>
                  )}

                  {/* Category badge */}
                  {design.category_name && !labelCfg && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <Badge className="bg-background/85 backdrop-blur-md text-foreground border-0 text-[10px] font-semibold shadow-sm px-2.5 py-0.5">
                        {design.category_name}
                      </Badge>
                    </div>
                  )}

                  {/* Favorite button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(design.id); }}
                    className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md border shadow-sm transition-all duration-300 z-10 ${
                      isFav
                        ? "bg-destructive/90 border-destructive/50 text-destructive-foreground"
                        : "bg-background/85 border-transparent text-muted-foreground opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 hover:bg-destructive/90 hover:text-destructive-foreground"
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                  </button>

                  {/* Download button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(design.id); }}
                    className="absolute top-2.5 right-12 p-2 rounded-full bg-background/85 backdrop-blur-md border-transparent shadow-sm opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-primary-foreground z-10"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>

                  {/* Open button */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-400 z-10">
                    <button
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/90 backdrop-blur-md text-primary-foreground text-xs font-semibold shadow-lg hover:bg-primary transition-colors"
                      onClick={(e) => { e.stopPropagation(); navigate(`/library/${design.id}`); }}
                    >
                      <Eye className="h-3.5 w-3.5" /> Abrir matriz
                    </button>
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-3.5 space-y-1.5">
                  <h3 className="font-display font-semibold text-[13px] leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
                    {design.name}
                  </h3>
                  {design.category_name && labelCfg && (
                    <p className="text-[11px] text-muted-foreground">{design.category_name}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
