import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Download, TrendingUp, CreditCard, Heart, BarChart3,
  Calendar, FileText, Star, Layers, Activity, UserX, ChevronRight
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

  const downloadsChart = useMemo(() => groupByDay(periodDownloads, start), [periodDownloads, start]);
  const usersChart = useMemo(() => groupByDay(periodUsers, start), [periodUsers, start]);
  const subsChart = useMemo(() => groupByDay(periodSubs, start), [periodSubs, start]);

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

  const avgDownloads = allUsers.length > 0 ? (allDownloads.length / allUsers.length).toFixed(1) : "0";
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeUserIds = new Set(allDownloads.filter((d) => new Date(d.created_at) >= thirtyDaysAgo).map((d) => d.user_id));
  const inactiveUsers = allUsers.filter((u) => !activeUserIds.has(u.id)).length;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const kpiCards = [
    { icon: Users, label: "Usuários ativos", value: activeUserIds.size, sub: "últimos 30 dias", accent: "bg-primary/10 text-primary" },
    { icon: TrendingUp, label: "Novos usuários", value: periodUsers.length, sub: periodLabel[period], accent: "bg-emerald-500/10 text-emerald-600" },
    { icon: CreditCard, label: "Assinaturas ativas", value: activeSubs.length, sub: "vigentes agora", accent: "bg-blue-500/10 text-blue-600" },
    { icon: Download, label: "Downloads totais", value: allDownloads.length.toLocaleString("pt-BR"), sub: "desde o início", accent: "bg-orange-500/10 text-orange-600" },
    { icon: Calendar, label: "Downloads no período", value: periodDownloads.length, sub: periodLabel[period], accent: "bg-violet-500/10 text-violet-600" },
    { icon: BarChart3, label: "MRR estimado", value: `R$ ${mrr.toFixed(0)}`, sub: "receita mensal recorrente", accent: "bg-secondary/10 text-secondary" },
  ];

  return (
    <div className="space-y-10 mt-2 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 mb-1.5">Admin</p>
          <h3 className="text-2xl font-display font-bold tracking-tight text-foreground">Analytics</h3>
          <p className="text-sm text-muted-foreground mt-1">Visão geral de métricas e desempenho da plataforma.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[200px] h-9 text-xs font-medium bg-card border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(periodLabel).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map(({ icon: Icon, label, value, sub, accent }) => (
          <Card key={label} className="group border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] hover:shadow-[0_4px_16px_hsl(268_78%_56%/0.08)] transition-all duration-300">
            <CardContent className="p-5">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${accent} mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-display font-bold tracking-tight text-foreground leading-none">{value}</p>
              <p className="text-[11px] font-semibold text-foreground/75 mt-1.5 leading-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section: Charts */}
      <div>
        <SectionHeader title="Tendências" subtitle="Evolução diária das métricas no período selecionado" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <ChartCard title="Downloads por dia" data={downloadsChart} color="hsl(var(--primary))" gradientId="dl" />
          <ChartCard title="Novos usuários por dia" data={usersChart} color="hsl(155, 55%, 38%)" gradientId="usr" />
          <ChartCard title="Assinaturas por dia" data={subsChart} color="hsl(220, 70%, 55%)" gradientId="sub" />
          <BarChartCard title="Formatos mais baixados" data={topFormats} color="hsl(var(--secondary))" />
        </div>
      </div>

      {/* Section: Rankings */}
      <div>
        <SectionHeader title="Rankings" subtitle="Destaques e classificações da plataforma" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-5">
          <RankingCard title="Matrizes mais baixadas" icon={Star} items={topDesigns} accentColor="text-amber-500" />
          <RankingCard title="Usuários mais ativos" icon={Activity} items={topUsers} accentColor="text-primary" />
          <RankingCard title="Planos mais usados" icon={Layers} items={planCounts} accentColor="text-blue-500" />
          <RankingCard title="Formatos populares" icon={FileText} items={topFormats} accentColor="text-secondary" />
        </div>
      </div>

      {/* Section: Engagement */}
      <div>
        <SectionHeader title="Engajamento" subtitle="Indicadores de atividade e retenção" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <EngagementCard icon={Download} label="Média de downloads/usuário" value={avgDownloads} accent="bg-primary/10 text-primary" />
          <EngagementCard icon={UserX} label="Usuários sem atividade (30d)" value={inactiveUsers} accent="bg-destructive/10 text-destructive" />
          <EngagementCard icon={Heart} label="Total de favoritos" value={allFavorites.length} accent="bg-secondary/10 text-secondary" />
          <EngagementCard icon={FileText} label="Total de matrizes" value={allDesigns.length} accent="bg-accent text-accent-foreground" />
        </div>
      </div>
    </div>
  );
};

/* Sub-components */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-border/40 pb-3">
      <h4 className="text-base font-display font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
    </div>
  );
}

function ChartCard({ title, data, color, gradientId }: { title: string; data: { date: string; count: number }[]; color: string; gradientId: string }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] overflow-hidden">
      <CardHeader className="pb-1 pt-5 px-6">
        <CardTitle className="text-[13px] font-sans font-semibold text-foreground/80 tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px] px-4 pb-5">
        {!hasData ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  fontSize: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  boxShadow: "0 4px 12px hsl(var(--foreground) / 0.06)",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 2 }}
              />
              <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill={`url(#grad-${gradientId})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartCard({ title, data, color }: { title: string; data: { name: string; value: number }[]; color: string }) {
  return (
    <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] overflow-hidden">
      <CardHeader className="pb-1 pt-5 px-6">
        <CardTitle className="text-[13px] font-sans font-semibold text-foreground/80 tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[240px] px-4 pb-5">
        {!data.length ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  fontSize: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  boxShadow: "0 4px 12px hsl(var(--foreground) / 0.06)",
                }}
              />
              <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function RankingCard({ title, icon: Icon, items, accentColor }: { title: string; icon: any; items: { name: string; value: number }[]; accentColor: string }) {
  return (
    <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)]">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent/60">
            <Icon className={`h-3.5 w-3.5 ${accentColor}`} />
          </div>
          <CardTitle className="text-[13px] font-sans font-semibold text-foreground/80">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <p className="text-[11px] text-muted-foreground/60">Sem dados disponíveis</p>
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-2 ${i < items.length - 1 ? "border-b border-border/30" : ""}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`text-[10px] font-bold w-5 text-center shrink-0 ${i < 3 ? accentColor : "text-muted-foreground/50"}`}>
                    {i + 1}
                  </span>
                  <span className={`truncate text-xs ${i === 0 ? "font-semibold text-foreground" : "text-foreground/75"}`}>{item.name}</span>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] font-semibold shrink-0 ml-3 px-2 py-0 h-5 ${i === 0 ? "bg-primary/10 text-primary border-0" : "bg-muted/60 text-muted-foreground border-0"}`}
                >
                  {item.value}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EngagementCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] hover:shadow-[0_4px_16px_hsl(268_78%_56%/0.08)] transition-all duration-300">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${accent} shrink-0`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-display font-bold text-foreground leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1 leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-2.5">
        <BarChart3 className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <p className="text-xs text-muted-foreground/50 font-medium">Sem dados no período</p>
    </div>
  );
}
