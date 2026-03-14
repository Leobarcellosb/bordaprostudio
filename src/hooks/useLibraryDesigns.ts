import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";

const PAGE_SIZE = 24;

export type SortOption = "recent" | "most_downloaded" | "name_asc";

interface UseLibraryDesignsOptions {
  search: string;
  categoryFilter: string;
  hoopFilter: string;
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
  const { search, categoryFilter, hoopFilter, stitchRange, sortBy, page } = options;
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

  // Load designs with server-side filtering + pagination
  const fetchDesigns = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = db.from("designs").select("*, categories(name)", { count: "exact" }).eq("is_published", true);

      // Filters
      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }
      if (hoopFilter !== "all") {
        query = query.eq("hoop_size", hoopFilter);
      }
      if (stitchRange !== "all") {
        const [min, max] = stitchRange.split("-").map(Number);
        if (min) query = query.gte("stitch_count", min);
        if (max) query = query.lte("stitch_count", max);
      }
      if (search.trim()) {
        const q = search.trim();
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,tags_text.ilike.%${q}%,generated_title.ilike.%${q}%`);
      }

      // Sorting
      if (sortBy === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "name_asc") {
        query = query.order("name", { ascending: true });
      } else {
        // most_downloaded — we'll sort client-side after getting download counts
        query = query.order("created_at", { ascending: false });
      }

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setDesigns(data || []);
      setTotalCount(count || 0);

      // Load files for these designs
      const designIds = (data || []).map((d: any) => d.id);
      if (designIds.length > 0) {
        const { data: filesData } = await db.from("kit_arquivos").select("design_id, format").in("design_id", designIds);
        const fileMap: Record<string, string[]> = {};
        (filesData || []).forEach((f: any) => {
          if (!fileMap[f.design_id]) fileMap[f.design_id] = [];
          if (!fileMap[f.design_id].includes(f.format)) fileMap[f.design_id].push(f.format);
        });
        setDesignFiles(fileMap);

        const { data: downloadsData } = await db.from("downloads").select("kit_id").in("kit_id", designIds);
        const countMap: Record<string, number> = {};
        (downloadsData || []).forEach((d: any) => {
          countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1;
        });
        setDownloadCounts(countMap);
      }
    } catch (err) {
      console.error("[useLibraryDesigns] error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, hoopFilter, stitchRange, sortBy, page]);

  useEffect(() => {
    const timer = setTimeout(fetchDesigns, search ? 300 : 0); // debounce search
    return () => clearTimeout(timer);
  }, [fetchDesigns]);

  // Sort by most downloaded client-side if needed
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
