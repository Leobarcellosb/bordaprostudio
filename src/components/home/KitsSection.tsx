import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { KitCard } from "@/components/cards/KitCard";
import { Skeleton } from "@/components/ui/skeleton";

export const KitsSection = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await db
          .from("premium_kits")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(6);

        setKits(data || []);
      } catch (err) {
        console.error("KitsSection error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  

  return (
    <section>
      <SectionHeader
        icon={Package}
        iconClassName="bg-primary/10 text-primary"
        title="Kits de Matrizes"
        subtitle="Coleções prontas para baixar"
        onViewAll={() => navigate("/kits")}
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {kits.map((kit: any) => (
            <KitCard
              key={kit.id}
              name={kit.title}
              coverImage={kit.cover_image}
              designCount={kit.designs_count}
              onClick={() => navigate(`/kits/${kit.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
