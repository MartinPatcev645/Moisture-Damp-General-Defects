import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type AppLocale, locales } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = (locale ?? defaultLocale) as AppLocale;

  if (!locales.includes(resolvedLocale)) {
    return {
      locale: defaultLocale,
      messages: (await import(`../messages/${defaultLocale}.json`)).default,
    };
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});

