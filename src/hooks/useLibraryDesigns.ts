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
  /** Admin only: ignora o filtro de machineFormat e mostra TODOS os designs. */
  showAllFormats?: boolean;
  /** Admin only: mostra só designs que NÃO têm este formato (análise de lacuna). */
  gapFormat?: string;
}

interface DesignResult {
  designs: any[];
  totalCount: number;
  isLoading: boolean;
  categories: any[];
  downloadCounts: Record<string, number>;
  designFiles: Record<string, string[]>;
  hasIncompatible: boolean;
  compatibleCount: number;
}

export function useLibraryDesigns(options: UseLibraryDesignsOptions): DesignResult {
  const {
    search,
    categoryFilter,
    stitchRange,
    sortBy,
    page,
    showAllFormats = false,
    gapFormat = "",
  } = options;
  const { machineFormat, machineHoopSize } = useUserMachineSettings();
  const [designs, setDesigns] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const [designFiles, setDesignFiles] = useState<Record<string, string[]>>({});
  const [hasIncompatible, setHasIncompatible] = useState(false);
  const [compatibleCount, setCompatibleCount] = useState(0);

  // Load categories once
  useEffect(() => {
    db.from("categories").select("*").eq("is_active", true).order("name")
      .then(({ data }: any) => setCategories(data || []))
      .catch((err) => console.error("[useLibraryDesigns] categories load error:", err));
  }, []);

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

      // Pré-filtragem por formato: o sort de compatibilidade não pode ser
      // client-side porque a paginação corta antes. Sem isso, página 1 pode
      // não ter NENHUM compatível mesmo com 200+ no banco.
      // Estratégia: se o user tem formato configurado, buscar design_ids
      // que têm esse formato em kit_arquivos. Se houver ao menos um, filtrar
      // a query principal a esses IDs. Senão, mostra tudo (banner cuida).
      // Admin "ver todos os formatos" desliga o pré-filtro de compatibilidade.
      let compatibleIds: string[] | null = null;
      if (machineFormat && !showAllFormats) {
        const { data: matching, error: matchErr } = await db
          .from("kit_arquivos")
          .select("design_id")
          .ilike("format", machineFormat);
        if (matchErr) throw matchErr;
        const ids = Array.from(
          new Set(((matching ?? []) as { design_id: string }[]).map((r) => r.design_id)),
        );
        if (ids.length > 0) compatibleIds = ids;
      }

      // Admin análise de lacuna: design_ids que TÊM gapFormat → excluir,
      // sobrando só os que NÃO têm aquele formato. Só vale no modo
      // showAllFormats (senão conflita com o filtro de máquina).
      let excludeIds: string[] | null = null;
      if (showAllFormats && gapFormat) {
        const { data: haveFmt, error: gapErr } = await db
          .from("kit_arquivos")
          .select("design_id")
          .ilike("format", gapFormat);
        if (gapErr) throw gapErr;
        const ids = Array.from(
          new Set(((haveFmt ?? []) as { design_id: string }[]).map((r) => r.design_id)),
        );
        if (ids.length > 0) excludeIds = ids;
      }

      // Direct SELECT (RPC search_designs não existe neste Supabase).
      // Filtros/sort/paginação/count gerenciados pelo query builder.
      let query = db
        .from("designs")
        .select("*, categories(name), kit_arquivos(format)", { count: "exact" })
        .eq("is_published", true);

      if (compatibleIds) query = query.in("id", compatibleIds);
      if (excludeIds) query = query.not("id", "in", `(${excludeIds.join(",")})`);

      // Busca tokenizada em name OU tags_text. Cada token vira um .or()
      // (name~tok OR tags_text~tok); múltiplos .or() são AND'd entre si,
      // então "urso fofo" exige (name|tags ~ urso) E (name|tags ~ fofo).
      // Corrige 2 bugs: (A) tag só era buscada em name, (B) multi-token
      // virava ILIKE da frase contígua e sempre retornava zero.
      const term = search.trim();
      if (term) {
        const tokens = term.split(/\s+/).filter(Boolean);
        for (const tok of tokens) {
          const safe = tok.replace(/[%,()]/g, "");
          if (safe) query = query.or(`name.ilike.%${safe}%,tags_text.ilike.%${safe}%`);
        }
      }
      if (categoryFilter !== "all") query = query.eq("category_id", categoryFilter);
      if (stitchMin !== null) query = query.gte("stitch_count", stitchMin);
      if (stitchMax !== null) query = query.lte("stitch_count", stitchMax);

      if (sortBy === "name_asc") {
        query = query.order("name", { ascending: true });
      } else {
        // recent OR most_downloaded — most_downloaded é re-ordenado client-side abaixo
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const machineFormatUpper = machineFormat?.toUpperCase() ?? null;
      const rows = (data ?? []) as Array<Record<string, any>>;

      // Computa is_compatible client-side (replaces RPC's soft compat logic)
      const mapped = rows.map((r) => {
        const formats = Array.from(
          new Set(
            ((r.kit_arquivos ?? []) as { format: string | null }[])
              .map((f) => (f?.format ?? "").trim())
              .filter((f) => f.length > 0),
          ),
        );
        const formatMatch = !machineFormatUpper
          || formats.some((f) => f.toUpperCase() === machineFormatUpper);
        const hoopMatch = !machineHoopSize || r.hoop_size === machineHoopSize;
        return {
          ...r,
          category_name: r.categories?.name ?? null,
          availableFormats: formats,
          is_compatible: formatMatch && hoopMatch,
        };
      });

      // Quando compatibleIds está set, todos da página já são format-compatible.
      // Mas hoop_match ainda pode variar → mantém sort para hoop-compatible primeiro.
      mapped.sort((a, b) => Number(b.is_compatible) - Number(a.is_compatible));

      const compatible = mapped.filter((d) => d.is_compatible).length;
      setCompatibleCount(compatible);
      setHasIncompatible(mapped.some((d) => !d.is_compatible));

      console.log(
        `[library] ${count ?? 0} total, ${compatible}/${mapped.length} compatible (format: ${machineFormat}, hoop: ${machineHoopSize})`,
      );

      setDesigns(mapped);
      setTotalCount(count ?? 0);

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
      setDesigns([]);
      setTotalCount(0);
      setHasIncompatible(false);
      setCompatibleCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, stitchRange, sortBy, page, machineFormat, machineHoopSize, showAllFormats, gapFormat]);

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
    hasIncompatible,
    compatibleCount,
  };
}

export { PAGE_SIZE };
