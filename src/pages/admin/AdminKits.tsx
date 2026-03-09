import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const AdminKits = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", cover_image: "", category_id: "", is_published: false });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchData = async () => {
    const [{ data: kitsData }, { data: catsData }, { data: tagsData }] = await Promise.all([
      supabase.from("kits").select("*, categories(name), kit_tags(tag_id, tags(name))").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("tags").select("*").order("name"),
    ]);
    setKits(kitsData || []);
    setCategories(catsData || []);
    setTags(tagsData || []);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", cover_image: "", category_id: "", is_published: false });
    setSelectedTags([]);
    setDialogOpen(true);
  };

  const openEdit = (kit: any) => {
    setEditing(kit);
    setForm({ name: kit.name, description: kit.description || "", cover_image: kit.cover_image || "", category_id: kit.category_id || "", is_published: kit.is_published });
    setSelectedTags((kit.kit_tags || []).map((kt: any) => kt.tag_id));
    setDialogOpen(true);
  };

  const saveKit = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = { ...form, category_id: form.category_id || null };

    let kitId: string;
    if (editing) {
      const { error } = await supabase.from("kits").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      kitId = editing.id;
    } else {
      const { data, error } = await supabase.from("kits").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      kitId = data.id;
    }

    // Sync tags
    await supabase.from("kit_tags").delete().eq("kit_id", kitId);
    if (selectedTags.length > 0) {
      await supabase.from("kit_tags").insert(selectedTags.map(tagId => ({ kit_id: kitId, tag_id: tagId })));
    }

    toast.success(editing ? "Design atualizado!" : "Design criado!");
    setDialogOpen(false);
    fetchData();
  };

  const deleteKit = async (id: string) => {
    const { error } = await supabase.from("kits").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Design excluído!"); fetchData(); }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Designs ({kits.length})</h3>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Design</Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.map(kit => (
              <TableRow key={kit.id}>
                <TableCell className="font-medium">{kit.name}</TableCell>
                <TableCell>{kit.categories?.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={kit.is_published ? "default" : "secondary"}>
                    {kit.is_published ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(kit)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteKit(kit.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Design" : "Novo Design"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL da imagem de capa</label>
              <Input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <Badge
                    key={t.id}
                    variant={selectedTags.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
              <label className="text-sm">Publicado</label>
            </div>
            <Button onClick={saveKit} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
