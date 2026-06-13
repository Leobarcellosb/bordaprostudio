// IMPORTANTE: este módulo precisa ser importado ANTES do client do supabase
// (ver main.tsx). O supabase-js, com detectSessionInUrl, processa e APAGA o hash
// (#access_token...&type=recovery) no carregamento — e dispara PASSWORD_RECOVERY
// numa hora que pode ser antes do listener do React assinar (race). Capturando
// o hash aqui, na primeira linha do bundle, a intenção de "redefinir senha"
// sobrevive de forma determinística e o RecoveryRedirect a consome no mount.
const PENDING_RECOVERY_KEY = "borda-pending-recovery";

try {
  const h = typeof window !== "undefined" ? window.location.hash : "";
  if (h.includes("type=recovery") || h.includes("type=invite")) {
    sessionStorage.setItem(PENDING_RECOVERY_KEY, "1");
  }
} catch {
  /* sessionStorage indisponível — segue só com o evento/hash ao vivo */
}

export { PENDING_RECOVERY_KEY };
