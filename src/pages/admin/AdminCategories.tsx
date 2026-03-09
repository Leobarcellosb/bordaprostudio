import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCat, setNewCat] = useState("");

  const fetchData = async () => {
    const { data: cats } = await db.from("categories").select("*").order("name");
    setCategories(cats || []);
  };

  useEffect(() => { fetchData(); }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const { error } = await db.from("categories").insert({ name: newCat.trim() });
    if (error) toast.error(error.message); else { toast.success("Categoria adicionada!"); setNewCat(""); fetchData(); }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await db.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Categoria excluída!"); fetchData(); }
  };

  return (
    <div className="space-y-8 mt-4">
      <div>
        <h3 className="font-semibold mb-3">Categorias ({categories.length})</h3>
        <div className="flex gap-2 mb-4">
          <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nova categoria" className="max-w-xs" onKeyDown={e => e.key === "Enter" && addCategory()} />
          <Button onClick={addCategory}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">{categories.map((c: any) => (
          <Card key={c.id} className="inline-flex"><CardContent className="py-2 px-3 flex items-center gap-2">
            <span className="text-sm">{c.name}</span>
            <span className="text-xs text-muted-foreground">({c.slug})</span>
            <button onClick={() => deleteCategory(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
          </CardContent></Card>
        ))}</div>
      </div>
    </div>
  );
};
