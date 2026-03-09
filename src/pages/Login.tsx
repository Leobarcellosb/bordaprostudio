import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import logoHorizontal from "@/assets/logo-horizontal.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    else navigate("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img src={logoHorizontal} alt="Borda Pro" className="w-[200px] mx-auto mb-7" />
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
