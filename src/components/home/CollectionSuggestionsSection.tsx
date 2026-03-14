import { Sparkles, Plus, X, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { useCollectionDetector, SuggestedCollection } from "@/hooks/useCollectionDetector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

function CollectionCard({
  collection,
  onDismiss,
  onCreate,
  creating,
}: {
  collection: SuggestedCollection;
  onDismiss: () => void;
  onCreate: () => void;
  creating: boolean;
}) {
  const thumbnails = collection.designs
    .filter((d) => d.cover_image)
    .slice(0, 4);

  return (
    <Card className="overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      <div className="grid grid-cols-4 gap-0.5 bg-muted">
        {thumbnails.map((d) => (
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
              key={`ph-${i}`}
              className="aspect-square bg-accent flex items-center justify-center"
            >
              <span className="text-lg opacity-30">🧵</span>
            </div>
          ))}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-sm leading-tight">
            {collection.name}
          </h3>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Layers className="h-3 w-3" />
            {collection.designs.length} matrizes
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onCreate}
            disabled={creating}
          >
            <Plus className="h-3.5 w-3.5" />
            Criar coleção
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

export const CollectionSuggestionsSection = () => {
  const { collections, loading, dismiss } = useCollectionDetector();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const handleCreate = async (collection: SuggestedCollection) => {
    if (!user) return;
    setCreatingId(collection.id);

    try {
      // Create kit
      const { data: kit, error: kitError } = await db
        .from("kits")
        .insert({ name: collection.name })
        .select("id")
        .single();

      if (kitError) throw kitError;

      // Add designs
      const entries = collection.designs.map((d, i) => ({
        kit_id: kit.id,
        design_id: d.id,
        order_index: i,
      }));

      const { error: designsError } = await db
        .from("kit_designs")
        .insert(entries);

      if (designsError) throw designsError;

      toast.success(`"${collection.name}" criada com ${collection.designs.length} matrizes!`);
      dismiss(collection.id);
      navigate(`/library/${kit.id}`);
    } catch (err: any) {
      console.error("Error creating collection:", err);
      toast.error("Erro ao criar a coleção. Tente novamente.");
    } finally {
      setCreatingId(null);
    }
  };

  if (!loading && collections.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Sparkles}
        iconClassName="bg-violet-500/10 text-violet-500"
        title="Coleções Sugeridas"
        subtitle="Coleções detectadas automaticamente com base nas suas matrizes"
      />
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {collections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              onDismiss={() => dismiss(c.id)}
              onCreate={() => handleCreate(c)}
              creating={creatingId === c.id}
            />
          ))}
        </div>
      )}
    </section>
  );
};
