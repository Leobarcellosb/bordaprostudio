import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/db";
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
import { Plus, Pencil, Trash2, Upload, Image, FileArchive, X, Package, Wand2 } from "lucide-react";
import { SmartKitBuilder } from "@/components/admin/SmartKitBuilder";

const ACCESS_RULES = [
  { value: "included_in_annual", label: "Incluso no Plano Anual" },
  { value: "purchase_required", label: "Compra Avulsa" },
  { value: "both", label: "Anual (grátis) + Avulso" },
];

const accessRuleLabel = (rule: string) => ACCESS_RULES.find(r => r.value === rule)?.label || rule;

export const AdminPremiumKits = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [smartBuilderOpen, setSmartBuilderOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", cover_image: "", designs_count: 0,
    zip_url: "", access_rule: "included_in_annual", price: "",
    purchase_url: "", is_published: false,
  });
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const fetchKits = async () => {
    const { data } = await db.from("premium_kits").select("*").order("created_at", { ascending: false });
    setKits(data || []);
  };

  useEffect(() => { fetchKits(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", cover_image: "", designs_count: 0, zip_url: "", access_rule: "included_in_annual", price: "", purchase_url: "", is_published: false });
    setDialogOpen(true);
  };

  const openEdit = (kit: any) => {
    setEditing(kit);
    setForm({
      title: kit.title, description: kit.description || "", cover_image: kit.cover_image || "",
      designs_count: kit.designs_count || 0, zip_url: kit.zip_url || "",
      access_rule: kit.access_rule || "included_in_annual",
      price: kit.price ? String(kit.price) : "", purchase_url: kit.purchase_url || "",
      is_published: kit.is_published,
    });
    setDialogOpen(true);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: "cover" | "zip") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${type}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("premium-kit-files").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("premium-kit-files").getPublicUrl(path);
    if (type === "cover") setForm(prev => ({ ...prev, cover_image: urlData.publicUrl }));
    else setForm(prev => ({ ...prev, zip_url: urlData.publicUrl }));
    toast.success(type === "cover" ? "Imagem enviada!" : "Arquivo ZIP enviado!");
    setUploading(false);
  };

  const saveKit = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    const payload = {
      title: form.title,
      description: form.description || null,
      cover_image: form.cover_image || null,
      designs_count: form.designs_count,
      zip_url: form.zip_url || null,
      access_rule: form.access_rule,
      price: form.price ? parseFloat(form.price) : null,
      purchase_url: form.purchase_url || null,
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await db.from("premium_kits").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await db.from("premium_kits").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editing ? "Kit atualizado!" : "Kit criado!");
    setDialogOpen(false);
    fetchKits();
  };

  const deleteKit = async (id: string) => {
    const { error } = await db.from("premium_kits").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Kit excluído!"); fetchKits(); }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Kits Premium ({kits.length})
        </h3>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Kit</Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Matrizes</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead>Preço</TableHead>
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
                    <div className="w-10 h-10 rounded bg-accent flex items-center justify-center text-sm">📦</div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{kit.title}</TableCell>
                <TableCell>{kit.designs_count}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{accessRuleLabel(kit.access_rule)}</Badge>
                </TableCell>
                <TableCell>{kit.price ? `R$ ${Number(kit.price).toFixed(2)}` : "—"}</TableCell>
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
            {kits.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum kit premium criado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar Kit" : "Novo Kit Premium"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Título</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Kit Infantil 2000 Matrizes" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Quantidade de Matrizes</label>
                  <Input type="number" value={form.designs_count} onChange={e => setForm({ ...form, designs_count: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Preço (R$)</label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Opcional" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Regra de Acesso</label>
                <Select value={form.access_rule} onValueChange={v => setForm({ ...form, access_rule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_RULES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">URL de Compra (checkout)</label>
                <Input value={form.purchase_url} onChange={e => setForm({ ...form, purchase_url: e.target.value })} placeholder="https://chk.eduzz.com/..." />
              </div>
            </div>

            {/* Cover image */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" /> Imagem de Capa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.cover_image && (
                  <div className="relative inline-block">
                    <img src={form.cover_image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-border/60" />
                    <button onClick={() => setForm({ ...form, cover_image: "" })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input ref={coverRef} type="file" accept="image/*" onChange={e => uploadFile(e, "cover")} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => coverRef.current?.click()} disabled={uploading} className="gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload imagem"}
                  </Button>
                  <span className="text-xs text-muted-foreground">ou</span>
                  <Input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="Cole uma URL..." className="text-xs h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Zip file */}
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
                  <input ref={zipRef} type="file" accept=".zip" onChange={e => uploadFile(e, "zip")} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => zipRef.current?.click()} disabled={uploading} className="gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload ZIP"}
                  </Button>
                  <span className="text-xs text-muted-foreground">ou</span>
                  <Input value={form.zip_url} onChange={e => setForm({ ...form, zip_url: e.target.value })} placeholder="Cole uma URL..." className="text-xs h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Publish + save */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
                <label className="text-sm font-medium">Publicado</label>
              </div>
              <Button onClick={saveKit} className="px-8">Salvar Kit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
