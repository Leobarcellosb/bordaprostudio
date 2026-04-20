const ALLOWED_APP_URLS = [
  "https://bordapro.com.br",
  "https://www.bordapro.com.br",
  "https://app.bordaprostudio.com",
  "https://app.bordaprostudio.com.br",
];

function resolveAppUrl(): string {
  const fromEnv = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (fromEnv && ALLOWED_APP_URLS.includes(fromEnv)) return fromEnv;

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (ALLOWED_APP_URLS.includes(origin)) return origin;
    if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      return origin;
    }
  }

  return ALLOWED_APP_URLS[0];
}

export const APP_URL = resolveAppUrl();
