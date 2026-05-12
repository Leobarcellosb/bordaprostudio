import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { designId, designName, category, tags } = await req.json();
    if (!designId || !designName) {
      return new Response(
        JSON.stringify({ error: "designId and designName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const prompt =
      `Generate a clean, professional embroidery design preview image. ` +
      `The design is called "${designName}"${category ? `, category: ${category}` : ""}` +
      `${tags ? `, style tags: ${tags}` : ""}. ` +
      `Show the embroidery pattern on a clean white fabric background, as if it were stitched ` +
      `on white cotton cloth. The design should look like a real machine embroidery with visible ` +
      `thread texture and stitches. No text overlays, no watermarks. On a solid white background.`;

    // Gemini 2.5 Flash Image · API nativa do Google.
    // responseModalities=["IMAGE","TEXT"] retorna imagem inline em parts[].inlineData.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      },
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: { inlineData?: { mimeType?: string } }) =>
      p.inlineData?.mimeType?.startsWith("image/"),
    );
    const base64 = imagePart?.inlineData?.data;

    if (!base64) {
      console.error("No image in Gemini response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 and upload to storage
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const filePath = `ai-preview/${designId}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("design-covers")
      .upload(filePath, bytes, { contentType: "image/png", upsert: false });

    if (uploadError) {
      // Fallback: try kit-covers bucket
      const { error: uploadError2 } = await supabase.storage
        .from("kit-covers")
        .upload(filePath, bytes, { contentType: "image/png", upsert: false });

      if (uploadError2) {
        console.error("Storage upload failed:", uploadError2.message);
        throw new Error("Failed to upload preview image");
      }

      const { data: urlData } = supabase.storage.from("kit-covers").getPublicUrl(filePath);

      // Update design with the generated preview
      await supabase.from("designs").update({ cover_image: urlData.publicUrl }).eq("id", designId);

      return new Response(JSON.stringify({ cover_image: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("design-covers").getPublicUrl(filePath);

    // Update design with the generated preview
    await supabase.from("designs").update({ cover_image: urlData.publicUrl }).eq("id", designId);

    return new Response(JSON.stringify({ cover_image: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-design-preview error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
