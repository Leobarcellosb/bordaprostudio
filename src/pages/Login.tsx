import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import logoHorizontal from "@/assets/logo-horizontal.png";

const LOGIN_TIMEOUT = 15000;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const loginTimeoutRef = useRef<number | null>(null);
  const {
    user,
    loading: authLoading,
    isAdmin,
    roleResolved,
    hasActiveSubscription,
    subscriptionResolved,
    needsOnboarding,
    onboardingResolved,
    signOut,
  } = useAuth();

  const clearLoginTimeout = useCallback(() => {
    if (loginTimeoutRef.current !== null) {
      window.clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLoginTimeout();
  }, [clearLoginTimeout]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      clearLoginTimeout();
      return;
    }

    // Auth finished but role failed to resolve → don't redirect into the loop.
    if (!roleResolved) {
      console.warn("[LOGIN] user authenticated but role not resolved — showing recovery UI");
      clearLoginTimeout();
      setLoading(false);
      setAuthError("Entramos na sua conta, mas não conseguimos carregar suas permissões. Verifique sua conexão.");
      return;
    }

    clearLoginTimeout();
    setLoading(false);
    setAuthError(null);

    if (isAdmin) {
      console.info("[LOGIN] redirect → /dashboard (admin)");
      navigate("/dashboard", { replace: true });
      return;
    }
    if (onboardingResolved && needsOnboarding) {
      console.info("[LOGIN] redirect → /onboarding");
      navigate("/onboarding", { replace: true });
      return;
    }
    if (subscriptionResolved) {
      const target = hasActiveSubscription ? "/dashboard" : "/plans";
      console.info(`[LOGIN] redirect → ${target}`);
      navigate(target, { replace: true });
      return;
    }

    // Subscription not resolved yet — keep waiting briefly.
    console.info("[LOGIN] role resolved but subscription pending — awaiting");
  }, [
    user,
    authLoading,
    isAdmin,
    roleResolved,
    hasActiveSubscription,
    subscriptionResolved,
    needsOnboarding,
    onboardingResolved,
    navigate,
    clearLoginTimeout,
  ]);

  const handleSignOutRetry = async () => {
    try {
      await signOut();
    } finally {
      setAuthError(null);
      setEmail("");
      setPassword("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    clearLoginTimeout();
    loginTimeoutRef.current = window.setTimeout(() => {
      setLoading(false);
      toast.error("Login demorou mais que o esperado. Tente novamente.");
    }, LOGIN_TIMEOUT);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        clearLoginTimeout();
        toast.error(error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("[LOGIN] signIn threw:", err);
      clearLoginTimeout();
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
            {authError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <p className="text-sm text-destructive font-medium">{authError}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>
                    Recarregar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={handleSignOutRetry}>
                    Sair e tentar de novo
                  </Button>
                </div>
              </div>
            )}
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
