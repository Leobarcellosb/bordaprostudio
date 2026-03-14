import { useState, useEffect } from "react";
import { db } from "@/lib/db";

export function usePopularTags(limit = 20) {
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        // Fetch all tags_text from published designs
        const { data, error } = await db
          .from("designs")
          .select("tags_text")
          .eq("is_published", true)
          .not("tags_text", "is", null)
          .not("tags_text", "eq", "");

        if (error) throw error;

        const tagCounts = new Map<string, number>();
        for (const row of data || []) {
          const rawTags = (row.tags_text || "")
            .split(",")
            .map((t: string) => t.trim().toLowerCase())
            .filter((t: string) => t.length > 1);
          for (const tag of rawTags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }

        const sorted = Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        setTags(sorted);
      } catch (err) {
        console.error("[usePopularTags] error:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [limit]);

  return { tags, loading };
}
