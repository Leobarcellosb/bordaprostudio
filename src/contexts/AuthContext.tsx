import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

interface Subscription {
  id: string;
  plan_code: string;
  status: string;
  access_expires_at: string | null;
  provider: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any;
  isAdmin: boolean;
  subscription: Subscription | null;
  hasActiveSubscription: boolean;
  needsOnboarding: boolean;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, profile: null, isAdmin: false,
  subscription: null, hasActiveSubscription: false, needsOnboarding: false,
  signOut: async () => {}, refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const initDone = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [profileRes, roleRes, subRes, prefsRes] = await Promise.all([
        db.from("profiles").select("*").eq("id", userId).single(),
        db.from("user_roles").select("role").eq("user_id", userId),
        db.from("subscriptions")
          .select("id, plan_code, status, access_expires_at, provider")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        db.from("user_preferences")
          .select("id, completed_at")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const prof = profileRes.data;
      setProfile(prof);
      const admin = roleRes.data?.some((r: any) => r.role === "admin") ?? false;
      setIsAdmin(admin);
      setSubscription(subRes.data);

      // Onboarding check: admins bypass, otherwise check machine settings + preferences
      if (admin) {
        setNeedsOnboarding(false);
      } else if (prof && (!prof.machine_format || !prof.machine_hoop_size)) {
        setNeedsOnboarding(true);
      } else {
        const prefs = prefsRes.data;
        setNeedsOnboarding(!prefs || !prefs.completed_at);
      }

      console.log("[Auth] isAdmin:", admin, "subscription:", subRes.data?.status ?? "none");
    } catch (e) {
      console.error("[Auth] fetchUserData error:", e);
      setNeedsOnboarding(false); // Don't block on error
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      if (mounted) {
        setLoading(false);
        initDone.current = true;
      }
    };

    init();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      // Skip the first INITIAL_SESSION event — init() already handled it
      if (!initDone.current && _event === "INITIAL_SESSION") return;
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setProfile(null); setIsAdmin(false); setSubscription(null); setNeedsOnboarding(false);
      }
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; authSub.unsubscribe(); };
  }, [fetchUserData]);

  const hasActiveSubscription = !!(
    subscription &&
    ["active", "approved", "paid"].includes(subscription.status) &&
    subscription.access_expires_at &&
    new Date(subscription.access_expires_at) > new Date()
  );

  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    const { data } = await db.from("subscriptions")
      .select("id, plan_code, status, access_expires_at, provider")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null); setIsAdmin(false); setSubscription(null); setNeedsOnboarding(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, subscription, hasActiveSubscription, needsOnboarding, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};
