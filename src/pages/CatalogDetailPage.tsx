import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Trash2, BookOpen, FileImage } from "lucide-react";

const CatalogDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: catData }, { data: itemsData }] = await Promise.all([
        db.from("catalogs").select("*").eq("id", id).eq("user_id", user.id).single(),
        db.from("catalog_items").select("*, designs(*, categories(name))").eq("catalog_id", id).order("created_at", { ascending: false }),
      ]);
      setCatalog(catData);
      setItems(itemsData || []);
    } catch (err) {
      console.error("[CatalogDetail] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id, user]);

  const removeItem = async (itemId: string) => {
    const { error } = await db.from("catalog_items").delete().eq("id", itemId);
    if (error) toast.error(error.message);
    else { toast.success("Matriz removida do catálogo!"); fetchData(); }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </AppLayout>
  );

  if (!catalog) return (
    <AppLayout>
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground font-medium">Catálogo não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/catalogs")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar aos catálogos
        </Button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <button
            onClick={() => navigate("/catalogs")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-4"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Voltar aos catálogos
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">{catalog.name}</h1>
              <p className="text-muted-foreground mt-1">{items.length} {items.length !== 1 ? "matrizes" : "matriz"}</p>
            </div>
            {items.length > 0 && (
              <Button onClick={() => navigate(`/catalogs/${id}/generate`)} className="gap-2">
                <FileImage className="h-4 w-4" /> Gerar Catálogo
              </Button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Este catálogo ainda não possui matrizes.</p>
              <p className="text-sm mt-1">Adicione matrizes da biblioteca usando o botão "Adicionar ao catálogo".</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item: any) => {
              const design = item.designs;
              if (!design) return null;
              return (
                <Card key={item.id} className="group overflow-hidden border-border/60 hover:shadow-lg transition-all duration-300">
                  <div
                    className="aspect-square bg-muted overflow-hidden relative cursor-pointer"
                    onClick={() => navigate(`/library/${design.id}`)}
                  >
                    {design.cover_image ? (
                      <img src={design.cover_image} alt={design.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent">
                        <span className="text-4xl opacity-30">🖼️</span>
                      </div>
                    )}
                    {design.categories?.name && (
                      <div className="absolute top-2.5 left-2.5">
                        <Badge className="bg-background/90 backdrop-blur-sm text-foreground border-border/40 text-[10px] font-semibold shadow-sm">
                          {design.categories.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-display font-semibold text-sm leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/library/${design.id}`)}
                      >
                        {design.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-7 w-7 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CatalogDetailPage;
