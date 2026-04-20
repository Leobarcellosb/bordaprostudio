import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { DesignCard } from "@/components/cards/DesignCard";
import { SmartDownloadPanel } from "@/components/SmartDownloadPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

const KitDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kit, setKit] = useState<any>(null);
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data: kitData } = await db.from("kits").select("*").eq("id", id).single();
        if (cancelled) return;
        if (!kitData) return;
        setKit(kitData);

        const { data: relations } = await db
          .from("kit_designs")
          .select("design_id, order_index")
          .eq("kit_id", id)
          .order("order_index", { ascending: true });
        if (cancelled) return;

        if (relations && relations.length > 0) {
          const designIds = relations.map((r: any) => r.design_id);
          const { data: designRows } = await db
            .from("designs")
            .select("*, categories(name)")
            .in("id", designIds)
            .eq("is_published", true);
          if (cancelled) return;

          const designMap = Object.fromEntries((designRows || []).map((d: any) => [d.id, d]));
          const ordered = relations
            .map((r: any) => designMap[r.design_id])
            .filter(Boolean);
          setDesigns(ordered);
        }
      } catch (err) {
        console.error("[KitDetail] fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDownloadAll = async () => {
    if (!user) return;
    setDownloading(true);

    try {
      const designIds = designs.map((d: any) => d.id);
      const { data: files } = await db
        .from("kit_arquivos")
        .select("*")
        .in("design_id", designIds);

      if (!files || files.length === 0) {
        toast.error("Nenhum arquivo encontrado neste kit.");
        setDownloading(false);
        return;
      }

      const zip = new JSZip();

      for (const file of files) {
        try {
          const response = await fetch(file.file_url);
          const blob = await response.blob();
          zip.file(file.file_name, blob);
        } catch {
          console.warn(`Failed to fetch ${file.file_name}`);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kit.slug || kit.name.replace(/\s+/g, "-").toLowerCase()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // Record downloads
      for (const d of designs) {
        await db.from("downloads").insert({ kit_id: d.id, user_id: user.id });
      }

      toast.success("Kit baixado com sucesso!");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Erro ao baixar o kit.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!kit) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Kit não encontrado.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>

          <div className="flex flex-col md:flex-row gap-6">
            {kit.cover_image && (
              <div className="w-full md:w-72 aspect-video rounded-xl overflow-hidden bg-muted shrink-0">
                <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">{kit.name}</h1>
              {kit.description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{kit.description}</p>
              )}
              <div className="flex items-center gap-3 mt-4">
                <Badge variant="outline" className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> {designs.length} matrizes
                </Badge>
                <Button onClick={handleDownloadAll} disabled={downloading || designs.length === 0} className="gap-2">
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Baixar Tudo
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Designs grid */}
        {designs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhuma matriz neste kit ainda.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {designs.map((d: any) => (
              <DesignCard
                key={d.id}
                id={d.id}
                name={d.name}
                coverImage={d.cover_image}
                category={d.categories?.name}
                tags={[]}
                onClick={() => navigate(`/library/${d.id}`)}
              />
            ))}
          </div>
        )}

        {/* Smart Download for kit */}
        {designs.length > 0 && (
          <SmartDownloadPanel designIds={designs.map((d: any) => d.id)} title="Download Inteligente do Kit" />
        )}
      </div>
    </AppLayout>
  );
};

export default KitDetailPage;
