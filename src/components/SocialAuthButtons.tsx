import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SOCIAL_AUTH, type SocialProvider } from "@/config/socialAuth";

// Logos inline (lucide não tem ícones de marca). Google multicolor; Facebook
// usa currentColor (o botão é azul + texto branco).
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
  </svg>
);

/**
 * Botões de login social (Google/Facebook). Renderiza só os provedores ligados
 * em SOCIAL_AUTH — se nenhum, retorna null (zero impacto visual). Inclui o
 * separador "ou com email" quando há ≥1 provedor.
 * Em sucesso o browser é redirecionado pro provedor e volta pra redirectTo
 * (detectSessionInUrl troca o code → sessão; AuthContext roteia).
 */
export const SocialAuthButtons = () => {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const anyEnabled = SOCIAL_AUTH.google || SOCIAL_AUTH.facebook;
  if (!anyEnabled) return null;

  const signIn = async (provider: SocialProvider) => {
    setBusy(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (error) {
        // Sucesso = redireciona pro provedor (não retorna aqui). Erro = provedor
        // não habilitado no Supabase ou falha de rede.
        console.error("[social-auth]", provider, error);
        toast.error("Não foi possível iniciar o login agora. Use o email abaixo.");
        setBusy(null);
      }
    } catch (e) {
      console.error("[social-auth]", provider, e);
      toast.error("Não foi possível iniciar o login agora.");
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 mb-4">
      <div className="space-y-2.5">
        {SOCIAL_AUTH.google && (
          <Button type="button" variant="outline" className="w-full gap-2 font-medium" onClick={() => signIn("google")} disabled={!!busy}>
            <GoogleIcon /> {busy === "google" ? "Redirecionando…" : "Continuar com Google"}
          </Button>
        )}
        {SOCIAL_AUTH.facebook && (
          <Button type="button" className="w-full gap-2 font-medium bg-[#1877F2] hover:bg-[#1467d6] text-white" onClick={() => signIn("facebook")} disabled={!!busy}>
            <FacebookIcon /> {busy === "facebook" ? "Redirecionando…" : "Continuar com Facebook"}
          </Button>
        )}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
        <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">ou com email</span></div>
      </div>
    </div>
  );
};

export default SocialAuthButtons;
