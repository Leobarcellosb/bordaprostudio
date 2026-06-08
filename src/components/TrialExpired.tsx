import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Mostrada no lugar do conteúdo quando o acesso expirou (status='expired'). */
export const TrialExpired = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--landing-warm))] px-4">
      <div className="w-full max-w-md text-center space-y-7">
        <img src="/lockup-indigo.png" alt="Borda Pro" className="h-12 w-auto mx-auto" />

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">
            Seus 15 dias <span className="text-gradient-brand">acabaram</span>
          </h1>
          <p className="text-muted-foreground text-base">
            Continue na Borda Pro por <strong className="text-foreground">R$ 49,90/mês</strong>.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            onClick={() => navigate("/plans")}
            className="w-full py-6 text-base font-semibold rounded-full gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <Zap className="h-5 w-5" />
            Assinar agora
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
            Acesso imediato após a compra
          </p>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialExpired;
