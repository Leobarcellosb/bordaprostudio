import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  { id: "9ab5794d-87c3-4e25-b979-1822a280e72c", name: "Infantil" },
  { id: "7236cd41-45b1-424e-899a-4d83bb1e8c99", name: "Animais" },
  { id: "8fbdb7ab-1b0a-40b7-8c18-ff2b5793762b", name: "Flores" },
  { id: "3ded1b24-92df-47f0-a5b6-90bf0e5336a9", name: "Datas Comemorativas" },
  { id: "fc9fb27c-3d04-4cc5-8fb1-ef75af24e888", name: "Monogramas" },
  { id: "28c840bc-67d2-4164-ab64-65be63c2fd42", name: "Nomes" },
  { id: "4f664c9a-7c52-42d6-8740-e5a760591539", name: "Religioso" },
  { id: "133df0dd-8a90-4505-abd2-7cafc30fcb2f", name: "Profissões" },
  { id: "77bb1f7b-e11a-4043-aff8-f7cbdf2112a4", name: "Frases" },
];

const categoryNames = CATEGORIES.map(c => c.name).join(", ");

const SYSTEM_PROMPT = `Você é um classificador de matrizes de bordado. Classifique cada design em EXATAMENTE UMA das categorias: ${categoryNames}

Regras:
- Infantil: bebê, criança, cartoon, berço, nursery, personagens infantis, brinquedos, nuvens fofas, balanço, circo, menina, menino
- Animais: animais, coruja, urso, baleia, flamingo, gato, cachorro, borboleta, pássaro, insetos
- Flores: floral, flores, ramos, buquê, pétalas, botânico, folhagens, jardim, rosas, margaridas, girassol, guirlanda floral, delicado floral
- Datas Comemorativas: natal, páscoa, dia das mães, halloween, aniversário, festivo, natalino
- Monogramas: letras, iniciais, monogramas, alfabeto
- Nomes: nomes próprios, personalização com nome
- Religioso: santos, bíblia, católico, cristão, cruz religiosa, anjo, fé
- Profissões: médico, advogado, professor, enfermeira, ferramentas de trabalho
- Frases: citações, palavras, frases motivacionais, textos decorativos

Se o design inclui elementos de múltiplas categorias, escolha a categoria do elemento PRINCIPAL.
Se não houver informação suficiente, classifique como "Flores" (mais comum em bordado).`;

async function classifyDesign(
  apiKey: string,
  design: { name: string; generated_title?: string; raw_filename?: string; tags_text?: string; cover_image?: string }
): Promise<{ category_id: string; category_name: string } | null> {
  const context = [
    design.generated_title ? `Título: ${design.generated_title}` : `Nome: ${design.name}`,
    design.raw_filename ? `Arquivo: ${design.raw_filename}` : null,
    design.tags_text ? `Tags: ${design.tags_text}` : null,
  ].filter(Boolean).join("\n");

  const userContent: any[] = [];
  if (design.cover_image) {
    userContent.push({ type: "image_url", image_url: { url: design.cover_image } });
  }
  userContent.push({ type: "text", text: `Classifique este design de bordado:\n\n${context}` });

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [{
        type: "function",
        function: {
          name: "classify_category",
          description: "Return the category for this embroidery design",
          parameters: {
            type: "object",
            properties: {
              category_name: {
                type: "string",
                enum: CATEGORIES.map(c => c.name),
              },
            },
            required: ["category_name"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "classify_category" } },
    }),
  });

  if (!response.ok) {
    console.error(`AI error ${response.status} for "${design.name}"`);
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    const match = CATEGORIES.find(c => c.name === parsed.category_name);
    if (match) return { category_id: match.id, category_name: match.name };
  }

  // Fallback: search text response
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    for (const cat of CATEGORIES) {
      if (content.includes(cat.name)) return { category_id: cat.id, category_name: cat.name };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batch_size = 50 } = await req.json().catch(() => ({}));

    // Fetch uncategorized designs
    const { data: designs, error: fetchErr } = await supabase
      .from("designs")
      .select("id, name, generated_title, raw_filename, tags_text, cover_image")
      .is("category_id", null)
      .limit(Math.min(batch_size, 100));

    if (fetchErr) throw fetchErr;
    if (!designs || designs.length === 0) {
      return new Response(JSON.stringify({ message: "No uncategorized designs found", classified: 0, failed: 0, remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let classified = 0;
    let failed = 0;
    const results: { id: string; name: string; category: string | null }[] = [];

    for (const design of designs) {
      try {
        const result = await classifyDesign(LOVABLE_API_KEY, design);
        if (result) {
          const { error: updateErr } = await supabase
            .from("designs")
            .update({ category_id: result.category_id })
            .eq("id", design.id);

          if (updateErr) {
            console.error(`Update failed for ${design.id}:`, updateErr.message);
            failed++;
            results.push({ id: design.id, name: design.name, category: null });
          } else {
            classified++;
            results.push({ id: design.id, name: design.name, category: result.category_name });
            console.log(`✓ "${design.name}" → ${result.category_name}`);
          }
        } else {
          failed++;
          results.push({ id: design.id, name: design.name, category: null });
        }
        // Rate limit protection
        await new Promise(r => setTimeout(r, 1200));
      } catch (err) {
        console.error(`Error classifying "${design.name}":`, err);
        failed++;
        results.push({ id: design.id, name: design.name, category: null });
      }
    }

    // Count remaining
    const { count } = await supabase
      .from("designs")
      .select("id", { count: "exact", head: true })
      .is("category_id", null);

    return new Response(JSON.stringify({
      classified,
      failed,
      remaining: count || 0,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bulk-classify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
