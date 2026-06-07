import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections: { h: string; p: string[] }[] = [
  {
    h: "1. Aceitação dos termos",
    p: [
      "Ao criar uma conta, assinar ou usar o Borda Pro, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.",
    ],
  },
  {
    h: "2. O que é o Borda Pro",
    p: [
      "O Borda Pro é um serviço de assinatura que dá acesso a uma biblioteca de matrizes de bordado e a ferramentas de apoio à produção e à venda (como calculadora de lucro, gerador de textos de venda, tendências e catálogos).",
      "O acervo está sempre em crescimento. Não garantimos uma quantidade fixa de matrizes nem uma cadência fixa de novas adições.",
    ],
  },
  {
    h: "3. Cadastro e conta",
    p: [
      "Você é responsável por fornecer informações verídicas e por manter a confidencialidade do seu acesso. A conta é pessoal e intransferível.",
    ],
  },
  {
    h: "4. Planos, pagamento e renovação",
    p: [
      "Oferecemos dois planos: Mensal (R$ 49,90/mês) e Anual (R$ 397/ano). O pagamento é processado pela plataforma Eduzz. A assinatura é renovada automaticamente até que você cancele.",
      "Eventuais reajustes de preço serão comunicados com antecedência e não afetam o ciclo já pago.",
    ],
  },
  {
    h: "5. Garantia e reembolso",
    p: [
      "Você tem 7 dias, a partir da compra, para solicitar reembolso de 100% do valor, sem necessidade de justificativa. Após esse prazo, não há reembolso do período em curso.",
    ],
  },
  {
    h: "6. Cancelamento",
    p: [
      "Você pode cancelar a qualquer momento, sem burocracia e sem taxa de cancelamento. O acesso permanece ativo até o fim do período já pago.",
    ],
  },
  {
    h: "7. Licença de uso das matrizes",
    p: [
      "Enquanto sua assinatura estiver ativa, você recebe uma licença pessoal e limitada para baixar as matrizes e utilizá-las na produção de peças bordadas, inclusive para venda das peças finais.",
      "É proibido revender, redistribuir, compartilhar, sublicenciar ou disponibilizar os arquivos das matrizes (na forma original ou modificada) a terceiros.",
    ],
  },
  {
    h: "8. Propriedade intelectual",
    p: [
      "Todo o conteúdo da plataforma — matrizes, marca, textos, layout e ferramentas — é protegido e pertence ao Borda Pro ou a seus licenciantes. A assinatura não transfere a titularidade desse conteúdo.",
    ],
  },
  {
    h: "9. Conduta do usuário",
    p: [
      "Você concorda em não tentar burlar o controle de acesso, não compartilhar credenciais e não usar o serviço para fins ilícitos ou que violem direitos de terceiros.",
    ],
  },
  {
    h: "10. Limitação de responsabilidade",
    p: [
      "O serviço é fornecido no estado em que se encontra. Não nos responsabilizamos por resultados comerciais individuais nem por indisponibilidades temporárias decorrentes de manutenção ou de terceiros (como provedores de pagamento e infraestrutura).",
    ],
  },
  {
    h: "11. Alterações nos termos",
    p: [
      "Podemos atualizar estes Termos a qualquer momento. Mudanças relevantes serão comunicadas. O uso continuado após a atualização significa concordância com a nova versão.",
    ],
  },
  {
    h: "12. Contato e foro",
    p: [
      "Dúvidas sobre estes Termos podem ser enviadas ao nosso suporte (contato a ser divulgado). Fica eleito o foro da comarca a ser definido para dirimir questões oriundas destes Termos.",
    ],
  },
];

const Termos = () => {
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
          <h1 className="text-3xl md:text-4xl font-display font-bold">Termos de Uso</h1>
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
          Documento preliminar. Razão social, CNPJ, canal de contato e foro definitivos serão preenchidos em breve.
        </p>
      </main>
    </div>
  );
};

export default Termos;
