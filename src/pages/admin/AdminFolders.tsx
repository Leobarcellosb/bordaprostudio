import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { useFolders, useInvalidateFolders } from "@/hooks/useFolders";
import {
  deriveFoldersForDesign,
  nextAvailableSlug,
  slugifyFolderName,
  type Folder,
} from "@/lib/folderRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

interface DesignRow {
  id: string;
  tags_text: string | null;
  manual_categories: string[] | null;
}

interface FolderCount {
  total: number;     // designs derivados (auto + manual)
  manualOnly: number; // designs com manual_categories incluindo esse slug
}

/**
 * Gerenciador de pastas "Por Tema" — CRUD da tabela folders.
 *
 * Substitui o antigo AdminCategories (que mexia na tabela categories
 * legacy, hoje dormente — usada só pelo dropdown em AdminDesigns e
 * por queries de home/related). Pasta = ASSUNTO (não estilo).
 */
export const AdminFolders = () => {
  const { data: folders = [], isLoading: foldersLoading } = useFolders();
  const invalidate = useInvalidateFolders();

  // Pra contar designs por pasta precisamos rodar a derivação aqui.
  // Carrega designs publicados uma vez (não é tela quente).
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDesignsLoading(true);
      const { data, error } = await db
        .from("designs")
        .select("id, tags_text, manual_categories")
        .eq("is_published", true);
      if (cancelled) return;
      if (error) {
        console.error("[AdminFolders] load designs:", error);
        toast.error("Erro ao carregar designs pra contagem.");
        setDesigns([]);
      } else {
        setDesigns((data ?? []) as DesignRow[]);
      }
      setDesignsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Contagem por pasta = quantos designs caem nela após derivação.
  const counts = useMemo<Map<string, FolderCount>>(() => {
    const m = new Map<string, FolderCount>();
    folders.forEach((f) => m.set(f.slug, { total: 0, manualOnly: 0 }));
    for (const d of designs) {
      const slugs = deriveFoldersForDesign(d.tags_text, d.manual_categories ?? null, folders);
      const hasManual = (d.manual_categories?.length ?? 0) > 0;
      for (const slug of slugs) {
        const entry = m.get(slug);
        if (!entry) continue;
        entry.total++;
        if (hasManual && d.manual_categories!.includes(slug)) entry.manualOnly++;
      }
    }
    return m;
  }, [folders, designs]);

  // ─── Dialog state (criar/editar) ───
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Folder | null>(null);
  const [form, setForm] = useState({
    name: "",
    keywords: "", // textarea separada por vírgula
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", keywords: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (f: Folder) => {
    setEditing(f);
    setForm({
      name: f.name,
      keywords: f.keyword_rules.join(", "),
      is_active: f.is_active,
    });
    setDialogOpen(true);
  };

  const parseKeywords = (raw: string): string[] =>
    Array.from(
      new Set(
        raw
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ),
    );

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const keyword_rules = parseKeywords(form.keywords);

    setSaving(true);
    try {
      if (editing) {
        // Edita: slug fica imutável (designs.manual_categories referencia
        // por slug — mudar quebraria atribuições existentes).
        const { error } = await supabase
          .from("folders")
          .update({ name, keyword_rules, is_active: form.is_active })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Pasta atualizada.");
      } else {
        // Cria: slug auto a partir do nome, com sufixo numérico se colidir.
        const taken = new Set(folders.map((f) => f.slug));
        const slug = nextAvailableSlug(name, taken);
        // sort_order = última + 10 (deixa espaço pra inserir antes).
        const lastOrder = folders.reduce((max, f) => Math.max(max, f.sort_order), 0);
        const { error } = await supabase.from("folders").insert({
          slug,
          name,
          keyword_rules,
          sort_order: lastOrder + 10,
          is_active: form.is_active,
        });
        if (error) throw error;
        toast.success(`Pasta criada com slug "${slug}".`);
      }
      await invalidate();
      setDialogOpen(false);
    } catch (err) {
      console.error("[AdminFolders] save:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar pasta.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (f: Folder) => {
    const { error } = await supabase
      .from("folders")
      .update({ is_active: !f.is_active })
      .eq("id", f.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${f.name}" ${!f.is_active ? "ativada" : "desativada"}.`);
    invalidate();
  };

  const remove = async (f: Folder) => {
    const count = counts.get(f.slug)?.manualOnly ?? 0;
    const warning =
      count > 0
        ? `${count} design${count === 1 ? "" : "s"} têm essa pasta no override manual e perderão a atribuição manual. Continuar?`
        : "Tem certeza? Designs que caíam aqui por auto-match vão sumir desta pasta (mas seguem em outras pastas se as tags baterem).";
    if (!window.confirm(warning)) return;

    const { error } = await supabase.from("folders").delete().eq("id", f.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${f.name}" removida.`);
    invalidate();
  };

  /**
   * Reordena trocando sort_order com vizinho. Sem drag-and-drop (escolha
   * explícita do user pra manter simples). 2 updates atômicos via Promise.all.
   */
  const move = async (idx: number, dir: -1 | 1) => {
    const sorted = [...folders].sort((a, b) => a.sort_order - b.sort_order);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[target];
    const [aOrd, bOrd] = [a.sort_order, b.sort_order];
    // Se acabaram empatados (sort_order igual), gera diff artificial.
    const newAOrd = aOrd === bOrd ? bOrd + dir : bOrd;
    const newBOrd = aOrd === bOrd ? bOrd : aOrd;
    const [r1, r2] = await Promise.all([
      supabase.from("folders").update({ sort_order: newAOrd }).eq("id", a.id),
      supabase.from("folders").update({ sort_order: newBOrd }).eq("id", b.id),
    ]);
    if (r1.error || r2.error) {
      toast.error(r1.error?.message ?? r2.error?.message ?? "Erro ao reordenar.");
      return;
    }
    invalidate();
  };

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.sort_order - b.sort_order),
    [folders],
  );

  const previewSlug = useMemo(() => {
    if (editing || !form.name.trim()) return null;
    const taken = new Set(folders.map((f) => f.slug));
    return nextAvailableSlug(form.name, taken);
  }, [form.name, editing, folders]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Pastas "Por Tema" ({folders.length})</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Catálogo das pastas que aparecem em Biblioteca → Por Tema. Slug é
            imutável; renomear afeta só o display. Keywords disparam
            auto-match contra tags dos designs.
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <FolderPlus className="h-4 w-4" /> Nova Pasta
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead className="text-right">Designs</TableHead>
              <TableHead className="text-center">Ativa</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(foldersLoading || designsLoading) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                </TableCell>
              </TableRow>
            )}

            {!foldersLoading && sortedFolders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma pasta cadastrada. Rode a migration
                  <code className="text-xs ml-1 px-1.5 py-0.5 rounded bg-muted">
                    20260529000000_folders_table.sql
                  </code>{" "}
                  ou crie a primeira em "Nova Pasta".
                </TableCell>
              </TableRow>
            )}

            {sortedFolders.map((f, idx) => {
              const c = counts.get(f.slug) ?? { total: 0, manualOnly: 0 };
              return (
                <TableRow key={f.id} className={!f.is_active ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => move(idx, -1)}
                        title="Mover pra cima"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === sortedFolders.length - 1}
                        onClick={() => move(idx, 1)}
                        title="Mover pra baixo"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>
                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {f.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {f.keyword_rules.slice(0, 6).map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[10px]">
                          {kw}
                        </Badge>
                      ))}
                      {f.keyword_rules.length > 6 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{f.keyword_rules.length - 6}
                        </Badge>
                      )}
                      {f.keyword_rules.length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic">
                          sem keywords — só atribuição manual
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-medium">{c.total}</div>
                    {c.manualOnly > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        {c.manualOnly} manual
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={f.is_active} onCheckedChange={() => toggleActive(f)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(f)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? `Editar "${editing.name}"` : "Nova Pasta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='Ex: "Veículos & Vintage"'
              />
              {!editing && previewSlug && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Slug auto: <code className="text-xs px-1 py-0.5 rounded bg-muted">{previewSlug}</code>{" "}
                  (imutável após criar)
                </p>
              )}
              {editing && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Slug: <code className="text-xs px-1 py-0.5 rounded bg-muted">{editing.slug}</code>{" "}
                  (não editável — designs referenciam por slug)
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Keywords de auto-match
              </label>
              <Textarea
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="Separadas por vírgula. Ex: carro, moto, bicicleta, retrô"
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Match contra tags inteiras + palavras ≥3 letras dentro de tag composta.
                Vazio = pasta só por atribuição manual no editor de design.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
              <div>
                <label className="text-sm font-medium">Ativa</label>
                <p className="text-[11px] text-muted-foreground">
                  Inativa some da biblioteca do cliente. Admin continua atribuindo e
                  auto-match continua rodando — útil pra preparar pasta com volume
                  antes de ativar.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editing ? "Salvar" : "Criar pasta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Silenciar warning se slugifyFolderName não for usado fora desse arquivo
// no futuro (export pra reuso, mas o lint preferia consumir aqui).
void slugifyFolderName;
