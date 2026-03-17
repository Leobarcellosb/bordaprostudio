import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

export const HoopDesignsSection = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { machineHoopSize } = useUserMachineSettings();

  const hoopSize = machineHoopSize || "13x18";

  useEffect(() => {
    const fetch = async () => {
      try {
        // Prioritize matching hoop, but fill with others if needed
        const { data: matched } = await db
          .from("designs")
          .select("*, categories(name)")
          .eq("is_published", true)
          .eq("hoop_size", hoopSize)
          .order("created_at", { ascending: false })
          .limit(12);

        let results = matched || [];

        // If less than 12, fill with other sizes
        if (results.length < 12) {
          const existingIds = results.map((d: any) => d.id);
          const remaining = 12 - results.length;
          const { data: others } = await db
            .from("designs")
            .select("*, categories(name)")
            .eq("is_published", true)
            .neq("hoop_size", hoopSize)
            .order("created_at", { ascending: false })
            .limit(remaining);

          if (others) {
            results = [...results, ...others.filter((d: any) => !existingIds.includes(d.id))];
          }
        }

        setDesigns(results.slice(0, 12));
      } catch (err) {
        console.error("HoopDesigns error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [hoopSize]);

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
