import { Card, CardContent } from "@/components/ui/card";
import { DesignCard } from "@/components/cards/DesignCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { FolderPickerPopover, FolderCountBadge } from "@/components/admin/FolderPickerPopover";
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

interface LibraryGridProps {
  designs: any[];
  downloadCounts: Record<string, number>;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onDesignClick: (id: string) => void;
  isLoading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  /** Admin: mostra badges com os formatos disponíveis em cada card. */
  showFormats?: boolean;
  /** Formato de máquina do user — pro empty-state explicar o filtro. */
  machineFormat?: string | null;
}

export const LibraryGrid = ({
  designs, downloadCounts, favoriteIds, onToggleFavorite, onDesignClick,
  isLoading, hasActiveFilters, onClearFilters, selectionMode, selectedIds, onToggleSelect,
  showFormats = false, machineFormat = null,
}: LibraryGridProps) => {
  const { t } = useTranslation();
  // Gate ESTRITO: cliente NUNCA vê o overlay de pastas. isAdmin é boolean
  // do AuthContext (server-checked via user_roles); não dá pra forçar
  // pelo client.
  const { isAdmin } = useAuth();

  // Mantém estado local das manual_categories por design id (otimista,
  // populado pelo onChange do popover sem refetch da query principal).
  const [manualOverrides, setManualOverrides] = useState<Record<string, string[]>>({});
  const handleFolderChange = useCallback((id: string, next: string[]) => {
    setManualOverrides((prev) => ({ ...prev, [id]: next }));
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <Card className="border-border/30 bg-gradient-to-br from-muted/30 to-accent/20 rounded-2xl">
        <CardContent className="py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">{t("library.noResults")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {t("library.noResultsHint")}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-5 rounded-xl" onClick={onClearFilters}>
              {t("library.clearAllFilters")}
            </Button>
          )}
          {/* Contexto de formato: a biblioteca filtra pelo formato da máquina
              do user. Quando o grid zera, lembra disso + oferece o caminho de
              troca (Settings). Suprimido no modo admin "ver todos os formatos"
              (showFormats), onde o filtro de formato não está ativo. */}
          {machineFormat && !showFormats && (
            <p className="text-xs text-muted-foreground mt-4 max-w-sm mx-auto leading-relaxed">
              {t("library.formatFilterNote").replace("{format}", machineFormat)}{" "}
              <Link
                to="/settings"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {t("library.changeFormatCta")}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {designs.map((design: any) => {
        // Manual categories: usa override otimista se houver, senão o
        // valor do banco. Pra cliente isso nem chega a ser computado
        // (não há overlay).
        const manualCats: string[] = manualOverrides[design.id]
          ?? (Array.isArray(design.manual_categories) ? design.manual_categories : []);
        return (
        <div key={design.id} className="relative group/grid">
          {/* Admin only: overlay discreto de pastas no canto inferior-esquerdo.
              Click stoppropaga pra não abrir o detalhe da matriz. Estado em
              manualOverrides[id] é local-otimista (popover salva no banco
              direto). Cliente nunca vê nada disso. */}
          {isAdmin && (
            <div
              className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 opacity-0 group-hover/grid:opacity-100 transition-opacity duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <FolderCountBadge tagsText={design.tags_text} manualCategories={manualCats} />
              <FolderPickerPopover
                designId={design.id}
                designName={design.name}
                tagsText={design.tags_text}
                manualCategories={manualCats}
                onChange={(next) => handleFolderChange(design.id, next)}
                align="start"
              />
            </div>
          )}
          {/* Admin: badges de formato no topo do card (PES, JEF, DST...).
              Se o design não tem arquivo, marca "sem arquivo" em âmbar —
              útil pra análise de lacuna do catálogo. */}
          {showFormats && (
            <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-1 justify-end max-w-[75%]">
              {(design.availableFormats?.length ?? 0) > 0 ? (
                design.availableFormats.map((fmt: string) => (
                  <span
                    key={fmt}
                    className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-background/90 backdrop-blur-sm border border-border/60 text-foreground shadow-sm"
                  >
                    {fmt}
                  </span>
                ))
              ) : (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-amber-500/90 text-white shadow-sm">
                  sem arquivo
                </span>
              )}
            </div>
          )}
          {selectionMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(design.id); }}
              className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                selectedIds?.has(design.id)
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background/80 backdrop-blur-sm border-border/60 hover:border-primary/40"
              }`}
            >
              {selectedIds?.has(design.id) && (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}
          <DesignCard
            id={design.id}
            name={design.name}
            coverImage={design.cover_image}
            category={design.categories?.name}
            tags={(design.tags_text || "").split(",").map((t: string) => t.trim()).filter(Boolean)}
            downloadCount={downloadCounts[design.id]}
            isFavorite={favoriteIds.has(design.id)}
            onToggleFavorite={() => onToggleFavorite(design.id)}
            onClick={() => selectionMode ? onToggleSelect?.(design.id) : onDesignClick(design.id)}
          />
        </div>
        );
      })}
    </div>
  );
};
