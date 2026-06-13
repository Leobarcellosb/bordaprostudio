import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";

// A sessão de recovery chega pelo hash e o supabase-js a estabelece (e LIMPA o
// hash da URL). Por isso o gate é a SESSÃO, não o hash: se há sessão, mostramos
// o form e chamamos updateUser. Sem sessão em alguns segundos = link
// inválido/expirado → oferecemos pedir um novo.
const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"checking" | "ready" | "invalid">("checking");
  const navigate = useNavigate();
  const isInvite = window.location.hash.includes("type=invite");

  useEffect(() => {
    let done = false;
    const ready = (hasSession: boolean) => {
      if (!done && hasSession) { done = true; setPhase("ready"); }
    };
    supabase.auth.getSession().then(({ data }) => ready(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => ready(!!session));
    // Sem sessão depois de 5s → link inválido/expirado.
    const t = window.setTimeout(async () => {
      if (done) return;
      const { data } = await supabase.auth.getSession();
      if (!done && !data.session) setPhase("invalid");
    }, 5000);
    return () => { done = true; sub.subscription.unsubscribe(); window.clearTimeout(t); };
  }, []);

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 6 && password === confirm;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return; // guard: senhas iguais e tamanho mínimo
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else { toast.success("Senha atualizada!"); navigate("/dashboard"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">{isInvite ? "Crie sua senha" : "Nova senha"}</CardTitle>
          {isInvite && phase === "ready" && (
            <p className="text-sm text-muted-foreground mt-2">Bem-vinda ao Borda Pro! Crie sua senha para acessar.</p>
          )}
        </CardHeader>
        <CardContent>
          {phase === "checking" && (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Validando seu link…</span>
            </div>
          )}

          {phase === "invalid" && (
            <div className="text-center space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Esse link de recuperação expirou ou já foi usado. Peça um novo abaixo.
              </p>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Pedir um novo link</Link>
              </Button>
            </div>
          )}

          {phase === "ready" && (
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  required
                  minLength={6}
                  autoFocus
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirme a nova senha"
                required
                minLength={6}
              />

              {tooShort && <p className="text-xs text-destructive">A senha precisa ter pelo menos 6 caracteres.</p>}
              {mismatch && <p className="text-xs text-destructive">As senhas não são iguais.</p>}
              {canSubmit && (
                <p className="flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> As senhas conferem
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
                {loading ? "Atualizando..." : isInvite ? "Criar senha e entrar" : "Atualizar senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
