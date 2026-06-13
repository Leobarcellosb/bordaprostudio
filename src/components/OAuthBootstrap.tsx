import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Liga duas pontas do login social, montado uma vez no root:
//  (1) ERRO de OAuth: o provedor volta com ?error=/#error= (ex: usuária negou
//      ou fechou) → mostra mensagem amigável e limpa a URL.
//  (2) TRIAL automático: no SIGNED_IN de um provedor social em conta NOVA,
//      chama oauth-signup-trial (idempotente) — esses signups não passam pelo
//      /ativar, então sem isso cairiam em /plans sem trial.
export const OAuthBootstrap = () => {
  useEffect(() => {
    // (1) erro vindo do provedor (query ou hash). Só tratamos como erro de login
    // social se há error_description (o OAuth sempre manda) OU estamos na /login
    // (destino do redirect) — evita falso-positivo em links com ?error= de outro
    // contexto. E limpamos SÓ as chaves de erro, preservando ?ref/?utm/hash.
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = q.get("error") || h.get("error");
    const errDesc = q.get("error_description") || h.get("error_description");
    if (err && (errDesc || window.location.pathname === "/login")) {
      toast.error(
        err === "access_denied"
          ? "Login cancelado. Tente de novo ou use email e senha."
          : "Não foi possível concluir o login social. Tente de novo ou use email e senha.",
      );
      ["error", "error_description", "error_code"].forEach((k) => { q.delete(k); h.delete(k); });
      const qs = q.toString();
      const hs = h.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : "") + (hs ? `#${hs}` : ""));
    }

    // (2) trial em signup social novo
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;
      const u = session.user;
      const provider = u.app_metadata?.provider;
      if (provider !== "google" && provider !== "facebook") return; // só social
      // primeira vez: created_at ≈ last_sign_in_at (a função é idempotente de qualquer forma)
      const created = new Date(u.created_at).getTime();
      const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : Date.now();
      if (Math.abs(last - created) > 60_000) return; // login recorrente → ignora (função é idempotente)
      try {
        await supabase.functions.invoke("oauth-signup-trial", { body: {} });
      } catch (e) {
        console.error("[oauth-bootstrap] trial invoke error:", e); // best-effort
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
};

export default OAuthBootstrap;
