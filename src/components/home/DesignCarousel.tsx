import { DesignCard } from "@/components/cards/DesignCard";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface DesignCarouselProps {
  designs: any[];
  loading?: boolean;
  downloadCounts?: Record<string, number>;
}

export const DesignCarousel = ({ designs, loading, downloadCounts }: DesignCarouselProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (designs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {designs.map((d: any) => (
        <DesignCard
          key={d.id}
          id={d.id}
          name={d.name}
          coverImage={d.cover_image}
          category={d.categories?.name || d.category_name}
          tags={[]}
          downloadCount={downloadCounts?.[d.id] || d.download_count || undefined}
          onClick={() => navigate(`/library/${d.id}`)}
        />
      ))}
    </div>
  );
};
