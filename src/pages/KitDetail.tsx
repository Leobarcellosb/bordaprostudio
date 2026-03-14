import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartDownloadPanel } from "@/components/SmartDownloadPanel";
import { Badge } from "@/components/ui/badge";
import { DesignCard } from "@/components/cards/DesignCard";
import { ProductIdeaCard } from "@/components/cards/ProductIdeaCard";
import { AddToCatalogModal } from "@/components/AddToCatalogModal";
import { generateTagsFromName } from "@/lib/generateTags";
import { toast } from "sonner";
import { ArrowLeft, Download, Lightbulb, FileType, Layers, Loader2, Heart, BookOpen, Plus, X, Sparkles, Tag } from "lucide-react";

const formatIcons: Record<string, string> = {
  PES: "🪡", EXP: "📐", DST: "🧵", JEF: "✂️", XXX: "📎",
};

const DesignDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [design, setDesign] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [productIdeas, setProductIdeas] = useState<any[]>([]);
  const [relatedDesigns, setRelatedDesigns] = useState<any[]>([]);
  const [downloadCount, setDownloadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  useEffect(() => {
    const fetchDesign = async () => {
      if (!id) return;
      const [{ data: designData }, { data: filesData }, { data: ideasData }, { count: dlCount }] = await Promise.all([
        db.from("designs").select("*, categories(name)").eq("id", id).single(),
        db.from("kit_arquivos").select("*").eq("design_id", id),
        db.from("product_ideas").select("*").eq("design_id", id),
        db.from("downloads").select("*", { count: "exact", head: true }).eq("kit_id", id),
      ]);
      setDesign(designData);
      setFiles(filesData || []);
      setProductIdeas(ideasData || []);
      setDownloadCount(dlCount || 0);

      // Auto-generate product ideas if none exist
      if (designData && (!ideasData || ideasData.length === 0)) {
        setGeneratingIdeas(true);
        try {
          const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-product-ideas", {
            body: {
              designName: designData.name,
              category: designData.categories?.name || "",
              tags: designData.tags_text || "",
              description: designData.description || "",
            },
          });
          if (!aiError && aiData?.ideas) {
            const ideasToSave = aiData.ideas.map((idea: any) => ({
              title: idea.title,
              description: idea.description,
              price_range: idea.price_range || null,
              profit_example: idea.profit_example || null,
              design_id: id,
              user_id: user?.id || null,
            }));

            // Save to database
            const { data: savedIdeas } = await db
              .from("product_ideas")
              .insert(ideasToSave)
              .select();

            if (savedIdeas) {
              setProductIdeas(savedIdeas);
            } else {
              // Fallback to in-memory display
              setProductIdeas(aiData.ideas.map((idea: any, i: number) => ({
                id: `ai-${i}`,
                title: idea.title,
                description: idea.description,
                price_range: idea.price_range,
                profit_example: idea.profit_example,
              })));
            }
          }
        } catch (e) {
          console.error("Failed to generate product ideas:", e);
        }
        setGeneratingIdeas(false);
      }

      // Fetch related designs by same category or overlapping tags
      if (designData) {
        let query = db.from("designs").select("*, categories(name)").eq("is_published", true).neq("id", id).limit(6);
        if (designData.category_id) {
          query = query.eq("category_id", designData.category_id);
        }
        const { data: relatedData } = await query;
        let related = relatedData || [];

        // Sort by tag overlap
        const parseTags = (text: string) => (text || "").split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
        const designTags = parseTags(designData.tags_text);
        if (designTags.length > 0) {
          related.sort((a: any, b: any) => {
            const aOverlap = parseTags(a.tags_text).filter((t: string) => designTags.includes(t)).length;
            const bOverlap = parseTags(b.tags_text).filter((t: string) => designTags.includes(t)).length;
            return bOverlap - aOverlap;
          });
        }
        setRelatedDesigns(related.slice(0, 6));
      }

      // Track view
      if (user && id) {
        db.from("views").insert({ user_id: user.id, kit_id: id }).then(() => {});
        
        // Check if design is favorited
        const { data: favData } = await db
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("kit_id", id)
          .maybeSingle();
        setIsFavorite(!!favData);
      }

      setLoading(false);
    };
    fetchDesign();
  }, [id, user]);

  const trackAndDownload = async (url: string, label: string) => {
    if (user && id) {
      await db.from("downloads").insert({ user_id: user.id, kit_id: id });
      setDownloadCount(prev => prev + 1);
      // Dispatch webhook (non-blocking)
      import("@/lib/webhooks").then(({ dispatchWebhook }) => {
        dispatchWebhook({ event_name: "design_downloaded", user_email: user.email || undefined, user_id: user.id, design_id: id });
      });
    }
    window.open(url, "_blank");
    toast.success(`Download de ${label} iniciado!`);
  };

  const handleDownload = async (file: any) => {
    setDownloading(file.id);
    await trackAndDownload(file.file_url, file.format || file.file_format);
    setTimeout(() => setDownloading(null), 1500);
  };

  const handleDownloadZip = async () => {
    if (!design?.zip_url) return;
    setDownloading("zip");
    await trackAndDownload(design.zip_url, "ZIP");
    setTimeout(() => setDownloading(null), 1500);
  };

  const handleDownloadAll = async () => {
    for (const file of files) {
      await handleDownload(file);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !id) {
      toast.error("Faça login para salvar favoritos");
      return;
    }
    setTogglingFavorite(true);
    try {
      if (isFavorite) {
        await db.from("favorites").delete().eq("user_id", user.id).eq("kit_id", id);
        setIsFavorite(false);
        toast.success("Removido dos favoritos");
      } else {
        await db.from("favorites").insert({ user_id: user.id, kit_id: id });
        setIsFavorite(true);
        toast.success("Adicionado aos favoritos!");
      }
    } catch (e) {
      toast.error("Erro ao atualizar favoritos");
    }
    setTogglingFavorite(false);
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </AppLayout>
  );

  if (!design) return (
    <AppLayout>
      <div className="text-center py-20 space-y-4">
        <p className="text-6xl">🧵</p>
        <p className="text-muted-foreground font-medium">Matriz não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/library")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar à biblioteca
        </Button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-10 animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar para a biblioteca
        </button>

        {/* Hero section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Large preview image */}
          <div className="lg:col-span-3">
            <div className="aspect-[4/3] bg-muted rounded-2xl overflow-hidden border border-border/60 shadow-sm">
              {design.cover_image ? (
                <img
                  src={design.cover_image}
                  alt={design.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-accent">
                  <span className="text-8xl">🧵</span>
                </div>
              )}
            </div>
          </div>

          {/* Design info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title + category */}
            <div>
              {design.categories?.name && (
                <Badge variant="secondary" className="mb-2.5 text-xs font-semibold">
                  {design.categories.name}
                </Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight">
                {design.name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                {downloadCount > 0 && (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Download className="h-3.5 w-3.5" />
                    {downloadCount} download{downloadCount !== 1 ? "s" : ""}
                  </div>
                )}
                <Button
                  variant={isFavorite ? "default" : "outline"}
                  size="sm"
                  onClick={toggleFavorite}
                  disabled={togglingFavorite}
                  className={`gap-1.5 ${isFavorite ? "bg-destructive hover:bg-destructive/90" : ""}`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                  {isFavorite ? "Favoritado" : "Favoritar"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCatalogModalOpen(true)}
                  className="gap-1.5"
                >
                  <BookOpen className="h-4 w-4" />
                  Adicionar ao catálogo
                </Button>
              </div>
            </div>

            {/* Description */}
            {design.description && (
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                {design.description}
              </p>
            )}

            {/* Editable Tags */}
            <DesignTagsEditor
              designId={id!}
              designName={design.name}
              initialTags={design.tags_text}
            />

            {/* Available formats */}
            <Card className="border-border/60 bg-muted/30">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <FileType className="h-4 w-4 text-primary" />
                  Formatos Disponíveis
                  {files.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {files.length} arquivo{files.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum arquivo disponível.</p>
                ) : (
                  <>
                    {/* Format chips */}
                    <div className="flex flex-wrap gap-2 pb-2">
                      {files.map((file: any) => {
                        const format = file.format || file.file_format;
                        return (
                          <button
                            key={file.id}
                            onClick={() => handleDownload(file)}
                            className="group/file flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border/60 hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                          >
                            <span className="text-base">{formatIcons[format] || "📄"}</span>
                            <div className="text-left">
                              <p className="text-xs font-bold">{format}</p>
                              {file.size && (
                                <p className="text-[10px] text-muted-foreground">
                                  {file.size > 1048576
                                    ? `${(file.size / 1048576).toFixed(1)} MB`
                                    : `${(file.size / 1024).toFixed(0)} KB`}
                                </p>
                              )}
                            </div>
                            <Download className={`h-3.5 w-3.5 text-muted-foreground group-hover/file:text-primary transition-colors ${downloading === file.id ? "animate-bounce" : ""}`} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Download all button */}
                    {files.length > 1 && (
                      <Button onClick={handleDownloadAll} className="w-full gap-2">
                        <Download className="h-4 w-4" />
                        Baixar todos os formatos
                      </Button>
                    )}

                    {files.length === 1 && (
                      <Button onClick={() => handleDownload(files[0])} className="w-full gap-2">
                        <Download className="h-4 w-4" />
                        Baixar {files[0].format || files[0].file_format}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* ZIP download */}
            {design.zip_url && (
              <Button onClick={handleDownloadZip} className="w-full gap-2" size="lg" disabled={downloading === "zip"}>
                <Download className={`h-4 w-4 ${downloading === "zip" ? "animate-bounce" : ""}`} />
                {downloading === "zip" ? "Baixando..." : "Baixar Matriz (ZIP)"}
              </Button>
            )}

            {/* Smart Download */}
            {id && (
              <SmartDownloadPanel designIds={[id]} title="Download Inteligente" />
            )}
          </div>
        </div>

        {/* Product Ideas section */}
        {(productIdeas.length > 0 || generatingIdeas) && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <Lightbulb className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Ideias de Produtos</h2>
                <p className="text-sm text-muted-foreground">
                  {generatingIdeas ? "Gerando sugestões com IA..." : "Veja o que você pode vender com essa matriz"}
                </p>
              </div>
              {generatingIdeas && <Loader2 className="h-5 w-5 animate-spin text-secondary ml-auto" />}
            </div>

            {generatingIdeas ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="border-border/60 animate-pulse">
                    <CardContent className="p-5 space-y-3">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-4/5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {productIdeas.map((idea: any) => (
                <ProductIdeaCard
                  key={idea.id}
                  name={idea.title}
                  description={idea.description}
                  imageUrl={idea.image_url}
                  priceRange={idea.price_range}
                  profitExample={idea.profit_example}
                  
                  
                />
              ))}
            </div>
            )}
          </div>
        )}

        {/* Related Designs */}
        {relatedDesigns.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                 <h2 className="text-xl font-display font-bold">Matrizes Relacionadas</h2>
                 <p className="text-sm text-muted-foreground">
                   Outras matrizes que podem te interessar
                 </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedDesigns.map((related: any) => (
                <DesignCard
                  key={related.id}
                  name={related.name}
                  coverImage={related.cover_image}
                  category={related.categories?.name}
                  tags={(related.tags_text || "").split(",").map((t: string) => t.trim()).filter(Boolean)}
                  onClick={() => navigate(`/library/${related.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {id && (
          <AddToCatalogModal
            open={catalogModalOpen}
            onOpenChange={setCatalogModalOpen}
            designId={id}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default DesignDetail;
