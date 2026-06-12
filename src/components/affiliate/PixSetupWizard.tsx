import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ⚠️ RASCUNHO v0 — TEXTO PLACEHOLDER. O lançamento do programa é BLOQUEADO até
// o Leo validar este termo com o contador (obrigação pré-lançamento do spec).
export const TERMS_VERSION = "v0-draft";
export const TERMS_TEXT = `TERMO DE ADESÃO — PROGRAMA DE INDICAÇÃO BORDA PRO (RASCUNHO v0 — sujeito a validação contábil e jurídica)

1. INDICAÇÃO VÁLIDA: considera-se indicação válida a pessoa que (a) acessar a Borda Pro pelo seu link exclusivo, (b) tornar-se assinante pagante, e (c) permanecer ativa por pelo menos 60 dias após a primeira fatura paga.

2. COMISSÃO: 30% do valor da assinatura mensal (R$ 14,97 por mês, por indicada ativa), enquanto a indicada permanecer cliente pagante. A comissão da primeira fatura só é liberada 60 dias após o pagamento.

3. REVERSÃO: em caso de reembolso ou chargeback da indicada, comissões futuras cessam e comissões ainda não pagas são canceladas.

4. PAGAMENTO: via Pix, em ciclo mensal (dia 14), para a chave cadastrada neste programa. Limite de R$ 500,00/mês; valores excedentes ficam em espera para o ciclo seguinte. Acima de R$ 5.000,00 acumulados, será exigida emissão de nota fiscal.

5. NATUREZA: a comissão constitui remuneração por serviço autônomo eventual de indicação de negócios, sem vínculo empregatício, societário ou de representação.

6. AUTOINDICAÇÃO: é vedado indicar a si mesma, contas próprias ou utilizar o próprio CPF/email como indicada. Violações resultam em bloqueio do programa e cancelamento das comissões.

7. A Borda Pro pode alterar ou encerrar o programa mediante aviso prévio de 30 dias, preservando comissões já geradas.`;

interface Profile {
  pix_key?: string | null;
  pix_type?: string | null;
  pix_holder_name?: string | null;
  pix_holder_cpf?: string | null;
  address_zip?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
}

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Aleatória" },
];

// Dígito verificador de CPF (espelho do server — feedback imediato no client).
export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(d[len])) return false;
  }
  return true;
}

// Erros do servidor → mensagem amigável (fallback genérico cobre o resto).
const SERVER_ERRORS: Record<string, string> = {
  cpf_invalido: "CPF inválido — confere os dígitos.",
  pix_cpf_diferente_do_titular: "A chave CPF precisa ser o mesmo CPF do titular.",
  pix_email_invalido: "A chave de email não parece válida.",
  pix_phone_invalido: "A chave de telefone não parece válida (use DDD + número).",
  pix_random_invalida: "A chave aleatória não parece válida (copie do app do banco).",
  setup_required: "Finalize o cadastro primeiro (Configurar PIX).",
  termos_nao_aceitos: "Você precisa aceitar os termos pra concluir.",
};

export const PixSetupWizard = ({
  open, onOpenChange, mode, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "setup" | "edit";
  initial?: Profile | null;
  onSaved: () => void;
}) => {
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, string>>({
    pix_holder_name: initial?.pix_holder_name ?? "",
    pix_holder_cpf: initial?.pix_holder_cpf ?? "",
    address_zip: initial?.address_zip ?? "",
    address_street: initial?.address_street ?? "",
    address_number: initial?.address_number ?? "",
    address_complement: initial?.address_complement ?? "",
    address_neighborhood: initial?.address_neighborhood ?? "",
    address_city: initial?.address_city ?? "",
    address_state: initial?.address_state ?? "",
    pix_type: initial?.pix_type ?? "cpf",
    pix_key: initial?.pix_key ?? "",
  });
  const [termsChecked, setTermsChecked] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  // CEP → autopreenche (viacep, best-effort)
  const onZipBlur = async () => {
    const zip = f.address_zip.replace(/\D/g, "");
    if (zip.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setF((p) => ({
          ...p,
          address_street: d.logradouro || p.address_street,
          address_neighborhood: d.bairro || p.address_neighborhood,
          address_city: d.localidade || p.address_city,
          address_state: d.uf || p.address_state,
        }));
      }
    } catch { /* segue manual */ }
  };

  const cpfDigits = f.pix_holder_cpf.replace(/\D/g, "");
  const cpfOk = cpfValido(cpfDigits);
  const step0Ok = f.pix_holder_name.trim().length >= 5 && cpfOk && f.address_zip && f.address_city;
  const pixCpfMismatch = f.pix_type === "cpf" && f.pix_key.replace(/\D/g, "") !== cpfDigits && f.pix_key.length > 0;
  const step1Ok = f.pix_key.trim().length > 3 && !pixCpfMismatch;

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const action = mode === "setup" ? "setup" : "save_pix";
      const { data, error: fnErr } = await supabase.functions.invoke("affiliate", {
        body: { action, ...f, ...(mode === "setup" ? { terms_accepted: true } : {}) },
      });
      if (fnErr || !data?.ok) throw fnErr ?? new Error(data?.error ?? "save_failed");
      toast.success(mode === "setup" ? "Cadastro concluído! Seu link está pronto 💜" : "Dados Pix atualizados!");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error("[PixSetupWizard] submit error:", err);
      // supabase-js põe respostas não-2xx em err.context (Response) — extrai o
      // código do servidor pra mensagem específica; genérica como fallback.
      let msg = "Não foi possível salvar. Confere os dados e tenta de novo.";
      try {
        const ctx = (err as { context?: Response }).context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error && SERVER_ERRORS[body.error]) msg = SERVER_ERRORS[body.error];
      } catch { /* mantém genérica */ }
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const lastStep = mode === "setup" ? 2 : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold text-primary">Passo {step + 1} de {lastStep + 1}</p>
          <h2 className="text-lg font-display font-bold">
            {step === 0 ? "Seus dados (pra gente te pagar certinho)" : step === 1 ? "Sua chave Pix" : "Termos do programa"}
          </h2>
        </div>

        {step === 0 && (
          <div className="space-y-2.5">
            <Input placeholder="Nome completo" value={f.pix_holder_name} onChange={set("pix_holder_name")} />
            <Input placeholder="CPF (só números)" inputMode="numeric" value={f.pix_holder_cpf} onChange={set("pix_holder_cpf")} />
            {cpfDigits.length === 11 && !cpfOk && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> CPF inválido — confere os dígitos.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Input placeholder="CEP" inputMode="numeric" value={f.address_zip} onChange={set("address_zip")} onBlur={onZipBlur} />
              <Input placeholder="UF" maxLength={2} value={f.address_state} onChange={set("address_state")} />
            </div>
            <Input placeholder="Rua" value={f.address_street} onChange={set("address_street")} />
            <div className="grid grid-cols-2 gap-2.5">
              <Input placeholder="Número" value={f.address_number} onChange={set("address_number")} />
              <Input placeholder="Complemento" value={f.address_complement} onChange={set("address_complement")} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Input placeholder="Bairro" value={f.address_neighborhood} onChange={set("address_neighborhood")} />
              <Input placeholder="Cidade" value={f.address_city} onChange={set("address_city")} />
            </div>
            <Button className="w-full rounded-full py-5 font-semibold" disabled={!step0Ok} onClick={() => setStep(1)}>
              Continuar
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-4 gap-1.5">
              {PIX_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setF((p) => ({ ...p, pix_type: t.value }))}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    f.pix_type === t.value ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Input placeholder="Sua chave Pix" value={f.pix_key} onChange={set("pix_key")} />
            {pixCpfMismatch && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> A chave CPF precisa ser o mesmo CPF do passo anterior.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">Titular: <strong>{f.pix_holder_name || "—"}</strong> (precisa ser a sua própria conta)</p>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setStep(0)}>Voltar</Button>
              {mode === "edit" ? (
                <Button className="flex-1 rounded-full py-5 font-semibold" disabled={!step1Ok || sending} onClick={submit}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              ) : (
                <Button className="flex-1 rounded-full py-5 font-semibold" disabled={!step1Ok} onClick={() => setStep(2)}>
                  Continuar
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 2 && mode === "setup" && (
          <div className="space-y-3">
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {TERMS_TEXT}
            </div>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
              <span>Li e aceito os termos do programa de afiliados</span>
            </label>
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>Voltar</Button>
              <Button className="flex-1 rounded-full py-5 font-semibold" disabled={!termsChecked || sending} onClick={submit}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir cadastro"}
              </Button>
            </div>
          </div>
        )}
        {step === 1 && mode === "edit" && error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
