import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Official categories with their database IDs
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

const categoryNames = CATEGORIES.map(c => c.name).join(", ");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, raw_filename, tags, image_url } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextParts: string[] = [];
    if (title) contextParts.push(`Título: ${title}`);
    if (raw_filename) contextParts.push(`Nome do arquivo: ${raw_filename}`);
    if (tags) contextParts.push(`Tags: ${tags}`);

    const contextStr = contextParts.join("\n");

    const messages: any[] = [
      {
        role: "system",
        content: `Você é um classificador de matrizes de bordado. Sua tarefa é classificar cada design em EXATAMENTE UMA das categorias oficiais.

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

IMPORTANTE: Sempre escolha a categoria mais específica. Se houver dúvida entre duas categorias, escolha a que melhor descreve o elemento PRINCIPAL do design.`,
      },
    ];

    const userContent: any[] = [];

    if (image_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: image_url },
      });
    }

    userContent.push({
      type: "text",
      text: `Classifique este design de bordado em uma das categorias oficiais.\n\n${contextStr}`,
    });

    messages.push({ role: "user", content: userContent });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "classify_category",
              description: "Return the category classification for the embroidery design",
              parameters: {
                type: "object",
                properties: {
                  category_name: {
                    type: "string",
                    enum: CATEGORIES.map(c => c.name),
                    description: "The official category name that best matches the design",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence level of the classification",
                  },
                },
                required: ["category_name", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_category" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", category_id: null }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let categoryId: string | null = null;
    let categoryName: string | null = null;
    let confidence: string | null = null;

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      categoryName = parsed.category_name || null;
      confidence = parsed.confidence || null;

      if (categoryName) {
        const match = CATEGORIES.find(c => c.name === categoryName);
        if (match) categoryId = match.id;
      }
    }

    // Fallback: try text response
    if (!categoryId) {
      const content = data.choices?.[0]?.message?.content;
      if (content && typeof content === "string") {
        for (const cat of CATEGORIES) {
          if (content.includes(cat.name)) {
            categoryId = cat.id;
            categoryName = cat.name;
            confidence = "low";
            break;
          }
        }
      }
    }

    console.log(`Classified: "${title}" → ${categoryName} (${confidence}), id: ${categoryId}`);

    return new Response(JSON.stringify({ category_id: categoryId, category_name: categoryName, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-design-category error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", category_id: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
