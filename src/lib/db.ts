import { supabase } from "@/integrations/supabase/client";

// Helper to bypass type checking until types.ts auto-regenerates
export const db = supabase as any;
