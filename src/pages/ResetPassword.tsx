import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isInvite = window.location.hash.includes("type=invite");

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery") && !hash.includes("type=invite")) {
      toast.error("Link de recuperação inválido");
      navigate("/login");
    }
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      toast.error("Senha precisa ter pelo menos 8 caracteres, letras e números.");
      return;
    }
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
          <CardTitle className="text-2xl font-serif">{isInvite ? "Crie sua senha" : "Nova Senha"}</CardTitle>
          {isInvite && <p className="text-sm text-muted-foreground mt-2">Bem-vindo ao Borda Pro! Crie sua senha para acessar a plataforma.</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín. 8 caracteres, letras e números" required minLength={8} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Atualizando..." : isInvite ? "Criar senha e entrar" : "Atualizar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
