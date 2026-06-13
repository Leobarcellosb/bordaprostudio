// Kill-switch por provedor de login social. Os botões só aparecem quando o
// provedor correspondente está habilitado AQUI **e** configurado no Supabase
// (Auth → Providers). Mantém false até a config externa estar pronta — assim o
// código pode ir pra produção sem mostrar botão que quebraria.
//
// Google: rápido de configurar (OAuth no Google Cloud).
// Facebook: pesado (App Review + verificação de negócio p/ scope email) — pode
//   levar dias. Por isso são flags separadas: liga o Google primeiro.
export const SOCIAL_AUTH = {
  google: false,
  facebook: false,
} as const;

export type SocialProvider = keyof typeof SOCIAL_AUTH;
