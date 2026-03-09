import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CHECKOUT_MENSAL = import.meta.env.VITE_EDUZZ_CHECKOUT_MENSAL_URL || "#";
const CHECKOUT_ANUAL = import.meta.env.VITE_EDUZZ_CHECKOUT_ANUAL_URL || "#";

const plans = [
  {
    id: "mensal",
    name: "Mensal",
    price: "R$ 79,90",
    period: "/mês",
    checkoutUrl: CHECKOUT_MENSAL,
    features: [
      "Biblioteca completa de designs",
      "Downloads ilimitados",
      "Gerador de vendas com IA",
      "Simulador de mockup",
      "Catálogos personalizados",
      "Calculadora de lucro",
      "Tendências de mercado",
    ],
    cta: "Assinar Mensal",
  },
  {
    id: "anual",
    name: "Anual",
    price: "R$ 597",
    period: "/ano",
    checkoutUrl: CHECKOUT_ANUAL,
    popular: true,
    savings: "Economia de R$ 361,80",
    features: [
      "Tudo do plano Mensal",
      "Prioridade em novos designs",
      "Suporte prioritário",
      "Acesso antecipado a recursos",
      "Desconto de 38%",
    ],
    cta: "Assinar Anual",
  },
];

const PricingPage = () => {
  const { subscription } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Crown className="h-4 w-4" />
            Planos Borda Pro Studio
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Escolha seu plano
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Acesse toda a biblioteca de bordados, ferramentas exclusivas e atualizações constantes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan_code === plan.id && subscription?.status === "active";
            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-shadow ${
                  plan.popular
                    ? "border-primary border-2 shadow-lg"
                    : "border-border/60"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-bold py-1.5">
                    MAIS POPULAR — {plan.savings}
                  </div>
                )}
                <CardContent className={`space-y-6 ${plan.popular ? "pt-12" : "pt-8"} pb-8`}>
                  <div>
                    <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-bold text-primary">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Badge variant="outline" className="w-full justify-center py-2.5 text-sm">
                      ✓ Plano atual
                    </Badge>
                  ) : (
                    <Button
                      className="w-full py-5 text-sm font-semibold"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => window.open(plan.checkoutUrl, "_blank")}
                      disabled={plan.checkoutUrl === "#"}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {plan.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Pagamento processado com segurança pela Eduzz.</p>
          <p>Cancele quando quiser. Sem taxas de cancelamento.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default PricingPage;
