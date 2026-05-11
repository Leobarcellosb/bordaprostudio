import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  { id: "9ab5794d-87c3-4e25-b979-1822a280e72c", name: "Infantil", slug: "infantil" },
  { id: "7236cd41-45b1-424e-899a-4d83bb1e8c99", name: "Animais", slug: "animais" },
  { id: "8fbdb7ab-1b0a-40b7-8c18-ff2b5793762b", name: "Flores", slug: "flores" },
  { id: "3ded1b24-92df-47f0-a5b6-90bf0e5336a9", name: "Datas Comemorativas", slug: "datas-comemorativas" },
  { id: "fc9fb27c-3d04-4cc5-8fb1-ef75af24e888", name: "Monogramas", slug: "monogramas" },
  { id: "28c840bc-67d2-4164-ab64-65be63c2fd42", name: "Nomes", slug: "nomes" },
  { id: "4f664c9a-7c52-42d6-8740-e5a760591539", name: "Religioso", slug: "religioso" },
  { id: "133df0dd-8a90-4505-abd2-7cafc30fcb2f", name: "Profissões", slug: "profissoes" },
  { id: "77bb1f7b-e11a-4043-aff8-f7cbdf2112a4", name: "Frases", slug: "frases" },
];

const categoryNames = CATEGORIES.map((c) => c.name).join(", ");

const SYSTEM_PROMPT = `Você é um classificador de matrizes de bordado. Sua tarefa é classificar cada design em EXATAMENTE UMA das categorias oficiais.

Categorias disponíveis: ${categoryNames}

Regras de classificação:
- Infantil: bebê, criança, cartoon, berço, nursery, personagens infantis, brinquedos, chupeta, mamadeira, safari infantil
- Animais: animais, coruja, urso, baleia, flamingo, gato, cachorro, borboleta, pássaro, insetos, fauna
- Flores: floral, flores, ramos, buquê, pétalas, botânico, folhagens, jardim, rosas, margaridas, girassol
- Datas Comemorativas: natal, páscoa, dia das mães, dia dos pais, halloween, aniversário, festivo, ano novo, carnaval
- Monogramas: letras, iniciais, monogramas, alfabeto, fonte decorativa
- Nomes: nomes próprios, nomes de pessoas, personalização com nome
- Religioso: santos, bíblia, católico, cristão, cruz religiosa, anjo, fé, oração, terço
- Profissões: médico, advogado, professor, enfermeira, engenheiro, símbolos profissionais, ferramentas de trabalho
- Frases: citações, palavras, frases motivacionais, textos decorativos, lettering

IMPORTANTE: Sempre escolha a categoria mais específica. Se houver dúvida entre duas categorias, escolha a que melhor descreve o elemento PRINCIPAL do design.`;

async function fetchImageAsInlineData(
  url: string,
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const mimeType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    let bin = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < buf.byteLength; i += chunkSize) {
      bin += String.fromCharCode.apply(
        null,
        Array.from(buf.subarray(i, i + chunkSize)),
      );
    }
    return { inlineData: { mimeType, data: btoa(bin) } };
  } catch (err) {
    console.error("fetchImageAsInlineData error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, raw_filename, tags, image_url } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const contextParts: string[] = [];
    if (title) contextParts.push(`Título: ${title}`);
    if (raw_filename) contextParts.push(`Nome do arquivo: ${raw_filename}`);
    if (tags) contextParts.push(`Tags: ${tags}`);
    const contextStr = contextParts.join("\n");

    const userParts: unknown[] = [];
    if (image_url) {
      const img = await fetchImageAsInlineData(image_url);
      if (img) userParts.push(img);
    }
    userParts.push({
      text: `Classifique este design de bordado em uma das categorias oficiais.\n\n${contextStr}`,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: userParts }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                category_name: {
                  type: "STRING",
                  enum: CATEGORIES.map((c) => c.name),
                  description: "Nome da categoria oficial que melhor descreve o design",
                },
                confidence: {
                  type: "STRING",
                  enum: ["high", "medium", "low"],
                  description: "Confiança da classificação",
                },
              },
              required: ["category_name", "confidence"],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited", category_id: null }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Gemini error ${response.status}`);
    }

    const data = await response.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;

    let categoryId: string | null = null;
    let categoryName: string | null = null;
    let confidence: string | null = null;

    if (text) {
      try {
        const parsed = JSON.parse(text);
        categoryName = parsed.category_name || null;
        confidence = parsed.confidence || null;
        if (categoryName) {
          const match = CATEGORIES.find((c) => c.name === categoryName);
          if (match) categoryId = match.id;
        }
      } catch {
        for (const cat of CATEGORIES) {
          if (text.includes(cat.name)) {
            categoryId = cat.id;
            categoryName = cat.name;
            confidence = "low";
            break;
          }
        }
      }
    }

    console.log(`Classified: "${title}" → ${categoryName} (${confidence}), id: ${categoryId}`);

    return new Response(
      JSON.stringify({ category_id: categoryId, category_name: categoryName, confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("classify-design-category error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", category_id: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
