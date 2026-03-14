import { useNavigate } from "react-router-dom";
import { useAcervoStats } from "@/hooks/useAcervoStats";
import { useCollectionDetector } from "@/hooks/useCollectionDetector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/home/SectionHeader";
import { BarChart3, Grid3X3, Layers, Package, ArrowRight, Library } from "lucide-react";

function StatBar({ label, count, maxCount }: { label: string; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground/80 truncate">{label}</span>
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function MeuAcervoSection() {
  const navigate = useNavigate();
  const stats = useAcervoStats();
  const { collections, loading: collectionsLoading } = useCollectionDetector();

  if (stats.loading && collectionsLoading) return <LoadingSkeleton />;
  if (stats.totalDesigns === 0 && !stats.loading) return null;

  const maxCatCount = Math.max(...stats.categories.map(c => c.count), 1);
  const maxHoopCount = Math.max(...stats.hoopSizes.map(h => h.count), 1);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Meu Acervo"
        subtitle="Visão geral da sua biblioteca de matrizes"
        icon={<BarChart3 className="h-5 w-5 text-primary" />}
      />

      {/* Total + stats cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total designs */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-1">
            <Library className="h-6 w-6 text-primary mb-1" />
            <span className="text-3xl font-display font-bold text-foreground">
              {stats.loading ? "..." : stats.totalDesigns}
            </span>
            <span className="text-xs text-muted-foreground">matrizes no seu acervo</span>
          </CardContent>
        </Card>

        {/* Category distribution */}
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Categorias</span>
            </div>
            {stats.categories.slice(0, 5).map(c => (
              <StatBar key={c.name} label={c.name} count={c.count} maxCount={maxCatCount} />
            ))}
          </CardContent>
        </Card>

        {/* Hoop size distribution */}
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Tamanhos de Bastidor</span>
            </div>
            {stats.hoopSizes.slice(0, 5).map(h => (
              <StatBar key={h.size} label={h.size} count={h.count} maxCount={maxHoopCount} />
            ))}
          </CardContent>
        </Card>

        {/* Quick summary */}
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Resumo</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categorias</span>
                <span className="font-medium">{stats.categories.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bastidores</span>
                <span className="font-medium">{stats.hoopSizes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kits</span>
                <span className="font-medium">{stats.userKits.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coleções detectadas</span>
                <span className="font-medium">{collections.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detected collections */}
      {collections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80">Coleções Detectadas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {collections.slice(0, 8).map(col => (
              <Card key={col.id} className="border-border/40 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold truncate">{col.name}</h4>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{col.designs.length}</Badge>
                  </div>
                  {/* Mini preview strip */}
                  <div className="flex -space-x-2">
                    {col.designs.slice(0, 4).map(d => (
                      <div key={d.id} className="w-8 h-8 rounded-lg overflow-hidden border-2 border-background bg-muted shrink-0">
                        {d.cover_image ? (
                          <img src={d.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px]">🧵</div>
                        )}
                      </div>
                    ))}
                    {col.designs.length > 4 && (
                      <div className="w-8 h-8 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-medium shrink-0">
                        +{col.designs.length - 4}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 gap-1 text-primary"
                    onClick={() => navigate(`/library?tag=${encodeURIComponent(col.theme.toLowerCase())}`)}
                  >
                    Ver coleção <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* User kits */}
      {stats.userKits.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground/80">Seus Kits</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.userKits.slice(0, 8).map(kit => (
              <Card key={kit.id} className="border-border/40 hover:border-primary/30 transition-colors group cursor-pointer" onClick={() => navigate(`/kits/${kit.id}`)}>
                <div className="aspect-video bg-muted overflow-hidden rounded-t-lg">
                  {kit.coverImage ? (
                    <img src={kit.coverImage} alt={kit.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <h4 className="text-sm font-semibold truncate">{kit.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{kit.designCount} matrizes</span>
                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2 gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Abrir <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
