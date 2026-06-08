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
import { safeQuery } from "@/lib/safeQuery";
import type {
  Profile,
  Subscription,
  UserPreferences,
} from "@/types/database.types";
import { isSubscriptionActive, pickPrimarySubscription } from "@/lib/subscription";

// Bumped to accommodate Supabase NANO cold-start latency.
const FETCH_TIMEOUT_MS = 20_000;
const BOOT_TIMEOUT_MS = 30_000;

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

// Acesso = assinatura paga ativa OU trial ativo (lógica central em @/lib/subscription).
function computeHasActiveSubscription(sub: Subscription | null): boolean {
  return isSubscriptionActive(sub);
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
      safeQuery<Subscription[]>(
        "subscription",
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
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
      // Pode haver +1 linha (eduzz + manychat) — escolhe a de melhor acesso.
      setSubscription(pickPrimarySubscription(subRes.data ?? []));
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
        // Drives bootstrap: SIGNED_IN events that fire BEFORE this are duplicates
        // (cached session events from the GoTrueClient) and are ignored to prevent
        // duplicate fetchUserData runs eating 20s+ of timeouts.
        initDoneRef.current = true;
        await applySession(nextSession, "init");
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        if (!initDoneRef.current) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }

      // Race-guard: a fresh boot fires SIGNED_IN with the cached session BEFORE
      // INITIAL_SESSION on some Supabase JS versions. Ignore until bootstrap done.
      if (event === "SIGNED_IN" && !initDoneRef.current) {
        console.log("[Auth] SIGNED_IN antes de INITIAL_SESSION — ignorado (boot duplicate)");
        return;
      }

      await applySession(nextSession, `event:${event}`);
    });

    return () => {
      mountedRef.current = false;
      window.clearTimeout(bootTimer);
      authSub.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    console.log("[Auth] signOut called");

    // Cancel any in-flight fetches and clear in-memory state immediately so
    // the UI reacts before the network call returns (or hangs).
    currentUserIdRef.current = null;
    fetchRequestIdRef.current += 1;
    resetUserState();
    setUser(null);
    setSession(null);
    setStatus("unauthenticated");

    // Race the Supabase signOut against a 3s timeout. A slow/failed auth
    // server (NANO cold-start) must not block the logout flow.
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            console.warn("[Auth] supabase.auth.signOut timed out — proceeding");
            resolve();
          }, 3000),
        ),
      ]);
    } catch (err) {
      console.warn("[Auth] supabase.auth.signOut error:", err);
    }

    // Belt-and-suspenders: if signOut hung, the SDK never cleared localStorage.
    // Wipe Supabase auth keys ourselves so the next page load doesn't rehydrate
    // the session.
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-") && key.includes("auth")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore quota / access errors */
    }

    // Hard redirect to /login. Required because some routes (/, /plans,
    // /onboarding, /signup) are NOT wrapped in ProtectedRoute and therefore
    // do not auto-navigate when status flips to "unauthenticated".
    window.location.replace("/login");
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
