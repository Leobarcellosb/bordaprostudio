import { Card, CardContent } from "@/components/ui/card";
import { DesignCard } from "@/components/cards/DesignCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";

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
}

export const LibraryGrid = ({
  designs, downloadCounts, favoriteIds, onToggleFavorite, onDesignClick,
  isLoading, hasActiveFilters, onClearFilters, selectionMode, selectedIds, onToggleSelect,
}: LibraryGridProps) => {
  const { t } = useTranslation();

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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {designs.map((design: any) => (
        <DesignCard
          key={design.id}
          id={design.id}
          name={design.name}
          coverImage={design.cover_image}
          category={design.categories?.name}
          tags={(design.tags_text || "").split(",").map((t: string) => t.trim()).filter(Boolean)}
          downloadCount={downloadCounts[design.id]}
          isFavorite={favoriteIds.has(design.id)}
          onToggleFavorite={() => onToggleFavorite(design.id)}
          onClick={() => onDesignClick(design.id)}
        />
      ))}
    </div>
  );
};
