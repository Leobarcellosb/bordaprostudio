import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_RECOVERY_KEY } from "@/lib/recovery-capture";

// O link de recuperação do Supabase redireciona pro Site URL (landing) com um
// hash (#access_token...&type=recovery) — NÃO pra /reset-password. O cliente
// processa esse hash e dispara o evento PASSWORD_RECOVERY. Aqui interceptamos
// esse evento (e o hash no load, como fallback) e levamos a pessoa pro
// formulário de nova senha, independente de onde o link caiu. É o padrão
// oficial do Supabase pra recuperação de senha.
export const RecoveryRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const goReset = () => {
      try { sessionStorage.removeItem(PENDING_RECOVERY_KEY); } catch { /* noop */ }
      if (window.location.pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true });
      }
    };
    // Determinístico: a flag foi gravada antes do supabase apagar o hash.
    let pending = false;
    try { pending = sessionStorage.getItem(PENDING_RECOVERY_KEY) === "1"; } catch { /* noop */ }
    const h = window.location.hash;
    if (pending || h.includes("type=recovery") || h.includes("type=invite")) goReset();
    // Caminho principal: evento disparado quando o supabase-js processa o link.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") goReset();
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  return null;
};

export default RecoveryRedirect;
