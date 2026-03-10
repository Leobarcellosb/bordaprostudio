import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Download, TrendingUp, CreditCard, Heart, BarChart3,
  Calendar, FileText, Star, Layers, Activity, UserX
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

type Period = "7" | "30" | "90" | "month";

const periodLabel: Record<Period, string> = {
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  "month": "Este mês",
};

function getStartDate(period: Period) {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  const d = new Date();
  d.setDate(d.getDate() - Number(period));
  return d;
}

function groupByDay(items: { created_at: string }[], start: Date) {
  const map: Record<string, number> = {};
  const now = new Date();
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    map[d.toISOString().slice(0, 10)] = 0;
  }
  items.forEach((i) => {
    const day = i.created_at?.slice(0, 10);
    if (day && map[day] !== undefined) map[day]++;
  });
  return Object.entries(map).map(([date, count]) => ({
    date: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
    count,
  }));
}

export const AdminAnalytics = () => {
  const [period, setPeriod] = useState<Period>("30");
  const [allDownloads, setAllDownloads] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allSubs, setAllSubs] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [allFavorites, setAllFavorites] = useState<any[]>([]);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [downloads, users, subs, designs, favorites, files] = await Promise.all([
        db.from("downloads").select("id, kit_id, user_id, created_at"),
        db.from("profiles").select("id, name, email, plan, created_at"),
        db.from("subscriptions").select("id, plan_code, status, access_expires_at, created_at"),
        db.from("designs").select("id, name, cover_image, category_id, is_published, created_at"),
        db.from("favorites").select("id, kit_id, created_at"),
        db.from("kit_arquivos").select("id, format, created_at"),
      ]);
      setAllDownloads(downloads.data || []);
      setAllUsers(users.data || []);
      setAllSubs(subs.data || []);
      setAllDesigns(designs.data || []);
      setAllFavorites(favorites.data || []);
      setAllFiles(files.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const start = useMemo(() => getStartDate(period), [period]);

  const periodDownloads = useMemo(() => allDownloads.filter((d) => new Date(d.created_at) >= start), [allDownloads, start]);
  const periodUsers = useMemo(() => allUsers.filter((u) => new Date(u.created_at) >= start), [allUsers, start]);
  const periodSubs = useMemo(() => allSubs.filter((s) => new Date(s.created_at) >= start), [allSubs, start]);

  const activeSubs = allSubs.filter((s) => s.status === "active" && s.access_expires_at && new Date(s.access_expires_at) > new Date());
  const mrr = activeSubs.reduce((sum, s) => sum + (s.plan_code === "anual" ? 29.9 : 39.9), 0);

  // Charts data
  const downloadsChart = useMemo(() => groupByDay(periodDownloads, start), [periodDownloads, start]);
  const usersChart = useMemo(() => groupByDay(periodUsers, start), [periodUsers, start]);
  const subsChart = useMemo(() => groupByDay(periodSubs, start), [periodSubs, start]);

  // Rankings
  const topDesigns = useMemo(() => {
    const countMap: Record<string, number> = {};
    allDownloads.forEach((d) => { countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1; });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => {
        const design = allDesigns.find((d) => d.id === id);
        return { name: design?.name || "—", value: count };
      });
  }, [allDownloads, allDesigns]);

  const topFormats = useMemo(() => {
    const countMap: Record<string, number> = {};
    allFiles.forEach((f) => { countMap[f.format?.toUpperCase() || "?"] = (countMap[f.format?.toUpperCase() || "?"] || 0) + 1; });
    return Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [allFiles]);

  const topUsers = useMemo(() => {
    const countMap: Record<string, number> = {};
    allDownloads.forEach((d) => { countMap[d.user_id] = (countMap[d.user_id] || 0) + 1; });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => {
        const user = allUsers.find((u) => u.id === id);
        return { name: user?.name || user?.email || "—", value: count };
      });
  }, [allDownloads, allUsers]);

  const planCounts = useMemo(() => {
    const countMap: Record<string, number> = {};
    allUsers.forEach((u) => { countMap[u.plan || "basic"] = (countMap[u.plan || "basic"] || 0) + 1; });
    return Object.entries(countMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [allUsers]);

  // Engagement
  const avgDownloads = allUsers.length > 0 ? (allDownloads.length / allUsers.length).toFixed(1) : "0";
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeUserIds = new Set(allDownloads.filter((d) => new Date(d.created_at) >= thirtyDaysAgo).map((d) => d.user_id));
  const inactiveUsers = allUsers.filter((u) => !activeUserIds.has(u.id)).length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const kpiCards = [
    { icon: Users, label: "Usuários ativos", value: activeUserIds.size, sub: "últimos 30 dias", color: "text-primary" },
    { icon: TrendingUp, label: "Novos usuários", value: periodUsers.length, sub: periodLabel[period], color: "text-emerald-500" },
    { icon: CreditCard, label: "Assinaturas ativas", value: activeSubs.length, sub: "vigentes agora", color: "text-blue-500" },
    { icon: Download, label: "Downloads totais", value: allDownloads.length, sub: "desde o início", color: "text-orange-500" },
    { icon: Calendar, label: "Downloads no período", value: periodDownloads.length, sub: periodLabel[period], color: "text-violet-500" },
    { icon: BarChart3, label: "MRR estimado", value: `R$ ${mrr.toFixed(0)}`, sub: "receita mensal", color: "text-secondary" },
  ];

  return (
    <div className="space-y-8 mt-4">
      {/* Period Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold">Analytics</h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(periodLabel).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ icon: Icon, label, value, sub, color }) => (
          <Card key={label} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-accent/60">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-display font-bold tracking-tight">{value}</p>
              <p className="text-xs font-medium text-foreground/80 mt-0.5">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Downloads por dia" data={downloadsChart} color="hsl(268, 78%, 56%)" />
        <ChartCard title="Novos usuários por dia" data={usersChart} color="hsl(160, 60%, 45%)" />
        <ChartCard title="Assinaturas por dia" data={subsChart} color="hsl(220, 70%, 55%)" />
        <BarChartCard title="Formatos mais baixados" data={topFormats} color="hsl(335, 72%, 58%)" />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <RankingCard title="Matrizes mais baixadas" icon={Star} items={topDesigns} />
        <RankingCard title="Usuários mais ativos" icon={Activity} items={topUsers} />
        <RankingCard title="Planos mais usados" icon={Layers} items={planCounts} />
        <RankingCard title="Formatos populares" icon={FileText} items={topFormats} />
      </div>

      {/* Engagement */}
      <div>
        <h3 className="text-lg font-display font-semibold mb-4">Engajamento</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <EngagementCard icon={Download} label="Média de downloads/usuário" value={avgDownloads} />
          <EngagementCard icon={UserX} label="Usuários sem atividade (30d)" value={inactiveUsers} />
          <EngagementCard icon={Heart} label="Total de favoritos" value={allFavorites.length} />
          <EngagementCard icon={FileText} label="Total de matrizes" value={allDesigns.length} />
        </div>
      </div>
    </div>
  );
};

/* Sub-components */

function ChartCard({ title, data, color }: { title: string; data: { date: string; count: number }[]; color: string }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px]">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 90%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(240, 8%, 50%)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(240, 8%, 50%)" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(240, 10%, 90%)" }} />
              <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill={`url(#grad-${title})`} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartCard({ title, data, color }: { title: string; data: { name: string; value: number }[]; color: string }) {
  if (!data.length) return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
      <CardContent className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</CardContent>
    </Card>
  );
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
      <CardContent className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 90%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(240, 8%, 50%)" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(240, 8%, 50%)" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(240, 10%, 90%)" }} />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RankingCard({ title, icon: Icon, items }: { title: string; icon: any; items: { name: string; value: number }[] }) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Sem dados</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                  <span className="truncate text-xs">{item.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">{item.value}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EngagementCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="pt-5 pb-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/60">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xl font-display font-bold">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
