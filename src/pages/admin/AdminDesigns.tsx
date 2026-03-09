import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/db";
import { generateTagsFromName } from "@/lib/generateTags";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Image, FileText, X, Lightbulb, Wand2 } from "lucide-react";

const FILE_FORMATS = ["PES", "EXP", "DST", "JEF", "XXX"];

export const AdminDesigns = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", cover_image: "", category_id: "", is_published: false, tags_text: "" });
  const [uploading, setUploading] = useState(false);
  const [designFiles, setDesignFiles] = useState<any[]>([]);
  const [productIdeas, setProductIdeas] = useState<any[]>([]);
  const [newIdea, setNewIdea] = useState({ title: "", description: "", image_url: "" });
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [{ data: designsData }, { data: catsData }] = await Promise.all([
      db.from("designs").select("*, categories(name)").order("created_at", { ascending: false }),
      db.from("categories").select("*").order("name"),
    ]);
    setDesigns(designsData || []);
    setCategories(catsData || []);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchDesignDetails = async (designId: string) => {
    const [{ data: files }, { data: ideas }] = await Promise.all([
      db.from("kit_arquivos").select("*").eq("design_id", designId),
      db.from("product_ideas").select("*").eq("design_id", designId),
    ]);
    setDesignFiles(files || []);
    setProductIdeas(ideas || []);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", cover_image: "", category_id: "", is_published: false, tags_text: "" });
    setDesignFiles([]);
    setProductIdeas([]);
    setNewIdea({ title: "", description: "", image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = async (design: any) => {
    setEditing(design);
    setForm({
      name: design.name || "",
      description: design.description || "",
      cover_image: design.cover_image || "",
      category_id: design.category_id || "",
      is_published: design.is_published ?? false,
      tags_text: design.tags_text || "",
    });
    setNewIdea({ title: "", description: "", image_url: "" });
    await fetchDesignDetails(design.id);
    setDialogOpen(true);
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("design-covers").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("design-covers").getPublicUrl(path);
    setForm(prev => ({ ...prev, cover_image: urlData.publicUrl }));
    toast.success("Imagem enviada!");
    setUploading(false);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing?.id) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toUpperCase() || "";
    const fileName = file.name;
    const path = `${editing.id}/${crypto.randomUUID()}.${ext.toLowerCase()}`;
    const { error } = await supabase.storage.from("design-files").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("design-files").getPublicUrl(path);
    const format = FILE_FORMATS.includes(ext) ? ext : ext;
    const { error: dbError } = await db.from("kit_arquivos").insert({
      design_id: editing.id,
      format,
      file_url: urlData.publicUrl,
      file_name: fileName,
    });
    if (dbError) { toast.error(dbError.message); } else { toast.success(`Arquivo ${ext} enviado!`); }
    await fetchDesignDetails(editing.id);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteFile = async (fileId: string) => {
    const { error } = await db.from("kit_arquivos").delete().eq("id", fileId);
    if (error) toast.error(error.message);
    else { toast.success("Arquivo removido!"); if (editing?.id) fetchDesignDetails(editing.id); }
  };

  const saveDesign = async () => {
    if (!form.name.trim()) { toast.error("Título é obrigatório"); return; }
    const payload = {
      name: form.name,
      description: form.description || null,
      cover_image: form.cover_image || null,
      category_id: form.category_id || null,
      is_published: form.is_published,
      tags_text: form.tags_text,
    };
    let designId = editing?.id;
    if (editing) {
      const { error } = await db.from("designs").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await db.from("designs").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      setEditing(data);
      designId = data.id;
    }
    
    toast.success(editing ? "Matriz atualizada!" : "Matriz criada! Agora adicione arquivos e ideias.");
    if (!editing) { fetchData(); return; }
    setDialogOpen(false);
    fetchData();
  };

  const deleteDesign = async (id: string) => {
    const { error } = await db.from("designs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Matriz excluída!"); fetchData(); }
  };

  const addProductIdea = async () => {
    if (!editing?.id || !newIdea.title.trim()) { toast.error("Título da ideia é obrigatório"); return; }
    const { error } = await db.from("product_ideas").insert({
      design_id: editing.id,
      title: newIdea.title.trim(),
      description: newIdea.description.trim() || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Ideia adicionada!"); setNewIdea({ title: "", description: "", image_url: "" }); fetchDesignDetails(editing.id); }
  };

  const deleteIdea = async (ideaId: string) => {
    const { error } = await db.from("product_ideas").delete().eq("id", ideaId);
    if (error) toast.error(error.message);
    else { toast.success("Ideia removida!"); if (editing?.id) fetchDesignDetails(editing.id); }
  };

  const tagsArray = (tagsText: string | null) => (tagsText || "").split(",").map(t => t.trim()).filter(Boolean);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
         <h3 className="font-semibold">Matrizes ({designs.length})</h3>
         <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Matriz</Button>
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
            {designs.map((design: any) => (
              <TableRow key={design.id}>
                <TableCell>
                  {design.cover_image ? (
                    <img src={design.cover_image} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-accent flex items-center justify-center text-sm">🧵</div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{design.name}</TableCell>
                <TableCell>{design.categories?.name || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {tagsArray(design.tags_text).slice(0, 3).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={design.is_published ? "default" : "secondary"}>
                    {design.is_published ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(design)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDesign(design.id)}>
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
                <div className="flex gap-2">
                  <Input value={form.tags_text} onChange={e => setForm({ ...form, tags_text: e.target.value })} placeholder="floral, delicado, infantil" className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs"
                    onClick={() => {
                      const suggested = generateTagsFromName(form.name);
                      if (suggested.length === 0) { toast("Adicione um título para gerar tags"); return; }
                      const existing = form.tags_text.split(",").map(t => t.trim()).filter(Boolean);
                      const merged = Array.from(new Set([...existing, ...suggested]));
                      setForm({ ...form, tags_text: merged.join(", ") });
                      toast.success(`${suggested.length} tags sugeridas adicionadas!`);
                    }}
                    disabled={!form.name.trim()}
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Gerar tags
                  </Button>
                </div>
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

            {/* Embroidery files - only when editing */}
            {editing && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Arquivos de Bordado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {designFiles.length > 0 && (
                    <div className="space-y-2">
                      {designFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border/40">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{file.format}</Badge>
                            <span className="text-xs text-muted-foreground">{file.file_name || ""}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteFile(file.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <input ref={fileInputRef} type="file" accept=".pes,.exp,.dst,.jef,.xxx" onChange={uploadFile} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload arquivo (.pes, .exp, .dst, .jef, .xxx)"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product ideas - only when editing */}
            {editing && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" /> Ideias de Produto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {productIdeas.length > 0 && (
                    <div className="space-y-2">
                      {productIdeas.map((idea: any) => (
                        <div key={idea.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border/40">
                          <div>
                            <p className="text-sm font-medium">{idea.title}</p>
                            {idea.description && <p className="text-xs text-muted-foreground line-clamp-1">{idea.description}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteIdea(idea.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Input
                      value={newIdea.title}
                      onChange={e => setNewIdea({ ...newIdea, title: e.target.value })}
                      placeholder="Nome do produto (ex: Camiseta bordada)"
                      className="text-sm"
                    />
                    <Input
                      value={newIdea.description}
                      onChange={e => setNewIdea({ ...newIdea, description: e.target.value })}
                      placeholder="Descrição curta (opcional)"
                      className="text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={addProductIdea} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Adicionar ideia
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Publish toggle + save */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
                <label className="text-sm font-medium">Publicado</label>
              </div>
              <Button onClick={saveDesign} className="px-8">Salvar Design</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
