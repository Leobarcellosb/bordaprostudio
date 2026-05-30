#!/usr/bin/env -S npx tsx
/**
 * Diagnóstico read-only da distribuição das pastas "Por Tema".
 *
 * Atualizado pós-migration 20260529000000_folders_table.sql — agora
 * lê o catálogo de pastas do banco em vez de FOLDER_RULES estático.
 */
import { createClient } from "@supabase/supabase-js";
import {
  deriveFoldersForDesign,
  parseTagsText,
  type Folder,
} from "../src/lib/folderRules.ts";

const URL = process.env.VITE_SUPABASE_URL ?? "https://mepvdblcphcgebsxpykk.supabase.co";
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(URL, SK, { auth: { persistSession: false } });

const { data: foldersData, error: foldersErr } = await sb
  .from("folders")
  .select("id, slug, name, keyword_rules, sort_order, is_active")
  .order("sort_order");
if (foldersErr) { console.error(foldersErr); process.exit(1); }
const folders = (foldersData ?? []) as Folder[];

const { data, error } = await sb
  .from("designs")
  .select("id, name, tags_text, manual_categories, categories(name)")
  .eq("is_published", true);
if (error) { console.error(error); process.exit(1); }

interface Row {
  id: string; name: string; tags_text: string | null;
  manual_categories: string[] | null;
  categories: { name: string } | null;
}
const all = (data ?? []) as unknown as Row[];

const folderAssignments = all.map((d) => {
  const derivedOnly = deriveFoldersForDesign(d.tags_text, null, folders);
  const withManual = deriveFoldersForDesign(d.tags_text, d.manual_categories, folders);
  return { d, derivedOnly, withManual };
});

console.log(`\n=== 1. Contagem por pasta (derivada, sem override manual) ===`);
console.log(`    Total publicados: ${all.length} · Pastas cadastradas: ${folders.length}\n`);
const counts = new Map<string, number>();
folders.forEach((f) => counts.set(f.slug, 0));
for (const fa of folderAssignments) {
  for (const slug of fa.derivedOnly) counts.set(slug, (counts.get(slug) ?? 0) + 1);
}
const sorted = folders
  .map((f) => ({ ...f, count: counts.get(f.slug) ?? 0 }))
  .sort((a, b) => b.count - a.count);
for (const f of sorted) {
  const inactive = f.is_active ? "" : " (inativa)";
  console.log(`  ${(f.name + inactive).padEnd(30)} ${String(f.count).padStart(4)}`);
}

const orphans = folderAssignments.filter((fa) => fa.derivedOnly.length === 0);
console.log(`\n=== 2. Designs em ZERO pasta: ${orphans.length} ===`);
if (orphans.length > 0) {
  for (const fa of orphans.slice(0, 25)) {
    const tags = fa.d.tags_text ?? "(sem tags)";
    console.log(`    ${fa.d.name.slice(0, 38).padEnd(38)} | ${tags.slice(0, 70)}`);
  }
  if (orphans.length > 25) console.log(`    ... e mais ${orphans.length - 25}`);
}

const histogram = new Map<number, number>();
for (const fa of folderAssignments) {
  const n = fa.derivedOnly.length;
  histogram.set(n, (histogram.get(n) ?? 0) + 1);
}
console.log(`\n=== 3. Overlap (designs em N pastas) ===`);
for (let i = 0; i <= 6; i++) {
  const c = histogram.get(i) ?? 0;
  if (c === 0) continue;
  const pct = ((c / all.length) * 100).toFixed(1);
  console.log(`  em ${i} pasta${i === 1 ? " " : "s"}: ${String(c).padStart(4)}  ${pct}%`);
}

// Manual overrides — quantos designs estão em modo manual
const manualCount = all.filter((d) => (d.manual_categories?.length ?? 0) > 0).length;
console.log(`\n=== 4. Override manual ===`);
console.log(`  Designs em modo manual: ${manualCount} (${((manualCount / all.length) * 100).toFixed(1)}%)`);
