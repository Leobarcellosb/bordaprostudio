import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

const PAGE_SIZE = 24;

export type SortOption = "recent" | "most_downloaded" | "name_asc";

interface UseLibraryDesignsOptions {
  search: string;
  categoryFilter: string;
  stitchRange: string;
  sortBy: SortOption;
  page: number;
}

interface DesignResult {
  designs: any[];
  totalCount: number;
  isLoading: boolean;
  categories: any[];
  downloadCounts: Record<string, number>;
  designFiles: Record<string, string[]>;
}

export function useLibraryDesigns(options: UseLibraryDesignsOptions): DesignResult {
  const { search, categoryFilter, stitchRange, sortBy, page } = options;
  const { machineFormat, machineHoopSize } = useUserMachineSettings();
  const [designs, setDesigns] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const [designFiles, setDesignFiles] = useState<Record<string, string[]>>({});

  // Load categories once
  useEffect(() => {
    db.from("categories").select("*").eq("is_active", true).order("name")
      .then(({ data }: any) => setCategories(data || []));
  }, []);

  // Load designs via RPC with automatic machine filtering
  const fetchDesigns = useCallback(async () => {
    setIsLoading(true);
    try {
      let stitchMin: number | null = null;
      let stitchMax: number | null = null;
      if (stitchRange !== "all") {
        const [min, max] = stitchRange.split("-").map(Number);
        if (min) stitchMin = min;
        if (max) stitchMax = max;
      }

      const { data, error } = await db.rpc("search_designs", {
        search_term: search.trim(),
        p_category_id: categoryFilter !== "all" ? categoryFilter : null,
        p_hoop_size: machineHoopSize || null,
        p_stitch_min: stitchMin,
        p_stitch_max: stitchMax,
        p_sort: sortBy,
        p_offset: page * PAGE_SIZE,
        p_limit: PAGE_SIZE,
        p_machine_format: machineFormat || null,
      });

      if (error) throw error;

      const results = data || [];
      const count = results.length > 0 ? Number(results[0].total_count) : 0;

      const mapped = results.map((r: any) => ({
        ...r,
        categories: r.category_name ? { name: r.category_name } : null,
      }));

      if (search.trim()) {
        console.log(`[search] "${search.trim()}" → ${count} results (format: ${machineFormat}, hoop: ${machineHoopSize})`);
      }

      setDesigns(mapped);
      setTotalCount(count);

      const designIds = mapped.map((d: any) => d.id);
      if (designIds.length > 0) {
        const [filesRes, downloadsRes] = await Promise.all([
          db.from("kit_arquivos").select("design_id, format").in("design_id", designIds),
          db.from("downloads").select("kit_id").in("kit_id", designIds),
        ]);

        const fileMap: Record<string, string[]> = {};
        (filesRes.data || []).forEach((f: any) => {
          if (!fileMap[f.design_id]) fileMap[f.design_id] = [];
          if (!fileMap[f.design_id].includes(f.format)) fileMap[f.design_id].push(f.format);
        });
        setDesignFiles(fileMap);

        const countMap: Record<string, number> = {};
        (downloadsRes.data || []).forEach((d: any) => {
          countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1;
        });
        setDownloadCounts(countMap);
      } else {
        setDesignFiles({});
        setDownloadCounts({});
      }
    } catch (err) {
      console.error("[useLibraryDesigns] error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, stitchRange, sortBy, page, machineFormat, machineHoopSize]);

  useEffect(() => {
    const timer = setTimeout(fetchDesigns, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchDesigns]);

  const sortedDesigns = sortBy === "most_downloaded"
    ? [...designs].sort((a, b) => (downloadCounts[b.id] || 0) - (downloadCounts[a.id] || 0))
    : designs;

  return {
    designs: sortedDesigns,
    totalCount,
    isLoading,
    categories,
    downloadCounts,
    designFiles,
  };
}

export { PAGE_SIZE };
