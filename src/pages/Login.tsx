import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import logoHorizontal from "@/assets/logo-horizontal.png";

const LOGIN_TIMEOUT = 15000; // 15s max waiting for auth resolution

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, hasActiveSubscription, needsOnboarding } = useAuth();

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (authLoading || !user) return;
    if (isAdmin) { navigate("/dashboard", { replace: true }); return; }
    if (needsOnboarding) { navigate("/onboarding", { replace: true }); return; }
    if (hasActiveSubscription) { navigate("/dashboard", { replace: true }); return; }
    navigate("/plans", { replace: true });
  }, [user, authLoading, isAdmin, hasActiveSubscription, needsOnboarding, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Safety timeout — if auth never resolves, re-enable the button
    const timeout = setTimeout(() => {
      setLoading(false);
      toast.error("Login demorou mais que o esperado. Tente novamente.");
    }, LOGIN_TIMEOUT);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        clearTimeout(timeout);
        toast.error(error.message);
        setLoading(false);
      }
      // On success, don't setLoading(false) — AuthContext handles redirect.
      // The timeout above is the safety net.
    } catch (err) {
      clearTimeout(timeout);
      toast.error("Erro inesperado ao fazer login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logoHorizontal} alt="Borda Pro" className="w-[260px] h-auto mb-8" />
          <p className="text-muted-foreground text-sm">Sua plataforma de bordados profissionais</p>
        </div>
        <Card className="border-border/40 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-display">Entrar</CardTitle>
            <CardDescription>Acesse sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Senha</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full shadow-md shadow-primary/20" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center text-sm space-y-2 pt-2">
                <Link to="/forgot-password" className="text-primary hover:underline block font-medium">Esqueci minha senha</Link>
                <p className="text-muted-foreground">
                  Não tem conta? <Link to="/signup" className="text-primary hover:underline font-medium">Criar conta</Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
