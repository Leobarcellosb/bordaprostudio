import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, FolderOpen, Check, Loader2 } from "lucide-react";

interface AddToCatalogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designId: string;
}

export const AddToCatalogModal = ({ open, onOpenChange, designId }: AddToCatalogModalProps) => {
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchCatalogs = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await db
      .from("catalogs")
      .select("*, catalog_items(design_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCatalogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchCatalogs();
  }, [open, user]);

  const createCatalog = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data, error } = await db
      .from("catalogs")
      .insert({ user_id: user.id, name: newName.trim() })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Catálogo criado!");
      setNewName("");
      setShowCreate(false);
      await fetchCatalogs();
    }
    setCreating(false);
  };

  const addToCatalog = async (catalogId: string) => {
    setAdding(catalogId);
    const { error } = await db
      .from("catalog_items")
      .insert({ catalog_id: catalogId, design_id: designId });
    if (error) {
      if (error.code === "23505") {
        toast.info("Matriz já está neste catálogo");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Matriz adicionada ao catálogo!");
      await fetchCatalogs();
    }
    setAdding(null);
  };

  const isInCatalog = (catalog: any) =>
    (catalog.catalog_items || []).some((item: any) => item.design_id === designId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar ao Catálogo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : catalogs.length === 0 && !showCreate ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum catálogo criado. Crie um abaixo!
            </p>
          ) : (
            catalogs.map((cat) => {
              const alreadyIn = isInCatalog(cat);
              return (
                <button
                  key={cat.id}
                  disabled={alreadyIn || adding === cat.id}
                  onClick={() => addToCatalog(cat.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    alreadyIn
                      ? "border-primary/30 bg-primary/5 cursor-default"
                      : "border-border/60 hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
                  {alreadyIn ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : adding === cat.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {showCreate ? (
          <div className="flex gap-2 pt-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do catálogo"
              onKeyDown={(e) => e.key === "Enter" && createCatalog()}
              autoFocus
            />
            <Button onClick={createCatalog} disabled={creating || !newName.trim()} size="sm">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowCreate(true)} className="w-full gap-1.5 mt-1">
            <Plus className="h-4 w-4" /> Novo Catálogo
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
