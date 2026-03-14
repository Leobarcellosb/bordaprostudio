import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";

export const RecentDownloadsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    db.from("downloads")
      .select("kit_id, created_at, designs:kit_id(id, name, cover_image)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        // Deduplicate by design id, keep most recent
        const seen = new Set<string>();
        const unique = (data || []).filter((d: any) => {
          if (!d.designs || seen.has(d.kit_id)) return false;
          seen.add(d.kit_id);
          return true;
        });
        setItems(unique);
        setLoading(false);
      });
  }, [user]);

  if (!loading && items.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader title="Downloads recentes" icon={Download} />
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="py-12 text-center space-y-2">
            <Download className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm font-medium">Você ainda não baixou nenhuma matriz.</p>
            <Button variant="outline" size="sm" className="mt-2 rounded-xl" onClick={() => navigate("/library")}>
              Explorar Biblioteca
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <SectionHeader title="Downloads recentes" icon={Download} />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader title="Downloads recentes" icon={Download} />
      <div className="space-y-2">
        {items.map((item: any) => (
          <Card
            key={item.kit_id}
            className="border-border/40 hover:border-primary/25 transition-colors cursor-pointer"
            onClick={() => navigate(`/library/${item.kit_id}`)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                {item.designs?.cover_image ? (
                  <img src={item.designs.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg opacity-30">🧵</div>
                )}
              </div>
              <span className="flex-1 text-sm font-medium truncate">{item.designs?.name || "Design"}</span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                onClick={(e) => { e.stopPropagation(); navigate(`/library/${item.kit_id}`); }}
              >
                <Download className="h-3.5 w-3.5" />
                Baixar novamente
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
