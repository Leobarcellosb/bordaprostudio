import { useAuth } from "@/contexts/AuthContext";
import {
  computeSubscriptionStatus,
  isSubscriptionActive,
  isTrialActive,
  trialDaysLeft,
  type SubStatus,
} from "@/lib/subscription";

export interface SubscriptionStatusInfo {
  /** true se assinatura paga ativa OU trial ativo. */
  isActive: boolean;
  /** true só durante o trial ativo. */
  isTrial: boolean;
  /** dias restantes do trial (arredondado p/ cima), ou null se não estiver em trial. */
  trialDaysLeft: number | null;
  status: SubStatus;
}

/** Status de assinatura derivado do AuthContext. Fonte única pra gating + UI. */
export function useSubscriptionStatus(): SubscriptionStatusInfo {
  const { subscription } = useAuth();
  const now = Date.now();
  return {
    isActive: isSubscriptionActive(subscription, now),
    isTrial: isTrialActive(subscription, now),
    trialDaysLeft: trialDaysLeft(subscription, now),
    status: computeSubscriptionStatus(subscription, now),
  };
}
