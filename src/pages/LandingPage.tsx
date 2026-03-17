import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check, Download, Zap, Heart, Star, ChevronRight,
  XCircle, Frown, FolderOpen, AlertTriangle, Sparkles,
  Play, ShieldCheck, Gift, BookOpen, LayoutGrid, RefreshCw,
  MessageCircle, HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo-horizontal.png";
import heroImg from "@/assets/hero-embroidery.jpg";

/* ─── sub-components ─── */

const SectionDivider = () => (
  <div className="w-16 h-1 rounded-full bg-primary/20 mx-auto" />
);

/* ─── page ─── */

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ══════ NAV ══════ */}
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

      {/* ══════ 1. HERO — PROMISE LEAD ══════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center relative z-10">
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight">
              Você nunca mais vai baixar uma{" "}
              <span className="text-gradient-brand">matriz errada</span> na vida.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
              Veja apenas matrizes que funcionam na sua máquina, já organizadas e prontas para bordar.
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
            <p className="text-sm text-muted-foreground/70 flex items-center gap-2 justify-center md:justify-start">
              <Sparkles className="h-4 w-4 text-primary" />
              Mais de milhares de matrizes testadas e organizadas
            </p>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/30">
              <img src={heroImg} alt="Bordado artesanal" className="w-full h-auto object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card border border-border/50 rounded-xl p-3 shadow-lg flex items-center gap-2.5 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">Pronto pra bordar</p>
                <p className="text-[10px] text-muted-foreground">baixe e use na hora</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 2. VSL PLACEHOLDER ══════ */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <div className="aspect-video rounded-2xl bg-muted/50 border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Play className="h-7 w-7 text-primary ml-1" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Vídeo explicando como funciona o Borda Pro</p>
        </div>
      </section>

      {/* ══════ CTA 1 ══════ */}
      <div className="text-center pb-6">
        <Button size="lg" onClick={scrollToPricing} className="text-base py-6 px-10 gap-2 shadow-lg shadow-primary/20">
          <Zap className="h-5 w-5" />
          Quero acessar agora
        </Button>
      </div>

      {/* ══════ 4. LEAD DE COPY — EMOTIONAL ══════ */}
      <section className="bg-muted/30 border-y border-border/30">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 space-y-8 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold leading-snug">
            Se você trabalha com bordado, você sabe como é…
          </h2>
          <div className="space-y-5 text-base md:text-lg text-foreground/80 leading-relaxed max-w-2xl mx-auto text-left md:text-center">
            <p>
              Você baixa uma matriz, coloca na máquina… e simplesmente <strong className="text-foreground">não funciona</strong>.
            </p>
            <p>
              Você perde tempo, perde material, e às vezes até <strong className="text-foreground">perde cliente</strong>.
            </p>
            <p>
              E o pior… <strong className="text-primary">não é culpa sua</strong>.
            </p>
            <p>
              O problema é que hoje tudo vem desorganizado, com formatos misturados, e ninguém explica nada.
            </p>
          </div>

          <SectionDivider />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
            {[
              { icon: XCircle, text: "Baixa uma matriz e a máquina não lê" },
              { icon: Frown, text: "Perde tempo testando formato por formato" },
              { icon: FolderOpen, text: "Arquivo desorganizado, tudo bagunçado" },
              { icon: AlertTriangle, text: "Já perdeu cliente por causa de erro no bordado" },
            ].map(({ icon: Icon, text }) => (
              <Card key={text} className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-5 pb-4 flex items-start gap-3 text-left">
                  <Icon className="h-6 w-6 text-destructive/70 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-foreground/80">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="max-w-xl mx-auto rounded-2xl bg-primary/5 border border-primary/20 p-6 mt-4">
            <p className="text-base md:text-lg font-semibold text-primary">
              Mas existe um jeito muito mais simples de trabalhar.
            </p>
          </div>
        </div>
      </section>

      {/* ══════ 5. THE SOLUTION ══════ */}
      <section className="max-w-3xl mx-auto px-4 py-16 md:py-20 text-center space-y-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold">
          O Borda Pro <span className="text-gradient-brand">resolve isso pra você</span>
        </h2>
        <div className="space-y-4 text-base md:text-lg text-foreground/80 leading-relaxed max-w-2xl mx-auto">
          <p>No Borda Pro, você não precisa mais adivinhar formato.</p>
          <p>Você não precisa testar.</p>
          <p>Você não precisa perder tempo.</p>
          <p>
            Você entra… e já vê <strong className="text-foreground">apenas o que funciona na sua máquina</strong>.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {[
            "As matrizes já vêm no formato da sua máquina",
            "Já organizadas por tema e prontas para usar",
            "Você não precisa testar nada",
            "É só baixar e bordar",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/40">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-foreground/90">{item}</p>
            </div>
          ))}
        </div>
        <p className="inline-block text-lg md:text-xl font-display font-bold text-primary bg-primary/5 border border-primary/20 rounded-2xl px-8 py-4">
          É só escolher, baixar e bordar.
        </p>
      </section>

      {/* ══════ 6. BENEFITS ══════ */}
      <section className="bg-muted/30 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center space-y-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            O que você ganha com o <span className="text-gradient-brand">Borda Pro</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Download, text: "Mais de centenas de matrizes prontas" },
              { icon: FolderOpen, text: "Tudo separado por tema (infantil, floral, nomes…)" },
              { icon: Sparkles, text: "Novas matrizes toda semana" },
              { icon: Check, text: "Compatível com sua máquina automaticamente" },
              { icon: Heart, text: "Sem erro, sem dor de cabeça" },
            ].map(({ icon: Icon, text }) => (
              <Card key={text} className="group hover:border-primary/30 hover:shadow-md transition-all">
                <CardContent className="pt-6 pb-5 flex flex-col items-center text-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="max-w-lg mx-auto rounded-2xl bg-card border border-primary/20 p-5">
            <p className="text-base font-medium text-foreground/80">
              <Heart className="h-4 w-4 text-primary inline mr-1.5 -mt-0.5" />
              Você ganha tempo, evita estresse e trabalha com <strong className="text-foreground">mais confiança</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center space-y-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold">Como funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "1", title: "Você informa sua máquina", desc: "Diz qual modelo e bastidor você usa" },
            { step: "2", title: "A gente mostra só o que funciona nela", desc: "Nada de formato errado ou arquivo incompatível" },
            { step: "3", title: "Você baixa e já pode bordar", desc: "Pronto, sem teste, sem perda de tempo" },
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
      </section>

      {/* ══════ 7. AUTHORITY ══════ */}
      <section className="bg-muted/30 border-y border-border/30">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
            <ShieldCheck className="h-5 w-5 text-primary inline mr-2 -mt-0.5" />
            Esse sistema foi criado por <strong className="text-foreground">quem já vive do bordado</strong> e sabe exatamente as dificuldades do dia a dia.
          </p>
        </div>
      </section>

      {/* ══════ 8. SOCIAL PROOF ══════ */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center space-y-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold">
          Quem usa, <span className="text-gradient-brand">não larga mais</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Maria C.", text: "Depois que comecei a usar, nunca mais errei formato." },
            { name: "Ana P.", text: "Agora minha máquina lê tudo de primeira." },
            { name: "Cláudia R.", text: "Economizo muito tempo no meu dia." },
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

      {/* ══════ 9. WHAT YOU GET ══════ */}
      <section className="bg-muted/30 border-y border-border/30">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 text-center space-y-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            O que você vai ter acesso:
          </h2>
          <div className="space-y-3 max-w-md mx-auto">
            {[
              { icon: BookOpen, text: "Biblioteca completa de matrizes" },
              { icon: Download, text: "Downloads ilimitados" },
              { icon: LayoutGrid, text: "Matrizes organizadas por tema" },
              { icon: RefreshCw, text: "Novos designs toda semana" },
              { icon: Sparkles, text: "Ferramentas para facilitar seu trabalho" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/40 text-left">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 10. BONUS ══════ */}
      <section className="max-w-3xl mx-auto px-4 py-14 text-center space-y-6">
        <h2 className="text-xl md:text-2xl font-display font-bold">
          <Gift className="h-5 w-5 text-primary inline mr-2 -mt-0.5" />
          E você ainda ganha de bônus:
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          {[
            "Catálogos prontos para vender",
            "Sugestões de produtos para bordar",
          ].map((b) => (
            <div key={b} className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Check className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ 11. PRICE ANCHORING + PRICING ══════ */}
      <section id="pricing" className="bg-gradient-to-b from-primary/5 to-transparent border-t border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 space-y-10">
          {/* Anchoring */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <p className="text-base md:text-lg text-foreground/80">
              Se você fosse comprar essas matrizes separadamente, gastaria <strong className="text-foreground">centenas de reais</strong>.
            </p>
            <p className="text-base md:text-lg text-foreground/80">
              Mas aqui você tem acesso a <strong className="text-primary">tudo</strong> por um valor mensal.
            </p>
          </div>

          <SectionDivider />

          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              Comece <span className="text-gradient-brand">hoje mesmo</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              Tenha acesso a todas as matrizes, sem erro e sem complicação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                name: "Mensal",
                price: "R$ 79,90",
                period: "/mês",
                url: "https://chk.eduzz.com/E0D6ON5691",
                features: ["Todas as matrizes", "Downloads ilimitados", "Novas toda semana", "Compatível com sua máquina"],
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
                <CardContent className="space-y-6 pt-8 pb-8 px-7">
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
                    className={`w-full py-6 text-sm font-semibold ${plan.popular ? "shadow-lg shadow-primary/20" : ""}`}
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

          {/* Trust badges */}
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-primary">Acesso imediato após a compra</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Checkout seguro via Eduzz</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 13. GUARANTEE ══════ */}
      <section className="max-w-2xl mx-auto px-4 py-14 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl md:text-2xl font-display font-bold">Garantia de 7 dias</h2>
        <p className="text-base text-foreground/80 max-w-md mx-auto leading-relaxed">
          Você tem 7 dias para testar tudo. Se não gostar, devolvemos <strong className="text-foreground">100% do seu dinheiro</strong>. Sem perguntas.
        </p>
      </section>

      {/* ══════ 14. FAQ ══════ */}
      <section className="bg-muted/30 border-y border-border/30">
        <div className="max-w-2xl mx-auto px-4 py-16 md:py-20 space-y-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center">
            <HelpCircle className="h-6 w-6 text-primary inline mr-2 -mt-1" />
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "Funciona na minha máquina?",
                a: "Sim! Quando você entra, informa o modelo da sua máquina. A partir daí, você só vê matrizes que são compatíveis com ela. Nada de formato errado.",
              },
              {
                q: "Preciso saber mexer em computador?",
                a: "Não! O Borda Pro é super simples. Se você sabe usar WhatsApp, você sabe usar o Borda Pro. É só entrar, escolher e baixar.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim, pode cancelar a qualquer momento. Sem burocracia, sem taxa de cancelamento.",
              },
              {
                q: "Como recebo as matrizes?",
                a: "Assim que assinar, você já acessa a plataforma e pode baixar as matrizes direto no seu celular ou computador. O download é imediato.",
              },
              {
                q: "Tem suporte?",
                a: "Sim! Qualquer dúvida, nosso time te ajuda. Estamos aqui para facilitar sua vida, não para complicar.",
              },
            ].map(({ q, a }, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm md:text-base font-semibold hover:no-underline">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ══════ 15. FINAL CTA ══════ */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold">
          Se você borda, isso aqui vai{" "}
          <span className="text-gradient-brand">facilitar muito sua vida.</span>
        </h2>
        <Button
          size="lg"
          onClick={scrollToPricing}
          className="text-base py-6 px-10 gap-2 shadow-lg shadow-primary/20"
        >
          Quero acessar agora
          <ChevronRight className="h-5 w-5" />
        </Button>
      </section>

      {/* ══════ FOOTER ══════ */}
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
