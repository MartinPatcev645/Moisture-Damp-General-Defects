import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./src/i18n/routing";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export const config = {
  matcher: ["/", "/(pt|en|es)/:path*"],
};

