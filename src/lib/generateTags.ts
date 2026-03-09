// Auto-generate suggested tags and category from design title/filename

const KEYWORD_MAP: Record<string, string[]> = {
  // Animals & insects
  abelha: ["abelha", "abelhas", "inseto", "natureza"],
  abelhas: ["abelha", "abelhas", "inseto", "natureza"],
  borboleta: ["borboleta", "inseto", "natureza", "delicado"],
  joaninha: ["joaninha", "inseto", "natureza", "infantil"],
  urso: ["urso", "ursinho", "animal"],
  ursinho: ["urso", "ursinho", "animal"],
  coelho: ["coelho", "animal"],
  gato: ["gato", "animal", "pet"],
  cachorro: ["cachorro", "animal", "pet"],
  passaro: ["pássaro", "ave", "natureza"],
  coruja: ["coruja", "ave", "natureza"],
  galinha: ["galinha", "animal", "cozinha", "country"],
  elefante: ["elefante", "animal", "safari"],
  leao: ["leão", "animal", "safari"],
  girafa: ["girafa", "animal", "safari"],
  unicornio: ["unicórnio", "fantasia"],
  sereia: ["sereia", "fantasia"],
  cavalo: ["cavalo", "animal"],
  peixe: ["peixe", "animal", "mar"],
  tartaruga: ["tartaruga", "animal", "mar"],

  // Baby & kids
  bebe: ["bebê", "maternidade", "baby"],
  baby: ["baby", "bebê", "maternidade"],
  infantil: ["infantil", "criança", "kids"],
  maternidade: ["maternidade", "bebê"],
  menina: ["menina", "feminino"],
  menino: ["menino", "masculino"],
  crianca: ["criança", "infantil", "kids"],

  // Floral & nature
  flor: ["floral", "flores", "jardim"],
  flores: ["floral", "flores", "jardim"],
  floral: ["floral", "flores", "jardim"],
  rosa: ["rosa", "floral", "feminino"],
  girassol: ["girassol", "floral", "natureza"],
  margarida: ["margarida", "floral", "natureza"],
  lavanda: ["lavanda", "floral", "natureza"],
  folha: ["folha", "natureza", "botânico"],
  folhas: ["folhas", "natureza", "botânico"],
  jardim: ["jardim", "natureza", "floral"],
  nuvem: ["nuvem", "céu"],
  estrela: ["estrela", "céu"],
  arcoiris: ["arco-íris", "colorido", "infantil"],
  sol: ["sol", "natureza", "verão"],
  lua: ["lua", "céu", "noite"],

  // Seasonal & holidays
  natal: ["natal", "natalino", "festivo", "decoração"],
  natalino: ["natal", "natalino", "festivo"],
  pascoa: ["páscoa", "festivo"],
  halloween: ["halloween", "festivo"],
  carnaval: ["carnaval", "festivo"],

  // Home & kitchen
  cozinha: ["cozinha", "pano de prato", "lar"],
  prato: ["pano de prato", "cozinha"],
  toalha: ["toalha", "banho", "lar"],
  frutas: ["frutas", "cozinha", "colorido"],
  country: ["country", "rústico", "fazenda"],
  fazenda: ["fazenda", "country", "rústico"],
  casa: ["casa", "lar", "decoração"],
  decoracao: ["decoração", "lar"],

  // Style & technique
  coracao: ["coração", "amor", "romântico"],
  amor: ["amor", "coração", "romântico"],
  monograma: ["monograma", "letra", "personalizado"],
  letra: ["letra", "monograma", "alfabeto"],
  alfabeto: ["alfabeto", "letra", "monograma"],
  delicado: ["delicado", "fino", "elegante"],
  vintage: ["vintage", "retrô", "clássico"],
  geometrico: ["geométrico", "moderno"],
  mandala: ["mandala", "zen", "decorativo"],
  renda: ["renda", "delicado", "clássico"],
  barrado: ["barrado", "borda", "acabamento"],

  // Maritime
  ancora: ["âncora", "marítimo", "náutico"],
  barco: ["barco", "marítimo", "náutico"],
  mar: ["mar", "praia", "náutico"],
  praia: ["praia", "mar", "verão"],

  // Craft
  kit: ["kit", "conjunto"],
  matriz: ["matriz", "bordado"],
  ponto: ["ponto cruz", "bordado"],
  cruz: ["ponto cruz", "bordado"],
  bordado: ["bordado", "artesanato"],
  richelieu: ["richelieu", "bordado", "clássico"],

  // Religious
  religioso: ["religioso", "fé"],
  anjo: ["anjo", "religioso", "fé"],
  cruz_religiosa: ["cruz", "religioso", "fé"],
  santo: ["santo", "religioso"],

  // Sports & hobbies
  futebol: ["futebol", "esporte"],
  esporte: ["esporte", "atividade"],
  musica: ["música", "arte"],
  bailarina: ["bailarina", "dança", "feminino"],
  danca: ["dança", "arte"],

  // Food & fruits
  morango: ["morango", "fruta", "cozinha"],
  cereja: ["cereja", "fruta", "cozinha"],
  cafe: ["café", "cozinha", "bebida"],
  cupcake: ["cupcake", "doce", "cozinha"],
  bolo: ["bolo", "doce", "cozinha"],
};

// Maps keywords to category names (first match wins)
const CATEGORY_MAP: Record<string, string[]> = {
  animais: [
    "abelha", "abelhas", "borboleta", "joaninha", "urso", "ursinho", "coelho",
    "gato", "cachorro", "passaro", "coruja", "galinha", "elefante", "leao",
    "girafa", "cavalo", "peixe", "tartaruga", "animal", "inseto", "pet",
  ],
  infantil: [
    "bebe", "baby", "infantil", "maternidade", "menina", "menino", "crianca",
    "unicornio", "sereia", "arcoiris", "bailarina",
  ],
  floral: [
    "flor", "flores", "floral", "rosa", "girassol", "margarida", "lavanda",
    "jardim", "folha", "folhas",
  ],
  natal: ["natal", "natalino"],
  cozinha: [
    "cozinha", "prato", "galinha", "frutas", "morango", "cereja", "cafe",
    "cupcake", "bolo", "country", "fazenda",
  ],
  religioso: ["religioso", "anjo", "santo"],
  "ponto cruz": ["ponto", "cruz"],
  monograma: ["monograma", "letra", "alfabeto"],
  marítimo: ["ancora", "barco", "mar", "praia"],
  festivo: ["pascoa", "halloween", "carnaval"],
  decorativo: ["mandala", "geometrico", "vintage", "decoracao", "barrado", "renda"],
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

  words.forEach((word) => {
    if (!STOPWORDS.has(word)) {
      tags.add(word);
    }
    if (KEYWORD_MAP[word]) {
      KEYWORD_MAP[word].forEach((t) => tags.add(t));
    }
  });

  return Array.from(tags).slice(0, 12);
}

/**
 * Suggest a category name based on keywords in the file name.
 * Returns the category name string (e.g. "Animais", "Infantil") or null.
 */
export function suggestCategoryFromName(name: string): string | null {
  const normalized = normalize(name);
  const words = normalized.split(/[\s_\-]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));

  // Score each category by how many keyword hits it gets
  const scores = new Map<string, number>();

  for (const word of words) {
    for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
      if (keywords.includes(word)) {
        scores.set(category, (scores.get(category) || 0) + 1);
      }
    }
  }

  if (scores.size === 0) return null;

  // Return the category with the highest score
  let best: string | null = null;
  let bestScore = 0;
  for (const [cat, score] of scores) {
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }

  // Capitalize first letter
  return best ? best.charAt(0).toUpperCase() + best.slice(1) : null;
}
