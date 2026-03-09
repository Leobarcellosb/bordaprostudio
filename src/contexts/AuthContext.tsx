import React, { createContext, useContext, useEffect, useState } from "react";
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, profile: null, isAdmin: false,
  subscription: null, hasActiveSubscription: false, signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await db.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  };

  const fetchRole = async (userId: string) => {
    const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
    setIsAdmin(data?.some((r: any) => r.role === "admin") ?? false);
  };

  const fetchSubscription = async (userId: string) => {
    const { data } = await db
      .from("subscriptions")
      .select("id, plan_code, status, access_expires_at, provider")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data);
  };

  const hasActiveSubscription = !!(
    subscription?.status === "active" &&
    subscription?.access_expires_at &&
    new Date(subscription.access_expires_at) > new Date()
  );

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRole(session.user.id);
          fetchSubscription(session.user.id);
        }, 0);
      } else {
        setProfile(null); setIsAdmin(false); setSubscription(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
        fetchSubscription(session.user.id);
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null); setIsAdmin(false); setSubscription(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, subscription, hasActiveSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
