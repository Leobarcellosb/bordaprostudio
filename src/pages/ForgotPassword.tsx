import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import logoHorizontal from "@/assets/logo-horizontal.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logoHorizontal} alt="Borda Pro" className="h-12 w-auto mx-auto mb-3" />
          <CardTitle className="text-2xl font-serif">Recuperar Senha</CardTitle>
          <CardDescription>Enviaremos um link para redefinir sua senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-primary hover:underline">Voltar ao login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
