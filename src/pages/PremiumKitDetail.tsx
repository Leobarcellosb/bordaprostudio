import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Layers, ShoppingCart, Check, Lock, Package } from "lucide-react";
import { toast } from "sonner";

const PremiumKitDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [kit, setKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isAnnual = subscription?.plan_code === "anual" && subscription?.status === "active";
  const hasActiveSubscription = subscription?.status === "active";

  useEffect(() => {
    const fetchKit = async () => {
      if (!id) return;
      const { data } = await db.from("premium_kits").select("*").eq("id", id).single();
      setKit(data);
      setLoading(false);
    };
    fetchKit();
  }, [id]);

  const canDownload = () => {
    if (!kit) return false;
    if (kit.access_rule === "included_in_annual" && isAnnual) return true;
    if (kit.access_rule === "both" && isAnnual) return true;
    // For purchase_required, we'd check purchase records - simplified for now
    return false;
  };

  const handleDownload = () => {
    if (!kit?.zip_url) {
      toast.error("Arquivo não disponível para download");
      return;
    }
    window.open(kit.zip_url, "_blank");
    toast.success("Download iniciado!");
  };

  const handlePurchase = () => {
    if (kit?.purchase_url) {
      window.open(kit.purchase_url, "_blank");
    } else {
      toast.info("Link de compra não disponível no momento.");
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </AppLayout>
  );

  if (!kit) return (
    <AppLayout>
      <div className="text-center py-20 space-y-4">
        <p className="text-6xl">📦</p>
        <p className="text-muted-foreground font-medium">Kit não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/kits")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar aos Kits
        </Button>
      </div>
    </AppLayout>
  );

  const showDownload = canDownload();

  return (
    <AppLayout>
      <div className="space-y-10 animate-fade-in">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Cover */}
          <div className="lg:col-span-3">
            <div className="aspect-[4/3] bg-muted rounded-2xl overflow-hidden border border-border/60 shadow-sm">
              {kit.cover_image ? (
                <img src={kit.cover_image} alt={kit.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-accent">
                  <span className="text-8xl">📦</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {(kit.access_rule === "included_in_annual" || kit.access_rule === "both") && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
                    <Check className="h-3 w-3" /> Incluso no Anual
                  </Badge>
                )}
                {(kit.access_rule === "purchase_required" || kit.access_rule === "both") && kit.price && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <ShoppingCart className="h-3 w-3" /> R$ {Number(kit.price).toFixed(2)}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight">{kit.title}</h1>
            </div>

            {kit.description && (
              <p className="text-muted-foreground leading-relaxed text-[15px]">{kit.description}</p>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span className="text-sm font-medium">{kit.designs_count} matrize{kit.designs_count !== 1 ? "s" : ""} incluídas</span>
            </div>

            {/* Access card */}
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="p-5 space-y-4">
                {showDownload ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check className="h-5 w-5" />
                      <span className="font-semibold text-sm">Você tem acesso a este kit!</span>
                    </div>
                    {kit.zip_url && (
                      <Button onClick={handleDownload} className="w-full gap-2" size="lg">
                        <Download className="h-4 w-4" /> Baixar Kit Completo (ZIP)
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="h-5 w-5" />
                      <span className="font-semibold text-sm">
                        {kit.access_rule === "included_in_annual" || kit.access_rule === "both"
                          ? "Disponível no Plano Anual"
                          : "Compra avulsa necessária"}
                      </span>
                    </div>

                    {(kit.access_rule === "included_in_annual" || kit.access_rule === "both") && !isAnnual && (
                      <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/pricing")}>
                        <Package className="h-4 w-4" /> Assinar Plano Anual
                      </Button>
                    )}

                    {(kit.access_rule === "purchase_required" || kit.access_rule === "both") && (
                      <Button className="w-full gap-2" size="lg" onClick={handlePurchase}>
                        <ShoppingCart className="h-4 w-4" />
                        Comprar Kit {kit.price ? `• R$ ${Number(kit.price).toFixed(2)}` : ""}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PremiumKitDetail;
