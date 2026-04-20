import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Grid3X3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORY_EMOJIS: Record<string, string> = {
  "Infantil": "🧸",
  "Animais": "🐾",
  "Flores": "🌸",
  "Datas Comemorativas": "🎉",
  "Monogramas": "✨",
  "Nomes": "🔤",
  "Religioso": "✝️",
  "Profissões": "👩‍⚕️",
  "Frases": "💬",
};

export const CategoriesSection = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    db.from("categories")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: any) => {
        if (!cancelled) setCategories(data || []);
      })
      .catch((err: any) => {
        console.error("[CategoriesSection] load error:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (categories.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Grid3X3}
        iconClassName="bg-primary/10 text-primary"
        title="Explorar Categorias"
        subtitle="Encontre matrizes por tema"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((cat: any) => (
          <Card
            key={cat.id}
            className="group cursor-pointer border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            onClick={() => navigate(`/library?category=${cat.id}`)}
          >
            <CardContent className="p-5 flex items-center gap-3">
              <span className="text-2xl">{CATEGORY_EMOJIS[cat.name] || "🧵"}</span>
              <span className="font-medium text-sm group-hover:text-primary transition-colors">{cat.name}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
