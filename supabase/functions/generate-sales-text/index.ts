import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { designName, designDescription, designTags, category, productType, price } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const priceInfo = price ? `Preço sugerido pelo usuário: R$ ${price}` : "Sugira uma faixa de preço realista para o mercado brasileiro de artesanato.";
    const tagsInfo = designTags || "";

    const systemPrompt = `Você é uma especialista em marketing para bordadeiras artesanais brasileiras que vendem produtos bordados no WhatsApp e Instagram. 
Seu tom é caloroso, feminino, profissional e persuasivo. 
Use emojis com moderação para deixar o texto mais atrativo.
Escreva sempre em português brasileiro.`;

    const userPrompt = `Crie textos de venda para o seguinte produto bordado:

Design: ${designName}
${designDescription ? `Descrição do design: ${designDescription}` : ""}
${category ? `Categoria: ${category}` : ""}
${tagsInfo ? `Tags: ${tagsInfo}` : ""}
Tipo de produto: ${productType}
${priceInfo}

Gere:
1. Uma caption para Instagram com emojis estratégicos, inclua o preço sugerido no texto, e hashtags relevantes sobre bordado (máx 200 palavras)
2. Um texto de venda para WhatsApp com saudação, descrição, INCLUA O PREÇO SUGERIDO de forma destacada com *negrito*, e call to action (máx 300 palavras)
3. Uma faixa de preço sugerida realista baseada no tipo de produto e mercado brasileiro (ex: pano de prato R$25-40, toalha bebê R$40-80, kit maternidade R$120-300)
4. Uma ideia de produto diferenciada para vender com esse design`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_sales_content",
              description: "Return generated sales content for an embroidery product",
              parameters: {
                type: "object",
                properties: {
                  instagram: { type: "string", description: "Caption para Instagram com emojis e hashtags" },
                  whatsapp: { type: "string", description: "Texto de venda para WhatsApp com *negrito* para destaques" },
                  priceMin: { type: "number", description: "Preço mínimo sugerido em reais" },
                  priceMax: { type: "number", description: "Preço máximo sugerido em reais" },
                  productIdea: { type: "string", description: "Título curto da ideia de produto" },
                  productIdeaDescription: { type: "string", description: "Descrição de 2-3 frases da ideia de produto e como vender" },
                  title: { type: "string", description: "Título comercial do produto (máx 60 caracteres)" },
                  description: { type: "string", description: "Descrição comercial do produto com 2-3 frases" },
                },
                required: ["instagram", "whatsapp", "priceMin", "priceMax", "productIdea", "productIdeaDescription", "title", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_sales_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar texto. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-sales-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
