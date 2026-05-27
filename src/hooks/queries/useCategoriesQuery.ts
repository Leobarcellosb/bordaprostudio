import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export interface Category {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
}

/**
 * Lista das categorias ativas do catálogo. Dedupe entre múltiplos
 * componentes via React Query (LibraryFilters, CategoriesSection,
 * useLibraryCategories etc. — antes cada um fazia seu próprio SELECT).
 *
 * staleTime alto (30 min) porque categorias quase nunca mudam — admin
 * raramente cria/desativa. Mutações no AdminCategories devem invalidar
 * essa key via queryClient.invalidateQueries(CATEGORIES_QUERY_KEY).
 */
export function useCategoriesQuery() {
  return useQuery<Category[]>({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
