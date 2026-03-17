import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check, Download, Zap, Heart, Shield, Star, ChevronRight,
  Monitor, Library, ArrowDown, MessageCircle, HelpCircle, XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo-horizontal.png";
import heroImg from "@/assets/hero-embroidery.jpg";

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoHorizontal} alt="Borda Pro" className="h-8" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Entrar
            </Button>
            <Button size="sm" onClick={scrollToPricing} className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Assinar
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center relative z-10">
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
              Novo jeito de bordar
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight">
              O Netflix das{" "}
              <span className="text-gradient-brand">Matrizes de Bordado</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
              Baixe matrizes prontas para a sua máquina, sem erro de formato e sem complicação.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Button
                size="lg"
                onClick={scrollToPricing}
                className="text-base py-6 px-8 gap-2 shadow-lg shadow-primary/20"
              >
                <Zap className="h-5 w-5" />
                Quero acessar agora
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/login")}
                className="text-base py-6 px-8"
              >
                Já sou assinante
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/30">
              <img
                src={heroImg}
                alt="Bordado artesanal"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card border border-border/50 rounded-xl p-3 shadow-lg flex items-center gap-2.5 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">+500 matrizes</p>
                <p className="text-[10px] text-muted-foreground">prontas para download</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-muted/30 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center space-y-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            Você já passou por isso?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: XCircle, text: "Já baixou matriz errada e perdeu tempo?" },
              { icon: HelpCircle, text: "Sua máquina não leu o arquivo?" },
              { icon: MessageCircle, text: "Perde tempo testando formato por formato?" },
            ].map(({ icon: Icon, text }) => (
              <Card key={text} className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6 pb-5 text-center space-y-3">
                  <Icon className="h-8 w-8 text-destructive/70 mx-auto" />
                  <p className="text-sm font-medium text-foreground/80">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="max-w-xl mx-auto rounded-2xl bg-primary/5 border border-primary/20 p-6">
            <p className="text-base md:text-lg font-semibold text-primary">
              No Borda Pro você só vê matrizes que funcionam na sua máquina.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-10">
          Tudo o que você precisa, <span className="text-gradient-brand">num só lugar</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Library, title: "Biblioteca completa", desc: "Centenas de matrizes organizadas por categoria" },
            { icon: Monitor, title: "Compatível com sua máquina", desc: "Filtragem automática por formato e bastidor" },
            { icon: Zap, title: "Novas toda semana", desc: "Conteúdo atualizado constantemente" },
            { icon: Download, title: "Download imediato", desc: "Baixe e borde na hora, sem espera" },
            { icon: Shield, title: "Sem erro de formato", desc: "Só aparece o que funciona na sua máquina" },
            { icon: Heart, title: "Sem dor de cabeça", desc: "Interface simples feita para bordadeiras" },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="group hover:border-primary/30 hover:shadow-md transition-all">
              <CardContent className="pt-6 pb-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center space-y-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            Como funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Escolha sua máquina", desc: "Informe o modelo e bastidor no cadastro" },
              { step: "2", title: "Acesse a biblioteca", desc: "Veja apenas matrizes compatíveis" },
              { step: "3", title: "Baixe e borde", desc: "Download direto, sem erro de formato" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                  {step}
                </div>
                <h3 className="font-display font-bold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center space-y-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold">
          O que dizem nossas <span className="text-gradient-brand">bordadeiras</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: "Maria C.", text: "Facilitou demais minha vida, agora só baixo e bordo!" },
            { name: "Ana P.", text: "Não erro mais o formato, funciona sempre. Recomendo!" },
          ].map(({ name, text }) => (
            <Card key={name} className="border-primary/10">
              <CardContent className="pt-6 pb-5 space-y-3">
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm italic text-foreground/80">"{text}"</p>
                <p className="text-xs font-semibold text-muted-foreground">— {name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="bg-gradient-to-b from-primary/5 to-transparent border-t border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              Escolha seu plano e <span className="text-gradient-brand">comece agora</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Acesse todas as matrizes prontas para sua máquina.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                name: "Mensal",
                price: "R$ 79,90",
                period: "/mês",
                url: "https://chk.eduzz.com/E0D6ON5691",
                features: ["Biblioteca completa", "Downloads ilimitados", "Gerador de vendas com IA", "Catálogos personalizados"],
              },
              {
                name: "Anual",
                price: "R$ 597",
                period: "/ano",
                subtitle: "equivalente a R$ 49,75/mês",
                url: "https://chk.eduzz.com/G961DZBEW1",
                popular: true,
                savings: "Economia de R$ 361,80",
                features: ["Tudo do Mensal", "Prioridade em novos designs", "Suporte prioritário", "Desconto de 38%"],
              },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden transition-all ${
                  plan.popular
                    ? "border-primary/60 border-2 shadow-xl shadow-primary/10 md:scale-105"
                    : "border-border/50"
                }`}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground text-center text-xs font-bold py-2">
                    <Star className="h-3 w-3 inline mr-1" />
                    MAIS POPULAR — {plan.savings}
                  </div>
                )}
                <CardContent className={`space-y-6 ${plan.popular ? "pt-8" : "pt-8"} pb-8 px-7`}>
                  <div>
                    <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-3xl font-bold text-gradient-brand">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {plan.subtitle && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic">{plan.subtitle}</p>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full py-6 text-sm font-semibold ${
                      plan.popular ? "shadow-lg shadow-primary/20" : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => window.open(plan.url, "_blank")}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Assinar {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center space-y-2">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Checkout seguro via Eduzz</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Garantia de 7 dias</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold">
          Pronta para bordar sem complicação?
        </h2>
        <Button
          size="lg"
          onClick={scrollToPricing}
          className="text-base py-6 px-10 gap-2 shadow-lg shadow-primary/20"
        >
          Começar agora
          <ChevronRight className="h-5 w-5" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoHorizontal} alt="Borda Pro" className="h-6 opacity-60" />
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
          </div>
          <p className="text-[11px] text-muted-foreground/50">Feito com ❤️ por G Bordados</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
