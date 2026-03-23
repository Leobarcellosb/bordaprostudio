import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, hasActiveSubscription, isAdmin, needsOnboarding } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (!isAdmin && !hasActiveSubscription) return <Navigate to="/plans" replace />;
  return <>{children}</>;
};

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
