/**
 * Atalhos tipados para as principais tabelas do schema.
 *
 * Os types brutos vivem em src/integrations/supabase/types.ts (gerados pelo
 * Supabase CLI). Aqui só damos nomes amigáveis para uso em hooks/contexts
 * sem ter que escrever Tables<"profiles"> em cada lugar.
 *
 * Se o schema mudar, regenerar com:
 *   npx supabase gen types typescript --project-id mepvdblcphcgebsxpykk \
 *     > src/integrations/supabase/types.ts
 */
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Subscription = Tables<"subscriptions">;
export type UserPreferences = Tables<"user_preferences">;
