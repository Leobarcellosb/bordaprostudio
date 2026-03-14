import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";

export interface SuggestedCollection {
  id: string;
  name: string;
  theme: string;
  designs: {
    id: string;
    name: string;
    generated_title: string | null;
    cover_image: string | null;
    category_name: string | null;
    hoop_size: string | null;
  }[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "de", "do", "da", "dos", "das", "e", "em", "para", "com", "por",
  "um", "uma", "o", "a", "os", "as", "no", "na", "nos", "nas",
  "matriz", "bordado", "design", "arquivo", "file", "fofa",
  "fofo", "cute", "lindo", "linda", "mini", "super",
]);

const DIMENSION_RE = /\b\d+x\d+\w*/g;

// Theme mappings: keyword → theme label
const THEME_MAP: Record<string, string> = {
  urso: "Ursinhos",
  ursinho: "Ursinhos",
  baleia: "Fundo do Mar",
  peixe: "Fundo do Mar",
  tartaruga: "Fundo do Mar",
  mar: "Fundo do Mar",
  sereia: "Fundo do Mar",
  borboleta: "Borboletas",
  joaninha: "Insetos & Jardim",
  abelha: "Abelhinhas",
  flor: "Flores",
  flores: "Flores",
  floral: "Flores",
  rosa: "Rosas",
  girassol: "Girassóis",
  margarida: "Margaridas",
  natal: "Natal",
  natalino: "Natal",
  pascoa: "Páscoa",
  coelho: "Coelhinhos",
  gato: "Gatinhos",
  cachorro: "Cachorrinhos",
  unicornio: "Unicórnios",
  circo: "Circo",
  safari: "Safari",
  elefante: "Safari",
  leao: "Safari",
  girafa: "Safari",
  fazenda: "Fazendinha",
  galinha: "Fazendinha",
  cavalo: "Fazendinha",
  bailarina: "Bailarinas",
  coruja: "Corujas",
  passaro: "Pássaros",
  nuvem: "Céu Baby",
  estrela: "Céu Baby",
  lua: "Céu Baby",
  arcoiris: "Arco-Íris",
  cozinha: "Cozinha",
  frutas: "Frutas",
  morango: "Frutas",
  cereja: "Frutas",
  cafe: "Café",
  bolo: "Doces",
  cupcake: "Doces",
  coracao: "Corações",
  amor: "Corações",
  monograma: "Monogramas",
  letra: "Monogramas",
  alfabeto: "Monogramas",
  religioso: "Religioso",
  anjo: "Anjos",
  mandala: "Mandalas",
  baby: "Baby",
  bebe: "Baby",
  infantil: "Infantil",
  menina: "Meninas",
  menino: "Meninos",
  balao: "Balões",
  country: "Country",
  vintage: "Vintage",
  geometrico: "Geométrico",
};

const MIN_COLLECTION_SIZE = 4;

function extractKeywords(name: string): string[] {
  const clean = normalize(name).replace(DIMENSION_RE, "");
  return clean
    .split(/[\s_\-]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function detectCollections(designs: any[]): SuggestedCollection[] {
  const designKeywords = designs.map((d) => ({
    design: d,
    keywords: extractKeywords(d.generated_title || d.name),
  }));

  // Build theme clusters
  const themeIds = new Map<string, Set<string>>();
  const themeDesigns = new Map<string, any[]>();

  for (const { design, keywords } of designKeywords) {
    for (const kw of keywords) {
      const theme = THEME_MAP[kw];
      if (!theme) continue;

      if (!themeIds.has(theme)) {
        themeIds.set(theme, new Set());
        themeDesigns.set(theme, []);
      }
      if (!themeIds.get(theme)!.has(design.id)) {
        themeIds.get(theme)!.add(design.id);
        themeDesigns.get(theme)!.push(design);
      }
    }
  }

  // Also cluster by category
  const catClusters = new Map<string, any[]>();
  for (const d of designs) {
    const catName = d.category_name || d.categories?.name;
    if (!catName) continue;
    if (!catClusters.has(catName)) catClusters.set(catName, []);
    catClusters.get(catName)!.push(d);
  }

  for (const [catName, catDesignsList] of catClusters) {
    if (catDesignsList.length < MIN_COLLECTION_SIZE) continue;
    if (themeDesigns.has(catName)) continue;
    themeDesigns.set(catName, catDesignsList.slice(0, 16));
  }

  // Build suggestions
  const collections: SuggestedCollection[] = [];

  for (const [theme, items] of themeDesigns) {
    if (items.length < MIN_COLLECTION_SIZE) continue;

    collections.push({
      id: `col-${theme.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      name: `Coleção ${theme}`,
      theme,
      designs: items.slice(0, 16).map((d: any) => ({
        id: d.id,
        name: d.name,
        generated_title: d.generated_title,
        cover_image: d.cover_image,
        category_name: d.category_name || d.categories?.name || null,
        hoop_size: d.hoop_size,
      })),
    });
  }

  collections.sort((a, b) => b.designs.length - a.designs.length);
  return collections.slice(0, 12);
}

export function useCollectionDetector() {
  const [collections, setCollections] = useState<SuggestedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await db.rpc("search_designs", {
          search_term: "",
          p_category_id: null,
          p_hoop_size: null,
          p_stitch_min: null,
          p_stitch_max: null,
          p_sort: "recent",
          p_offset: 0,
          p_limit: 500,
        });

        if (error) throw error;
        setCollections(detectCollections(data || []));
      } catch (err) {
        console.error("[useCollectionDetector] error:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const visible = collections.filter((c) => !dismissed.has(c.id));

  return { collections: visible, loading, dismiss };
}
