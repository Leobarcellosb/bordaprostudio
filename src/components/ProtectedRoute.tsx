import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile, hasActiveSubscription, isAdmin } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) { setCheckingOnboarding(false); return; }

    // Check if machine settings are set on profile
    if (profile && (!profile.machine_format || !profile.machine_hoop_size)) {
      setNeedsOnboarding(true);
      setCheckingOnboarding(false);
      return;
    }

    db.from("user_preferences")
      .select("id, completed_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setNeedsOnboarding(!data || !data.completed_at);
        setCheckingOnboarding(false);
      });
  }, [user, profile]);

  if (loading || checkingOnboarding) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  // Admins bypass paywall; regular users must have active subscription
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
