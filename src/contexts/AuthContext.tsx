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
  /** A query de subscription FALHOU (erro/timeout) — distinto de "resolveu sem linha". */
  subscriptionLoadFailed: boolean;
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
  subscriptionLoadFailed: false,
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
  const [subscriptionLoadFailed, setSubscriptionLoadFailed] = useState(false);
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
    setSubscriptionLoadFailed(false);
    setOnboardingResolved(false);
    setNeedsOnboarding(false);
  }, []);

  const fetchUserData = useCallback(async (userId: string, reason: string) => {
    const requestId = ++fetchRequestIdRef.current;
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    console.log(`[Auth] fetchUserData START (${reason})`);

    const isStale = () =>
      !mountedRef.current || requestId !== fetchRequestIdRef.current || currentUserIdRef.current !== userId;

    // PERF (cold-start ~30s, jun/2026): antes era UM Promise.all e os estados só
    // eram gravados quando a query MAIS LENTA terminava — então roleResolved (que
    // o ProtectedRoute usa pra liberar a página / bypass admin) ficava refém da
    // query de subscriptions, que é flaky e lenta no cold start do Supabase NANO.
    // Resultado: status preso em "loading" e spinner por ~30s.
    // Agora cada query resolve e grava SEU estado de forma INDEPENDENTE — o gate
    // de role não espera mais a subscription. NÃO reagrupar num Promise.all único.
    const pProfile = safeQuery<Profile>(
      "profile",
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      FETCH_TIMEOUT_MS,
    ).then((res) => {
      if (!isStale() && res.status === "success") setProfile(res.data);
      return res;
    });

    const pRole = safeQuery<{ role: string }[]>(
      "roles",
      supabase.from("user_roles").select("role").eq("user_id", userId),
      FETCH_TIMEOUT_MS,
    ).then((res) => {
      if (!isStale() && res.status === "success") {
        const rolesArr = Array.isArray(res.data) ? res.data : [];
        setIsAdmin(rolesArr.some((r) => r.role === "admin"));
        setRoleResolved(true);
      }
      return res;
    });

    const pSub = safeQuery<Subscription[]>(
      "subscription",
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      FETCH_TIMEOUT_MS,
    ).then((res) => {
      if (isStale()) return res;
      if (res.status === "success") {
        // Pode haver +1 linha (eduzz + manychat) — escolhe a de melhor acesso.
        setSubscription(pickPrimarySubscription(res.data ?? []));
        setSubscriptionResolved(true);
        setSubscriptionLoadFailed(false);
      } else {
        // Erro/timeout NÃO é "não tem assinatura": sinaliza falha pra o gate não
        // liberar (fail-open) nem a UI mentir "você não possui assinatura". [S6-01]
        setSubscriptionLoadFailed(true);
      }
      return res;
    });

    const pPrefs = safeQuery<UserPreferences>(
      "preferences",
      supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
      FETCH_TIMEOUT_MS,
    );

    // Onboarding depende de profile + prefs → resolve quando os dois chegarem
    // (independente de role/subscription).
    void Promise.all([pProfile, pPrefs]).then(([profileRes, prefsRes]) => {
      if (isStale()) return;
      if (profileRes.status === "success" && prefsRes.status === "success") {
        setNeedsOnboarding(computeNeedsOnboarding(profileRes.data, prefsRes.data));
        setOnboardingResolved(true);
      }
    });

    const [, roleRes, subRes, prefsRes] = await Promise.all([pProfile, pRole, pSub, pPrefs]);
    if (isStale()) {
      console.info(`[Auth] fetchUserData STALE (${reason}) ignored`);
      return;
    }
    // Telemetria: tempo total + status por query (flagra regressão de cold start).
    console.log(
      `[Auth] fetchUserData DONE (${reason}) ${Math.round((typeof performance !== "undefined" ? performance.now() : 0) - t0)}ms`,
      { role: roleRes.status, subscription: subRes.status, onboarding: prefsRes.status },
    );
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

      // PERF: sessão conhecida = "authenticated" IMEDIATO. Não esperamos o
      // fetchUserData — o gate de role/subscription é do ProtectedRoute (via
      // roleResolved/subscriptionResolved). Isso tira a query lenta de
      // subscriptions do caminho crítico de render (era a causa do spinner ~30s).
      setStatus("authenticated");
      void fetchUserData(nextUser.id, reason);
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
    subscriptionLoadFailed,
    onboardingResolved,
    needsOnboarding,
    hasActiveSubscription,
    signOut,
    refresh,
    refreshSubscription: refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
