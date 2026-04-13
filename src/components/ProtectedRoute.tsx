import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const RouteRetryState = ({ title, description }: { title: string; description: string }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Button variant="outline" onClick={() => window.location.reload()}>
      Verificar novamente
    </Button>
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
  } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <>{children}</>;
  if (!roleResolved) return <>{children}</>;
  if (onboardingResolved && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (subscriptionResolved && !hasActiveSubscription) return <Navigate to="/plans" replace />;
  return <>{children}</>;
};

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, roleResolved } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!roleResolved) {
    return (
      <RouteRetryState
        title="Verificando permissões de administrador"
        description="Seu acesso não será bloqueado incorretamente enquanto as permissões são confirmadas."
      />
    );
  }
  return <>{children}</>;
};
