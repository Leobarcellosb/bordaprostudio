/**
 * Pastas "Por Tema" da biblioteca, derivadas das TAGS dos designs.
 *
 * Substituiu o sistema antigo baseado em `categories` (1 FK por design) que
 * caiu em pastas erradas porque a realidade é N tags por design. Aqui um
 * design pode aparecer em várias pastas se as tags baterem — melhor pra
 * usuária achar.
 *
 * REGRAS DE MATCH (importante):
 *   - tags_text é vírgula-separado. Split, normaliza, compara TAG INTEIRA.
 *     Nunca substring na string crua (senão "sapato" cai em Animais por
 *     conter "pato", "chave" cai em Animais por conter "ave").
 *   - Match é case-insensitive na tag normalizada.
 *   - Pasta = ASSUNTO do desenho, não estilo. Tags como "fofo, colorido,
 *     adulto, delicado, elegante, vintage, clássico, cartoon" NÃO entram
 *     aqui — vão virar filtro de estilo separado depois.
 *
 * OVERRIDE MANUAL:
 *   - `designs.manual_categories` (TEXT[]) — quando não vazio, substitui a
 *     derivação automática inteira pra aquele design.
 */

export interface FolderRule {
  id: string;     // slug — match contra manual_categories
  name: string;   // display
  tags: string[]; // tag-keywords (lowercase, match exato após split por vírgula)
}

export const FOLDER_RULES: FolderRule[] = [
  {
    id: "infantil",
    name: "Infantil",
    tags: ["infantil","bebê","bebe","criança","crianca","menina","menino","brinquedo","baby","kids"],
  },
  {
    id: "animais",
    name: "Animais",
    tags: [
      "animal","animais","bicho","bichinho","fauna","selva",
      "urso","ursinho","coelho","coelhinho","gato","gatinho","cachorro","cachorrinho","cão","cao",
      "cavalo","cavalinho","ovelha","ovelhinha","dinossauro","dino","leão","leao","tigre","raposa",
      "vaca","pato","borboleta","peixe","ave","pássaro","passaro","coruja","baleia","flamingo",
      "panda","elefante","macaco","jacaré","jacare","tartaruga",
    ],
  },
  {
    id: "florais",
    name: "Florais",
    tags: [
      "flor","flores","floral","rosa","rosas","margarida","girassol",
      "folha","folhas","folhagem","jardim","botânico","botanico",
      "buquê","buque","ramo","pétala","petala","tulipa","orquídea","orquidea","natureza",
    ],
  },
  {
    id: "datas-comemorativas",
    name: "Datas Comemorativas",
    tags: [
      "natal","natalino","páscoa","pascoa","dia das mães","dia das maes","dia dos pais",
      "halloween","aniversário","aniversario","festa junina","junina","ano novo",
      "valentine","namorado","namorada","festivo","carnaval","comemorativa","festa",
    ],
  },
  {
    id: "religioso",
    name: "Religioso",
    tags: [
      "santo","santa","bíblia","biblia","católico","catolico","cristão","cristao",
      "cruz","anjo","oração","oracao","terço","terco","jesus","maria","deus",
      "espiritual","religioso","orando","menina orando","menino orando",
    ],
  },
  {
    id: "frases-letras",
    name: "Frases & Letras",
    tags: ["frase","palavra","lettering","citação","citacao","motivacional","texto","escrito"],
  },
  {
    id: "monogramas",
    name: "Monogramas",
    tags: ["monograma","monogramas","letra","letras","inicial","iniciais","alfabeto","fonte decorativa"],
  },
  {
    id: "profissoes",
    name: "Profissões",
    tags: [
      "médico","medico","médica","medica","enfermeiro","enfermeira",
      "advogado","advogada","professor","professora","engenheiro","engenheira",
      "veterinário","veterinaria","dentista","chef","profissão","profissao",
    ],
  },
  {
    id: "molduras-bordas",
    name: "Molduras e Bordas",
    tags: ["moldura","molduras","borda","bordas","ornamental","arabesco","arabescos","geométrico","geometrico","barra"],
  },
  {
    id: "espaco-aventura",
    name: "Espaço & Aventura",
    tags: ["astronauta","foguete","espaço","espaco","lua","estrela","estrelas","planeta","aventura","espacial","celestial","noturno","balão","balao"],
  },
  {
    id: "esportes-hobbies",
    name: "Esportes & Hobbies",
    tags: ["bicicleta","ciclista","troféu","trofeu","esporte","jogo","futebol","basquete","skate","surf"],
  },
];

export const FOLDER_BY_ID = new Map<string, FolderRule>(
  FOLDER_RULES.map((f) => [f.id, f]),
);

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

/** Tokens ignorados no split por palavra (preposições/artigos comuns que não
 *  carregam assunto). NÃO é uma filtro de stopwords completo — só pra evitar
 *  ruído óbvio caso tag tenha conectivos. */
const MIN_TOKEN_LEN = 3;

/**
 * Pastas em que o design deve aparecer.
 *
 * - Se manual_categories tem ≥1 ID válido, usa SÓ esses (override total).
 * - Senão, deriva das tags. Match contra rule.tags acontece se a keyword
 *   for igual a:
 *     (a) uma tag INTEIRA do design (já normalizada), OU
 *     (b) qualquer PALAVRA (≥3 letras) dentro de uma tag composta do
 *         design (split por espaço).
 *
 *   Isso captura "moldura floral" tanto em Molduras quanto em Florais
 *   sem reabrir o risco de substring fortuita (ex: "sapato" não casa com
 *   "pato" porque o split é por palavra, não por substring).
 *
 *   Keywords multi-palavra como "dia das mães" continuam casando via
 *   tag-inteira match (caminho a).
 */
export function deriveFoldersForDesign(
  tagsText: string | null | undefined,
  manualCategories: string[] | null | undefined,
): string[] {
  if (manualCategories && manualCategories.length > 0) {
    return manualCategories.filter((id) => FOLDER_BY_ID.has(id));
  }
  const designTags = parseTagsText(tagsText);
  if (designTags.length === 0) return [];

  // Constrói o conjunto de "alvos de match" do design: tags inteiras +
  // palavras ≥3 letras dentro das tags compostas.
  const targets = new Set<string>();
  for (const tag of designTags) {
    targets.add(tag);
    for (const word of tag.split(/\s+/)) {
      const w = word.trim().toLowerCase();
      if (w.length >= MIN_TOKEN_LEN) targets.add(w);
    }
  }

  const matched: string[] = [];
  for (const rule of FOLDER_RULES) {
    if (rule.tags.some((kw) => targets.has(kw.toLowerCase()))) {
      matched.push(rule.id);
    }
  }
  return matched;
}

/** Tags de uma pasta — pra uso em filtros server-side. */
export function tagsForFolder(folderId: string): string[] {
  return FOLDER_BY_ID.get(folderId)?.tags.map((t) => t.toLowerCase()) ?? [];
}
