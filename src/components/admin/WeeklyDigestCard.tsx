import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DigestResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  subscribers?: number;
  designs?: number;
  reason?: string;
  error?: string;
}

// Function endpoint + anon key (público, mesma chave que vai no bundle JS).
// A função weekly-digest aceita anon como bearer (auth simplificada per
// decisão de produto); não dá pra usar supabase.functions.invoke() porque
// ele anexa o session JWT do user logado, que a função rejeita.
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weekly-digest`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const WeeklyDigestCard = () => {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<DigestResult | null>(null);

  const sendDigest = async () => {
    if (!confirm("Disparar o resumo semanal agora pra todas as assinantes ativas?")) return;

    setSending(true);
    setLastResult(null);

    try {
      const resp = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: "{}",
      });
      const data: DigestResult = await resp.json().catch(() => ({ ok: false, error: "invalid_response" }));

      if (!resp.ok) {
        const msg = data?.error ?? `HTTP ${resp.status}`;
        toast.error(msg);
        setLastResult({ ok: false, error: msg });
      } else {
        setLastResult(data);
        if (data.ok) {
          if ((data.sent ?? 0) > 0) {
            toast.success(`✅ ${data.sent} emails enviados (${data.designs} designs novos)`);
          } else {
            toast.info(`Nada enviado: ${data.reason ?? "sem motivo"}`);
          }
        } else {
          toast.error(`Erro: ${data.error ?? "desconhecido"}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro de rede";
      toast.error(msg);
      setLastResult({ ok: false, error: msg });
    }
    setSending(false);
  };

  const buildResultText = (r: DigestResult): { tone: "success" | "info" | "error"; text: string } => {
    if (!r.ok) return { tone: "error", text: `Erro: ${r.error ?? "desconhecido"}` };
    if (r.reason === "no_new_designs") return { tone: "info", text: "Nenhum design novo nos últimos 7 dias — nada enviado." };
    if (r.reason === "no_active_subscribers") return { tone: "info", text: "Nenhuma assinante ativa — nada enviado." };
    if ((r.failed ?? 0) > 0) {
      return {
        tone: "error",
        text: `Parcial: ${r.sent} enviados, ${r.failed} falharam de ${r.subscribers} assinantes (${r.designs} designs).`,
      };
    }
    return {
      tone: "success",
      text: `✅ ${r.sent} emails enviados para ${r.subscribers} assinantes (${r.designs} designs novos da semana).`,
    };
  };

  return (
    <Card className="border-border/60 rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-base">Resumo semanal</CardTitle>
            <CardDescription>
              Envia o resumo dos últimos 7 dias para todas as assinantes ativas.
              Agendado automaticamente toda sexta às 9h.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={sendDigest}
          disabled={sending}
          size="sm"
          className="gap-1.5 rounded-xl"
        >
          {sending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="h-3.5 w-3.5" />
              Enviar resumo agora
            </>
          )}
        </Button>

        {lastResult && (() => {
          const { tone, text } = buildResultText(lastResult);
          const styles = {
            success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, color: "text-emerald-700" },
            info:    { bg: "bg-blue-50",    border: "border-blue-200",    icon: <Mail className="h-4 w-4 text-blue-600" />,           color: "text-blue-700" },
            error:   { bg: "bg-red-50",     border: "border-red-200",     icon: <AlertCircle className="h-4 w-4 text-red-600" />,     color: "text-red-700" },
          }[tone];
          return (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${styles.bg} ${styles.border}`}>
              {styles.icon}
              <p className={`text-xs leading-snug ${styles.color}`}>{text}</p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};
