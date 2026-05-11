import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT =
  "Você gera ideias de produtos bordados com preços realistas. Responda APENAS com JSON estruturado conforme o schema solicitado.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { designName, category, tags, description } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const prompt = `Você é um especialista em produtos artesanais bordados no Brasil.

Dado o seguinte design de bordado:
- Nome: ${designName || "Sem nome"}
- Categoria: ${category || "Geral"}
- Tags: ${tags || "nenhuma"}
- Descrição: ${description || "Sem descrição"}

Gere exatamente 5 ideias de produtos que podem ser feitos com esse bordado para venda.

Para cada ideia forneça:
- title: Nome do produto (ex: "Almofada bordada infantil", "Toalha de lavabo personalizada")
- description: Descrição curta adequada para anúncio de venda online (1-2 frases)
- price_range: Faixa de preço sugerida no formato "R$XX - R$XX" baseada em valores reais de artesanato bordado brasileiro
- profit_example: Exemplo de lucro estimado (ex: "Custo ~R$15, venda por R$45 = lucro de R$30")

Use valores realistas do mercado brasileiro de bordado artesanal:
- Toalhas de lavabo: R$25-50
- Toalhas de banho: R$40-80
- Almofadas: R$35-70
- Fraldas/babadores: R$20-45
- Ecobags: R$25-55
- Quadros em bastidor: R$30-60
- Capas de agenda: R$35-65
- Kits de bebê: R$80-200
- Jogos americanos: R$30-60 cada`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                ideas: {
                  type: "ARRAY",
                  minItems: 5,
                  maxItems: 5,
                  items: {
                    type: "OBJECT",
                    properties: {
                      title: { type: "STRING", description: "Nome curto do produto" },
                      description: { type: "STRING", description: "Descrição curta para venda online" },
                      price_range: { type: "STRING", description: "Faixa de preço ex: R$35 - R$60" },
                      profit_example: {
                        type: "STRING",
                        description: "Exemplo de lucro ex: Custo ~R$15, venda por R$45 = lucro de R$30",
                      },
                    },
                    required: ["title", "description", "price_range", "profit_example"],
                  },
                },
              },
              required: ["ideas"],
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
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Gemini error ${response.status}`);
    }

    const data = await response.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;

    let ideas: unknown[] = [];
    if (text) {
      try {
        const parsed = JSON.parse(text);
        ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
      } catch (err) {
        console.error("generate-product-ideas: failed to parse Gemini JSON", err, text);
      }
    }

    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-ideas error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
