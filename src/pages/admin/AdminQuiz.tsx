import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquareText, ArrowUpDown } from "lucide-react";

// Dashboard do quiz de fim de trial. Duas seções: AGREGADO (qual objeção/motivação
// domina — o número que decide a estratégia) e RESPOSTAS ABERTAS (o ouro qualitativo).

interface QuizRow {
  id: string;
  email: string;
  source: string;
  bought: boolean;
  q1_key: string | null;
  q1_label: string | null;
  q2_text: string | null;
  q3_value: string | null;
  created_at: string;
}

// Labels canônicos (fallback pro q1_label gravado, caso a copy mude no futuro).
const Q1_LABELS: Record<string, string> = {
  no_time: "Não teve tempo de testar",
  no_match: "Não achou as matrizes",
  incompatible: "Máquina incompatível / dificuldade técnica",
  price_high: "Preço alto",
  deciding: "Ainda decidindo",
  found_matrices: "Achou matrizes que precisava",
  price_worth: "Preço valeu a pena",
  more_income: "Vai ajudar a ganhar mais",
  tools: "Calculadora / ferramentas",
  other: "Outro",
};

function distribution(rows: QuizRow[]): { key: string; label: string; count: number; pct: number }[] {
  const withQ1 = rows.filter((r) => r.q1_key);
  const map = new Map<string, { label: string; count: number }>();
  for (const r of withQ1) {
    const k = r.q1_key!;
    const cur = map.get(k) ?? { label: Q1_LABELS[k] ?? r.q1_label ?? k, count: 0 };
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count, pct: withQ1.length ? Math.round((v.count / withQ1.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

function DistBars({ title, rows, accent }: { title: string; rows: QuizRow[]; accent: string }) {
  const dist = distribution(rows);
  return (
    <Card className="border-border/40">
      <CardContent className="p-5 space-y-3">
        <p className="text-sm font-semibold">{title}</p>
        {dist.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem respostas ainda.</p>
        ) : (
          dist.map((d) => (
            <div key={d.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground/85">{d.label}</span>
                <span className="font-semibold tabular-nums shrink-0">{d.count} · {d.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${accent}`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

type Filter = "todos" | "comprou" | "nao_comprou";

export const AdminQuiz = () => {
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error: qErr } = await db
        .from("quiz_responses")
        .select("id, email, source, bought, q1_key, q1_label, q2_text, q3_value, created_at")
        .order("created_at", { ascending: false });
      if (qErr) {
        console.error("[AdminQuiz] fetch error:", qErr);
        setError("Não foi possível carregar as respostas do quiz. Recarregue a página.");
      } else {
        setRows((data as QuizRow[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  const boughtRows = useMemo(() => rows.filter((r) => r.bought), [rows]);
  const notBoughtRows = useMemo(() => rows.filter((r) => !r.bought), [rows]);

  const npsAvg = useMemo(() => {
    const ns = boughtRows.map((r) => Number(r.q3_value)).filter((n) => Number.isFinite(n));
    return ns.length ? (ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(1) : "—";
  }, [boughtRows]);

  const returnDist = useMemo(() => {
    const base = notBoughtRows.filter((r) => r.q3_value);
    const count = (k: string) => base.filter((r) => r.q3_value === k).length;
    const pct = (n: number) => (base.length ? Math.round((n / base.length) * 100) : 0);
    return (["sim", "talvez", "nao"] as const).map((k) => ({
      key: k, label: k === "sim" ? "Sim" : k === "talvez" ? "Talvez" : "Não",
      count: count(k), pct: pct(count(k)),
    }));
  }, [notBoughtRows]);

  const openAnswers = useMemo(() => {
    let base = rows.filter((r) => r.q2_text?.trim());
    if (filter === "comprou") base = base.filter((r) => r.bought);
    if (filter === "nao_comprou") base = base.filter((r) => !r.bought);
    return [...base].sort((a, b) =>
      sortDesc
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [rows, filter, sortDesc]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <p className="text-center text-destructive py-16">{error}</p>;

  const pctBought = rows.length ? Math.round((boughtRows.length / rows.length) * 100) : 0;

  return (
    <div className="space-y-8 mt-2 pb-8">
      <div className="pt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 mb-1.5">Admin</p>
        <h3 className="text-2xl font-display font-bold tracking-tight">Feedback de fim de trial</h3>
        <p className="text-sm text-muted-foreground mt-1">Coleta do quiz (modal + WhatsApp). Compra é detectada, não perguntada.</p>
      </div>

      {/* ── (a) AGREGADO ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Respostas", value: rows.length, sub: "total" },
          { label: "Compraram", value: `${boughtRows.length} · ${pctBought}%`, sub: "detectado da assinatura" },
          { label: "Não compraram", value: `${notBoughtRows.length} · ${rows.length ? 100 - pctBought : 0}%`, sub: "objeções abaixo" },
          { label: "NPS médio", value: npsAvg, sub: "compradores (0-10)" },
        ].map((c) => (
          <Card key={c.label} className="border-border/40">
            <CardContent className="p-5">
              <p className="text-2xl font-display font-bold leading-none">{c.value}</p>
              <p className="text-[11px] font-semibold text-foreground/75 mt-1.5">{c.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DistBars title="Por que NÃO comprou (qual objeção domina)" rows={notBoughtRows} accent="bg-destructive/70" />
        <DistBars title="Por que comprou (qual motivação domina)" rows={boughtRows} accent="bg-emerald-500/80" />
      </div>

      <Card className="border-border/40">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold">Voltaria a considerar? (não-compradores)</p>
          <div className="flex gap-3">
            {returnDist.map((d) => (
              <div key={d.key} className="flex-1 rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-xl font-display font-bold">{d.pct}%</p>
                <p className="text-[11px] text-muted-foreground">{d.label} ({d.count})</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── (b) RESPOSTAS ABERTAS ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Respostas abertas ({openAnswers.length})
          </p>
          <div className="flex items-center gap-2">
            {(["todos", "comprou", "nao_comprou"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "todos" ? "Todos" : f === "comprou" ? "Comprou" : "Não comprou"}
              </button>
            ))}
            <button
              onClick={() => setSortDesc((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              title="Inverter ordem por data"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortDesc ? "Recentes" : "Antigas"}
            </button>
          </div>
        </div>

        {openAnswers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma resposta aberta neste filtro.</p>
        ) : (
          <div className="space-y-2">
            {openAnswers.map((r) => (
              <Card key={r.id} className="border-border/40">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm text-foreground/90 leading-relaxed">“{r.q2_text}”</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant={r.bought ? "default" : "destructive"} className="text-[10px] px-2 py-0 h-5">
                      {r.bought ? "Comprou" : "Não comprou"}
                    </Badge>
                    {r.q1_label && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">{r.q1_label}</Badge>
                    )}
                    <span>{r.email}</span>
                    <span>· {new Date(r.created_at).toLocaleString("pt-BR")}</span>
                    <span>· via {r.source === "modal" ? "app" : "WhatsApp"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuiz;
