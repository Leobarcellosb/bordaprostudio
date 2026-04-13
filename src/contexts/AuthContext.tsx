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
  roleResolved: boolean;
  subscription: Subscription | null;
  subscriptionResolved: boolean;
  hasActiveSubscription: boolean;
  needsOnboarding: boolean;
  onboardingResolved: boolean;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, profile: null, isAdmin: false,
  roleResolved: false, subscription: null, subscriptionResolved: false,
  hasActiveSubscription: false, needsOnboarding: false, onboardingResolved: false,
  signOut: async () => {}, refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

type QueryStatus = "success" | "timeout" | "error";

interface QueryResult<T> {
  status: QueryStatus;
  data: T | null;
  error: unknown | null;
}

// Timeout wrapper for any promise - prevents infinite hangs
function withTimeout<T>(label: string, promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
      console.warn(`[Auth] ${label} TIMEOUT after ${ms}ms, using fallback`);
      resolve(fallback);
    }, ms)),
  ]);
}

async function safeQuery<T>(
  label: string,
  promise: Promise<{ data: T | null; error: unknown }>,
  ms: number,
): Promise<QueryResult<T>> {
  console.info(`[Auth] ${label} START`);

  try {
    const result = await Promise.race([
      promise,
      new Promise<{ timedOut: true }>((resolve) => setTimeout(() => resolve({ timedOut: true }), ms)),
    ]);

    if ("timedOut" in result) {
      console.warn(`[Auth] ${label} TIMEOUT after ${ms}ms`);
      return { status: "timeout", data: null, error: null };
    }

    if (result.error) {
      console.error(`[Auth] ${label} ERROR:`, result.error);
      return { status: "error", data: null, error: result.error };
    }

    console.info(`[Auth] ${label} SUCCESS`);
    return { status: "success", data: result.data ?? null, error: null };
  } catch (error) {
    console.error(`[Auth] ${label} ERROR:`, error);
    return { status: "error", data: null, error };
  }
}

const FETCH_TIMEOUT = 8000; // 8s max for any single query
const BOOT_TIMEOUT = 12000; // 12s max for entire auth bootstrap
const RETRY_DELAY = 1200;
const MAX_FETCH_RETRIES = 2;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionResolved, setSubscriptionResolved] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingResolved, setOnboardingResolved] = useState(false);
  const initDone = useRef(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);
  const fetchRequestIdRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef<Record<string, number>>({});
  const isAdminRef = useRef(false);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const resetAccessState = useCallback(() => {
    setProfile(null);
    setIsAdmin(false);
    setRoleResolved(false);
    setSubscription(null);
    setSubscriptionResolved(false);
    setNeedsOnboarding(false);
    setOnboardingResolved(false);
    isAdminRef.current = false;
  }, []);

  const fetchUserData = useCallback(async (userId: string, reason = "manual") => {
    const requestId = ++fetchRequestIdRef.current;

    console.log(`[Auth] fetchUserData START (${reason}) for`, userId);

    const [profileRes, roleRes, subRes, prefsRes] = await Promise.all([
      safeQuery("profile", db.from("profiles").select("*").eq("id", userId).maybeSingle(), FETCH_TIMEOUT),
      safeQuery("role", db.from("user_roles").select("role").eq("user_id", userId), FETCH_TIMEOUT),
      safeQuery(
        "subscription",
        db.from("subscriptions")
          .select("id, plan_code, status, access_expires_at, provider")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        FETCH_TIMEOUT,
      ),
      safeQuery(
        "preferences",
        db.from("user_preferences")
          .select("id, completed_at")
          .eq("user_id", userId)
          .maybeSingle(),
        FETCH_TIMEOUT,
      ),
    ]);

    if (!mountedRef.current || currentUserIdRef.current !== userId || requestId !== fetchRequestIdRef.current) {
      console.info(`[Auth] fetchUserData STALE (${reason}) ignored for`, userId);
      return;
    }

    const roleData = Array.isArray(roleRes.data) ? roleRes.data : [];
    const admin = roleData.some((record: any) => record.role === "admin");
    const roleResolvedNow = roleRes.status === "success";
    const subscriptionResolvedNow = subRes.status === "success";
    const onboardingResolvedNow = profileRes.status === "success" && prefsRes.status === "success";
    let resolvedNeedsOnboarding = false;

    if (profileRes.status === "success") {
      setProfile(profileRes.data);
    }

    setRoleResolved(roleResolvedNow);
    if (roleResolvedNow) {
      setIsAdmin(admin);
    }

    setSubscriptionResolved(subscriptionResolvedNow);
    if (subscriptionResolvedNow) {
      setSubscription(subRes.data as Subscription | null);
    }

    setOnboardingResolved(onboardingResolvedNow);
    if (onboardingResolvedNow) {
      const prof = profileRes.data as any;
      const prefs = prefsRes.data as any;
      const resolvedAdmin = roleResolvedNow ? admin : isAdminRef.current;

      if (resolvedAdmin) {
        resolvedNeedsOnboarding = false;
      } else if (prof && (!prof.machine_format || !prof.machine_hoop_size)) {
        resolvedNeedsOnboarding = true;
      } else {
        resolvedNeedsOnboarding = !prefs || !prefs.completed_at;
      }

      setNeedsOnboarding(resolvedNeedsOnboarding);
    }

    const degraded = !roleResolvedNow || !subscriptionResolvedNow || !onboardingResolvedNow;

    if (degraded) {
      const retries = retryCountRef.current[userId] ?? 0;

      console.warn("[Auth] fetchUserData DEGRADED", {
        reason,
        userId,
        role: roleRes.status,
        subscription: subRes.status,
        onboarding: onboardingResolvedNow ? "success" : "degraded",
        retryAttempt: retries,
      });

      if (retries < MAX_FETCH_RETRIES) {
        retryCountRef.current[userId] = retries + 1;
        clearRetryTimer();

        retryTimerRef.current = window.setTimeout(() => {
          if (mountedRef.current && currentUserIdRef.current === userId) {
            void fetchUserData(userId, `retry:${retryCountRef.current[userId]}`);
          }
        }, RETRY_DELAY);

        console.info(`[Auth] fetchUserData RETRY scheduled for ${userId} (attempt ${retryCountRef.current[userId]})`);
      }
    } else {
      retryCountRef.current[userId] = 0;
    }

    console.log("[Auth] fetchUserData DONE", {
      reason,
      userId,
      admin: roleResolvedNow ? admin : "unresolved",
      subscription: subscriptionResolvedNow ? ((subRes.data as Subscription | null)?.status ?? "none") : "unresolved",
      needsOnboarding: onboardingResolvedNow ? resolvedNeedsOnboarding : "unresolved",
    });
  }, [clearRetryTimer]);

  const applySessionState = useCallback(async (nextSession: Session | null, reason: string) => {
    const nextUser = nextSession?.user ?? null;

    console.log(`[Auth] applySessionState START (${reason})`, nextUser?.id ?? "signed-out");

    setSession(nextSession);
    setUser(nextUser);

    if (!nextUser) {
      currentUserIdRef.current = null;
      fetchRequestIdRef.current += 1;
      retryCountRef.current = {};
      clearRetryTimer();
      resetAccessState();
      setLoading(false);
      console.log(`[Auth] applySessionState DONE (${reason}) signed out`);
      return;
    }

    const userChanged = currentUserIdRef.current !== nextUser.id;
    currentUserIdRef.current = nextUser.id;

    if (userChanged) {
      retryCountRef.current[nextUser.id] = 0;
      clearRetryTimer();
      resetAccessState();
    }

    setLoading(true);
    await fetchUserData(nextUser.id, reason);

    if (mountedRef.current && currentUserIdRef.current === nextUser.id) {
      setLoading(false);
    }

    console.log(`[Auth] applySessionState DONE (${reason})`, nextUser.id);
  }, [clearRetryTimer, fetchUserData, resetAccessState]);

  useEffect(() => {
    mountedRef.current = true;

    // Global boot timeout — if loading is still true after BOOT_TIMEOUT, force it false
    const bootTimer = setTimeout(() => {
      if (mountedRef.current && loadingRef.current) {
        console.warn("[Auth] Boot timeout reached, forcing loading=false");
        setLoading(false);
      }
    }, BOOT_TIMEOUT);

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mountedRef.current) return;

      console.log("[Auth] onAuthStateChange:", event);

      if (event === "INITIAL_SESSION") {
        console.info("[Auth] INITIAL_SESSION ignored — bootstrap is handled by getSession");
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        if (!initDone.current) {
          console.info("[Auth] TOKEN_REFRESHED ignored during bootstrap");
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        console.info("[Auth] TOKEN_REFRESHED applied without refetching user data");
        return;
      }

      await applySessionState(nextSession, `event:${event}`);
    });

    const init = async () => {
      console.log("[Auth] init START");
      try {
        const { data: { session } } = await withTimeout(
          "getSession",
          supabase.auth.getSession(),
          FETCH_TIMEOUT,
          { data: { session: null } } as any
        );
        if (!mountedRef.current) return;

        initDone.current = true;
        await applySessionState(session, "init");
      } catch (e) {
        console.error("[Auth] init ERROR:", e);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          console.log("[Auth] init DONE");
        }
      }
    };

    void init();

    return () => {
      mountedRef.current = false;
      clearTimeout(bootTimer);
      clearRetryTimer();
      authSub.unsubscribe();
    };
  }, [applySessionState, clearRetryTimer]);

  const hasActiveSubscription = !!(
    subscription &&
    ["active", "approved", "paid"].includes(subscription.status) &&
    subscription.access_expires_at &&
    new Date(subscription.access_expires_at) > new Date()
  );

  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const result = await safeQuery(
        "refreshSubscription",
        db.from("subscriptions")
          .select("id, plan_code, status, access_expires_at, provider")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        FETCH_TIMEOUT,
      );

      if (result.status === "success") {
        setSubscription(result.data as Subscription | null);
        setSubscriptionResolved(true);
        return;
      }

      setSubscriptionResolved(false);
    } catch (e) {
      console.error("[Auth] refreshSubscription ERROR:", e);
      setSubscriptionResolved(false);
    }
  }, [user]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      currentUserIdRef.current = null;
      fetchRequestIdRef.current += 1;
      retryCountRef.current = {};
      clearRetryTimer();
      setUser(null);
      setSession(null);
      resetAccessState();
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      isAdmin,
      roleResolved,
      subscription,
      subscriptionResolved,
      hasActiveSubscription,
      needsOnboarding,
      onboardingResolved,
      signOut,
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
