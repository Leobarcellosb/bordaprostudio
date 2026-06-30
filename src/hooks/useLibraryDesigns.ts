import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";
import { useFolders } from "@/hooks/useFolders";
import { tagsForFolder } from "@/lib/folderRules";
import { designFitsHoop } from "@/lib/machineFilter";

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
  /** Filtro de pasta "Por Tema" (slug do folderRules). "" = sem filtro. */
  folderFilter?: string;
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
  /** Erro REAL do fetch (RLS/infra). UI mostra banner em vez de empty state
   *  silencioso — empty esconde bugs (ex.: GRANT faltando = 42501). */
  error: Error | null;
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
    folderFilter = "",
  } = options;
  const { machineFormat, machineHoopSize } = useUserMachineSettings();
  const { data: folderList = [] } = useFolders();
  const [designs, setDesigns] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const [designFiles, setDesignFiles] = useState<Record<string, string[]>>({});
  const [hasIncompatible, setHasIncompatible] = useState(false);
  const [compatibleCount, setCompatibleCount] = useState(0);
  const [designsError, setDesignsError] = useState<Error | null>(null);

  // Load categories once
  useEffect(() => {
    db.from("categories").select("*").eq("is_active", true).order("name")
      .then(({ data }: any) => setCategories(data || []))
      .catch((err) => console.error("[useLibraryDesigns] categories load error:", err));
  }, []);

  const fetchDesigns = useCallback(async () => {
    setIsLoading(true);
    setDesignsError(null);
    try {
      let stitchMin: number | null = null;
      let stitchMax: number | null = null;
      if (stitchRange !== "all") {
        const [min, max] = stitchRange.split("-").map(Number);
        if (min) stitchMin = min;
        if (max) stitchMax = max;
      }

      // Filtro de formato (compatibilidade da máquina) via INNER JOIN no
      // servidor — NÃO via .in("id", [milhares de UUIDs]). O .in() antigo
      // montava uma URL de ~40KB (1104 UUIDs PES) que o PostgREST rejeitava
      // com HTTP 400 → o catch zerava a lista → "Nenhuma matriz encontrada".
      // O embed aliasado "compat" com !inner filtra os designs no JOIN;
      // PostgREST ANINHA filhos to-many (não duplica o pai), então count
      // exato = designs DISTINTOS e a paginação 24/página fica correta —
      // verificado contra o banco real (design com 2 linhas PES → 1 linha).
      // URL fica constante (~200 chars), escala pra qualquer tamanho de acervo.
      const useFormatFilter = !!machineFormat && !showAllFormats;

      // Admin análise de lacuna (gapFormat): designs que NÃO têm aquele formato.
      // ANTES: pré-buscava todos os design_id COM o formato e fazia
      // .not("id","in",[milhares de UUIDs]) — mesma URL-bomb do filtro de formato
      // (~40KB → HTTP 400) + truncação silenciosa em 1000 linhas (excludeIds
      // incompleto → designs que TINHAM o formato vazavam pra view "sem formato",
      // resultado errado sem erro). AGORA: anti-join server-side — embed LEFT
      // aliasado "gap" filtrado pro formato + is null no pai. URL O(200 chars),
      // correto pra qualquer acervo — verificado contra o banco (sem X == total −
      // com X em 6 formatos, count exato = distintos, sem duplicação).
      const useGapFilter = showAllFormats && !!gapFormat;

      // Direct SELECT por escolha (a Library não usa a RPC search_designs —
      // controle fino de filtros/sort/paginação/count no query builder).
      // Nota: a RPC search_designs EXISTE em prod (reconciliada na migration
      // 20260610120000); os hooks de sugestão do Dashboard a usam.
      // Encapsulado num builder pra poder rodar 2x: com e sem o filtro de
      // formato (fallback formato-órfão, ver abaixo).
      const buildQuery = (applyFormatFilter: boolean) => {
        // O embed plano kit_arquivos(format) traz TODOS os formatos (badge
        // is_compatible client-side); o embed inner aliasado "compat" só
        // existe quando filtramos por formato e restringe os designs no JOIN.
        const selectParts = ["*", "categories(name)", "kit_arquivos(format)"];
        if (applyFormatFilter) selectParts.push("compat:kit_arquivos!inner(format)");
        if (useGapFilter) selectParts.push("gap:kit_arquivos!left(format)");

        let query = db
          .from("designs")
          .select(selectParts.join(", "), { count: "exact" })
          .eq("is_published", true);

        // Filtro namespaced no embed inner — só toca "compat", não o embed plano.
        if (applyFormatFilter) query = query.ilike("compat.format", machineFormat!);
        // Anti-join de lacuna: mantém só designs SEM gapFormat (embed gap
        // filtrado pro formato + is null = nenhum filho casou). Server-side,
        // sem materializar lista de IDs.
        if (useGapFilter) {
          query = query.ilike("gap.format", gapFormat);
          query = query.is("gap", null);
        }

        // Filtro de pasta "Por Tema": OR entre (manual_categories contém o
        // folderId) e (qualquer tag da pasta bate). Manual prevalece é
        // garantido depois via filtro client-side (rows manual≠[folderFilter]
        // são descartadas mesmo se tags bateram).
        if (folderFilter) {
          const folderTags = tagsForFolder(folderFilter, folderList);
          const orParts: string[] = [`manual_categories.cs.{${folderFilter}}`];
          for (const tag of folderTags) {
            const safe = tag.replace(/[%,()]/g, "");
            if (safe) orParts.push(`tags_text.ilike.%${safe}%`);
          }
          // Se a coluna manual_categories não existir ainda (migration não
          // rodada), o .or() vai falhar — try/catch abaixo lida.
          try {
            query = query.or(orParts.join(","));
          } catch {
            // noop
          }
        }

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

        return query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      };

      let { data, error, count } = await buildQuery(useFormatFilter);
      if (error) throw error;

      // Fallback formato-órfão: se o user tem formato configurado mas NENHUM
      // design publicado o possui (hoje VP3/HUS/EMB têm 0), o !inner zeraria
      // a lista → "Nenhuma matriz encontrada". Em vez disso refaz SEM o filtro
      // de formato (mostra o acervo inteiro) e deixa o CompatibilityBanner
      // explicar. Restaura o comportamento pré-inner-join ("mostra tudo, banner
      // cuida"). Round-trip extra só no caso raro de formato sem cobertura.
      if (useFormatFilter && (count ?? 0) === 0) {
        ({ data, error, count } = await buildQuery(false));
        if (error) throw error;
      }

      const machineFormatUpper = machineFormat?.toUpperCase() ?? null;
      const rawRows = (data ?? []) as Array<Record<string, any>>;

      // Manual prevalece: se o design tem manual_categories ≠ vazio,
      // SÓ pode aparecer nas pastas listadas lá — mesmo se as tags
      // bateriam com outra pasta. Descarta linhas que vazaram pelo OR
      // da query (tag bateu mas manual aponta pra outra pasta).
      // Nota: o totalCount fica ligeiramente inflado nesses casos —
      // aceitável em v1, manual override é minoria.
      const rows = folderFilter
        ? rawRows.filter((r) => {
            const manual = (r.manual_categories as string[] | null) ?? [];
            if (manual.length === 0) return true; // sem override, tag valeu
            return manual.includes(folderFilter);
          })
        : rawRows;

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
        // Compatibilidade de bastidor por DIMENSÃO (rotação + fail-open), não
        // mais string match em hoop_size. width_mm/height_mm vêm no SELECT "*".
        const hoopMatch = designFitsHoop(r.width_mm, r.height_mm, machineHoopSize);
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
      // Propaga o erro pra UI mostrar banner vermelho — antes zerava a lista
      // em silêncio e o usuário via "Nenhuma matriz encontrada" no lugar de
      // uma falha real de RLS/infra (anti-padrão do useFolders original).
      setDesignsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, stitchRange, sortBy, page, machineFormat, machineHoopSize, showAllFormats, gapFormat, folderFilter, folderList]);

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
    error: designsError,
  };
}

export { PAGE_SIZE };
