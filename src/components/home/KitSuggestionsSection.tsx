import { Lightbulb, Plus, X, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { useKitSuggestions, SuggestedKit } from "@/hooks/useKitSuggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

function SuggestionCard({
  suggestion,
  onDismiss,
  onCreateKit,
  creating,
}: {
  suggestion: SuggestedKit;
  onDismiss: () => void;
  onCreateKit: () => void;
  creating: boolean;
}) {
  const thumbnails = suggestion.designs
    .filter((d) => d.cover_image)
    .slice(0, 4);

  return (
    <Card className="overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      {/* Thumbnail grid */}
      <div className="grid grid-cols-4 gap-0.5 bg-muted">
        {thumbnails.map((d, i) => (
          <div key={d.id} className="aspect-square overflow-hidden">
            <img
              src={d.cover_image!}
              alt={d.generated_title || d.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
        {thumbnails.length < 4 &&
          Array.from({ length: 4 - thumbnails.length }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="aspect-square bg-accent flex items-center justify-center"
            >
              <span className="text-lg opacity-30">🧵</span>
            </div>
          ))}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-sm leading-tight">
            {suggestion.name}
          </h3>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Layers className="h-3 w-3" />
            {suggestion.designs.length} designs
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onCreateKit}
            disabled={creating}
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Kit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground px-2"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const KitSuggestionsSection = () => {
  const { suggestions, loading, dismiss } = useKitSuggestions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const handleCreateKit = async (suggestion: SuggestedKit) => {
    if (!user) return;
    setCreatingId(suggestion.id);

    try {
      // 1. Create the kit
      const { data: kit, error: kitError } = await db
        .from("kits")
        .insert({ name: suggestion.name })
        .select("id")
        .single();

      if (kitError) throw kitError;

      // 2. Add designs to the kit
      const designEntries = suggestion.designs.map((d, i) => ({
        kit_id: kit.id,
        design_id: d.id,
        order_index: i,
      }));

      const { error: designsError } = await db
        .from("kit_designs")
        .insert(designEntries);

      if (designsError) throw designsError;

      toast.success(`"${suggestion.name}" criado com ${suggestion.designs.length} designs!`);
      dismiss(suggestion.id);

      // Navigate to the kit detail so the user can edit
      navigate(`/library/${kit.id}`);
    } catch (err: any) {
      console.error("Error creating kit:", err);
      toast.error("Erro ao criar o kit. Tente novamente.");
    } finally {
      setCreatingId(null);
    }
  };

  if (!loading && suggestions.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Lightbulb}
        iconClassName="bg-amber-500/10 text-amber-500"
        title="Sugestões de Kits"
        subtitle="Kits gerados automaticamente com base nas suas matrizes"
      />
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onDismiss={() => dismiss(s.id)}
              onCreateKit={() => handleCreateKit(s)}
              creating={creatingId === s.id}
            />
          ))}
        </div>
      )}
    </section>
  );
};
