import { Sparkles, ArrowRight } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { CHECKOUT_MENSAL } from "@/config/checkout";

/** Faixa no topo do app enquanto o trial está ativo. Some quando expira/assina. */
export const TrialBanner = () => {
  const { isTrial, trialDaysLeft } = useSubscriptionStatus();
  if (!isTrial) return null;

  const dias = trialDaysLeft ?? 0;
  const label = dias === 1 ? "1 dia restante" : `${dias} dias restantes`;

  return (
    <div className="shrink-0 bg-gradient-to-r from-[hsl(242_47%_34%)] to-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 md:px-10 lg:px-14 py-2 flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1.5 text-center">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Trial: <strong>{label}</strong>. Curtindo? Garante seu acesso.
        </p>
        <button
          onClick={() => window.open(CHECKOUT_MENSAL, "_blank", "noopener,noreferrer")}
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
