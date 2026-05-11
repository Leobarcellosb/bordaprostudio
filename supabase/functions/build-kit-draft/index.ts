import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT =
  "Você é um assistente para uma plataforma de matrizes de bordado. Gere um título comercial atrativo e uma descrição curta (2 frases) para um kit de matrizes de bordado. Responda APENAS em JSON estruturado conforme o schema solicitado.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { theme, description, category_id, hoop_size, max_designs = 30 } = await req.json();

    if (!theme || theme.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Tema é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Search designs using the existing RPC
    const { data: searchResults, error: searchError } = await supabase.rpc("search_designs", {
      search_term: theme.trim(),
      p_category_id: category_id || null,
      p_hoop_size: hoop_size || null,
      p_stitch_min: null,
      p_stitch_max: null,
      p_sort: "recent",
      p_offset: 0,
      p_limit: Math.min(max_designs, 100),
    });

    if (searchError) {
      console.error("Search error:", searchError);
      throw new Error("Erro ao buscar matrizes: " + searchError.message);
    }

    // If primary search returned few results, do a broader search with individual words
    let designs = searchResults || [];
    if (designs.length < 5 && theme.trim().includes(" ")) {
      const words = theme.trim().split(/\s+/);
      const existingIds = new Set(designs.map((d: any) => d.id));

      for (const word of words) {
        if (word.length < 3) continue;
        const { data: wordResults } = await supabase.rpc("search_designs", {
          search_term: word,
          p_category_id: category_id || null,
          p_hoop_size: hoop_size || null,
          p_stitch_min: null,
          p_stitch_max: null,
          p_sort: "recent",
          p_offset: 0,
          p_limit: 20,
        });
        for (const d of (wordResults || [])) {
          if (!existingIds.has(d.id) && designs.length < max_designs) {
            designs.push(d);
            existingIds.add(d.id);
          }
        }
      }
    }

    // 2. Use Gemini to generate a polished kit title and description
    let suggestedTitle = theme.trim();
    let suggestedDescription = description || "";

    try {
      const designNames = designs
        .slice(0, 15)
        .map((d: any) => d.generated_title || d.name)
        .join(", ");

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      `Gere título comercial atrativo e descrição curta (2 frases) para um kit de matrizes de bordado.\n\n` +
                      `Tema: "${theme}"\n` +
                      `Quantidade de matrizes: ${designs.length}\n` +
                      `Exemplos de matrizes no kit: ${designNames}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  title: {
                    type: "STRING",
                    description: "Título comercial atrativo do kit (curto, em português)",
                  },
                  description: {
                    type: "STRING",
                    description: "Descrição curta de 2 frases sobre o kit",
                  },
                },
                required: ["title", "description"],
              },
            },
          }),
        },
      );

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const text: string | undefined = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.title) suggestedTitle = parsed.title;
            if (parsed.description) suggestedDescription = parsed.description;
          } catch (parseErr) {
            console.error("build-kit-draft: failed to parse Gemini JSON", parseErr, text);
          }
        }
      } else {
        const t = await aiResponse.text();
        console.error("Gemini error:", aiResponse.status, t);
      }
    } catch (aiErr) {
      console.error("AI generation error (non-fatal):", aiErr);
      // Fallback: use theme as title
      if (!suggestedDescription) {
        suggestedDescription = `Coleção exclusiva de ${designs.length} matrizes de bordado com o tema ${theme}.`;
      }
    }

    // 3. Pick best cover image from found designs
    const coverDesign = designs.find((d: any) => d.cover_image) || null;
    const suggestedCover = coverDesign?.cover_image || null;

    return new Response(
      JSON.stringify({
        suggested_title: suggestedTitle,
        suggested_description: suggestedDescription,
        suggested_cover: suggestedCover,
        designs: designs.map((d: any) => ({
          id: d.id,
          name: d.name,
          generated_title: d.generated_title,
          cover_image: d.cover_image,
          hoop_size: d.hoop_size,
          stitch_count: d.stitch_count,
          category_name: d.category_name,
          relevance: d.relevance,
        })),
        designs_count: designs.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("build-kit-draft error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
