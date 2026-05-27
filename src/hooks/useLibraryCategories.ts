import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

export interface CategoryFolder {
  id: string;
  name: string;
  totalCount: number;
  compatibleCount: number;
  previewImages: string[]; // up to 4 cover_image URLs
}

interface UseLibraryCategoriesResult {
  folders: CategoryFolder[];
  totalDesigns: number;
  totalCompatible: number;
  recentPreviews: string[];
  isLoading: boolean;
}

interface RawDesign {
  id: string;
  category_id: string | null;
  cover_image: string | null;
  created_at: string;
}

/**
 * Aggregates the published catalog into category folders for the "Por Tema" view.
 *
 * Strategy: single flat fetch of all published designs (small payload — id +
 * category_id + cover_image), then aggregate client-side into a Map keyed by
 * category_id. Compatibility filter (when user has machineFormat set) uses a
 * second parallel query against kit_arquivos to build a Set of compatible IDs.
 *
 * For a catalog up to a few thousand designs this is much cheaper than running
 * N+1 count/preview queries per category. If the catalog grows past ~10k
 * designs, consider moving the aggregation to a SQL view or RPC.
 */
export function useLibraryCategories(): UseLibraryCategoriesResult {
  const { machineFormat } = useUserMachineSettings();
  const [folders, setFolders] = useState<CategoryFolder[]>([]);
  const [totalDesigns, setTotalDesigns] = useState(0);
  const [totalCompatible, setTotalCompatible] = useState(0);
  const [recentPreviews, setRecentPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const [catsRes, designsRes, formatRes] = await Promise.all([
          db
            .from("categories")
            .select("id, name")
            .eq("is_active", true)
            .order("name"),
          db
            .from("designs")
            .select("id, category_id, cover_image, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
          machineFormat
            ? db.from("kit_arquivos").select("design_id").ilike("format", machineFormat)
            : Promise.resolve({ data: null as { design_id: string }[] | null, error: null }),
        ]);

        if (cancelled) return;

        const cats =
          (catsRes.data ?? []) as Array<{ id: string; name: string }>;
        const designs = (designsRes.data ?? []) as RawDesign[];

        const compatibleIds: Set<string> | null = machineFormat
          ? new Set(((formatRes.data ?? []) as { design_id: string }[]).map((r) => r.design_id))
          : null;

        // Aggregate designs by category in a single pass: Map<catId, accumulator>
        type Accumulator = { total: number; compatible: number; previews: string[] };
        const acc = new Map<string, Accumulator>();
        cats.forEach((c) => acc.set(c.id, { total: 0, compatible: 0, previews: [] }));

        let globalCompatible = 0;
        const globalRecent: string[] = [];

        for (const d of designs) {
          // "Ver Tudo" card: 4 most recent with cover
          if (globalRecent.length < 4 && d.cover_image) globalRecent.push(d.cover_image);

          const isCompatible = compatibleIds ? compatibleIds.has(d.id) : true;
          if (isCompatible) globalCompatible++;

          if (!d.category_id) continue;
          const entry = acc.get(d.category_id);
          if (!entry) continue; // category inactive or unknown

          entry.total++;
          if (isCompatible) entry.compatible++;
          if (entry.previews.length < 4 && d.cover_image) entry.previews.push(d.cover_image);
        }

        const built: CategoryFolder[] = cats.map((c) => {
          const entry = acc.get(c.id)!;
          return {
            id: c.id,
            name: c.name,
            totalCount: entry.total,
            compatibleCount: entry.compatible,
            previewImages: entry.previews,
          };
        });

        // Hide empty categories — they pollute the folder view
        const nonEmpty = built.filter((f) => f.totalCount > 0);

        setFolders(nonEmpty);
        setTotalDesigns(designs.length);
        setTotalCompatible(globalCompatible);
        setRecentPreviews(globalRecent);
      } catch (err) {
        console.error("[useLibraryCategories] error:", err);
        if (!cancelled) {
          setFolders([]);
          setTotalDesigns(0);
          setTotalCompatible(0);
          setRecentPreviews([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [machineFormat]);

  return { folders, totalDesigns, totalCompatible, recentPreviews, isLoading };
}
