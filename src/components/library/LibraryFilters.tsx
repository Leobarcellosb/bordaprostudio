import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { HOOP_SIZE_OPTIONS } from "@/lib/hoopSize";
import { SortOption } from "@/hooks/useLibraryDesigns";

const STITCH_RANGES = [
  { value: "all", label: "Todos os pontos" },
  { value: "0-5000", label: "Até 5.000" },
  { value: "5000-15000", label: "5.000 – 15.000" },
  { value: "15000-30000", label: "15.000 – 30.000" },
  { value: "30000-0", label: "30.000+" },
];

interface LibraryFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  hoopFilter: string;
  onHoopChange: (v: string) => void;
  stitchRange: string;
  onStitchRangeChange: (v: string) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  categories: any[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export const LibraryFilters = ({
  search, onSearchChange,
  categoryFilter, onCategoryChange,
  hoopFilter, onHoopChange,
  stitchRange, onStitchRangeChange,
  sortBy, onSortChange,
  categories,
  hasActiveFilters, onClearFilters,
  totalCount, filteredCount,
}: LibraryFiltersProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder={t("library.searchPlaceholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 bg-muted/30 border-border/40 focus:bg-background focus:border-primary/30 transition-colors rounded-xl"
          />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full sm:w-44 h-11 bg-muted/30 border-border/40 rounded-xl">
              <SelectValue placeholder={t("library.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("library.allCategories")}</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={hoopFilter} onValueChange={onHoopChange}>
            <SelectTrigger className="w-full sm:w-36 h-11 bg-muted/30 border-border/40 rounded-xl">
              <SelectValue placeholder={t("library.allHoops")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("library.allHoops")}</SelectItem>
              {HOOP_SIZE_OPTIONS.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stitchRange} onValueChange={onStitchRangeChange}>
            <SelectTrigger className="w-full sm:w-40 h-11 bg-muted/30 border-border/40 rounded-xl">
              <SelectValue placeholder="Pontos" />
            </SelectTrigger>
            <SelectContent>
              {STITCH_RANGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-44 h-11 bg-muted/30 border-border/40 rounded-xl">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="most_downloaded">Mais baixados</SelectItem>
              <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && filteredCount > 0 && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredCount}</span>{" "}
            {filteredCount === 1 ? t("library.designFound") : t("library.designsFound")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            onClick={onClearFilters}
          >
            {t("library.clearFilters")}
          </Button>
        </div>
      )}
    </div>
  );
};
