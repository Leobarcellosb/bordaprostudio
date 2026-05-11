import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const categoryNames = CATEGORIES.map((c) => c.name).join(", ");

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
Se não houver informação suficiente, classifique como "Flores" (mais comum em bordado).
Responda APENAS em JSON conforme o schema.`;

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

async function classifyDesign(
  apiKey: string,
  design: {
    name: string;
    generated_title?: string;
    raw_filename?: string;
    tags_text?: string;
    cover_image?: string;
  },
): Promise<{ category_id: string; category_name: string } | null> {
  const context = [
    design.generated_title ? `Título: ${design.generated_title}` : `Nome: ${design.name}`,
    design.raw_filename ? `Arquivo: ${design.raw_filename}` : null,
    design.tags_text ? `Tags: ${design.tags_text}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userParts: unknown[] = [];
  if (design.cover_image) {
    const img = await fetchImageAsInlineData(design.cover_image);
    if (img) userParts.push(img);
  }
  userParts.push({ text: `Classifique este design de bordado:\n\n${context}` });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              category_name: {
                type: "STRING",
                enum: CATEGORIES.map((c) => c.name),
                description: "Nome exato de uma das categorias permitidas",
              },
            },
            required: ["category_name"],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const t = await response.text();
    console.error(`Gemini error ${response.status} for "${design.name}":`, t);
    return null;
  }

  const data = await response.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      const match = CATEGORIES.find((c) => c.name === parsed.category_name);
      if (match) return { category_id: match.id, category_name: match.name };
    } catch (err) {
      console.error("classifyDesign: failed to parse Gemini JSON", err, text);
    }
    // Fallback: search the raw text for a known category name
    for (const cat of CATEGORIES) {
      if (text.includes(cat.name)) return { category_id: cat.id, category_name: cat.name };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { batch_size = 10 } = await req.json().catch(() => ({}));
    const limit = Math.min(batch_size, 20);

    // Fetch uncategorized designs
    const { data: designs, error: fetchErr } = await supabase
      .from("designs")
      .select("id, name, generated_title, raw_filename, tags_text, cover_image")
      .is("category_id", null)
      .limit(limit);

    if (fetchErr) throw fetchErr;
    if (!designs || designs.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No uncategorized designs found",
          classified: 0,
          failed: 0,
          remaining: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let classified = 0;
    let failed = 0;
    const results: { id: string; name: string; category: string | null }[] = [];

    // Process in parallel batches of 5
    const CONCURRENCY = 5;
    for (let i = 0; i < designs.length; i += CONCURRENCY) {
      const chunk = designs.slice(i, i + CONCURRENCY);
      const promises = chunk.map(async (design) => {
        try {
          const result = await classifyDesign(GEMINI_API_KEY, design);
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
        } catch (err) {
          console.error(`Error classifying "${design.name}":`, err);
          failed++;
          results.push({ id: design.id, name: design.name, category: null });
        }
      });
      await Promise.all(promises);
      // Small delay between chunks to avoid rate limits
      if (i + CONCURRENCY < designs.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Count remaining
    const { count } = await supabase
      .from("designs")
      .select("id", { count: "exact", head: true })
      .is("category_id", null);

    return new Response(
      JSON.stringify({
        classified,
        failed,
        remaining: count || 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("bulk-classify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
