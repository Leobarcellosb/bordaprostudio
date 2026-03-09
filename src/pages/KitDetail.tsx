import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Download, ShoppingBag } from "lucide-react";

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
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-xl overflow-hidden">
            {kit.cover_image ? <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-8xl">🧵</div>}
          </div>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-serif font-bold">{kit.name}</h1>
              {kit.categories?.name && <Badge variant="secondary" className="mt-2">{kit.categories.name}</Badge>}
            </div>
            <p className="text-muted-foreground leading-relaxed">{kit.description}</p>
            {tags.length > 0 && <div className="flex flex-wrap gap-2">{tags.map((t: any) => <Badge key={t?.id} variant="outline">{t?.name}</Badge>)}</div>}
            <Card>
              <CardHeader><CardTitle className="text-lg">Arquivos Disponíveis</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {files.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum arquivo disponível.</p> : files.map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div><p className="text-sm font-medium">{file.file_name}</p><p className="text-xs text-muted-foreground">{file.file_format.toUpperCase()} {file.file_size ? `• ${(file.file_size / 1024).toFixed(0)} KB` : ""}</p></div>
                    <Button size="sm" onClick={() => handleDownload(file)}><Download className="h-4 w-4 mr-1" /> Baixar</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        {productIdeas.length > 0 && (
          <div>
            <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Ideias de Produtos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productIdeas.map((idea: any) => (
                <Card key={idea.id}><CardContent className="pt-5">
                  <h3 className="font-medium">{idea.product_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>
                  {idea.suggested_price && <p className="text-primary font-bold mt-2">R$ {Number(idea.suggested_price).toFixed(2)}</p>}
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate(`/sales-generator?kit=${id}&product=${idea.id}`)}>Gerar texto de venda</Button>
                </CardContent></Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default KitDetail;
