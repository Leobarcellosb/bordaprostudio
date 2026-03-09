import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { DesignCard } from "@/components/cards/DesignCard";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { Library, Download, Crown } from "lucide-react";

const Dashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [latestKits, setLatestKits] = useState<any[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);
  const [stats, setStats] = useState({ kits: 0, downloads: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: kits } = await db.from("kits").select("*, categories(name), kit_tags(tags(name))").eq("is_published", true).order("created_at", { ascending: false }).limit(6);
      setLatestKits(kits || []);
      if (user) {
        const { data: downloads } = await db.from("downloads").select("*, kits(*)").eq("user_id", user.id).order("downloaded_at", { ascending: false }).limit(4);
        setRecentDownloads(downloads || []);
        const { count: dlCount } = await db.from("downloads").select("*", { count: "exact", head: true }).eq("user_id", user.id);
        setStats((prev: any) => ({ ...prev, downloads: dlCount || 0 }));
      }
      const { count: kitCount } = await db.from("kits").select("*", { count: "exact", head: true }).eq("is_published", true);
      setStats((prev: any) => ({ ...prev, kits: kitCount || 0 }));
    };
    fetchData();
  }, [user]);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Olá, {profile?.full_name || "Bordadeira"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Bem-vinda ao seu estúdio de bordados</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent"><Library className="h-5 w-5 text-accent-foreground" /></div>
              <div><p className="text-2xl font-display font-bold">{stats.kits}</p><p className="text-sm text-muted-foreground">Designs disponíveis</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary/10"><Download className="h-5 w-5 text-secondary" /></div>
              <div><p className="text-2xl font-display font-bold">{stats.downloads}</p><p className="text-sm text-muted-foreground">Seus downloads</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent"><Crown className="h-5 w-5 text-accent-foreground" /></div>
              <div><p className="text-2xl font-display font-bold capitalize">{profile?.plan || "Basic"}</p><p className="text-sm text-muted-foreground">Seu plano</p></div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">Novos Designs</h2>
            <button onClick={() => navigate("/library")} className="text-sm text-primary hover:underline font-medium">Ver todos →</button>
          </div>
          {latestKits.length === 0 ? (
            <Card className="border-border/60"><CardContent className="py-16 text-center text-muted-foreground">Nenhum design disponível ainda.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestKits.map((kit: any) => (
                <DesignCard
                  key={kit.id}
                  name={kit.name}
                  coverImage={kit.cover_image}
                  category={kit.categories?.name}
                  tags={(kit.kit_tags || []).map((kt: any) => kt.tags?.name).filter(Boolean)}
                  onClick={() => navigate(`/library/${kit.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {recentDownloads.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-bold mb-4">Downloads Recentes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentDownloads.map((dl: any) => (
                <Card key={dl.id} className="cursor-pointer hover:shadow-md transition-shadow border-border/60" onClick={() => navigate(`/library/${dl.kit_id}`)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Download className="h-4 w-4 text-accent-foreground" /></div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{dl.kits?.name || "Design"}</p>
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
