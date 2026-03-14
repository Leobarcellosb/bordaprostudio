import { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { AppLayout } from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import { Library } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { useLibraryDesigns, PAGE_SIZE, SortOption } from "@/hooks/useLibraryDesigns";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { LibraryPagination } from "@/components/library/LibraryPagination";

const LibraryPage = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hoopFilter, setHoopFilter] = useState("all");
  const [stitchRange, setStitchRange] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { t } = useTranslation();

  const { designs, totalCount, isLoading, categories, downloadCounts } = useLibraryDesigns({
    search, categoryFilter, hoopFilter, stitchRange, sortBy, page,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = search !== "" || categoryFilter !== "all" || hoopFilter !== "all" || stitchRange !== "all";

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setHoopFilter("all");
    setStitchRange("all");
    setPage(0);
  };

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

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
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-10 blur-3xl bg-primary rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 opacity-8 blur-3xl bg-secondary rounded-full translate-y-1/2" />
        </div>

        <LibraryFilters
          search={search}
          onSearchChange={handleFilterChange(setSearch)}
          categoryFilter={categoryFilter}
          onCategoryChange={handleFilterChange(setCategoryFilter)}
          hoopFilter={hoopFilter}
          onHoopChange={handleFilterChange(setHoopFilter)}
          stitchRange={stitchRange}
          onStitchRangeChange={handleFilterChange(setStitchRange)}
          sortBy={sortBy}
          onSortChange={setSortBy}
          categories={categories}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          totalCount={totalCount}
          filteredCount={totalCount}
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
        />

        <LibraryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
