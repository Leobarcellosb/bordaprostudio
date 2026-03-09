import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DesignCard } from "@/components/cards/DesignCard";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { Library, Download, Crown, TrendingUp, Sparkles, Clock, ArrowRight, Flame, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Seeded random for consistent "today's picks"
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const Dashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [newestDesigns, setNewestDesigns] = useState<any[]>([]);
  const [mostDownloaded, setMostDownloaded] = useState<any[]>([]);
  const [trendingDesigns, setTrendingDesigns] = useState<any[]>([]);
  const [suggestedDesigns, setSuggestedDesigns] = useState<any[]>([]);
  const [favoriteDesigns, setFavoriteDesigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ designs: 0, downloads: 0, views: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch newest designs (kits)
        const { data: kits } = await db
          .from("designs")
          .select("*, categories(name)")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(6);
        setNewestDesigns(kits || []);

        // Fetch all downloads for stats
        const { data: allDownloads } = await db.from("downloads").select("kit_id, downloaded_at");
        
        // Calculate 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Split into recent (trending) and all-time
        const recentDownloads = (allDownloads || []).filter((d: any) => new Date(d.downloaded_at) > sevenDaysAgo);
        
        // Most downloaded (all time)
        if (allDownloads && allDownloads.length > 0) {
          const countMap: Record<string, number> = {};
          allDownloads.forEach((d: any) => {
            countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1;
          });

          const sortedIds = Object.entries(countMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

          if (sortedIds.length > 0) {
            const { data: topKits } = await db
              .from("designs")
              .select("*, categories(name)")
              .in("id", sortedIds.map(([id]) => id))
              .eq("is_published", true);

            const kitMap = Object.fromEntries((topKits || []).map((k: any) => [k.id, k]));
            const sorted = sortedIds
              .map(([id, count]) => ({ ...kitMap[id], downloadCount: count }))
              .filter((k) => k.id);
            setMostDownloaded(sorted);
          }
        }

        // Trending (last 7 days)
        if (recentDownloads.length > 0) {
          const trendingMap: Record<string, number> = {};
          recentDownloads.forEach((d: any) => {
            trendingMap[d.kit_id] = (trendingMap[d.kit_id] || 0) + 1;
          });

          const trendingIds = Object.entries(trendingMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

          if (trendingIds.length > 0) {
            const { data: trendingKits } = await db
              .from("designs")
              .select("*, categories(name)")
              .in("id", trendingIds.map(([id]) => id))
              .eq("is_published", true);

            const kitMap = Object.fromEntries((trendingKits || []).map((k: any) => [k.id, k]));
            const sorted = trendingIds
              .map(([id, count]) => ({ ...kitMap[id], downloadCount: count }))
              .filter((k) => k.id);
            setTrendingDesigns(sorted);
          }
        }

        // Suggested for today - seeded random based on date
        const { data: allKits } = await db
          .from("designs")
          .select("*, categories(name)")
          .eq("is_published", true);

        if (allKits && allKits.length > 0) {
          const today = new Date();
          const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
          const shuffled = [...allKits].sort(() => seededRandom(seed) - 0.5);
          setSuggestedDesigns(shuffled.slice(0, 4));
        }

        // Fetch user favorites
        if (user) {
          const { data: userFavorites } = await db
            .from("favorites")
            .select("kit_id")
            .eq("user_id", user.id);

          if (userFavorites && userFavorites.length > 0) {
            const favKitIds = userFavorites.map((f: any) => f.kit_id);
            const { data: favKits } = await db
              .from("designs")
              .select("*, categories(name)")
              .in("id", favKitIds)
              .eq("is_published", true);
            setFavoriteDesigns(favKits || []);
          }
        }

        // Stats
        if (user) {
          const { count: dlCount } = await db
            .from("downloads")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          setStats((prev) => ({ ...prev, downloads: dlCount || 0 }));
        }
        const { count: designCount } = await db
          .from("designs")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true);
        setStats((prev) => ({ ...prev, designs: designCount || 0 }));
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const DesignGrid = ({ designs, emptyMsg }: { designs: any[]; emptyMsg: string }) => {
    if (designs.length === 0) {
      return (
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            {emptyMsg}
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {designs.map((kit: any) => (
          <DesignCard
            key={kit.id}
            name={kit.name}
            coverImage={kit.cover_image}
            category={kit.categories?.name}
            tags={[]}
            downloadCount={kit.downloadCount}
            onClick={() => navigate(`/library/${kit.id}`)}
          />
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-12 animate-fade-in">
        {/* Welcome header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8 md:p-10 lg:p-12">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight">
              Olá, {profile?.full_name || profile?.name || "Bordadeira"} 👋
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm md:text-base leading-relaxed">
              Explore novas matrizes, descubra tendências e transforme seus bordados em produtos incríveis.
            </p>
            <Button onClick={() => navigate("/library")} className="mt-5 gap-2">
              <Library className="h-4 w-4" />
              Explorar Biblioteca
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-15 blur-3xl bg-primary rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="border-border/60 hover:shadow-md transition-shadow group">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent group-hover:bg-primary/10 transition-colors">
                <Library className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats.designs}</p>
                <p className="text-sm text-muted-foreground">Matrizes disponíveis</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 hover:shadow-md transition-shadow group">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                <Download className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats.downloads}</p>
                <p className="text-sm text-muted-foreground">Seus downloads</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 hover:shadow-md transition-shadow group">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent group-hover:bg-primary/10 transition-colors">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold capitalize">{profile?.plan || "Basic"}</p>
                <p className="text-sm text-muted-foreground">Seu plano</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Favorites section */}
        {favoriteDesigns.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10">
                  <Heart className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold">Seus Favoritos</h2>
                  <p className="text-sm text-muted-foreground">Matrizes que você salvou</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs gap-1">
                <Heart className="h-3 w-3" /> {favoriteDesigns.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {favoriteDesigns.map((kit: any) => (
                <DesignCard
                  key={kit.id}
                  name={kit.name}
                  coverImage={kit.cover_image}
                  category={kit.categories?.name}
                  tags={[]}
                  onClick={() => navigate(`/library/${kit.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Suggested for today */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <Sparkles className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold">Sugestões do Dia</h2>
                <p className="text-sm text-muted-foreground">Selecionados especialmente para você</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
            </Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedDesigns.map((kit: any) => (
              <Card
                key={kit.id}
                className="group cursor-pointer border-border/60 overflow-hidden hover:shadow-lg hover:border-secondary/40 transition-all"
                onClick={() => navigate(`/library/${kit.id}`)}
              >
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {kit.cover_image ? (
                    <img
                      src={kit.cover_image}
                      alt={kit.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🧵</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-primary-foreground text-sm font-medium truncate drop-shadow-lg">{kit.name}</p>
                  </div>
                </div>
              </Card>
            ))}
            {suggestedDesigns.length === 0 && !loading && (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                 Nenhuma matriz disponível no momento
              </div>
            )}
          </div>
        </section>

        {/* Newest designs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                 <h2 className="text-lg font-display font-bold">Novas Matrizes</h2>
                 <p className="text-sm text-muted-foreground">Recém adicionadas à biblioteca</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-1.5 text-primary">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <DesignGrid designs={newestDesigns} emptyMsg="Nenhuma matriz disponível no momento." />
        </section>

        {/* Trending (last 7 days) */}
        {trendingDesigns.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10">
                  <Flame className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold">Em Alta</h2>
                  <p className="text-sm text-muted-foreground">Mais baixados nos últimos 7 dias</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">🔥 Em alta</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {trendingDesigns.map((kit: any, index: number) => (
                <Card
                  key={kit.id}
                  className="group cursor-pointer border-border/60 overflow-hidden hover:shadow-lg hover:border-destructive/30 transition-all"
                  onClick={() => navigate(`/library/${kit.id}`)}
                >
                  <div className="relative">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {kit.cover_image ? (
                        <img
                          src={kit.cover_image}
                          alt={kit.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🧵</div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-destructive/90 backdrop-blur-sm flex items-center justify-center text-destructive-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground gap-1">
                      <Download className="h-3 w-3" />
                      {kit.downloadCount}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="font-medium text-sm truncate group-hover:text-destructive transition-colors">
                      {kit.name}
                    </p>
                    {kit.categories?.name && (
                      <p className="text-xs text-muted-foreground">{kit.categories.name}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold">Mais Baixados</h2>
                <p className="text-sm text-muted-foreground">As matrizes mais populares da comunidade</p>
              </div>
            </div>
          </div>
          {mostDownloaded.length === 0 ? (
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="py-12 text-center text-muted-foreground">
                Os rankings aparecerão conforme as matrizes forem baixadas.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mostDownloaded.map((kit: any, index: number) => (
                <Card
                  key={kit.id}
                  className="group cursor-pointer border-border/60 overflow-hidden hover:shadow-lg hover:border-secondary/30 transition-all"
                  onClick={() => navigate(`/library/${kit.id}`)}
                >
                  <div className="relative">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {kit.cover_image ? (
                        <img
                          src={kit.cover_image}
                          alt={kit.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🧵</div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-foreground/80 backdrop-blur-sm flex items-center justify-center text-background font-bold text-sm">
                      {index + 1}
                    </div>
                    <Badge className="absolute top-2 right-2 bg-secondary text-secondary-foreground gap-1">
                      <Download className="h-3 w-3" />
                      {kit.downloadCount}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="font-medium text-sm truncate group-hover:text-secondary transition-colors">
                      {kit.name}
                    </p>
                    {kit.categories?.name && (
                      <p className="text-xs text-muted-foreground">{kit.categories.name}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
