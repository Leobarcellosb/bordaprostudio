import { useEffect, useState, useRef } from "react";
import { notifyDesignsMutated } from "@/lib/designsMutationEvent";
import { db } from "@/lib/db";
import { generateTagsFromName } from "@/lib/generateTags";
import { supabase } from "@/integrations/supabase/client";
import { generateEmbroideryPreview, isPreviewSupported } from "@/lib/embroideryPreview";
import { pickBestPreviewFile } from "@/lib/previewFormat";
import { validateMatrixUpload, validateImageUpload } from "@/lib/validateUpload";
import { useFolders } from "@/hooks/useFolders";
import { deriveFoldersForDesign } from "@/lib/folderRules";
import { FolderPickerPopover, FolderCountBadge } from "@/components/admin/FolderPickerPopover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Image, FileText, X, Lightbulb, Wand2, Loader2, Tags, FolderInput } from "lucide-react";

const FILE_FORMATS = ["PES", "EXP", "DST", "JEF", "XXX", "VP3", "HUS", "EMB"];

export const AdminDesigns = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", cover_image: "", category_id: "", is_published: false, tags_text: "", manual_categories: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const [designFiles, setDesignFiles] = useState<any[]>([]);
  const [productIdeas, setProductIdeas] = useState<any[]>([]);
  const [newIdea, setNewIdea] = useState({ title: "", description: "", image_url: "" });
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folders dinâmicas (tabela folders). Substitui FOLDER_RULES estático.
  const { data: folderList = [], error: foldersError } = useFolders();

  // Bulk select state — checkbox por linha + ação "atribuir pasta".
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFolderSlug, setBulkFolderSlug] = useState<string>("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
    setForm({ name: "", description: "", cover_image: "", category_id: "", is_published: false, tags_text: "", manual_categories: [] as string[] });
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
      manual_categories: Array.isArray(design.manual_categories) ? design.manual_categories : [],
    });
    setNewIdea({ title: "", description: "", image_url: "" });
    await fetchDesignDetails(design.id);
    setDialogOpen(true);
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // B1: valida tipo/tamanho antes de subir (impede .exe, .zip 100MB,
    // JS malicioso etc. virarem URL pública no bucket design-covers).
    const validationError = validateImageUpload(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

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
    const err = validateMatrixUpload(file);
    if (err) { toast.error(err); if (fileInputRef.current) fileInputRef.current.value = ""; return; }
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

    // Auto-generate preview if no cover image exists
    if (!form.cover_image && isPreviewSupported(ext)) {
      try {
        const result = await generateEmbroideryPreview(file, ext);
        if (result && result.blob) {
          const previewPath = `auto/${editing.id}-${Date.now()}.png`;
          const { error: upErr } = await supabase.storage.from("design-covers").upload(previewPath, result.blob, { contentType: "image/png" });
          if (!upErr) {
            const { data: previewUrl } = supabase.storage.from("design-covers").getPublicUrl(previewPath);
            await db.from("designs").update({
              cover_image: previewUrl.publicUrl,
              ...(result.metadata ? {
                width_mm: result.metadata.widthMm,
                height_mm: result.metadata.heightMm,
                stitch_count: result.metadata.stitchCount,
                colors_count: result.metadata.colorChanges,
              } : {}),
            }).eq("id", editing.id);
            setForm(prev => ({ ...prev, cover_image: previewUrl.publicUrl }));
            toast.success("Preview gerado automaticamente a partir do arquivo de bordado!");
          }
        }
      } catch (err) {
        console.warn("Auto-preview generation failed:", err);
        toast.info("Não foi possível gerar uma visualização legível desta matriz. Envie uma imagem manualmente.");
      }
    }

    await fetchDesignDetails(editing.id);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteFile = async (fileId: string) => {
    const { error } = await db.from("kit_arquivos").delete().eq("id", fileId);
    if (error) toast.error(error.message);
    else { toast.success("Arquivo removido!"); if (editing?.id) fetchDesignDetails(editing.id); }
  };

  const [regeneratingPreview, setRegeneratingPreview] = useState(false);

  /**
   * Regenera a cover_image a partir do MELHOR arquivo de bordado disponível
   * (PES > JEF > EXP > DST > ...). Resolve covers feias geradas a partir de
   * JEF/DST sem perder a possibilidade do admin colocar uma capa manual.
   */
  const regeneratePreviewFromBestFile = async () => {
    if (!editing?.id) return;
    const eligible = designFiles.filter((f: any) => isPreviewSupported(f.format));
    const best = pickBestPreviewFile<any>(eligible, (f) => f.format);
    if (!best || !best.file_url) {
      toast.error("Nenhum arquivo de bordado suportado disponível.");
      return;
    }
    setRegeneratingPreview(true);
    try {
      const resp = await fetch(best.file_url);
      if (!resp.ok) throw new Error(`Falha ao baixar arquivo (${resp.status})`);
      const blob = await resp.blob();
      const result = await generateEmbroideryPreview(blob, best.format);
      if (!result || !result.blob) {
        toast.error("Não foi possível interpretar o arquivo para gerar preview.");
        return;
      }
      const previewPath = `auto/${editing.id}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("design-covers")
        .upload(previewPath, result.blob, { contentType: "image/png" });
      if (upErr) throw upErr;
      const { data: previewUrl } = supabase.storage.from("design-covers").getPublicUrl(previewPath);
      await db.from("designs").update({
        cover_image: previewUrl.publicUrl,
        ...(result.metadata ? {
          width_mm: result.metadata.widthMm,
          height_mm: result.metadata.heightMm,
          stitch_count: result.metadata.stitchCount,
          colors_count: result.metadata.colorChanges,
        } : {}),
      }).eq("id", editing.id);
      setForm((prev) => ({ ...prev, cover_image: previewUrl.publicUrl }));
      toast.success(`Preview regerado a partir do arquivo ${best.format.toUpperCase()}.`);
      fetchData();
    } catch (err) {
      console.error("regeneratePreview error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao regenerar preview.");
    } finally {
      setRegeneratingPreview(false);
    }
  };

  const saveDesign = async () => {
    if (!form.name.trim()) { toast.error("Título é obrigatório"); return; }
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      cover_image: form.cover_image || null,
      category_id: form.category_id || null,
      is_published: form.is_published,
      tags_text: form.tags_text,
      manual_categories: form.manual_categories,
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

  const [regeneratingTags, setRegeneratingTags] = useState(false);

  const bulkRegenerateTags = async () => {
    setRegeneratingTags(true);
    let updated = 0;
    try {
      for (const design of designs) {
        const newTags = generateTagsFromName(design.name);
        const existingTags = (design.tags_text || "").split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
        const merged = Array.from(new Set([...existingTags, ...newTags]));
        const tagsText = merged.join(", ");
        if (tagsText !== (design.tags_text || "")) {
          await db.from("designs").update({ tags_text: tagsText }).eq("id", design.id);
          updated++;
        }
      }
      toast.success(`Tags regeneradas para ${updated} matrizes!`);
      fetchData();
    } catch (err) {
      console.error("Bulk tag regen error:", err);
      toast.error("Erro ao regenerar tags.");
    } finally {
      setRegeneratingTags(false);
    }
  };

  const tagsArray = (tagsText: string | null) => (tagsText || "").split(",").map(t => t.trim()).filter(Boolean);

  // ─── Bulk select helpers ───
  const allSelected = designs.length > 0 && selectedIds.size === designs.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < designs.length;
  const toggleAll = () => {
    if (selectedIds.size === designs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(designs.map((d: any) => d.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    // Deleta em LOTES de 100 ids. O .in() serializa os ids na query-string;
    // ~1104 UUIDs viravam URL de ~40KB → PostgREST HTTP 400 → nada deletado
    // (ou parcial). Em chunks de 100 cada requisição fica ~4KB, segura, e o
    // select-all do acervo inteiro funciona. Filhos antes do pai (FKs).
    const CHUNK = 100;
    try {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        for (const table of ["product_ideas", "kit_arquivos", "kit_designs"] as const) {
          const { error } = await db.from(table).delete().in("design_id", chunk);
          if (error) throw error;
        }
        const { error } = await db.from("designs").delete().in("id", chunk);
        if (error) throw error;
      }
      toast.success(`${ids.length} ${ids.length === 1 ? "matriz deletada" : "matrizes deletadas"}!`);
      clearSelection();
      fetchData();
      notifyDesignsMutated();
    } catch (err: any) {
      toast.error("Erro ao deletar: " + (err?.message ?? err));
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  /**
   * Ação em massa "Atribuir pasta aos selecionados".
   *
   * REGRA CRÍTICA: manual_categories é OVERRIDE total. Se a gente apenas
   * appendasse o slug em design com manual=[], o design entraria em modo
   * manual SÓ com essa pasta — sumiria de todas as pastas automáticas onde
   * as tags o colocavam. Pra evitar isso:
   *
   *   - design em modo automático (manual=[]) → SEMEIA manual com as
   *     pastas derivadas atuais + adiciona a nova. "Adicionar à pasta X"
   *     = "mantém as automáticas + X", nunca "move exclusivo pra X".
   *   - design já em modo manual (manual≠[]) → só adiciona o slug se
   *     não estiver lá (dedup).
   *
   * Roda update por design (não bulk SQL) pra preservar o histórico de
   * cada manual_categories — N viagens ao banco, mas N <= 100 na prática.
   */
  const bulkAssignFolder = async () => {
    if (!bulkFolderSlug) { toast.error("Selecione uma pasta."); return; }
    if (selectedIds.size === 0) { toast.error("Nenhum design selecionado."); return; }
    const folder = folderList.find((f) => f.slug === bulkFolderSlug);
    if (!folder) { toast.error("Pasta não encontrada."); return; }

    setBulkRunning(true);
    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    for (const id of selectedIds) {
      const design = designs.find((d: any) => d.id === id);
      if (!design) { failed++; continue; }
      const current: string[] = Array.isArray(design.manual_categories) ? design.manual_categories : [];

      let next: string[];
      if (current.length === 0) {
        // Auto mode → semeia derivadas + adiciona nova
        const derived = deriveFoldersForDesign(design.tags_text, null, folderList);
        next = Array.from(new Set([...derived, bulkFolderSlug]));
      } else {
        if (current.includes(bulkFolderSlug)) { unchanged++; continue; }
        next = [...current, bulkFolderSlug];
      }

      const { error } = await db.from("designs").update({ manual_categories: next }).eq("id", id);
      if (error) { console.error("[bulkAssign]", id, error); failed++; }
      else updated++;
    }

    setBulkRunning(false);
    setBulkOpen(false);
    setBulkFolderSlug("");
    clearSelection();
    await fetchData();
    notifyDesignsMutated();

    const parts = [`${updated} atribuído(s) a "${folder.name}"`];
    if (unchanged > 0) parts.push(`${unchanged} já estavam lá`);
    if (failed > 0) parts.push(`${failed} falharam`);
    toast.success(parts.join(" · "));
  };

  const [classifying, setClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState("");

  const bulkClassify = async () => {
    const uncategorized = designs.filter(d => !d.category_id);
    if (uncategorized.length === 0) {
      toast.info("Todas as matrizes já possuem categoria.");
      return;
    }
    setClassifying(true);
    let totalClassified = 0;
    let totalFailed = 0;
    let remaining = uncategorized.length;

    while (remaining > 0) {
      setClassifyProgress(`Processando... ${totalClassified} classificadas, ${remaining} restantes`);
      try {
        const { data, error } = await supabase.functions.invoke("bulk-classify-designs", {
          body: { batch_size: 10 },
        });
        if (error) throw error;
        totalClassified += data.classified || 0;
        totalFailed += data.failed || 0;
        remaining = data.remaining || 0;

        if ((data.classified || 0) === 0 && (data.failed || 0) === 0) break; // no more to process
      } catch (err) {
        console.error("Bulk classify error:", err);
        toast.error("Erro na classificação em lote.");
        break;
      }
    }

    toast.success(`Classificação concluída: ${totalClassified} categorizadas, ${totalFailed} falharam.`);
    setClassifying(false);
    setClassifyProgress("");
    fetchData();
  };

  return (
    <div className="space-y-4 mt-4">
       <div className="flex justify-between items-center gap-2">
         <h3 className="font-semibold">Matrizes ({designs.length})</h3>
         <div className="flex gap-2 flex-wrap">
           <Button variant="outline" onClick={bulkRegenerateTags} disabled={regeneratingTags}>
             {regeneratingTags ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
             {regeneratingTags ? "Regenerando..." : "Regerar Tags"}
           </Button>
           <Button variant="outline" onClick={bulkClassify} disabled={classifying}>
             {classifying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Tags className="h-4 w-4 mr-1" />}
             {classifying ? classifyProgress || "Classificando..." : `Auto-classificar (${designs.filter(d => !d.category_id).length})`}
           </Button>
           <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Matriz</Button>
         </div>
       </div>

      {/* Barra de ação em massa — só aparece quando há seleção */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 animate-fade-in">
          <span className="text-sm font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? "matriz selecionada" : "matrizes selecionadas"}
          </span>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setBulkFolderSlug(""); setBulkOpen(true); }}
          >
            <FolderInput className="h-3.5 w-3.5" />
            Atribuir pasta aos selecionados
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Deletar {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Limpar seleção
          </Button>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Pastas</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {designs.map((design: any) => (
              <TableRow key={design.id} data-state={selectedIds.has(design.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(design.id)}
                    onCheckedChange={() => toggleOne(design.id)}
                    aria-label={`Selecionar ${design.name}`}
                  />
                </TableCell>
                <TableCell>
                  {design.cover_image ? (
                    <img src={design.cover_image} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-accent flex items-center justify-center text-sm">🧵</div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{design.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <FolderCountBadge
                      tagsText={design.tags_text}
                      manualCategories={Array.isArray(design.manual_categories) ? design.manual_categories : []}
                    />
                    <FolderPickerPopover
                      designId={design.id}
                      designName={design.name}
                      tagsText={design.tags_text}
                      manualCategories={Array.isArray(design.manual_categories) ? design.manual_categories : []}
                      onChange={(next) => {
                        // Atualiza só essa linha (sem refetch da tabela inteira)
                        setDesigns((prev) =>
                          prev.map((d: any) =>
                            d.id === design.id ? { ...d, manual_categories: next } : d,
                          ),
                        );
                      }}
                      align="start"
                    />
                  </div>
                </TableCell>
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

      {/* Dialog de bulk-assign — pasta + confirmação. Aplica regra
          seed-then-add (vide comentário em bulkAssignFolder). */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Atribuir pasta a {selectedIds.size} {selectedIds.size === 1 ? "matriz" : "matrizes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Pasta de destino</label>
              <Select value={bulkFolderSlug} onValueChange={setBulkFolderSlug}>
                <SelectTrigger><SelectValue placeholder="Selecione uma pasta" /></SelectTrigger>
                <SelectContent>
                  {folderList.map((f) => (
                    <SelectItem key={f.id} value={f.slug}>
                      {f.name} {!f.is_active && " (inativa)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-semibold">Comportamento da atribuição</p>
              <p>
                Matrizes em modo automático (manual vazio) primeiro recebem as pastas
                derivadas das tags + esta nova pasta — não perdem as pastas auto.
              </p>
              <p>
                Matrizes que já têm override manual recebem só a nova pasta no topo das
                atuais (dedup).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button onClick={bulkAssignFolder} disabled={bulkRunning || !bulkFolderSlug}>
              {bulkRunning && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação — deletar em lote */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão em lote</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja deletar{" "}
            <strong>{selectedIds.size} {selectedIds.size === 1 ? "matriz" : "matrizes"}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={bulkDelete} disabled={bulkDeleting}>
              {bulkDeleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Sim, deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar Matriz" : "Nova Matriz"}</DialogTitle>
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

                {editing && designFiles.some((f: any) => isPreviewSupported(f.format)) && (
                  <div className="pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={regeneratePreviewFromBestFile}
                      disabled={regeneratingPreview}
                      className="gap-1.5"
                      title="Regenera a partir do arquivo de bordado (prioriza PES > JEF > EXP > DST)"
                    >
                      {regeneratingPreview ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      {regeneratingPreview ? "Regenerando..." : "Regenerar preview do arquivo de bordado"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Usa PES quando disponível (preview mais bonito) — não muda o arquivo de download.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pastas desta matriz — sempre mostra o conjunto EFETIVO
                pré-marcado (manual se !=[], senão derivadas das tags).
                Marca/desmarca livre. Vazio = volta pro auto-match puro. */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Pastas desta matriz
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Marque todas as pastas onde essa matriz deve aparecer.
                </p>
              </CardHeader>
              <CardContent>
                {foldersError && (
                  <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <strong>Erro ao carregar pastas:</strong> {foldersError.message}
                    {(foldersError as { code?: string }).code === "42501" && (
                      <span className="block mt-1 opacity-80">
                        Rode <code className="px-1 rounded bg-destructive/10">20260530000000_grant_folders.sql</code>.
                      </span>
                    )}
                  </div>
                )}
                {(() => {
                  // Conjunto efetivo: manual (se !=[]) ou derivadas das tags.
                  // Pré-marca o que está hoje, mostra a realidade.
                  const isAuto = form.manual_categories.length === 0;
                  const derived = deriveFoldersForDesign(form.tags_text, null, folderList);
                  const effective = isAuto ? derived : form.manual_categories;
                  const effectiveSet = new Set(effective);
                  const derivedNames = derived
                    .map((s) => folderList.find((f) => f.slug === s)?.name)
                    .filter(Boolean) as string[];

                  return (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {folderList.map((folder) => {
                          const active = effectiveSet.has(folder.slug);
                          return (
                            <button
                              key={folder.id}
                              type="button"
                              onClick={() =>
                                setForm((prev) => {
                                  const inAuto = prev.manual_categories.length === 0;
                                  // Em auto: materializa derivadas pra poder add/remove.
                                  // Em manual: usa o array atual direto.
                                  const base = inAuto
                                    ? deriveFoldersForDesign(prev.tags_text, null, folderList)
                                    : prev.manual_categories;
                                  const next = active
                                    ? base.filter((s) => s !== folder.slug)
                                    : Array.from(new Set([...base, folder.slug]));
                                  return { ...prev, manual_categories: next };
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted/50 hover:bg-muted text-foreground border border-border/60"
                              } ${!folder.is_active ? "opacity-60" : ""}`}
                              title={!folder.is_active ? "Pasta inativa (escondida do cliente)" : undefined}
                            >
                              {folder.name}
                              {!folder.is_active && " ·"}
                            </button>
                          );
                        })}
                        {folderList.length === 0 && (
                          <span className="text-[11px] text-muted-foreground italic">
                            Nenhuma pasta configurada. Crie em Admin → Pastas.
                          </span>
                        )}
                      </div>

                      {/* Comunica o modo atual — explícito pra não ser silencioso */}
                      <div className="mt-3 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                        {isAuto ? (
                          derivedNames.length > 0 ? (
                            <p>
                              <span className="font-semibold text-foreground">Modo automático</span>{" "}
                              · vem das tags: {derivedNames.join(", ")}
                            </p>
                          ) : (
                            <p className="text-amber-700 dark:text-amber-300">
                              <span className="font-semibold">Modo automático mas SEM match.</span>{" "}
                              As tags não batem com nenhuma keyword — design fica órfão.
                              Marque uma pasta acima ou ajuste as tags.
                            </p>
                          )
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <p>
                              <span className="font-semibold text-foreground">Override manual</span>{" "}
                              · {form.manual_categories.length} pasta
                              {form.manual_categories.length === 1 ? "" : "s"}
                            </p>
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, manual_categories: [] }))}
                              className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                            >
                              Voltar pro automático
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
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
                    <input ref={fileInputRef} type="file" accept=".pes,.exp,.dst,.jef,.xxx,.vp3" onChange={uploadFile} className="hidden" />
                     <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                       <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload arquivo (.pes, .exp, .dst, .jef, .xxx, .vp3)"}
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
              <Button onClick={saveDesign} className="px-8">Salvar Matriz</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
