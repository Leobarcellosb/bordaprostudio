import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DesignCard } from "@/components/cards/DesignCard";
import { toast } from "sonner";
import { ArrowLeft, Download, Lightbulb, FileType, Sparkles, Layers } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchDesign = async () => {
      if (!id) return;
      const [{ data: designData }, { data: filesData }, { data: ideasData }] = await Promise.all([
        db.from("kits").select("*, categories(name)").eq("id", id).single(),
        db.from("kit_files").select("*").eq("kit_id", id),
        db.from("product_ideas").select("*").eq("design_id", id),
      ]);
      setDesign(designData);
      setFiles(filesData || []);
      setProductIdeas(ideasData || []);
      setLoading(false);
    };
    fetchDesign();
  }, [id]);

  const handleDownload = async (file: any) => {
    setDownloading(file.id);
    if (user && id) {
      await db.from("downloads").insert({ user_id: user.id, design_id: id });
    }
    window.open(file.file_url, "_blank");
    toast.success(`Download de ${file.file_format || file.format} iniciado!`);
    setTimeout(() => setDownloading(null), 1500);
  };

  const handleDownloadAll = async () => {
    for (const file of files) {
      await handleDownload(file);
    }
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
        <p className="text-muted-foreground font-medium">Design não encontrado.</p>
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
            </div>

            {/* Description */}
            {design.description && (
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                {design.description}
              </p>
            )}

            {/* Tags */}
            {(design.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {design.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="font-normal text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

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
                      {files.map((file: any) => (
                        <button
                          key={file.id}
                          onClick={() => handleDownload(file)}
                          className="group/file flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border/60 hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                        >
                          <span className="text-base">{formatIcons[file.file_format] || "📄"}</span>
                          <div className="text-left">
                            <p className="text-xs font-bold">{file.file_format}</p>
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
                      ))}
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
                        Baixar {files[0].file_format}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Ideas section */}
        {productIdeas.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <Lightbulb className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Ideias de Produtos</h2>
                <p className="text-sm text-muted-foreground">
                  Veja o que você pode vender com esse design
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {productIdeas.map((idea: any) => (
                <Card
                  key={idea.id}
                  className="group overflow-hidden border-border/60 hover:shadow-lg hover:border-secondary/20 transition-all duration-300 hover:-translate-y-1"
                >
                  {idea.image_url && (
                    <div className="aspect-video bg-muted overflow-hidden relative">
                      <img
                        src={idea.image_url}
                        alt={idea.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}
                  <CardContent className={`p-4 space-y-3 ${!idea.image_url ? "pt-5" : ""}`}>
                    <div>
                      <h3 className="font-display font-semibold text-sm">{idea.title}</h3>
                      {idea.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                          {idea.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors"
                      onClick={() => navigate(`/sales-generator?design=${id}&product=${idea.id}`)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Gerar texto de venda
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DesignDetail;
