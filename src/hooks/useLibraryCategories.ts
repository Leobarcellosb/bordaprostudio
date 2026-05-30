import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";
import { useFolders } from "@/hooks/useFolders";
import { deriveFoldersForDesign } from "@/lib/folderRules";

export interface CategoryFolder {
  id: string;          // slug — match contra manual_categories
  name: string;
  totalCount: number;
  compatibleCount: number;
  previewImages: string[];
  isActive: boolean;
}

interface UseLibraryCategoriesResult {
  folders: CategoryFolder[];
  totalDesigns: number;
  totalCompatible: number;
  recentPreviews: string[];
  isLoading: boolean;
  /** Erro REAL do useFolders ou do fetch de designs. UI deve mostrar
   *  banner em vez de empty state — empty silencioso esconde bugs como
   *  o GRANT faltando descoberto em 7848d2d. */
  error: Error | null;
}

interface RawDesign {
  id: string;
  tags_text: string | null;
  manual_categories?: string[] | null;
  cover_image: string | null;
  created_at: string;
}

/**
 * Agrupa o catálogo nas pastas "Por Tema" lidas da tabela folders.
 *
 * Auto-match (deriveFoldersForDesign) roda contra TODAS as pastas
 * (incluindo is_active=false) pra que pasta nova/inativa já apareça
 * com volume real quando admin ativar. Filtro de is_active no display
 * acontece em LibraryPage.
 *
 * Pastas vazias APARECEM (admin vê como lacuna de conteúdo).
 */
export function useLibraryCategories(): UseLibraryCategoriesResult {
  const { machineFormat } = useUserMachineSettings();
  const { data: folderList = [], isLoading: foldersLoading, error: foldersError } = useFolders();
  const [folders, setFolders] = useState<CategoryFolder[]>([]);
  const [totalDesigns, setTotalDesigns] = useState(0);
  const [totalCompatible, setTotalCompatible] = useState(0);
  const [recentPreviews, setRecentPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [designsError, setDesignsError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Espera o catálogo de folders antes de agrupar — sem ele a
      // derivação retorna [] e a tela fica falsamente vazia.
      if (foldersLoading) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      setDesignsError(null);
      try {
        // Defensive: tenta com manual_categories; se a coluna ainda não
        // existir (migration não rodada), faz fallback sem ela.
        const fullCols = "id, tags_text, manual_categories, cover_image, created_at";
        const narrowCols = "id, tags_text, cover_image, created_at";

        const tryFetchDesigns = async () => {
          const res = await db
            .from("designs")
            .select(fullCols)
            .eq("is_published", true)
            .order("created_at", { ascending: false });
          if (
            res.error &&
            /manual_categories/i.test(res.error.message ?? "")
          ) {
            console.warn(
              "[useLibraryCategories] manual_categories ausente — rode a migration. Fallback sem o override manual.",
            );
            return await db
              .from("designs")
              .select(narrowCols)
              .eq("is_published", true)
              .order("created_at", { ascending: false });
          }
          return res;
        };

        const [designsRes, formatRes] = await Promise.all([
          tryFetchDesigns(),
          machineFormat
            ? db.from("kit_arquivos").select("design_id").ilike("format", machineFormat)
            : Promise.resolve({ data: null as { design_id: string }[] | null, error: null }),
        ]);

        if (cancelled) return;

        if (designsRes.error) throw designsRes.error;
        const designs = (designsRes.data ?? []) as unknown as RawDesign[];

        const compatibleIds: Set<string> | null = machineFormat
          ? new Set(((formatRes.data ?? []) as { design_id: string }[]).map((r) => r.design_id))
          : null;

        // Acumulador por folder slug. Pre-popula com TODAS as pastas
        // (incluindo as que ficarem em zero — sinalizam lacuna).
        type Acc = { total: number; compatible: number; previews: string[] };
        const acc = new Map<string, Acc>();
        folderList.forEach((f) =>
          acc.set(f.slug, { total: 0, compatible: 0, previews: [] }),
        );

        let globalCompatible = 0;
        const globalRecent: string[] = [];

        for (const d of designs) {
          if (globalRecent.length < 4 && d.cover_image) globalRecent.push(d.cover_image);

          const isCompatible = compatibleIds ? compatibleIds.has(d.id) : true;
          if (isCompatible) globalCompatible++;

          // Um design pode entrar em várias pastas — loop todas elas.
          const folderSlugs = deriveFoldersForDesign(
            d.tags_text,
            d.manual_categories ?? null,
            folderList,
          );
          for (const slug of folderSlugs) {
            const entry = acc.get(slug);
            if (!entry) continue;
            entry.total++;
            if (isCompatible) entry.compatible++;
            if (entry.previews.length < 4 && d.cover_image) {
              entry.previews.push(d.cover_image);
            }
          }
        }

        const built: CategoryFolder[] = folderList.map((f) => {
          const entry = acc.get(f.slug)!;
          return {
            id: f.slug,
            name: f.name,
            totalCount: entry.total,
            compatibleCount: entry.compatible,
            previewImages: entry.previews,
            isActive: f.is_active,
          };
        });

        setFolders(built);
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
          setDesignsError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [machineFormat, folderList, foldersLoading]);

  return {
    folders,
    totalDesigns,
    totalCompatible,
    recentPreviews,
    isLoading,
    error: (foldersError as Error | null) ?? designsError,
  };
}
