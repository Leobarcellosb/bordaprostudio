import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

export const NewDesignsSection = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { machineFormat, machineHoopSize } = useUserMachineSettings();

  useEffect(() => {
    const fetch = async () => {
      let query = db
        .from("designs")
        .select("*, categories(name)")
        .eq("is_published", true);

      // Auto-filter by user's hoop size
      if (machineHoopSize) {
        query = query.eq("hoop_size", machineHoopSize);
      }

      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(12);

      // Further filter by format if set
      let filtered = data || [];
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

      setDesigns(filtered);
      setLoading(false);
    };
    fetch();
  }, [machineFormat, machineHoopSize]);

  return (
    <section>
      <SectionHeader
        icon={Clock}
        iconClassName="bg-primary/10 text-primary"
        title="Novas Matrizes"
        subtitle="Adicionadas recentemente à plataforma"
        onViewAll={() => navigate("/library")}
      />
      <DesignCarousel designs={designs} loading={loading} />
    </section>
  );
};
