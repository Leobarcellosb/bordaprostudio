import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em bordado machine embroidery brasileiro. Sua tarefa é gerar um título comercial curto e limpo para uma matriz de bordado a partir da imagem do design.

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
- Exemplos de bons títulos: "Mickey e Minnie Baby", "Balão Floral Delicado", "Coruja Floral", "Ursinho com Estrelas", "Borboleta Colorida"`;

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
    const { image_url, tags, metadata, raw_filename } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

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
    const contextStr = contextParts.length > 0
      ? `\n\nContexto adicional:\n${contextParts.join("\n")}`
      : "";

    const userParts: unknown[] = [];
    if (image_url) {
      const img = await fetchImageAsInlineData(image_url);
      if (img) userParts.push(img);
      userParts.push({
        text:
          `Analise esta imagem de um design de bordado e gere um título comercial curto e limpo.${contextStr}`,
      });
    } else {
      userParts.push({
        text:
          `Gere um título comercial curto e limpo para uma matriz de bordado com base nas informações disponíveis. Se não houver informação suficiente, gere um título genérico como "Design Floral" ou "Motivo Delicado".${contextStr}`,
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: userParts }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                title: {
                  type: "STRING",
                  description: "Título comercial curto e limpo (2-5 palavras em português)",
                },
              },
              required: ["title"],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", title: null }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini error ${response.status}`);
    }

    const data = await response.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    let title: string | null = null;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        title = parsed.title || null;
      } catch {
        if (text.length < 60) title = text.trim().replace(/^["']|["']$/g, "");
      }
    }

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-design-title error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", title: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
