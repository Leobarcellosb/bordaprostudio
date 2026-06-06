import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useFolders } from "@/hooks/useFolders";
import { notifyDesignsMutated } from "@/lib/designsMutationEvent";
import { deriveFoldersForDesign, type Folder } from "@/lib/folderRules";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderInput, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FolderPickerPopoverProps {
  designId: string;
  designName?: string;
  tagsText: string | null | undefined;
  /** Estado atual no banco. Vazio = auto mode (derivar das tags). */
  manualCategories: string[];
  /**
   * Chamado APÓS save com sucesso, com o novo array persistido. Caller
   * usa pra atualizar o estado local (lista de designs, badge etc).
   */
  onChange?: (next: string[]) => void;
  /** Trigger custom. Se omitido, usa o botão default (ícone folder). */
  children?: React.ReactNode;
  /** Pra inserir no fluxo de uma tabela onde já existe linha selecionada. */
  align?: "start" | "center" | "end";
}

/**
 * Popover de curadoria rápida — abre, marca/desmarca, salva otimista a
 * cada toggle. Sem botão Salvar (direct manipulation).
 *
 * SEMPRE mostra o conjunto efetivo pré-marcado: se manual_categories
 * vazio (auto mode), pré-marca as pastas derivadas das tags. Curador vê
 * a realidade, não o estado bruto do banco.
 *
 * Regra de toggle:
 *   - Marcar pasta nova → adiciona ao conjunto efetivo (semeia se em auto).
 *   - Desmarcar pasta marcada → remove. Se desmarca uma auto-derivada,
 *     materializa o resto do conjunto auto (pra remoção valer).
 *   - Se array fica vazio → volta pro modo auto (tags dirigem).
 *
 * Save é otimista: UI atualiza imediato, persiste em background. Falha
 * reverte + toast.
 */
export const FolderPickerPopover = ({
  designId,
  designName,
  tagsText,
  manualCategories,
  onChange,
  children,
  align = "end",
}: FolderPickerPopoverProps) => {
  const { data: folderList = [], error: foldersError } = useFolders();
  const [open, setOpen] = useState(false);
  // Estado local (otimista) — começa igual ao prop, evolui com toggles.
  const [local, setLocal] = useState<string[]>(manualCategories);
  const [saving, setSaving] = useState<string | null>(null); // slug em flight

  // Quando o prop muda (caller refetch), espelha — exceto se tem save
  // em flight (evita race).
  useEffect(() => {
    if (!saving) setLocal(manualCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualCategories.join(","), saving]);

  // Conjunto EFETIVO pra mostrar pré-marcado. local=[] → derivadas; else local.
  const effective = useMemo(() => {
    if (local.length > 0) return new Set(local);
    return new Set(deriveFoldersForDesign(tagsText, null, folderList));
  }, [local, tagsText, folderList]);

  // Nomes das derivadas (pra exibir no rodapé quando voltar pro auto)
  const derivedNames = useMemo(() => {
    const slugs = deriveFoldersForDesign(tagsText, null, folderList);
    return slugs
      .map((s) => folderList.find((f) => f.slug === s)?.name)
      .filter(Boolean) as string[];
  }, [tagsText, folderList]);

  // Atalho pra setar a lista inteira (usado pelo "Voltar pro auto" = []).
  const handleToggleAll = async (next: string[]) => {
    const prev = local;
    setLocal(next);
    setSaving("__all__");
    const { error } = await db
      .from("designs")
      .update({ manual_categories: next })
      .eq("id", designId);
    setSaving(null);
    if (error) {
      setLocal(prev);
      toast.error(`Erro ao salvar: ${error.message}`);
      return;
    }
    onChange?.(next);
    notifyDesignsMutated();
  };

  const handleToggle = async (folder: Folder) => {
    const wasActive = effective.has(folder.slug);
    const inAutoMode = local.length === 0;

    // Computa o próximo estado.
    let next: string[];
    if (wasActive) {
      // OFF: remove. Se em auto, materializa o resto primeiro.
      const base = inAutoMode
        ? deriveFoldersForDesign(tagsText, null, folderList)
        : local;
      next = base.filter((s) => s !== folder.slug);
    } else {
      // ON: adiciona. Se em auto, semeia derivadas + nova.
      const base = inAutoMode
        ? deriveFoldersForDesign(tagsText, null, folderList)
        : local;
      next = Array.from(new Set([...base, folder.slug]));
    }

    // Update otimista
    const prev = local;
    setLocal(next);
    setSaving(folder.slug);

    const { error } = await db
      .from("designs")
      .update({ manual_categories: next })
      .eq("id", designId);

    setSaving(null);

    if (error) {
      // Rollback
      setLocal(prev);
      toast.error(`Erro ao salvar: ${error.message}`);
      return;
    }

    onChange?.(next);
    notifyDesignsMutated();
  };

  const trigger = children ?? (
    <button
      type="button"
      className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-background/90 backdrop-blur-sm border border-border/60 text-foreground/70 hover:text-foreground hover:border-primary/40 hover:bg-background transition-colors shadow-sm"
      title="Atribuir pastas (admin)"
      onClick={(e) => e.stopPropagation()}
    >
      <FolderInput className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-80 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold">
              Pastas desta matriz{designName ? ` · ${designName}` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Marca todas as pastas onde essa matriz deve aparecer.
            </p>
          </div>

          {foldersError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
              {foldersError.message}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto">
            {folderList.map((folder) => {
              const active = effective.has(folder.slug);
              const isSaving = saving === folder.slug;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => handleToggle(folder)}
                  disabled={isSaving}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted text-foreground border border-border/60"
                  } ${!folder.is_active ? "opacity-60" : ""} ${
                    isSaving ? "opacity-50" : ""
                  }`}
                  title={!folder.is_active ? "Pasta inativa" : undefined}
                >
                  {isSaving && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline" />}
                  {folder.name}
                  {!folder.is_active && " ·"}
                </button>
              );
            })}
          </div>

          {/* Comunica modo atual — auto, manual, ou auto-vazio */}
          <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
            {local.length === 0 ? (
              derivedNames.length > 0 ? (
                <p>
                  <span className="font-semibold text-foreground">Modo automático.</span>{" "}
                  Aparece em: {derivedNames.join(", ")} (vem das tags).
                </p>
              ) : (
                <p className="text-amber-700 dark:text-amber-300">
                  <span className="font-semibold">Modo automático mas sem match.</span>{" "}
                  As tags não batem com nenhuma keyword — design fica órfão.
                </p>
              )
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p>
                  <span className="font-semibold text-foreground">Override manual</span>{" "}
                  · {local.length} pasta{local.length === 1 ? "" : "s"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => handleToggleAll([])}
                  disabled={!!saving}
                >
                  Voltar pro auto
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/** Badge "+N pastas" compacto pra mostrar em linha de tabela ao lado do trigger. */
export const FolderCountBadge = ({
  tagsText,
  manualCategories,
}: {
  tagsText: string | null | undefined;
  manualCategories: string[];
}) => {
  const { data: folderList = [] } = useFolders();
  const count = useMemo(() => {
    if (manualCategories.length > 0) return manualCategories.length;
    return deriveFoldersForDesign(tagsText, null, folderList).length;
  }, [tagsText, manualCategories, folderList]);

  const mode = manualCategories.length > 0 ? "manual" : "auto";

  if (count === 0) {
    return (
      <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-700 dark:text-amber-300">
        órfã
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${
        mode === "manual" ? "border-primary/40 text-primary" : "text-muted-foreground"
      }`}
      title={mode === "manual" ? "Override manual" : "Auto-derivada das tags"}
    >
      {count} {mode === "manual" ? "·M" : ""}
    </Badge>
  );
};
