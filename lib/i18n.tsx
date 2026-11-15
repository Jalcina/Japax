"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getData, type DataSet, type Lang } from "./data";
import { textFor } from "./componentEs";
import { tr as labTr } from "./labI18n";

/**
 * Language handling. English is the default because the NASA Space Apps rules require English;
 * Spanish is an opt-in choice remembered in the browser. Server HTML is always English and the
 * stored preference is applied right after hydration.
 */
interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
}
const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const s = localStorage.getItem("fc-lang");
      if (s === "es" || s === "en") setLangState(s);
    } catch {
      /* storage can be unavailable (private mode); stay on English */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("fc-lang", l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Localized JaPax dataset for the current language. */
export function useData(): DataSet {
  const { lang } = useLang();
  return getData(lang);
}

/** Panel translator: const { t, X } = useTr(); t("English literal", { n: 3 }) uses the Fire Lab dictionary (lib/labI18n); X(engineOrCatalogText) translates engine and catalog text (lib/componentEs). */
export function useTr() {
  const { lang } = useLang();
  return useMemo(() => ({ lang, t: (s: string, v?: Record<string, string | number>) => labTr(lang, s, v), X: textFor(lang) }), [lang]);
}

/** Pick the dictionary for the current language: const t = useT({ en: {...}, es: {...} }) */
export function useT<T>(dict: Record<Lang, T>): T {
  const { lang } = useLang();
  return dict[lang];
}
