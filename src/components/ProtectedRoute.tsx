import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { hadTrial } from "@/lib/subscription";
import { TrialExpired } from "@/components/TrialExpired";

// Bumped to accommodate Supabase NANO cold-start latency.
const SLOW_LOADER_MS = 25_000;

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const RecoveryScreen = ({
  title,
  description,
  onSignOut,
}: {
  title: string;
  description: string;
  onSignOut?: () => Promise<void> | void;
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
    <div className="space-y-1 max-w-sm">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="flex gap-2">
      <button
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        onClick={() => window.location.reload()}
      >
        Recarregar
      </button>
      {onSignOut && (
        <button
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          onClick={async () => {
            try {
              await onSignOut();
            } finally {
              window.location.assign("/login");
            }
          }}
        >
          Sair e entrar de novo
        </button>
      )}
    </div>
  </div>
);

const SlowAwareSpinner = ({ onSignOut }: { onSignOut: () => Promise<void> }) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), SLOW_LOADER_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (slow) {
    return (
      <RecoveryScreen
        title="Está demorando mais que o esperado"
        description="Verifique sua conexão ou tente sair e entrar novamente."
        onSignOut={onSignOut}
      />
    );
  }
  return <Spinner />;
};

interface ProtectedRouteProps {
  children: ReactNode;
  /** When true, route requires admin role (and bypasses subscription checks). */
  requireAdmin?: boolean;
  /** When false, route does not require active subscription (e.g. /onboarding, /plans). */
  requireSubscription?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireSubscription = true,
}: ProtectedRouteProps) => {
  const {
    status,
    isAdmin,
    roleResolved,
    needsOnboarding,
    onboardingResolved,
    hasActiveSubscription,
    subscriptionResolved,
    subscriptionLoadFailed,
    subscription,
    signOut,
  } = useAuth();
  const { status: subStatus } = useSubscriptionStatus();

  if (status === "loading") return <SlowAwareSpinner onSignOut={signOut} />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;

  // role/subscription resolvem em background (status já é "authenticated" assim
  // que a sessão é conhecida — ver AuthContext). Enquanto a role NÃO resolveu, é
  // estado de LOADING normal → spinner (que escala pra RecoveryScreen em 25s se
  // travar de vez), NÃO a tela de erro imediata.

  // Admin gate: only admins pass. Never blocked by subscription.
  if (requireAdmin) {
    if (!roleResolved) return <SlowAwareSpinner onSignOut={signOut} />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    console.info("[ROUTE] admin → children");
    return <>{children}</>;
  }

  // User gate: admin bypasses subscription + onboarding entirely (renderiza
  // assim que a role resolve — NÃO espera a subscription, que é a query lenta).
  if (roleResolved && isAdmin) {
    console.info("[ROUTE] protected → children (admin bypass)");
    return <>{children}</>;
  }

  if (!roleResolved) return <SlowAwareSpinner onSignOut={signOut} />;

  // Não-admin em rota que exige assinatura: espera a query de subscription
  // enquanto ela está PENDENTE (evita flash de conteúdo antes do redirect /plans).
  // Mas se a query FALHOU (timeout/erro), NÃO trava no spinner — cai pro fluxo
  // fail-open (mostra children), preservando o fix do login-loop [S6-01].
  if (requireSubscription && !subscriptionResolved && !subscriptionLoadFailed) {
    return <SlowAwareSpinner onSignOut={signOut} />;
  }

  if (onboardingResolved && needsOnboarding) {
    console.info("[ROUTE] protected → /onboarding");
    return <Navigate to="/onboarding" replace />;
  }

  // NOTA (incidente 2026-06-10): havia aqui um guard que bloqueava com
  // RecoveryScreen quando subscriptionLoadFailed=true. Em prod a query de
  // subscriptions falha com frequência (causa sob investigação) e o guard
  // virou "loop de login" pra usuários reais. Removido — falha de fetch volta
  // a ser fail-open (comportamento pré-6193ee6) até reintroduzirmos com retry
  // automático. O flag subscriptionLoadFailed segue exposto pelo AuthContext.
  if (requireSubscription && subscriptionResolved && !hasActiveSubscription) {
    // Só quem DE FATO teve trial vê a tela "Seus 15 dias acabaram". Assinatura
    // paga vencida (sem trial) segue pro fluxo de /plans (copy não se aplicaria).
    if (subStatus === "expired" && hadTrial(subscription)) {
      console.info("[ROUTE] protected → trial expirado");
      return <TrialExpired />;
    }
    console.info("[ROUTE] protected → /plans");
    return <Navigate to="/plans" replace />;
  }

  console.info("[ROUTE] protected → children", {
    subscriptionResolved,
    hasActiveSubscription,
    onboardingResolved,
    needsOnboarding,
  });
  return <>{children}</>;
};

/** Backward-compatible alias used by the original App.tsx. */
export const AdminRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requireAdmin>{children}</ProtectedRoute>
);
