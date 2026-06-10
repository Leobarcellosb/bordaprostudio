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

  // Admin gate: only admins pass. Never blocked by subscription.
  if (requireAdmin) {
    if (!roleResolved) {
      return (
        <RecoveryScreen
          title="Verificando permissões de administrador"
          description="Não conseguimos confirmar suas permissões. Recarregue ou saia e entre novamente."
          onSignOut={signOut}
        />
      );
    }
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    console.info("[ROUTE] admin → children");
    return <>{children}</>;
  }

  // User gate: admin bypasses subscription + onboarding entirely.
  if (roleResolved && isAdmin) {
    console.info("[ROUTE] protected → children (admin bypass)");
    return <>{children}</>;
  }

  if (!roleResolved) {
    return (
      <RecoveryScreen
        title="Não foi possível confirmar seu acesso"
        description="Recarregue a página ou saia e entre novamente para continuar."
        onSignOut={signOut}
      />
    );
  }

  if (onboardingResolved && needsOnboarding) {
    console.info("[ROUTE] protected → /onboarding");
    return <Navigate to="/onboarding" replace />;
  }

  // Falha (erro/timeout) ao carregar a assinatura: NÃO libera no escuro (fail-open
  // dava acesso grátis a quem teve a query falhada) nem joga pagante pra /plans.
  // Mostra recuperação — recarregar refaz o fetch. [S6-01]
  if (requireSubscription && subscriptionLoadFailed && !hasActiveSubscription) {
    return (
      <RecoveryScreen
        title="Não foi possível confirmar sua assinatura"
        description="Pode ter sido uma instabilidade. Recarregue para tentar de novo."
        onSignOut={signOut}
      />
    );
  }

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
