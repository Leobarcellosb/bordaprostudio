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
  HelpCircle, Crown, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo-horizontal.png";
import heroImg from "@/assets/landing-hero.jpg";
import productsImg from "@/assets/landing-products.jpg";
import organizedImg from "@/assets/landing-organized.jpg";
import avatarMaria from "@/assets/avatar-maria.jpg";
import avatarAna from "@/assets/avatar-ana.jpg";
import avatarClaudia from "@/assets/avatar-claudia.jpg";

/* ─── helpers ─── */

const SectionDivider = () => (
  <div className="flex items-center justify-center gap-3 py-2">
    <div className="w-8 h-px bg-primary/20" />
    <Sparkles className="h-3.5 w-3.5 text-primary/30" />
    <div className="w-8 h-px bg-primary/20" />
  </div>
);

const FloatingBadge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`inline-flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border/40 rounded-full px-4 py-2 shadow-lg text-xs font-semibold ${className}`}>
    {children}
  </div>
);

/* ─── page ─── */

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--landing-warm))] text-foreground overflow-x-hidden">

      {/* ══════ NAV ══════ */}
      <nav className="sticky top-0 z-50 bg-[hsl(var(--landing-warm))]/80 backdrop-blur-lg border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img src={logoHorizontal} alt="Borda Pro" className="h-12" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-foreground/70 hover:text-foreground">
              Entrar
            </Button>
            <Button size="sm" onClick={scrollToPricing} className="rounded-full gap-1.5 shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all">
              <Zap className="h-3.5 w-3.5" />
              Assinar
            </Button>
          </div>
        </div>
      </nav>

      {/* ══════ 1. HERO ══════ */}
      <section className="relative overflow-hidden">
        {/* Warm gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-[hsl(var(--landing-cream))] to-[hsl(var(--landing-warm))]" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.03] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center relative z-10">
          {/* LEFT */}
          <div className="space-y-6 text-center md:text-left">
            <FloatingBadge className="animate-fade-in">
              <Download className="h-3.5 w-3.5 text-primary" />
              +500 matrizes organizadas
            </FloatingBadge>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-display font-bold leading-[1.12] tracking-tight">
              Você nunca mais vai baixar uma{" "}
              <span className="text-gradient-brand">matriz errada</span>{" "}
              na vida.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0">
              Veja apenas matrizes que funcionam na sua máquina, já organizadas e prontas para bordar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Button
                size="lg"
                onClick={scrollToPricing}
                className="text-base py-6 px-8 gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.03] transition-all"
              >
                <Zap className="h-5 w-5" />
                Quero acessar agora
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/login")}
                className="text-base py-6 px-8 rounded-full bg-card/50 border-border/50 hover:bg-card"
              >
                Já sou assinante
              </Button>
            </div>

            <p className="text-xs text-muted-foreground/60 flex items-center gap-2 justify-center md:justify-start">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/50" />
              Mais de milhares de matrizes testadas e organizadas
            </p>
          </div>

          {/* RIGHT — Hero image */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/20 rotate-1 hover:rotate-0 transition-transform duration-500">
              <img src={heroImg} alt="Máquina de bordar em ação" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-3 md:-left-6 animate-fade-in">
              <FloatingBadge>
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <span>Pronto pra bordar</span>
              </FloatingBadge>
            </div>
            <div className="absolute -top-3 -right-2 md:-right-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <FloatingBadge>
                <Heart className="h-3.5 w-3.5 text-secondary" />
                <span>Sem erro de formato</span>
              </FloatingBadge>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 2. VSL PLACEHOLDER ══════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="aspect-video rounded-3xl bg-[hsl(var(--landing-cream))] border border-border/30 flex flex-col items-center justify-center gap-3 shadow-inner">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
            <Play className="h-7 w-7 text-primary ml-1" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Vídeo explicando como funciona o Borda Pro</p>
        </div>
      </section>

      {/* ══════ CTA 1 ══════ */}
      <div className="text-center pb-8">
        <Button size="lg" onClick={scrollToPricing} className="text-base py-6 px-10 gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.03] transition-all">
          <Zap className="h-5 w-5" />
          Quero acessar agora
        </Button>
      </div>

      {/* ══════ 4. LEAD DE COPY — EMOTIONAL ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-8 text-center">
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
              <Card key={text} className="border-destructive/15 bg-destructive/[0.03] rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4 flex items-start gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-destructive/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground/80 pt-1.5">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="max-w-xl mx-auto rounded-2xl bg-primary/[0.04] border border-primary/15 p-6 mt-4">
            <p className="text-base md:text-lg font-semibold text-primary">
              Mas existe um jeito muito mais simples de trabalhar.
            </p>
          </div>
        </div>
      </section>

      {/* ══════ 5. THE SOLUTION ══════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--landing-warm))] to-[hsl(var(--landing-cream))]/30" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20 relative z-10">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Image */}
            <div className="order-2 md:order-1">
              <div className="rounded-3xl overflow-hidden shadow-xl border border-border/20 -rotate-1 hover:rotate-0 transition-transform duration-500">
                <img src={organizedImg} alt="Matrizes organizadas" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </div>

            {/* Text */}
            <div className="order-1 md:order-2 space-y-6 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-display font-bold">
                O Borda Pro <span className="text-gradient-brand">resolve isso pra você</span>
              </h2>
              <div className="space-y-3 text-base text-foreground/80 leading-relaxed">
                <p>No Borda Pro, você não precisa mais adivinhar formato.</p>
                <p>Você não precisa testar.</p>
                <p>Você não precisa perder tempo.</p>
                <p>Você entra… e já vê <strong className="text-foreground">apenas o que funciona na sua máquina</strong>.</p>
              </div>
              <div className="space-y-3">
                {[
                  "As matrizes já vêm no formato da sua máquina",
                  "Já organizadas por tema e prontas para usar",
                  "Você não precisa testar nada",
                  "É só baixar e bordar",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-card/80 border border-border/30">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground/90">{item}</p>
                  </div>
                ))}
              </div>
              <div className="inline-block text-lg font-display font-bold text-primary bg-primary/[0.05] border border-primary/15 rounded-2xl px-7 py-3.5">
                É só escolher, baixar e bordar.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 6. BENEFITS ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              O que você ganha com o <span className="text-gradient-brand">Borda Pro</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">Tudo o que você precisa para bordar sem complicação.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Download, text: "Mais de centenas de matrizes prontas", desc: "Biblioteca completa e em crescimento" },
              { icon: FolderOpen, text: "Tudo separado por tema", desc: "Infantil, floral, nomes, datas e mais" },
              { icon: Sparkles, text: "Novas matrizes toda semana", desc: "A biblioteca cresce junto com você" },
              { icon: Check, text: "Compatível com sua máquina", desc: "Formato certo, automaticamente" },
              { icon: Heart, text: "Sem erro, sem dor de cabeça", desc: "Baixou, bordou. Simples assim." },
              { icon: Zap, text: "Download imediato", desc: "Baixe e use na hora, sem complicação" },
            ].map(({ icon: Icon, text, desc }) => (
              <Card key={text} className="group bg-card/70 border-border/30 rounded-2xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/[0.05] hover:-translate-y-1 transition-all duration-300">
                <CardContent className="pt-7 pb-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/[0.07] flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-5.5 w-5.5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{text}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Emotional benefit with image */}
          <div className="grid md:grid-cols-2 gap-6 items-center max-w-4xl mx-auto pt-4">
            <div className="rounded-3xl overflow-hidden shadow-lg border border-border/20 rotate-1 hover:rotate-0 transition-transform duration-500">
              <img src={productsImg} alt="Produto bordado" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="text-center md:text-left space-y-4">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
                <Heart className="h-4 w-4 text-secondary inline mr-1.5 -mt-0.5" />
                Você ganha tempo, evita estresse e trabalha com <strong className="text-foreground">mais confiança</strong>.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Com tudo organizado, você foca no que importa: criar bordados lindos e atender suas clientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center space-y-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold">Como funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { step: "1", title: "Você informa sua máquina", desc: "Diz qual modelo e bastidor você usa", color: "bg-primary/10 text-primary" },
              { step: "2", title: "A gente mostra só o que funciona nela", desc: "Nada de formato errado ou arquivo incompatível", color: "bg-secondary/10 text-secondary" },
              { step: "3", title: "Você baixa e já pode bordar", desc: "Pronto, sem teste, sem perda de tempo", color: "bg-primary/10 text-primary" },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="space-y-4 group">
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-xl font-bold mx-auto group-hover:scale-110 transition-transform`}>
                  {step}
                </div>
                <h3 className="font-display font-bold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 7. AUTHORITY ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="inline-flex items-center gap-3 bg-card/80 border border-border/30 rounded-2xl px-6 py-4 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed text-left">
              Esse sistema foi criado por <strong className="text-foreground">quem já vive do bordado</strong> e sabe exatamente as dificuldades do dia a dia.
            </p>
          </div>
        </div>
      </section>

      {/* ══════ 8. SOCIAL PROOF ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center space-y-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            Quem usa, <span className="text-gradient-brand">não larga mais</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Maria C.", city: "São Paulo, SP", text: "Depois que comecei a usar, nunca mais errei formato.", avatar: avatarMaria, rotate: "-rotate-1" },
              { name: "Ana P.", city: "Belo Horizonte, MG", text: "Agora minha máquina lê tudo de primeira. Não perco mais tempo.", avatar: avatarAna, rotate: "rotate-1" },
              { name: "Cláudia R.", city: "Curitiba, PR", text: "Economizo muito tempo no meu dia. Baixo e já bordo.", avatar: avatarClaudia, rotate: "-rotate-[0.5deg]" },
            ].map(({ name, city, text, avatar, rotate }) => (
              <Card key={name} className={`bg-card/80 border-border/30 rounded-2xl ${rotate} hover:rotate-0 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                <CardContent className="pt-7 pb-6 space-y-4">
                  <div className="flex justify-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm italic text-foreground/80 leading-relaxed">"{text}"</p>
                  <div className="flex items-center gap-3 justify-center">
                    <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
                    <div className="text-left">
                      <p className="text-xs font-bold">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{city}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 9. WHAT YOU GET ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center space-y-8">
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
              <div key={text} className="flex items-center gap-3 p-4 rounded-2xl bg-card/80 border border-border/30 text-left hover:border-primary/20 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-xl bg-primary/[0.07] flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <p className="text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 10. BONUS ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center space-y-6">
          <h2 className="text-xl md:text-2xl font-display font-bold flex items-center justify-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            E você ainda ganha de bônus:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {[
              "Catálogos prontos para vender",
              "Sugestões de produtos para bordar",
            ].map((b) => (
              <div key={b} className="flex items-center gap-3 p-4 rounded-2xl bg-primary/[0.04] border border-primary/15 hover:bg-primary/[0.07] transition-colors">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm font-medium">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 11. PRICE ANCHORING + PRICING ══════ */}
      <section id="pricing" className="bg-gradient-to-b from-[hsl(var(--landing-cream))] to-[hsl(var(--landing-warm))]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-10">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Monthly */}
            <Card className="bg-card/80 border-border/40 rounded-3xl hover:shadow-lg transition-all">
              <CardContent className="space-y-6 pt-8 pb-8 px-7">
                <div>
                  <h3 className="font-display font-bold text-xl">Mensal</h3>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-3xl font-bold text-gradient-brand">R$ 79,90</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {["Todas as matrizes", "Downloads ilimitados", "Novas toda semana", "Compatível com sua máquina"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full py-6 text-sm font-semibold rounded-full hover:bg-primary/5"
                  onClick={() => window.open("https://chk.eduzz.com/E0D6ON5691", "_blank")}
                >
                  Assinar Mensal
                </Button>
              </CardContent>
            </Card>

            {/* Annual — Popular */}
            <Card className="relative bg-card border-primary/40 border-2 rounded-3xl shadow-xl shadow-primary/10 md:scale-[1.03] hover:shadow-2xl transition-all">
              {/* Ribbon */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold px-5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <Crown className="h-3 w-3" />
                  MAIS ESCOLHIDO
                </div>
              </div>
              <CardContent className="space-y-6 pt-10 pb-8 px-7">
                <div>
                  <h3 className="font-display font-bold text-xl">Anual</h3>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-3xl font-bold text-gradient-brand">R$ 597</span>
                    <span className="text-muted-foreground text-sm">/ano</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">equivalente a R$ 49,75/mês</p>
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mt-2">
                    <Sparkles className="h-3 w-3" />
                    Economia de R$ 361,80
                  </div>
                </div>
                <ul className="space-y-3">
                  {["Tudo do Mensal", "Prioridade em novos designs", "Suporte prioritário", "Desconto de 38%"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full py-6 text-sm font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all"
                  onClick={() => window.open("https://chk.eduzz.com/G961DZBEW1", "_blank")}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Assinar Anual
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Trust */}
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-primary flex items-center justify-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Acesso imediato após a compra
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary/50" /> Checkout seguro via Eduzz</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary/50" /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 13. GUARANTEE ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold">Garantia de 7 dias</h2>
          <p className="text-base text-foreground/80 max-w-md mx-auto leading-relaxed">
            Você tem 7 dias para testar tudo. Se não gostar, devolvemos <strong className="text-foreground">100% do seu dinheiro</strong>. Sem perguntas.
          </p>
        </div>
      </section>

      {/* ══════ 14. FAQ ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center flex items-center justify-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
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
                a: "Assim que assinar, você já acessa e pode baixar as matrizes direto no seu celular ou computador. O download é imediato.",
              },
              {
                q: "Tem suporte?",
                a: "Sim! Qualquer dúvida, nosso time te ajuda. Estamos aqui para facilitar sua vida, não para complicar.",
              },
            ].map(({ q, a }, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card/60 border border-border/30 rounded-2xl px-5 data-[state=open]:shadow-sm transition-all">
                <AccordionTrigger className="text-left text-sm md:text-base font-semibold hover:no-underline py-4">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ══════ 15. FINAL CTA ══════ */}
      <section className="bg-gradient-to-b from-[hsl(var(--landing-warm))] to-[hsl(var(--landing-cream))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            Se você borda, isso aqui vai{" "}
            <span className="text-gradient-brand">facilitar muito sua vida.</span>
          </h2>
          <Button
            size="lg"
            onClick={scrollToPricing}
            className="text-base py-6 px-10 gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.03] transition-all"
          >
            Quero acessar agora
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-border/30 bg-[hsl(var(--landing-cream))]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoHorizontal} alt="Borda Pro" className="h-10 opacity-60" />
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
