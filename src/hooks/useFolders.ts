import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Folder } from "@/lib/folderRules";

export const FOLDERS_QUERY_KEY = ["folders"] as const;

/**
 * Fonte única de verdade pras pastas "Por Tema".
 *
 * Lê da tabela `public.folders` (RLS pública pra SELECT). Cache de 10min
 * porque o catálogo muda raramente (só quando admin edita). Hooks que
 * derivam pastas (useLibraryCategories, useLibraryDesigns) chamam esse
 * mesmo hook — React Query de-duplica via cache.
 *
 * Inclui TODAS as pastas (ativas + inativas). Filtro de display por
 * is_active acontece no caller. Auto-match roda contra todas (pasta
 * inativa continua acumulando designs em background).
 */
export function useFolders() {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEY,
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await supabase
        .from("folders")
        .select("id, slug, name, keyword_rules, sort_order, is_active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) {
        // Tabela não existe ainda (migration não rodada) — degrada pra
        // lista vazia. Library e admin mostram empty state.
        if (/relation .*folders.* does not exist/i.test(error.message)) {
          console.warn("[useFolders] tabela folders ausente — rode supabase/migrations/20260529000000_folders_table.sql");
          return [];
        }
        throw error;
      }
      return (data ?? []) as Folder[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Invalida cache pra forçar refetch após admin editar (CRUD). */
export function useInvalidateFolders() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: FOLDERS_QUERY_KEY });
}
