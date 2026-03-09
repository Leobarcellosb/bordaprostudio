import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductIdeaCard } from "@/components/cards/ProductIdeaCard";
import { toast } from "sonner";
import { ArrowLeft, Download, Lightbulb, FileType } from "lucide-react";

const KitDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kit, setKit] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [productIdeas, setProductIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKit = async () => {
      if (!id) return;
      const [{ data: kitData }, { data: filesData }, { data: tagsData }, { data: ideasData }] = await Promise.all([
        db.from("kits").select("*, categories(name)").eq("id", id).single(),
        db.from("kit_files").select("*").eq("kit_id", id),
        db.from("kit_tags").select("*, tags(*)").eq("kit_id", id),
        db.from("product_ideas").select("*").eq("kit_id", id),
      ]);
      setKit(kitData);
      setFiles(filesData || []);
      setTags((tagsData || []).map((t: any) => t.tags));
      setProductIdeas(ideasData || []);
      setLoading(false);
    };
    fetchKit();
  }, [id]);

  const handleDownload = async (file: any) => {
    if (user && id) {
      await db.from("downloads").insert({ user_id: user.id, kit_id: id });
    }
    window.open(file.file_url, "_blank");
    toast.success(`Download de ${file.file_name} iniciado!`);
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AppLayout>;
  if (!kit) return <AppLayout><div className="text-center py-20 text-muted-foreground">Design não encontrado.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar para a biblioteca
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-2xl overflow-hidden border border-border/60">
            {kit.cover_image ? <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-8xl bg-accent">🧵</div>}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">{kit.name}</h1>
              {kit.categories?.name && <Badge variant="secondary" className="mt-2">{kit.categories.name}</Badge>}
            </div>

            <p className="text-muted-foreground leading-relaxed">{kit.description}</p>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t: any) => <Badge key={t?.id} variant="outline" className="font-normal">{t?.name}</Badge>)}
              </div>
            )}

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <FileType className="h-4 w-4 text-primary" /> Arquivos Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum arquivo disponível.</p>
                ) : files.map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/40">
                    <div>
                      <p className="text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">{file.file_format.toUpperCase()} {file.file_size ? `• ${(file.file_size / 1024).toFixed(0)} KB` : ""}</p>
                    </div>
                    <Button size="sm" onClick={() => handleDownload(file)} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {productIdeas.length > 0 && (
          <div>
            <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" /> Ideias de Produtos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productIdeas.map((idea: any) => (
                <ProductIdeaCard
                  key={idea.id}
                  name={idea.product_name}
                  description={idea.description}
                  suggestedPrice={idea.suggested_price}
                  onGenerate={() => navigate(`/sales-generator?kit=${id}&product=${idea.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default KitDetail;
