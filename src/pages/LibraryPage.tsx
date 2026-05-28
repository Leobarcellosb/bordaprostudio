import { useState, useEffect, useMemo, useCallback } from "react";
import { useFavoritesQuery, useToggleFavorite } from "@/hooks/queries/useFavoritesQuery";
import { AppLayout } from "@/components/AppLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Library,
  MessageCircle,
  CheckSquare,
  X,
  FolderOpen,
  LayoutGrid,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useLibraryDesigns, PAGE_SIZE, SortOption } from "@/hooks/useLibraryDesigns";
import { useLibraryCategories } from "@/hooks/useLibraryCategories";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { CompatibilityBanner } from "@/components/library/CompatibilityBanner";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { LibraryPagination } from "@/components/library/LibraryPagination";
import { CategoryFolderGrid } from "@/components/library/CategoryFolderGrid";
import { SmartDownloadPanel } from "@/components/SmartDownloadPanel";
import { WhatsAppListModal } from "@/components/WhatsAppListModal";
import { useUserMachineSettings, MACHINE_FORMATS } from "@/hooks/useUserMachineSettings";

type ViewMode = "folders" | "all";

// Versioned key keeps us free to change the stored shape later (rule:
// client-localstorage-schema).
const VIEW_STORAGE_KEY = "borda:library-view:v1";

function readStoredView(): ViewMode {
  if (typeof window === "undefined") return "folders";
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === "folders" || raw === "all") return raw;
  } catch {
    /* localStorage indisponível (private mode etc.) — usa default */
  }
  return "folders";
}

const LibraryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialTag = searchParams.get("tag") || "";

  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stitchRange, setStitchRange] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [page, setPage] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTag ? [initialTag] : []);
  const navigate = useNavigate();
  const { favoriteIds } = useFavoritesQuery();
  const toggleFavoriteMutation = useToggleFavorite();
  const toggleFavorite = (kitId: string) =>
    toggleFavoriteMutation.mutate({ kitId, isFavorited: favoriteIds.has(kitId) });
  const { t } = useTranslation();
  const { machineFormat, machineHoopSize } = useUserMachineSettings();
  const { isAdmin } = useAuth();

  // Admin: ver todos os formatos (ignora filtro de máquina) + análise de
  // lacuna (mostrar designs SEM um formato). effectiveShowAll garante que
  // mesmo se o state for manipulado no client, só admin ativa de fato.
  const [showAllFormats, setShowAllFormats] = useState(false);
  const [gapFormat, setGapFormat] = useState("");
  const effectiveShowAll = isAdmin && showAllFormats;

  // View mode (folders by default). Lazy initialization avoids reading
  // localStorage on every render (rule: rerender-lazy-state-init).
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredView);
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  // Build the effective search query including tags
  const effectiveSearch = selectedTags.length > 0
    ? [search, ...selectedTags].filter(Boolean).join(" ")
    : search;

  const { designs, totalCount, isLoading, categories, downloadCounts, hasIncompatible, compatibleCount } = useLibraryDesigns({
    search: effectiveSearch, categoryFilter, stitchRange, sortBy, page,
    showAllFormats: effectiveShowAll,
    gapFormat: effectiveShowAll ? gapFormat : "",
  });

  const {
    folders,
    totalDesigns: foldersTotalDesigns,
    totalCompatible: foldersTotalCompatible,
    recentPreviews,
    isLoading: foldersLoading,
  } = useLibraryCategories();

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = search !== "" || categoryFilter !== "all" || stitchRange !== "all" || selectedTags.length > 0;

  // Active category breadcrumb label (only matters in "all" view).
  const activeCategoryName = useMemo(() => {
    if (categoryFilter === "all") return null;
    return categories.find((c: any) => c.id === categoryFilter)?.name ?? null;
  }, [categoryFilter, categories]);

  // Sync URL params when tag changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedTags.length === 1) params.set("tag", selectedTags[0]);
    setSearchParams(params, { replace: true });
  }, [search, selectedTags, setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("all");
    setStitchRange("all");
    setSelectedTags([]);
    setPage(0);
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    setPage(0);
  }, []);

  const handleFilterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  /**
   * Click handler vindo do grid de "pastas". Aplica filtro de categoria
   * (ou limpa para "Ver Tudo") e salta para a view de grid plana.
   */
  const handleSelectCategory = useCallback((catId: string | "all") => {
    setCategoryFilter(catId === "all" ? "all" : catId);
    setPage(0);
    setSearch("");
    setSelectedTags([]);
    setStitchRange("all");
    setViewMode("all");
    // Limpa selection mode caso esteja ativo
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectedDesigns = useMemo(() => {
    return designs.filter((d: any) => selectedIds.has(d.id)).map((d: any) => ({
      id: d.id,
      name: d.name,
      hoop_size: d.hoop_size,
    }));
  }, [designs, selectedIds]);

  const inFolders = viewMode === "folders";
  // Header counter: em "folders" usa o total real do catálogo; em "all" usa
  // o totalCount filtrado.
  const headerCount = inFolders
    ? machineFormat
      ? foldersTotalCompatible
      : foldersTotalDesigns
    : totalCount;

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Premium header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-accent/30 to-secondary/8 p-8 md:p-10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Library className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold tracking-wide uppercase">
                {headerCount} {t("library.designs")}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight">
              {t("library.title")}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
              {t("library.subtitle")}
            </p>
            {/* Show machine settings info */}
            {machineFormat && machineHoopSize && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Formato: {machineFormat}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Bastidor: {machineHoopSize}
                </Badge>
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-10 blur-3xl bg-primary rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 opacity-8 blur-3xl bg-secondary rounded-full translate-y-1/2" />
        </div>

        {/* View toggle (folders vs flat grid) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center rounded-xl border border-border/40 bg-muted/30 p-1"
            role="tablist"
            aria-label="Modo de visualização da biblioteca"
          >
            <button
              type="button"
              role="tab"
              aria-selected={inFolders}
              onClick={() => setViewMode("folders")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                inFolders
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Por Tema
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!inFolders}
              onClick={() => setViewMode("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !inFolders
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Todas
            </button>
          </div>

          {/* Selection mode toggle — só faz sentido na view "Todas" */}
          {!inFolders && (
            <div className="flex items-center gap-2">
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
                className="gap-2 rounded-xl"
              >
                {selectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                {selectionMode ? "Cancelar seleção" : "Selecionar matrizes"}
              </Button>
              {selectionMode && selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => setWhatsappModalOpen(true)}
                  className="gap-2 rounded-xl"
                >
                  <MessageCircle className="h-4 w-4" />
                  Gerar lista para cliente ({selectedIds.size})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Controle admin: ver todos os formatos + análise de lacuna.
            Só renderiza pra admin. effectiveShowAll garante segurança
            mesmo se o state fosse forçado no client. */}
        {isAdmin && !inFolders && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <button
              type="button"
              onClick={() => {
                setShowAllFormats((v) => !v);
                setGapFormat("");
                setPage(0);
              }}
              aria-pressed={showAllFormats}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showAllFormats
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border/60 text-foreground hover:border-primary/40"
              }`}
            >
              <Eye className="h-4 w-4" />
              Ver todos os formatos (admin)
            </button>

            {showAllFormats && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Lacuna — designs sem:</span>
                {MACHINE_FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      setGapFormat((g) => (g === fmt ? "" : fmt));
                      setPage(0);
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                      gapFormat === fmt
                        ? "bg-amber-500 text-white"
                        : "bg-background border border-border/60 hover:border-amber-400"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
                {gapFormat && (
                  <span className="text-xs text-amber-600 font-medium ml-1">
                    {totalCount} sem {gapFormat}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Breadcrumb: aparece em "Todas" quando há uma categoria ativa,
            permitindo voltar para o grid de pastas com um clique. */}
        {!inFolders && activeCategoryName && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            <button
              type="button"
              onClick={() => setViewMode("folders")}
              className="hover:text-foreground transition-colors"
            >
              Biblioteca
            </button>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            <span className="text-foreground font-medium">{activeCategoryName}</span>
          </nav>
        )}

        {inFolders ? (
          <CategoryFolderGrid
            folders={folders}
            totalDesigns={foldersTotalDesigns}
            totalCompatible={foldersTotalCompatible}
            recentPreviews={recentPreviews}
            machineFormat={machineFormat}
            isLoading={foldersLoading}
            onSelectCategory={handleSelectCategory}
          />
        ) : (
          <>
            {/* No modo admin "ver todos", o banner de incompatibilidade
                não faz sentido (admin está vendo tudo de propósito). */}
            {!effectiveShowAll && (
              <CompatibilityBanner
                machineFormat={machineFormat}
                machineHoopSize={machineHoopSize}
                hasIncompatible={hasIncompatible}
                compatibleCount={compatibleCount}
                totalShown={designs.length}
                isLoading={isLoading}
              />
            )}

            <LibraryFilters
              search={search}
              onSearchChange={handleFilterChange(setSearch)}
              categoryFilter={categoryFilter}
              onCategoryChange={handleFilterChange(setCategoryFilter)}
              stitchRange={stitchRange}
              onStitchRangeChange={handleFilterChange(setStitchRange)}
              sortBy={sortBy}
              onSortChange={setSortBy}
              categories={categories}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              totalCount={totalCount}
              filteredCount={totalCount}
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
            />

            <LibraryGrid
              designs={designs}
              downloadCounts={downloadCounts}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onDesignClick={(id) => navigate(`/library/${id}`)}
              isLoading={isLoading}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              showFormats={effectiveShowAll}
            />

            {/* Smart Download */}
            {designs.length > 0 && !selectionMode && (
              <SmartDownloadPanel designIds={designs.map((d: any) => d.id)} />
            )}

            <LibraryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}

        {/* Floating selection bar */}
        {!inFolders && selectionMode && selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/60 shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 animate-fade-in">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? "matriz" : "matrizes"}
            </span>
            <Button size="sm" className="gap-2 rounded-xl" onClick={() => setWhatsappModalOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              Gerar lista
            </Button>
            <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <WhatsAppListModal
          open={whatsappModalOpen}
          onOpenChange={setWhatsappModalOpen}
          designs={selectedDesigns}
        />
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
