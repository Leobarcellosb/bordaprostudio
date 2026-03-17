import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { filterDesignsByMachine } from "@/lib/machineFilter";
import { useUserMachineSettings } from "@/hooks/useUserMachineSettings";

export interface RelatedDesign {
  id: string;
  name: string;
  cover_image: string | null;
  category_name: string | null;
  tags: string[];
}

function parseTags(text: string | null): string[] {
  return (text || "").split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 1);
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").trim();
}

export function useRelatedDesigns(designId: string | undefined, design: any | null) {
  const [designs, setDesigns] = useState<RelatedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const { machineFormat, machineHoopSize } = useUserMachineSettings();

  useEffect(() => {
    if (!designId || !design) return;

    const run = async () => {
      try {
        const designTags = parseTags(design.tags_text);
        const keywords = normalize(design.name || "").split(/\s+/).filter(w => w.length > 2);

        let query = db
          .from("designs")
          .select("id, name, generated_title, cover_image, tags_text, category_id, hoop_size, categories(name)")
          .eq("is_published", true)
          .neq("id", designId)
          .limit(100)
          .order("created_at", { ascending: false });

        if (design.category_id) {
          query = query.eq("category_id", design.category_id);
        }

        const { data } = await query;

        // Filter by machine settings
        const candidates = await filterDesignsByMachine(data || [], machineHoopSize, machineFormat);

        const scored = candidates.map((d: any) => {
          const dTags = parseTags(d.tags_text);
          let score = 0;
          for (const t of designTags) {
            if (dTags.includes(t)) score += 10;
          }
          const dNorm = normalize(d.generated_title || d.name || "");
          for (const kw of keywords) {
            if (dNorm.includes(kw)) score += 3;
          }
          return { design: d, score };
        });

        scored.sort((a, b) => b.score - a.score);

        const results: RelatedDesign[] = scored
          .filter(s => s.score > 0)
          .slice(0, 6)
          .map(s => ({
            id: s.design.id,
            name: s.design.generated_title || s.design.name,
            cover_image: s.design.cover_image,
            category_name: s.design.categories?.name || null,
            tags: parseTags(s.design.tags_text).slice(0, 3),
          }));

        setDesigns(results);
      } catch (err) {
        console.error("[useRelatedDesigns] error:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [designId, design, machineFormat, machineHoopSize]);

  return { designs, loading };
}
