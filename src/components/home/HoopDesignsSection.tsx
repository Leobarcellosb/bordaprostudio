import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";
import { designFitsHoop } from "@/lib/machineFilter";

export const HoopDesignsSection = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { machineHoopSize } = useUserMachineSettings();

  const hoopSize = machineHoopSize || "13x18";

  useEffect(() => {
    const fetch = async () => {
      try {
        // "Cabe no bastidor" agora é por DIMENSÃO (designFitsHoop), não bucket
        // hoop_size. Busca um pool recente e filtra pelos que CABEM (rotação +
        // fail-open), pegando 12. (Antes: .eq("hoop_size") = bucket exato.)
        const { data } = await db
          .from("designs")
          .select("*, categories(name)")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(120);

        const fitting = (data || []).filter((d: any) =>
          designFitsHoop(d.width_mm, d.height_mm, machineHoopSize),
        );
        setDesigns(fitting.slice(0, 12));
      } catch (err) {
        console.error("HoopDesigns error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [machineHoopSize]);

  if (!loading && designs.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Target}
        iconClassName="bg-accent text-accent-foreground"
        title="Para o seu Bastidor"
        subtitle={`Designs compatíveis com bastidor ${hoopSize}`}
        onViewAll={() => navigate("/library")}
      />
      <DesignCarousel designs={designs} loading={loading} />
    </section>
  );
};
