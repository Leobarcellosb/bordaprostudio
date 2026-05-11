import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductIdeaCard } from "@/components/cards/ProductIdeaCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lightbulb, Trash2 } from "lucide-react";

const ProductIdeasPage = () => {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchIdeas = () => {
    db.from("product_ideas")
      .select("*, designs(id, name, cover_image)")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setIdeas(data || []))
      .catch((err) => console.error("[ProductIdeasPage] load error:", err));
  };

  useEffect(() => { fetchIdeas(); }, []);

  const deleteIdea = async (id: string) => {
    const { error } = await db.from("product_ideas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ideia removida!"); setIdeas(prev => prev.filter(i => i.id !== id)); }
    setDeleteTarget(null);
  };

  const clearAll = async () => {
    if (!user) return;
    const { error } = await db.from("product_ideas").delete().eq("user_id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Todas as ideias foram removidas!"); setIdeas([]); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Ideias de Produto</h1>
            <p className="text-muted-foreground mt-1">Descubra o que vender com seus bordados</p>
          </div>
          {ideas.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="h-3.5 w-3.5" /> Limpar todas as ideias
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">Limpar todas as ideias?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir todas as ideias de produto? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {ideas.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma ideia de produto disponível.</p>
              <p className="text-sm mt-1">Abra um design na biblioteca para gerar ideias automaticamente.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea: any) => (
              <ProductIdeaCard
                key={idea.id}
                name={idea.title}
                description={idea.description}
                imageUrl={idea.image_url}
                priceRange={idea.price_range}
                profitExample={idea.profit_example}
                
                
                onDelete={() => setDeleteTarget(idea.id)}
              />
            ))}
          </div>
        )}

        {/* Single idea delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Excluir ideia?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta ideia de produto?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && deleteIdea(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default ProductIdeasPage;
