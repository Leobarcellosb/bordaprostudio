import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { DesignCarousel } from "./DesignCarousel";

export const HoopDesignsSection = () => {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [hoopSize, setHoopSize] = useState("13x18");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        let detectedHoop = "13x18";

        if (user) {
          // Detect most frequent hoop from user's downloads
          const { data: userDownloads } = await db
            .from("downloads")
            .select("kit_id")
            .eq("user_id", user.id)
            .limit(100);

          if (userDownloads && userDownloads.length > 0) {
            const kitIds = userDownloads.map((d: any) => d.kit_id);
            const { data: downloadedDesigns } = await db
              .from("designs")
              .select("hoop_size")
              .in("id", kitIds);

            if (downloadedDesigns && downloadedDesigns.length > 0) {
              const hoopCount: Record<string, number> = {};
              downloadedDesigns.forEach((d: any) => {
                if (d.hoop_size) hoopCount[d.hoop_size] = (hoopCount[d.hoop_size] || 0) + 1;
              });
              const sorted = Object.entries(hoopCount).sort((a, b) => b[1] - a[1]);
              if (sorted.length > 0) detectedHoop = sorted[0][0];
            }
          }
        }

        setHoopSize(detectedHoop);

        const { data } = await db
          .from("designs")
          .select("*, categories(name)")
          .eq("is_published", true)
          .eq("hoop_size", detectedHoop)
          .order("created_at", { ascending: false })
          .limit(12);

        setDesigns(data || []);
      } catch (err) {
        console.error("HoopDesigns error:", err);
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
