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
        const { data: kitRows } = await db
          .from("kits")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);

        if (kitRows && kitRows.length > 0) {
          const { data: relations } = await db
            .from("kit_designs")
            .select("kit_id");

          const countMap: Record<string, number> = {};
          (relations || []).forEach((r: any) => {
            countMap[r.kit_id] = (countMap[r.kit_id] || 0) + 1;
          });

          setKits(kitRows.map((k: any) => ({ ...k, designCount: countMap[k.id] || 0 })));
        }
      } catch (err) {
        console.error("KitsSection error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (!loading && kits.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Package}
        iconClassName="bg-primary/10 text-primary"
        title="Kits de Matrizes"
        subtitle="Coleções prontas para baixar"
        onViewAll={() => navigate("/collections")}
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
              name={kit.name}
              coverImage={kit.cover_image}
              designCount={kit.designCount}
              onClick={() => navigate(`/collections/${kit.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
