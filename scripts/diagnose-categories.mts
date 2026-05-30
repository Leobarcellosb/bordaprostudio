#!/usr/bin/env -S npx tsx
/**
 * Diagnóstico read-only do estado das categorias dos designs publicados.
 * Mostra distribuição por categoria + amostras de cada categoria com
 * tags_text pra eyeball de mismatches entre category e tags.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL ?? "https://mepvdblcphcgebsxpykk.supabase.co";
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(URL, SK, { auth: { persistSession: false } });

// ─── 1. Distribuição por categoria ───
const { data: rows, error } = await sb
  .from("designs")
  .select("id, name, category_id, tags_text, categories(name)")
  .eq("is_published", true);

if (error) { console.error(error); process.exit(1); }
const all = (rows ?? []) as unknown as Array<{
  id: string; name: string; category_id: string | null;
  tags_text: string | null; categories: { name: string } | null;
}>;

const byCat = new Map<string, typeof all>();
for (const d of all) {
  const k = d.categories?.name ?? "(SEM CATEGORIA)";
  if (!byCat.has(k)) byCat.set(k, []);
  byCat.get(k)!.push(d);
}

console.log(`\n=== Distribuição (${all.length} designs publicados) ===`);
const sorted = Array.from(byCat.entries()).sort((a, b) => b[1].length - a[1].length);
for (const [cat, ds] of sorted) {
  const pct = ((ds.length / all.length) * 100).toFixed(1);
  console.log(`  ${cat.padEnd(28)} ${String(ds.length).padStart(4)}  ${pct}%`);
}

// ─── 2. Heurística de mismatch ───
// Tag-words por categoria (mapa simples). Se um design está numa categoria
// X mas tags_text não tem NENHUMA das palavras esperadas pra X, é suspeito.
const KEYWORDS: Record<string, string[]> = {
  "Animais": ["animal","animais","urso","gato","cachorro","cão","cao","passar","ave","leão","leao","tigre","raposa","coelho","dinossauro","dino","selva","borboleta","peixe","pato","ovelha","vaca","cavalo","fauna","bichinho","bicho","coruja","baleia","flamingo"],
  "Infantil": ["infantil","bebê","bebe","criança","crianca","baby","menina","menino","fofo","fofinho","kids","cartoon"],
  "Flores": ["flor","floral","flores","rosa","rosas","margarida","girassol","botânic","botanic","folha","folhagem","jardim","buquê","buque","pétala","petala","ramo"],
  "Datas Comemorativas": ["natal","páscoa","pascoa","dia das mães","dia das maes","dia dos pais","halloween","aniversário","aniversario","festivo","ano novo","carnaval","festa junina","junina","valentine","namorad"],
  "Monogramas": ["monograma","letra","letras","inicial","iniciais","alfabeto","fonte"],
  "Nomes": ["nome","nomes próprios","personalização","personalizacao","customizad"],
  "Religioso": ["santo","santa","bíblia","biblia","católic","catolic","cristã","crista","cruz","anjo","fé ","fe ","oração","oracao","terço","terco","jesus","maria","deus"],
  "Profissões": ["médic","medic","enferm","advogad","professor","engenheir","profissão","profissao","trabalho"],
  "Frases": ["frase","palavra","citação","citacao","lettering","texto","motivacional"],
};

console.log(`\n=== Heurística de mismatch (designs sem keyword da própria categoria) ===`);
for (const [cat, ds] of sorted) {
  const kws = KEYWORDS[cat];
  if (!kws) continue;
  const mismatches = ds.filter((d) => {
    const tags = (d.tags_text ?? "").toLowerCase();
    return !kws.some((kw) => tags.includes(kw));
  });
  const pct = ds.length > 0 ? ((mismatches.length / ds.length) * 100).toFixed(0) : "0";
  console.log(`  ${cat.padEnd(28)} ${mismatches.length}/${ds.length} sem keyword esperada  (${pct}%)`);
}

// ─── 3. Amostras das pastas que o user mencionou ───
const SHOW = ["Monogramas", "Animais", "Frases", "Nomes", "Religioso"];
for (const cat of SHOW) {
  const ds = byCat.get(cat) ?? [];
  if (ds.length === 0) {
    console.log(`\n=== ${cat}: PASTA VAZIA (zero designs) ===`);
    continue;
  }
  console.log(`\n=== Amostra de "${cat}" (${ds.length} designs) — primeiros 8 ===`);
  const sample = ds.slice(0, 8);
  for (const d of sample) {
    const tagsTrunc = (d.tags_text ?? "(sem tags)").slice(0, 70);
    console.log(`  ${d.name.padEnd(42).slice(0,42)} | tags: ${tagsTrunc}`);
  }
}

// ─── 4. Designs SEM categoria ───
const noCat = all.filter((d) => !d.category_id);
console.log(`\n=== Designs SEM category_id: ${noCat.length} ===`);
if (noCat.length > 0) {
  for (const d of noCat.slice(0, 5)) {
    console.log(`  ${d.name.padEnd(42).slice(0,42)} | tags: ${(d.tags_text ?? "").slice(0,60)}`);
  }
}
