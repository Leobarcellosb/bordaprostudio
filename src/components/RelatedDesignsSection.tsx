import { useNavigate } from "react-router-dom";
import { DesignCard } from "@/components/cards/DesignCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import type { RelatedDesign } from "@/hooks/useRelatedDesigns";

interface Props {
  designs: RelatedDesign[];
  loading: boolean;
}

export function RelatedDesignsSection({ designs, loading }: Props) {
  const navigate = useNavigate();

  if (!loading && designs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold">Você também pode gostar</h2>
          <p className="text-sm text-muted-foreground">Matrizes semelhantes por tags, categoria e tema</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {designs.map(d => (
            <DesignCard
              key={d.id}
              id={d.id}
              name={d.name}
              coverImage={d.cover_image}
              category={d.category_name || undefined}
              tags={d.tags}
              onClick={() => navigate(`/library/${d.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
