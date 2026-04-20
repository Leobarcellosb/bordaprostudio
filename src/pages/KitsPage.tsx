import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { KitCard } from "@/components/cards/KitCard";
import { db } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

const KitsPage = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data: kitRows } = await db
          .from("kits")
          .select("*")
          .order("created_at", { ascending: false });
        if (cancelled) return;

        if (kitRows && kitRows.length > 0) {
          const { data: relations } = await db
            .from("kit_designs")
            .select("kit_id");
          if (cancelled) return;

          const countMap: Record<string, number> = {};
          (relations || []).forEach((r: any) => {
            countMap[r.kit_id] = (countMap[r.kit_id] || 0) + 1;
          });

          setKits(kitRows.map((k: any) => ({ ...k, designCount: countMap[k.id] || 0 })));
        }
      } catch (err) {
        console.error("[KitsPage] fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Kits de Matrizes</h1>
            <p className="text-sm text-muted-foreground">Coleções de matrizes para download</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-xl" />
            ))}
          </div>
        ) : kits.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Nenhum kit disponível ainda.
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
      </div>
    </AppLayout>
  );
};

export default KitsPage;
