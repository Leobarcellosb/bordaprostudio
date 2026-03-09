import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Library, Download, Star, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [latestKits, setLatestKits] = useState<any[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);
  const [stats, setStats] = useState({ kits: 0, downloads: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: kits } = await supabase.from("kits").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(6);
      setLatestKits(kits || []);

      if (user) {
        const { data: downloads } = await supabase.from("downloads").select("*, kits(*)").eq("user_id", user.id).order("downloaded_at", { ascending: false }).limit(4);
        setRecentDownloads(downloads || []);

        const { count: dlCount } = await supabase.from("downloads").select("*", { count: "exact", head: true }).eq("user_id", user.id);
        setStats(prev => ({ ...prev, downloads: dlCount || 0 }));
      }

      const { count: kitCount } = await supabase.from("kits").select("*", { count: "exact", head: true }).eq("is_published", true);
      setStats(prev => ({ ...prev, kits: kitCount || 0 }));
    };
    fetchData();
  }, [user]);

  const planColors: Record<string, string> = {
    basic: "bg-secondary text-secondary-foreground",
    pro: "bg-primary/10 text-primary",
    elite: "bg-accent/10 text-accent",
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">
            Olá, {profile?.full_name || "Bordadeira"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Bem-vinda ao seu estúdio de bordados</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><Library className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.kits}</p>
                <p className="text-sm text-muted-foreground">Designs disponíveis</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10"><Download className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.downloads}</p>
                <p className="text-sm text-muted-foreground">Seus downloads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-4/10"><Star className="h-5 w-5" style={{ color: "hsl(var(--chart-4))" }} /></div>
              <div>
                <p className="text-2xl font-bold capitalize">{profile?.plan || "Basic"}</p>
                <p className="text-sm text-muted-foreground">Seu plano</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold">Novos Designs</h2>
            <button onClick={() => navigate("/library")} className="text-sm text-primary hover:underline">Ver todos →</button>
          </div>
          {latestKits.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum design disponível ainda.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestKits.map(kit => (
                <Card key={kit.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/library/${kit.id}`)}>
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                    {kit.cover_image ? (
                      <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🧵</div>
                    )}
                  </div>
                  <CardContent className="pt-3">
                    <h3 className="font-medium truncate">{kit.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{kit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {recentDownloads.length > 0 && (
          <div>
            <h2 className="text-xl font-serif font-bold mb-4">Downloads Recentes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentDownloads.map((dl: any) => (
                <Card key={dl.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/library/${dl.kit_id}`)}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className="text-2xl">📥</div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{dl.kits?.name || "Design"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(dl.downloaded_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
