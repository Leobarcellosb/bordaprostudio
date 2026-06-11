import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

// Quiz de fim de trial: dispara quando falta <24h pro trial expirar e a pessoa
// ainda não respondeu. A trilha (comprou vs não-comprou) é DETECTADA do status
// da assinatura — nunca perguntada. Só coleta; nenhuma oferta automática.

const DISMISS_KEY = "borda-quiz-dismissed";   // sessionStorage: "agora não" vale pela sessão
const ANSWERED_KEY = "borda-quiz-answered";   // localStorage: cinto extra pós-envio

const Q1_NOT_BOUGHT = [
  { key: "no_time", label: "Não tive tempo de testar direito" },
  { key: "no_match", label: "Não achei as matrizes que eu queria" },
  { key: "incompatible", label: "Minha máquina não é compatível ou tive dificuldade técnica" },
  { key: "price_high", label: "Achei o preço alto" },
  { key: "deciding", label: "Ainda estou decidindo" },
  { key: "other", label: "Outro" },
];
const Q1_BOUGHT = [
  { key: "found_matrices", label: "Achei matrizes que eu precisava" },
  { key: "price_worth", label: "O preço valeu a pena" },
  { key: "more_income", label: "Vi que vai me ajudar a ganhar mais" },
  { key: "tools", label: "A calculadora de lucro / ferramentas" },
  { key: "other", label: "Outro" },
];
const Q3_RETURN = [
  { key: "sim", label: "Sim" },
  { key: "talvez", label: "Talvez" },
  { key: "nao", label: "Não" },
];

export const TrialEndQuiz = () => {
  const { user } = useAuth();
  const { status } = useSubscriptionStatus();
  const bought = status === "active";

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0=Q1 1=Q2 2=Q3 3=obrigado
  const [q1, setQ1] = useState<{ key: string; label: string } | null>(null);
  const [q2, setQ2] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  // Elegibilidade: trial expira em <24h E nunca respondeu E não dispensou nesta sessão.
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(DISMISS_KEY) || localStorage.getItem(ANSWERED_KEY)) return;

    let cancelled = false;
    (async () => {
      try {
        // Janela: linha de trial do próprio user (RLS own-read) com trial_until em (agora, +24h].
        const { data: rows, error } = await db
          .from("subscriptions")
          .select("trial_until")
          .eq("user_id", user.id)
          .not("trial_until", "is", null);
        if (error) throw error;
        const now = Date.now();
        const inWindow = (rows ?? []).some((r: any) => {
          const t = new Date(r.trial_until).getTime();
          return t > now && t - now <= 24 * 60 * 60 * 1000;
        });
        if (!inWindow) return;

        // Já respondeu? (tabela pode nem existir ainda — qualquer erro = não mostra)
        const { data: prev, error: qErr } = await db
          .from("quiz_responses")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (qErr) return;
        if ((prev ?? []).length > 0) {
          localStorage.setItem(ANSWERED_KEY, "1");
          return;
        }
        if (!cancelled) setOpen(true);
      } catch {
        /* indisponível → simplesmente não mostra (não-bloqueante) */
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const submit = async (q3Value: string) => {
    setSending(true);
    setSendError(false);
    try {
      const { error } = await supabase.functions.invoke("submit-quiz", {
        body: {
          email: user?.email,
          source: "modal",
          q1_key: q1?.key ?? null,
          q1_label: q1?.label ?? null,
          q2_text: q2.trim() || null,
          q3_value: q3Value,
        },
      });
      if (error) throw error;
      localStorage.setItem(ANSWERED_KEY, "1");
      setStep(3);
    } catch (err) {
      console.error("[TrialEndQuiz] submit error:", err);
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const q1Options = bought ? Q1_BOUGHT : Q1_NOT_BOUGHT;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && step !== 3) dismiss(); else if (!v) setOpen(false); }}>
      <DialogContent className="max-w-md rounded-2xl p-6 gap-0">
        {step < 3 && (
          <div className="mb-4 space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3 w-3" />
              {step + 1} de 3 · rapidinho
            </span>
            <h2 className="text-lg font-display font-bold leading-snug">
              {step === 0 && (bought ? "O que mais pesou na sua decisão de assinar?" : "Seu teste está acabando — o que pesou até agora?")}
              {step === 1 && (bought ? "O que quase te fez NÃO assinar?" : "O que a Borda Pro precisaria ter pra valer a pena pra você?")}
              {step === 2 && (bought ? "De 0 a 10, quanto indicaria a Borda Pro pra outra bordadeira?" : "Você voltaria a considerar no futuro?")}
            </h2>
          </div>
        )}

        {/* Q1 — escolha única */}
        {step === 0 && (
          <div className="space-y-2">
            {q1Options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setQ1(opt); setStep(1); }}
                className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {opt.label}
              </button>
            ))}
            <button onClick={dismiss} className="w-full pt-2 text-center text-xs text-muted-foreground hover:text-foreground">
              Agora não
            </button>
          </div>
        )}

        {/* Q2 — texto livre (opcional) */}
        {step === 1 && (
          <div className="space-y-3">
            <Textarea
              value={q2}
              onChange={(e) => setQ2(e.target.value)}
              placeholder="Conta pra gente… (opcional)"
              rows={4}
              maxLength={2000}
              className="rounded-xl resize-none"
            />
            <Button onClick={() => setStep(2)} className="w-full rounded-full py-5 font-semibold">
              Continuar
            </Button>
          </div>
        )}

        {/* Q3 — NPS (comprou) ou voltaria (não comprou) */}
        {step === 2 && (
          <div className="space-y-3">
            {bought ? (
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    disabled={sending}
                    onClick={() => submit(String(n))}
                    className="aspect-square rounded-lg border border-border/60 text-sm font-semibold hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    {n}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Q3_RETURN.map((opt) => (
                  <button
                    key={opt.key}
                    disabled={sending}
                    onClick={() => submit(opt.key)}
                    className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {sending && (
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…
              </p>
            )}
            {sendError && (
              <p className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Não foi possível enviar — toca de novo na opção.
              </p>
            )}
          </div>
        )}

        {/* Obrigado */}
        {step === 3 && (
          <div className="py-6 text-center space-y-3">
            <p className="text-3xl">💜</p>
            <h2 className="text-lg font-display font-bold">Obrigado! Seu feedback ajuda muito 💜</h2>
            <Button onClick={() => setOpen(false)} variant="outline" className="rounded-full mt-2">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TrialEndQuiz;
