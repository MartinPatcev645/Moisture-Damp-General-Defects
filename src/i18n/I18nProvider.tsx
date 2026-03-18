"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, STORAGE_LANG_KEY, translations, type AppLang } from "./translations";

type Vars = Record<string, string | number | boolean | null | undefined>;

type I18nContextValue = {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  t: (key: string, vars?: Vars) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_LANG_KEY);
      if (saved === "pt" || saved === "en") setLangState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setLang = useCallback((next: AppLang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_LANG_KEY, next);
    } catch {
      // ignore
    }
    try {
      document.documentElement.lang = next;
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const dict = translations[lang] ?? translations[DEFAULT_LANG];
      const v = dict[key];
      if (!v) return key;
      if (typeof v === "function") return (v as (vars?: Vars) => string)(vars);
      return v;
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

