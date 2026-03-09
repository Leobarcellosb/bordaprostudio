import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { Download, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DownloadItem {
  id: string;
  kit_id: string;
  downloaded_at: string;
  kit: {
    id: string;
    name: string;
    cover_image: string | null;
    categories: { name: string } | null;
  } | null;
}

const DownloadsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await db
        .from("downloads")
        .select("id, kit_id, created_at, designs:kit_id(id, name, cover_image, categories(name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        kit_id: d.kit_id,
        downloaded_at: d.created_at,
        kit: d.designs,
      }));
      setDownloads(mapped);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Meus Downloads</h1>
            <p className="text-sm text-muted-foreground">Histórico de matrizes baixadaas</p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs gap-1">
            <Download className="h-3 w-3" /> {downloads.length}
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/60 animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : downloads.length === 0 ? (
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="py-16 text-center">
              <Download className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Você ainda não baixou nenhua matrizn.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Explore a biblioteca para começar!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {downloads.map((dl) => (
              <Card
                key={dl.id}
                className="group cursor-pointer border-border/60 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
                onClick={() => dl.kit && navigate(`/library/${dl.kit.id}`)}
              >
                <div className="aspect-video bg-muted overflow-hidden relative">
                  {dl.kit?.cover_image ? (
                    <img
                      src={dl.kit.cover_image}
                      alt={dl.kit.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🧵</div>
                  )}
                </div>
                <CardContent className="p-4 space-y-1.5">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {dl.kit?.name || "Design removido"}
                  </p>
                  {dl.kit?.categories?.name && (
                    <Badge variant="secondary" className="text-[10px]">
                      {dl.kit.categories.name}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(dl.downloaded_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DownloadsPage;
