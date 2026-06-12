import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ⚠️ Termo REVISADO pelo Leo (12/06) — header ainda diz "rascunho operacional
// sujeito à validação contábil e jurídica" → o gate AFFILIATE_ENABLED segue
// false até o OK formal do contador. Aí: virar TERMS_VERSION pra "v1.0".
export const TERMS_VERSION = "v0.2-draft";
export const TERMS_TEXT = `TERMO DE ADESÃO — PROGRAMA DE INDICAÇÃO BORDA PRO

Versão: rascunho operacional sujeito à validação contábil e jurídica

Pelo presente termo, a BORDA PRO estabelece as regras para participação no seu Programa de Indicação, destinado a pessoas físicas ou jurídicas que desejem indicar novas assinantes para a plataforma Borda Pro.

Ao participar do programa, a participante declara ter lido, compreendido e aceitado integralmente as regras abaixo.

1. OBJETO DO PROGRAMA

O Programa de Indicação Borda Pro tem como objetivo remunerar participantes que indicarem novas assinantes pagantes para a Borda Pro, conforme as condições previstas neste termo.

A participação no programa não gera vínculo empregatício, societário, comercial exclusivo, representação comercial, franquia, mandato, agência ou qualquer forma de subordinação entre a participante e a Borda Pro.

2. PARTICIPANTE

Poderão participar do programa pessoas físicas maiores de 18 anos, com CPF regular, chave Pix válida e dados cadastrais completos.

Pessoas jurídicas também poderão participar, desde que apresentem os dados cadastrais e fiscais exigidos pela Borda Pro.

A Borda Pro poderá recusar, suspender ou encerrar a participação de qualquer pessoa em caso de dados incompletos, inconsistentes, suspeita de fraude, uso indevido da marca ou descumprimento das regras deste termo.

3. INDICAÇÃO VÁLIDA

Considera-se indicação válida a pessoa que:

(a) acessar a Borda Pro por meio do link exclusivo da participante;

(b) realizar a assinatura paga da Borda Pro;

(c) ter o pagamento da primeira fatura confirmado;

(d) permanecer ativa, pagante e adimplente por, no mínimo, 60 dias após a confirmação do pagamento da primeira fatura.

Indicações em período gratuito, teste, cortesia, inadimplência, reembolso, chargeback, contestação, cancelamento ou fraude não serão consideradas válidas para fins de comissão.

4. ATRIBUIÇÃO DA INDICAÇÃO

A indicação será atribuída com base nos critérios técnicos definidos pela Borda Pro, incluindo link exclusivo, identificação do cadastro, rastreamento disponível, prazo de atribuição e validação antifraude.

Caso a mesma pessoa seja indicada por mais de uma participante, a Borda Pro poderá definir a atribuição com base no primeiro link válido identificado, no último link válido identificado ou em outro critério técnico adotado internamente.

Em caso de conflito, erro técnico, duplicidade, uso de múltiplos links, suspeita de manipulação ou impossibilidade de comprovar a origem da indicação, a Borda Pro poderá revisar, negar ou cancelar a comissão.

5. COMISSÃO

A participante fará jus a uma comissão equivalente a 30% do valor mensal efetivamente pago pela assinante indicada à Borda Pro, enquanto a indicada permanecer cliente pagante, ativa e adimplente.

Considerando o plano mensal vigente de R$ 49,90, a comissão corresponde atualmente a R$ 14,97 por mês por indicada ativa.

O valor da comissão poderá variar em caso de alteração de preço, troca de plano, cupom, desconto, promoção, inadimplência, reembolso, cancelamento, chargeback ou mudança comercial da assinatura.

A comissão será calculada somente sobre valores efetivamente recebidos pela Borda Pro, excluídos valores não pagos, estornados, reembolsados, contestados, concedidos em desconto ou cancelados.

6. LIBERAÇÃO DA PRIMEIRA COMISSÃO

A comissão referente à primeira fatura da assinante indicada somente será considerada aprovada após o prazo mínimo de 60 dias contados da confirmação do pagamento da primeira fatura.

Caso a assinante indicada cancele, solicite reembolso, fique inadimplente, conteste o pagamento ou realize chargeback dentro desse prazo, a comissão correspondente será cancelada.

7. COMISSÕES RECORRENTES

Após a aprovação da primeira comissão, a participante poderá continuar recebendo comissões mensais enquanto a assinante indicada permanecer ativa, pagante e adimplente na Borda Pro.

As comissões recorrentes não constituem direito adquirido permanente e dependem da manutenção da assinatura da indicada, da continuidade do programa e do cumprimento das regras deste termo.

Caso a indicada cancele a assinatura, deixe de pagar, solicite reembolso, realize chargeback ou seja removida da base da Borda Pro por qualquer motivo, as comissões futuras vinculadas a essa indicada serão encerradas.

8. REVERSÃO, REEMBOLSO E CHARGEBACK

Em caso de reembolso, cancelamento, inadimplência, chargeback, fraude, contestação ou pagamento indevido, a Borda Pro poderá cancelar comissões ainda não pagas, suspender comissões futuras ou compensar valores pagos indevidamente em ciclos posteriores.

A Borda Pro poderá realizar auditoria das indicações a qualquer momento, especialmente em caso de comportamento atípico, volume incomum de indicações, suspeita de autoindicação, uso de dados falsos ou tentativa de manipulação do programa.

9. PAGAMENTO DAS COMISSÕES

As comissões aprovadas serão pagas mensalmente, preferencialmente até o dia 14 de cada mês, via Pix, para chave de titularidade da participante cadastrada no programa.

O pagamento somente será realizado quando a participante possuir saldo mínimo aprovado de R$ 50,00.

Caso o saldo aprovado seja inferior a R$ 50,00, o valor permanecerá acumulado para ciclos seguintes, sem correção monetária, até atingir o saldo mínimo de pagamento.

A Borda Pro poderá estabelecer limite operacional mensal de pagamento por participante. Valores aprovados que excederem eventual limite operacional poderão ser acumulados para ciclos seguintes, sem correção monetária.

O pagamento dependerá da regularidade cadastral, fiscal e documental da participante.

10. DADOS NECESSÁRIOS PARA PAGAMENTO

Para receber as comissões, a participante deverá informar corretamente os dados solicitados pela Borda Pro, incluindo, quando aplicável:

(a) nome completo ou razão social;

(b) CPF ou CNPJ;

(c) e-mail;

(d) telefone;

(e) chave Pix de titularidade da participante;

(f) dados bancários, se necessário;

(g) endereço;

(h) demais informações fiscais ou cadastrais exigidas pela Borda Pro.

A Borda Pro poderá suspender pagamentos caso os dados estejam incompletos, incorretos, inconsistentes, desatualizados ou vinculados a terceiros.

11. TRIBUTOS, RECIBOS E DOCUMENTAÇÃO FISCAL

As comissões serão pagas líquidas das retenções tributárias, previdenciárias ou legais eventualmente aplicáveis, conforme a natureza do pagamento, o cadastro da participante, o valor devido e a legislação vigente.

Para participantes pessoas físicas, a Borda Pro poderá emitir recibo, RPA, demonstrativo de pagamento ou documento equivalente, conforme orientação contábil e fiscal.

Para participantes pessoas jurídicas, a Borda Pro poderá exigir a emissão de nota fiscal de serviços válida como condição para pagamento das comissões.

A Borda Pro poderá exigir documentação fiscal adicional, atualização cadastral, comprovação de titularidade da chave Pix, regularização de CPF/CNPJ ou adequação cadastral como condição para liberação de novos pagamentos.

Caso a participante pessoa física passe a apresentar volume recorrente elevado de comissões, a Borda Pro poderá solicitar adequação fiscal, emissão de documentação complementar ou migração para recebimento como pessoa jurídica, conforme orientação contábil.

12. AUTOINDICAÇÃO

É proibido indicar a si mesma, utilizar contas próprias, criar assinaturas em nome próprio, utilizar o próprio CPF, e-mail, cartão, Pix, dispositivo, endereço ou qualquer dado pessoal com o objetivo de gerar comissão artificial.

Também é proibido indicar familiares próximos, terceiros fictícios, contas duplicadas ou qualquer pessoa cadastrada apenas com a finalidade de manipular o programa.

A violação desta cláusula poderá resultar em bloqueio imediato da participante, cancelamento das comissões, exclusão definitiva do programa e compensação de valores pagos indevidamente.

13. CONDUTAS PROIBIDAS

A participante não poderá:

(a) prometer resultados não garantidos pela Borda Pro;

(b) falar em nome da Borda Pro sem autorização;

(c) conceder descontos, bônus ou condições comerciais não autorizadas;

(d) utilizar anúncios pagos com a marca Borda Pro sem autorização expressa;

(e) praticar spam, envio abusivo de mensagens ou abordagem invasiva;

(f) usar dados falsos, perfis falsos ou contas de terceiros;

(g) copiar páginas, identidade visual, materiais, anúncios ou conteúdos da Borda Pro sem autorização;

(h) associar a Borda Pro a promessas enganosas, ilegais, ofensivas ou incompatíveis com a marca;

(i) praticar qualquer conduta que prejudique a reputação, operação ou clientes da Borda Pro.

14. USO DA MARCA BORDA PRO

A participante poderá divulgar seu link de indicação de forma ética e compatível com as regras do programa.

O uso do nome, marca, logotipo, imagens, materiais, prints, vídeos, páginas, promessas comerciais ou identidade visual da Borda Pro dependerá de autorização prévia, salvo materiais oficialmente disponibilizados pela Borda Pro para divulgação do programa.

A participante não poderá criar páginas, perfis, grupos, anúncios, domínios, materiais ou comunicações que levem o público a acreditar que são canais oficiais da Borda Pro.

15. AUSÊNCIA DE REPRESENTAÇÃO

A participante atua de forma independente e não possui poderes para representar a Borda Pro, assumir obrigações, negociar contratos, alterar preços, conceder descontos, prometer funcionalidades, realizar suporte oficial ou tomar decisões em nome da empresa.

Qualquer promessa, garantia, oferta ou condição criada pela participante sem autorização expressa será de responsabilidade exclusiva da participante.

16. PROTEÇÃO DE DADOS

A participante deverá respeitar a privacidade e a proteção de dados das pessoas indicadas, comprometendo-se a não coletar, utilizar, compartilhar ou tratar dados pessoais de forma irregular.

A participante não poderá inserir dados de terceiros sem autorização, cadastrar pessoas sem consentimento ou utilizar listas de contatos obtidas de forma irregular.

A Borda Pro tratará os dados das participantes e indicadas conforme sua Política de Privacidade e a legislação aplicável de proteção de dados.

17. SUSPENSÃO OU CANCELAMENTO DA PARTICIPAÇÃO

A Borda Pro poderá suspender, bloquear ou cancelar a participação da participante no programa, com ou sem aviso prévio, em caso de:

(a) descumprimento deste termo;

(b) suspeita de fraude;

(c) autoindicação;

(d) manipulação de links ou cadastros;

(e) uso indevido da marca;

(f) conduta abusiva ou prejudicial à Borda Pro;

(g) inconsistência cadastral ou fiscal;

(h) tentativa de obter comissões indevidas;

(i) violação de leis, regulamentos ou direitos de terceiros.

Nesses casos, a Borda Pro poderá cancelar comissões pendentes, suspender pagamentos e compensar valores pagos indevidamente.

18. ALTERAÇÃO DO PROGRAMA

A Borda Pro poderá alterar regras, percentuais, prazos, critérios de validação, forma de pagamento, valor mínimo de saque, condições fiscais ou demais características do programa mediante aviso prévio de 30 dias.

Alterações poderão ser aplicadas imediatamente em caso de exigência legal, determinação de autoridade competente, risco fiscal, risco operacional, fraude, abuso ou necessidade de proteção da Borda Pro e de suas clientes.

19. ENCERRAMENTO DO PROGRAMA

A Borda Pro poderá suspender ou encerrar o Programa de Indicação mediante aviso prévio de 30 dias.

Comissões já aprovadas até a data de encerramento serão preservadas, desde que cumpridas as regras deste termo e a documentação cadastral e fiscal da participante esteja regular.

Comissões futuras, ainda não aprovadas ou vinculadas a períodos posteriores ao encerramento do programa poderão deixar de ser geradas.

20. COMUNICAÇÕES

As comunicações relacionadas ao programa poderão ser realizadas por e-mail, WhatsApp, área de membros, painel da participante ou outro canal informado pela Borda Pro.

A participante é responsável por manter seus dados de contato atualizados.

21. ACEITE

Ao participar do Programa de Indicação Borda Pro, cadastrar-se, divulgar seu link ou receber comissões, a participante declara que leu, compreendeu e aceitou integralmente este termo.

Este termo entra em vigor na data de aceite da participante ou na data de início de sua participação no programa, o que ocorrer primeiro.`;

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
