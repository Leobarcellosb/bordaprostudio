import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DesignCard } from "@/components/cards/DesignCard";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Sparkles, Calendar, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Trend {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  seasonal?: boolean;
  month?: number[];
}

const TRENDS: Trend[] = [
  { id: "natal", name: "Natal", icon: "🎄", keywords: ["natal", "natalino", "christmas", "papai noel", "rena"], seasonal: true, month: [11, 12, 1] },
  { id: "pascoa", name: "Páscoa", icon: "🐰", keywords: ["pascoa", "páscoa", "coelho", "easter", "ovo"], seasonal: true, month: [3, 4] },
  { id: "bebe", name: "Bebê", icon: "👶", keywords: ["bebe", "bebê", "baby", "infantil", "maternidade", "recem nascido"] },
  { id: "cozinha", name: "Cozinha", icon: "🍳", keywords: ["cozinha", "pano de prato", "galinha", "frutas", "kitchen"] },
  { id: "floral", name: "Floral", icon: "🌸", keywords: ["floral", "flores", "flor", "rosa", "jardim"] },
  { id: "animais", name: "Animais", icon: "🐾", keywords: ["animal", "animais", "cachorro", "gato", "urso", "coelho", "passaro"] },
  { id: "monograma", name: "Monogramas", icon: "✒️", keywords: ["monograma", "letra", "alfabeto", "iniciais"] },
  { id: "religioso", name: "Religioso", icon: "✝️", keywords: ["religioso", "anjo", "cruz", "oracao", "fe"] },
];

const TrendInsights = () => {
  const navigate = useNavigate();
  const [trendData, setTrendData] = useState<Record<string, any[]>>({});
  const [topDownloaded, setTopDownloaded] = useState<any[]>([]);
  const [hotNow, setHotNow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const seasonalTrends = TRENDS.filter((t) => t.seasonal && t.month?.includes(currentMonth));
  const regularTrends = TRENDS.filter((t) => !t.seasonal);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);

      const { data: allKits } = await db
        .from("designs")
        .select("*, categories(name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!allKits) {
        setLoading(false);
        return;
      }

      // Recent downloads only (last 30 days) — limited to avoid loading millions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: allDownloads } = await db
        .from("downloads")
        .select("kit_id, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      const downloadCounts: Record<string, number> = {};
      const recentCounts: Record<string, number> = {};
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      (allDownloads || []).forEach((d: any) => {
        downloadCounts[d.kit_id] = (downloadCounts[d.kit_id] || 0) + 1;
        if (new Date(d.created_at) >= sevenDaysAgo) {
          recentCounts[d.kit_id] = (recentCounts[d.kit_id] || 0) + 1;
        }
      });

      // Hot now — top 6 by downloads in last 7 days
      const hotDesigns = [...allKits]
        .map((k) => ({ ...k, recentDownloads: recentCounts[k.id] || 0, downloadCount: downloadCounts[k.id] || 0 }))
        .filter((k) => k.recentDownloads > 0)
        .sort((a, b) => b.recentDownloads - a.recentDownloads)
        .slice(0, 6);
      setHotNow(hotDesigns);

      // Top downloaded all-time
      const sorted = [...allKits]
        .map((k) => ({ ...k, downloadCount: downloadCounts[k.id] || 0 }))
        .sort((a, b) => b.downloadCount - a.downloadCount)
        .slice(0, 6);
      setTopDownloaded(sorted);

      // Seasonal keyword matching
      const trendResults: Record<string, any[]> = {};
      for (const trend of TRENDS) {
        const matches = allKits.filter((kit: any) => {
          const text = `${kit.name} ${kit.tags_text || ""} ${kit.categories?.name || ""}`.toLowerCase();
          return trend.keywords.some((kw) => text.includes(kw));
        });
        trendResults[trend.id] = matches
          .map((k: any) => ({ ...k, downloadCount: downloadCounts[k.id] || 0 }))
          .sort((a: any, b: any) => b.downloadCount - a.downloadCount)
          .slice(0, 4);
      }

      setTrendData(trendResults);
      setLoading(false);
    };

    fetchTrends();
  }, []);

  const TrendSection = ({ trend, designs }: { trend: Trend; designs: any[] }) => {
    if (designs.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{trend.icon}</span>
            <div>
              <h3 className="font-display font-bold">{trend.name}</h3>
              <p className="text-xs text-muted-foreground">{designs.length} design{designs.length !== 1 ? "s" : ""} relacionado{designs.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {trend.seasonal && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" /> Sazonal
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {designs.map((kit: any) => (
            <Card
              key={kit.id}
              className="group cursor-pointer border-border/60 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
              onClick={() => navigate(`/library/${kit.id}`)}
            >
              <div className="aspect-square bg-muted overflow-hidden relative">
                {kit.cover_image ? (
                  <img
                    src={kit.cover_image}
                    alt={kit.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🧵</div>
                )}
                {kit.downloadCount > 0 && (
                  <Badge className="absolute top-1.5 right-1.5 text-[10px] bg-foreground/70 text-background">
                    {kit.downloadCount} ↓
                  </Badge>
                )}
              </div>
              <CardContent className="p-2.5">
                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                  {kit.name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Tendências de Bordado</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Descubra o que está em alta e planeje seus produtos</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Em Alta Agora — real recent trending */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-destructive" />
                <h2 className="font-display font-bold text-lg">Em Alta Agora</h2>
                <Badge variant="destructive" className="text-xs">Últimos 7 dias</Badge>
              </div>
              {hotNow.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {hotNow.map((kit: any, index: number) => (
                    <Card
                      key={kit.id}
                      className="group cursor-pointer border-destructive/20 overflow-hidden hover:shadow-lg hover:border-destructive/40 transition-all"
                      onClick={() => navigate(`/library/${kit.id}`)}
                    >
                      <div className="aspect-square bg-muted overflow-hidden relative">
                        {kit.cover_image ? (
                          <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🧵</div>
                        )}
                        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <Badge className="absolute top-1.5 right-1.5 text-[10px] bg-destructive/80 text-destructive-foreground">
                          {kit.recentDownloads} ↓ 7d
                        </Badge>
                      </div>
                      <CardContent className="p-2.5">
                        <p className="text-xs font-medium truncate group-hover:text-destructive transition-colors">{kit.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-border/60 bg-muted/30">
                  <CardContent className="py-12 text-center">
                    <Flame className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-muted-foreground text-sm">Nenhum download nos últimos 7 dias.</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Baixe designs na biblioteca para gerar tendências reais.</p>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Temas da Temporada — seasonal keyword curation */}
            {seasonalTrends.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-secondary" />
                  <h2 className="font-display font-bold text-lg">Temas da Temporada</h2>
                  <Badge variant="secondary" className="text-xs">Sazonal</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {seasonalTrends.map((trend) => {
                    const designs = trendData[trend.id] || [];
                    if (designs.length === 0) return null;
                    return (
                      <Card key={trend.id} className="border-secondary/30 bg-secondary/5 p-4">
                        <TrendSection trend={trend} designs={designs} />
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Mais Baixados — all-time */}
            {topDownloaded.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="font-display font-bold text-lg">Mais Baixados</h2>
                    <Badge variant="outline" className="text-xs">Todos os tempos</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-1.5 text-primary">
                    Ver todos <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {topDownloaded.map((kit: any, index: number) => (
                    <Card
                      key={kit.id}
                      className="group cursor-pointer border-border/60 overflow-hidden hover:shadow-lg transition-all"
                      onClick={() => navigate(`/library/${kit.id}`)}
                    >
                      <div className="aspect-square bg-muted overflow-hidden relative">
                        {kit.cover_image ? (
                          <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🧵</div>
                        )}
                        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <CardContent className="p-2.5">
                        <p className="text-xs font-medium truncate">{kit.name}</p>
                        <p className="text-[10px] text-muted-foreground">{kit.downloadCount} downloads</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Categorias Populares */}
            <section className="space-y-6">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Categorias Populares
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regularTrends.map((trend) => {
                  const designs = trendData[trend.id] || [];
                  if (designs.length === 0) return null;
                  return (
                    <Card key={trend.id} className="border-border/60 p-4">
                      <TrendSection trend={trend} designs={designs} />
                    </Card>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default TrendInsights;
