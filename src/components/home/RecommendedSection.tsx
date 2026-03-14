import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";

export const RecommendedSection = () => {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        let categoryIds: string[] = [];

        if (user) {
          // Get categories from user's downloaded designs
          const { data: userDownloads } = await db
            .from("downloads")
            .select("kit_id")
            .eq("user_id", user.id)
            .limit(50);

          if (userDownloads && userDownloads.length > 0) {
            const kitIds = userDownloads.map((d: any) => d.kit_id);
            const { data: downloadedDesigns } = await db
              .from("designs")
              .select("category_id")
              .in("id", kitIds);

            const catCount: Record<string, number> = {};
            (downloadedDesigns || []).forEach((d: any) => {
              if (d.category_id) catCount[d.category_id] = (catCount[d.category_id] || 0) + 1;
            });
            categoryIds = Object.entries(catCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([id]) => id);
          }

          // Also check favorites
          if (categoryIds.length === 0) {
            const { data: favs } = await db
              .from("favorites")
              .select("kit_id")
              .eq("user_id", user.id)
              .limit(50);

            if (favs && favs.length > 0) {
              const favIds = favs.map((f: any) => f.kit_id);
              const { data: favDesigns } = await db
                .from("designs")
                .select("category_id")
                .in("id", favIds);

              const catCount: Record<string, number> = {};
              (favDesigns || []).forEach((d: any) => {
                if (d.category_id) catCount[d.category_id] = (catCount[d.category_id] || 0) + 1;
              });
              categoryIds = Object.entries(catCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([id]) => id);
            }
          }
        }

        let query = db
          .from("designs")
          .select("*, categories(name)")
          .eq("is_published", true);

        if (categoryIds.length > 0) {
          query = query.in("category_id", categoryIds);
        }

        const { data } = await query
          .order("created_at", { ascending: false })
          .limit(12);

        setDesigns(data || []);
      } catch (err) {
        console.error("Recommended error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  if (!loading && designs.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Sparkles}
        iconClassName="bg-secondary/10 text-secondary"
        title="Você também pode gostar"
        subtitle="Baseado nos seus downloads e favoritos"
        onViewAll={() => navigate("/library")}
      />
      <DesignCarousel designs={designs} loading={loading} />
    </section>
  );
};
