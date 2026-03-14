import { useState, useEffect } from "react";
import { db } from "@/lib/db";

interface SuggestedDesign {
  id: string;
  name: string;
  cover_image: string | null;
  category_name: string | null;
  tags: string[];
  hoop_size: string | null;
}

export interface SmartSuggestions {
  combinaCom: SuggestedDesign[];
  completeSuaColecao: SuggestedDesign[];
  podeVenderJunto: SuggestedDesign[];
  loading: boolean;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function parseTags(text: string | null): string[] {
  return (text || "").split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 1);
}

function tagOverlap(tagsA: string[], tagsB: string[]): number {
  return tagsA.filter(t => tagsB.includes(t)).length;
}

// Semantic theme groups for "pode vender junto" complementary logic
const COMPLEMENTARY_GROUPS: string[][] = [
  ["nuvem", "lua", "estrela", "balao", "arcoiris", "ceu", "baby"],
  ["safari", "leao", "elefante", "girafa", "zebra", "macaco", "hipopotamo"],
  ["flor", "flores", "floral", "rosa", "girassol", "margarida", "jardim"],
  ["natal", "natalino", "papai noel", "rena", "arvore", "presente", "sino"],
  ["pascoa", "coelho", "ovo", "cenoura"],
  ["fazenda", "galinha", "cavalo", "vaca", "porco", "pato"],
  ["frutas", "morango", "cereja", "abacaxi", "melancia", "banana"],
  ["cozinha", "cafe", "bolo", "cupcake", "doce"],
  ["urso", "ursinho", "teddy"],
  ["borboleta", "joaninha", "abelha", "inseto"],
  ["monograma", "letra", "alfabeto", "nome"],
  ["coracao", "amor", "valentines"],
  ["bailarina", "ballet", "danca"],
  ["circo", "palhaco", "tenda"],
  ["unicornio", "fantasia", "arcoiris"],
  ["gato", "gatinho", "cat"],
  ["cachorro", "dog", "pet"],
  ["religioso", "anjo", "cruz", "terco"],
];

function findComplementaryGroup(tags: string[]): string[] | null {
  const normalizedTags = tags.map(normalize);
  for (const group of COMPLEMENTARY_GROUPS) {
    const overlap = group.filter(kw => normalizedTags.some(t => t.includes(kw)));
    if (overlap.length > 0) return group;
  }
  return null;
}

function toSuggested(d: any): SuggestedDesign {
  return {
    id: d.id,
    name: d.generated_title || d.name,
    cover_image: d.cover_image,
    category_name: d.category_name || d.categories?.name || null,
    tags: parseTags(d.tags_text),
    hoop_size: d.hoop_size,
  };
}

export function useSmartSuggestions(designId: string | undefined, design: any | null) {
  const [suggestions, setSuggestions] = useState<SmartSuggestions>({
    combinaCom: [],
    completeSuaColecao: [],
    podeVenderJunto: [],
    loading: true,
  });

  useEffect(() => {
    if (!designId || !design) return;

    const run = async () => {
      try {
        const designTags = parseTags(design.tags_text);
        const designKeywords = normalize(design.name + " " + (design.tags_text || "")).split(/\s+/).filter(w => w.length > 2);

        // Fetch candidate designs (same category + broad search)
        const queries = [
          db.from("designs")
            .select("*, categories(name)")
            .eq("is_published", true)
            .neq("id", designId)
            .limit(200)
            .order("created_at", { ascending: false }),
        ];

        if (design.category_id) {
          queries.push(
            db.from("designs")
              .select("*, categories(name)")
              .eq("is_published", true)
              .eq("category_id", design.category_id)
              .neq("id", designId)
              .limit(100)
          );
        }

        const results = await Promise.all(queries);
        const allDesigns = results.flatMap(r => r.data || []);

        // Deduplicate
        const seen = new Set<string>();
        const unique = allDesigns.filter(d => {
          if (seen.has(d.id)) return false;
          seen.add(d.id);
          return true;
        });

        // Score each design for "combina com"
        const scored = unique.map(d => {
          const dTags = parseTags(d.tags_text);
          let score = 0;

          // Tag overlap (strongest signal)
          score += tagOverlap(designTags, dTags) * 10;

          // Same category
          if (design.category_id && d.category_id === design.category_id) score += 5;

          // Compatible hoop size
          if (design.hoop_size && d.hoop_size === design.hoop_size) score += 3;

          // Keyword overlap in name
          const dNorm = normalize(d.name);
          for (const kw of designKeywords) {
            if (dNorm.includes(kw)) score += 2;
          }

          return { design: d, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // Section 1: "Combina com" - top scored
        const combinaCom = scored
          .filter(s => s.score > 0)
          .slice(0, 8)
          .map(s => toSuggested(s.design));

        // Section 2: "Complete sua coleção" - collection detection
        const complementaryGroup = findComplementaryGroup(designTags.concat(designKeywords));
        let completeSuaColecao: SuggestedDesign[] = [];

        if (complementaryGroup) {
          const collectionDesigns = unique.filter(d => {
            const text = normalize((d.name || "") + " " + (d.tags_text || ""));
            return complementaryGroup.some(kw => text.includes(kw));
          });

          // Exclude those already in combinaCom
          const combinaIds = new Set(combinaCom.map(c => c.id));
          completeSuaColecao = collectionDesigns
            .filter(d => !combinaIds.has(d.id))
            .slice(0, 8)
            .map(toSuggested);
        }

        // Section 3: "Pode vender junto" - complementary commercial sense
        const usedIds = new Set([
          ...combinaCom.map(c => c.id),
          ...completeSuaColecao.map(c => c.id),
        ]);

        // Find designs that share category but have different tags (complementary)
        const podeVenderJunto = scored
          .filter(s => {
            if (usedIds.has(s.design.id)) return false;
            if (s.score <= 0) return false;
            const dTags = parseTags(s.design.tags_text);
            const overlap = tagOverlap(designTags, dTags);
            // Want some relevance but not identical
            return overlap >= 1 && overlap < designTags.length;
          })
          .slice(0, 8)
          .map(s => toSuggested(s.design));

        // If not enough from scoring, fill with same-category designs
        if (podeVenderJunto.length < 4 && design.category_id) {
          const remaining = unique
            .filter(d => d.category_id === design.category_id && !usedIds.has(d.id) && !podeVenderJunto.some(p => p.id === d.id))
            .slice(0, 8 - podeVenderJunto.length)
            .map(toSuggested);
          podeVenderJunto.push(...remaining);
        }

        setSuggestions({
          combinaCom,
          completeSuaColecao,
          podeVenderJunto: podeVenderJunto.slice(0, 8),
          loading: false,
        });
      } catch (err) {
        console.error("[useSmartSuggestions] error:", err);
        setSuggestions(prev => ({ ...prev, loading: false }));
      }
    };

    run();
  }, [designId, design]);

  return suggestions;
}
