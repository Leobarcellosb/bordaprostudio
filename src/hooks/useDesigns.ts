import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Design } from "@/types/database.types";

export interface DesignWithFormats extends Design {
  availableFormats: string[];
  downloadsCount?: number;
}

export interface UseDesignsParams {
  limit?: number;
  orderBy?: "created_at" | "downloads_count";
  featured?: boolean;
  search?: string;
  categoryId?: string;
  offset?: number;
}

interface KitArquivoRow {
  format: string | null;
}

interface DesignWithJoin extends Design {
  kit_arquivos?: KitArquivoRow[] | null;
}

function mapDesign(row: DesignWithJoin, downloadsCount?: number): DesignWithFormats {
  const formats = Array.from(
    new Set(
      (row.kit_arquivos ?? [])
        .map((f) => (f?.format ?? "").trim())
        .filter((f) => f.length > 0),
    ),
  );
  return { ...row, availableFormats: formats, downloadsCount };
}

export function useDesigns(params: UseDesignsParams = {}) {
  const {
    limit = 20,
    orderBy = "created_at",
    featured,
    search,
    categoryId,
    offset = 0,
  } = params;

  return useQuery<DesignWithFormats[]>({
    queryKey: ["designs", { limit, orderBy, featured, search, categoryId, offset }],
    staleTime: 60_000,
    queryFn: async () => {
      if (orderBy === "downloads_count") {
        // Aggregate downloads client-side, then fetch matching designs.
        const { data: dlRows, error: dlErr } = await supabase
          .from("downloads")
          .select("design_id")
          .limit(5000);
        if (dlErr) throw dlErr;

        const counts: Record<string, number> = {};
        (dlRows ?? []).forEach((d) => {
          counts[d.design_id] = (counts[d.design_id] ?? 0) + 1;
        });
        const topIds = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, Math.max(limit, 1))
          .map(([id]) => id);

        if (topIds.length === 0) return [];

        let q = supabase
          .from("designs")
          .select("*, kit_arquivos(format)")
          .eq("is_published", true)
          .in("id", topIds);

        if (categoryId) q = q.eq("category_id", categoryId);
        if (featured !== undefined) q = q.eq("featured_for_daily_inspiration", featured);
        if (search && search.trim()) q = q.ilike("name", `%${search.trim()}%`);

        const { data, error } = await q;
        if (error) throw error;

        const mapped = ((data as unknown) as DesignWithJoin[] | null ?? []).map((d) =>
          mapDesign(d, counts[d.id] ?? 0),
        );
        mapped.sort((a, b) => (b.downloadsCount ?? 0) - (a.downloadsCount ?? 0));
        return mapped;
      }

      let q = supabase
        .from("designs")
        .select("*, kit_arquivos(format)")
        .eq("is_published", true);

      if (featured !== undefined) q = q.eq("featured_for_daily_inspiration", featured);
      if (categoryId) q = q.eq("category_id", categoryId);
      if (search && search.trim()) q = q.ilike("name", `%${search.trim()}%`);

      q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      const { data, error } = await q;
      if (error) throw error;

      return (((data as unknown) as DesignWithJoin[] | null) ?? []).map((d) => mapDesign(d));
    },
  });
}
