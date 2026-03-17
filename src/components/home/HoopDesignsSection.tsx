import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

export const HoopDesignsSection = () => {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { machineFormat, machineHoopSize } = useUserMachineSettings();

  useEffect(() => {
    const fetch = async () => {
      try {
        // Use the user's locked hoop size
        const hoopSize = machineHoopSize || "13x18";

        let query = db
          .from("designs")
          .select("*, categories(name)")
          .eq("is_published", true)
          .eq("hoop_size", hoopSize)
          .order("created_at", { ascending: false })
          .limit(24);

        const { data } = await query;

        let filtered = data || [];

        if (machineFormat && filtered.length > 0) {
          const ids = filtered.map((d: any) => d.id);
          const { data: files } = await db
            .from("kit_arquivos").select("design_id").in("design_id", ids).ilike("format", machineFormat);
          const validIds = new Set((files || []).map((f: any) => f.design_id));
          filtered = filtered.filter((d: any) => validIds.has(d.id));
        }

        setDesigns(filtered.slice(0, 12));
      } catch (err) {
        console.error("HoopDesigns error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, machineFormat, machineHoopSize]);

  if (!loading && designs.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Target}
        iconClassName="bg-accent text-accent-foreground"
        title="Para o seu Bastidor"
        subtitle={`Designs compatíveis com bastidor ${machineHoopSize || "13x18"}`}
        onViewAll={() => navigate("/library")}
      />
      <DesignCarousel designs={designs} loading={loading} />
    </section>
  );
};
