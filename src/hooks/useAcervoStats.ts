import { useState, useEffect } from "react";
import { db } from "@/lib/db";

interface CategoryStat {
  name: string;
  count: number;
}

interface HoopStat {
  size: string;
  count: number;
}

interface UserKit {
  id: string;
  name: string;
  designCount: number;
  coverImage: string | null;
}

export interface AcervoStats {
  totalDesigns: number;
  categories: CategoryStat[];
  hoopSizes: HoopStat[];
  userKits: UserKit[];
  loading: boolean;
}

export function useAcervoStats(): AcervoStats {
  const [stats, setStats] = useState<AcervoStats>({
    totalDesigns: 0,
    categories: [],
    hoopSizes: [],
    userKits: [],
    loading: true,
  });

  useEffect(() => {
    const run = async () => {
      try {
        // Fetch all published designs with category info
        const { data: designs } = await db
          .from("designs")
          .select("id, category_id, hoop_size, categories(name)")
          .eq("is_published", true)
          .limit(1000);

        const allDesigns = designs || [];
        const totalDesigns = allDesigns.length;

        // Category distribution
        const catMap = new Map<string, number>();
        for (const d of allDesigns) {
          const catName = d.categories?.name || "Sem categoria";
          catMap.set(catName, (catMap.get(catName) || 0) + 1);
        }
        const categories = Array.from(catMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        // Hoop size distribution
        const hoopMap = new Map<string, number>();
        for (const d of allDesigns) {
          const size = d.hoop_size || "Indefinido";
          hoopMap.set(size, (hoopMap.get(size) || 0) + 1);
        }
        const hoopSizes = Array.from(hoopMap.entries())
          .map(([size, count]) => ({ size, count }))
          .sort((a, b) => b.count - a.count);

        // User kits
        const { data: kits } = await db
          .from("kits")
          .select("id, name, cover_image")
          .order("created_at", { ascending: false })
          .limit(10);

        let userKits: UserKit[] = [];
        if (kits && kits.length > 0) {
          const { data: kitDesigns } = await db
            .from("kit_designs")
            .select("kit_id")
            .in("kit_id", kits.map((k: any) => k.id));

          const kitCountMap = new Map<string, number>();
          for (const kd of kitDesigns || []) {
            kitCountMap.set(kd.kit_id, (kitCountMap.get(kd.kit_id) || 0) + 1);
          }

          userKits = kits.map((k: any) => ({
            id: k.id,
            name: k.name,
            designCount: kitCountMap.get(k.id) || 0,
            coverImage: k.cover_image,
          }));
        }

        setStats({ totalDesigns, categories, hoopSizes, userKits, loading: false });
      } catch (err) {
        console.error("[useAcervoStats] error:", err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    run();
  }, []);

  return stats;
}
