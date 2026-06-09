import { Sparkles, AlarmClock, Flame, ArrowRight, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

type Tier = "normal" | "urgent" | "last";

/** Faixa no topo do app durante o trial, com urgência escalonada pelos dias restantes. */
export const TrialBanner = () => {
  const navigate = useNavigate();
  const { isTrial, trialDaysLeft } = useSubscriptionStatus();
  if (!isTrial) return null;

  const dias = trialDaysLeft ?? 0;
  // trialDaysLeft é ceil → <=24h restantes => 1. Escalonamento:
  // >3 dias = normal | 2-3 dias = urgente | último dia (<=1) = last.
  const tier: Tier = dias <= 1 ? "last" : dias <= 3 ? "urgent" : "normal";

  const cfg: Record<Tier, { wrap: string; Icon: LucideIcon; text: string }> = {
    normal: {
      wrap: "bg-gradient-to-r from-[hsl(242_47%_34%)] to-primary",
      Icon: Sparkles,
      text: `Trial: ${dias} dias restantes. Curtindo? Garante seu acesso.`,
    },
    urgent: {
      wrap: "bg-orange-700",
      Icon: AlarmClock,
      text: `Faltam ${dias} dias. Garante R$ 49,90 antes do trial expirar.`,
    },
    last: {
      wrap: "bg-red-700",
      Icon: Flame,
      text: "Último dia! Não perde seu acesso.",
    },
  };
  const { wrap, Icon, text } = cfg[tier];

  return (
    <div className={`shrink-0 text-white ${wrap}`}>
      <div className="max-w-6xl mx-auto px-4 md:px-10 lg:px-14 py-2 flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1.5 text-center">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Icon className="h-4 w-4 shrink-0" />
          {text}
        </p>
        <button
          onClick={() => navigate("/plans")}
          className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-full px-4 py-1 text-sm font-semibold transition-colors"
        >
          Garantir acesso
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TrialBanner;
