/**
 * Funções puras de derivação de pastas "Por Tema".
 *
 * Antes esse arquivo continha também o catálogo de pastas (FOLDER_RULES
 * estático). A partir da migration 20260529000000_folders_table.sql, o
 * catálogo vive na tabela `public.folders` e é gerenciado pelo admin via
 * UI. Aqui ficou só a LÓGICA, que aceita a lista de folders como param.
 *
 * Caller típico: `useFolders()` (hook React Query) busca do DB e passa pra
 * essas funções.
 *
 * REGRAS DE MATCH (importante):
 *   - tags_text é vírgula-separado. Split, normaliza, compara TAG INTEIRA
 *     (nunca substring — senão "sapato" cairia em Animais por conter
 *     "pato", "chave" cairia por conter "ave").
 *   - Match acontece se a keyword for igual a:
 *       (a) uma tag inteira do design, OU
 *       (b) qualquer palavra (≥3 letras) dentro de uma tag composta.
 *     Caso (b) habilita "moldura floral" aparecer em Molduras E Florais
 *     sem reabrir o risco de substring fortuita.
 *   - Multi-palavra como "dia das mães" continua casando via (a).
 *   - Case-insensitive na tag normalizada.
 *
 * OVERRIDE MANUAL:
 *   - designs.manual_categories (TEXT[]) — quando não vazio, substitui a
 *     derivação automática inteira pra aquele design (filtrado contra
 *     slugs válidos).
 */

export interface Folder {
  id: string;
  slug: string;        // imutável após criação — referenciado por manual_categories
  name: string;
  keyword_rules: string[];
  sort_order: number;
  is_active: boolean;
}

const MIN_TOKEN_LEN = 3;

/** Normaliza uma tag pra comparação: minúsculas, trim, sem aspas. */
export function normalizeTagToken(t: string): string {
  return t.trim().toLowerCase().replace(/^["']|["']$/g, "");
}

/** Quebra tags_text por vírgula e normaliza cada uma. Retorna lista única. */
export function parseTagsText(tagsText: string | null | undefined): string[] {
  if (!tagsText) return [];
  return Array.from(
    new Set(tagsText.split(",").map(normalizeTagToken).filter(Boolean)),
  );
}

/**
 * Pastas em que o design deve aparecer (slugs).
 *
 * Importante: a derivação roda contra TODAS as pastas passadas, inclusive
 * `is_active=false`. Pasta inativa some só no display do cliente — admin
 * continua atribuindo manualmente e o auto-match continua populando.
 * Isso permite preparar pasta nova com volume antes de ativar.
 */
export function deriveFoldersForDesign(
  tagsText: string | null | undefined,
  manualCategories: string[] | null | undefined,
  folders: Folder[],
): string[] {
  if (manualCategories && manualCategories.length > 0) {
    const validSlugs = new Set(folders.map((f) => f.slug));
    return manualCategories.filter((s) => validSlugs.has(s));
  }
  const designTags = parseTagsText(tagsText);
  if (designTags.length === 0) return [];

  // Conjunto de "alvos de match" do design: tags inteiras + palavras
  // ≥3 letras dentro de tags compostas.
  const targets = new Set<string>();
  for (const tag of designTags) {
    targets.add(tag);
    for (const word of tag.split(/\s+/)) {
      const w = word.trim().toLowerCase();
      if (w.length >= MIN_TOKEN_LEN) targets.add(w);
    }
  }

  const matched: string[] = [];
  for (const folder of folders) {
    if (folder.keyword_rules.some((kw) => targets.has(kw.toLowerCase()))) {
      matched.push(folder.slug);
    }
  }
  return matched;
}

/** Keywords de uma pasta — pra uso em filtros server-side (ILIKE). */
export function tagsForFolder(folderSlug: string, folders: Folder[]): string[] {
  return folders.find((f) => f.slug === folderSlug)?.keyword_rules.map((t) => t.toLowerCase()) ?? [];
}

/** Acha pasta por slug (utilitário pra breadcrumb etc). */
export function findFolderBySlug(slug: string, folders: Folder[]): Folder | null {
  return folders.find((f) => f.slug === slug) ?? null;
}

/**
 * Slug-gen pra pastas novas no admin. Strip acentos, lowercase, troca
 * não-alfanum por hífen, colapsa, tira bordas. Colisão tratada no caller
 * (sufixo numérico — UNIQUE no banco também garante).
 *
 *   "Veículos & Vintage" → "veiculos-vintage"
 *   "Festa Junina!"      → "festa-junina"
 */
export function slugifyFolderName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Próximo slug livre dado o desejado + slugs em uso (sufixo numérico). */
export function nextAvailableSlug(desired: string, taken: Set<string>): string {
  const base = slugifyFolderName(desired) || "pasta";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
