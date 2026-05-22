import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import en from "@/locales/en.json";
import om from "@/locales/om.json";
import am from "@/locales/am.json";

export type Lang = "en" | "om" | "am";

const translations: Record<Lang, typeof en> = { en, om, am };

export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  om: "Afaan Oromo",
  am: "አማርኛ",
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("haylat_lang") as Lang | null;
    return saved && translations[saved] ? saved : "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("haylat_lang", l);
  }, []);

  const t = useCallback(
    (path: string): string => {
      const keys = path.split(".");
      let value: any = translations[lang];
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) {
          // Fallback to English
          let fallback: any = translations.en;
          for (const k of keys) fallback = fallback?.[k];
          return typeof fallback === "string" ? fallback : path;
        }
      }
      return typeof value === "string" ? value : path;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
