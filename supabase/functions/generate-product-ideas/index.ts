import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const { designName, category, tags, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você gera ideias de produtos bordados com preços realistas. Use a função fornecida para retornar os dados." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_product_ideas",
              description: "Return product ideas for an embroidery design with pricing",
              parameters: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Nome curto do produto" },
                        description: { type: "string", description: "Descrição curta para venda online" },
                        price_range: { type: "string", description: "Faixa de preço sugerida ex: R$35 - R$60" },
                        profit_example: { type: "string", description: "Exemplo de lucro ex: Custo ~R$15, venda por R$45 = lucro de R$30" },
                      },
                      required: ["title", "description", "price_range", "profit_example"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["ideas"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_product_ideas" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let ideas = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      ideas = parsed.ideas || [];
    }

    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-ideas error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
