import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Layers, Check, ShoppingCart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const PremiumKitsPage = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const isAnnual = subscription?.plan_code === "anual" && subscription?.status === "active";

  useEffect(() => {
    let cancelled = false;
    const fetchKits = async () => {
      setLoading(true);
      try {
        const { data } = await db
          .from("premium_kits")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        if (cancelled) return;

        const validKits = (data || []).filter((kit: any) => {
          const title = (kit.title || "").toLowerCase().trim();
          if (!title || title.length < 3) return false;
          if (/^teste?$/i.test(title)) return false;
          if (/^kit\s*teste?$/i.test(title)) return false;
          if (!kit.description || kit.description.trim().length < 5) return false;
          return true;
        });

        setKits(validKits);
      } catch (err) {
        console.error("[PremiumKits] fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchKits();
    return () => {
      cancelled = true;
    };
  }, []);

  const getAccessLabel = (kit: any) => {
    if (kit.access_rule === "included_in_annual" || kit.access_rule === "both") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1 font-medium">
          <Check className="h-3 w-3" /> Incluído no Plano Anual
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
        <ShoppingCart className="h-3 w-3" /> Compra Avulsa
      </Badge>
    );
  };

  const getActionButton = (kit: any) => {
    const canAccess = isAnnual && (kit.access_rule === "included_in_annual" || kit.access_rule === "both");
    if (canAccess) {
      return (
        <Button size="sm" className="gap-1.5 w-full" onClick={() => navigate(`/kits/${kit.id}`)}>
          Ver Kit
        </Button>
      );
    }
    if (kit.access_rule === "purchase_required" || (kit.access_rule === "both" && !isAnnual)) {
      return (
        <Button size="sm" variant="secondary" className="gap-1.5 w-full" onClick={() => navigate(`/kits/${kit.id}`)}>
          <ShoppingCart className="h-3.5 w-3.5" />
          {kit.price ? `Comprar Kit • R$ ${Number(kit.price).toFixed(2)}` : "Comprar Kit"}
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => navigate(`/kits/${kit.id}`)}>
        Ver Kit
      </Button>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8 md:p-10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight">
              Kits Premium
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
              Pacotes exclusivos com coleções completas de matrizes organizadas por tema.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-10 blur-3xl bg-primary rounded-full -translate-y-1/3 translate-x-1/3" />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        ) : kits.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-muted/30 to-accent/10 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-7 w-7 text-primary/40" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">
              Nenhum kit disponível no momento
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Em breve novos kits exclusivos estarão disponíveis para você.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kits.map((kit: any) => (
              <Card
                key={kit.id}
                className="group overflow-hidden border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 rounded-2xl"
              >
                {/* Cover */}
                <div className="aspect-video bg-muted overflow-hidden relative">
                  {kit.cover_image ? (
                    <img
                      src={kit.cover_image}
                      alt={kit.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/5 via-accent/20 to-secondary/10 flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {getAccessLabel(kit)}
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold text-lg leading-snug line-clamp-1">
                    {kit.title}
                  </h3>
                  {kit.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {kit.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{kit.designs_count} matrize{kit.designs_count !== 1 ? "s" : ""}</span>
                  </div>
                  {getActionButton(kit)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PremiumKitsPage;
