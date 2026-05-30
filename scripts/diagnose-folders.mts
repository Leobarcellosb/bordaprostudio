#!/usr/bin/env -S npx tsx
/**
 * Diagnóstico read-only do sistema novo de pastas (folderRules.ts).
 * Compara com o sistema antigo (category_id) pra validar o fix.
 */
import { createClient } from "@supabase/supabase-js";
import {
  FOLDER_RULES,
  FOLDER_BY_ID,
  deriveFoldersForDesign,
  parseTagsText,
} from "../src/lib/folderRules.ts";

const URL = process.env.VITE_SUPABASE_URL ?? "https://mepvdblcphcgebsxpykk.supabase.co";
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(URL, SK, { auth: { persistSession: false } });

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

// Pra cada design, calcula as pastas derivadas (sem usar manual_categories)
const folderAssignments = all.map((d) => {
  const derivedOnly = deriveFoldersForDesign(d.tags_text, null);
  const withManual = deriveFoldersForDesign(d.tags_text, d.manual_categories);
  return { d, derivedOnly, withManual };
});

// ─── 1. Contagem por pasta DERIVADA ───
console.log(`\n=== 1. Contagem de designs por pasta DERIVADA (sem override manual) ===`);
console.log(`    Total de designs publicados: ${all.length}\n`);
const counts = new Map<string, number>();
FOLDER_RULES.forEach((f) => counts.set(f.id, 0));
for (const fa of folderAssignments) {
  for (const fid of fa.derivedOnly) {
    counts.set(fid, (counts.get(fid) ?? 0) + 1);
  }
}
const sorted = FOLDER_RULES
  .map((f) => ({ ...f, count: counts.get(f.id) ?? 0 }))
  .sort((a, b) => b.count - a.count);
for (const f of sorted) {
  console.log(`  ${f.name.padEnd(26)} ${String(f.count).padStart(4)}`);
}

// ─── 2. ZERO pasta ───
const orphans = folderAssignments.filter((fa) => fa.derivedOnly.length === 0);
console.log(`\n=== 2. Designs que caem em ZERO pasta: ${orphans.length} ===`);
if (orphans.length > 0) {
  console.log(`    (lacuna de tags — ou tags só de estilo, ou sem assunto reconhecido)\n`);
  for (const fa of orphans.slice(0, 25)) {
    const tags = fa.d.tags_text ?? "(sem tags)";
    console.log(`    ${fa.d.name.slice(0, 38).padEnd(38)} | ${tags.slice(0, 70)}`);
  }
  if (orphans.length > 25) console.log(`    ... e mais ${orphans.length - 25}`);
}

// ─── 3. Distribuição 1 pasta vs múltiplas ───
const histogram = new Map<number, number>();
for (const fa of folderAssignments) {
  const n = fa.derivedOnly.length;
  histogram.set(n, (histogram.get(n) ?? 0) + 1);
}
console.log(`\n=== 3. Designs em N pastas (overlap) ===`);
for (let i = 0; i <= 6; i++) {
  const c = histogram.get(i) ?? 0;
  if (c === 0) continue;
  const pct = ((c / all.length) * 100).toFixed(1);
  console.log(`  em ${i} pasta${i === 1 ? " " : "s"}: ${String(c).padStart(4)}  ${pct}%`);
}

// ─── 4. Spot-check de falso positivo ───
// Heurísticas: design numa pasta cuja keyword é palavra "ambígua" (curta) que
// pode ter sido casada por engano via tag tipo "trovão", "patota" etc.
// Como o match é por tag INTEIRA (não substring), a chance é baixa, mas vou
// checar designs cujas tags INTEIRAS bateram com keywords curtas de animal.
console.log(`\n=== 4. Spot-check — designs em pastas suspeitas ===`);

// Lista designs em "Animais" cuja única tag de match é "ave", "cão", etc.
// (palavras curtas que podem ter sido geradas pelo Claude com sentido diferente)
const SHORT_ANIMALS = ["ave", "cão", "cao", "pato"];
const animaisShortMatch = folderAssignments
  .filter((fa) => fa.derivedOnly.includes("animais"))
  .map((fa) => {
    const tags = new Set(parseTagsText(fa.d.tags_text));
    const matches = SHORT_ANIMALS.filter((kw) => tags.has(kw));
    return { fa, matches };
  })
  .filter((x) => x.matches.length > 0);

if (animaisShortMatch.length === 0) {
  console.log(`  ✓ Nenhum design em Animais matched APENAS por tag curta ambígua.`);
} else {
  console.log(`  Designs em "Animais" matched por tag curta (manual check):`);
  for (const x of animaisShortMatch.slice(0, 5)) {
    console.log(`    ${x.fa.d.name.slice(0, 36).padEnd(36)} | matched: ${x.matches.join(",")} | tags: ${(x.fa.d.tags_text ?? "").slice(0, 60)}`);
  }
}

// Verifica designs com tag "balão" caindo em Espaço & Aventura — pode ter
// balão de festa que não é espaço
const balaoEspaco = folderAssignments
  .filter((fa) => fa.derivedOnly.includes("espaco-aventura"))
  .filter((fa) => parseTagsText(fa.d.tags_text).includes("balão"))
  .filter((fa) => {
    const tags = new Set(parseTagsText(fa.d.tags_text));
    // Se NÃO tem outra tag espacial, é suspeito
    const otherSpace = ["astronauta","foguete","espaço","espaco","lua","estrela","planeta","espacial","celestial","noturno"];
    return !otherSpace.some((t) => tags.has(t));
  });
if (balaoEspaco.length > 0) {
  console.log(`\n  ⚠️ ${balaoEspaco.length} designs em "Espaço & Aventura" só por "balão" (sem outra tag espacial):`);
  for (const fa of balaoEspaco.slice(0, 3)) {
    console.log(`    ${fa.d.name.slice(0, 36).padEnd(36)} | tags: ${(fa.d.tags_text ?? "").slice(0, 70)}`);
  }
}

// ─── 5. Comparação com o sistema antigo ───
console.log(`\n=== 5. Antes vs depois ===`);
const oldByCat = new Map<string, number>();
let oldNoCat = 0;
for (const d of all) {
  const cat = d.categories?.name;
  if (!cat) oldNoCat++;
  else oldByCat.set(cat, (oldByCat.get(cat) ?? 0) + 1);
}
console.log(`\n  Sistema ANTIGO (category_id):`);
console.log(`    SEM CATEGORIA: ${oldNoCat}`);
const oldSorted = Array.from(oldByCat.entries()).sort((a, b) => b[1] - a[1]);
for (const [c, n] of oldSorted) {
  console.log(`    ${c.padEnd(24)} ${n}`);
}

console.log(`\n  Sistema NOVO (folderRules + tags):`);
console.log(`    SEM PASTA (zero match): ${orphans.length}`);
for (const f of sorted.slice(0, 8)) {
  console.log(`    ${f.name.padEnd(24)} ${f.count}`);
}

const oldAnimais = oldByCat.get("Animais") ?? 0;
const newAnimais = counts.get("animais") ?? 0;
console.log(`\n  → Animais: ${oldAnimais} → ${newAnimais}  (${newAnimais > oldAnimais ? "+" : ""}${newAnimais - oldAnimais})`);
console.log(`  → Sem categoria/pasta: ${oldNoCat} → ${orphans.length}  (${orphans.length < oldNoCat ? "" : "+"}${orphans.length - oldNoCat})`);
