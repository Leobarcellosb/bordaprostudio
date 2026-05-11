import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { safeQuery, withTimeout } from "@/lib/safeQuery";
import type {
  Profile,
  Subscription,
  UserPreferences,
} from "@/types/database.types";

const FETCH_TIMEOUT_MS = 8_000;
const BOOT_TIMEOUT_MS = 12_000;

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  /** Legacy boolean alias for status === "loading" — kept for backward compatibility. */
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  isAdmin: boolean;
  roleResolved: boolean;
  subscriptionResolved: boolean;
  onboardingResolved: boolean;
  needsOnboarding: boolean;
  hasActiveSubscription: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Legacy alias for refresh — kept for backward compatibility. */
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  loading: true,
  user: null,
  session: null,
  profile: null,
  subscription: null,
  isAdmin: false,
  roleResolved: false,
  subscriptionResolved: false,
  onboardingResolved: false,
  needsOnboarding: false,
  hasActiveSubscription: false,
  signOut: async () => {},
  refresh: async () => {},
  refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function computeHasActiveSubscription(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (!["active", "approved", "paid"].includes(sub.status)) return false;
  if (!sub.access_expires_at) return false;
  const expires = new Date(sub.access_expires_at);
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() > Date.now();
}

function computeNeedsOnboarding(profile: Profile | null, prefs: UserPreferences | null): boolean {
  if (!profile) return true;
  if (!profile.machine_format || !profile.machine_hoop_size) return true;
  return !prefs?.completed_at;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);
  const [subscriptionResolved, setSubscriptionResolved] = useState(false);
  const [onboardingResolved, setOnboardingResolved] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const mountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);
  const fetchRequestIdRef = useRef(0);
  const initDoneRef = useRef(false);
  const statusRef = useRef<AuthStatus>("loading");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const resetUserState = useCallback(() => {
    setProfile(null);
    setSubscription(null);
    setIsAdmin(false);
    setRoleResolved(false);
    setSubscriptionResolved(false);
    setOnboardingResolved(false);
    setNeedsOnboarding(false);
  }, []);

  const fetchUserData = useCallback(async (userId: string, reason: string) => {
    const requestId = ++fetchRequestIdRef.current;
    console.log(`[Auth] fetchUserData START (${reason})`);

    const [profileRes, roleRes, subRes, prefsRes] = await Promise.all([
      safeQuery<Profile>(
        "profile",
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        FETCH_TIMEOUT_MS,
      ),
      safeQuery<{ role: string }[]>(
        "roles",
        supabase.from("user_roles").select("role").eq("user_id", userId),
        FETCH_TIMEOUT_MS,
      ),
      safeQuery<Subscription>(
        "subscription",
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        FETCH_TIMEOUT_MS,
      ),
      safeQuery<UserPreferences>(
        "preferences",
        supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
        FETCH_TIMEOUT_MS,
      ),
    ]);

    if (!mountedRef.current || requestId !== fetchRequestIdRef.current || currentUserIdRef.current !== userId) {
      console.info(`[Auth] fetchUserData STALE (${reason}) ignored`);
      return;
    }

    // Profile + onboarding
    const nextProfile = profileRes.status === "success" ? profileRes.data : null;
    if (profileRes.status === "success") setProfile(nextProfile);

    // Role (separate resolution so admin bypass works even if other queries failed)
    if (roleRes.status === "success") {
      const rolesArr = Array.isArray(roleRes.data) ? roleRes.data : [];
      setIsAdmin(rolesArr.some((r) => r.role === "admin"));
      setRoleResolved(true);
    }

    // Subscription
    if (subRes.status === "success") {
      setSubscription(subRes.data);
      setSubscriptionResolved(true);
    }

    // Onboarding flag
    if (profileRes.status === "success" && prefsRes.status === "success") {
      setNeedsOnboarding(computeNeedsOnboarding(nextProfile, prefsRes.data));
      setOnboardingResolved(true);
    }

    console.log(`[Auth] fetchUserData DONE (${reason})`, {
      role: roleRes.status,
      subscription: subRes.status,
      onboarding: prefsRes.status,
    });
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null, reason: string) => {
      const nextUser = nextSession?.user ?? null;
      console.log(`[Auth] applySession (${reason})`, nextUser ? "signed-in" : "signed-out");

      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        currentUserIdRef.current = null;
        fetchRequestIdRef.current += 1;
        resetUserState();
        setStatus("unauthenticated");
        return;
      }

      const userChanged = currentUserIdRef.current !== nextUser.id;
      currentUserIdRef.current = nextUser.id;
      if (userChanged) resetUserState();

      try {
        await fetchUserData(nextUser.id, reason);
      } finally {
        if (mountedRef.current && currentUserIdRef.current === nextUser.id) {
          setStatus("authenticated");
        }
      }
    },
    [fetchUserData, resetUserState],
  );

  // Bootstrap + auth event listener
  useEffect(() => {
    mountedRef.current = true;

    const bootTimer = window.setTimeout(() => {
      if (mountedRef.current && statusRef.current === "loading") {
        console.warn("[Auth] BOOT_TIMEOUT reached — forcing unauthenticated");
        setStatus("unauthenticated");
      }
    }, BOOT_TIMEOUT_MS);

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mountedRef.current) return;
      console.log("[Auth] event:", event);

      if (event === "INITIAL_SESSION") {
        // handled by bootstrap below
        return;
      }
      if (event === "TOKEN_REFRESHED") {
        if (!initDoneRef.current) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }
      await applySession(nextSession, `event:${event}`);
    });

    (async () => {
      try {
        const { data } = await withTimeout(
          "getSession",
          supabase.auth.getSession(),
          FETCH_TIMEOUT_MS,
          { data: { session: null } } as { data: { session: Session | null } },
        );
        if (!mountedRef.current) return;
        initDoneRef.current = true;
        await applySession(data.session, "init");
      } catch (err) {
        console.error("[Auth] bootstrap error:", err);
      } finally {
        if (mountedRef.current && statusRef.current === "loading") {
          setStatus("unauthenticated");
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      window.clearTimeout(bootTimer);
      authSub.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      currentUserIdRef.current = null;
      fetchRequestIdRef.current += 1;
      resetUserState();
      setUser(null);
      setSession(null);
      setStatus("unauthenticated");
    }
  }, [resetUserState]);

  const refresh = useCallback(async () => {
    if (!currentUserIdRef.current) return;
    await fetchUserData(currentUserIdRef.current, "refresh");
  }, [fetchUserData]);

  const hasActiveSubscription = computeHasActiveSubscription(subscription);

  const value: AuthContextValue = {
    status,
    loading: status === "loading",
    user,
    session,
    profile,
    subscription,
    isAdmin,
    roleResolved,
    subscriptionResolved,
    onboardingResolved,
    needsOnboarding,
    hasActiveSubscription,
    signOut,
    refresh,
    refreshSubscription: refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
