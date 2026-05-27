import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Download, TrendingUp, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WeeklyDigestCard } from "@/components/admin/WeeklyDigestCard";

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, downloads: 0, designs: 0, published: 0 });
  const [topDesigns, setTopDesigns] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: usersCount },
        { count: downloadsCount },
        { count: designsCount },
        { count: publishedCount },
      ] = await Promise.all([
        db.from("profiles").select("*", { count: "exact", head: true }),
        db.from("downloads").select("*", { count: "exact", head: true }),
        db.from("designs").select("*", { count: "exact", head: true }),
        db.from("designs").select("*", { count: "exact", head: true }).eq("is_published", true),
      ]);
      setStats({
        users: usersCount || 0,
        downloads: downloadsCount || 0,
        designs: designsCount || 0,
        published: publishedCount || 0,
      });
    };

    const fetchTopDesigns = async () => {
      // Get download counts per design
      const { data: downloads } = await db.from("downloads").select("kit_id");
      if (!downloads || downloads.length === 0) { setTopDesigns([]); return; }
      
      const countMap: Record<string, number> = {};
      downloads.forEach((d: any) => { countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1; });
      
      const sortedIds = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      if (sortedIds.length === 0) { setTopDesigns([]); return; }
      
      const { data: designs } = await db.from("designs").select("id, name, cover_image").in("id", sortedIds.map(([id]) => id));
      
      const result = sortedIds.map(([id, count]) => {
        const design = (designs || []).find((d: any) => d.id === id);
        return { id, title: design?.name || "—", preview: design?.cover_image, downloads: count };
      });
      setTopDesigns(result);
    };

    fetchStats();
    fetchTopDesigns();
  }, []);

  const statCards = [
    { icon: Users, label: "Total Usuários", value: stats.users, color: "text-primary" },
    { icon: Download, label: "Total Downloads", value: stats.downloads, color: "text-green-600" },
    { icon: FileText, label: "Matrizes Criadas", value: stats.designs, color: "text-blue-600" },
    { icon: TrendingUp, label: "Publicados", value: stats.published, color: "text-secondary" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <WeeklyDigestCard />

      <div>
        <h3 className="font-semibold mb-3">Matrizes Mais Baixadas</h3>
        {topDesigns.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Nenhum download registrado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matriz</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDesigns.map((d: any, i: number) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                        {d.preview ? (
                          <img src={d.preview} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-sm">🧵</div>
                        )}
                        <span className="font-medium text-sm">{d.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{d.downloads}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
