import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";

const LOADER_TIMEOUT_MS = 15_000;

const RouteLoader = () => {
  const { signOut } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), LOADER_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (slow) {
    console.warn("[ROUTE] loader timeout reached, showing recovery UI");
    return (
      <RecoveryScreen
        title="Está demorando mais que o esperado"
        description="Verifique sua conexão ou tente sair e entrar novamente."
        onSignOut={signOut}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
};

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
      <Button variant="outline" onClick={() => window.location.reload()}>
        Recarregar
      </Button>
      {onSignOut && (
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await onSignOut();
            } finally {
              window.location.assign("/login");
            }
          }}
        >
          Sair e entrar de novo
        </Button>
      )}
    </div>
  </div>
);

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const {
    user,
    loading,
    hasActiveSubscription,
    isAdmin,
    roleResolved,
    needsOnboarding,
    onboardingResolved,
    subscriptionResolved,
    signOut,
  } = useAuth();

  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;

  if (!roleResolved) {
    console.warn("[ROUTE] protected: role not resolved, showing recovery");
    return (
      <RecoveryScreen
        title="Não foi possível confirmar seu acesso"
        description="Recarregue a página ou saia e entre novamente para continuar."
        onSignOut={signOut}
      />
    );
  }

  if (isAdmin) {
    console.info("[ROUTE] protected → children (admin bypass)");
    return <>{children}</>;
  }
  if (onboardingResolved && needsOnboarding) {
    console.info("[ROUTE] protected → /onboarding");
    return <Navigate to="/onboarding" replace />;
  }
  if (subscriptionResolved && !hasActiveSubscription) {
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

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, roleResolved, signOut } = useAuth();

  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;

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
  return <>{children}</>;
};
