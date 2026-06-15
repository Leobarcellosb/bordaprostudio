import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

// Gestão de pedidos de cancelamento. Admin processa o refund no painel da Eduzz;
// o webhook (Fase 2) fecha o ciclo. "Marcar processado" aqui é tracking manual
// (atualiza só o cancellation_requests; o webhook é a fonte de verdade do sub).

interface Row {
  id: string;
  email: string | null;
  status: string;
  reason_key: string;
  reason_label: string;
  reason_other_text: string | null;
  refund_eligible: boolean;
  refund_amount_brl: number | null;
  days_since_first_payment: number | null;
  eduzz_refund_invoice_id: string | null;
  final_feedback_text: string | null;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  cant_use: "Não consegui usar", no_match: "Não achei matrizes", technical: "Dificuldade técnica",
  financial: "Aperto financeiro", expensive: "Achei caro", stopping: "Parando de bordar", other: "Outro",
};
const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_refund: { label: "Reembolso pendente", variant: "destructive" },
  pending_cancellation: { label: "Cancelamento agendado", variant: "secondary" },
  refunded: { label: "Reembolsado", variant: "outline" },
  canceled: { label: "Cancelado", variant: "outline" },
  rejected_returned: { label: "Voltou atrás", variant: "default" },
};
type Filter = "todos" | "pending_refund" | "pending_cancellation" | "refunded" | "canceled";

export const AdminCancellations = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await db
      .from("cancellation_requests")
      .select("id, email, status, reason_key, reason_label, reason_other_text, refund_eligible, refund_amount_brl, days_since_first_payment, eduzz_refund_invoice_id, final_feedback_text, created_at")
      .order("created_at", { ascending: false });
    if (e) { console.error("[AdminCancellations] fetch error:", e); setError("Não foi possível carregar os pedidos. Recarregue a página."); }
    else { setRows((data as Row[]) || []); setError(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending_refund" || r.status === "pending_cancellation"), [rows]);
  const refundPending = useMemo(
    () => rows.filter((r) => r.status === "pending_refund").reduce((s, r) => s + (Number(r.refund_amount_brl) || 0), 0),
    [rows],
  );
  const reasonDist = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.reason_key, (m.get(r.reason_key) ?? 0) + 1));
    return [...m.entries()].map(([k, c]) => ({ k, label: REASON_LABELS[k] ?? k, c, pct: rows.length ? Math.round((c / rows.length) * 100) : 0 })).sort((a, b) => b.c - a.c);
  }, [rows]);

  const shown = useMemo(() => (filter === "todos" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  const markProcessed = async (r: Row) => {
    const finalStatus = r.status === "pending_refund" ? "refunded" : "canceled";
    const invoice = r.status === "pending_refund" ? (window.prompt("ID da fatura reembolsada na Eduzz (opcional):") ?? null) : null;
    setBusy(r.id);
    const { error: e } = await db
      .from("cancellation_requests")
      .update({ status: finalStatus, eduzz_refund_processed_at: new Date().toISOString(), eduzz_refund_invoice_id: invoice || r.eduzz_refund_invoice_id, updated_at: new Date().toISOString() })
      .eq("id", r.id);
    setBusy(null);
    if (e) { toast.error("Não foi possível marcar como processado."); return; }
    toast.success("Marcado como processado. (O webhook da Eduzz confirma o sub + email.)");
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <p className="text-center text-destructive py-16">{error}</p>;

  return (
    <div className="space-y-8 mt-2 pb-8">
      <div className="pt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 mb-1.5">Admin</p>
        <h3 className="text-2xl font-display font-bold tracking-tight">Pedidos de cancelamento</h3>
        <p className="text-sm text-muted-foreground mt-1">Reembolso (&le;7 dias) é processado manualmente na Eduzz; o webhook fecha o ciclo.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: rows.length, sub: "pedidos" },
          { label: "Pendentes", value: pending.length, sub: "aguardando" },
          { label: "Reembolso pendente", value: `R$ ${refundPending.toFixed(2).replace(".", ",")}`, sub: "a processar na Eduzz" },
          { label: "Finalizados", value: rows.filter((r) => r.status === "refunded" || r.status === "canceled").length, sub: "refunded/canceled" },
        ].map((c) => (
          <Card key={c.label} className="border-border/40"><CardContent className="p-5">
            <p className="text-2xl font-display font-bold leading-none">{c.value}</p>
            <p className="text-[11px] font-semibold text-foreground/75 mt-1.5">{c.label}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{c.sub}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="border-border/40"><CardContent className="p-5 space-y-3">
        <p className="text-sm font-semibold">Motivos (qual objeção domina)</p>
        {reasonDist.length === 0 ? <p className="text-xs text-muted-foreground">Sem pedidos ainda.</p> : reasonDist.map((d) => (
          <div key={d.k} className="space-y-1">
            <div className="flex justify-between text-xs"><span>{d.label}</span><span className="font-semibold tabular-nums">{d.c} · {d.pct}%</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-destructive/70" style={{ width: `${d.pct}%` }} /></div>
          </div>
        ))}
      </CardContent></Card>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["todos", "pending_refund", "pending_cancellation", "refunded", "canceled"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f === "todos" ? "Todos" : STATUS[f]?.label ?? f}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum pedido neste filtro.</p>
        ) : shown.map((r) => (
          <Card key={r.id} className="border-border/40"><CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant={STATUS[r.status]?.variant ?? "outline"} className="text-[10px] px-2 py-0 h-5">{STATUS[r.status]?.label ?? r.status}</Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">{REASON_LABELS[r.reason_key] ?? r.reason_key}</Badge>
              {r.refund_amount_brl != null && <span className="font-semibold text-foreground/80">R$ {Number(r.refund_amount_brl).toFixed(2).replace(".", ",")}</span>}
              <span>{r.email ?? "—"}</span>
              <span>· {r.days_since_first_payment ?? "?"}d desde 1ª fatura</span>
              <span>· {new Date(r.created_at).toLocaleString("pt-BR")}</span>
            </div>
            {r.reason_other_text && <p className="text-sm text-foreground/85">“{r.reason_other_text}”</p>}
            {r.final_feedback_text && <p className="text-xs text-muted-foreground">Feedback: “{r.final_feedback_text}”</p>}
            {(r.status === "pending_refund" || r.status === "pending_cancellation") && (
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full" disabled={busy === r.id} onClick={() => markProcessed(r)}>
                {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Marcar como processado
              </Button>
            )}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
};

export default AdminCancellations;
