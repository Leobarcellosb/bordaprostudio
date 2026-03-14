import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db";

export interface SuggestedKit {
  id: string;
  name: string;
  keyword: string;
  designs: {
    id: string;
    name: string;
    generated_title: string | null;
    cover_image: string | null;
    category_name: string | null;
    hoop_size: string | null;
  }[];
}

// Normalize text: lowercase, remove accents, trim
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
  "matriz", "bordado", "design", "arquivo", "file", "com", "fofa",
  "fofo", "cute", "lindo", "linda", "mini", "super",
]);

// Dimension patterns to strip: "13x14", "10x10cm", etc.
const DIMENSION_RE = /\b\d+x\d+\w*/g;

// Known keyword → cluster label mappings
const CLUSTER_LABELS: Record<string, string> = {
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
  rosa: "Flores",
  girassol: "Girassóis",
  margarida: "Flores",
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
  nuvem: "Nuvens & Céu",
  estrela: "Nuvens & Céu",
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
};

const MIN_CLUSTER_SIZE = 3;

function extractKeywords(name: string): string[] {
  const clean = normalize(name).replace(DIMENSION_RE, "");
  return clean
    .split(/[\s_\-]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function clusterDesigns(designs: any[]): SuggestedKit[] {
  // Map each design to its keywords
  const designKeywords = designs.map((d) => ({
    design: d,
    keywords: extractKeywords(d.generated_title || d.name),
  }));

  // Build clusters: keyword → design[]
  const clusters = new Map<string, Set<string>>(); // clusterLabel → Set<designId>
  const clusterDesignsMap = new Map<string, any[]>();

  for (const { design, keywords } of designKeywords) {
    for (const kw of keywords) {
      const label = CLUSTER_LABELS[kw];
      if (!label) continue;

      if (!clusters.has(label)) {
        clusters.set(label, new Set());
        clusterDesignsMap.set(label, []);
      }
      if (!clusters.get(label)!.has(design.id)) {
        clusters.get(label)!.add(design.id);
        clusterDesignsMap.get(label)!.push(design);
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

  // Merge category clusters that don't overlap with keyword clusters
  for (const [catName, catDesigns] of catClusters) {
    if (catDesigns.length < MIN_CLUSTER_SIZE) continue;
    const label = `${catName}`;
    if (clusterDesignsMap.has(label)) continue; // already covered
    clusterDesignsMap.set(label, catDesigns.slice(0, 12));
  }

  // Filter clusters with minimum size and build suggestions
  const suggestions: SuggestedKit[] = [];

  for (const [label, clusterItems] of clusterDesignsMap) {
    if (clusterItems.length < MIN_CLUSTER_SIZE) continue;

    suggestions.push({
      id: `suggestion-${label.toLowerCase().replace(/\s+/g, "-")}`,
      name: `Kit ${label}`,
      keyword: label,
      designs: clusterItems.slice(0, 12).map((d: any) => ({
        id: d.id,
        name: d.name,
        generated_title: d.generated_title,
        cover_image: d.cover_image,
        category_name: d.category_name || d.categories?.name || null,
        hoop_size: d.hoop_size,
      })),
    });
  }

  // Sort by number of designs descending
  suggestions.sort((a, b) => b.designs.length - a.designs.length);

  return suggestions.slice(0, 10);
}

export function useKitSuggestions() {
  const [suggestions, setSuggestions] = useState<SuggestedKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAndCluster = async () => {
      try {
        // Fetch recent published designs (up to 500 for clustering)
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
        const results = data || [];
        const clustered = clusterDesigns(results);
        setSuggestions(clustered);
      } catch (err) {
        console.error("[useKitSuggestions] error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCluster();
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  return { suggestions: visibleSuggestions, loading, dismiss };
}
