import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, FolderOpen } from "lucide-react";

const CatalogsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCatalogs = async () => {
    if (!user) return;
    const { data } = await db
      .from("catalogs")
      .select("*, catalog_items(id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCatalogs(data || []);
  };

  useEffect(() => { fetchCatalogs(); }, [user]);

  const createCatalog = async () => {
    if (!user || !newTitle.trim()) return;
    const { error } = await db.from("catalogs").insert({ user_id: user.id, name: newTitle.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Catálogo criado!"); setNewTitle(""); setDialogOpen(false); fetchCatalogs(); }
  };

  const deleteCatalog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await db.from("catalogs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Catálogo excluído!"); fetchCatalogs(); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Meus Catálogos</h1>
            <p className="text-muted-foreground mt-1">Organize seus produtos para venda</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Novo Catálogo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Criar Catálogo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nome do catálogo" />
                <Button onClick={createCatalog} className="w-full">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {catalogs.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum catálogo criado ainda.</p>
              <p className="text-sm mt-1">Crie seu primeiro catálogo para organizar seus produtos!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogs.map((cat: any) => (
              <Card
                key={cat.id}
                className="border-border/60 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/catalogs/${cat.id}`)}
              >
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-display">{cat.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => deleteCatalog(cat.id, e)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm"><strong>{cat.catalog_items?.length || 0}</strong> design{(cat.catalog_items?.length || 0) !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(cat.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
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
