#!/usr/bin/env -S npx tsx
/**
 * Auto-tagueamento de designs via Gemini Vision.
 *
 * Analisa a cover_image de cada design publicado e gera tags em português
 * (tema, estilo, público), salvando em designs.tags_text.
 *
 * Requisitos:
 *   - Node 18+ (fetch + Buffer globais)
 *   - npx tsx
 *   - Env vars: SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 *
 * Uso:
 *   GEMINI_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/retag-designs.mts [flags]
 *
 * Flags:
 *   --dry-run         Mostra as tags sem salvar no banco
 *   --limit=N         Processa só os N primeiros designs
 *   --skip-existing   Pula designs que já têm tags_text preenchido
 *
 * IMPORTANTE sobre o separador de tags:
 *   A UI (LibraryGrid, KitDetail) faz split(",") em tags_text. Por isso
 *   salvamos VÍRGULA-separado ("dino, infantil, fofo"), NÃO espaço como
 *   um spec inicial sugeria — espaço faria a UI tratar tudo como 1 tag só.
 *   Pra busca (ILIKE substring) o separador não importa; pra display, sim.
 *
 * IMPORTANTE sobre o modelo:
 *   Default gemini-2.5-flash. O gemini-2.0-flash retornou quota limit=0
 *   neste projeto Google (descoberto em sessão anterior). Override via
 *   env GEMINI_MODEL se quiser testar outro.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Config ─────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://mepvdblcphcgebsxpykk.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_EXISTING = process.argv.includes("--skip-existing");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(0, parseInt(limitArg.slice("--limit=".length), 10)) : 0;

const BATCH_SIZE = 5;
const DELAY_MS_BETWEEN_BATCHES = 1000;

if (!SERVICE_KEY) {
  console.error("❌ Falta SUPABASE_SERVICE_ROLE_KEY no env.");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("❌ Falta GEMINI_API_KEY no env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Prompt ─────────────────────────────────────────────────────────────
const PROMPT = `Analisa esta imagem de bordado eletrônico e gera tags relevantes em português.

Regras para as tags:
- Máximo 6 tags, mínimo 3
- Tags em português, minúsculas
- Inclui: tema principal (ex: dinossauro, flor, bebê, animal), estilo (ex: fofo, delicado, colorido), público (ex: infantil, feminino, masculino, adulto)
- NÃO inclui tamanho/bastidor (isso vem do campo hoop_size)
- NÃO inclui formato de máquina
- Tags curtas: 1-2 palavras cada
- Exemplos bons: ["dinossauro", "infantil", "fofo", "colorido", "turma"]
- Exemplos ruins: ["bordado bonito", "design para máquina", "matriz de bordado"]`;

// Structured output: força JSON { tags: string[] } — mais robusto que
// parsear texto livre.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    tags: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 6,
      items: { type: "STRING" },
    },
  },
  required: ["tags"],
};

// ─── Helpers ────────────────────────────────────────────────────────────
interface DesignRow {
  id: string;
  name: string;
  cover_image: string;
  tags_text: string | null;
  hoop_size: string | null;
  category_id: string | null;
  categories: { name: string } | null;
}

async function imageToBase64(
  url: string,
): Promise<{ data: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  fetch imagem ${res.status}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    return { data: buffer.toString("base64"), mime };
  } catch (err) {
    console.error("  imageToBase64 error:", err);
    return null;
  }
}

function normalizeTag(t: string): string {
  return t
    .toLowerCase()
    .trim()
    .replace(/^["'#]+|["'.]+$/g, "") // tira aspas/hashes/pontos das pontas
    .replace(/\s+/g, " ");
}

async function generateTags(design: DesignRow): Promise<string[] | null> {
  const img = await imageToBase64(design.cover_image);
  if (!img) return null;

  let resp: Response;
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: img.mime, data: img.data } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
  } catch (err) {
    console.error("  Gemini fetch error:", err);
    return null;
  }

  if (!resp.ok) {
    const t = await resp.text();
    console.error(`  Gemini ${resp.status}: ${t.slice(0, 200)}`);
    return null;
  }

  const data = await resp.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.tags)) return null;
    const tags = parsed.tags
      .map((t: unknown) => (typeof t === "string" ? normalizeTag(t) : ""))
      .filter((t: string) => t.length > 0 && t.length <= 30);
    // Dedup
    return Array.from(new Set(tags)).slice(0, 6);
  } catch (err) {
    console.error("  parse error:", err, text.slice(0, 120));
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────
console.log("📥 Buscando designs publicados com cover_image…");
const { data: designsRaw, error } = await supabase
  .from("designs")
  .select("id, name, cover_image, tags_text, hoop_size, category_id, categories(name)")
  .eq("is_published", true)
  .not("cover_image", "is", null)
  .order("created_at", { ascending: true });

if (error) {
  console.error("Fetch falhou:", error.message);
  process.exit(1);
}

let designs = (designsRaw ?? []) as unknown as DesignRow[];

if (SKIP_EXISTING) {
  const before = designs.length;
  designs = designs.filter((d) => !(d.tags_text && d.tags_text.trim().length > 0));
  console.log(`⏭️  --skip-existing: ${before - designs.length} já tagueados pulados`);
}

if (LIMIT > 0) {
  designs = designs.slice(0, LIMIT);
}

const total = designs.length;
const mode = DRY_RUN ? "🟡 DRY RUN" : "🟢 LIVE";
console.log(
  `${total} designs · ${mode} · modelo ${MODEL} · batch ${BATCH_SIZE}\n`,
);

const stats = { ok: 0, skip: 0, error: 0 };
const pad = (s: string, n: number) => (s ?? "").padEnd(n).slice(0, n);

for (let i = 0; i < designs.length; i += BATCH_SIZE) {
  const batch = designs.slice(i, i + BATCH_SIZE);

  await Promise.all(
    batch.map(async (d, j) => {
      const idx = `[${String(i + j + 1).padStart(String(total).length)}/${total}]`;
      const label = pad(d.name ?? "(sem nome)", 36);

      const tags = await generateTags(d);
      if (!tags || tags.length === 0) {
        console.log(`${idx} ${label} → ERRO (sem tags geradas)`);
        stats.error++;
        return;
      }

      const tagsString = tags.join(", "); // VÍRGULA — consistente com a UI

      if (DRY_RUN) {
        console.log(`${idx} ${label} → [${tags.join(", ")}] (dry)`);
        stats.ok++;
        return;
      }

      const { error: updErr } = await supabase
        .from("designs")
        .update({ tags_text: tagsString })
        .eq("id", d.id);

      if (updErr) {
        console.log(`${idx} ${label} → ERRO update: ${updErr.message}`);
        stats.error++;
      } else {
        console.log(`${idx} ${label} → [${tags.join(", ")}] ✓`);
        stats.ok++;
      }
    }),
  );

  if (i + BATCH_SIZE < designs.length) {
    await new Promise((r) => setTimeout(r, DELAY_MS_BETWEEN_BATCHES));
  }
}

console.log("\n── Resumo ──────────────────────");
console.log(`✅ OK     ${stats.ok}`);
console.log(`⚠️  SKIP   ${stats.skip}`);
console.log(`❌ ERROR  ${stats.error}`);
if (DRY_RUN) console.log("\n💡 Dry-run — rode sem --dry-run pra salvar.");
