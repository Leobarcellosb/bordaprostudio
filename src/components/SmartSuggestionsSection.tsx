import { useNavigate } from "react-router-dom";
import { DesignCard } from "@/components/cards/DesignCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Layers, ShoppingBag } from "lucide-react";
import type { SmartSuggestions } from "@/hooks/useSmartSuggestions";

interface SectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  designs: SmartSuggestions["combinaCom"];
}

function SuggestionSection({ title, subtitle, icon, designs }: SectionProps) {
  const navigate = useNavigate();

  if (designs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">{icon}</div>
        <div>
          <h2 className="text-xl font-display font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {designs.map(d => (
          <DesignCard
            key={d.id}
            id={d.id}
            name={d.name}
            coverImage={d.cover_image}
            category={d.category_name || undefined}
            tags={d.tags.slice(0, 3)}
            onClick={() => navigate(`/library/${d.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

interface Props {
  suggestions: SmartSuggestions;
}

export function SmartSuggestionsSection({ suggestions }: Props) {
  const { combinaCom, completeSuaColecao, podeVenderJunto, loading } = suggestions;

  const hasAnySuggestion = combinaCom.length > 0 || completeSuaColecao.length > 0 || podeVenderJunto.length > 0;

  if (!loading && !hasAnySuggestion) return null;

  return (
    <div className="space-y-10">
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <SuggestionSection
            title="Combina com esta matriz"
            subtitle="Matrizes relacionadas por categoria, tags e tema"
            icon={<Sparkles className="h-5 w-5 text-primary" />}
            designs={combinaCom}
          />
          <SuggestionSection
            title="Complete sua coleção"
            subtitle="Outras matrizes do mesmo grupo temático"
            icon={<Layers className="h-5 w-5 text-violet-500" />}
            designs={completeSuaColecao}
          />
          <SuggestionSection
            title="Pode vender junto"
            subtitle="Matrizes complementares que fazem sentido comercial juntas"
            icon={<ShoppingBag className="h-5 w-5 text-emerald-500" />}
            designs={podeVenderJunto}
          />
        </>
      )}
    </div>
  );
}
