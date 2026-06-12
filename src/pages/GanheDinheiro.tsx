import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  HandCoins, Copy, Check, Heart, Loader2, AlertCircle, Pencil, Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { AFFILIATE_ENABLED } from "@/config/affiliate";
import { PixSetupWizard, TERMS_TEXT } from "@/components/affiliate/PixSetupWizard";

// Onepager do programa de indicação (FASE 1: link + indicações; comissões em R$
// entram na Fase 2). Compliance: o link só nasce DEPOIS do aceite dos termos
// (wizard) — por isso o estado sem perfil mostra o CTA, não o link.

const COMMISSION = "R$ 14,97";
const CAP = "R$ 500";

// Shape da RPC my_referrals (mascarada: a API nunca expõe o email da indicada).
interface Referral {
  id: string;
  referred_initial: string;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  activated: "ativou o teste 💜",
  activated_trial: "ativou o teste 💜",
  paid_first: "1ª fatura paga ✓",
  qualified: "qualificada 🎉",
  churned: "cancelou",
  fraud_blocked: "bloqueada",
};

const WHATS_MSG = (link: string) =>
  `Oi! Tô usando o Borda Pro pra baixar matrizes de bordado e tá salvando minha vida. Se quiser testar, te liberam 10 dias grátis: ${link}`;

const FAQ = [
  { q: "Como funciona?", a: `Você compartilha seu link exclusivo. Quando uma amiga assina pela sua indicação, você ganha ${COMMISSION} por mês enquanto ela for cliente. Sem limite de amigas.` },
  { q: "Quanto posso ganhar?", a: `${COMMISSION} por mês por amiga assinante ativa, até ${CAP} por mês nesta fase do programa (valores acima ficam em espera pro ciclo seguinte).` },
  { q: "Quando recebo o Pix?", a: "Mensalmente, até o dia 14, direto na chave Pix que você cadastrar — quando seu saldo aprovado atingir R$ 50. Abaixo disso, o valor acumula pro ciclo seguinte. A comissão de cada amiga é liberada 60 dias após a primeira fatura paga dela." },
  { q: "O que é uma indicação válida?", a: "Uma pessoa nova que entra pelo seu link, vira assinante pagante e permanece ativa e em dia por pelo menos 60 dias." },
  { q: "Posso indicar meu marido / sócia / mãe?", a: "Pode! Qualquer pessoa que realmente vá usar a Borda Pro conta. O que o termo proíbe é autoindicação e contas criadas só pra gerar comissão (mesmo CPF/Pix, perfis falsos, duplicadas) — isso o antifraude bloqueia." },
  { q: "E se a amiga cancelar?", a: "A comissão dela para de ser gerada a partir do cancelamento. Se ela pedir reembolso, a comissão daquela fatura é cancelada." },
  { q: "Preciso pagar imposto?", a: `Até ${CAP}/mês o Pix vai direto. Acima de R$ 5.000 acumulados, pedimos nota fiscal — a gente te orienta quando chegar lá.` },
];

const GanheDinheiro = () => {
  const { user, isAdmin } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardOpenCount, setWizardOpenCount] = useState(0);
  const [wizardMode, setWizardMode] = useState<"setup" | "edit">("setup");
  const [termsOpen, setTermsOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "msg" | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    const [prof, refs] = await Promise.all([
      db.from("affiliate_profile").select("*").eq("user_id", user.id).maybeSingle(),
      db.rpc("my_referrals"),
    ]);
    // Erro vira ERRO visível, não "vazio" (lição da auditoria).
    if (prof.error || refs.error) {
      console.error("[GanheDinheiro] load error:", prof.error ?? refs.error);
      setError(true);
    } else {
      setProfile(prof.data);
      setReferrals((refs.data as Referral[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const link = profile ? `https://borda.pro/ativar?ref=${profile.referral_code}` : null;
  // RPC my_referrals já vem mascarada e sem linhas fraud_blocked.
  const activeRefs = referrals;

  const copy = async (text: string, which: "link" | "msg") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success("Copiado!");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Não foi possível copiar — seleciona e copia manualmente.");
    }
  };

  // ⚠️ GATE DE LANÇAMENTO (§7 do spec): termo é rascunho → programa visível só
  // pra admin (smoke test em prod) até AFFILIATE_ENABLED=true com termo v1.0.
  if (!AFFILIATE_ENABLED && !isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-8">
        {!AFFILIATE_ENABLED && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
            🔒 Pré-lançamento — visível só para admin. Libera em src/config/affiliate.ts após o termo validado pelo contador.
          </div>
        )}
        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-secondary/5 to-amber-100/40 p-7 md:p-9">
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-bold tracking-wide">
              <HandCoins className="h-3.5 w-3.5" /> INDIQUE E GANHE
            </span>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight">
              Ganhe <span className="text-gradient-brand">{COMMISSION}/mês</span> de cada amiga que assinar
            </h1>
            <ul className="space-y-1.5 text-sm text-foreground/80">
              {["Sem limite de amigas", "Renda recorrente enquanto ela for cliente", "Pix direto na sua conta todo dia 14"].map((b) => (
                <li key={b} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> {b}</li>
              ))}
            </ul>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-10 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive/60 mx-auto" />
              <p className="font-medium">Não foi possível carregar seus dados de indicação.</p>
              <Button variant="outline" className="rounded-full" onClick={load}>Tentar de novo</Button>
            </CardContent>
          </Card>
        ) : !profile ? (
          /* ── Sem cadastro: termos vêm ANTES do link (compliance) ── */
          <Card className="border-primary/30 border-2 shadow-lg shadow-primary/10">
            <CardContent className="py-8 text-center space-y-4">
              <Sparkles className="h-8 w-8 text-primary mx-auto" />
              <div className="space-y-1">
                <p className="font-display font-bold text-lg">Ative seu link exclusivo</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Cadastre sua chave Pix e aceite os termos — leva 2 minutos e seu link sai na hora.
                </p>
              </div>
              <Button
                className="rounded-full py-6 px-8 font-semibold shadow-lg shadow-primary/20"
                onClick={() => { setWizardMode("setup"); setWizardOpenCount((c) => c + 1); setWizardOpen(true); }}
              >
                Configurar PIX para receber
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Card do link ── */}
            <Card className="border-primary/30 border-2 shadow-lg shadow-primary/10">
              <CardContent className="p-6 space-y-4">
                <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Seu link exclusivo</p>
                <code className="block truncate rounded-xl bg-muted/60 px-3 py-2.5 text-xs">{link}</code>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-full gap-1.5 font-semibold" onClick={() => copy(link!, "link")}>
                    {copied === "link"
                      ? (<><Check className="h-4 w-4 text-emerald-600" /> Copiado!</>)
                      : (<><Copy className="h-4 w-4" /> Copiar link</>)}
                  </Button>
                  <Button
                    className="rounded-full gap-1.5 font-semibold bg-[#25D366] hover:bg-[#2ee06f] text-white"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(WHATS_MSG(link!))}`, "_blank", "noopener,noreferrer")}
                  >
                    📱 WhatsApp
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  {[
                    { v: String(activeRefs.length), l: "amigas" },
                    { v: "R$ 0", l: "liberado" },
                    { v: `até ${CAP}`, l: "cap mensal" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-muted/40 py-3">
                      <p className="text-lg font-display font-bold leading-none">{s.v}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Comissões liberam 60 dias após a 1ª fatura paga de cada amiga.
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>✓ Pix configurado: <strong>{profile.pix_type === "email" ? profile.pix_key?.replace(/^(..).*(@.*)$/, "$1***$2") : `${(profile.pix_key ?? "").slice(0, 4)}…`}</strong></span>
                  <button onClick={() => { setWizardMode("edit"); setWizardOpenCount((c) => c + 1); setWizardOpen(true); }} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                </p>
              </CardContent>
            </Card>

            {/* ── Indicações (5 slots) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Suas indicações</p>
                <button onClick={load} className="text-xs text-primary hover:underline">Atualizar</button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: Math.max(5, activeRefs.length) }, (_, i) => {
                  const r = activeRefs[i];
                  return (
                    <div
                      key={r?.id ?? `slot-${i}`}
                      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 p-1 text-center ${
                        r ? "border-primary/40 bg-primary/5" : "border-dashed border-border/60 bg-muted/20"
                      }`}
                    >
                      {r ? (
                        <>
                          <span className="text-base font-display font-bold text-primary">
                            {r.referred_initial}
                          </span>
                          <span className="line-clamp-2 overflow-hidden text-[10px] leading-tight text-muted-foreground px-0.5">
                            {STATUS_LABEL[r.status] ?? "em andamento"}
                          </span>
                        </>
                      ) : (
                        <Heart className="h-4 w-4 text-muted-foreground/30" />
                      )}
                    </div>
                  );
                })}
              </div>
              {activeRefs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">Quando uma amiga ativar pelo seu link, ela aparece aqui ↑</p>
              )}
            </div>

            {/* ── Mensagem pronta ── */}
            <Card className="border-border/40">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-semibold">Mensagem pronta pra enviar</p>
                <p className="rounded-xl bg-muted/40 p-4 text-sm leading-relaxed text-foreground/85">{WHATS_MSG(link!)}</p>
                <Button variant="outline" className="rounded-full gap-2" onClick={() => copy(WHATS_MSG(link!), "msg")}>
                  {copied === "msg" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Copiar mensagem
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── FAQ ── */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Perguntas frequentes</p>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQ.map(({ q, a }, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card/60 border border-border/40 rounded-2xl px-4">
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-3.5">{q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="text-center">
            <button onClick={() => setTermsOpen(true)} className="text-xs text-muted-foreground hover:text-foreground underline">
              Termos do programa de indicação
            </button>
          </p>
        </div>
      </div>

      {/* key só muda ao ABRIR (counter): reseta o state do wizard sem matar a
          animação de saída do Dialog no fechar. */}
      <PixSetupWizard
        key={`${wizardMode}-${wizardOpenCount}`}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        mode={wizardMode}
        initial={profile}
        onSaved={load}
      />

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <h2 className="text-lg font-display font-bold mb-3">Termos do programa</h2>
          <div className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">{TERMS_TEXT}</div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default GanheDinheiro;
