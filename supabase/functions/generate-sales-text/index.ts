import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { designTitle, designDescription, designTags, category, productType, price } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const priceInfo = price ? `Preço sugerido: R$ ${price}` : "";
    const tagsInfo = designTags?.length ? `Tags do design: ${designTags.join(", ")}` : "";

    const systemPrompt = `Você é uma especialista em marketing para bordadeiras artesanais brasileiras que vendem produtos bordados no WhatsApp e Instagram. 
Seu tom é caloroso, feminino, profissional e persuasivo. 
Use emojis com moderação para deixar o texto mais atrativo.
Escreva sempre em português brasileiro.`;

    const userPrompt = `Crie textos de venda para o seguinte produto bordado:

Design: ${designTitle}
${designDescription ? `Descrição do design: ${designDescription}` : ""}
${category ? `Categoria: ${category}` : ""}
${tagsInfo}
Tipo de produto: ${productType}
${priceInfo}

Gere exatamente 4 itens no seguinte formato JSON (sem markdown, apenas o JSON puro):
{
  "title": "título do produto com nome do design e tipo (máx 60 caracteres)",
  "description": "descrição comercial do produto com 2-3 frases destacando o bordado, qualidade e apelo emocional",
  "whatsapp": "texto completo para WhatsApp com saudação, descrição do produto, preço se disponível, call to action. Use *negrito* para destaques. Máx 300 palavras.",
  "instagram": "caption para Instagram com ✨ emojis estratégicos, hashtags relevantes sobre bordado no final. Máx 200 palavras."
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar texto. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from the AI response
    let parsed: any = null;
    try {
      // Strip markdown code blocks if present
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-sales-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
