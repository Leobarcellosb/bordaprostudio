import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

export const PopularDesignsSection = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { machineFormat, machineHoopSize } = useUserMachineSettings();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: downloads } = await db.from("downloads").select("kit_id");
        if (!downloads || downloads.length === 0) { setLoading(false); return; }

        const countMap: Record<string, number> = {};
        downloads.forEach((d: any) => { countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1; });

        const topIds = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 24)
          .map(([id]) => id);

        let query = db
          .from("designs")
          .select("*, categories(name)")
          .in("id", topIds)
          .eq("is_published", true);

        if (machineHoopSize) {
          query = query.eq("hoop_size", machineHoopSize);
        }

        const { data: topDesigns } = await query;

        let filtered = topDesigns || [];

        // Filter by format
        if (machineFormat && filtered.length > 0) {
          const ids = filtered.map((d: any) => d.id);
          const { data: files } = await db
            .from("kit_arquivos")
            .select("design_id")
            .in("design_id", ids)
            .ilike("format", machineFormat);
          const validIds = new Set((files || []).map((f: any) => f.design_id));
          filtered = filtered.filter((d: any) => validIds.has(d.id));
        }

        const sorted = filtered.sort((a: any, b: any) => (countMap[b.id] || 0) - (countMap[a.id] || 0)).slice(0, 12);
        setDesigns(sorted);
        setDownloadCounts(countMap);
      } catch (err) {
        console.error("PopularDesigns error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [machineFormat, machineHoopSize]);

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
