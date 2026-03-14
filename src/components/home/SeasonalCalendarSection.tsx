import { CalendarDays, Library, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { useSeasonalCalendar, EnrichedTheme } from "@/hooks/useSeasonalCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

function ThemeCard({
  theme,
  onCreateCollection,
  onBrowse,
  creating,
}: {
  theme: EnrichedTheme;
  onCreateCollection: () => void;
  onBrowse: () => void;
  creating: boolean;
}) {
  const thumbnails = theme.matchingDesigns
    .filter((d) => d.cover_image)
    .slice(0, 3);

  return (
    <Card className="overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-3xl">{theme.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-sm leading-tight">
              {theme.name}
            </h3>
            {theme.matchCount > 0 ? (
              <Badge variant="secondary" className="mt-1.5 text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                {theme.matchCount} {theme.matchCount === 1 ? "matriz" : "matrizes"} relacionada{theme.matchCount !== 1 && "s"}
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhuma matriz encontrada ainda
              </p>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {thumbnails.length > 0 && (
          <div className="flex gap-1.5">
            {thumbnails.map((d) => (
              <div
                key={d.id}
                className="w-12 h-12 rounded-lg overflow-hidden border border-border/40"
              >
                <img
                  src={d.cover_image!}
                  alt={d.generated_title || d.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
            {theme.matchCount > 3 && (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                +{theme.matchCount - 3}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {theme.matchCount >= 2 && (
            <Button
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={onCreateCollection}
              disabled={creating}
            >
              <Plus className="h-3.5 w-3.5" />
              Criar coleção
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs"
            onClick={onBrowse}
          >
            <Library className="h-3.5 w-3.5" />
            Ver matrizes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const SeasonalCalendarSection = () => {
  const { themes, loading, currentMonth } = useSeasonalCalendar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creatingTheme, setCreatingTheme] = useState<string | null>(null);

  const handleCreateCollection = async (theme: EnrichedTheme) => {
    if (!user) return;
    setCreatingTheme(theme.name);

    try {
      const { data: kit, error: kitError } = await db
        .from("kits")
        .insert({ name: `Coleção ${theme.name}` })
        .select("id")
        .single();

      if (kitError) throw kitError;

      const entries = theme.matchingDesigns.map((d, i) => ({
        kit_id: kit.id,
        design_id: d.id,
        order_index: i,
      }));

      if (entries.length > 0) {
        const { error: designsError } = await db
          .from("kit_designs")
          .insert(entries);
        if (designsError) throw designsError;
      }

      toast.success(`"Coleção ${theme.name}" criada com ${entries.length} matrizes!`);
      navigate(`/library/${kit.id}`);
    } catch (err: any) {
      console.error("Error creating seasonal collection:", err);
      toast.error("Erro ao criar a coleção. Tente novamente.");
    } finally {
      setCreatingTheme(null);
    }
  };

  const handleBrowse = (theme: EnrichedTheme) => {
    // Navigate to library with search term
    const keyword = theme.keywords[0] || theme.name.toLowerCase();
    navigate(`/library?search=${encodeURIComponent(keyword)}`);
  };

  if (!loading && themes.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={CalendarDays}
        iconClassName="bg-violet-500/10 text-violet-500"
        title="Calendário Criativo"
        subtitle={currentMonth ? `Temas sugeridos para ${currentMonth.label}` : "Temas sazonais"}
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.name}
              theme={theme}
              onCreateCollection={() => handleCreateCollection(theme)}
              onBrowse={() => handleBrowse(theme)}
              creating={creatingTheme === theme.name}
            />
          ))}
        </div>
      )}
    </section>
  );
};
