import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections: { h: string; p: string[] }[] = [
  {
    h: "1. Quem somos",
    p: [
      "O Borda Pro é o serviço de assinatura de matrizes de bordado e ferramentas para bordadeiras. Esta Política explica como tratamos os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).",
      "A razão social e os dados completos do controlador serão divulgados em breve.",
    ],
  },
  {
    h: "2. Dados que coletamos",
    p: [
      "Dados de cadastro: nome e e-mail.",
      "Dados de uso: matrizes baixadas, favoritos e interações com as ferramentas, para melhorar o serviço.",
      "Dados de pagamento: processados diretamente pela Eduzz. Não armazenamos números de cartão de crédito em nossos servidores.",
    ],
  },
  {
    h: "3. Como usamos os seus dados",
    p: [
      "Para fornecer e manter o acesso à plataforma, processar sua assinatura, oferecer suporte, enviar comunicações relacionadas à conta e aprimorar o serviço.",
    ],
  },
  {
    h: "4. Base legal",
    p: [
      "Tratamos seus dados com base na execução do contrato de assinatura, no cumprimento de obrigações legais, no legítimo interesse de melhorar o serviço e, quando aplicável, no seu consentimento.",
    ],
  },
  {
    h: "5. Compartilhamento",
    p: [
      "Compartilhamos dados apenas com prestadores necessários à operação: Eduzz (processamento de pagamentos), Supabase (infraestrutura e armazenamento) e provedores de envio de e-mail.",
      "Não vendemos seus dados pessoais.",
    ],
  },
  {
    h: "6. Cookies",
    p: [
      "Usamos cookies e tecnologias semelhantes essenciais para autenticação e funcionamento da plataforma, além de medições básicas de uso.",
    ],
  },
  {
    h: "7. Retenção",
    p: [
      "Mantemos seus dados enquanto sua conta estiver ativa e pelo período necessário para cumprir obrigações legais. Após isso, os dados são excluídos ou anonimizados.",
    ],
  },
  {
    h: "8. Seus direitos (LGPD)",
    p: [
      "Você pode solicitar, a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização, portabilidade, eliminação e revogação do consentimento, conforme o art. 18 da LGPD.",
      "Para exercer esses direitos, entre em contato pelo nosso canal de suporte.",
    ],
  },
  {
    h: "9. Segurança",
    p: [
      "Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo controle de acesso e armazenamento em infraestrutura com criptografia em trânsito.",
    ],
  },
  {
    h: "10. Encarregado e contato",
    p: [
      "O canal para tratar de assuntos de privacidade e o encarregado pelo tratamento de dados (DPO) serão divulgados em breve.",
    ],
  },
  {
    h: "11. Alterações",
    p: [
      "Podemos atualizar esta Política periodicamente. A data da última atualização sempre constará no topo desta página.",
    ],
  },
];

const Privacidade = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[hsl(var(--landing-warm))] text-foreground">
      <header className="border-b border-border/30 sticky top-0 bg-[hsl(var(--landing-warm))]/90 backdrop-blur-lg z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="shrink-0" aria-label="Voltar ao site">
            <img src="/lockup-indigo.png" alt="Borda Pro" className="h-9 w-auto" />
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-foreground/70 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 7 de junho de 2026</p>
        </div>

        {sections.map(({ h, p }) => (
          <section key={h} className="space-y-2">
            <h2 className="text-lg font-display font-bold">{h}</h2>
            {p.map((text, i) => (
              <p key={i} className="text-sm text-foreground/80 leading-relaxed">{text}</p>
            ))}
          </section>
        ))}

        <p className="text-xs text-muted-foreground pt-6 border-t border-border/30 leading-relaxed">
          Documento preliminar. Dados do controlador, encarregado (DPO) e canal de contato definitivos serão preenchidos em breve.
        </p>
      </main>
    </div>
  );
};

export default Privacidade;
