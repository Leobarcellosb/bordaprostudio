import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Gift, Loader2, Sparkles, AlertCircle } from "lucide-react";

const BENEFITS = [
  "Acervo completo de matrizes, organizado por tema",
  "Downloads ilimitados",
  "Ferramentas pra produzir e vender mais",
  "Sem cartão, sem compromisso",
];

const Ativar = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExisting(false);
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("register-trial", {
        body: { email, name },
      });

      if (fnErr) {
        // supabase-js entrega o corpo do erro em error.context (Response).
        let msg = "Não foi possível ativar agora. Tente de novo em instantes.";
        try {
          const ctx = (fnErr as unknown as { context?: Response }).context;
          const b = ctx ? await ctx.json() : null;
          if (b?.message) msg = b.message;
        } catch {
          /* mantém a mensagem padrão */
        }
        setError(msg);
        setLoading(false);
        return;
      }

      if (data?.magic_link) {
        // Conta nova → cai logado direto (mantém o loading até navegar).
        window.location.href = data.magic_link;
        return;
      }

      if (data?.status === "existing") {
        setExisting(true);
        setLoading(false);
        return;
      }

      setError("Não foi possível ativar agora. Tente de novo.");
      setLoading(false);
    } catch {
      setError("Não foi possível ativar agora. Tente de novo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--landing-warm))] text-foreground flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-7">
          <div className="flex justify-center">
            <img src="/lockup-indigo.png" alt="Borda Pro" className="h-11 w-auto" />
          </div>

          {/* Header */}
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <Gift className="h-3.5 w-3.5" />
              15 dias grátis
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight">
              Seus 15 dias grátis <span className="text-gradient-brand">começam agora</span>
            </h1>
            <p className="text-muted-foreground">
              Acesso completo à Borda Pro. Sem cartão, sem compromisso.
            </p>
          </div>

          {existing ? (
            /* Conta já existe — não auto-loga (segurança); manda pro login. */
            <div className="rounded-2xl bg-card border border-border/50 p-6 text-center space-y-4 shadow-sm">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Você já tem uma conta com esse email</p>
                <p className="text-sm text-muted-foreground">Faça login para acessar a Borda Pro.</p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full rounded-full py-6 text-base font-semibold">
                Entrar
              </Button>
            </div>
          ) : (
            <>
              {/* Benefícios */}
              <ul className="space-y-2.5 bg-card/60 border border-border/40 rounded-2xl p-5">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground/85">{b}</span>
                  </li>
                ))}
              </ul>

              {/* Form */}
              <form onSubmit={submit} className="space-y-3">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                  className="h-12 rounded-xl"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                  className="h-12 rounded-xl"
                />

                {error && (
                  <p className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-6 text-base font-semibold gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Ativando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Ativar meus 15 dias grátis
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground/70">
                  Ao ativar, você entra direto na sua conta. Sem cartão.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ativar;
