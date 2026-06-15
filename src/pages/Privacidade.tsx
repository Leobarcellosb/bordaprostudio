import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Política de privacidade completa (LGPD). Pública — usada também como
// Privacy Policy URL no Google Cloud e no Facebook Login.

type Block =
  | { t: "p"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] };

const intro = [
  "Oi! Aqui no Borda Pro a gente leva sua privacidade a sério. Esta página explica, em português direto, quais dados a gente coleta, como usa, com quem compartilha e quais são seus direitos.",
  "Se ficar com qualquer dúvida, manda email pra contato@borda.pro que a gente responde.",
];

const sections: { h: string; blocks: Block[] }[] = [
  {
    h: "Quem somos",
    blocks: [
      { t: "p", text: "O Borda Pro é uma plataforma de matrizes de bordado operada por G Bordados (CNPJ 41.312.751/0001-20), com sede no Brasil. A gente atende principalmente bordadeiras e bordadeiros que querem encontrar matrizes prontas, calcular preços de encomenda e organizar o trabalho." },
      { t: "p", text: "Para fins desta política, “nós”, “Borda Pro” ou “a gente” se referem a essa empresa. “Você” é qualquer pessoa que usa a plataforma." },
    ],
  },
  {
    h: "Quais dados a gente coleta",
    blocks: [
      { t: "h3", text: "Dados que você nos dá diretamente" },
      { t: "ul", items: [
        "Cadastro: nome, email, telefone (quando informado).",
        "Autenticação: senha (armazenada criptografada — a gente nunca consegue ver sua senha real) ou identificadores de login social (Google, Facebook).",
        "Programa de afiliados (opcional): se você participa, coletamos CPF, endereço completo, chave Pix e nome do titular para pagamento de comissões e emissão de RPA (Recibo de Pagamento a Autônomo).",
        "Pagamento: processado pela Eduzz (parceira). A gente recebe apenas confirmação da transação — dados de cartão ficam só com a Eduzz.",
        "Comunicação: quando você fala com a gente por email, WhatsApp ou formulário de contato.",
      ] },
      { t: "h3", text: "Dados coletados automaticamente" },
      { t: "ul", items: [
        "Uso da plataforma: quais matrizes você baixou, favoritou, visualizou.",
        "Dispositivo: tipo de aparelho, navegador, sistema operacional.",
        "Logs técnicos: endereço IP, data e hora de acesso (para segurança e prevenção de fraude).",
        "Cookies: essenciais para manter você logada e analíticos para entender como melhorar a plataforma.",
      ] },
    ],
  },
  {
    h: "Como a gente usa seus dados",
    blocks: [
      { t: "ul", items: [
        "Operar o serviço: liberar acesso às matrizes, processar pagamentos, manter sua conta funcionando.",
        "Atendimento: responder dúvidas, enviar avisos importantes sobre sua conta (cobrança, trial, mudanças no serviço).",
        "Comunicação: mandar novidades sobre o produto via email ou WhatsApp (você pode descadastrar a qualquer momento).",
        "Programa de afiliados: calcular comissões, processar pagamentos via Pix, emitir RPA, cumprir obrigações fiscais.",
        "Melhorar o produto: entender quais matrizes são mais usadas, quais ferramentas valem desenvolver.",
        "Segurança: detectar uso indevido, fraude, autoindicação no programa de afiliados.",
        "Obrigações legais: atender requisições de autoridades quando exigido por lei.",
      ] },
    ],
  },
  {
    h: "Com quem a gente compartilha",
    blocks: [
      { t: "p", text: "A gente NÃO vende seus dados. Compartilhamos apenas com parceiros essenciais pra operação:" },
      { t: "ul", items: [
        "Supabase — infraestrutura de banco de dados e autenticação.",
        "Vercel — hospedagem do site.",
        "Eduzz — processamento de pagamentos.",
        "Resend — envio de emails transacionais.",
        "ManyChat — comunicação via WhatsApp (quando você opta por receber).",
        "Google e Facebook — apenas quando você escolhe login social. Eles recebem só seu email e nome de exibição.",
      ] },
      { t: "p", text: "Esses parceiros têm acesso restrito ao mínimo necessário pra cumprir suas funções, e estão sujeitos a suas próprias políticas de privacidade." },
    ],
  },
  {
    h: "Seus direitos (LGPD)",
    blocks: [
      { t: "p", text: "A Lei Geral de Proteção de Dados (LGPD) garante a você:" },
      { t: "ul", items: [
        "Acesso: saber quais dados a gente tem sobre você.",
        "Correção: pedir pra corrigir dado errado ou desatualizado.",
        "Exclusão: apagar sua conta e dados (alguns registros financeiros precisam ser mantidos por exigência fiscal — explicamos caso a caso).",
        "Portabilidade: receber seus dados em formato estruturado.",
        "Revogação de consentimento: parar de receber comunicações.",
        "Reclamação: entrar em contato com a Autoridade Nacional de Proteção de Dados (ANPD) se achar que estamos errando.",
      ] },
      { t: "p", text: "Pra exercer qualquer direito, manda email pra contato@borda.pro. Respondemos em até 15 dias." },
    ],
  },
  {
    h: "Por quanto tempo guardamos seus dados",
    blocks: [
      { t: "ul", items: [
        "Conta ativa: enquanto você usa o Borda Pro.",
        "Após cancelamento: 90 dias para conta zumbi (caso você volte) e depois exclusão completa, exceto dados financeiros (notas fiscais, comissões, pagamentos), mantidos por 5 anos por obrigação fiscal, e logs de segurança, mantidos por 6 meses.",
        "Comunicações de marketing: até você descadastrar.",
      ] },
    ],
  },
  {
    h: "Segurança",
    blocks: [
      { t: "p", text: "A gente usa:" },
      { t: "ul", items: [
        "Criptografia em trânsito (HTTPS em todas as páginas).",
        "Senhas armazenadas com hash (a gente literalmente não consegue ler a sua).",
        "Acesso restrito por funcionários (só quem precisa, quando precisa).",
        "Detecção de fraude no programa de afiliados (mesmo CPF, IPs duplicados, etc).",
      ] },
      { t: "p", text: "Nenhum sistema é 100% seguro, mas a gente faz o possível pra proteger seus dados." },
    ],
  },
  {
    h: "Crianças",
    blocks: [
      { t: "p", text: "O Borda Pro não é destinado a menores de 18 anos. Se descobrirmos que coletamos dados de menor sem consentimento dos responsáveis, apagamos imediatamente." },
    ],
  },
  {
    h: "Mudanças nesta política",
    blocks: [
      { t: "p", text: "Se a gente mudar algo importante aqui, avisa por email com pelo menos 15 dias de antecedência. Mudanças menores (correções de português, links atualizados) podem ser feitas sem aviso." },
      { t: "p", text: "A data no topo desta página mostra quando ela foi atualizada pela última vez." },
    ],
  },
  {
    h: "Contato",
    blocks: [
      { t: "ul", items: [
        "Email: contato@borda.pro",
        "Empresa: G Bordados (CNPJ 41.312.751/0001-20)",
        "Encarregado pelo tratamento de dados (DPO): contato@borda.pro",
      ] },
      { t: "p", text: "Pra perguntas legais, manda email com assunto “Privacidade” que a gente encaminha pro lugar certo." },
    ],
  },
];

const Privacidade = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[hsl(var(--landing-warm))] text-foreground">
      <header className="border-b border-border/30 sticky top-0 bg-[hsl(var(--landing-warm))]/90 backdrop-blur-lg z-10">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="shrink-0" aria-label="Voltar ao site">
            <img src="/lockup-indigo.png" alt="Borda Pro" className="h-9 w-auto" />
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-foreground/70 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar pra home
          </Button>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold">Política de Privacidade — Borda Pro</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 13 de junho de 2026</p>
        </div>

        {intro.map((text, i) => (
          <p key={`intro-${i}`} className="text-[15px] text-foreground/80 leading-relaxed">{text}</p>
        ))}

        {sections.map(({ h, blocks }) => (
          <section key={h} className="space-y-3">
            <h2 className="text-xl font-display font-bold pt-2">{h}</h2>
            {blocks.map((b, i) => {
              if (b.t === "h3") return <h3 key={i} className="text-base font-semibold text-foreground/90 pt-1">{b.text}</h3>;
              if (b.t === "ul") return (
                <ul key={i} className="list-disc pl-5 space-y-1.5 text-[15px] text-foreground/80 leading-relaxed">
                  {b.items.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              );
              return <p key={i} className="text-[15px] text-foreground/80 leading-relaxed">{b.text}</p>;
            })}
          </section>
        ))}

        <footer className="pt-8 mt-4 border-t border-border/30 text-xs text-muted-foreground space-y-1">
          <p>Esta política foi escrita pra ser entendida por pessoa, não por advogado.</p>
          <p>© 2026 G Bordados — CNPJ 41.312.751/0001-20.</p>
        </footer>
      </main>
    </div>
  );
};

export default Privacidade;
