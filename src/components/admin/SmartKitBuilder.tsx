import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wand2, Loader2, X, Check, Package, Layers, GripVertical, Plus, Search, ArrowLeft, Sparkles } from "lucide-react";

interface SmartKitBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKitCreated: () => void;
}

type Step = "theme" | "loading" | "review";

interface DraftDesign {
  id: string;
  name: string;
  generated_title: string | null;
  cover_image: string | null;
  hoop_size: string | null;
  stitch_count: number | null;
  category_name: string | null;
  relevance: number;
}

interface KitDraft {
  suggested_title: string;
  suggested_description: string;
  suggested_cover: string | null;
  designs: DraftDesign[];
  designs_count: number;
}

export const SmartKitBuilder = ({ open, onOpenChange, onKitCreated }: SmartKitBuilderProps) => {
  const [step, setStep] = useState<Step>("theme");
  const [theme, setTheme] = useState("");
  const [description, setDescription] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hoopFilter, setHoopFilter] = useState("all");
  const [maxDesigns, setMaxDesigns] = useState(30);
  const [categories, setCategories] = useState<any[]>([]);

  // Draft state
  const [draft, setDraft] = useState<KitDraft | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftDesigns, setDraftDesigns] = useState<DraftDesign[]>([]);
  const [draftCover, setDraftCover] = useState<string | null>(null);

  // Manual add
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState("");
  const [addResults, setAddResults] = useState<DraftDesign[]>([]);
  const [searchingAdd, setSearchingAdd] = useState(false);

  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    db.from("categories").select("*").eq("is_active", true).order("name")
      .then(({ data }: any) => setCategories(data || []));
  }, []);

  const resetAll = () => {
    setStep("theme");
    setTheme("");
    setDescription("");
    setCategoryFilter("all");
    setHoopFilter("all");
    setMaxDesigns(30);
    setDraft(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftDesigns([]);
    setDraftCover(null);
    setShowAddSearch(false);
    setAddSearchTerm("");
    setAddResults([]);
  };

  const handleClose = () => {
    resetAll();
    onOpenChange(false);
  };

  const buildDraft = async () => {
    if (!theme.trim()) {
      toast.error("Digite um tema para o kit");
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke("build-kit-draft", {
        body: {
          theme: theme.trim(),
          description: description.trim() || undefined,
          category_id: categoryFilter !== "all" ? categoryFilter : undefined,
          hoop_size: hoopFilter !== "all" ? hoopFilter : undefined,
          max_designs: maxDesigns,
        },
      });

      if (error) throw error;

      if (!data || data.error) {
        throw new Error(data?.error || "Erro ao gerar rascunho");
      }

      setDraft(data);
      setDraftTitle(data.suggested_title);
      setDraftDescription(data.suggested_description);
      setDraftDesigns(data.designs);
      setDraftCover(data.suggested_cover);
      setStep("review");

      if (data.designs.length === 0) {
        toast.info("Nenhuma matriz encontrada para este tema. Tente outro termo.");
      } else {
        toast.success(`${data.designs.length} matrizes encontradas!`);
      }
    } catch (err: any) {
      console.error("Draft error:", err);
      toast.error(err.message || "Erro ao gerar rascunho do kit");
      setStep("theme");
    }
  };

  const removeDesign = (designId: string) => {
    setDraftDesigns(prev => prev.filter(d => d.id !== designId));
  };

  const searchToAdd = async () => {
    if (!addSearchTerm.trim()) return;
    setSearchingAdd(true);
    try {
      const { data } = await db.rpc("search_designs", {
        search_term: addSearchTerm.trim(),
        p_sort: "recent",
        p_offset: 0,
        p_limit: 20,
      });
      const existingIds = new Set(draftDesigns.map(d => d.id));
      setAddResults((data || []).filter((d: any) => !existingIds.has(d.id)).map((d: any) => ({
        id: d.id,
        name: d.name,
        generated_title: d.generated_title,
        cover_image: d.cover_image,
        hoop_size: d.hoop_size,
        stitch_count: d.stitch_count,
        category_name: d.category_name,
        relevance: d.relevance,
      })));
    } catch {
      toast.error("Erro ao buscar matrizes");
    } finally {
      setSearchingAdd(false);
    }
  };

  const addDesign = (design: DraftDesign) => {
    setDraftDesigns(prev => [...prev, design]);
    setAddResults(prev => prev.filter(d => d.id !== design.id));
    toast.success("Matriz adicionada");
  };

  const publishKit = async () => {
    if (!draftTitle.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (draftDesigns.length === 0) {
      toast.error("Adicione ao menos uma matriz ao kit");
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        title: draftTitle.trim(),
        description: draftDescription.trim() || null,
        cover_image: draftCover || null,
        designs_count: draftDesigns.length,
        access_rule: "included_in_annual",
        is_published: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from("premium_kits").insert(payload);
      if (error) throw error;

      toast.success("Kit publicado com sucesso!");
      handleClose();
      onKitCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar kit");
    } finally {
      setPublishing(false);
    }
  };

  const saveDraft = async () => {
    if (!draftTitle.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        title: draftTitle.trim(),
        description: draftDescription.trim() || null,
        cover_image: draftCover || null,
        designs_count: draftDesigns.length,
        access_rule: "included_in_annual",
        is_published: false,
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from("premium_kits").insert(payload);
      if (error) throw error;

      toast.success("Rascunho salvo!");
      handleClose();
      onKitCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar rascunho");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        {/* STEP: THEME INPUT */}
        {step === "theme" && (
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2 text-xl">
                <Wand2 className="h-5 w-5 text-primary" />
                Criar Kit Inteligente
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Defina um tema e o sistema monta o kit automaticamente com matrizes relacionadas.
              </p>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tema do Kit *</label>
                <Input
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="Ex: Safari Baby, Alfabeto Floral, Páscoa Infantil..."
                  className="text-base"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Descrição (opcional)</label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descrição opcional para contextualizar o kit..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Categoria</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Bastidor</label>
                  <Select value={hoopFilter} onValueChange={setHoopFilter}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="10x10">10x10</SelectItem>
                      <SelectItem value="13x18">13x18</SelectItem>
                      <SelectItem value="14cm">14cm</SelectItem>
                      <SelectItem value="16cm">16cm</SelectItem>
                      <SelectItem value="18cm">18cm</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Máximo de matrizes</label>
                  <Input
                    type="number"
                    value={maxDesigns}
                    onChange={e => setMaxDesigns(parseInt(e.target.value) || 30)}
                    min={5}
                    max={100}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={buildDraft} disabled={!theme.trim()} className="gap-2">
                <Wand2 className="h-4 w-4" />
                Gerar Kit Automaticamente
              </Button>
            </div>
          </div>
        )}

        {/* STEP: LOADING */}
        {step === "loading" && (
          <div className="p-6 flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold">Montando o kit...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Buscando matrizes relacionadas ao tema "{theme}"
              </p>
            </div>
          </div>
        )}

        {/* STEP: REVIEW DRAFT */}
        {step === "review" && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border/40">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep("theme")} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Rascunho do Kit
                </DialogTitle>
              </div>

              {/* Editable title & description */}
              <div className="space-y-3">
                <Input
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="text-lg font-semibold font-display border-dashed"
                  placeholder="Título do kit..."
                />
                <Textarea
                  value={draftDescription}
                  onChange={e => setDraftDescription(e.target.value)}
                  className="border-dashed resize-none"
                  rows={2}
                  placeholder="Descrição do kit..."
                />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="secondary" className="gap-1.5">
                  <Layers className="h-3 w-3" />
                  {draftDesigns.length} matrize{draftDesigns.length !== 1 ? "s" : ""}
                </Badge>
                {draftCover && (
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <Check className="h-3 w-3" /> Capa selecionada
                  </Badge>
                )}
              </div>
            </div>

            {/* Cover preview */}
            {draftCover && (
              <div className="px-6 pt-4">
                <div className="relative inline-block">
                  <img src={draftCover} alt="Capa" className="h-20 w-20 rounded-xl object-cover border border-border/40" />
                  <button
                    onClick={() => setDraftCover(null)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Design list */}
            <div className="p-6 pt-4 space-y-2 max-h-[40vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">Matrizes selecionadas</h4>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddSearch(!showAddSearch)}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar mais
                </Button>
              </div>

              {draftDesigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma matriz encontrada. Use o botão acima para adicionar manualmente.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {draftDesigns.map((design) => (
                    <div
                      key={design.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-card hover:bg-accent/30 transition-colors group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                      {design.cover_image ? (
                        <img src={design.cover_image} alt="" className="w-9 h-9 rounded-md object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {design.generated_title || design.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {design.hoop_size && <span>{design.hoop_size}</span>}
                          {design.stitch_count && <span>• {design.stitch_count.toLocaleString()} pts</span>}
                          {design.category_name && <span>• {design.category_name}</span>}
                        </div>
                      </div>
                      {!draftCover && design.cover_image && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs opacity-0 group-hover:opacity-100"
                          onClick={() => setDraftCover(design.cover_image!)}
                        >
                          Usar como capa
                        </Button>
                      )}
                      <button
                        onClick={() => removeDesign(design.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual add search */}
            {showAddSearch && (
              <div className="px-6 pb-4 space-y-3 border-t border-border/40 pt-4">
                <div className="flex gap-2">
                  <Input
                    value={addSearchTerm}
                    onChange={e => setAddSearchTerm(e.target.value)}
                    placeholder="Buscar matrizes para adicionar..."
                    className="text-sm"
                    onKeyDown={e => e.key === "Enter" && searchToAdd()}
                  />
                  <Button variant="outline" size="sm" onClick={searchToAdd} disabled={searchingAdd} className="gap-1.5 shrink-0">
                    {searchingAdd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Buscar
                  </Button>
                </div>
                {addResults.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {addResults.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-border/40 hover:bg-accent/20">
                        {d.cover_image ? (
                          <img src={d.cover_image} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted" />
                        )}
                        <span className="text-sm flex-1 truncate">{d.generated_title || d.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => addDesign(d)} className="gap-1 text-xs">
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="p-6 pt-4 border-t border-border/40 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
                Descartar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={saveDraft} disabled={publishing}>
                  Salvar Rascunho
                </Button>
                <Button onClick={publishKit} disabled={publishing || draftDesigns.length === 0} className="gap-2">
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Publicar Kit
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
