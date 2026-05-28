#!/usr/bin/env -S npx tsx
/**
 * Backup read-only das tags atuais antes do overwrite do retag.
 * Dumpa id, name, tags_text de todos os designs publicados pra um JSON
 * local timestampado. Rollback: ver scripts/restore-tags.mts (gerado on demand).
 */
import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://mepvdblcphcgebsxpykk.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("❌ Falta SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from("designs")
  .select("id, name, tags_text")
  .eq("is_published", true)
  .order("created_at", { ascending: true });

if (error) {
  console.error("Backup falhou:", error.message);
  process.exit(1);
}

const rows = data ?? [];
const withTags = rows.filter((r) => r.tags_text && r.tags_text.trim().length > 0);
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const path = `scripts/tags-backup-${ts}.json`;

await writeFile(path, JSON.stringify(rows, null, 2), "utf8");

console.log(`✅ Backup salvo: ${path}`);
console.log(`   Total designs publicados: ${rows.length}`);
console.log(`   Com tags_text preenchido: ${withTags.length}`);
console.log(`   Sem tags (vazio/null):    ${rows.length - withTags.length}`);
