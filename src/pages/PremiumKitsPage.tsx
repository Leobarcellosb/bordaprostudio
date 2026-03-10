import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Layers, Check, ShoppingCart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PremiumKitsPage = () => {
  const [kits, setKits] = useState<any[]>([]);
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const isAnnual = subscription?.plan_code === "anual" && subscription?.status === "active";

  useEffect(() => {
    const fetchKits = async () => {
      const { data } = await db.from("premium_kits").select("*").eq("is_published", true).order("created_at", { ascending: false });
      setKits(data || []);
    };
    fetchKits();
  }, []);

  const getAccessBadge = (kit: any) => {
    if (kit.access_rule === "included_in_annual" || kit.access_rule === "both") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
          <Check className="h-3 w-3" /> Incluso no Plano Anual
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <ShoppingCart className="h-3 w-3" /> Compra Avulsa
      </Badge>
    );
  };

  const getAction = (kit: any) => {
    const canAccess = isAnnual && (kit.access_rule === "included_in_annual" || kit.access_rule === "both");
    if (canAccess) {
      return (
        <Button size="sm" className="gap-1.5 w-full" onClick={() => navigate(`/kits/${kit.id}`)}>
          Acessar Kit
        </Button>
      );
    }
    if (kit.access_rule === "purchase_required" || kit.access_rule === "both") {
      return (
        <Button size="sm" variant="secondary" className="gap-1.5 w-full" onClick={() => navigate(`/kits/${kit.id}`)}>
          <ShoppingCart className="h-3.5 w-3.5" />
          {kit.price ? `Comprar • R$ ${Number(kit.price).toFixed(2)}` : "Ver Kit"}
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-accent/30 to-secondary/8 p-8 md:p-10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold tracking-wide uppercase">
                {kits.length} kit{kits.length !== 1 ? "s" : ""} disponíve{kits.length !== 1 ? "is" : "l"}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight">
              Kits Premium
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
              Pacotes exclusivos com centenas de matrizes de bordado organizadas por tema.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-10 blur-3xl bg-primary rounded-full -translate-y-1/3 translate-x-1/3" />
        </div>

        {/* Kits grid */}
        {kits.length === 0 ? (
          <Card className="border-border/30 bg-gradient-to-br from-muted/30 to-accent/20 rounded-2xl">
            <CardContent className="py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Nenhum kit disponível ainda</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Em breve teremos kits premium com centenas de matrizes para você.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kits.map((kit: any) => (
              <Card key={kit.id} className="group overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-video bg-muted overflow-hidden relative">
                  {kit.cover_image ? (
                    <img src={kit.cover_image} alt={kit.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent">
                      <span className="text-5xl">📦</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {getAccessBadge(kit)}
                  </div>
                </div>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold text-lg">{kit.title}</h3>
                  {kit.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{kit.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    {kit.designs_count} matrize{kit.designs_count !== 1 ? "s" : ""}
                  </div>
                  {getAction(kit)}
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
