import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
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

    // 2. Use AI to generate a polished kit title and description
    let suggestedTitle = theme.trim();
    let suggestedDescription = description || "";

    try {
      const designNames = designs.slice(0, 15).map((d: any) => d.generated_title || d.name).join(", ");
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Você é um assistente para uma plataforma de matrizes de bordado. 
Gere um título comercial atrativo e uma descrição curta (2 frases) para um kit de matrizes de bordado.
O kit tem o tema "${theme}" e contém ${designs.length} matrizes.
Exemplos de matrizes: ${designNames}

Responda APENAS em formato JSON:
{"title": "...", "description": "..."}`
            },
            { role: "user", content: `Gere título e descrição para o kit com tema: ${theme}` }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title) suggestedTitle = parsed.title;
          if (parsed.description) suggestedDescription = parsed.description;
        }
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

    return new Response(JSON.stringify({
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
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("build-kit-draft error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
