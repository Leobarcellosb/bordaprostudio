import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";

export const PopularDesignsSection = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: downloads } = await db.from("downloads").select("kit_id");
        if (!downloads || downloads.length === 0) { setLoading(false); return; }

        const countMap: Record<string, number> = {};
        downloads.forEach((d: any) => { countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1; });

        const topIds = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([id]) => id);

        const { data: topDesigns } = await db
          .from("designs")
          .select("*, categories(name)")
          .in("id", topIds)
          .eq("is_published", true);

        // Sort by download count
        const sorted = (topDesigns || []).sort((a: any, b: any) => (countMap[b.id] || 0) - (countMap[a.id] || 0));
        setDesigns(sorted);
        setDownloadCounts(countMap);
      } catch (err) {
        console.error("PopularDesigns error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (!loading && designs.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={TrendingUp}
        iconClassName="bg-secondary/10 text-secondary"
        title="Mais Baixadas"
        subtitle="Os designs mais populares da plataforma"
        onViewAll={() => navigate("/library")}
      />
      <DesignCarousel designs={designs} loading={loading} downloadCounts={downloadCounts} />
    </section>
  );
};
