import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { filterDesignsByMachine } from "@/lib/machineFilter";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

interface InspirationDesign {
  id: string;
  name: string;
  cover_image: string | null;
  category_name: string | null;
  tags_text: string | null;
  label: "tendencia" | "novo" | "baseado_favoritos" | "baseado_downloads" | "destaque" | null;
}

const CACHE_KEY = "inspiracao_do_dia";
const MAX_ITEMS = 8;

function getTodaySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  for (let i = copy.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) | 0;
    const j = ((h >>> 0) % (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function useInspiracaoDoDia() {
  const { user } = useAuth();
  const { machineFormat, machineHoopSize } = useUserMachineSettings();
  const [designs, setDesigns] = useState<InspirationDesign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayKey = getTodaySeed();
    const cacheKey = `${CACHE_KEY}_${machineFormat}_${machineHoopSize}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === todayKey && parsed.userId === (user?.id || "anon")) {
          setDesigns(parsed.designs);
          setLoading(false);
          return;
        }
      }
    } catch {}

    const build = async () => {
      setLoading(true);
      try {
        const result: InspirationDesign[] = [];
        const usedIds = new Set<string>();

        const addDesign = (d: any, label: InspirationDesign["label"]) => {
          if (usedIds.has(d.id) || result.length >= MAX_ITEMS) return;
          usedIds.add(d.id);
          result.push({
            id: d.id,
            name: d.name,
            cover_image: d.cover_image,
            category_name: d.categories?.name || d.category_name || null,
            tags_text: d.tags_text || null,
            label,
          });
        };

        const { data: rawDesigns } = await db
          .from("designs")
          .select("id, name, cover_image, category_id, tags_text, hoop_size, created_at, featured_for_daily_inspiration, categories(name)")
          .eq("is_published", true);

        if (!rawDesigns || rawDesigns.length === 0) { setLoading(false); return; }

        // Filter by machine settings
        const allDesigns = await filterDesignsByMachine(rawDesigns, machineHoopSize, machineFormat);
        if (allDesigns.length === 0) { setLoading(false); return; }

        const designMap = new Map<string, any>();
        allDesigns.forEach((d: any) => designMap.set(d.id, d));

        const categoryDesigns = new Map<string, any[]>();
        allDesigns.forEach((d: any) => {
          if (d.category_id) {
            if (!categoryDesigns.has(d.category_id)) categoryDesigns.set(d.category_id, []);
            categoryDesigns.get(d.category_id)!.push(d);
          }
        });

        if (user) {
          const { data: userDownloads } = await db
            .from("downloads").select("kit_id").eq("user_id", user.id);

          const downloadedCategoryIds = new Set<string>();
          const downloadedDesignIds = new Set<string>();
          (userDownloads || []).forEach((dl: any) => {
            downloadedDesignIds.add(dl.kit_id);
            const design = designMap.get(dl.kit_id);
            if (design?.category_id) downloadedCategoryIds.add(design.category_id);
          });

          const fromDownloadCategories: any[] = [];
          downloadedCategoryIds.forEach((catId) => {
            (categoryDesigns.get(catId) || []).forEach((d) => {
              if (!downloadedDesignIds.has(d.id)) fromDownloadCategories.push(d);
            });
          });
          seededShuffle(fromDownloadCategories, todayKey + "dl").forEach((d) => addDesign(d, "baseado_downloads"));

          const { data: userFavs } = await db
            .from("favorites").select("kit_id").eq("user_id", user.id);

          const favCategoryIds = new Set<string>();
          const favDesignIds = new Set<string>();
          (userFavs || []).forEach((f: any) => {
            favDesignIds.add(f.kit_id);
            const design = designMap.get(f.kit_id);
            if (design?.category_id) favCategoryIds.add(design.category_id);
          });

          const fromFavCategories: any[] = [];
          favCategoryIds.forEach((catId) => {
            (categoryDesigns.get(catId) || []).forEach((d) => {
              if (!favDesignIds.has(d.id) && !downloadedDesignIds.has(d.id)) fromFavCategories.push(d);
            });
          });
          seededShuffle(fromFavCategories, todayKey + "fav").forEach((d) => addDesign(d, "baseado_favoritos"));
        }

        if (result.length < MAX_ITEMS) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const { data: recentDl } = await db
            .from("downloads").select("kit_id, created_at").gte("created_at", sevenDaysAgo.toISOString());

          const trendMap: Record<string, number> = {};
          (recentDl || []).forEach((d: any) => { trendMap[d.kit_id] = (trendMap[d.kit_id] || 0) + 1; });
          Object.entries(trendMap).sort((a, b) => b[1] - a[1]).forEach(([id]) => {
            const d = designMap.get(id);
            if (d) addDesign(d, "tendencia");
          });
        }

        if (result.length < MAX_ITEMS) {
          const newest = [...allDesigns].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          newest.slice(0, 10).forEach((d) => addDesign(d, "novo"));
        }

        if (result.length < MAX_ITEMS) {
          const featured = allDesigns.filter((d: any) => d.featured_for_daily_inspiration);
          seededShuffle(featured, todayKey + "feat").forEach((d) => addDesign(d, "destaque"));
        }

        if (result.length < MAX_ITEMS) {
          seededShuffle(allDesigns, todayKey + "rand").forEach((d) => addDesign(d, null));
        }

        setDesigns(result);

        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            date: todayKey,
            userId: user?.id || "anon",
            designs: result,
          }));
        } catch {}
      } catch (err) {
        console.error("Inspiração do Dia error:", err);
      } finally {
        setLoading(false);
      }
    };

    build();
  }, [user, machineFormat, machineHoopSize]);

  return { designs, loading };
}
