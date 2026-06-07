import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check, Download, Zap, Heart, XCircle, Frown, FolderOpen, AlertTriangle,
  Sparkles, ShieldCheck, Gift, BookOpen, LayoutGrid, RefreshCw, HelpCircle,
  Crown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import CountUp from "react-countup";
import { CHECKOUT_MENSAL, CHECKOUT_ANUAL } from "@/config/checkout";
import { whatsappLink } from "@/config/contato";
import heroImg from "@/assets/landing-hero.jpg";
import productsImg from "@/assets/landing-products.jpg";
import organizedImg from "@/assets/landing-organized.jpg";

/* ─── motion helpers (transform/opacity só; respeitam prefers-reduced-motion) ─── */

const containerStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const itemUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const Reveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
};

const StaggerGroup = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={containerStagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
      {children}
    </motion.div>
  );
};

const StaggerItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className} variants={itemUp}>{children}</motion.div>;
};

const Float = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay }}>
      {children}
    </motion.div>
  );
};

/* Stat: contador animado; o `display` deve refletir value/prefix/suffix/separator (fallback do reduced-motion). */
const Stat = ({ value, display, prefix = "", suffix = "", separator = "" }: { value: number; display: string; prefix?: string; suffix?: string; separator?: string }) => {
  const reduce = useReducedMotion();
  if (reduce) return <>{display}</>;
  return <CountUp end={value} prefix={prefix} suffix={suffix} separator={separator} duration={2} enableScrollSpy scrollSpyOnce />;
};

/* ─── ui bits ─── */

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

/* Ícone oficial do WhatsApp (glifo da marca, inline). */
const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const WA_MSG_FLUTUANTE = "Olá! Vim pela página da Borda Pro e queria tirar uma dúvida. 😊";
const WA_MSG_DUVIDAS = "Olá! Vim pela Borda Pro e queria tirar umas dúvidas antes de assinar.";

/* ─── page ─── */

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--landing-warm))] text-foreground overflow-x-hidden">

      {/* ══════ NAV ══════ */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-[hsl(var(--landing-warm))]/90 backdrop-blur-lg border-b border-border/40 shadow-sm" : "bg-transparent border-b border-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img src="/lockup-indigo.png" alt="Borda Pro" className="h-12 w-auto" />
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-[hsl(var(--landing-cream))] to-[hsl(var(--landing-warm))]" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.03] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center relative z-10">
          {/* LEFT */}
          <div className="space-y-6 text-center md:text-left">
            <Reveal delay={0}>
              <FloatingBadge>
                <Download className="h-3.5 w-3.5 text-primary" />
                Acervo de matrizes organizado
              </FloatingBadge>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-display font-bold leading-[1.12] tracking-tight">
                Chega de baixar{" "}
                <span className="text-gradient-brand">matriz errada</span>{" "}
                e perder tempo.
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0">
                Matrizes organizadas e prontas pra bordar, nos formatos das máquinas mais usadas.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
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
            </Reveal>

            <Reveal delay={0.32}>
              <p className="text-xs text-muted-foreground/70 flex items-center gap-2 justify-center md:justify-start">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
                Mais de 12.800 clientes satisfeitas.
              </p>
            </Reveal>
          </div>

          {/* RIGHT — Hero image */}
          <Reveal delay={0.18} className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/20 rotate-1 hover:rotate-0 transition-transform duration-500">
              <img src={heroImg} alt="Máquina de bordar em ação" width={1024} height={1024} loading="eager" fetchPriority="high" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            <Float className="absolute -bottom-4 -left-3 md:-left-6">
              <FloatingBadge>
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <span>Pronto pra bordar</span>
              </FloatingBadge>
            </Float>
            <Float className="absolute -top-3 -right-2 md:-right-4" delay={0.6}>
              <FloatingBadge>
                <Heart className="h-3.5 w-3.5 text-primary" />
                <span>Acervo organizado</span>
              </FloatingBadge>
            </Float>
          </Reveal>
        </div>
      </section>

      {/* ══════ CTA 1 ══════ */}
      <div className="text-center pb-8 pt-2">
        <Button size="lg" onClick={scrollToPricing} className="text-base py-6 px-10 gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.03] transition-all">
          <Zap className="h-5 w-5" />
          Quero acessar agora
        </Button>
      </div>

      {/* ══════ 4. LEAD DE COPY — EMOTIONAL (dor: mantida) ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-8 text-center">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-display font-bold leading-snug">
              Se você trabalha com bordado, você sabe como é…
            </h2>
          </Reveal>

          <Reveal>
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
          </Reveal>

          <SectionDivider />

          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
            {[
              { icon: XCircle, text: "Baixa uma matriz e a máquina não lê" },
              { icon: Frown, text: "Perde tempo testando formato por formato" },
              { icon: FolderOpen, text: "Arquivo desorganizado, tudo bagunçado" },
              { icon: AlertTriangle, text: "Já perdeu cliente por causa de erro no bordado" },
            ].map(({ icon: Icon, text }) => (
              <StaggerItem key={text}>
                <Card className="border-destructive/15 bg-destructive/[0.03] rounded-2xl hover:shadow-md transition-shadow h-full">
                  <CardContent className="pt-5 pb-4 flex items-start gap-3 text-left">
                    <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5 text-destructive/70" />
                    </div>
                    <p className="text-sm font-medium text-foreground/80 pt-1.5">{text}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <Reveal>
            <div className="max-w-xl mx-auto rounded-2xl bg-primary/[0.04] border border-primary/15 p-6 mt-4">
              <p className="text-base md:text-lg font-semibold text-primary">
                Mas existe um jeito muito mais simples de trabalhar.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ 5. THE SOLUTION (promessa de máquina suavizada) ══════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--landing-warm))] to-[hsl(var(--landing-cream))]/30" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20 relative z-10">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <Reveal className="order-2 md:order-1">
              <div className="rounded-3xl overflow-hidden shadow-xl border border-border/20 -rotate-1 hover:rotate-0 transition-transform duration-500">
                <img src={organizedImg} alt="Matrizes organizadas" width={1024} height={1024} loading="lazy" decoding="async" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            </Reveal>

            <Reveal className="order-1 md:order-2 space-y-6 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-display font-bold">
                O Borda Pro <span className="text-gradient-brand">resolve isso pra você</span>
              </h2>
              <div className="space-y-3 text-base text-foreground/80 leading-relaxed">
                <p>No Borda Pro, está tudo organizado e pronto pra usar.</p>
                <p>Você não precisa garimpar.</p>
                <p>Você não precisa perder tempo.</p>
                <p>Você entra… e encontra <strong className="text-foreground">tudo organizado, pronto pra baixar</strong>.</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Matrizes nos formatos das máquinas mais usadas",
                  "Já organizadas por tema e prontas para usar",
                  "Menos tentativa e erro",
                  "É só baixar e bordar",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xl md:text-2xl font-display font-bold italic text-primary">
                É só escolher, baixar e bordar.
              </p>
            </Reveal>
          </div>

          <Reveal className="text-center pt-12">
            <Button size="lg" onClick={scrollToPricing} className="text-base py-6 px-10 gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.03] transition-all">
              <Zap className="h-5 w-5" />
              Quero acessar agora
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ══════ 6. BENEFITS (contagem qualitativa + máquina suavizada) ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-10">
          <Reveal className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              O que você ganha com o <span className="text-gradient-brand">Borda Pro</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">Tudo o que você precisa para bordar sem complicação.</p>
          </Reveal>

          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Download, text: "Acervo completo de matrizes", desc: "Biblioteca completa e em crescimento" },
              { icon: FolderOpen, text: "Tudo separado por tema", desc: "Infantil, floral, nomes, datas e mais" },
              { icon: Sparkles, text: "Acervo sempre crescendo", desc: "A biblioteca cresce junto com você" },
              { icon: Check, text: "Formatos prontos pra usar", desc: "Nos formatos das máquinas mais usadas" },
              { icon: Heart, text: "Menos dor de cabeça", desc: "Baixou, bordou. Simples assim." },
              { icon: Zap, text: "Download imediato", desc: "Baixe e use na hora, sem complicação" },
            ].map(({ icon: Icon, text, desc }) => (
              <StaggerItem key={text}>
                <Card className="group bg-card/70 border-border/30 rounded-2xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/[0.05] hover:-translate-y-1 transition-all duration-300 h-full">
                  <CardContent className="pt-7 pb-6 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/[0.07] flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-5.5 w-5.5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold">{text}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>

          {/* Emotional benefit with image */}
          <Reveal className="grid md:grid-cols-2 gap-6 items-center max-w-4xl mx-auto pt-4">
            <div className="rounded-3xl overflow-hidden shadow-lg border border-border/20 rotate-1 hover:rotate-0 transition-transform duration-500">
              <img src={productsImg} alt="Produto bordado" width={1024} height={1024} loading="lazy" decoding="async" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="text-center md:text-left space-y-4">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
                <Heart className="h-4 w-4 text-primary inline mr-1.5 -mt-0.5" />
                Você ganha tempo, evita estresse e trabalha com <strong className="text-foreground">mais confiança</strong>.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Com tudo organizado, você foca no que importa: criar bordados lindos e atender suas clientes.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ HOW IT WORKS (sem promessa de filtragem por máquina) ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center space-y-10">
          <Reveal><h2 className="text-2xl md:text-3xl font-display font-bold">Como funciona?</h2></Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { step: "1", title: "Você acessa o acervo", desc: "Tudo organizado por tema, num lugar só" },
              { step: "2", title: "Escolhe a sua matriz", desc: "Nos formatos mais usados, pronta pra baixar" },
              { step: "3", title: "Baixa e borda", desc: "Download imediato, sem complicação" },
            ].map(({ step, title, desc }) => (
              <StaggerItem key={step} className="space-y-4 group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto group-hover:scale-110 transition-transform">
                  {step}
                </div>
                <h3 className="font-display font-bold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ══════ 7. AUTHORITY ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-3 bg-card/80 border border-border/30 rounded-2xl px-6 py-4 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
              <p className="text-sm md:text-base text-foreground/80 leading-relaxed text-left">
                Esse sistema foi criado por <strong className="text-foreground">quem já vive do bordado</strong> e sabe exatamente as dificuldades do dia a dia.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ 8. PROVA — números reais (no lugar dos depoimentos) ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center space-y-10">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              Não é promessa. <span className="text-gradient-brand">É histórico.</span>
            </h2>
          </Reveal>

          <StaggerGroup className="grid grid-cols-1 max-w-sm mx-auto">
            {[
              { display: "+12.800", node: <Stat value={12800} display="+12.800" prefix="+" separator="." />, label: "clientes satisfeitas" },
            ].map(({ display, node, label }) => (
              <StaggerItem key={display}>
                <Card className="bg-card/80 border-border/30 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                  <CardContent className="py-8 space-y-1.5">
                    <p className="text-3xl md:text-4xl font-display font-bold text-gradient-brand tabular-nums">{node}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <Reveal>
            <p className="text-base text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Milhares de bordadeiras já compraram com a gente.
            </p>
          </Reveal>

          <Reveal className="pt-2">
            <Button size="lg" onClick={scrollToPricing} className="text-base py-6 px-10 gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.03] transition-all">
              <Zap className="h-5 w-5" />
              Quero acessar agora
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ══════ 9. WHAT YOU GET ══════ */}
      <section className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20 text-center space-y-8">
          <Reveal><h2 className="text-2xl md:text-3xl font-display font-bold">O que você vai ter acesso:</h2></Reveal>
          <StaggerGroup className="space-y-3 max-w-md mx-auto">
            {[
              { icon: BookOpen, text: "Biblioteca completa de matrizes" },
              { icon: Download, text: "Downloads ilimitados" },
              { icon: LayoutGrid, text: "Matrizes organizadas por tema" },
              { icon: RefreshCw, text: "Novidades entrando sempre" },
              { icon: Sparkles, text: "Ferramentas para facilitar seu trabalho" },
            ].map(({ icon: Icon, text }) => (
              <StaggerItem key={text}>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-card/80 border border-border/30 text-left hover:border-primary/20 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-xl bg-primary/[0.07] flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ══════ 10. BONUS ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center space-y-6">
          <Reveal>
            <h2 className="text-xl md:text-2xl font-display font-bold flex items-center justify-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              E você ainda ganha de bônus:
            </h2>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {[
              "Catálogos prontos para vender",
              "Sugestões de produtos para bordar",
            ].map((b) => (
              <StaggerItem key={b}>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/[0.04] border border-primary/15 hover:bg-primary/[0.07] transition-colors h-full">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm font-medium text-left">{b}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ══════ 11. PRICE ANCHORING + PRICING (cards inalterados) ══════ */}
      <section id="pricing" className="bg-gradient-to-b from-[hsl(var(--landing-cream))] to-[hsl(var(--landing-warm))]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-10">
          {/* Anchoring */}
          <Reveal className="text-center space-y-4 max-w-2xl mx-auto">
            <p className="text-base md:text-lg text-foreground/80">
              Se você fosse comprar essas matrizes separadamente, gastaria <strong className="text-foreground">centenas de reais</strong>.
            </p>
            <p className="text-base md:text-lg text-foreground/80">
              Mas aqui você tem acesso a <strong className="text-primary">tudo</strong> por um valor mensal.
            </p>
          </Reveal>

          <SectionDivider />

          <Reveal className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              Comece <span className="text-gradient-brand">hoje mesmo</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              Tenha acesso a todas as matrizes, sem complicação.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Monthly */}
            <Reveal>
              <Card className="bg-card/80 border-border/40 rounded-3xl hover:shadow-lg transition-all h-full">
                <CardContent className="space-y-6 pt-8 pb-8 px-7">
                  <div>
                    <h3 className="font-display font-bold text-xl">Mensal</h3>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-3xl font-bold text-gradient-brand">R$ 49,90</span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {["Todas as matrizes", "Downloads ilimitados", "Acervo sempre crescendo", "Formatos prontos pra usar"].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full py-6 text-sm font-semibold rounded-full hover:bg-primary/5"
                    onClick={() => window.open(CHECKOUT_MENSAL, "_blank")}
                  >
                    Assinar Mensal
                  </Button>
                </CardContent>
              </Card>
            </Reveal>

            {/* Annual — Popular */}
            <Reveal delay={0.08}>
              <Card className="relative bg-card border-primary/40 border-2 rounded-3xl shadow-xl shadow-primary/10 md:scale-[1.03] hover:shadow-2xl transition-all h-full">
                {/* Ribbon */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-[hsl(242_47%_34%)] to-primary text-primary-foreground text-xs font-bold px-5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Crown className="h-3 w-3" />
                    MAIS ESCOLHIDO
                  </div>
                </div>
                <CardContent className="space-y-6 pt-10 pb-8 px-7">
                  <div>
                    <h3 className="font-display font-bold text-xl">Anual</h3>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-3xl font-bold text-gradient-brand">R$ 397</span>
                      <span className="text-muted-foreground text-sm">/ano</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">equivalente a R$ 33,08/mês</p>
                    <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mt-2">
                      <Sparkles className="h-3 w-3" />
                      Economia de R$ 201,80
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {["Tudo do Mensal", "Prioridade em novos designs", "Suporte prioritário", "≈ 4 meses grátis vs. o mensal"].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full py-6 text-sm font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all"
                    onClick={() => window.open(CHECKOUT_ANUAL, "_blank")}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Assinar Anual
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          {/* Trust */}
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-primary flex items-center justify-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Acesso imediato após a compra
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary/60" /> Checkout seguro via Eduzz</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary/60" /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 13. GUARANTEE ══════ */}
      <section className="bg-[hsl(var(--landing-warm))]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 text-center space-y-4">
          <Reveal>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold">Garantia de 7 dias</h2>
            <p className="text-base text-foreground/80 max-w-md mx-auto leading-relaxed mt-3">
              Você tem 7 dias para testar tudo. Se não gostar, devolvemos <strong className="text-foreground">100% do seu dinheiro</strong>. Sem perguntas.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════ 14. FAQ (pergunta de máquina suavizada) ══════ */}
      <section id="faq" className="bg-[hsl(var(--landing-cream))]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 md:py-20 space-y-8">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center flex items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Perguntas frequentes
            </h2>
          </Reveal>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {[
              {
                q: "Em que formato vêm as matrizes?",
                a: "Nos formatos mais usados pelas máquinas domésticas e semi-industriais.",
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
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              Se você borda, isso aqui vai{" "}
              <span className="text-gradient-brand">facilitar muito sua vida.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <Button
              size="lg"
              onClick={() => window.open(whatsappLink(WA_MSG_DUVIDAS), "_blank", "noopener,noreferrer")}
              className="text-base py-6 px-10 gap-2.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] text-white shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:scale-[1.03] transition-all"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Tirar dúvidas no WhatsApp
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-border/30 bg-[hsl(var(--landing-cream))]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/lockup-indigo.png" alt="Borda Pro" className="h-10 w-auto opacity-60" />
          <div className="flex gap-6 text-xs text-muted-foreground">
            <button onClick={() => navigate("/termos")} className="hover:text-foreground transition-colors">Termos</button>
            <button onClick={() => navigate("/privacidade")} className="hover:text-foreground transition-colors">Privacidade</button>
            <a href="#faq" className="hover:text-foreground transition-colors">Suporte</a>
          </div>
          <p className="text-[11px] text-muted-foreground/70">Feito com ❤️ por G Bordados</p>
        </div>
      </footer>

      {/* Botão flutuante do WhatsApp (fixo, com mensagem pré-preenchida) */}
      <a
        href={whatsappLink(WA_MSG_FLUTUANTE)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 hover:bg-[#1ebe5b] hover:scale-110 transition-all"
      >
        <WhatsAppIcon className="w-7 h-7" />
      </a>
    </div>
  );
};

export default LandingPage;
