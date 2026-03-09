// Auto-generate suggested tags from design title/filename

const KEYWORD_MAP: Record<string, string[]> = {
  bebe: ["bebê", "infantil", "maternidade", "baby"],
  baby: ["bebê", "infantil", "maternidade"],
  urso: ["urso", "ursinho", "animal", "infantil"],
  flor: ["floral", "flores", "jardim"],
  flores: ["floral", "flores", "jardim"],
  floral: ["floral", "flores", "jardim"],
  rosa: ["rosa", "floral", "feminino"],
  borboleta: ["borboleta", "natureza", "delicado"],
  cozinha: ["cozinha", "pano de prato", "lar"],
  prato: ["pano de prato", "cozinha"],
  toalha: ["toalha", "banho", "lar"],
  natal: ["natal", "natalino", "festivo"],
  pascoa: ["páscoa", "festivo"],
  infantil: ["infantil", "criança", "kids"],
  menina: ["menina", "feminino", "infantil"],
  menino: ["menino", "masculino", "infantil"],
  coelho: ["coelho", "animal", "infantil"],
  gato: ["gato", "animal", "pet"],
  cachorro: ["cachorro", "animal", "pet"],
  coracao: ["coração", "amor", "romântico"],
  monograma: ["monograma", "letra", "personalizado"],
  letra: ["letra", "monograma", "alfabeto"],
  frutas: ["frutas", "cozinha", "colorido"],
  galinha: ["galinha", "cozinha", "country"],
  country: ["country", "rústico", "fazenda"],
  nuvem: ["nuvem", "céu", "infantil"],
  estrela: ["estrela", "céu", "infantil"],
  unicornio: ["unicórnio", "fantasia", "infantil"],
  sereia: ["sereia", "fantasia", "infantil"],
  ancora: ["âncora", "marítimo", "náutico"],
  barco: ["barco", "marítimo", "náutico"],
  maternidade: ["maternidade", "bebê", "infantil"],
  kit: ["kit", "conjunto"],
  matriz: ["matriz", "bordado"],
  ponto: ["ponto cruz", "bordado"],
  cruz: ["ponto cruz", "bordado"],
  delicado: ["delicado", "fino", "elegante"],
};

const STOPWORDS = new Set([
  "de", "do", "da", "dos", "das", "e", "em", "para", "com", "por",
  "um", "uma", "o", "a", "os", "as", "no", "na", "nos", "nas",
  "matriz", "bordado", "design", "arquivo", "file",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

export function generateTagsFromName(name: string): string[] {
  const normalized = normalize(name);
  const words = normalized.split(/[\s_\-]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const tags = new Set<string>();

  // Add original meaningful words
  words.forEach((word) => {
    if (!STOPWORDS.has(word)) {
      tags.add(word);
    }
    // Check keyword map for related tags
    if (KEYWORD_MAP[word]) {
      KEYWORD_MAP[word].forEach((t) => tags.add(t));
    }
  });

  // Remove duplicates that are too similar to original words
  return Array.from(tags).slice(0, 10);
}
