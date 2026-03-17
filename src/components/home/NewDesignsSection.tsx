import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";

export const NewDesignsSection = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await db
        .from("designs")
        .select("*, categories(name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(12);

      setDesigns(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

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
