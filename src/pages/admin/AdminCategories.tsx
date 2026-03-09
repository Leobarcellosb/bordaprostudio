import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";

export const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newTag, setNewTag] = useState("");

  const fetchData = async () => {
    const [{ data: cats }, { data: tgs }] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("tags").select("*").order("name"),
    ]);
    setCategories(cats || []);
    setTags(tgs || []);
  };

  useEffect(() => { fetchData(); }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: newCat.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Categoria adicionada!"); setNewCat(""); fetchData(); }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Categoria excluída!"); fetchData(); }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    const { error } = await supabase.from("tags").insert({ name: newTag.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Tag adicionada!"); setNewTag(""); fetchData(); }
  };

  const deleteTag = async (id: string) => {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Tag excluída!"); fetchData(); }
  };

  return (
    <div className="space-y-8 mt-4">
      <div>
        <h3 className="font-semibold mb-3">Categorias ({categories.length})</h3>
        <div className="flex gap-2 mb-4">
          <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nova categoria" className="max-w-xs" onKeyDown={e => e.key === "Enter" && addCategory()} />
          <Button onClick={addCategory}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <Card key={c.id} className="inline-flex">
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <span className="text-sm">{c.name}</span>
                <button onClick={() => deleteCategory(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag className="h-4 w-4" /> Tags ({tags.length})</h3>
        <div className="flex gap-2 mb-4">
          <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag" className="max-w-xs" onKeyDown={e => e.key === "Enter" && addTag()} />
          <Button onClick={addTag}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(t => (
            <Card key={t.id} className="inline-flex">
              <CardContent className="py-2 px-3 flex items-center gap-2">
                <span className="text-sm">{t.name}</span>
                <button onClick={() => deleteTag(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
