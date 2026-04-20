import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const { image_url, tags, metadata, raw_filename } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextParts: string[] = [];
    if (raw_filename) contextParts.push(`Nome original do arquivo: ${raw_filename}`);
    if (tags) contextParts.push(`Tags detectadas: ${tags}`);
    if (metadata) {
      const m = metadata;
      const parts: string[] = [];
      if (m.widthMm && m.heightMm) parts.push(`${m.widthMm}×${m.heightMm}mm`);
      if (m.stitchCount) parts.push(`${m.stitchCount} pontos`);
      if (m.colorChanges) parts.push(`${m.colorChanges} cores`);
      if (parts.length) contextParts.push(`Metadados: ${parts.join(", ")}`);
    }

    const contextStr = contextParts.length > 0 ? `\n\nContexto adicional:\n${contextParts.join("\n")}` : "";

    const messages: any[] = [
      {
        role: "system",
        content: `Você é um especialista em bordado machine embroidery brasileiro. Sua tarefa é gerar um título comercial curto e limpo para uma matriz de bordado a partir da imagem do design.

Regras:
- O título deve ter 2 a 5 palavras
- Deve ser em português do Brasil
- Deve descrever o que o design representa visualmente
- Deve ser comercial e atraente (como nome de produto em loja)
- NÃO inclua palavras como "matriz", "bordado", "design", "arquivo"
- NÃO inclua hashes, UUIDs, números de série ou códigos técnicos
- NÃO inclua extensões de arquivo (.pes, .dst, etc.)
- Se houver personagens reconhecíveis, mencione-os
- Se não conseguir identificar o design com certeza, use uma descrição genérica limpa baseada nas formas e cores visíveis
- Exemplos de bons títulos: "Mickey e Minnie Baby", "Balão Floral Delicado", "Coruja Floral", "Ursinho com Estrelas", "Borboleta Colorida"`,
      },
    ];

    if (image_url) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: image_url },
          },
          {
            type: "text",
            text: `Analise esta imagem de um design de bordado e gere um título comercial curto e limpo.${contextStr}`,
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Gere um título comercial curto e limpo para uma matriz de bordado com base nas informações disponíveis. Se não houver informação suficiente, gere um título genérico como "Design Floral" ou "Motivo Delicado".${contextStr}`,
      });
    }

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
              name: "return_title",
              description: "Return the generated commercial title for the embroidery design",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Título comercial curto e limpo (2-5 palavras em português)",
                  },
                },
                required: ["title"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_title" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", title: null }), {
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
    let title = null;

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      title = parsed.title || null;
    }

    // Fallback: try to extract from plain text response
    if (!title) {
      const content = data.choices?.[0]?.message?.content;
      if (content && typeof content === "string" && content.length < 60) {
        title = content.trim().replace(/^["']|["']$/g, "");
      }
    }

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-design-title error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", title: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
