import { useState, useEffect, useCallback } from "react";
import { t as translate, getLanguage } from "@/lib/i18n";

export function useTranslation() {
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    // Listen for storage changes (same tab via custom event)
    const handler = () => setLang(getLanguage());
    window.addEventListener("language-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("language-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const t = useCallback((key: string) => translate(key), [lang]);

  return { t, lang };
}
