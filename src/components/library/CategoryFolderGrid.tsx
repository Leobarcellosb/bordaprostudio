import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";
import { CategoryFolderCard } from "./CategoryFolderCard";
import type { CategoryFolder } from "@/hooks/useLibraryCategories";

interface CategoryFolderGridProps {
  folders: CategoryFolder[];
  totalDesigns: number;
  totalCompatible: number;
  recentPreviews: string[];
  machineFormat: string | null;
  isLoading: boolean;
  /** Called with `"all"` for the "Ver Tudo" card or a category id otherwise. */
  onSelectCategory: (categoryId: string | "all") => void;
}

const SKELETON_SLOTS = Array.from({ length: 8 });

export const CategoryFolderGrid = ({
  folders,
  totalDesigns,
  totalCompatible,
  recentPreviews,
  machineFormat,
  isLoading,
  onSelectCategory,
}: CategoryFolderGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {SKELETON_SLOTS.map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (folders.length === 0 && totalDesigns === 0) {
    return (
      <Card className="border-border/30 bg-gradient-to-br from-muted/30 to-accent/20 rounded-2xl">
        <CardContent className="py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
            <FolderOpen className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">
            Nenhuma categoria publicada
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Quando matrizes forem publicadas e categorizadas, elas aparecem aqui
            agrupadas por tema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      <CategoryFolderCard
        name="Ver Tudo"
        previewImages={recentPreviews}
        totalCount={totalDesigns}
        compatibleCount={totalCompatible}
        machineFormat={machineFormat}
        onClick={() => onSelectCategory("all")}
        isAll
      />
      {folders.map((f) => (
        <CategoryFolderCard
          key={f.id}
          name={f.name}
          previewImages={f.previewImages}
          totalCount={f.totalCount}
          compatibleCount={f.compatibleCount}
          machineFormat={machineFormat}
          onClick={() => onSelectCategory(f.id)}
        />
      ))}
    </div>
  );
};
