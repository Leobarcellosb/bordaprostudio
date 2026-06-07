import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
    else toast.success("Verifique seu email para confirmar a conta!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/lockup-indigo.png" alt="Borda Pro" className="w-[260px] h-auto mb-8" />
          <h1 className="text-3xl font-display font-bold">Criar Conta</h1>
          <p className="text-muted-foreground text-sm mt-2">Comece a usar o Borda Pro</p>
        </div>
        <Card className="border-border/40 shadow-xl shadow-primary/5">
          <CardContent className="pt-8">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome completo</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Maria Silva" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Senha</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <Button type="submit" className="w-full shadow-md shadow-primary/20" disabled={loading}>
                {loading ? "Criando conta..." : "Criar conta"}
              </Button>
              <p className="text-center text-sm text-muted-foreground pt-2">
                Já tem conta? <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
