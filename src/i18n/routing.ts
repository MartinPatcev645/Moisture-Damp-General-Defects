export const locales = ["en", "pt", "es"] as const;
export const defaultLocale = "en";

export type AppLocale = (typeof locales)[number];

