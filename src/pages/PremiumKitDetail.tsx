import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { downloadFromStorage, triggerBlobDownload, filenameFromStorageUrl } from "@/lib/storageDownload";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Layers, ShoppingCart, Check, Lock, Package } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartDownloadPanel } from "@/components/SmartDownloadPanel";

const PremiumKitDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [kit, setKit] = useState<any>(null);
  const [kitDesignIds, setKitDesignIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAnnual = subscription?.plan_code === "anual" && subscription?.status === "active";

  useEffect(() => {
    const fetchKit = async () => {
      if (!id) return;
      const [kitRes, designsRes] = await Promise.all([
        db.from("premium_kits").select("*").eq("id", id).single(),
        db.from("premium_kit_designs").select("design_id").eq("premium_kit_id", id),
      ]);
      setKit(kitRes.data);
      setKitDesignIds((designsRes.data || []).map((d: any) => d.design_id));
      setLoading(false);
    };
    fetchKit();
  }, [id]);

  const canDownload = () => {
    if (!kit) return false;
    if (kit.access_rule === "included_in_annual" && isAnnual) return true;
    if (kit.access_rule === "both" && isAnnual) return true;
    return false;
  };

  const handleDownload = async () => {
    if (!kit?.zip_url) {
      toast.error("Arquivo não disponível para download");
      return;
    }
    try {
      const blob = await downloadFromStorage(kit.zip_url);
      triggerBlobDownload(blob, filenameFromStorageUrl(kit.zip_url));
      toast.success("Download iniciado!");
    } catch (err) {
      console.error("[PremiumKitDetail] download error:", err);
      toast.error("Falha ao baixar o arquivo. Verifique sua assinatura.");
    }
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
      <div className="space-y-8 animate-fade-in">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Skeleton className="lg:col-span-3 aspect-[4/3] rounded-2xl" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (!kit) return (
    <AppLayout>
      <div className="text-center py-24 space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <Package className="h-7 w-7 text-muted-foreground/40" />
        </div>
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
      <div className="space-y-8 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Cover */}
          <div className="lg:col-span-3">
            <div className="aspect-[4/3] bg-muted rounded-2xl overflow-hidden border border-border/40 shadow-sm">
              {kit.cover_image ? (
                <img src={kit.cover_image} alt={kit.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/5 via-accent/20 to-secondary/10 flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {(kit.access_rule === "included_in_annual" || kit.access_rule === "both") && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
                    <Check className="h-3 w-3" /> Incluído no Plano Anual
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
            <Card className="border-border/40 bg-muted/20 rounded-xl">
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

        {/* Smart Download */}
        {showDownload && kitDesignIds.length > 0 && (
          <SmartDownloadPanel
            designIds={kitDesignIds}
            title="Download Inteligente do Kit"
          />
        )}
      </div>
    </AppLayout>
  );
};

export default PremiumKitDetail;
