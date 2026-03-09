import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const AdminKits = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", preview_image_url: "", category_id: "", is_published: false, tags: "" });

  const fetchData = async () => {
    const [{ data: designsData }, { data: catsData }] = await Promise.all([
      db.from("designs").select("*, categories(name)").order("created_at", { ascending: false }),
      db.from("categories").select("*").order("name"),
    ]);
    setDesigns(designsData || []);
    setCategories(catsData || []);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditing(null); setForm({ title: "", description: "", preview_image_url: "", category_id: "", is_published: false, tags: "" }); setDialogOpen(true); };
  const openEdit = (design: any) => { setEditing(design); setForm({ title: design.title, description: design.description || "", preview_image_url: design.preview_image_url || "", category_id: design.category_id || "", is_published: design.is_published, tags: (design.tags || []).join(", ") }); setDialogOpen(true); };

  const saveDesign = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = { title: form.title, description: form.description || null, preview_image_url: form.preview_image_url || null, category_id: form.category_id || null, is_published: form.is_published, tags };
    if (editing) {
      const { error } = await db.from("designs").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await db.from("designs").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editing ? "Design atualizado!" : "Design criado!");
    setDialogOpen(false);
    fetchData();
  };

  const deleteDesign = async (id: string) => {
    const { error } = await db.from("designs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Design excluído!"); fetchData(); }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Designs ({designs.length})</h3>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Design</Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Categoria</TableHead><TableHead>Tags</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>{designs.map((design: any) => (
            <TableRow key={design.id}>
              <TableCell className="font-medium">{design.title}</TableCell>
              <TableCell>{design.categories?.name || "—"}</TableCell>
              <TableCell><div className="flex flex-wrap gap-1">{(design.tags || []).slice(0, 3).map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div></TableCell>
              <TableCell><Badge variant={design.is_published ? "default" : "secondary"}>{design.is_published ? "Publicado" : "Rascunho"}</Badge></TableCell>
              <TableCell className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(design)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteDesign(design.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Design" : "Novo Design"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Título</label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1 block">Descrição</label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1 block">URL da imagem preview</label><Input value={form.preview_image_url} onChange={e => setForm({ ...form, preview_image_url: e.target.value })} placeholder="https://..." /></div>
            <div><label className="text-sm font-medium mb-1 block">Categoria</label>
              <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-sm font-medium mb-1 block">Tags (separadas por vírgula)</label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="floral, delicado, infantil" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} /><label className="text-sm">Publicado</label></div>
            <Button onClick={saveDesign} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
