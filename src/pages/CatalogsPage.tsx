import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen } from "lucide-react";

const CatalogsPage = () => {
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCatalogs = async () => {
    if (!user) return;
    const { data } = await supabase.from("catalogs").select("*, catalog_items(*, kits(*), product_ideas(*))").eq("user_id", user.id).order("created_at", { ascending: false });
    setCatalogs(data || []);
  };

  useEffect(() => { fetchCatalogs(); }, [user]);

  const createCatalog = async () => {
    if (!user || !newName.trim()) return;
    const { error } = await supabase.from("catalogs").insert({ user_id: user.id, name: newName.trim(), description: newDesc.trim() || null });
    if (error) toast.error(error.message);
    else { toast.success("Catálogo criado!"); setNewName(""); setNewDesc(""); setDialogOpen(false); fetchCatalogs(); }
  };

  const deleteCatalog = async (id: string) => {
    const { error } = await supabase.from("catalogs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Catálogo excluído!"); fetchCatalogs(); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Meus Catálogos</h1>
            <p className="text-muted-foreground mt-1">Organize seus produtos para venda</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo Catálogo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Catálogo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do catálogo" />
                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição (opcional)" />
                <Button onClick={createCatalog} className="w-full">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {catalogs.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum catálogo criado ainda.</p>
            <p className="text-sm mt-1">Crie seu primeiro catálogo para organizar seus produtos!</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogs.map(cat => (
              <Card key={cat.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{cat.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => deleteCatalog(cat.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {cat.description && <p className="text-sm text-muted-foreground mb-2">{cat.description}</p>}
                  <p className="text-sm"><strong>{cat.catalog_items?.length || 0}</strong> itens</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(cat.created_at).toLocaleDateString("pt-BR")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CatalogsPage;
