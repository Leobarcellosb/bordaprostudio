import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";
import {
  FOLDER_RULES,
  deriveFoldersForDesign,
} from "@/lib/folderRules";

export interface CategoryFolder {
  id: string;
  name: string;
  totalCount: number;
  compatibleCount: number;
  previewImages: string[];
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
  tags_text: string | null;
  manual_categories?: string[] | null;
  cover_image: string | null;
  created_at: string;
}

/**
 * Agrupa o catálogo nas pastas "Por Tema" (lib/folderRules.ts).
 *
 * Pastas derivam das TAGS de cada design (match exato de tag inteira,
 * não substring) ou de manual_categories quando o admin sobrescreve.
 * Um design pode aparecer em N pastas — mais permissivo que o sistema
 * antigo de 1 category_id por design (que classificou metade do catálogo
 * errado, post-mortem em diagnose-categories.mts).
 *
 * Pastas vazias APARECEM (sinalizam lacuna de conteúdo, não bug).
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

        // Acumulador por folder ID. Pre-popula com TODAS as pastas
        // (incluindo as que ficarem em zero — sinalizam lacuna).
        type Acc = { total: number; compatible: number; previews: string[] };
        const acc = new Map<string, Acc>();
        FOLDER_RULES.forEach((f) =>
          acc.set(f.id, { total: 0, compatible: 0, previews: [] }),
        );

        let globalCompatible = 0;
        const globalRecent: string[] = [];

        for (const d of designs) {
          if (globalRecent.length < 4 && d.cover_image) globalRecent.push(d.cover_image);

          const isCompatible = compatibleIds ? compatibleIds.has(d.id) : true;
          if (isCompatible) globalCompatible++;

          // Um design pode entrar em várias pastas — loop todas elas.
          const folderIds = deriveFoldersForDesign(
            d.tags_text,
            d.manual_categories ?? null,
          );
          for (const fid of folderIds) {
            const entry = acc.get(fid);
            if (!entry) continue;
            entry.total++;
            if (isCompatible) entry.compatible++;
            if (entry.previews.length < 4 && d.cover_image) {
              entry.previews.push(d.cover_image);
            }
          }
        }

        const built: CategoryFolder[] = FOLDER_RULES.map((rule) => {
          const entry = acc.get(rule.id)!;
          return {
            id: rule.id,
            name: rule.name,
            totalCount: entry.total,
            compatibleCount: entry.compatible,
            previewImages: entry.previews,
          };
        });

        // NÃO filtra vazias — pasta zerada vira flag pra curadora.
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
