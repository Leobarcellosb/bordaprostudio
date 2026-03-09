import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Image, FileArchive, X } from "lucide-react";

const ALL_FORMATS = ["PES", "EXP", "DST", "JEF", "XXX"];

export const AdminKits = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", cover_image: "", category_id: "",
    is_published: false, tags_text: "", zip_url: "", formats: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [{ data: kitsData }, { data: catsData }] = await Promise.all([
      db.from("designs").select("*, categories(name)").order("created_at", { ascending: false }),
      db.from("categories").select("*").order("name"),
    ]);
    setKits(kitsData || []);
    setCategories(catsData || []);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchKitFormats = async (kitId: string): Promise<string[]> => {
    const { data } = await db.from("kit_arquivos").select("format").eq("design_id", kitId);
    return (data || []).map((f: any) => f.format);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", cover_image: "", category_id: "", is_published: false, tags_text: "", zip_url: "", formats: [] });
    setDialogOpen(true);
  };

  const openEdit = async (kit: any) => {
    setEditing(kit);
    const formats = await fetchKitFormats(kit.id);
    setForm({
      name: kit.name,
      description: kit.description || "",
      cover_image: kit.cover_image || "",
      category_id: kit.category_id || "",
      is_published: kit.is_published,
      tags_text: kit.tags_text || "",
      zip_url: kit.zip_url || "",
      formats,
    });
    setDialogOpen(true);
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("kit-covers").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("kit-covers").getPublicUrl(path);
    setForm(prev => ({ ...prev, cover_image: urlData.publicUrl }));
    toast.success("Imagem enviada!");
    setUploading(false);
  };

  const uploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${crypto.randomUUID()}.zip`;
    const { error } = await supabase.storage.from("kit-zips").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("kit-zips").getPublicUrl(path);
    setForm(prev => ({ ...prev, zip_url: urlData.publicUrl }));
    toast.success("Arquivo ZIP enviado!");
    setUploading(false);
  };

  const toggleFormat = (format: string) => {
    setForm(prev => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter(f => f !== format)
        : [...prev.formats, format],
    }));
  };

  const saveKit = async () => {
    if (!form.name.trim()) { toast.error("Título é obrigatório"); return; }
    const tags = form.tags_text.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      description: form.description || null,
      cover_image: form.cover_image || null,
      category_id: form.category_id || null,
      is_published: form.is_published,
      tags_text: form.tags_text,
    };

    let kitId: string;

    if (editing) {
      const { error } = await db.from("designs").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      kitId = editing.id;
    } else {
      const { data, error } = await db.from("designs").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      kitId = data.id;
    }

    // Sync kit_arquivos for selected formats
    await db.from("kit_arquivos").delete().eq("design_id", kitId);
    if (form.formats.length > 0) {
      const fileRows = form.formats.map(f => ({
        design_id: kitId,
        format: f,
        file_name: `${form.name}.${f.toLowerCase()}`,
        file_url: form.zip_url || "",
      }));
      await db.from("kit_arquivos").insert(fileRows);
    }

    toast.success(editing ? "Design atualizado!" : "Design criado!");
    setDialogOpen(false);
    fetchData();
  };

  const deleteKit = async (id: string) => {
    await db.from("kit_files").delete().eq("kit_id", id);
    const { error } = await db.from("designs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Design excluído!"); fetchData(); }
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
              <TableHead>Preview</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.map((kit: any) => (
              <TableRow key={kit.id}>
                <TableCell>
                  {kit.cover_image ? (
                    <img src={kit.cover_image} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-accent flex items-center justify-center text-sm">🧵</div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{kit.name}</TableCell>
                <TableCell>{kit.categories?.name || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(kit.tags_text || "").split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 3).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={kit.is_published ? "default" : "secondary"}>
                    {kit.is_published ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(kit)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteKit(kit.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar Design" : "Novo Design"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Título</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tags (separadas por vírgula)</label>
                <Input value={form.tags_text} onChange={e => setForm({ ...form, tags_text: e.target.value })} placeholder="floral, delicado, infantil" />
              </div>
            </div>

            {/* Preview image upload */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" /> Imagem de Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.cover_image && (
                  <div className="relative inline-block">
                    <img src={form.cover_image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-border/60" />
                    <button
                      onClick={() => setForm({ ...form, cover_image: "" })}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={uploadCover} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload imagem"}
                  </Button>
                  <span className="text-xs text-muted-foreground">ou</span>
                  <Input
                    value={form.cover_image}
                    onChange={e => setForm({ ...form, cover_image: e.target.value })}
                    placeholder="Cole uma URL..."
                    className="text-xs h-8"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Formats */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Formatos Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {ALL_FORMATS.map(f => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.formats.includes(f)}
                        onCheckedChange={() => toggleFormat(f)}
                      />
                      <span className="text-sm font-medium">{f}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Zip file upload */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileArchive className="h-4 w-4 text-primary" /> Arquivo ZIP para download
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.zip_url && (
                  <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border/40">
                    <FileArchive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate flex-1">{form.zip_url.split("/").pop()}</span>
                    <button onClick={() => setForm({ ...form, zip_url: "" })} className="text-destructive hover:text-destructive/80">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input ref={zipInputRef} type="file" accept=".zip" onChange={uploadZip} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => zipInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload ZIP"}
                  </Button>
                  <span className="text-xs text-muted-foreground">ou</span>
                  <Input
                    value={form.zip_url}
                    onChange={e => setForm({ ...form, zip_url: e.target.value })}
                    placeholder="Cole uma URL..."
                    className="text-xs h-8"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Publish toggle + save */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
                <label className="text-sm font-medium">Publicado</label>
              </div>
              <Button onClick={saveKit} className="px-8">Salvar Design</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
