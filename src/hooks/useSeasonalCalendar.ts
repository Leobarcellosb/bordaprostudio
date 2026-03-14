import { useState, useEffect } from "react";
import { db } from "@/lib/db";

export interface SeasonalTheme {
  name: string;
  keywords: string[];
  icon: string;
}

export interface SeasonalMonth {
  month: number;
  label: string;
  themes: SeasonalTheme[];
}

export interface EnrichedTheme extends SeasonalTheme {
  matchingDesigns: { id: string; name: string; generated_title: string | null; cover_image: string | null }[];
  matchCount: number;
}

const SEASONAL_DATABASE: SeasonalMonth[] = [
  {
    month: 1, label: "Janeiro",
    themes: [
      { name: "Verão", keywords: ["verao", "sol", "praia", "summer"], icon: "☀️" },
      { name: "Praia", keywords: ["praia", "mar", "onda", "concha", "peixe"], icon: "🏖️" },
      { name: "Férias", keywords: ["ferias", "viagem", "tropical"], icon: "🌴" },
    ],
  },
  {
    month: 2, label: "Fevereiro",
    themes: [
      { name: "Dia dos Namorados", keywords: ["coracao", "amor", "love", "heart", "namorados"], icon: "❤️" },
      { name: "Carnaval", keywords: ["carnaval", "mascara", "festa", "confete"], icon: "🎭" },
    ],
  },
  {
    month: 3, label: "Março",
    themes: [
      { name: "Dia da Mulher", keywords: ["mulher", "feminino", "flor", "rosa"], icon: "🌸" },
      { name: "Outono", keywords: ["outono", "folha", "folhas"], icon: "🍂" },
    ],
  },
  {
    month: 4, label: "Abril",
    themes: [
      { name: "Páscoa", keywords: ["pascoa", "coelho", "ovo", "cenoura", "bunny", "easter"], icon: "🐰" },
      { name: "Índio", keywords: ["indio", "indigena", "cocar"], icon: "🪶" },
    ],
  },
  {
    month: 5, label: "Maio",
    themes: [
      { name: "Dia das Mães", keywords: ["mae", "maes", "mamae", "mother", "familia", "flor", "coracao"], icon: "💐" },
      { name: "Flores", keywords: ["flor", "flores", "floral", "rosa", "girassol", "margarida"], icon: "🌷" },
    ],
  },
  {
    month: 6, label: "Junho",
    themes: [
      { name: "Festa Junina", keywords: ["junina", "junino", "sao joao", "fogueira", "milho", "chapeu", "country", "fazenda", "bandeirinha"], icon: "🌽" },
      { name: "Dia dos Namorados", keywords: ["coracao", "amor", "love", "namorados"], icon: "💕" },
    ],
  },
  {
    month: 7, label: "Julho",
    themes: [
      { name: "Inverno", keywords: ["inverno", "frio", "cachecol", "neve", "winter"], icon: "❄️" },
      { name: "Férias", keywords: ["ferias", "viagem"], icon: "✈️" },
    ],
  },
  {
    month: 8, label: "Agosto",
    themes: [
      { name: "Dia dos Pais", keywords: ["pai", "pais", "papai", "father", "bigode"], icon: "👔" },
      { name: "Folclore", keywords: ["folclore", "saci", "curupira", "boto", "iara"], icon: "🧙" },
    ],
  },
  {
    month: 9, label: "Setembro",
    themes: [
      { name: "Primavera", keywords: ["primavera", "flor", "flores", "borboleta", "jardim"], icon: "🦋" },
      { name: "Independência", keywords: ["brasil", "bandeira", "patria"], icon: "🇧🇷" },
    ],
  },
  {
    month: 10, label: "Outubro",
    themes: [
      { name: "Halloween", keywords: ["halloween", "abobora", "fantasma", "bruxa", "morcego", "ghost", "pumpkin"], icon: "🎃" },
      { name: "Dia das Crianças", keywords: ["crianca", "infantil", "brinquedo", "baby", "bebe"], icon: "🧸" },
    ],
  },
  {
    month: 11, label: "Novembro",
    themes: [
      { name: "Black Friday", keywords: ["promo", "desconto", "sale"], icon: "🏷️" },
      { name: "Consciência Negra", keywords: ["africa", "afro", "consciencia"], icon: "✊" },
    ],
  },
  {
    month: 12, label: "Dezembro",
    themes: [
      { name: "Natal", keywords: ["natal", "natalino", "papai noel", "rena", "arvore", "christmas", "santa", "estrela", "noel", "sino"], icon: "🎄" },
      { name: "Ano Novo", keywords: ["ano novo", "reveillon", "champagne", "fogos"], icon: "🎆" },
    ],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

export function useSeasonalCalendar() {
  const [themes, setThemes] = useState<EnrichedTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<SeasonalMonth | null>(null);

  useEffect(() => {
    const month = new Date().getMonth() + 1;
    const monthData = SEASONAL_DATABASE.find((m) => m.month === month) || SEASONAL_DATABASE[0];
    setCurrentMonth(monthData);

    const run = async () => {
      try {
        // Fetch designs to match against themes
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
        const designs = data || [];

        // Normalize all design texts for matching
        const designTexts = designs.map((d: any) => ({
          design: d,
          text: normalize(
            [d.name, d.generated_title, d.tags_text, d.category_name]
              .filter(Boolean)
              .join(" ")
          ),
        }));

        // Enrich each theme with matching designs
        const enriched: EnrichedTheme[] = monthData.themes.map((theme) => {
          const matching = designTexts.filter(({ text }) =>
            theme.keywords.some((kw) => text.includes(normalize(kw)))
          );

          // Deduplicate
          const seen = new Set<string>();
          const unique = matching.filter(({ design }) => {
            if (seen.has(design.id)) return false;
            seen.add(design.id);
            return true;
          });

          return {
            ...theme,
            matchingDesigns: unique.slice(0, 12).map(({ design }) => ({
              id: design.id,
              name: design.name,
              generated_title: design.generated_title,
              cover_image: design.cover_image,
            })),
            matchCount: unique.length,
          };
        });

        setThemes(enriched);
      } catch (err) {
        console.error("[useSeasonalCalendar] error:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return { themes, loading, currentMonth };
}
