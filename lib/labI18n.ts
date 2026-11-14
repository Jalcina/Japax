import ES from "./labI18n.es";

/**
 * Tiny key-based translator for the Fire Lab. English is the source text and the default (NASA Space Apps requires English);
 * Spanish is looked up by the exact English string. An untranslated key falls back to English, never to an empty string.
 * Placeholders look like {n} and are filled after translation, so numbers never get lost in a translation.
 */
export type LabLang = "en" | "es";

export function tr(lang: LabLang, s: string, vars?: Record<string, string | number>): string {
  const base = lang === "es" ? ES[s] ?? s : s;
  return vars ? base.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : base;
}
