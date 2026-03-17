import { useState, useEffect, useMemo } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { AppLayout } from "@/components/AppLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Library, MessageCircle, CheckSquare, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useLibraryDesigns, PAGE_SIZE, SortOption } from "@/hooks/useLibraryDesigns";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { CompatibilityBanner } from "@/components/library/CompatibilityBanner";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { LibraryPagination } from "@/components/library/LibraryPagination";
import { SmartDownloadPanel } from "@/components/SmartDownloadPanel";
import { WhatsAppListModal } from "@/components/WhatsAppListModal";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

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
  const { favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { t } = useTranslation();
  const { machineFormat, machineHoopSize } = useUserMachineSettings();

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
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = search !== "" || categoryFilter !== "all" || stitchRange !== "all" || selectedTags.length > 0;

  // Sync URL params when tag changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedTags.length === 1) params.set("tag", selectedTags[0]);
    setSearchParams(params, { replace: true });
  }, [search, selectedTags, setSearchParams]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStitchRange("all");
    setSelectedTags([]);
    setPage(0);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setPage(0);
  };

  const handleFilterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectedDesigns = useMemo(() => {
    return designs.filter((d: any) => selectedIds.has(d.id)).map((d: any) => ({
      id: d.id,
      name: d.name,
      hoop_size: d.hoop_size,
    }));
  }, [designs, selectedIds]);

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
                {totalCount} {t("library.designs")}
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

        {/* Selection mode toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
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

        {/* No QuickHoopFilter - automatic filtering */}

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
        />

        {/* Smart Download */}
        {designs.length > 0 && !selectionMode && (
          <SmartDownloadPanel designIds={designs.map((d: any) => d.id)} />
        )}

        <LibraryPagination page={page} totalPages={totalPages} onPageChange={setPage} />

        {/* Floating selection bar */}
        {selectionMode && selectedIds.size > 0 && (
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
