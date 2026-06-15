import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Check, MessageCircle, X } from "lucide-react";
import { whatsappLink } from "@/config/contato";
import { isPaidActive } from "@/lib/subscription";

// Fluxo de cancelamento (retenção honesta, sem dark pattern): motivo → oferta
// contextualizada → confirmação (com elegibilidade de reembolso CDC art. 49) →
// sucesso. A autoridade do reembolso é o servidor (request-cancellation); aqui
// o cálculo é só pra exibir a tela certa.

const REASONS = [
  { key: "cant_use", label: "Não consegui usar como esperava" },
  { key: "no_match", label: "Não achei matrizes que eu queria" },
  { key: "technical", label: "Tive dificuldade técnica ou com a máquina" },
  { key: "financial", label: "Estou passando por aperto financeiro" },
  { key: "expensive", label: "Achei o preço alto" },
  { key: "stopping", label: "Estou parando de bordar" },
  { key: "other", label: "Outro motivo" },
];
const SKIP_RETENTION = new Set(["stopping", "other"]); // vão direto pra confirmação

type Step = "reason" | "retention" | "confirm" | "done";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

// Wrapper no TOPO do módulo (não dentro do componente) — se ficasse interno,
// seria recriado a cada render e o Textarea perderia o foco a cada tecla.
const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--landing-warm))] px-4 py-10">
    <Card className="w-full max-w-lg border-border/40 shadow-xl shadow-primary/5">
      <CardContent className="p-7 md:p-9 space-y-5">{children}</CardContent>
    </Card>
  </div>
);

const CancelSubscription = () => {
  const { subscription, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<{ key: string; label: string } | null>(null);
  const [reasonOther, setReasonOther] = useState("");
  const [feedback, setFeedback] = useState("");
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ refundEligible: boolean; accessUntil: string | null } | null>(null);

  const paid = isPaidActive(subscription);
  // first_paid_at canônico = Fase 2 (webhook); até lá created_at é o proxy (igual ao server).
  const subRec = subscription as Record<string, unknown> | null;
  const firstPaid = (subRec?.first_paid_at ?? subRec?.created_at) as string | undefined;
  const daysSince = firstPaid ? Math.floor((Date.now() - new Date(firstPaid).getTime()) / 86_400_000) : null;
  const refundEligible = daysSince !== null && daysSince <= 7;
  const accessUntil = subscription?.access_expires_at ?? null;
  const daysLeft = accessUntil ? Math.max(0, Math.ceil((new Date(accessUntil).getTime() - Date.now()) / 86_400_000)) : null;

  if (!paid) {
    return (
      <Shell>
        <h1 className="text-xl font-display font-bold">Sem assinatura ativa</h1>
        <p className="text-sm text-muted-foreground">Você não tem uma assinatura ativa pra cancelar.</p>
        <Button onClick={() => navigate("/minha-conta")} className="rounded-full">Voltar pra minha conta</Button>
      </Shell>
    );
  }

  const leaveRetained = (msg: string) => { toast.success(msg); navigate("/minha-conta"); };

  const submit = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-cancellation", {
        body: {
          reason_key: reason?.key,
          reason_label: reason?.label,
          reason_other_text: reasonOther.trim() || null,
          retention_offer_shown: reason && !SKIP_RETENTION.has(reason.key) ? reason.key : null,
          final_feedback_text: feedback.trim() || null,
        },
      });
      if (error || !data?.ok) throw error ?? new Error("fail");
      setDone({ refundEligible: !!data.refund_eligible, accessUntil: data.access_until ?? null });
      setStep("done");
      void refresh(); // app reflete novo status (corte de acesso no reembolso)
    } catch (e) {
      console.error("[cancel] submit error:", e);
      toast.error("Não foi possível cancelar agora. Tente de novo em instantes.");
    } finally {
      setSending(false);
    }
  };

  // ── Etapa 1: motivo ──
  if (step === "reason") {
    return (
      <Shell>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary">Etapa 1 de 3</p>
          <h1 className="text-xl font-display font-bold">Por que você quer cancelar?</h1>
          <p className="text-sm text-muted-foreground">Antes de cancelar, conta uma coisa pra gente.</p>
        </div>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setReason(r)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                reason?.key === r.key ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:border-primary/40"
              }`}
            >
              {r.label}
            </button>
          ))}
          {reason?.key === "other" && (
            <Textarea value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} placeholder="Conta pra gente o que rolou (opcional)" rows={3} maxLength={2000} className="rounded-xl resize-none" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/minha-conta")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</button>
          <Button disabled={!reason} className="rounded-full px-6" onClick={() => setStep(reason && SKIP_RETENTION.has(reason.key) ? "confirm" : "retention")}>
            Continuar
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Etapa 2: retenção contextualizada ──
  if (step === "retention" && reason) {
    const wa = (text: string) => window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
    const offers: Record<string, { header: string; text: React.ReactNode; accept: React.ReactNode }> = {
      cant_use: {
        header: "A gente pode te ajudar.",
        text: "Talvez você esteja perdendo recursos que fazem diferença. Que tal a gente te mostrar no WhatsApp como tirar o máximo do Borda Pro?",
        accept: <Button className="w-full rounded-full gap-2 bg-[#25D366] hover:bg-[#2ee06f] text-white" onClick={() => wa("Oi! Quero ajuda pra usar melhor o Borda Pro.")}><MessageCircle className="h-4 w-4" /> Falar no WhatsApp</Button>,
      },
      no_match: {
        header: "Vamos resolver isso juntas.",
        text: "Manda quais temas você procura — a gente prioriza adicionar no acervo. Já são mais de 1.400 matrizes, com novas toda semana.",
        accept: (
          <div className="space-y-2">
            <Textarea value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} placeholder="Que tipo de matriz você queria encontrar?" rows={3} maxLength={2000} className="rounded-xl resize-none" />
            <Button className="w-full rounded-full" onClick={() => leaveRetained("Anotado! Vamos priorizar essas matrizes 💜")}>Mandar e continuar usando</Button>
          </div>
        ),
      },
      technical: {
        header: "Vamos te ajudar agora.",
        text: "Máquinas diferentes precisam de configurações diferentes — e a gente tá aqui pra isso. Manda mensagem no WhatsApp que resolvemos junto.",
        accept: <Button className="w-full rounded-full gap-2 bg-[#25D366] hover:bg-[#2ee06f] text-white" onClick={() => wa("Oi! Preciso de ajuda técnica com o Borda Pro.")}><MessageCircle className="h-4 w-4" /> Abrir WhatsApp</Button>,
      },
      financial: {
        header: "A gente entende.",
        text: "Antes de cancelar, manda uma mensagem pra gente — quem sabe a gente pensa numa solução juntas.",
        accept: <Button className="w-full rounded-full gap-2 bg-[#25D366] hover:bg-[#2ee06f] text-white" onClick={() => wa("Oi! Tô passando por um aperto e queria ver alternativas antes de cancelar o Borda Pro.")}><MessageCircle className="h-4 w-4" /> Falar com a gente</Button>,
      },
      expensive: {
        header: "Olha o que tá incluído.",
        text: "Cada matriz no varejo custa de R$ 8 a R$ 15. Com o Borda Pro você tem acesso ilimitado ao acervo inteiro por R$ 49,90/mês — mais a calculadora de lucro e as ferramentas.",
        accept: <Button className="w-full rounded-full" onClick={() => leaveRetained("Que bom! Continua aproveitando 💜")}>Vou continuar</Button>,
      },
    };
    const o = offers[reason.key];
    return (
      <Shell>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary">Etapa 2 de 3</p>
          <h1 className="text-xl font-display font-bold">{o?.header ?? "Antes de ir…"}</h1>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{o?.text}</p>
        <div className="space-y-2.5">
          {o?.accept}
          <Button variant="outline" className="w-full rounded-full text-muted-foreground" onClick={() => setStep("confirm")}>
            Não, quero cancelar mesmo
          </Button>
        </div>
        <button onClick={() => setStep("reason")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</button>
      </Shell>
    );
  }

  // ── Etapa 3: confirmação ──
  if (step === "confirm") {
    return (
      <Shell>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary">Etapa 3 de 3</p>
          <h1 className="text-xl font-display font-bold">Confirmar cancelamento</h1>
        </div>
        {refundEligible ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm space-y-1.5">
            <p className="font-semibold text-amber-900">Você está dentro dos 7 dias de garantia.</p>
            <p className="flex items-center gap-2 text-emerald-700"><Check className="h-4 w-4 shrink-0" /> Reembolso integral, no método de pagamento original (em até 7 dias úteis)</p>
            <p className="flex items-center gap-2 text-destructive"><X className="h-4 w-4 shrink-0" /> Seu acesso é cortado <strong>agora</strong></p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm space-y-1.5">
            <p className="font-semibold">Você está fora do período de garantia de 7 dias.</p>
            <p className="flex items-center gap-2 text-destructive"><X className="h-4 w-4 shrink-0" /> Sem reembolso (pela política)</p>
            <p className="flex items-center gap-2 text-emerald-700"><Check className="h-4 w-4 shrink-0" /> Você continua com acesso até <strong>{fmt(accessUntil)}</strong>{daysLeft !== null ? ` (${daysLeft} dias)` : ""}</p>
            <p className="flex items-center gap-2 text-emerald-700"><Check className="h-4 w-4 shrink-0" /> Sua próxima cobrança NÃO acontece</p>
          </div>
        )}
        <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="O que poderia ter sido diferente? (opcional)" rows={3} maxLength={2000} className="rounded-xl resize-none" />
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
          <span>{refundEligible ? "Sim, entendo e quero cancelar com reembolso" : "Sim, entendo e quero cancelar a renovação"}</span>
        </label>
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setStep(reason && SKIP_RETENTION.has(reason.key) ? "reason" : "retention")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</button>
          <Button variant="destructive" className="rounded-full px-6" disabled={!checked || sending} onClick={submit}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar cancelamento"}
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Etapa 4: sucesso ──
  return (
    <Shell>
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="h-6 w-6 text-emerald-600" /></div>
        {done?.refundEligible ? (
          <>
            <h1 className="text-xl font-display font-bold">Cancelamento confirmado</h1>
            <p className="text-sm text-muted-foreground">Sua assinatura foi cancelada e o reembolso está em processamento — chega no método de pagamento original em até 7 dias úteis. Enviamos um email de confirmação.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-display font-bold">Cancelamento agendado</h1>
            <p className="text-sm text-muted-foreground">Sua próxima cobrança foi cancelada. Você usa o Borda Pro até <strong>{fmt(done?.accessUntil ?? accessUntil)}</strong>. Depois, sua conta fica guardada por 90 dias caso queira voltar. Enviamos um email de confirmação.</p>
          </>
        )}
      </div>
      <Button className="w-full rounded-full" onClick={() => navigate(done?.refundEligible ? "/" : "/dashboard")}>
        {done?.refundEligible ? "Voltar pra home" : "Continuar usando até o fim do período"}
      </Button>
    </Shell>
  );
};

export default CancelSubscription;
