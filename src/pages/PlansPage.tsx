import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Star, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

const CHECKOUT_MENSAL = "https://chk.eduzz.com/E0D6ON5691";
const CHECKOUT_ANUAL = "https://chk.eduzz.com/G961DZBEW1";

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
    subtitle: "equivalente a R$ 49,75/mês",
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

const PlansPage = () => {
  const { user, subscription, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshSubscription = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      // Re-fetch subscription from DB
      const { data } = await db
        .from("subscriptions")
        .select("id, plan_code, status, access_expires_at, provider")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.status === "active" && data?.access_expires_at && new Date(data.access_expires_at) > new Date()) {
        // Subscription is now active — reload the page to let ProtectedRoute pass
        window.location.href = "/dashboard";
        return;
      }
    } catch {
      // ignore
    }
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
        {/* Blocked notice */}
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold text-sm">Acesso bloqueado</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Seu acesso ainda não está ativo. Assine para desbloquear todas as matrizes.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshSubscription}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Verificando..." : "Já paguei — verificar"}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 text-primary text-sm font-semibold">
            <img src="/symbol-indigo.png" alt="Borda Pro" className="h-5 w-auto" />
            Borda Pro Studio
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">
            Acesse todas as matrizes <br className="hidden md:block" />
            <span className="text-gradient-brand">prontas para sua máquina</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Escolha seu plano e comece a bordar hoje mesmo.
          </p>
        </div>

        {/* Bullet points */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-foreground/80">
          {[
            "Biblioteca completa",
            "Novas matrizes toda semana",
            "Compatível com sua máquina",
            "Sem erro de formato",
          ].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {item}
            </span>
          ))}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan_code === plan.id && subscription?.status === "active";
            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 ${
                  plan.popular
                    ? "border-primary/60 border-2 shadow-xl shadow-primary/10 scale-[1.02] md:scale-105"
                    : "border-border/50 hover:border-primary/30 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-center text-xs font-bold py-2 tracking-wide">
                    <Star className="h-3 w-3 inline mr-1 -mt-0.5" />
                    MAIS POPULAR — {plan.savings}
                  </div>
                )}
                <CardContent className={`space-y-7 ${plan.popular ? "pt-14" : "pt-8"} pb-8 px-7`}>
                  <div>
                    <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                    <div className="flex items-baseline gap-1.5 mt-3">
                      <span className="text-4xl font-bold text-gradient-brand">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {plan.subtitle && (
                      <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{plan.subtitle}</p>
                    )}
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  <ul className="space-y-3.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Badge variant="outline" className="w-full justify-center py-3 text-sm font-semibold">
                      ✓ Seu plano atual
                    </Badge>
                  ) : (
                    <Button
                      className={`w-full py-6 text-sm font-semibold shadow-md ${
                        plan.popular
                          ? "bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-primary/25"
                          : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => window.open(plan.checkoutUrl, "_blank")}
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

        {/* Trust */}
        <div className="text-center space-y-3 pb-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Checkout seguro via Eduzz</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Garantia de 7 dias</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
